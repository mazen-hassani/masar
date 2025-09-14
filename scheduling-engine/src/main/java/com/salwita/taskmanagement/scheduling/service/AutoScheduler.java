package com.salwita.taskmanagement.scheduling.service;

import com.salwita.taskmanagement.domain.entity.*;
import com.salwita.taskmanagement.domain.enums.DependencyType;
import com.salwita.taskmanagement.domain.repository.DependencyRepository;
import com.salwita.taskmanagement.domain.repository.ActivityRepository;
import com.salwita.taskmanagement.domain.repository.TaskRepository;
import com.salwita.taskmanagement.domain.service.DependencyCalculationService;
import com.salwita.taskmanagement.domain.service.WorkingTimeCalculator;
import com.salwita.taskmanagement.domain.valueobject.WorkingCalendar;
import com.salwita.taskmanagement.domain.exception.BusinessException;
import com.salwita.taskmanagement.scheduling.model.*;
import com.salwita.taskmanagement.scheduling.optimization.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.Duration;
import java.util.*;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ForkJoinPool;
import java.util.stream.Collectors;

/**
 * Auto-scheduling engine that calculates optimal dates based on dependencies and working calendar.
 * Implements forward scheduling with topological ordering and constraint resolution.
 */
@Service
@Transactional
public class AutoScheduler {

    private final DependencyRepository dependencyRepository;
    private final ActivityRepository activityRepository;
    private final TaskRepository taskRepository;
    private final DependencyCalculationService dependencyCalculationService;
    private final WorkingTimeCalculator workingTimeCalculator;
    private final ForkJoinPool schedulingPool;

    @Autowired
    public AutoScheduler(
            DependencyRepository dependencyRepository,
            ActivityRepository activityRepository, 
            TaskRepository taskRepository,
            DependencyCalculationService dependencyCalculationService,
            WorkingTimeCalculator workingTimeCalculator) {
        this.dependencyRepository = dependencyRepository;
        this.activityRepository = activityRepository;
        this.taskRepository = taskRepository;
        this.dependencyCalculationService = dependencyCalculationService;
        this.workingTimeCalculator = workingTimeCalculator;
        this.schedulingPool = new ForkJoinPool(Math.min(Runtime.getRuntime().availableProcessors(), 8));
    }

    /**
     * Performs complete schedule calculation for a project using forward scheduling
     */
    public ScheduleResult scheduleProject(Project project) {
        validateProject(project);
        
        long startTime = System.currentTimeMillis();
        ScheduleResult result = new ScheduleResult();
        
        try {
            // Build dependency graph
            DependencyGraph graph = buildDependencyGraph(project);
            result.setGraphBuildTime(System.currentTimeMillis() - startTime);
            
            // Perform topological ordering
            long sortStartTime = System.currentTimeMillis();
            List<SchedulableItem> topologicalOrder = performTopologicalSort(graph);
            result.setTopologicalSortTime(System.currentTimeMillis() - sortStartTime);
            
            // Calculate schedule dates
            long scheduleStartTime = System.currentTimeMillis();
            ScheduleCalculation calculation = calculateSchedule(project, topologicalOrder, graph);
            result.setScheduleCalculationTime(System.currentTimeMillis() - scheduleStartTime);
            
            // Apply calculated dates to entities
            long applyStartTime = System.currentTimeMillis();
            applyScheduleToProject(project, calculation);
            result.setApplyTime(System.currentTimeMillis() - applyStartTime);
            
            result.setTotalTime(System.currentTimeMillis() - startTime);
            result.setSuccess(true);
            result.setScheduledActivities(calculation.getActivitySchedules().size());
            result.setScheduledTasks(calculation.getTaskSchedules().size());
            
            return result;
            
        } catch (Exception e) {
            result.setSuccess(false);
            result.setError(e.getMessage());
            result.setTotalTime(System.currentTimeMillis() - startTime);
            throw new BusinessException("Failed to schedule project: " + e.getMessage(), e);
        }
    }

