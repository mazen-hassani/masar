package com.salwita.taskmanagement.domain.service;

import com.salwita.taskmanagement.domain.entity.*;
import com.salwita.taskmanagement.domain.enums.DependencyType;
import com.salwita.taskmanagement.domain.model.DateConstraints;
import com.salwita.taskmanagement.domain.model.ConstraintReason;
import com.salwita.taskmanagement.domain.repository.DependencyRepository;
import com.salwita.taskmanagement.domain.valueobject.WorkingCalendar;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.Duration;
import java.util.List;
import java.util.Set;
import java.util.HashSet;

/**
 * Service for calculating date constraints for tasks and activities.
 * Uses dependency relationships, project boundaries, and working calendar
 * to determine valid date ranges for manual editing.
 */
@Service
@Transactional(readOnly = true)
public class DateConstraintCalculator {
    
    private final DependencyRepository dependencyRepository;
    private final WorkingTimeCalculator workingTimeCalculator;
    
    @Autowired
    public DateConstraintCalculator(
            DependencyRepository dependencyRepository,
            WorkingTimeCalculator workingTimeCalculator) {
        this.dependencyRepository = dependencyRepository;
        this.workingTimeCalculator = workingTimeCalculator;
    }
    
    /**
     * Calculate date constraints for a task
     */
    @Cacheable(value = "taskConstraints", key = "#task.id")
    public DateConstraints calculateTaskConstraints(Task task) {
        return calculateTaskConstraints(task, new HashSet<>());
    }
    
    /**
     * Calculate date constraints for an activity
     */
    @Cacheable(value = "activityConstraints", key = "#activity.id")
    public DateConstraints calculateActivityConstraints(Activity activity) {
        return calculateActivityConstraints(activity, new HashSet<>());
    }
    
    /**
     * Calculate date constraints for a task with cycle detection
     */
    private DateConstraints calculateTaskConstraints(Task task, Set<Long> visited) {
        DateConstraints constraints = new DateConstraints();
        constraints.setTaskId(task.getId());
        constraints.setProjectId(task.getActivity().getProject().getId());
        constraints.setFeasible(true);
        
        Project project = task.getActivity().getProject();
        
        // Prevent circular dependency processing
        if (visited.contains(task.getId())) {
            constraints.setFeasible(false);
            constraints.addConstraintViolation("Circular dependency detected involving task " + task.getName());
            return constraints;
        }
        visited.add(task.getId());
        
        try {
            // Start with project boundaries
            LocalDateTime projectStart = project.getStartDate();
            LocalDateTime projectEnd = project.getEndDate();
            
            if (projectStart != null) {
                constraints.setEarliestStartTime(projectStart);
                constraints.addConstraintReason(
                    ConstraintReason.createProjectBoundaryConstraint("PROJECT_START", projectStart));
            }
            
            if (projectEnd != null) {
                constraints.setLatestEndTime(projectEnd);
                constraints.addConstraintReason(
                    ConstraintReason.createProjectBoundaryConstraint("PROJECT_END", projectEnd));
            }
            
            // Calculate minimum duration from task dates
            if (task.getStartDate() != null && task.getEndDate() != null) {
                Duration taskDuration = Duration.between(task.getStartDate(), task.getEndDate());
                constraints.setMinimumDuration(taskDuration);
                constraints.addConstraintReason(
                    ConstraintReason.createDurationConstraint(
                        "Task requires minimum duration of " + taskDuration));
            }
            
            // Apply predecessor constraints (tasks this task depends on)
            List<Dependency> predecessorDeps = dependencyRepository.findBySuccessorTask(task);
            for (Dependency dep : predecessorDeps) {
                applyPredecessorConstraint(constraints, dep, visited);
            }
            
            // Apply successor constraints (tasks that depend on this task)
            List<Dependency> successorDeps = dependencyRepository.findByPredecessorTask(task);
            for (Dependency dep : successorDeps) {
                applySuccessorConstraint(constraints, dep, task, visited);
            }
            
            // Apply working calendar constraints
            WorkingCalendar calendar = project.getWorkingCalendar();
            if (calendar != null && constraints.getEarliestStartTime() != null) {
                LocalDateTime workingStart = workingTimeCalculator.getNextWorkingTime(
                    constraints.getEarliestStartTime(), calendar);
                if (workingStart.isAfter(constraints.getEarliestStartTime())) {
                    constraints.setEarliestStartTime(workingStart);
                    constraints.addConstraintReason(
                        ConstraintReason.createWorkingCalendarConstraint(
                            "Adjusted to next working time", workingStart));
                }
            }
            
            // Check feasibility
            validateConstraintFeasibility(constraints);
            
        } finally {
            visited.remove(task.getId());
        }
        
        return constraints;
    }
    
