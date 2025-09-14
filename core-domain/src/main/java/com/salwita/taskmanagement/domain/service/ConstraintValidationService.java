package com.salwita.taskmanagement.domain.service;

import com.salwita.taskmanagement.domain.entity.Task;
import com.salwita.taskmanagement.domain.entity.Activity;
import com.salwita.taskmanagement.domain.entity.Dependency;
import com.salwita.taskmanagement.domain.enums.DependencyType;
import com.salwita.taskmanagement.domain.model.*;
import com.salwita.taskmanagement.domain.repository.TaskRepository;
import com.salwita.taskmanagement.domain.repository.ActivityRepository;
import com.salwita.taskmanagement.domain.repository.DependencyRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.Duration;
import java.util.List;
import java.util.Set;
import java.util.HashSet;

/**
 * Service for validating date changes to tasks and activities
 * Ensures manual edits maintain schedule validity and dependency constraints
 */
@Service
@Transactional(readOnly = true)
public class ConstraintValidationService {
    
    private final DateConstraintCalculator constraintCalculator;
    private final TaskRepository taskRepository;
    private final ActivityRepository activityRepository;
    private final DependencyRepository dependencyRepository;
    private final WorkingTimeCalculator workingTimeCalculator;
    
    @Autowired
    public ConstraintValidationService(
            DateConstraintCalculator constraintCalculator,
            TaskRepository taskRepository,
            ActivityRepository activityRepository,
            DependencyRepository dependencyRepository,
            WorkingTimeCalculator workingTimeCalculator) {
        this.constraintCalculator = constraintCalculator;
        this.taskRepository = taskRepository;
        this.activityRepository = activityRepository;
        this.dependencyRepository = dependencyRepository;
        this.workingTimeCalculator = workingTimeCalculator;
    }
    
    /**
     * Validate a proposed task date change
     */
    public EditValidationResult validateTaskDateChange(TaskDateChange change) {
        if (change.getTaskId() == null) {
            return EditValidationResult.error("Task ID cannot be null");
        }
        
        Task task = taskRepository.findById(change.getTaskId()).orElse(null);
        if (task == null) {
            return EditValidationResult.error("Task not found: " + change.getTaskId());
        }
        
        // Set original dates if not already set
        if (change.getOriginalStartDate() == null) {
            change.setOriginalStartDate(task.getStartDate());
        }
        if (change.getOriginalEndDate() == null) {
            change.setOriginalEndDate(task.getEndDate());
        }
        
        return validateTaskDateChangeInternal(task, change);
    }
    
    /**
     * Validate a proposed activity date change
     */
    public EditValidationResult validateActivityDateChange(ActivityDateChange change) {
        if (change.getActivityId() == null) {
            return EditValidationResult.error("Activity ID cannot be null");
        }
        
        Activity activity = activityRepository.findById(change.getActivityId()).orElse(null);
        if (activity == null) {
            return EditValidationResult.error("Activity not found: " + change.getActivityId());
        }
        
        // Set original dates if not already set
        if (change.getOriginalStartDate() == null) {
            change.setOriginalStartDate(activity.getStartDate());
        }
        if (change.getOriginalEndDate() == null) {
            change.setOriginalEndDate(activity.getEndDate());
        }
        
        return validateActivityDateChangeInternal(activity, change);
    }
    
    private EditValidationResult validateTaskDateChangeInternal(Task task, TaskDateChange change) {
        EditValidationResult result = new EditValidationResult();
        
        // Basic validation
        if (!validateBasicDateRules(change.getProposedStartDate(), change.getProposedEndDate(), result)) {
            return result;
        }
        
        // Get current constraints for the task
        DateConstraints constraints = constraintCalculator.calculateTaskConstraints(task);
        
        // Validate against constraints
        if (!validateAgainstConstraints(change.getProposedStartDate(), change.getProposedEndDate(), constraints, result)) {
            // If invalid, try to suggest alternative dates
            suggestAlternativeDates(constraints, change, result);
        }
        
        // Calculate downstream impact
        if (result.isCanProceed()) {
            DownstreamImpact impact = calculateDownstreamImpact(task, change);
            result.setDownstreamImpact(impact);
            
            // Add warnings if there's significant impact
            if (impact.hasHighImpact()) {
                result.addWarning("This change will affect " + impact.getTotalImpactedItems() + " dependent items");
            }
            
            if (impact.isAffectsCriticalPath()) {
                result.addWarning("This change affects the project's critical path");
            }
            
            if (impact.isAffectsProjectEndDate()) {
                result.addWarning("This change may affect the project end date");
            }
        }
        
        // Set appropriate status and message
        setResultStatus(result);
        
        return result;
    }
    
