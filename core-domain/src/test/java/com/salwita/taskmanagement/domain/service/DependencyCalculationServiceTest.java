package com.salwita.taskmanagement.domain.service;

import com.salwita.taskmanagement.domain.entity.*;
import com.salwita.taskmanagement.domain.enums.DependencyType;
import com.salwita.taskmanagement.domain.enums.Role;
import com.salwita.taskmanagement.domain.enums.Status;
import com.salwita.taskmanagement.domain.repository.DependencyRepository;
import com.salwita.taskmanagement.domain.valueobject.WorkingCalendar;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Duration;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DependencyCalculationServiceTest {

    @Mock
    private DependencyRepository dependencyRepository;
    
    @Mock
    private WorkingTimeCalculator workingTimeCalculator;

    private DependencyCalculationService calculationService;
    
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
        calculationService = new DependencyCalculationService(dependencyRepository, workingTimeCalculator);

        organisation = new Organisation("Test Org", "test@example.com");
        organisation.setId(1L);

        user = new User("test@example.com", "Test User", Role.PM, organisation);
        user.setId(1L);

        workingCalendar = new WorkingCalendar(
            LocalTime.of(9, 0),
            LocalTime.of(17, 0),
            Arrays.asList(1, 2, 3, 4, 5) // Monday to Friday
        );

        project = new Project("Test Project", organisation, user);
        project.setId(1L);
        project.setWorkingCalendar(workingCalendar);
        project.setProjectTimeline(LocalDateTime.of(2024, 1, 1, 9, 0), LocalDateTime.of(2024, 1, 31, 17, 0));

        activity1 = new Activity("Activity 1", "Activity 1 description", project, 1);
        activity1.setId(1L);
        activity1.setActivityTimeline(LocalDateTime.of(2024, 1, 1, 9, 0), LocalDateTime.of(2024, 1, 10, 17, 0));

        activity2 = new Activity("Activity 2", "Activity 2 description", project, 2);
        activity2.setId(2L);
        activity2.setActivityTimeline(LocalDateTime.of(2024, 1, 11, 9, 0), LocalDateTime.of(2024, 1, 20, 17, 0));

        task1 = new Task("Task 1", "Task 1 description", activity1);
        task1.setId(1L);
        task1.setTaskTimeline(LocalDateTime.of(2024, 1, 1, 9, 0), LocalDateTime.of(2024, 1, 1, 17, 0));

        task2 = new Task("Task 2", "Task 2 description", activity2);
        task2.setId(2L);
        task2.setTaskTimeline(LocalDateTime.of(2024, 1, 11, 9, 0), LocalDateTime.of(2024, 1, 12, 17, 0));
    }

    @Test
    void calculateEarliestStartTime_TaskWithNoPredecessors_ReturnsActivityStartTime() {
        when(dependencyRepository.findBySuccessorTask(task1)).thenReturn(Collections.emptyList());

        LocalDateTime result = calculationService.calculateEarliestStartTime(task1);

        assertThat(result).isEqualTo(activity1.getStartDate());
    }

    @Test
    void calculateEarliestStartTime_TaskWithPredecessor_CalculatesConstraintTime() {
        Dependency dependency = new Dependency();
        dependency.setPredecessorTask(task1);
        dependency.setSuccessorTask(task2);
        dependency.setDependencyType(DependencyType.FS);
        dependency.setLag(Duration.ofHours(2));
        dependency.setProject(project);

        LocalDateTime expectedConstraintTime = LocalDateTime.of(2024, 1, 2, 11, 0);
        
        when(dependencyRepository.findBySuccessorTask(task2)).thenReturn(Arrays.asList(dependency));
        when(workingTimeCalculator.addWorkingTime(
            task1.getEndDate(), Duration.ofHours(2), workingCalendar))
            .thenReturn(expectedConstraintTime);

        LocalDateTime result = calculationService.calculateEarliestStartTime(task2);

        assertThat(result).isEqualTo(expectedConstraintTime);
    }

    @Test
    void calculateEarliestStartTime_ActivityWithNoPredecessors_ReturnsProjectStartTime() {
        when(dependencyRepository.findBySuccessorActivity(activity1)).thenReturn(Collections.emptyList());

        LocalDateTime result = calculationService.calculateEarliestStartTime(activity1);

        assertThat(result).isEqualTo(project.getStartDate());
    }

    @Test
    void calculateLatestFinishTime_TaskWithNoSuccessors_ReturnsActivityEndTime() {
        when(dependencyRepository.findByPredecessorTask(task1)).thenReturn(Collections.emptyList());

        LocalDateTime result = calculationService.calculateLatestFinishTime(task1);

        assertThat(result).isEqualTo(activity1.getEndDate());
    }

    @Test
    void calculateTotalFloat_TaskOnCriticalPath_ReturnsZero() {
        when(dependencyRepository.findBySuccessorTask(task1)).thenReturn(Collections.emptyList());
        when(dependencyRepository.findByPredecessorTask(task1)).thenReturn(Collections.emptyList());
        when(workingTimeCalculator.calculateWorkingDuration(
            task1.getEndDate(), activity1.getEndDate(), workingCalendar))
            .thenReturn(Duration.ZERO);

        Duration result = calculationService.calculateTotalFloat(task1);

        assertThat(result).isEqualTo(Duration.ZERO);
    }

    @Test
    void calculateTotalFloat_TaskWithFloat_ReturnsPositiveDuration() {
        Duration expectedFloat = Duration.ofHours(8);
        
        when(dependencyRepository.findBySuccessorTask(task1)).thenReturn(Collections.emptyList());
        when(dependencyRepository.findByPredecessorTask(task1)).thenReturn(Collections.emptyList());
        when(workingTimeCalculator.calculateWorkingDuration(
            task1.getEndDate(), activity1.getEndDate(), workingCalendar))
            .thenReturn(expectedFloat);

        Duration result = calculationService.calculateTotalFloat(task1);

        assertThat(result).isEqualTo(expectedFloat);
    }

    @Test
    void calculateFreeFloat_TaskWithNoSuccessors_ReturnsTotalFloat() {
        Duration expectedFloat = Duration.ofHours(8);
        
        when(dependencyRepository.findBySuccessorTask(task1)).thenReturn(Collections.emptyList());
        when(dependencyRepository.findByPredecessorTask(task1)).thenReturn(Collections.emptyList());
        when(workingTimeCalculator.calculateWorkingDuration(
            task1.getEndDate(), activity1.getEndDate(), workingCalendar))
            .thenReturn(expectedFloat);

        Duration result = calculationService.calculateFreeFloat(task1);

        assertThat(result).isEqualTo(expectedFloat);
    }

    @Test
    void isOnCriticalPath_TaskWithZeroFloat_ReturnsTrue() {
        when(dependencyRepository.findBySuccessorTask(task1)).thenReturn(Collections.emptyList());
        when(dependencyRepository.findByPredecessorTask(task1)).thenReturn(Collections.emptyList());
        when(workingTimeCalculator.calculateWorkingDuration(any(), any(), any()))
            .thenReturn(Duration.ZERO);

        boolean result = calculationService.isOnCriticalPath(task1);

        assertThat(result).isTrue();
    }

    @Test
    void isOnCriticalPath_TaskWithPositiveFloat_ReturnsFalse() {
        when(dependencyRepository.findBySuccessorTask(task1)).thenReturn(Collections.emptyList());
        when(dependencyRepository.findByPredecessorTask(task1)).thenReturn(Collections.emptyList());
        when(workingTimeCalculator.calculateWorkingDuration(any(), any(), any()))
            .thenReturn(Duration.ofHours(4));

        boolean result = calculationService.isOnCriticalPath(task1);

        assertThat(result).isFalse();
    }

    @Test
    void calculateCriticalPath_ProjectWithCriticalTasks_ReturnsSortedList() {
        // Set up the project structure
        project.setActivities(Arrays.asList(activity1, activity2));
        activity1.setTasks(Arrays.asList(task1));
        activity2.setTasks(Arrays.asList(task2));

        // Mock both tasks as being on critical path
        when(dependencyRepository.findBySuccessorTask(any())).thenReturn(Collections.emptyList());
        when(dependencyRepository.findByPredecessorTask(any())).thenReturn(Collections.emptyList());
        when(workingTimeCalculator.calculateWorkingDuration(any(), any(), any()))
            .thenReturn(Duration.ZERO);

        List<Task> result = calculationService.calculateCriticalPath(project);

        assertThat(result).hasSize(2);
        assertThat(result).containsExactly(task1, task2);
    }

    @Test
    void getBlockedTasks_TaskWithCompletedPredecessor_NotBlocked() {
        task1.setStatus(Status.COMPLETED);
        task2.setStatus(Status.NOT_STARTED);
        
        Dependency dependency = new Dependency();
        dependency.setPredecessorTask(task1);
        dependency.setSuccessorTask(task2);
        dependency.setDependencyType(DependencyType.FS);
        
        project.setActivities(Arrays.asList(activity1, activity2));
        activity1.setTasks(Arrays.asList(task1));
        activity2.setTasks(Arrays.asList(task2));
        
        when(dependencyRepository.findBySuccessorTask(task2)).thenReturn(Arrays.asList(dependency));

        List<Task> result = calculationService.getBlockedTasks(project);

        assertThat(result).isEmpty();
    }

    @Test
    void getBlockedTasks_TaskWithIncompletePredecessor_IsBlocked() {
        task1.setStatus(Status.IN_PROGRESS);
        task2.setStatus(Status.NOT_STARTED);
        
        Dependency dependency = new Dependency();
        dependency.setPredecessorTask(task1);
        dependency.setSuccessorTask(task2);
        dependency.setDependencyType(DependencyType.FS);
        
        project.setActivities(Arrays.asList(activity1, activity2));
        activity1.setTasks(Arrays.asList(task1));
        activity2.setTasks(Arrays.asList(task2));
        
        when(dependencyRepository.findBySuccessorTask(task2)).thenReturn(Arrays.asList(dependency));

        List<Task> result = calculationService.getBlockedTasks(project);

        assertThat(result).containsExactly(task2);
    }

    @Test
    void getBlockedTasks_SSRelationshipWithStartedPredecessor_NotBlocked() {
        task1.setStatus(Status.IN_PROGRESS);
        task2.setStatus(Status.NOT_STARTED);
        
        Dependency dependency = new Dependency();
        dependency.setPredecessorTask(task1);
        dependency.setSuccessorTask(task2);
        dependency.setDependencyType(DependencyType.SS);
        
        project.setActivities(Arrays.asList(activity1, activity2));
        activity1.setTasks(Arrays.asList(task1));
        activity2.setTasks(Arrays.asList(task2));
        
        when(dependencyRepository.findBySuccessorTask(task2)).thenReturn(Arrays.asList(dependency));

        List<Task> result = calculationService.getBlockedTasks(project);

        assertThat(result).isEmpty();
    }
}