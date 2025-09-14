package com.salwita.taskmanagement.api.controller;

import com.salwita.taskmanagement.domain.entity.Task;
import com.salwita.taskmanagement.domain.entity.Activity;
import com.salwita.taskmanagement.domain.model.*;
import com.salwita.taskmanagement.domain.repository.TaskRepository;
import com.salwita.taskmanagement.domain.repository.ActivityRepository;
import com.salwita.taskmanagement.domain.service.DateConstraintCalculator;
import com.salwita.taskmanagement.domain.service.ConstraintValidationService;
import com.salwita.taskmanagement.api.dto.DateValidityResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;

/**
 * REST API controller for date constraint validation and calculation
 */
@RestController
@RequestMapping("/api/date-constraints")
@CrossOrigin(origins = "*", maxAge = 3600)
public class DateConstraintController {
    
    private final DateConstraintCalculator constraintCalculator;
    private final ConstraintValidationService validationService;
    private final TaskRepository taskRepository;
    private final ActivityRepository activityRepository;
    
    @Autowired
    public DateConstraintController(
            DateConstraintCalculator constraintCalculator,
            ConstraintValidationService validationService,
            TaskRepository taskRepository,
            ActivityRepository activityRepository) {
        this.constraintCalculator = constraintCalculator;
        this.validationService = validationService;
        this.taskRepository = taskRepository;
        this.activityRepository = activityRepository;
    }
    
    /**
     * Get date constraints for a specific task
     */
    @GetMapping("/tasks/{taskId}")
    public ResponseEntity<DateConstraints> getTaskConstraints(@PathVariable Long taskId) {
        Task task = taskRepository.findById(taskId).orElse(null);
        if (task == null) {
            return ResponseEntity.notFound().build();
        }
        
        DateConstraints constraints = constraintCalculator.calculateTaskConstraints(task);
        return ResponseEntity.ok(constraints);
    }
    
    /**
     * Get date constraints for a specific activity
     */
    @GetMapping("/activities/{activityId}")
    public ResponseEntity<DateConstraints> getActivityConstraints(@PathVariable Long activityId) {
        Activity activity = activityRepository.findById(activityId).orElse(null);
        if (activity == null) {
            return ResponseEntity.notFound().build();
        }
        
        DateConstraints constraints = constraintCalculator.calculateActivityConstraints(activity);
        return ResponseEntity.ok(constraints);
    }
    
    /**
     * Validate a proposed task date change
     */
    @PostMapping("/tasks/{taskId}/validate")
    public ResponseEntity<EditValidationResult> validateTaskDateChange(
            @PathVariable Long taskId,
            @RequestBody TaskDateChangeRequest request) {
        
        TaskDateChange change = new TaskDateChange(taskId, request.getStartDate(), request.getEndDate());
        change.setChangeReason(request.getReason());
        change.setChangeType(request.getChangeType());
        
        EditValidationResult result = validationService.validateTaskDateChange(change);
        return ResponseEntity.ok(result);
    }
    
    /**
     * Validate a proposed activity date change
     */
    @PostMapping("/activities/{activityId}/validate")
    public ResponseEntity<EditValidationResult> validateActivityDateChange(
            @PathVariable Long activityId,
            @RequestBody ActivityDateChangeRequest request) {
        
        ActivityDateChange change = new ActivityDateChange(activityId, request.getStartDate(), request.getEndDate());
        change.setChangeReason(request.getReason());
        change.setChangeType(request.getChangeType());
        change.setPropagateToTasks(request.isPropagateToTasks());
        
        EditValidationResult result = validationService.validateActivityDateChange(change);
        return ResponseEntity.ok(result);
    }
    
    /**
     * Check if a date range is valid for a task
     */
    @PostMapping("/tasks/{taskId}/check-validity")
    public ResponseEntity<DateValidityResponse> checkTaskDateValidity(
            @PathVariable Long taskId,
            @RequestBody DateRangeRequest request) {
        
        Task task = taskRepository.findById(taskId).orElse(null);
        if (task == null) {
            return ResponseEntity.notFound().build();
        }
        
        DateConstraints constraints = constraintCalculator.calculateTaskConstraints(task);
        boolean isValid = constraints.isValidDateRange(request.getStartDate(), request.getEndDate());
        
        DateValidityResponse response = new DateValidityResponse();
        response.setValid(isValid);
        response.setTaskId(taskId);
        response.setStartDate(request.getStartDate());
        response.setEndDate(request.getEndDate());
        
        if (!isValid) {
            response.setReason("Date range violates task constraints");
            // Add specific constraint violations
            if (request.getStartDate().isBefore(constraints.getEarliestStartTime())) {
                response.addViolation("Start date is too early");
            }
            if (request.getEndDate().isAfter(constraints.getLatestEndTime())) {
                response.addViolation("End date is too late");
            }
        }
        
        return ResponseEntity.ok(response);
    }
    
