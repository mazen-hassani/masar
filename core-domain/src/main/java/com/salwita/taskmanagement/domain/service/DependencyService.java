package com.salwita.taskmanagement.domain.service;

import com.salwita.taskmanagement.domain.entity.*;
import com.salwita.taskmanagement.domain.enums.DependencyType;
import com.salwita.taskmanagement.domain.repository.DependencyRepository;
import com.salwita.taskmanagement.domain.repository.TemplateDependencyRepository;
import com.salwita.taskmanagement.domain.repository.TemplateActivityRepository;
import com.salwita.taskmanagement.domain.repository.TemplateTaskRepository;
import com.salwita.taskmanagement.domain.repository.ActivityRepository;
import com.salwita.taskmanagement.domain.repository.TaskRepository;
import com.salwita.taskmanagement.domain.exception.BusinessException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.util.*;
import java.util.stream.Collectors;

@Service
@Transactional
public class DependencyService {

    private final DependencyRepository dependencyRepository;
    private final TemplateDependencyRepository templateDependencyRepository;
    private final TemplateActivityRepository templateActivityRepository;
    private final TemplateTaskRepository templateTaskRepository;
    private final ActivityRepository activityRepository;
    private final TaskRepository taskRepository;

    @Autowired
    public DependencyService(
            DependencyRepository dependencyRepository,
            TemplateDependencyRepository templateDependencyRepository,
            TemplateActivityRepository templateActivityRepository,
            TemplateTaskRepository templateTaskRepository,
            ActivityRepository activityRepository,
            TaskRepository taskRepository) {
        this.dependencyRepository = dependencyRepository;
        this.templateDependencyRepository = templateDependencyRepository;
        this.templateActivityRepository = templateActivityRepository;
        this.templateTaskRepository = templateTaskRepository;
        this.activityRepository = activityRepository;
        this.taskRepository = taskRepository;
    }

    public Dependency createActivityDependency(
            Long predecessorActivityId, 
            Long successorActivityId, 
            DependencyType dependencyType, 
            Duration lag) {
        
        Activity predecessor = activityRepository.findById(predecessorActivityId)
            .orElseThrow(() -> new BusinessException("Predecessor activity not found: " + predecessorActivityId));
        Activity successor = activityRepository.findById(successorActivityId)
            .orElseThrow(() -> new BusinessException("Successor activity not found: " + successorActivityId));

        validateActivityDependency(predecessor, successor, dependencyType);
        
        int lagInMinutes = lag != null ? (int) lag.toMinutes() : 0;
        Dependency dependency = new Dependency(predecessor, successor, dependencyType, lagInMinutes);
        
        return dependencyRepository.save(dependency);
    }

    public Dependency createTaskDependency(
            Long predecessorTaskId, 
            Long successorTaskId, 
            DependencyType dependencyType, 
            Duration lag) {
        
        Task predecessor = taskRepository.findById(predecessorTaskId)
            .orElseThrow(() -> new BusinessException("Predecessor task not found: " + predecessorTaskId));
        Task successor = taskRepository.findById(successorTaskId)
            .orElseThrow(() -> new BusinessException("Successor task not found: " + successorTaskId));

        validateTaskDependency(predecessor, successor, dependencyType);
        
        int lagInMinutes = lag != null ? (int) lag.toMinutes() : 0;
        Dependency dependency = new Dependency(predecessor, successor, dependencyType, lagInMinutes);
        
        return dependencyRepository.save(dependency);
    }

    public TemplateDependency createActivityTemplateDependency(
            Long predecessorActivityId, 
            Long successorActivityId, 
            DependencyType dependencyType, 
            int lagInMinutes) {
        
        TemplateActivity predecessor = templateActivityRepository.findById(predecessorActivityId)
            .orElseThrow(() -> new BusinessException("Predecessor template activity not found: " + predecessorActivityId));
        TemplateActivity successor = templateActivityRepository.findById(successorActivityId)
            .orElseThrow(() -> new BusinessException("Successor template activity not found: " + successorActivityId));

        validateTemplateActivityDependency(predecessor, successor, dependencyType);
        
        TemplateDependency dependency = new TemplateDependency(dependencyType, predecessor, successor, predecessor.getProjectTemplate());
        dependency.setLag(lagInMinutes);
        
        return templateDependencyRepository.save(dependency);
    }

