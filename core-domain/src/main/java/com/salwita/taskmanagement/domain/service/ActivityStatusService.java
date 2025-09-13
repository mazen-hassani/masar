package com.salwita.taskmanagement.domain.service;

import com.salwita.taskmanagement.domain.entity.Activity;
import com.salwita.taskmanagement.domain.entity.Task;
import com.salwita.taskmanagement.domain.entity.User;
import com.salwita.taskmanagement.domain.enums.Role;
import com.salwita.taskmanagement.domain.enums.Status;
import com.salwita.taskmanagement.domain.enums.TrackingStatus;
import com.salwita.taskmanagement.domain.repository.ActivityRepository;
import com.salwita.taskmanagement.domain.valueobject.WorkingCalendar;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Service
@Transactional
public class ActivityStatusService {

    private final ActivityRepository activityRepository;
    private final WorkingTimeCalculator workingTimeCalculator;

    @Autowired
    public ActivityStatusService(ActivityRepository activityRepository,
                               WorkingTimeCalculator workingTimeCalculator) {
        this.activityRepository = activityRepository;
        this.workingTimeCalculator = workingTimeCalculator;
    }

    public void changeStatus(Activity activity, Status newStatus, User currentUser) {
        validateStatusTransition(activity, newStatus, currentUser);
        
        Status oldStatus = activity.getStatus();
        activity.setStatus(newStatus);
        
        handleStatusTransitionSideEffects(activity, oldStatus, newStatus, currentUser);
        
        if (newStatus == Status.IN_PROGRESS) {
            calculateAndSetTrackingStatus(activity);
        } else {
            activity.setTrackingStatus(null);
        }
        
        activityRepository.save(activity);
    }

    public void verifyActivity(Activity activity, User verifyingUser, Map<String, String> checklistComments) {
        if (!canVerifyActivity(verifyingUser)) {
            throw new SecurityException("Only Project Managers can verify activities");
        }
        
        if (activity.getStatus() != Status.COMPLETED) {
            throw new IllegalStateException("Can only verify completed activities");
        }
        
        // Check that all child tasks are verified
        List<Task> unverifiedTasks = activity.getTasks().stream()
                .filter(task -> task.getStatus() != Status.VERIFIED)
                .toList();
        
        if (!unverifiedTasks.isEmpty()) {
            throw new IllegalStateException("Cannot verify activity: " + 
                unverifiedTasks.size() + " task(s) are not verified");
        }
        
        // Validate checklist completion if required
        if (activity.getVerificationChecklist() != null && !activity.getVerificationChecklist().isEmpty()) {
            validateChecklistCompletion(activity, checklistComments);
        }
        
        activity.setStatus(Status.VERIFIED);
        activity.setVerifiedAt(LocalDateTime.now());
        activity.setVerifiedByUser(verifyingUser);
        activity.setTrackingStatus(null);
        
        activityRepository.save(activity);
    }

    public void recalculateStatusFromTasks(Activity activity) {
        List<Task> tasks = activity.getTasks().stream().toList();
        if (tasks.isEmpty()) {
            return;
        }
        
        // Count tasks by status
        long notStartedCount = tasks.stream().filter(t -> t.getStatus() == Status.NOT_STARTED).count();
        long inProgressCount = tasks.stream().filter(t -> t.getStatus() == Status.IN_PROGRESS).count();
        long onHoldCount = tasks.stream().filter(t -> t.getStatus() == Status.ON_HOLD).count();
        long completedCount = tasks.stream().filter(t -> t.getStatus() == Status.COMPLETED).count();
        long verifiedCount = tasks.stream().filter(t -> t.getStatus() == Status.VERIFIED).count();
        
        Status newStatus;
        if (verifiedCount == tasks.size()) {
            newStatus = Status.VERIFIED;
        } else if (completedCount + verifiedCount == tasks.size()) {
            newStatus = Status.COMPLETED;
        } else if (notStartedCount == tasks.size()) {
            newStatus = Status.NOT_STARTED;
        } else if (onHoldCount > 0 && inProgressCount == 0 && completedCount == 0) {
            newStatus = Status.ON_HOLD;
        } else {
            newStatus = Status.IN_PROGRESS;
        }
        
        if (activity.getStatus() != newStatus) {
            activity.setStatus(newStatus);
            
            if (newStatus == Status.IN_PROGRESS) {
                calculateAndSetTrackingStatus(activity);
            } else {
                activity.setTrackingStatus(null);
            }
            
            activityRepository.save(activity);
        }
    }