    /**
     * Check if a date range is valid for an activity
     */
    @PostMapping("/activities/{activityId}/check-validity")
    public ResponseEntity<DateValidityResponse> checkActivityDateValidity(
            @PathVariable Long activityId,
            @RequestBody DateRangeRequest request) {
        
        Activity activity = activityRepository.findById(activityId).orElse(null);
        if (activity == null) {
            return ResponseEntity.notFound().build();
        }
        
        DateConstraints constraints = constraintCalculator.calculateActivityConstraints(activity);
        boolean isValid = constraints.isValidDateRange(request.getStartDate(), request.getEndDate());
        
        DateValidityResponse response = new DateValidityResponse();
        response.setValid(isValid);
        response.setActivityId(activityId);
        response.setStartDate(request.getStartDate());
        response.setEndDate(request.getEndDate());
        
        if (!isValid) {
            response.setReason("Date range violates activity constraints");
            // Add specific constraint violations
            if (request.getStartDate().isBefore(constraints.getEarliestStartTime())) {
                response.addViolation("Start date is too early");
            }
            if (request.getEndDate().isAfter(constraints.getLatestEndTime())) {
                response.addViolation("End date is too late");
            }
        }
        
        return ResponseEntity.ok(response);
    }
    
    /**
     * Get downstream impact of a potential task date change
     */
    @PostMapping("/tasks/{taskId}/impact-analysis")
    public ResponseEntity<DownstreamImpact> analyzeTaskDateChangeImpact(
            @PathVariable Long taskId,
            @RequestBody TaskDateChangeRequest request) {
        
        TaskDateChange change = new TaskDateChange(taskId, request.getStartDate(), request.getEndDate());
        change.setChangeReason(request.getReason());
        
        EditValidationResult result = validationService.validateTaskDateChange(change);
        
        if (result.getDownstreamImpact() != null) {
            return ResponseEntity.ok(result.getDownstreamImpact());
        } else {
            return ResponseEntity.ok(new DownstreamImpact());
        }
    }
    
    /**
     * Get downstream impact of a potential activity date change
     */
    @PostMapping("/activities/{activityId}/impact-analysis")
    public ResponseEntity<DownstreamImpact> analyzeActivityDateChangeImpact(
            @PathVariable Long activityId,
            @RequestBody ActivityDateChangeRequest request) {
        
        ActivityDateChange change = new ActivityDateChange(activityId, request.getStartDate(), request.getEndDate());
        change.setChangeReason(request.getReason());
        change.setPropagateToTasks(request.isPropagateToTasks());
        
        EditValidationResult result = validationService.validateActivityDateChange(change);
        
        if (result.getDownstreamImpact() != null) {
            return ResponseEntity.ok(result.getDownstreamImpact());
        } else {
            return ResponseEntity.ok(new DownstreamImpact());
        }
    }
    
    // Request DTOs
    
    public static class TaskDateChangeRequest {
        private LocalDateTime startDate;
        private LocalDateTime endDate;
        private String reason;
        private TaskDateChange.ChangeType changeType = TaskDateChange.ChangeType.BOTH_DATES;
        
        // Getters and setters
        public LocalDateTime getStartDate() { return startDate; }
        public void setStartDate(LocalDateTime startDate) { this.startDate = startDate; }
        
        public LocalDateTime getEndDate() { return endDate; }
        public void setEndDate(LocalDateTime endDate) { this.endDate = endDate; }
        
        public String getReason() { return reason; }
        public void setReason(String reason) { this.reason = reason; }
        
        public TaskDateChange.ChangeType getChangeType() { return changeType; }
        public void setChangeType(TaskDateChange.ChangeType changeType) { this.changeType = changeType; }
    }
    
    public static class ActivityDateChangeRequest {
        private LocalDateTime startDate;
        private LocalDateTime endDate;
        private String reason;
        private ActivityDateChange.ChangeType changeType = ActivityDateChange.ChangeType.BOTH_DATES;
        private boolean propagateToTasks = true;
        
        // Getters and setters
        public LocalDateTime getStartDate() { return startDate; }
        public void setStartDate(LocalDateTime startDate) { this.startDate = startDate; }
        
        public LocalDateTime getEndDate() { return endDate; }
        public void setEndDate(LocalDateTime endDate) { this.endDate = endDate; }
        
        public String getReason() { return reason; }
        public void setReason(String reason) { this.reason = reason; }
        
        public ActivityDateChange.ChangeType getChangeType() { return changeType; }
        public void setChangeType(ActivityDateChange.ChangeType changeType) { this.changeType = changeType; }
        
        public boolean isPropagateToTasks() { return propagateToTasks; }
        public void setPropagateToTasks(boolean propagateToTasks) { this.propagateToTasks = propagateToTasks; }
    }
    
    public static class DateRangeRequest {
        private LocalDateTime startDate;
        private LocalDateTime endDate;
        
        // Getters and setters
        public LocalDateTime getStartDate() { return startDate; }
        public void setStartDate(LocalDateTime startDate) { this.startDate = startDate; }
        
        public LocalDateTime getEndDate() { return endDate; }
        public void setEndDate(LocalDateTime endDate) { this.endDate = endDate; }
    }
}