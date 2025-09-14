package com.salwita.taskmanagement.api.dto;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * DTO representing the result of a date validity check
 */
public class DateValidityResponse {
    
    private boolean valid;
    private Long taskId;
    private Long activityId;
    private LocalDateTime startDate;
    private LocalDateTime endDate;
    private String reason;
    private List<String> violations;
    
    public DateValidityResponse() {
        this.violations = new ArrayList<>();
    }
    
    public DateValidityResponse(boolean valid) {
        this();
        this.valid = valid;
    }
    
    public void addViolation(String violation) {
        this.violations.add(violation);
    }
    
    // Getters and setters
    
    public boolean isValid() {
        return valid;
    }
    
    public void setValid(boolean valid) {
        this.valid = valid;
    }
    
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
    
    public LocalDateTime getStartDate() {
        return startDate;
    }
    
    public void setStartDate(LocalDateTime startDate) {
        this.startDate = startDate;
    }
    
    public LocalDateTime getEndDate() {
        return endDate;
    }
    
    public void setEndDate(LocalDateTime endDate) {
        this.endDate = endDate;
    }
    
    public String getReason() {
        return reason;
    }
    
    public void setReason(String reason) {
        this.reason = reason;
    }
    
    public List<String> getViolations() {
        return violations;
    }
    
    public void setViolations(List<String> violations) {
        this.violations = violations;
    }
    
    @Override
    public String toString() {
        return "DateValidityResponse{" +
               "valid=" + valid +
               ", taskId=" + taskId +
               ", activityId=" + activityId +
               ", startDate=" + startDate +
               ", endDate=" + endDate +
               ", reason='" + reason + '\'' +
               ", violations=" + violations.size() +
               '}';
    }
}