    /**
     * Calculate date constraints for an activity with cycle detection
     */
    private DateConstraints calculateActivityConstraints(Activity activity, Set<Long> visited) {
        DateConstraints constraints = new DateConstraints();
        constraints.setActivityId(activity.getId());
        constraints.setProjectId(activity.getProject().getId());
        constraints.setFeasible(true);
        
        Project project = activity.getProject();
        
        // Prevent circular dependency processing
        if (visited.contains(activity.getId())) {
            constraints.setFeasible(false);
            constraints.addConstraintViolation("Circular dependency detected involving activity " + activity.getName());
            return constraints;
        }
        visited.add(activity.getId());
        
        try {
            // Start with project boundaries
            LocalDateTime projectStart = project.getStartDate();
            LocalDateTime projectEnd = project.getEndDate();
            
            if (projectStart != null) {
                constraints.setEarliestStartTime(projectStart);
                constraints.addConstraintReason(
                    ConstraintReason.createProjectBoundaryConstraint("PROJECT_START", projectStart));
            }
            
            if (projectEnd != null) {
                constraints.setLatestEndTime(projectEnd);
                constraints.addConstraintReason(
                    ConstraintReason.createProjectBoundaryConstraint("PROJECT_END", projectEnd));
            }
            
            // Apply constraints from child tasks
            Set<Task> childTasks = activity.getTasks();
            if (childTasks != null && !childTasks.isEmpty()) {
                applyChildTaskConstraints(constraints, childTasks);
            }
            
            // Apply predecessor constraints (activities this activity depends on)
            List<Dependency> predecessorDeps = dependencyRepository.findBySuccessorActivity(activity);
            for (Dependency dep : predecessorDeps) {
                applyPredecessorConstraint(constraints, dep, visited);
            }
            
            // Apply successor constraints (activities that depend on this activity)
            List<Dependency> successorDeps = dependencyRepository.findByPredecessorActivity(activity);
            for (Dependency dep : successorDeps) {
                applySuccessorConstraint(constraints, dep, activity, visited);
            }
            
            // Apply working calendar constraints
            WorkingCalendar calendar = project.getWorkingCalendar();
            if (calendar != null && constraints.getEarliestStartTime() != null) {
                LocalDateTime workingStart = workingTimeCalculator.getNextWorkingTime(
                    constraints.getEarliestStartTime(), calendar);
                if (workingStart.isAfter(constraints.getEarliestStartTime())) {
                    constraints.setEarliestStartTime(workingStart);
                    constraints.addConstraintReason(
                        ConstraintReason.createWorkingCalendarConstraint(
                            "Adjusted to next working time", workingStart));
                }
            }
            
            // Check feasibility
            validateConstraintFeasibility(constraints);
            
        } finally {
            visited.remove(activity.getId());
        }
        
        return constraints;
    }
    
