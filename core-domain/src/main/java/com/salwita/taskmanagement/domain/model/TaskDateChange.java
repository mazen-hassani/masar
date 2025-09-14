package com.salwita.taskmanagement.domain.model;

import java.time.LocalDateTime;
import java.time.Duration;

/**
 * Represents a proposed change to task dates for validation
 */
public class TaskDateChange {
    
    public enum ChangeType {
        START_DATE_ONLY,
        END_DATE_ONLY,
        BOTH_DATES,
        DURATION_CHANGE,
        MOVE_TASK
    }
    
    private Long taskId;
    private ChangeType changeType;
    
    // Original dates
    private LocalDateTime originalStartDate;
    private LocalDateTime originalEndDate;
    private Duration originalDuration;
    
    // Proposed dates
    private LocalDateTime proposedStartDate;
    private LocalDateTime proposedEndDate;
    private Duration proposedDuration;
    
    // Change metadata
    private String changeReason;
    private boolean userInitiated;
    private boolean systemGenerated;
    private LocalDateTime changeRequestedAt;
    
    public TaskDateChange() {
        this.changeRequestedAt = LocalDateTime.now();
        this.userInitiated = true;
        this.systemGenerated = false;
    }
    
    public TaskDateChange(Long taskId, LocalDateTime proposedStartDate, LocalDateTime proposedEndDate) {
        this();
        this.taskId = taskId;
        this.proposedStartDate = proposedStartDate;
        this.proposedEndDate = proposedEndDate;
        this.changeType = ChangeType.BOTH_DATES;
        
        if (proposedStartDate != null && proposedEndDate != null) {
            this.proposedDuration = Duration.between(proposedStartDate, proposedEndDate);
        }
    }
    
    // Static factory methods for common change types
    
    public static TaskDateChange startDateChange(Long taskId, LocalDateTime newStartDate) {
        TaskDateChange change = new TaskDateChange();
        change.taskId = taskId;
        change.proposedStartDate = newStartDate;
        change.changeType = ChangeType.START_DATE_ONLY;
        return change;
    }
    
    public static TaskDateChange endDateChange(Long taskId, LocalDateTime newEndDate) {
        TaskDateChange change = new TaskDateChange();
        change.taskId = taskId;
        change.proposedEndDate = newEndDate;
        change.changeType = ChangeType.END_DATE_ONLY;
        return change;
    }
    
    public static TaskDateChange durationChange(Long taskId, Duration newDuration) {
        TaskDateChange change = new TaskDateChange();
        change.taskId = taskId;
        change.proposedDuration = newDuration;
        change.changeType = ChangeType.DURATION_CHANGE;
        return change;
    }
    
    public static TaskDateChange moveTask(Long taskId, LocalDateTime newStartDate, Duration duration) {
        TaskDateChange change = new TaskDateChange();
        change.taskId = taskId;
        change.proposedStartDate = newStartDate;
        change.proposedDuration = duration;
        change.proposedEndDate = newStartDate.plus(duration);
        change.changeType = ChangeType.MOVE_TASK;
        return change;
    }
    
    // Helper methods
    
    public boolean isStartDateChanged() {
        return proposedStartDate != null && 
               (originalStartDate == null || !proposedStartDate.equals(originalStartDate));
    }
    
    public boolean isEndDateChanged() {
        return proposedEndDate != null && 
               (originalEndDate == null || !proposedEndDate.equals(originalEndDate));
    }
    
    public boolean isDurationChanged() {
        if (proposedDuration != null) {
            return originalDuration == null || !proposedDuration.equals(originalDuration);
        }
        
        // Calculate duration from dates if not explicitly set
        if (proposedStartDate != null && proposedEndDate != null) {
            Duration newDuration = Duration.between(proposedStartDate, proposedEndDate);
            return originalDuration == null || !newDuration.equals(originalDuration);
        }
        
        return false;
    }
    
    public Duration getCalculatedDuration() {
        if (proposedDuration != null) {
            return proposedDuration;
        }
        
        if (proposedStartDate != null && proposedEndDate != null) {
            return Duration.between(proposedStartDate, proposedEndDate);
        }
        
        return originalDuration;
    }
    
    // Getters and setters
    
    public Long getTaskId() {
        return taskId;
    }
    
    public void setTaskId(Long taskId) {
        this.taskId = taskId;
    }
    
    public ChangeType getChangeType() {
        return changeType;
    }
    
    public void setChangeType(ChangeType changeType) {
        this.changeType = changeType;
    }
    
    public LocalDateTime getOriginalStartDate() {
        return originalStartDate;
    }
    
    public void setOriginalStartDate(LocalDateTime originalStartDate) {
        this.originalStartDate = originalStartDate;
    }
    
    public LocalDateTime getOriginalEndDate() {
        return originalEndDate;
    }
    
    public void setOriginalEndDate(LocalDateTime originalEndDate) {
        this.originalEndDate = originalEndDate;
    }
    
    public Duration getOriginalDuration() {
        return originalDuration;
    }
    
    public void setOriginalDuration(Duration originalDuration) {
        this.originalDuration = originalDuration;
    }
    
    public LocalDateTime getProposedStartDate() {
        return proposedStartDate;
    }
    
    public void setProposedStartDate(LocalDateTime proposedStartDate) {
        this.proposedStartDate = proposedStartDate;
    }
    
    public LocalDateTime getProposedEndDate() {
        return proposedEndDate;
    }
    
    public void setProposedEndDate(LocalDateTime proposedEndDate) {
        this.proposedEndDate = proposedEndDate;
    }
    
    public Duration getProposedDuration() {
        return proposedDuration;
    }
    
    public void setProposedDuration(Duration proposedDuration) {
        this.proposedDuration = proposedDuration;
    }
    
    public String getChangeReason() {
        return changeReason;
    }
    
    public void setChangeReason(String changeReason) {
        this.changeReason = changeReason;
    }
    
    public boolean isUserInitiated() {
        return userInitiated;
    }
    
    public void setUserInitiated(boolean userInitiated) {
        this.userInitiated = userInitiated;
    }
    
    public boolean isSystemGenerated() {
        return systemGenerated;
    }
    
    public void setSystemGenerated(boolean systemGenerated) {
        this.systemGenerated = systemGenerated;
    }
    
    public LocalDateTime getChangeRequestedAt() {
        return changeRequestedAt;
    }
    
    public void setChangeRequestedAt(LocalDateTime changeRequestedAt) {
        this.changeRequestedAt = changeRequestedAt;
    }
    
    @Override
    public String toString() {
        return "TaskDateChange{" +
               "taskId=" + taskId +
               ", changeType=" + changeType +
               ", proposedStartDate=" + proposedStartDate +
               ", proposedEndDate=" + proposedEndDate +
               ", proposedDuration=" + proposedDuration +
               ", changeReason='" + changeReason + '\'' +
               ", userInitiated=" + userInitiated +
               '}';
    }
}