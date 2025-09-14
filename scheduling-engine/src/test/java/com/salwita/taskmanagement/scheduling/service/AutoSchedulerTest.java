package com.salwita.taskmanagement.scheduling.service;

import com.salwita.taskmanagement.domain.entity.*;
import com.salwita.taskmanagement.domain.enums.DependencyType;
import com.salwita.taskmanagement.domain.enums.Role;
import com.salwita.taskmanagement.domain.exception.BusinessException;
import com.salwita.taskmanagement.domain.repository.DependencyRepository;
import com.salwita.taskmanagement.domain.repository.ActivityRepository;
import com.salwita.taskmanagement.domain.repository.TaskRepository;
import com.salwita.taskmanagement.domain.service.DependencyCalculationService;
import com.salwita.taskmanagement.domain.service.WorkingTimeCalculator;
import com.salwita.taskmanagement.domain.valueobject.WorkingCalendar;
import com.salwita.taskmanagement.scheduling.model.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.time.Duration;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AutoSchedulerTest {

    @Mock
    private DependencyRepository dependencyRepository;
    
    @Mock
    private ActivityRepository activityRepository;
    
    @Mock
    private TaskRepository taskRepository;
    
    @Mock
    private DependencyCalculationService dependencyCalculationService;
    
    @Mock
    private WorkingTimeCalculator workingTimeCalculator;

    private AutoScheduler autoScheduler;
    
    private Organisation organisation;
    private User user;
    private Project project;
    private Activity activity1;
    private Activity activity2;
    private Task task1;
    private Task task2;
    private WorkingCalendar workingCalendar;

    @BeforeEach
    void setUp() {
        autoScheduler = new AutoScheduler(
            dependencyRepository,
            activityRepository,
            taskRepository,
            dependencyCalculationService,
            workingTimeCalculator
        );

        organisation = new Organisation("Test Org", "test@example.com");
        organisation.setId(1L);

        user = new User("test@example.com", "Test", "User", "password", Role.PM, organisation);
        user.setId(1L);

        workingCalendar = new WorkingCalendar("09:00", "17:00", 8, "1,2,3,4,5", ZoneId.systemDefault().getId());

        project = new Project("Test Project", organisation, user);
        project.setId(1L);
        project.setProjectTimeline(LocalDateTime.of(2024, 1, 1, 9, 0), LocalDateTime.of(2024, 1, 31, 17, 0));
        project.setWorkingCalendar(workingCalendar);

        activity1 = new Activity("Activity 1", "Description 1", project);
        activity1.setId(1L);

        activity2 = new Activity("Activity 2", "Description 2", project);
        activity2.setId(2L);

        task1 = new Task("Task 1", "Task 1 description", activity1);
        task1.setId(1L);

        task2 = new Task("Task 2", "Task 2 description", activity2);
        task2.setId(2L);

        // Setup project structure
        project.setActivities(Arrays.asList(activity1, activity2));
        activity1.setTasks(Arrays.asList(task1));
        activity2.setTasks(Arrays.asList(task2));
    }

    @Test
    void scheduleProject_ValidProject_ReturnsSuccessfulResult() {
        // Setup dependencies
        when(dependencyRepository.findByProject(project)).thenReturn(Collections.emptyList());
        
        // Setup working time calculator responses
        when(workingTimeCalculator.getNextWorkingTime(any(), any()))
            .thenAnswer(invocation -> invocation.getArgument(0));
        when(workingTimeCalculator.addWorkingTime(any(), any(), any()))
            .thenAnswer(invocation -> {
                LocalDateTime start = invocation.getArgument(0);
                Duration duration = invocation.getArgument(1);
                return start.plus(duration);
            });

        ScheduleResult result = autoScheduler.scheduleProject(project);

        assertThat(result).isNotNull();
        assertThat(result.isSuccess()).isTrue();
        assertThat(result.getError()).isNull();
        assertThat(result.getTotalTime()).isGreaterThan(0);
        assertThat(result.getScheduledActivities()).isEqualTo(2);
        assertThat(result.getScheduledTasks()).isEqualTo(2);
        
        verify(activityRepository, times(2)).save(any(Activity.class));
        verify(taskRepository, times(2)).save(any(Task.class));
    }

    @Test
    void scheduleProject_WithDependencies_CalculatesCorrectOrder() {
        // Setup FS dependency: task1 -> task2
        Dependency dependency = new Dependency(task1, task2, DependencyType.FS, 0);
        when(dependencyRepository.findByProject(project)).thenReturn(Arrays.asList(dependency));
        
        // Setup working time calculator
        when(workingTimeCalculator.getNextWorkingTime(any(), any()))
            .thenAnswer(invocation -> invocation.getArgument(0));
        when(workingTimeCalculator.addWorkingTime(any(), any(), any()))
            .thenAnswer(invocation -> {
                LocalDateTime start = invocation.getArgument(0);
                Duration duration = invocation.getArgument(1);
                return start.plus(duration);
            });

        ScheduleResult result = autoScheduler.scheduleProject(project);

        assertThat(result.isSuccess()).isTrue();
        
        // Verify task1 is scheduled before task2 due to dependency
        verify(taskRepository).save(argThat(task -> 
            task.getId().equals(1L) && task.getStartDate().isBefore(task.getEndDate())
        ));
        verify(taskRepository).save(argThat(task -> 
            task.getId().equals(2L) && task.getStartDate() != null
        ));
    }

    @Test
    void scheduleProject_NullProject_ThrowsException() {
        assertThatThrownBy(() -> autoScheduler.scheduleProject(null))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessage("Project cannot be null");
    }

    @Test
    void scheduleProject_NoStartDate_ThrowsException() {
        project.setProjectTimeline(null, LocalDateTime.of(2024, 1, 31, 17, 0));
        
        assertThatThrownBy(() -> autoScheduler.scheduleProject(project))
            .isInstanceOf(BusinessException.class)
            .hasMessage("Project must have a start date for scheduling");
    }

    @Test
    void scheduleProject_NoWorkingCalendar_ThrowsException() {
        project.setWorkingCalendar(null);
        
        assertThatThrownBy(() -> autoScheduler.scheduleProject(project))
            .isInstanceOf(BusinessException.class)
            .hasMessage("Project must have a working calendar for scheduling");
    }

    @Test
    void calculateCriticalPath_SimpleProject_ReturnsCorrectPath() {
        when(dependencyRepository.findByProject(project)).thenReturn(Collections.emptyList());
        
        // Mock float calculation to make both tasks critical (zero float)
        when(workingTimeCalculator.calculateWorkingDuration(any(), any(), any()))
            .thenReturn(Duration.ZERO);

        List<SchedulableItem> criticalPath = autoScheduler.calculateCriticalPath(project);

        assertThat(criticalPath).isNotNull();
        // With zero dependencies and zero float, both tasks should be on critical path
        assertThat(criticalPath).hasSize(2);
    }

    @Test
    void optimizeSchedule_ValidProject_ReturnsOptimizationResult() {
        // Setup basic scheduling mocks
        when(dependencyRepository.findByProject(any())).thenReturn(Collections.emptyList());
        when(workingTimeCalculator.getNextWorkingTime(any(), any()))
            .thenAnswer(invocation -> invocation.getArgument(0));
        when(workingTimeCalculator.addWorkingTime(any(), any(), any()))
            .thenAnswer(invocation -> {
                LocalDateTime start = invocation.getArgument(0);
                Duration duration = invocation.getArgument(1);
                return start.plus(duration);
            });

        ScheduleOptimizationResult result = autoScheduler.optimizeSchedule(project);

        assertThat(result).isNotNull();
        assertThat(result.getOriginalResult()).isNotNull();
        assertThat(result.getOptimizedResult()).isNotNull();
        assertThat(result.getFailedStrategies()).isNotNull();
    }

    @Test
    void rescheduleFromItem_ValidItem_ReturnsSuccessfulResult() {
        TaskSchedulableItem changedItem = new TaskSchedulableItem(task1);
        
        // Mock empty affected items for simplicity
        when(dependencyRepository.findByProject(project)).thenReturn(Collections.emptyList());

        ScheduleResult result = autoScheduler.rescheduleFromItem(project, changedItem);

        assertThat(result).isNotNull();
        assertThat(result.isSuccess()).isTrue();
        assertThat(result.getAffectedItemsCount()).isEqualTo(0);
    }

    @Test
    void scheduleProject_CircularDependency_ThrowsException() {
        // Create circular dependency: task1 -> task2 -> task1
        Dependency dep1 = new Dependency(task1, task2, DependencyType.FS, 0);
        Dependency dep2 = new Dependency(task2, task1, DependencyType.FS, 0);
        
        when(dependencyRepository.findByProject(project))
            .thenReturn(Arrays.asList(dep1, dep2));

        assertThatThrownBy(() -> autoScheduler.scheduleProject(project))
            .isInstanceOf(BusinessException.class)
            .hasMessage("Failed to schedule project: Circular dependency detected in project schedule");
    }

    @Test
    void scheduleProject_PerformanceMetrics_AreRecorded() {
        when(dependencyRepository.findByProject(project)).thenReturn(Collections.emptyList());
        when(workingTimeCalculator.getNextWorkingTime(any(), any()))
            .thenAnswer(invocation -> invocation.getArgument(0));
        when(workingTimeCalculator.addWorkingTime(any(), any(), any()))
            .thenAnswer(invocation -> {
                LocalDateTime start = invocation.getArgument(0);
                return start.plusHours(8);
            });

        ScheduleResult result = autoScheduler.scheduleProject(project);

        assertThat(result.getGraphBuildTime()).isGreaterThanOrEqualTo(0);
        assertThat(result.getTopologicalSortTime()).isGreaterThanOrEqualTo(0);
        assertThat(result.getScheduleCalculationTime()).isGreaterThanOrEqualTo(0);
        assertThat(result.getApplyTime()).isGreaterThanOrEqualTo(0);
        assertThat(result.getTotalTime()).isGreaterThan(0);
    }

    @Test
    void scheduleProject_LargeProject_HandlesEfficiently() {
        // Create a larger project structure for performance testing
        Project largeProject = createLargeTestProject(50, 200); // 50 activities, 200 tasks
        
        when(dependencyRepository.findByProject(largeProject)).thenReturn(Collections.emptyList());
        when(workingTimeCalculator.getNextWorkingTime(any(), any()))
            .thenAnswer(invocation -> invocation.getArgument(0));
        when(workingTimeCalculator.addWorkingTime(any(), any(), any()))
            .thenAnswer(invocation -> {
                LocalDateTime start = invocation.getArgument(0);
                return start.plusHours(8);
            });

        long startTime = System.currentTimeMillis();
        ScheduleResult result = autoScheduler.scheduleProject(largeProject);
        long duration = System.currentTimeMillis() - startTime;

        assertThat(result.isSuccess()).isTrue();
        assertThat(duration).isLessThan(5000); // Should complete within 5 seconds
        assertThat(result.getScheduledActivities()).isEqualTo(50);
        assertThat(result.getScheduledTasks()).isEqualTo(200);
    }

    private Project createLargeTestProject(int numActivities, int numTasks) {
        Project largeProject = new Project("Large Test Project", organisation, user);
        largeProject.setId(100L);
        largeProject.setProjectTimeline(LocalDateTime.of(2024, 1, 1, 9, 0), LocalDateTime.of(2024, 12, 31, 17, 0));
        largeProject.setWorkingCalendar(workingCalendar);

        List<Activity> activities = new java.util.ArrayList<>();
        int taskId = 1;
        
        for (int i = 1; i <= numActivities; i++) {
            Activity activity = new Activity("Activity " + i, "Description " + i, largeProject);
            activity.setId((long) i);
            
            List<Task> tasks = new java.util.ArrayList<>();
            int tasksPerActivity = numTasks / numActivities;
            
            for (int j = 0; j < tasksPerActivity; j++) {
                Task task = new Task("Task " + taskId, "Task " + taskId + " description", activity);
                task.setId((long) taskId);
                tasks.add(task);
                taskId++;
            }
            
            activity.setTasks(tasks);
            activities.add(activity);
        }
        
        largeProject.setActivities(activities);
        return largeProject;
    }
}