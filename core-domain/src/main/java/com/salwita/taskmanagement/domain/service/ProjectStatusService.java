package com.salwita.taskmanagement.domain.service;

import com.salwita.taskmanagement.domain.entity.Activity;
import com.salwita.taskmanagement.domain.entity.Project;
import com.salwita.taskmanagement.domain.enums.Status;
import com.salwita.taskmanagement.domain.enums.TrackingStatus;
import com.salwita.taskmanagement.domain.repository.ProjectRepository;
import com.salwita.taskmanagement.domain.valueobject.WorkingCalendar;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;

@Service
@Transactional
public class ProjectStatusService {

    private final ProjectRepository projectRepository;
    private final WorkingTimeCalculator workingTimeCalculator;

    @Autowired
    public ProjectStatusService(ProjectRepository projectRepository,
                              WorkingTimeCalculator workingTimeCalculator) {
        this.projectRepository = projectRepository;
        this.workingTimeCalculator = workingTimeCalculator;
    }

    public void recalculateStatusFromActivities(Project project) {
        List<Activity> activities = project.getActivities().stream().toList();
        if (activities.isEmpty()) {
            return;
        }
        
        // Count activities by status
        long notStartedCount = activities.stream().filter(a -> a.getStatus() == Status.NOT_STARTED).count();
        long inProgressCount = activities.stream().filter(a -> a.getStatus() == Status.IN_PROGRESS).count();
        long onHoldCount = activities.stream().filter(a -> a.getStatus() == Status.ON_HOLD).count();
        long completedCount = activities.stream().filter(a -> a.getStatus() == Status.COMPLETED).count();
        long verifiedCount = activities.stream().filter(a -> a.getStatus() == Status.VERIFIED).count();
        
        Status newStatus;
        if (verifiedCount == activities.size()) {
            newStatus = Status.VERIFIED;
        } else if (completedCount + verifiedCount == activities.size()) {
            newStatus = Status.COMPLETED;
        } else if (notStartedCount == activities.size()) {
            newStatus = Status.NOT_STARTED;
        } else if (onHoldCount > 0 && inProgressCount == 0 && completedCount == 0) {
            newStatus = Status.ON_HOLD;
        } else {
            newStatus = Status.IN_PROGRESS;
        }
        
        if (project.getStatus() != newStatus) {
            project.setStatus(newStatus);
            
            if (newStatus == Status.IN_PROGRESS) {
                calculateAndSetTrackingStatus(project);
            } else {
                project.setTrackingStatus(null);
            }
            
            projectRepository.save(project);
        }
    }

    public void recalculatePercentageFromActivities(Project project) {
        List<Activity> activities = project.getActivities().stream().toList();
        if (activities.isEmpty()) {
            project.setPercentageComplete(0);
        } else {
            // Duration-weighted average
            long totalDurationMinutes = 0;
            long weightedProgressMinutes = 0;
            
            WorkingCalendar calendar = getProjectWorkingCalendar(project);
            
            for (Activity activity : activities) {
                if (activity.getStartDate() != null && activity.getEndDate() != null) {
                    Duration activityDuration = workingTimeCalculator.calculateWorkingDuration(
                        activity.getStartDate(), activity.getEndDate(), calendar);
                    long durationMinutes = activityDuration.toMinutes();
                    
                    totalDurationMinutes += durationMinutes;
                    weightedProgressMinutes += (durationMinutes * activity.getPercentageComplete()) / 100;
                }
            }
            
            if (totalDurationMinutes > 0) {
                project.setPercentageComplete((int) ((weightedProgressMinutes * 100) / totalDurationMinutes));
            } else {
                // Fall back to simple average if no durations are available
                int totalPercentage = activities.stream()
                        .mapToInt(Activity::getPercentageComplete)
                        .sum();
                project.setPercentageComplete(totalPercentage / activities.size());
            }
        }
        
        if (project.getStatus() == Status.IN_PROGRESS) {
            calculateAndSetTrackingStatus(project);
        }
        
        projectRepository.save(project);
    }

    public void calculateAndSetTrackingStatus(Project project) {
        if (project.getStatus() != Status.IN_PROGRESS) {
            project.setTrackingStatus(null);
            return;
        }
        
        if (project.getEndDate() == null || project.getStartDate() == null) {
            project.setTrackingStatus(TrackingStatus.ON_TRACK);
            return;
        }
        
        WorkingCalendar calendar = getProjectWorkingCalendar(project);
        LocalDateTime now = LocalDateTime.now();
        
        // Calculate expected progress based on time elapsed
        Duration totalDuration = workingTimeCalculator.calculateWorkingDuration(
            project.getStartDate(), project.getEndDate(), calendar);
        Duration elapsedDuration = workingTimeCalculator.calculateWorkingDuration(
            project.getStartDate(), now, calendar);
        
        if (totalDuration.isZero() || totalDuration.isNegative()) {
            project.setTrackingStatus(TrackingStatus.ON_TRACK);
            return;
        }
        
        double expectedProgress = Math.min(100.0, 
            (double) elapsedDuration.toMinutes() / totalDuration.toMinutes() * 100);
        double actualProgress = project.getPercentageComplete();
        
        // Get at-risk threshold from organization (default 10%)
        double atRiskThreshold = getAtRiskThreshold(project);
        
        if (actualProgress >= expectedProgress - atRiskThreshold) {
            project.setTrackingStatus(TrackingStatus.ON_TRACK);
        } else if (actualProgress >= expectedProgress - (atRiskThreshold * 2)) {
            project.setTrackingStatus(TrackingStatus.AT_RISK);
        } else {
            project.setTrackingStatus(TrackingStatus.OFF_TRACK);
        }
    }

    private WorkingCalendar getProjectWorkingCalendar(Project project) {
        // Use project calendar if available, otherwise organization calendar
        if (project.getWorkingCalendar() != null) {
            return project.getWorkingCalendar();
        }
        return project.getOrganisation().getWorkingCalendar();
    }

    private double getAtRiskThreshold(Project project) {
        return project.getOrganisation().getAtRiskThresholdPercentage();
    }

    @Transactional(readOnly = true)
    public void recalculateTrackingStatusForInProgressProjects() {
        projectRepository.findByStatus(Status.IN_PROGRESS).forEach(this::calculateAndSetTrackingStatus);
    }
}