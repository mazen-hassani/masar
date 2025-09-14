package com.salwita.taskmanagement.domain.service;

import com.salwita.taskmanagement.domain.entity.*;
import com.salwita.taskmanagement.domain.enums.DependencyType;
import com.salwita.taskmanagement.domain.enums.Role;
import com.salwita.taskmanagement.domain.exception.BusinessException;
import com.salwita.taskmanagement.domain.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.Collections;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DependencyServiceTest {

    @Mock
    private DependencyRepository dependencyRepository;
    
    @Mock
    private TemplateDependencyRepository templateDependencyRepository;
    
    @Mock
    private TemplateActivityRepository templateActivityRepository;
    
    @Mock
    private TemplateTaskRepository templateTaskRepository;
    
    @Mock
    private ActivityRepository activityRepository;
    
    @Mock
    private TaskRepository taskRepository;

    private DependencyService dependencyService;
    
    private Organisation organisation;
    private User user;
    private Project project;
    private Activity activity1;
    private Activity activity2;
    private Task task1;
    private Task task2;

    @BeforeEach
    void setUp() {
        dependencyService = new DependencyService(
            dependencyRepository,
            templateDependencyRepository, 
            templateActivityRepository,
            templateTaskRepository,
            activityRepository,
            taskRepository
        );

        organisation = new Organisation("Test Org", "test@example.com");
        organisation.setId(1L);

        user = new User("test@example.com", "Test User", Role.PM, organisation);
        user.setId(1L);

        project = new Project("Test Project", organisation, user);
        project.setId(1L);
        project.setProjectTimeline(LocalDateTime.now(), LocalDateTime.now().plusDays(30));

        activity1 = new Activity("Activity 1", "Activity 1 description", project, 1);
        activity1.setId(1L);
        activity1.setActivityTimeline(LocalDateTime.now(), LocalDateTime.now().plusDays(10));

        activity2 = new Activity("Activity 2", "Activity 2 description", project, 2);
        activity2.setId(2L);
        activity2.setActivityTimeline(LocalDateTime.now().plusDays(10), LocalDateTime.now().plusDays(20));

        task1 = new Task("Task 1", "Task 1 description", activity1);
        task1.setId(1L);
        task1.setTaskTimeline(LocalDateTime.now(), LocalDateTime.now().plusDays(1));

        task2 = new Task("Task 2", "Task 2 description", activity2);
        task2.setId(2L);
        task2.setTaskTimeline(LocalDateTime.now().plusDays(10), LocalDateTime.now().plusDays(12));
    }

    @Test
    void createActivityDependency_Success() {
        when(activityRepository.findById(1L)).thenReturn(Optional.of(activity1));
        when(activityRepository.findById(2L)).thenReturn(Optional.of(activity2));
        when(dependencyRepository.existsByPredecessorActivityAndSuccessorActivity(activity1, activity2)).thenReturn(false);
        when(dependencyRepository.findByProject(project)).thenReturn(Collections.emptyList());
        
        Dependency expectedDependency = new Dependency();
        expectedDependency.setId(1L);
        when(dependencyRepository.save(any(Dependency.class))).thenReturn(expectedDependency);

        Dependency result = dependencyService.createActivityDependency(1L, 2L, DependencyType.FS, Duration.ofHours(2));

        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo(1L);
        
        verify(dependencyRepository).save(argThat(dep -> 
            dep.getPredecessorActivity().equals(activity1) &&
            dep.getSuccessorActivity().equals(activity2) &&
            dep.getDependencyType() == DependencyType.FS &&
            dep.getLag().equals(Duration.ofHours(2))
        ));
    }

    @Test
    void createActivityDependency_PredecessorNotFound_ThrowsException() {
        when(activityRepository.findById(1L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> 
            dependencyService.createActivityDependency(1L, 2L, DependencyType.FS, Duration.ZERO))
            .isInstanceOf(BusinessException.class)
            .hasMessage("Predecessor activity not found: 1");
    }

    @Test
    void createActivityDependency_SuccessorNotFound_ThrowsException() {
        when(activityRepository.findById(1L)).thenReturn(Optional.of(activity1));
        when(activityRepository.findById(2L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> 
            dependencyService.createActivityDependency(1L, 2L, DependencyType.FS, Duration.ZERO))
            .isInstanceOf(BusinessException.class)
            .hasMessage("Successor activity not found: 2");
    }

    @Test
    void createActivityDependency_DifferentProjects_ThrowsException() {
        Project differentProject = new Project("Different Project", organisation, user);
        differentProject.setId(2L);
        activity2.setProject(differentProject);
        
        when(activityRepository.findById(1L)).thenReturn(Optional.of(activity1));
        when(activityRepository.findById(2L)).thenReturn(Optional.of(activity2));

        assertThatThrownBy(() -> 
            dependencyService.createActivityDependency(1L, 2L, DependencyType.FS, Duration.ZERO))
            .isInstanceOf(BusinessException.class)
            .hasMessage("Activities must belong to the same project");
    }

    @Test
    void createActivityDependency_SelfDependency_ThrowsException() {
        when(activityRepository.findById(1L)).thenReturn(Optional.of(activity1));

        assertThatThrownBy(() -> 
            dependencyService.createActivityDependency(1L, 1L, DependencyType.FS, Duration.ZERO))
            .isInstanceOf(BusinessException.class)
            .hasMessage("Activity cannot depend on itself");
    }

    @Test
    void createActivityDependency_DependencyExists_ThrowsException() {
        when(activityRepository.findById(1L)).thenReturn(Optional.of(activity1));
        when(activityRepository.findById(2L)).thenReturn(Optional.of(activity2));
        when(dependencyRepository.existsByPredecessorActivityAndSuccessorActivity(activity1, activity2)).thenReturn(true);

        assertThatThrownBy(() -> 
            dependencyService.createActivityDependency(1L, 2L, DependencyType.FS, Duration.ZERO))
            .isInstanceOf(BusinessException.class)
            .hasMessage("Dependency already exists between these activities");
    }

    @Test
    void createTaskDependency_Success() {
        when(taskRepository.findById(1L)).thenReturn(Optional.of(task1));
        when(taskRepository.findById(2L)).thenReturn(Optional.of(task2));
        when(dependencyRepository.existsByPredecessorTaskAndSuccessorTask(task1, task2)).thenReturn(false);
        when(dependencyRepository.findByProject(project)).thenReturn(Collections.emptyList());
        
        Dependency expectedDependency = new Dependency();
        expectedDependency.setId(1L);
        when(dependencyRepository.save(any(Dependency.class))).thenReturn(expectedDependency);

        Dependency result = dependencyService.createTaskDependency(1L, 2L, DependencyType.SS, Duration.ofMinutes(30));

        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo(1L);
        
        verify(dependencyRepository).save(argThat(dep -> 
            dep.getPredecessorTask().equals(task1) &&
            dep.getSuccessorTask().equals(task2) &&
            dep.getDependencyType() == DependencyType.SS &&
            dep.getLag().equals(Duration.ofMinutes(30))
        ));
    }

    @Test
    void createTaskDependency_DifferentProjects_ThrowsException() {
        Project differentProject = new Project("Different Project", organisation, user);
        differentProject.setId(2L);
        Activity differentActivity = new Activity("Different Activity", differentProject, 1);
        task2.setActivity(differentActivity);
        
        when(taskRepository.findById(1L)).thenReturn(Optional.of(task1));
        when(taskRepository.findById(2L)).thenReturn(Optional.of(task2));

        assertThatThrownBy(() -> 
            dependencyService.createTaskDependency(1L, 2L, DependencyType.FS, Duration.ZERO))
            .isInstanceOf(BusinessException.class)
            .hasMessage("Tasks must belong to the same project");
    }

    @Test
    void createTaskDependency_SelfDependency_ThrowsException() {
        when(taskRepository.findById(1L)).thenReturn(Optional.of(task1));

        assertThatThrownBy(() -> 
            dependencyService.createTaskDependency(1L, 1L, DependencyType.FS, Duration.ZERO))
            .isInstanceOf(BusinessException.class)
            .hasMessage("Task cannot depend on itself");
    }

    @Test
    void getActivityPredecessors_Success() {
        Dependency dependency = new Dependency();
        dependency.setId(1L);
        dependency.setPredecessorActivity(activity1);
        dependency.setSuccessorActivity(activity2);
        
        when(activityRepository.findById(2L)).thenReturn(Optional.of(activity2));
        when(dependencyRepository.findBySuccessorActivity(activity2)).thenReturn(Arrays.asList(dependency));

        var result = dependencyService.getActivityPredecessors(2L);

        assertThat(result).hasSize(1);
        assertThat(result.get(0)).isEqualTo(dependency);
    }

    @Test
    void getActivitySuccessors_Success() {
        Dependency dependency = new Dependency();
        dependency.setId(1L);
        dependency.setPredecessorActivity(activity1);
        dependency.setSuccessorActivity(activity2);
        
        when(activityRepository.findById(1L)).thenReturn(Optional.of(activity1));
        when(dependencyRepository.findByPredecessorActivity(activity1)).thenReturn(Arrays.asList(dependency));

        var result = dependencyService.getActivitySuccessors(1L);

        assertThat(result).hasSize(1);
        assertThat(result.get(0)).isEqualTo(dependency);
    }

    @Test
    void deleteDependency_Success() {
        Dependency dependency = new Dependency();
        dependency.setId(1L);
        
        when(dependencyRepository.findById(1L)).thenReturn(Optional.of(dependency));

        dependencyService.deleteDependency(1L);

        verify(dependencyRepository).delete(dependency);
    }

    @Test
    void deleteDependency_NotFound_ThrowsException() {
        when(dependencyRepository.findById(1L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> dependencyService.deleteDependency(1L))
            .isInstanceOf(BusinessException.class)
            .hasMessage("Dependency not found: 1");
    }

    @Test
    void createActivityDependency_WouldCreateCycle_ThrowsException() {
        // Setup a cycle scenario: A1 -> A2, trying to create A2 -> A1
        Activity activity3 = new Activity("Activity 3", project, 3);
        activity3.setId(3L);
        
        Dependency existingDep = new Dependency();
        existingDep.setPredecessorActivity(activity1);
        existingDep.setSuccessorActivity(activity2);
        
        when(activityRepository.findById(2L)).thenReturn(Optional.of(activity2));
        when(activityRepository.findById(1L)).thenReturn(Optional.of(activity1));
        when(dependencyRepository.existsByPredecessorActivityAndSuccessorActivity(activity2, activity1)).thenReturn(false);
        when(dependencyRepository.findByProject(project)).thenReturn(Arrays.asList(existingDep));

        assertThatThrownBy(() -> 
            dependencyService.createActivityDependency(2L, 1L, DependencyType.FS, Duration.ZERO))
            .isInstanceOf(BusinessException.class)
            .hasMessage("Creating this dependency would create a cycle");
    }
}