    /**
     * Performs partial recalculation when specific items change
     */
    public ScheduleResult rescheduleFromItem(Project project, SchedulableItem changedItem) {
        long startTime = System.currentTimeMillis();
        ScheduleResult result = new ScheduleResult();
        
        try {
            // Find all affected downstream items
            Set<SchedulableItem> affectedItems = findAffectedItems(project, changedItem);
            result.setAffectedItemsCount(affectedItems.size());
            
            if (affectedItems.isEmpty()) {
                result.setSuccess(true);
                result.setTotalTime(System.currentTimeMillis() - startTime);
                return result;
            }
            
            // Build subgraph for affected items
            DependencyGraph subgraph = buildSubgraph(project, affectedItems);
            
            // Perform partial topological sort
            List<SchedulableItem> partialOrder = performTopologicalSort(subgraph);
            
            // Calculate new schedule for affected items
            ScheduleCalculation partialCalculation = calculatePartialSchedule(project, partialOrder, subgraph);
            
            // Apply changes
            applyPartialSchedule(project, partialCalculation, affectedItems);
            
            result.setSuccess(true);
            result.setTotalTime(System.currentTimeMillis() - startTime);
            result.setScheduledActivities(partialCalculation.getActivitySchedules().size());
            result.setScheduledTasks(partialCalculation.getTaskSchedules().size());
            
            return result;
            
        } catch (Exception e) {
            result.setSuccess(false);
            result.setError(e.getMessage());
            result.setTotalTime(System.currentTimeMillis() - startTime);
            throw new BusinessException("Failed to reschedule from item: " + e.getMessage(), e);
        }
    }

    /**
     * Calculates critical path for the project
     */
    @Cacheable(value = "criticalPaths", key = "#project.id")
    public List<SchedulableItem> calculateCriticalPath(Project project) {
        DependencyGraph graph = buildDependencyGraph(project);
        
        // Calculate total float for all items
        Map<SchedulableItem, Duration> floatMap = new HashMap<>();
        
        for (SchedulableItem item : graph.getAllItems()) {
            Duration totalFloat = calculateTotalFloat(item, graph);
            floatMap.put(item, totalFloat);
        }
        
        // Find items with zero or negative float
        return floatMap.entrySet().stream()
                .filter(entry -> entry.getValue().isZero() || entry.getValue().isNegative())
                .map(Map.Entry::getKey)
                .sorted(Comparator.comparing(this::getItemStartDate))
                .collect(Collectors.toList());
    }

    /**
     * Optimizes schedule to minimize project duration
     */
    public ScheduleOptimizationResult optimizeSchedule(Project project) {
        ScheduleOptimizationResult result = new ScheduleOptimizationResult();
        
        // Current schedule baseline
        LocalDateTime originalEndDate = project.getEndDate();
        ScheduleResult originalSchedule = scheduleProject(project);
        
        // Try various optimization strategies
        List<OptimizationStrategy> strategies = Arrays.asList(
                new CriticalPathOptimization(),
                new ResourceLevelingOptimization(),
                new DependencyReductionOptimization()
        );
        
        ScheduleResult bestResult = originalSchedule;
        OptimizationStrategy bestStrategy = null;
        
        for (OptimizationStrategy strategy : strategies) {
            try {
                Project clonedProject = cloneProjectForOptimization(project);
                strategy.apply(clonedProject);
                ScheduleResult optimizedResult = scheduleProject(clonedProject);
                
                if (isScheduleImprovement(optimizedResult, bestResult)) {
                    bestResult = optimizedResult;
                    bestStrategy = strategy;
                }
            } catch (Exception e) {
                // Strategy failed, continue with next
                result.getFailedStrategies().add(strategy.getName() + ": " + e.getMessage());
            }
        }
        
        result.setOriginalResult(originalSchedule);
        result.setOptimizedResult(bestResult);
        result.setBestStrategy(bestStrategy != null ? bestStrategy.getName() : null);
        result.setImprovementFound(bestStrategy != null);
        
        return result;
    }

    private void validateProject(Project project) {
        if (project == null) {
            throw new IllegalArgumentException("Project cannot be null");
        }
        if (project.getStartDate() == null) {
            throw new BusinessException("Project must have a start date for scheduling");
        }
        if (project.getWorkingCalendar() == null) {
            throw new BusinessException("Project must have a working calendar for scheduling");
        }
    }

    private DependencyGraph buildDependencyGraph(Project project) {
        DependencyGraph graph = new DependencyGraph();
        
        // Add all activities and tasks as nodes
        for (Activity activity : project.getActivities()) {
            graph.addNode(new ActivitySchedulableItem(activity));
            
            for (Task task : activity.getTasks()) {
                graph.addNode(new TaskSchedulableItem(task));
            }
        }
        
        // Add dependencies as edges
        List<Dependency> dependencies = dependencyRepository.findByProject(project);
        for (Dependency dependency : dependencies) {
            SchedulableItem predecessor = createSchedulableItem(dependency.getPredecessorActivity(), dependency.getPredecessorTask());
            SchedulableItem successor = createSchedulableItem(dependency.getSuccessorActivity(), dependency.getSuccessorTask());
            
            if (predecessor != null && successor != null) {
                graph.addEdge(predecessor, successor, dependency);
            }
        }
        
        return graph;
    }