    public void recalculatePercentageFromTasks(Activity activity) {
        List<Task> tasks = activity.getTasks().stream().toList();
        if (tasks.isEmpty()) {
            activity.setPercentageComplete(0);
        } else {
            int totalPercentage = tasks.stream()
                    .mapToInt(Task::getPercentageComplete)
                    .sum();
            activity.setPercentageComplete(totalPercentage / tasks.size());
        }
        
        if (activity.getStatus() == Status.IN_PROGRESS) {
            calculateAndSetTrackingStatus(activity);
        }
        
        activityRepository.save(activity);
    }

    public void calculateAndSetTrackingStatus(Activity activity) {
        if (activity.getStatus() != Status.IN_PROGRESS) {
            activity.setTrackingStatus(null);
            return;
        }
        
        if (activity.getEndDate() == null || activity.getStartDate() == null) {
            activity.setTrackingStatus(TrackingStatus.ON_TRACK);
            return;
        }
        
        WorkingCalendar calendar = getActivityWorkingCalendar(activity);
        LocalDateTime now = LocalDateTime.now();
        
        // Calculate expected progress based on time elapsed
        Duration totalDuration = workingTimeCalculator.calculateWorkingDuration(
            activity.getStartDate(), activity.getEndDate(), calendar);
        Duration elapsedDuration = workingTimeCalculator.calculateWorkingDuration(
            activity.getStartDate(), now, calendar);
        
        if (totalDuration.isZero() || totalDuration.isNegative()) {
            activity.setTrackingStatus(TrackingStatus.ON_TRACK);
            return;
        }
        
        double expectedProgress = Math.min(100.0, 
            (double) elapsedDuration.toMinutes() / totalDuration.toMinutes() * 100);
        double actualProgress = activity.getPercentageComplete();
        
        // Get at-risk threshold from organization (default 10%)
        double atRiskThreshold = getAtRiskThreshold(activity);
        
        if (actualProgress >= expectedProgress - atRiskThreshold) {
            activity.setTrackingStatus(TrackingStatus.ON_TRACK);
        } else if (actualProgress >= expectedProgress - (atRiskThreshold * 2)) {
            activity.setTrackingStatus(TrackingStatus.AT_RISK);
        } else {
            activity.setTrackingStatus(TrackingStatus.OFF_TRACK);
        }
    }

    private void validateStatusTransition(Activity activity, Status newStatus, User currentUser) {
        if (!activity.getStatus().canTransitionTo(newStatus)) {
            throw new IllegalStateException(
                String.format("Cannot transition from %s to %s", activity.getStatus(), newStatus));
        }
        
        // Validate permissions for specific transitions
        if (newStatus == Status.VERIFIED && !canVerifyActivity(currentUser)) {
            throw new SecurityException("Only Project Managers can verify activities");
        }
    }

    private void handleStatusTransitionSideEffects(Activity activity, Status oldStatus, Status newStatus, User currentUser) {
        // Set actual dates when transitioning to/from IN_PROGRESS
        if (oldStatus == Status.NOT_STARTED && newStatus == Status.IN_PROGRESS) {
            activity.setActualStartDate(LocalDateTime.now());
        }
        
        if (oldStatus == Status.IN_PROGRESS && newStatus == Status.COMPLETED) {
            activity.setActualEndDate(LocalDateTime.now());
            activity.setPercentageComplete(100);
        }
        
        if (newStatus == Status.VERIFIED) {
            activity.setVerifiedAt(LocalDateTime.now());
            activity.setVerifiedByUser(currentUser);
        }
        
        // Clear verification info if moving away from verified status (shouldn't happen normally)
        if (oldStatus == Status.VERIFIED && newStatus != Status.VERIFIED) {
            activity.setVerifiedAt(null);
            activity.setVerifiedByUser(null);
        }
    }

    private void validateChecklistCompletion(Activity activity, Map<String, String> checklistComments) {
        if (checklistComments == null || checklistComments.isEmpty()) {
            throw new IllegalArgumentException("Checklist comments are required for activity verification");
        }
        
        // In a real implementation, you'd validate against the actual checklist items
        // For now, we assume all required checklist items are provided
    }

    private boolean canVerifyActivity(User user) {
        return user != null && user.getRole() == Role.PM;
    }

    private WorkingCalendar getActivityWorkingCalendar(Activity activity) {
        // Use project calendar if available, otherwise organization calendar
        if (activity.getProject().getWorkingCalendar() != null) {
            return activity.getProject().getWorkingCalendar();
        }
        return activity.getProject().getOrganisation().getWorkingCalendar();
    }

    private double getAtRiskThreshold(Activity activity) {
        return activity.getProject().getOrganisation().getAtRiskThresholdPercentage();
    }

    @Transactional(readOnly = true)
    public void recalculateTrackingStatusForInProgressActivities() {
        activityRepository.findByStatus(Status.IN_PROGRESS).forEach(this::calculateAndSetTrackingStatus);
    }
}