    private void applyChildTaskConstraints(DateConstraints constraints, Set<Task> childTasks) {
        LocalDateTime earliestTaskStart = null;
        LocalDateTime latestTaskEnd = null;
        Duration totalDuration = Duration.ZERO;
        
        for (Task childTask : childTasks) {
            if (childTask.getStartDate() != null) {
                if (earliestTaskStart == null || childTask.getStartDate().isBefore(earliestTaskStart)) {
                    earliestTaskStart = childTask.getStartDate();
                }
            }
            
            if (childTask.getEndDate() != null) {
                if (latestTaskEnd == null || childTask.getEndDate().isAfter(latestTaskEnd)) {
                    latestTaskEnd = childTask.getEndDate();
                }
            }
            
            if (childTask.getStartDate() != null && childTask.getEndDate() != null) {
                Duration childDuration = Duration.between(childTask.getStartDate(), childTask.getEndDate());
                totalDuration = totalDuration.plus(childDuration);
            }
        }
        
        // Activity must span all child tasks
        if (earliestTaskStart != null) {
            if (constraints.getEarliestStartTime() == null || 
                earliestTaskStart.isBefore(constraints.getEarliestStartTime())) {
                constraints.setEarliestStartTime(earliestTaskStart);
            }
        }
        
        if (latestTaskEnd != null) {
            if (constraints.getLatestEndTime() == null || 
                latestTaskEnd.isAfter(constraints.getLatestEndTime())) {
                constraints.setLatestEndTime(latestTaskEnd);
            }
        }
        
        // Set minimum duration based on child task span
        if (earliestTaskStart != null && latestTaskEnd != null) {
            Duration childSpan = Duration.between(earliestTaskStart, latestTaskEnd);
            if (constraints.getMinimumDuration() == null || 
                childSpan.compareTo(constraints.getMinimumDuration()) > 0) {
                constraints.setMinimumDuration(childSpan);
                constraints.addConstraintReason(
                    ConstraintReason.createDurationConstraint(
                        "Activity must span all child tasks: " + childSpan));
            }
        }
    }
    
    private void applyPredecessorConstraint(DateConstraints constraints, Dependency dependency, Set<Long> visited) {
        LocalDateTime predecessorDate = null;
        String predecessorName = "";
        Long predecessorId = null;
        String predecessorType = "";
        
        // Check if predecessor is a task
        if (dependency.getPredecessorTask() != null) {
            Task predecessorTask = dependency.getPredecessorTask();
            predecessorName = predecessorTask.getName();
            predecessorId = predecessorTask.getId();
            predecessorType = "Task";
            
            switch (dependency.getDependencyType()) {
                case FS:
                    predecessorDate = predecessorTask.getEndDate();
                    break;
                case SS:
                    predecessorDate = predecessorTask.getStartDate();
                    break;
                case FF:
                case SF:
                    // These require more complex calculation
                    return;
            }
        } else if (dependency.getPredecessorActivity() != null) {
            Activity predecessorActivity = dependency.getPredecessorActivity();
            predecessorName = predecessorActivity.getName();
            predecessorId = predecessorActivity.getId();
            predecessorType = "Activity";
            
            switch (dependency.getDependencyType()) {
                case FS:
                    predecessorDate = predecessorActivity.getEndDate();
                    break;
                case SS:
                    predecessorDate = predecessorActivity.getStartDate();
                    break;
                case FF:
                case SF:
                    // These require more complex calculation
                    return;
            }
        }
        
        if (predecessorDate != null) {
            // Apply lag/lead
            if (dependency.getLagInMinutes() > 0) {
                Duration lag = Duration.ofMinutes(dependency.getLagInMinutes());
                WorkingCalendar calendar = getWorkingCalendar(dependency);
                predecessorDate = workingTimeCalculator.addWorkingTime(predecessorDate, lag, calendar);
            }
            
            // Adjust to working time
            WorkingCalendar calendar = getWorkingCalendar(dependency);
            LocalDateTime workingDate = workingTimeCalculator.getNextWorkingTime(predecessorDate, calendar);
            
            // Update earliest start time
            if (constraints.getEarliestStartTime() == null || 
                workingDate.isAfter(constraints.getEarliestStartTime())) {
                constraints.setEarliestStartTime(workingDate);
                constraints.addConstraintReason(
                    ConstraintReason.createDependencyConstraint(
                        dependency.getId(),
                        predecessorId,
                        predecessorName,
                        predecessorType,
                        dependency.getDependencyType(),
                        workingDate));
            }
        }
    }
    
