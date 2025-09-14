package com.salwita.taskmanagement.domain.model;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Represents date constraints for a task or activity, including valid date ranges
 * and reasons for the constraints.
 */
public class DateConstraints {
    
    private Long taskId;
    private Long activityId;
    private Long projectId;
    
    private LocalDateTime earliestStartTime;
    private LocalDateTime latestEndTime;
    private Duration minimumDuration;
    
    private boolean feasible;
    private List<String> constraintViolations;
    private List<ConstraintReason> constraintReasons;
    
    public DateConstraints() {
        this.feasible = true;
        this.constraintViolations = new ArrayList<>();
        this.constraintReasons = new ArrayList<>();
    }
    
    // Getters and setters
    
    public Long getTaskId() {
        return taskId;
    }
    
    public void setTaskId(Long taskId) {
        this.taskId = taskId;
    }
    
    public Long getActivityId() {
        return activityId;
    }
    
    public void setActivityId(Long activityId) {
        this.activityId = activityId;
    }
    
    public Long getProjectId() {
        return projectId;
    }
    
    public void setProjectId(Long projectId) {
        this.projectId = projectId;
    }
    
    public LocalDateTime getEarliestStartTime() {
        return earliestStartTime;
    }
    
    public void setEarliestStartTime(LocalDateTime earliestStartTime) {
        this.earliestStartTime = earliestStartTime;
    }
    
    public LocalDateTime getLatestEndTime() {
        return latestEndTime;
    }
    
    public void setLatestEndTime(LocalDateTime latestEndTime) {
        this.latestEndTime = latestEndTime;
    }
    
    public Duration getMinimumDuration() {
        return minimumDuration;
    }
    
    public void setMinimumDuration(Duration minimumDuration) {
        this.minimumDuration = minimumDuration;
    }
    
    public boolean isFeasible() {
        return feasible;
    }
    
    public void setFeasible(boolean feasible) {
        this.feasible = feasible;
    }
    
    public List<String> getConstraintViolations() {
        return constraintViolations;
    }
    
    public void setConstraintViolations(List<String> constraintViolations) {
        this.constraintViolations = constraintViolations;
    }
    
    public void addConstraintViolation(String violation) {
        this.constraintViolations.add(violation);
    }
    
    public List<ConstraintReason> getConstraintReasons() {
        return constraintReasons;
    }
    
    public void setConstraintReasons(List<ConstraintReason> constraintReasons) {
        this.constraintReasons = constraintReasons;
    }
    
    public void addConstraintReason(ConstraintReason reason) {
        this.constraintReasons.add(reason);
    }
    
    /**
     * Calculate the maximum possible duration given the constraints
     */
    public Duration getMaximumPossibleDuration() {
        if (earliestStartTime == null || latestEndTime == null) {
            return null;
        }
        return Duration.between(earliestStartTime, latestEndTime);
    }
    
    /**
     * Check if a proposed start/end time falls within constraints
     */
    public boolean isValidDateRange(LocalDateTime startTime, LocalDateTime endTime) {
        if (!feasible) {
            return false;
        }
        
        if (startTime.isAfter(endTime)) {
            return false;
        }
        
        if (earliestStartTime != null && startTime.isBefore(earliestStartTime)) {
            return false;
        }
        
        if (latestEndTime != null && endTime.isAfter(latestEndTime)) {
            return false;
        }
        
        Duration proposedDuration = Duration.between(startTime, endTime);
        if (minimumDuration != null && proposedDuration.compareTo(minimumDuration) < 0) {
            return false;
        }
        
        return true;
    }
    
    /**
     * Get the latest possible start time given the constraints and minimum duration
     */
    public LocalDateTime getLatestPossibleStartTime() {
        if (latestEndTime == null || minimumDuration == null) {
            return null;
        }
        return latestEndTime.minus(minimumDuration);
    }
    
    /**
     * Get the earliest possible end time given the constraints and minimum duration
     */
    public LocalDateTime getEarliestPossibleEndTime() {
        if (earliestStartTime == null || minimumDuration == null) {
            return null;
        }
        return earliestStartTime.plus(minimumDuration);
    }
    
    @Override
    public String toString() {
        return "DateConstraints{" +
               "taskId=" + taskId +
               ", activityId=" + activityId +
               ", projectId=" + projectId +
               ", earliestStartTime=" + earliestStartTime +
               ", latestEndTime=" + latestEndTime +
               ", minimumDuration=" + minimumDuration +
               ", feasible=" + feasible +
               ", violations=" + constraintViolations.size() +
               ", reasons=" + constraintReasons.size() +
               '}';
    }
}