    private EditValidationResult validateActivityDateChangeInternal(Activity activity, ActivityDateChange change) {
        EditValidationResult result = new EditValidationResult();
        
        // Basic validation
        if (!validateBasicDateRules(change.getProposedStartDate(), change.getProposedEndDate(), result)) {
            return result;
        }
        
        // Get current constraints for the activity
        DateConstraints constraints = constraintCalculator.calculateActivityConstraints(activity);
        
        // Validate against constraints
        if (!validateAgainstConstraints(change.getProposedStartDate(), change.getProposedEndDate(), constraints, result)) {
            // If invalid, try to suggest alternative dates
            suggestAlternativeDates(constraints, change, result);
        }
        
        // Additional validation for activities: check against child tasks
        if (result.isCanProceed() && change.isPropagateToTasks()) {
            validateActivityAgainstChildTasks(activity, change, result);
        }
        
        // Calculate downstream impact
        if (result.isCanProceed()) {
            DownstreamImpact impact = calculateDownstreamImpact(activity, change);
            result.setDownstreamImpact(impact);
            
            // Add warnings if there's significant impact
            if (impact.hasHighImpact()) {
                result.addWarning("This change will affect " + impact.getTotalImpactedItems() + " dependent items");
            }
            
            if (impact.isAffectsCriticalPath()) {
                result.addWarning("This change affects the project's critical path");
            }
            
            if (impact.isAffectsProjectEndDate()) {
                result.addWarning("This change may affect the project end date");
            }
        }
        
        // Set appropriate status and message
        setResultStatus(result);
        
        return result;
    }
    
    private boolean validateBasicDateRules(LocalDateTime startDate, LocalDateTime endDate, EditValidationResult result) {
        if (startDate == null && endDate == null) {
            result.addError("At least one date must be specified");
            return false;
        }
        
        if (startDate != null && endDate != null && startDate.isAfter(endDate)) {
            result.addError("Start date cannot be after end date");
            return false;
        }
        
        return true;
    }
    
    private boolean validateAgainstConstraints(LocalDateTime startDate, LocalDateTime endDate, 
                                               DateConstraints constraints, EditValidationResult result) {
        if (!constraints.isFeasible()) {
            result.addError("Current schedule constraints make this change impossible");
            for (String violation : constraints.getConstraintViolations()) {
                result.addError(violation);
            }
            return false;
        }
        
        // Check individual constraints
        boolean valid = true;
        
        if (startDate != null && constraints.getEarliestStartTime() != null && 
            startDate.isBefore(constraints.getEarliestStartTime())) {
            result.addError("Start date cannot be earlier than " + constraints.getEarliestStartTime() + 
                          " due to dependencies and constraints");
            valid = false;
        }
        
        if (endDate != null && constraints.getLatestEndTime() != null && 
            endDate.isAfter(constraints.getLatestEndTime())) {
            result.addError("End date cannot be later than " + constraints.getLatestEndTime() + 
                          " due to project boundaries and dependencies");
            valid = false;
        }
        
        if (startDate != null && endDate != null) {
            Duration proposedDuration = Duration.between(startDate, endDate);
            if (constraints.getMinimumDuration() != null && 
                proposedDuration.compareTo(constraints.getMinimumDuration()) < 0) {
                result.addError("Duration cannot be less than minimum required: " + constraints.getMinimumDuration());
                valid = false;
            }
        }
        
        return valid;
    }
    
    private void suggestAlternativeDates(DateConstraints constraints, Object change, EditValidationResult result) {
        if (constraints.getEarliestStartTime() != null && constraints.getLatestEndTime() != null) {
            result.setSuggestedStartDate(constraints.getEarliestStartTime());
            
            if (constraints.getMinimumDuration() != null) {
                LocalDateTime suggestedEnd = constraints.getEarliestStartTime().plus(constraints.getMinimumDuration());
                if (suggestedEnd.isBefore(constraints.getLatestEndTime())) {
                    result.setSuggestedEndDate(suggestedEnd);
                } else {
                    result.setSuggestedEndDate(constraints.getLatestEndTime());
                    result.setSuggestedStartDate(constraints.getLatestEndTime().minus(constraints.getMinimumDuration()));
                }
            } else {
                result.setSuggestedEndDate(constraints.getLatestEndTime());
            }
            
            result.addValidationMessage("Suggested dates: " + result.getSuggestedStartDate() + 
                                      " to " + result.getSuggestedEndDate());
        }
    }
    
    private void validateActivityAgainstChildTasks(Activity activity, ActivityDateChange change, EditValidationResult result) {
        Set<Task> childTasks = activity.getTasks();
        if (childTasks == null || childTasks.isEmpty()) {
            return;
        }
        
        // Check if the activity dates can accommodate all child tasks
        LocalDateTime earliestTaskStart = childTasks.stream()
            .filter(t -> t.getStartDate() != null)
            .map(Task::getStartDate)
            .min(LocalDateTime::compareTo)
            .orElse(null);
            
        LocalDateTime latestTaskEnd = childTasks.stream()
            .filter(t -> t.getEndDate() != null)
            .map(Task::getEndDate)
            .max(LocalDateTime::compareTo)
            .orElse(null);
        
        if (change.getProposedStartDate() != null && earliestTaskStart != null && 
            change.getProposedStartDate().isAfter(earliestTaskStart)) {
            result.addWarning("Activity start date is after some child task start dates. " +
                            "Child tasks will need to be rescheduled.");
        }
        
        if (change.getProposedEndDate() != null && latestTaskEnd != null && 
            change.getProposedEndDate().isBefore(latestTaskEnd)) {
            result.addWarning("Activity end date is before some child task end dates. " +
                            "Child tasks will need to be rescheduled.");
        }
    }
    