    public TemplateDependency createTaskTemplateDependency(
            Long predecessorTaskId, 
            Long successorTaskId, 
            DependencyType dependencyType, 
            int lagInMinutes) {
        
        TemplateTask predecessor = templateTaskRepository.findById(predecessorTaskId)
            .orElseThrow(() -> new BusinessException("Predecessor template task not found: " + predecessorTaskId));
        TemplateTask successor = templateTaskRepository.findById(successorTaskId)
            .orElseThrow(() -> new BusinessException("Successor template task not found: " + successorTaskId));

        validateTemplateTaskDependency(predecessor, successor, dependencyType);
        
        TemplateDependency dependency = new TemplateDependency(dependencyType, predecessor, successor, predecessor.getTemplateActivity().getProjectTemplate());
        dependency.setLag(lagInMinutes);
        
        return templateDependencyRepository.save(dependency);
    }

    public void deleteDependency(Long dependencyId) {
        Dependency dependency = dependencyRepository.findById(dependencyId)
            .orElseThrow(() -> new BusinessException("Dependency not found: " + dependencyId));
        dependencyRepository.delete(dependency);
    }

    public void deleteTemplateDependency(Long dependencyId) {
        TemplateDependency dependency = templateDependencyRepository.findById(dependencyId)
            .orElseThrow(() -> new BusinessException("Template dependency not found: " + dependencyId));
        templateDependencyRepository.delete(dependency);
    }

    public List<Dependency> getProjectDependencies(Long projectId) {
        return dependencyRepository.findByProjectId(projectId);
    }

    public List<TemplateDependency> getTemplateDependencies(Long templateId) {
        return templateDependencyRepository.findByProjectTemplateId(templateId);
    }

    public List<Dependency> getActivityPredecessors(Long activityId) {
        Activity activity = activityRepository.findById(activityId)
            .orElseThrow(() -> new BusinessException("Activity not found: " + activityId));
        return dependencyRepository.findBySuccessorActivity(activity);
    }

    public List<Dependency> getActivitySuccessors(Long activityId) {
        Activity activity = activityRepository.findById(activityId)
            .orElseThrow(() -> new BusinessException("Activity not found: " + activityId));
        return dependencyRepository.findByPredecessorActivity(activity);
    }

    public List<Dependency> getTaskPredecessors(Long taskId) {
        Task task = taskRepository.findById(taskId)
            .orElseThrow(() -> new BusinessException("Task not found: " + taskId));
        return dependencyRepository.findBySuccessorTask(task);
    }

    public List<Dependency> getTaskSuccessors(Long taskId) {
        Task task = taskRepository.findById(taskId)
            .orElseThrow(() -> new BusinessException("Task not found: " + taskId));
        return dependencyRepository.findByPredecessorTask(task);
    }

    private void validateActivityDependency(Activity predecessor, Activity successor, DependencyType dependencyType) {
        if (!predecessor.getProject().getId().equals(successor.getProject().getId())) {
            throw new BusinessException("Activities must belong to the same project");
        }

        if (predecessor.getId().equals(successor.getId())) {
            throw new BusinessException("Activity cannot depend on itself");
        }

        if (dependencyRepository.existsByPredecessorActivityAndSuccessorActivity(predecessor, successor)) {
            throw new BusinessException("Dependency already exists between these activities");
        }

        if (wouldCreateCycle(predecessor.getProject(), predecessor, successor, null, null)) {
            throw new BusinessException("Creating this dependency would create a cycle");
        }
    }

    private void validateTaskDependency(Task predecessor, Task successor, DependencyType dependencyType) {
        if (!predecessor.getActivity().getProject().getId().equals(successor.getActivity().getProject().getId())) {
            throw new BusinessException("Tasks must belong to the same project");
        }

        if (predecessor.getId().equals(successor.getId())) {
            throw new BusinessException("Task cannot depend on itself");
        }

        if (dependencyRepository.existsByPredecessorTaskAndSuccessorTask(predecessor, successor)) {
            throw new BusinessException("Dependency already exists between these tasks");
        }

        if (wouldCreateCycle(predecessor.getActivity().getProject(), null, null, predecessor, successor)) {
            throw new BusinessException("Creating this dependency would create a cycle");
        }
    }

