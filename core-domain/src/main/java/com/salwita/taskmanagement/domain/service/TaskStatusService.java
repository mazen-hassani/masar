package com.salwita.taskmanagement.domain.service;

import com.salwita.taskmanagement.domain.entity.Task;
import com.salwita.taskmanagement.domain.entity.User;
import com.salwita.taskmanagement.domain.enums.Role;
import com.salwita.taskmanagement.domain.enums.Status;
import com.salwita.taskmanagement.domain.enums.TrackingStatus;
import com.salwita.taskmanagement.domain.repository.TaskRepository;
import com.salwita.taskmanagement.domain.valueobject.WorkingCalendar;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;

@Service
@Transactional
public class TaskStatusService {

    private final TaskRepository taskRepository;
    private final WorkingTimeCalculator workingTimeCalculator;
    private final ActivityStatusService activityStatusService;

    @Autowired
    public TaskStatusService(TaskRepository taskRepository, 
                           WorkingTimeCalculator workingTimeCalculator,
                           ActivityStatusService activityStatusService) {
        this.taskRepository = taskRepository;
        this.workingTimeCalculator = workingTimeCalculator;
        this.activityStatusService = activityStatusService;
    }

    public void changeStatus(Task task, Status newStatus, User currentUser) {
        validateStatusTransition(task, newStatus, currentUser);
        
        Status oldStatus = task.getStatus();
        task.setStatus(newStatus);
        
        handleStatusTransitionSideEffects(task, oldStatus, newStatus, currentUser);
        
        if (newStatus == Status.IN_PROGRESS) {
            calculateAndSetTrackingStatus(task);
        } else {
            task.setTrackingStatus(null);
        }
        
        taskRepository.save(task);
        
        // Cascade update to parent activity
        activityStatusService.recalculateStatusFromTasks(task.getActivity());
    }

    public void updatePercentageComplete(Task task, Integer percentageComplete, User currentUser) {
        if (task.getStatus() != Status.IN_PROGRESS) {
            throw new IllegalStateException("Can only update percentage when task is In Progress");
        }
        
        if (percentageComplete < 0 || percentageComplete > 100) {
            throw new IllegalArgumentException("Percentage must be between 0 and 100");
        }
        
        task.setPercentageComplete(percentageComplete);
        calculateAndSetTrackingStatus(task);
        
        taskRepository.save(task);
        
        // Cascade update to parent activity
        activityStatusService.recalculatePercentageFromTasks(task.getActivity());
    }

    public void verifyTask(Task task, User verifyingUser) {
        if (!canVerifyTask(verifyingUser)) {
            throw new SecurityException("Only Project Managers can verify tasks");
        }
        
        if (task.getStatus() != Status.COMPLETED) {
            throw new IllegalStateException("Can only verify completed tasks");
        }
        
        task.setStatus(Status.VERIFIED);
        task.setVerifiedAt(LocalDateTime.now());
        task.setVerifiedByUser(verifyingUser);
        task.setTrackingStatus(null);
        
        taskRepository.save(task);
        
        // Cascade update to parent activity
        activityStatusService.recalculateStatusFromTasks(task.getActivity());
    }

    public void calculateAndSetTrackingStatus(Task task) {
        if (task.getStatus() != Status.IN_PROGRESS) {
            task.setTrackingStatus(null);
            return;
        }
        
        if (task.getEndDate() == null || task.getStartDate() == null) {
            task.setTrackingStatus(TrackingStatus.ON_TRACK);
            return;
        }
        
        WorkingCalendar calendar = getTaskWorkingCalendar(task);
        LocalDateTime now = LocalDateTime.now();
        
        // Calculate expected progress based on time elapsed
        Duration totalDuration = workingTimeCalculator.calculateWorkingDuration(
            task.getStartDate(), task.getEndDate(), calendar);
        Duration elapsedDuration = workingTimeCalculator.calculateWorkingDuration(
            task.getStartDate(), now, calendar);
        
        if (totalDuration.isZero() || totalDuration.isNegative()) {
            task.setTrackingStatus(TrackingStatus.ON_TRACK);
            return;
        }
        
        double expectedProgress = Math.min(100.0, 
            (double) elapsedDuration.toMinutes() / totalDuration.toMinutes() * 100);
        double actualProgress = task.getPercentageComplete();
        
        // Get at-risk threshold from organization (default 10%)
        double atRiskThreshold = getAtRiskThreshold(task);
        
        if (actualProgress >= expectedProgress - atRiskThreshold) {
            task.setTrackingStatus(TrackingStatus.ON_TRACK);
        } else if (actualProgress >= expectedProgress - (atRiskThreshold * 2)) {
            task.setTrackingStatus(TrackingStatus.AT_RISK);
        } else {
            task.setTrackingStatus(TrackingStatus.OFF_TRACK);
        }
    }

    private void validateStatusTransition(Task task, Status newStatus, User currentUser) {
        if (!task.getStatus().canTransitionTo(newStatus)) {
            throw new IllegalStateException(
                String.format("Cannot transition from %s to %s", task.getStatus(), newStatus));
        }
        
        // Validate permissions for specific transitions
        if (newStatus == Status.VERIFIED && !canVerifyTask(currentUser)) {
            throw new SecurityException("Only Project Managers can verify tasks");
        }
    }

    private void handleStatusTransitionSideEffects(Task task, Status oldStatus, Status newStatus, User currentUser) {
        // Set actual dates when transitioning to/from IN_PROGRESS
        if (oldStatus == Status.NOT_STARTED && newStatus == Status.IN_PROGRESS) {
            task.setActualStartDate(LocalDateTime.now());
        }
        
        if (oldStatus == Status.IN_PROGRESS && newStatus == Status.COMPLETED) {
            task.setActualEndDate(LocalDateTime.now());
            task.setPercentageComplete(100);
        }
        
        if (newStatus == Status.VERIFIED) {
            task.setVerifiedAt(LocalDateTime.now());
            task.setVerifiedByUser(currentUser);
        }
        
        // Clear verification info if moving away from verified status (shouldn't happen normally)
        if (oldStatus == Status.VERIFIED && newStatus != Status.VERIFIED) {
            task.setVerifiedAt(null);
            task.setVerifiedByUser(null);
        }
    }

    private boolean canVerifyTask(User user) {
        return user != null && user.getRole() == Role.PM;
    }

    private WorkingCalendar getTaskWorkingCalendar(Task task) {
        // Use project calendar if available, otherwise organization calendar
        if (task.getActivity().getProject().getWorkingCalendar() != null) {
            return task.getActivity().getProject().getWorkingCalendar();
        }
        return task.getActivity().getProject().getOrganisation().getWorkingCalendar();
    }

    private double getAtRiskThreshold(Task task) {
        return task.getActivity().getProject().getOrganisation().getAtRiskThresholdPercentage();
    }

    @Transactional(readOnly = true)
    public void recalculateTrackingStatusForInProgressTasks() {
        taskRepository.findByStatus(Status.IN_PROGRESS).forEach(this::calculateAndSetTrackingStatus);
    }
}