    private DownstreamImpact calculateDownstreamImpact(Task task, TaskDateChange change) {
        DownstreamImpact impact = new DownstreamImpact();
        
        // Find all tasks that depend on this task
        List<Dependency> dependentRelationships = dependencyRepository.findByPredecessorTask(task);
        
        for (Dependency dependency : dependentRelationships) {
            if (dependency.getSuccessorTask() != null) {
                Task dependentTask = dependency.getSuccessorTask();
                analyzeTaskImpact(dependentTask, dependency, change, impact);
            } else if (dependency.getSuccessorActivity() != null) {
                Activity dependentActivity = dependency.getSuccessorActivity();
                analyzeActivityImpact(dependentActivity, dependency, change, impact);
            }
        }
        
        // TODO: Check if task is on critical path
        // impact.setAffectsCriticalPath(isOnCriticalPath(task));
        
        // Set impact summary
        if (impact.getTotalImpactedItems() > 0) {
            impact.setImpactSummary(String.format(
                "This change will impact %d items: %d tasks and %d activities",
                impact.getTotalImpactedItems(),
                impact.getImpactedTasks().size(),
                impact.getImpactedActivities().size()
            ));
        } else {
            impact.setImpactSummary("No downstream impact detected");
        }
        
        return impact;
    }
    
    private DownstreamImpact calculateDownstreamImpact(Activity activity, ActivityDateChange change) {
        DownstreamImpact impact = new DownstreamImpact();
        
        // Find all activities that depend on this activity
        List<Dependency> dependentRelationships = dependencyRepository.findByPredecessorActivity(activity);
        
        for (Dependency dependency : dependentRelationships) {
            if (dependency.getSuccessorTask() != null) {
                Task dependentTask = dependency.getSuccessorTask();
                analyzeTaskImpact(dependentTask, dependency, change, impact);
            } else if (dependency.getSuccessorActivity() != null) {
                Activity dependentActivity = dependency.getSuccessorActivity();
                analyzeActivityImpact(dependentActivity, dependency, change, impact);
            }
        }
        
        // Check impact on child tasks if propagation is enabled
        if (change.isPropagateToTasks() && activity.getTasks() != null) {
            for (Task childTask : activity.getTasks()) {
                impact.addImpactedTask(
                    childTask.getId(),
                    childTask.getName(),
                    "DATE_SHIFT",
                    "Task dates will be adjusted to fit within new activity dates"
                );
            }
        }
        
        // Set impact summary
        if (impact.getTotalImpactedItems() > 0) {
            impact.setImpactSummary(String.format(
                "This change will impact %d items: %d tasks and %d activities",
                impact.getTotalImpactedItems(),
                impact.getImpactedTasks().size(),
                impact.getImpactedActivities().size()
            ));
        } else {
            impact.setImpactSummary("No downstream impact detected");
        }
        
        return impact;
    }
    
    private void analyzeTaskImpact(Task task, Dependency dependency, Object change, DownstreamImpact impact) {
        String impactDescription = String.format(
            "Task depends on changed item via %s dependency",
            dependency.getDependencyType()
        );
        
        impact.addImpactedTask(
            task.getId(),
            task.getName(),
            "SCHEDULE_CONFLICT",
            impactDescription
        );
    }
    
    private void analyzeActivityImpact(Activity activity, Dependency dependency, Object change, DownstreamImpact impact) {
        String impactDescription = String.format(
            "Activity depends on changed item via %s dependency",
            dependency.getDependencyType()
        );
        
        impact.addImpactedActivity(
            activity.getId(),
            activity.getName(),
            "SCHEDULE_CONFLICT",
            impactDescription
        );
    }
    
    private void setResultStatus(EditValidationResult result) {
        if (result.hasErrors()) {
            result.setStatus(EditValidationResult.ValidationStatus.ERROR);
            result.setCanProceed(false);
            result.setPrimaryMessage("Date change validation failed");
        } else if (result.hasWarnings() || (result.getDownstreamImpact() != null && result.getDownstreamImpact().hasImpact())) {
            result.setStatus(EditValidationResult.ValidationStatus.WARNING);
            result.setCanProceed(true);
            result.setPrimaryMessage("Date change is possible but requires attention");
        } else {
            result.setStatus(EditValidationResult.ValidationStatus.VALID);
            result.setCanProceed(true);
            result.setPrimaryMessage("Date change is valid");
        }
    }
}