    private void validateTemplateActivityDependency(TemplateActivity predecessor, TemplateActivity successor, DependencyType dependencyType) {
        if (!predecessor.getProjectTemplate().getId().equals(successor.getProjectTemplate().getId())) {
            throw new BusinessException("Template activities must belong to the same template");
        }

        if (predecessor.getId().equals(successor.getId())) {
            throw new BusinessException("Template activity cannot depend on itself");
        }

        if (templateDependencyRepository.existsByPredecessorTemplateActivityAndSuccessorTemplateActivity(predecessor, successor)) {
            throw new BusinessException("Dependency already exists between these template activities");
        }
    }

    private void validateTemplateTaskDependency(TemplateTask predecessor, TemplateTask successor, DependencyType dependencyType) {
        if (!predecessor.getTemplateActivity().getProjectTemplate().getId().equals(successor.getTemplateActivity().getProjectTemplate().getId())) {
            throw new BusinessException("Template tasks must belong to the same template");
        }

        if (predecessor.getId().equals(successor.getId())) {
            throw new BusinessException("Template task cannot depend on itself");
        }

        if (templateDependencyRepository.existsByPredecessorTemplateTaskAndSuccessorTemplateTask(predecessor, successor)) {
            throw new BusinessException("Dependency already exists between these template tasks");
        }
    }

    private boolean wouldCreateCycle(Project project, Activity predActivity, Activity succActivity, Task predTask, Task succTask) {
        List<Dependency> allDependencies = dependencyRepository.findByProject(project);
        
        // Create a temporary dependency to test for cycles
        Dependency tempDependency;
        if (predActivity != null && succActivity != null) {
            tempDependency = new Dependency(predActivity, succActivity, DependencyType.FS);
        } else if (predTask != null && succTask != null) {
            tempDependency = new Dependency(predTask, succTask, DependencyType.FS);
        } else {
            throw new BusinessException("Invalid dependency configuration for cycle detection");
        }
        
        List<Dependency> testDependencies = new ArrayList<>(allDependencies);
        testDependencies.add(tempDependency);
        
        return hasCycle(testDependencies, project);
    }

    private boolean hasCycle(List<Dependency> dependencies, Project project) {
        // Use Kahn's algorithm for cycle detection
        Map<String, Set<String>> graph = buildDependencyGraph(dependencies);
        Map<String, Integer> inDegree = calculateInDegree(graph);
        
        Queue<String> queue = new LinkedList<>();
        for (Map.Entry<String, Integer> entry : inDegree.entrySet()) {
            if (entry.getValue() == 0) {
                queue.offer(entry.getKey());
            }
        }
        
        int processedNodes = 0;
        while (!queue.isEmpty()) {
            String current = queue.poll();
            processedNodes++;
            
            Set<String> successors = graph.getOrDefault(current, Collections.emptySet());
            for (String successor : successors) {
                inDegree.put(successor, inDegree.get(successor) - 1);
                if (inDegree.get(successor) == 0) {
                    queue.offer(successor);
                }
            }
        }
        
        return processedNodes != inDegree.size();
    }

    private Map<String, Set<String>> buildDependencyGraph(List<Dependency> dependencies) {
        Map<String, Set<String>> graph = new HashMap<>();
        
        for (Dependency dep : dependencies) {
            String predecessor = getNodeId(dep.getPredecessorActivity(), dep.getPredecessorTask());
            String successor = getNodeId(dep.getSuccessorActivity(), dep.getSuccessorTask());
            
            graph.computeIfAbsent(predecessor, k -> new HashSet<>()).add(successor);
            graph.computeIfAbsent(successor, k -> new HashSet<>());
        }
        
        return graph;
    }

    private Map<String, Integer> calculateInDegree(Map<String, Set<String>> graph) {
        Map<String, Integer> inDegree = new HashMap<>();
        
        // Initialize all nodes with 0 in-degree
        for (String node : graph.keySet()) {
            inDegree.put(node, 0);
        }
        
        // Calculate in-degree for each node
        for (Set<String> successors : graph.values()) {
            for (String successor : successors) {
                inDegree.put(successor, inDegree.get(successor) + 1);
            }
        }
        
        return inDegree;
    }

    private String getNodeId(Activity activity, Task task) {
        if (activity != null) {
            return "A" + activity.getId();
        } else if (task != null) {
            return "T" + task.getId();
        } else {
            throw new IllegalArgumentException("Either activity or task must be provided");
        }
    }
}