    private SchedulableItem createSchedulableItem(Activity activity, Task task) {
        if (activity != null) {
            return new ActivitySchedulableItem(activity);
        } else if (task != null) {
            return new TaskSchedulableItem(task);
        }
        return null;
    }

    private List<SchedulableItem> performTopologicalSort(DependencyGraph graph) {
        List<SchedulableItem> result = new ArrayList<>();
        Map<SchedulableItem, Integer> inDegree = new HashMap<>();
        Queue<SchedulableItem> queue = new LinkedList<>();
        
        // Initialize in-degree count
        for (SchedulableItem item : graph.getAllItems()) {
            inDegree.put(item, graph.getInDegree(item));
            if (graph.getInDegree(item) == 0) {
                queue.offer(item);
            }
        }
        
        // Process nodes in topological order
        while (!queue.isEmpty()) {
            SchedulableItem current = queue.poll();
            result.add(current);
            
            for (SchedulableItem successor : graph.getSuccessors(current)) {
                int newInDegree = inDegree.get(successor) - 1;
                inDegree.put(successor, newInDegree);
                
                if (newInDegree == 0) {
                    queue.offer(successor);
                }
            }
        }
        
        // Check for cycles
        if (result.size() != graph.getAllItems().size()) {
            throw new BusinessException("Circular dependency detected in project schedule");
        }
        
        return result;
    }

    private ScheduleCalculation calculateSchedule(Project project, List<SchedulableItem> topologicalOrder, DependencyGraph graph) {
        ScheduleCalculation calculation = new ScheduleCalculation();
        WorkingCalendar calendar = project.getWorkingCalendar();
        
        for (SchedulableItem item : topologicalOrder) {
            ItemSchedule schedule = calculateItemSchedule(item, graph, calendar, calculation);
            
            if (item instanceof ActivitySchedulableItem) {
                calculation.addActivitySchedule(((ActivitySchedulableItem) item).getActivity(), schedule);
            } else if (item instanceof TaskSchedulableItem) {
                calculation.addTaskSchedule(((TaskSchedulableItem) item).getTask(), schedule);
            }
        }
        
        return calculation;
    }

    private ItemSchedule calculateItemSchedule(SchedulableItem item, DependencyGraph graph, WorkingCalendar calendar, ScheduleCalculation existingCalculation) {
        // Calculate earliest start time based on dependencies
        LocalDateTime earliestStart = calculateEarliestStart(item, graph, calendar, existingCalculation);
        
        // Snap to working time boundary
        LocalDateTime workingStart = workingTimeCalculator.getNextWorkingTime(earliestStart, calendar);
        
        // Calculate duration and end time
        Duration duration = getItemDuration(item);
        LocalDateTime workingEnd = workingTimeCalculator.addWorkingTime(workingStart, duration, calendar);
        
        return new ItemSchedule(workingStart, workingEnd, duration);
    }

    private LocalDateTime calculateEarliestStart(SchedulableItem item, DependencyGraph graph, WorkingCalendar calendar, ScheduleCalculation calculation) {
        Set<Dependency> predecessorDeps = graph.getPredecessorDependencies(item);
        
        if (predecessorDeps.isEmpty()) {
            // No predecessors, start at project start time
            return getProjectStartForItem(item);
        }
        
        LocalDateTime latestConstraintTime = null;
        
        for (Dependency dependency : predecessorDeps) {
            LocalDateTime constraintTime = calculateDependencyConstraint(dependency, calendar, calculation);
            
            if (latestConstraintTime == null || constraintTime.isAfter(latestConstraintTime)) {
                latestConstraintTime = constraintTime;
            }
        }
        
        return latestConstraintTime;
    }

    private LocalDateTime calculateDependencyConstraint(Dependency dependency, WorkingCalendar calendar, ScheduleCalculation calculation) {
        SchedulableItem predecessor = createSchedulableItem(dependency.getPredecessorActivity(), dependency.getPredecessorTask());
        ItemSchedule predecessorSchedule = getScheduleForItem(predecessor, calculation);
        
        LocalDateTime baseTime = getDependencyBaseTime(dependency.getDependencyType(), predecessorSchedule);
        Duration lag = dependency.getLagInMinutes() != null ? Duration.ofMinutes(dependency.getLagInMinutes()) : Duration.ZERO;
        
        if (lag.isZero()) {
            return baseTime;
        } else if (lag.isNegative()) {
            return workingTimeCalculator.subtractWorkingTime(baseTime, lag.abs(), calendar);
        } else {
            return workingTimeCalculator.addWorkingTime(baseTime, lag, calendar);
        }
    }

