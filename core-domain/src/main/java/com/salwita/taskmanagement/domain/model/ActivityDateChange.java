package com.salwita.taskmanagement.domain.model;

import java.time.LocalDateTime;
import java.time.Duration;

/**
 * Represents a proposed change to activity dates for validation
 */
public class ActivityDateChange {
    
    public enum ChangeType {
        START_DATE_ONLY,
        END_DATE_ONLY,
        BOTH_DATES,
        DURATION_CHANGE,
        MOVE_ACTIVITY
    }
    
    private Long activityId;
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
    private boolean propagateToTasks;
    
    public ActivityDateChange() {
        this.changeRequestedAt = LocalDateTime.now();
        this.userInitiated = true;
        this.systemGenerated = false;
        this.propagateToTasks = true;
    }
    
    public ActivityDateChange(Long activityId, LocalDateTime proposedStartDate, LocalDateTime proposedEndDate) {
        this();
        this.activityId = activityId;
        this.proposedStartDate = proposedStartDate;
        this.proposedEndDate = proposedEndDate;
        this.changeType = ChangeType.BOTH_DATES;
        
        if (proposedStartDate != null && proposedEndDate != null) {
            this.proposedDuration = Duration.between(proposedStartDate, proposedEndDate);
        }
    }
    
    // Static factory methods for common change types
    
    public static ActivityDateChange startDateChange(Long activityId, LocalDateTime newStartDate) {
        ActivityDateChange change = new ActivityDateChange();
        change.activityId = activityId;
        change.proposedStartDate = newStartDate;
        change.changeType = ChangeType.START_DATE_ONLY;
        return change;
    }
    
    public static ActivityDateChange endDateChange(Long activityId, LocalDateTime newEndDate) {
        ActivityDateChange change = new ActivityDateChange();
        change.activityId = activityId;
        change.proposedEndDate = newEndDate;
        change.changeType = ChangeType.END_DATE_ONLY;
        return change;
    }
    
    public static ActivityDateChange durationChange(Long activityId, Duration newDuration) {
        ActivityDateChange change = new ActivityDateChange();
        change.activityId = activityId;
        change.proposedDuration = newDuration;
        change.changeType = ChangeType.DURATION_CHANGE;
        return change;
    }
    
    public static ActivityDateChange moveActivity(Long activityId, LocalDateTime newStartDate, Duration duration) {
        ActivityDateChange change = new ActivityDateChange();
        change.activityId = activityId;
        change.proposedStartDate = newStartDate;
        change.proposedDuration = duration;
        change.proposedEndDate = newStartDate.plus(duration);
        change.changeType = ChangeType.MOVE_ACTIVITY;
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
    
    public Long getActivityId() {
        return activityId;
    }
    
    public void setActivityId(Long activityId) {
        this.activityId = activityId;
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
    
    public boolean isPropagateToTasks() {
        return propagateToTasks;
    }
    
    public void setPropagateToTasks(boolean propagateToTasks) {
        this.propagateToTasks = propagateToTasks;
    }
    
    @Override
    public String toString() {
        return "ActivityDateChange{" +
               "activityId=" + activityId +
               ", changeType=" + changeType +
               ", proposedStartDate=" + proposedStartDate +
               ", proposedEndDate=" + proposedEndDate +
               ", proposedDuration=" + proposedDuration +
               ", changeReason='" + changeReason + '\'' +
               ", userInitiated=" + userInitiated +
               ", propagateToTasks=" + propagateToTasks +
               '}';
    }
}