    private void applySuccessorConstraint(DateConstraints constraints, Dependency dependency, 
                                        Object currentItem, Set<Long> visited) {
        LocalDateTime successorDate = null;
        String successorName = "";
        Long successorId = null;
        String successorType = "";
        
        // Check if successor is a task
        if (dependency.getSuccessorTask() != null) {
            Task successorTask = dependency.getSuccessorTask();
            successorName = successorTask.getName();
            successorId = successorTask.getId();
            successorType = "Task";
            
            switch (dependency.getDependencyType()) {
                case FS:
                    successorDate = successorTask.getStartDate();
                    break;
                case SS:
                case FF:
                case SF:
                    // These require more complex calculation
                    return;
            }
        } else if (dependency.getSuccessorActivity() != null) {
            Activity successorActivity = dependency.getSuccessorActivity();
            successorName = successorActivity.getName();
            successorId = successorActivity.getId();
            successorType = "Activity";
            
            switch (dependency.getDependencyType()) {
                case FS:
                    successorDate = successorActivity.getStartDate();
                    break;
                case SS:
                case FF:
                case SF:
                    // These require more complex calculation
                    return;
            }
        }
        
        if (successorDate != null && constraints.getMinimumDuration() != null) {
            // Calculate latest end time based on successor and current item's duration
            LocalDateTime latestEnd = successorDate;
            
            // Apply lag/lead (subtract for predecessor)
            if (dependency.getLagInMinutes() > 0) {
                Duration lag = Duration.ofMinutes(dependency.getLagInMinutes());
                WorkingCalendar calendar = getWorkingCalendar(dependency);
                latestEnd = workingTimeCalculator.subtractWorkingTime(latestEnd, lag, calendar);
            }
            
            // Update latest end time
            if (constraints.getLatestEndTime() == null || 
                latestEnd.isBefore(constraints.getLatestEndTime())) {
                constraints.setLatestEndTime(latestEnd);
                constraints.addConstraintReason(
                    ConstraintReason.createDependencyConstraint(
                        dependency.getId(),
                        successorId,
                        successorName,
                        successorType,
                        dependency.getDependencyType(),
                        latestEnd));
            }
        }
    }
    
    private void validateConstraintFeasibility(DateConstraints constraints) {
        if (constraints.getEarliestStartTime() != null && constraints.getLatestEndTime() != null) {
            if (constraints.getEarliestStartTime().isAfter(constraints.getLatestEndTime())) {
                constraints.setFeasible(false);
                constraints.addConstraintViolation(
                    "Earliest start time (" + constraints.getEarliestStartTime() + 
                    ") is after latest end time (" + constraints.getLatestEndTime() + ")");
            }
            
            Duration availableDuration = Duration.between(
                constraints.getEarliestStartTime(), constraints.getLatestEndTime());
            
            if (constraints.getMinimumDuration() != null && 
                availableDuration.compareTo(constraints.getMinimumDuration()) < 0) {
                constraints.setFeasible(false);
                constraints.addConstraintViolation(
                    "Available duration (" + availableDuration + 
                    ") is less than minimum required (" + constraints.getMinimumDuration() + ")");
            }
        }
    }
    
    private WorkingCalendar getWorkingCalendar(Dependency dependency) {
        if (dependency.getPredecessorTask() != null) {
            return dependency.getPredecessorTask().getActivity().getProject().getWorkingCalendar();
        } else if (dependency.getPredecessorActivity() != null) {
            return dependency.getPredecessorActivity().getProject().getWorkingCalendar();
        }
        return null;
    }
}