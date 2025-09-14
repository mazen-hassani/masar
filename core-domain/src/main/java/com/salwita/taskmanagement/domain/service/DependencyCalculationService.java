package com.salwita.taskmanagement.domain.service;

import com.salwita.taskmanagement.domain.entity.*;
import com.salwita.taskmanagement.domain.enums.DependencyType;
import com.salwita.taskmanagement.domain.enums.Status;
import com.salwita.taskmanagement.domain.repository.DependencyRepository;
import com.salwita.taskmanagement.domain.exception.BusinessException;
import com.salwita.taskmanagement.domain.valueobject.WorkingCalendar;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.Duration;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class DependencyCalculationService {

    private final DependencyRepository dependencyRepository;
    private final WorkingTimeCalculator workingTimeCalculator;

    @Autowired
    public DependencyCalculationService(
            DependencyRepository dependencyRepository,
            WorkingTimeCalculator workingTimeCalculator) {
        this.dependencyRepository = dependencyRepository;
        this.workingTimeCalculator = workingTimeCalculator;
    }

    public LocalDateTime calculateEarliestStartTime(Task task) {
        List<Dependency> predecessorDependencies = dependencyRepository.findBySuccessorTask(task);
        if (predecessorDependencies.isEmpty()) {
            // No predecessors, can start at project start time or activity start time
            Activity activity = task.getActivity();
            if (activity.getStartDate() != null) {
                return activity.getStartDate();
            }
            return task.getActivity().getProject().getStartDate();
        }

        LocalDateTime earliestStart = null;
        
        for (Dependency dependency : predecessorDependencies) {
            LocalDateTime constraintTime = calculateConstraintTime(dependency);
            if (earliestStart == null || constraintTime.isAfter(earliestStart)) {
                earliestStart = constraintTime;
            }
        }

        return earliestStart;
    }

    public LocalDateTime calculateEarliestStartTime(Activity activity) {
        List<Dependency> predecessorDependencies = dependencyRepository.findBySuccessorActivity(activity);
        if (predecessorDependencies.isEmpty()) {
            return activity.getProject().getStartDate();
        }

        LocalDateTime earliestStart = null;
        
        for (Dependency dependency : predecessorDependencies) {
            LocalDateTime constraintTime = calculateConstraintTime(dependency);
            if (earliestStart == null || constraintTime.isAfter(earliestStart)) {
                earliestStart = constraintTime;
            }
        }

        return earliestStart;
    }

    public LocalDateTime calculateLatestFinishTime(Task task) {
        List<Dependency> successorDependencies = dependencyRepository.findByPredecessorTask(task);
        if (successorDependencies.isEmpty()) {
            // No successors, can finish at project end time or activity end time
            Activity activity = task.getActivity();
            if (activity.getEndDate() != null) {
                return activity.getEndDate();
            }
            return task.getActivity().getProject().getEndDate();
        }

        LocalDateTime latestFinish = null;
        
        for (Dependency dependency : successorDependencies) {
            LocalDateTime constraintTime = calculateReverseConstraintTime(dependency);
            if (latestFinish == null || constraintTime.isBefore(latestFinish)) {
                latestFinish = constraintTime;
            }
        }

        return latestFinish;
    }

    public LocalDateTime calculateLatestFinishTime(Activity activity) {
        List<Dependency> successorDependencies = dependencyRepository.findByPredecessorActivity(activity);
        if (successorDependencies.isEmpty()) {
            return activity.getProject().getEndDate();
        }

        LocalDateTime latestFinish = null;
        
        for (Dependency dependency : successorDependencies) {
            LocalDateTime constraintTime = calculateReverseConstraintTime(dependency);
            if (latestFinish == null || constraintTime.isBefore(latestFinish)) {
                latestFinish = constraintTime;
            }
        }

        return latestFinish;
    }

    private LocalDateTime calculateConstraintTime(Dependency dependency) {
        LocalDateTime baseTime;
        Duration lag = dependency.getLagInMinutes() != null ? Duration.ofMinutes(dependency.getLagInMinutes()) : Duration.ZERO;
        WorkingCalendar calendar = getWorkingCalendar(dependency.getPredecessorProject());

        if (dependency.getPredecessorActivity() != null) {
            Activity predecessor = dependency.getPredecessorActivity();
            baseTime = getActivityConstraintTime(predecessor, dependency.getDependencyType());
        } else if (dependency.getPredecessorTask() != null) {
            Task predecessor = dependency.getPredecessorTask();
            baseTime = getTaskConstraintTime(predecessor, dependency.getDependencyType());
        } else {
            throw new BusinessException("Dependency must have either predecessor activity or task");
        }

        if (lag.isZero()) {
            return baseTime;
        } else if (lag.isNegative()) {
            return workingTimeCalculator.subtractWorkingTime(baseTime, lag.abs(), calendar);
        } else {
            return workingTimeCalculator.addWorkingTime(baseTime, lag, calendar);
        }
    }

    private LocalDateTime calculateReverseConstraintTime(Dependency dependency) {
        LocalDateTime baseTime;
        Duration lag = dependency.getLagInMinutes() != null ? Duration.ofMinutes(dependency.getLagInMinutes()) : Duration.ZERO;
        WorkingCalendar calendar = getWorkingCalendar(dependency.getSuccessorProject());

        if (dependency.getSuccessorActivity() != null) {
            Activity successor = dependency.getSuccessorActivity();
            baseTime = getReverseActivityConstraintTime(successor, dependency.getDependencyType());
        } else if (dependency.getSuccessorTask() != null) {
            Task successor = dependency.getSuccessorTask();
            baseTime = getReverseTaskConstraintTime(successor, dependency.getDependencyType());
        } else {
            throw new BusinessException("Dependency must have either successor activity or task");
        }

        if (lag.isZero()) {
            return baseTime;
        } else if (lag.isNegative()) {
            return workingTimeCalculator.addWorkingTime(baseTime, lag.abs(), calendar);
        } else {
            return workingTimeCalculator.subtractWorkingTime(baseTime, lag, calendar);
        }
    }

    private LocalDateTime getActivityConstraintTime(Activity activity, DependencyType dependencyType) {
        switch (dependencyType) {
            case FS:
                return activity.getActualEndDate() != null ? activity.getActualEndDate() : activity.getEndDate();
            case SS:
                return activity.getActualStartDate() != null ? activity.getActualStartDate() : activity.getStartDate();
            case FF:
                return activity.getActualEndDate() != null ? activity.getActualEndDate() : activity.getEndDate();
            case SF:
                return activity.getActualStartDate() != null ? activity.getActualStartDate() : activity.getStartDate();
            default:
                throw new BusinessException("Unknown dependency type: " + dependencyType);
        }
    }

    private LocalDateTime getTaskConstraintTime(Task task, DependencyType dependencyType) {
        switch (dependencyType) {
            case FS:
                return task.getActualEndDate() != null ? task.getActualEndDate() : task.getEndDate();
            case SS:
                return task.getActualStartDate() != null ? task.getActualStartDate() : task.getStartDate();
            case FF:
                return task.getActualEndDate() != null ? task.getActualEndDate() : task.getEndDate();
            case SF:
                return task.getActualStartDate() != null ? task.getActualStartDate() : task.getStartDate();
            default:
                throw new BusinessException("Unknown dependency type: " + dependencyType);
        }
    }

    private LocalDateTime getReverseActivityConstraintTime(Activity activity, DependencyType dependencyType) {
        switch (dependencyType) {
            case FS:
                return activity.getActualStartDate() != null ? activity.getActualStartDate() : activity.getStartDate();
            case SS:
                return activity.getActualStartDate() != null ? activity.getActualStartDate() : activity.getStartDate();
            case FF:
                return activity.getActualEndDate() != null ? activity.getActualEndDate() : activity.getEndDate();
            case SF:
                return activity.getActualEndDate() != null ? activity.getActualEndDate() : activity.getEndDate();
            default:
                throw new BusinessException("Unknown dependency type: " + dependencyType);
        }
    }

    private LocalDateTime getReverseTaskConstraintTime(Task task, DependencyType dependencyType) {
        switch (dependencyType) {
            case FS:
                return task.getActualStartDate() != null ? task.getActualStartDate() : task.getStartDate();
            case SS:
                return task.getActualStartDate() != null ? task.getActualStartDate() : task.getStartDate();
            case FF:
                return task.getActualEndDate() != null ? task.getActualEndDate() : task.getEndDate();
            case SF:
                return task.getActualEndDate() != null ? task.getActualEndDate() : task.getEndDate();
            default:
                throw new BusinessException("Unknown dependency type: " + dependencyType);
        }
    }

    public Duration calculateTotalFloat(Task task) {
        LocalDateTime earliestStart = calculateEarliestStartTime(task);
        LocalDateTime latestFinish = calculateLatestFinishTime(task);
        
        WorkingCalendar calendar = getWorkingCalendar(task.getActivity().getProject());
        LocalDateTime plannedEnd = task.getEndDate() != null ? task.getEndDate() : task.getEndDate();
        
        return workingTimeCalculator.calculateWorkingDuration(plannedEnd, latestFinish, calendar);
    }

    public Duration calculateFreeFloat(Task task) {
        LocalDateTime earliestStart = calculateEarliestStartTime(task);
        LocalDateTime plannedEnd = task.getEndDate() != null ? task.getEndDate() : task.getEndDate();
        WorkingCalendar calendar = getWorkingCalendar(task.getActivity().getProject());
        
        List<Dependency> successorDependencies = dependencyRepository.findByPredecessorTask(task);
        if (successorDependencies.isEmpty()) {
            return calculateTotalFloat(task);
        }

        LocalDateTime earliestSuccessorStart = null;
        for (Dependency dependency : successorDependencies) {
            LocalDateTime successorConstraintTime;
            if (dependency.getSuccessorTask() != null) {
                successorConstraintTime = calculateEarliestStartTime(dependency.getSuccessorTask());
            } else {
                successorConstraintTime = calculateEarliestStartTime(dependency.getSuccessorActivity());
            }
            
            if (earliestSuccessorStart == null || successorConstraintTime.isBefore(earliestSuccessorStart)) {
                earliestSuccessorStart = successorConstraintTime;
            }
        }

        return workingTimeCalculator.calculateWorkingDuration(plannedEnd, earliestSuccessorStart, calendar);
    }

    public List<Task> calculateCriticalPath(Project project) {
        List<Task> allTasks = project.getActivities().stream()
                .flatMap(activity -> activity.getTasks().stream())
                .collect(Collectors.toList());

        List<Task> criticalTasks = new ArrayList<>();
        
        for (Task task : allTasks) {
            Duration totalFloat = calculateTotalFloat(task);
            if (totalFloat.isZero() || totalFloat.isNegative()) {
                criticalTasks.add(task);
            }
        }

        return criticalTasks.stream()
                .sorted(Comparator.comparing(task -> calculateEarliestStartTime(task)))
                .collect(Collectors.toList());
    }

    public boolean isOnCriticalPath(Task task) {
        Duration totalFloat = calculateTotalFloat(task);
        return totalFloat.isZero() || totalFloat.isNegative();
    }

    public List<Task> getBlockedTasks(Project project) {
        List<Task> blockedTasks = new ArrayList<>();
        
        for (Activity activity : project.getActivities()) {
            for (Task task : activity.getTasks()) {
                if (isTaskBlocked(task)) {
                    blockedTasks.add(task);
                }
            }
        }
        
        return blockedTasks;
    }

    private boolean isTaskBlocked(Task task) {
        if (task.getStatus() == Status.COMPLETED) {
            return false;
        }

        List<Dependency> predecessorDependencies = dependencyRepository.findBySuccessorTask(task);
        
        for (Dependency dependency : predecessorDependencies) {
            if (dependency.getPredecessorTask() != null) {
                Task predecessor = dependency.getPredecessorTask();
                if (!isTaskReadyForSuccessor(predecessor, dependency.getDependencyType())) {
                    return true;
                }
            } else if (dependency.getPredecessorActivity() != null) {
                Activity predecessor = dependency.getPredecessorActivity();
                if (!isActivityReadyForSuccessor(predecessor, dependency.getDependencyType())) {
                    return true;
                }
            }
        }
        
        return false;
    }

    private boolean isTaskReadyForSuccessor(Task task, DependencyType dependencyType) {
        switch (dependencyType) {
            case FS:
            case FF:
                return task.getStatus() == Status.COMPLETED;
            case SS:
            case SF:
                return task.getStatus() == Status.IN_PROGRESS || task.getStatus() == Status.COMPLETED;
            default:
                return false;
        }
    }

    private boolean isActivityReadyForSuccessor(Activity activity, DependencyType dependencyType) {
        switch (dependencyType) {
            case FS:
            case FF:
                return activity.getActualEndDate() != null;
            case SS:
            case SF:
                return activity.getActualStartDate() != null;
            default:
                return false;
        }
    }

    private WorkingCalendar getWorkingCalendar(Project project) {
        return project.getWorkingCalendar();
    }
}