    private LocalDateTime getDependencyBaseTime(DependencyType dependencyType, ItemSchedule predecessorSchedule) {
        switch (dependencyType) {
            case FS:
            case FF:
                return predecessorSchedule.getEndTime();
            case SS:
            case SF:
                return predecessorSchedule.getStartTime();
            default:
                throw new BusinessException("Unknown dependency type: " + dependencyType);
        }
    }

    private Duration getItemDuration(SchedulableItem item) {
        if (item instanceof ActivitySchedulableItem) {
            // For activities, use the sum of task durations or a default
            Activity activity = ((ActivitySchedulableItem) item).getActivity();
            if (activity.getTasks().isEmpty()) {
                return Duration.ofHours(8); // Default activity duration
            }
            // Duration will be calculated based on task scheduling
            return Duration.ofMinutes(1); // Placeholder
        } else if (item instanceof TaskSchedulableItem) {
            // For tasks, use planned duration or estimated duration
            Task task = ((TaskSchedulableItem) item).getTask();
            if (task.getStartDate() != null && task.getEndDate() != null) {
                return Duration.between(task.getStartDate(), task.getEndDate());
            }
            return Duration.ofHours(8); // Default task duration
        }
        return Duration.ofHours(1);
    }

    private LocalDateTime getProjectStartForItem(SchedulableItem item) {
        if (item instanceof ActivitySchedulableItem) {
            return ((ActivitySchedulableItem) item).getActivity().getProject().getStartDate();
        } else if (item instanceof TaskSchedulableItem) {
            return ((TaskSchedulableItem) item).getTask().getActivity().getProject().getStartDate();
        }
        return LocalDateTime.now();
    }

    private ItemSchedule getScheduleForItem(SchedulableItem item, ScheduleCalculation calculation) {
        if (item instanceof ActivitySchedulableItem) {
            return calculation.getActivitySchedules().get(((ActivitySchedulableItem) item).getActivity());
        } else if (item instanceof TaskSchedulableItem) {
            return calculation.getTaskSchedules().get(((TaskSchedulableItem) item).getTask());
        }
        return null;
    }

    private void applyScheduleToProject(Project project, ScheduleCalculation calculation) {
        // Apply activity schedules
        for (Map.Entry<Activity, ItemSchedule> entry : calculation.getActivitySchedules().entrySet()) {
            Activity activity = entry.getKey();
            ItemSchedule schedule = entry.getValue();
            
            activity.setActivityTimeline(schedule.getStartTime(), schedule.getEndTime());
            activityRepository.save(activity);
        }
        
        // Apply task schedules  
        for (Map.Entry<Task, ItemSchedule> entry : calculation.getTaskSchedules().entrySet()) {
            Task task = entry.getKey();
            ItemSchedule schedule = entry.getValue();
            
            task.setTaskTimeline(schedule.getStartTime(), schedule.getEndTime());
            taskRepository.save(task);
        }
    }

    // Placeholder methods for complex functionality that would need full implementation
    
    private Set<SchedulableItem> findAffectedItems(Project project, SchedulableItem changedItem) {
        // Implementation would traverse dependency graph to find all downstream items
        return new HashSet<>();
    }

    private DependencyGraph buildSubgraph(Project project, Set<SchedulableItem> items) {
        // Implementation would build a subgraph containing only the specified items
        return new DependencyGraph();
    }

    private ScheduleCalculation calculatePartialSchedule(Project project, List<SchedulableItem> order, DependencyGraph graph) {
        // Implementation would calculate schedule for subset of items
        return new ScheduleCalculation();
    }

    private void applyPartialSchedule(Project project, ScheduleCalculation calculation, Set<SchedulableItem> affectedItems) {
        // Implementation would apply schedule changes only to affected items
    }

    private Duration calculateTotalFloat(SchedulableItem item, DependencyGraph graph) {
        // Implementation would calculate total float using forward and backward pass
        return Duration.ZERO;
    }

    private LocalDateTime getItemStartDate(SchedulableItem item) {
        if (item instanceof ActivitySchedulableItem) {
            return ((ActivitySchedulableItem) item).getActivity().getStartDate();
        } else if (item instanceof TaskSchedulableItem) {
            return ((TaskSchedulableItem) item).getTask().getStartDate();
        }
        return LocalDateTime.MIN;
    }

    private Project cloneProjectForOptimization(Project project) {
        // Implementation would create a deep copy of project for optimization testing
        return project; // Placeholder
    }

    private boolean isScheduleImprovement(ScheduleResult newResult, ScheduleResult currentBest) {
        // Implementation would compare schedule results for improvement
        return false; // Placeholder
    }
}