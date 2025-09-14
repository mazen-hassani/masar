package com.salwita.taskmanagement.domain.service;

import com.salwita.taskmanagement.domain.entity.*;
import com.salwita.taskmanagement.domain.enums.DependencyType;
import com.salwita.taskmanagement.domain.enums.Role;
import com.salwita.taskmanagement.domain.model.DateConstraints;
import com.salwita.taskmanagement.domain.model.ConstraintReason;
import com.salwita.taskmanagement.domain.repository.DependencyRepository;
import com.salwita.taskmanagement.domain.valueobject.WorkingCalendar;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.time.Duration;
import java.time.ZoneId;
import java.util.Arrays;
import java.util.Collections;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DateConstraintCalculatorTest {
    
    @Mock
    private DependencyRepository dependencyRepository;
    
    @Mock
    private WorkingTimeCalculator workingTimeCalculator;
    
    private DateConstraintCalculator constraintCalculator;
    
    private Organisation organisation;
    private User user;
    private Project project;
    private Activity activity1;
    private Activity activity2;
    private Task task1;
    private Task task2;
    private Task task3;
    private WorkingCalendar workingCalendar;
    
    @BeforeEach
    void setUp() {
        constraintCalculator = new DateConstraintCalculator(dependencyRepository, workingTimeCalculator);
        
        // Setup test entities
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
        
        task1 = new Task("Task 1", "Description 1", activity1);
        task1.setId(1L);
        task1.setDuration(Duration.ofDays(2));
        
        task2 = new Task("Task 2", "Description 2", activity1);
        task2.setId(2L);
        task2.setDuration(Duration.ofDays(3));
        
        task3 = new Task("Task 3", "Description 3", activity2);
        task3.setId(3L);
        task3.setDuration(Duration.ofDays(1));
    }
    
    @Test
    void calculateTaskConstraints_NoDependencies_ReturnsProjectBoundaries() {
        // Given
        when(dependencyRepository.findBySuccessorItem(task1)).thenReturn(Collections.emptyList());
        when(dependencyRepository.findByPredecessorItem(task1)).thenReturn(Collections.emptyList());
        
        // When
        DateConstraints constraints = constraintCalculator.calculateTaskConstraints(task1);
        
        // Then
        assertThat(constraints).isNotNull();
        assertThat(constraints.getTaskId()).isEqualTo(task1.getId());
        assertThat(constraints.getProjectId()).isEqualTo(project.getId());
        assertThat(constraints.isFeasible()).isTrue();
        assertThat(constraints.getEarliestStartTime()).isEqualTo(project.getStartDate());
        assertThat(constraints.getLatestEndTime()).isEqualTo(project.getEndDate());
        assertThat(constraints.getMinimumDuration()).isEqualTo(task1.getDuration());
        
        // Should have project boundary constraint reasons
        assertThat(constraints.getConstraintReasons()).isNotEmpty();
        assertThat(constraints.getConstraintReasons()).anyMatch(r -> 
            r.getConstraintType() == ConstraintReason.ConstraintType.PROJECT_BOUNDARY_CONSTRAINT);
    }
    
    @Test
    void calculateTaskConstraints_WithPredecessorDependency_AppliesEarliestStartConstraint() {
        // Given
        task2.setStartDate(LocalDateTime.of(2024, 1, 5, 9, 0));
        task2.setEndDate(LocalDateTime.of(2024, 1, 7, 17, 0));
        
        Dependency dependency = new Dependency(task2, task1, DependencyType.FS, 0);
        when(dependencyRepository.findBySuccessorItem(task1)).thenReturn(Arrays.asList(dependency));
        when(dependencyRepository.findByPredecessorItem(task1)).thenReturn(Collections.emptyList());
        
        when(workingTimeCalculator.getNextWorkingTime(eq(task2.getEndDate()), any()))
            .thenReturn(task2.getEndDate());
        
        // When
        DateConstraints constraints = constraintCalculator.calculateTaskConstraints(task1);
        
        // Then
        assertThat(constraints).isNotNull();
        assertThat(constraints.isFeasible()).isTrue();
        assertThat(constraints.getEarliestStartTime()).isEqualTo(task2.getEndDate());
        
        // Should have dependency constraint reason
        assertThat(constraints.getConstraintReasons()).anyMatch(r -> 
            r.getConstraintType() == ConstraintReason.ConstraintType.DEPENDENCY_CONSTRAINT &&
            r.getDependencyType() == DependencyType.FS);
    }
    
    @Test
    void calculateTaskConstraints_WithSuccessorDependency_AppliesLatestEndConstraint() {
        // Given
        task2.setStartDate(LocalDateTime.of(2024, 1, 10, 9, 0));
        task2.setEndDate(LocalDateTime.of(2024, 1, 12, 17, 0));
        
        Dependency dependency = new Dependency(task1, task2, DependencyType.FS, 0);
        when(dependencyRepository.findBySuccessorItem(task1)).thenReturn(Collections.emptyList());
        when(dependencyRepository.findByPredecessorItem(task1)).thenReturn(Arrays.asList(dependency));
        
        when(workingTimeCalculator.subtractWorkingTime(eq(task2.getStartDate()), eq(task1.getDuration()), any()))
            .thenReturn(LocalDateTime.of(2024, 1, 8, 9, 0));
        
        // When
        DateConstraints constraints = constraintCalculator.calculateTaskConstraints(task1);
        
        // Then
        assertThat(constraints).isNotNull();
        assertThat(constraints.isFeasible()).isTrue();
        assertThat(constraints.getLatestEndTime()).isEqualTo(task2.getStartDate());
        
        // Should have dependency constraint reason
        assertThat(constraints.getConstraintReasons()).anyMatch(r -> 
            r.getConstraintType() == ConstraintReason.ConstraintType.DEPENDENCY_CONSTRAINT &&
            r.getDependencyType() == DependencyType.FS);
    }
    
    @Test
    void calculateTaskConstraints_WithLagDependency_AppliesLagCorrectly() {
        // Given
        task2.setStartDate(LocalDateTime.of(2024, 1, 5, 9, 0));
        task2.setEndDate(LocalDateTime.of(2024, 1, 7, 17, 0));
        
        int lagDays = 2;
        Dependency dependency = new Dependency(task2, task1, DependencyType.FS, lagDays * 24 * 60); // 2 days lag in minutes
        when(dependencyRepository.findBySuccessorItem(task1)).thenReturn(Arrays.asList(dependency));
        when(dependencyRepository.findByPredecessorItem(task1)).thenReturn(Collections.emptyList());
        
        LocalDateTime expectedStart = task2.getEndDate().plusDays(lagDays);
        when(workingTimeCalculator.addWorkingTime(eq(task2.getEndDate()), eq(Duration.ofDays(lagDays)), any()))
            .thenReturn(expectedStart);
        when(workingTimeCalculator.getNextWorkingTime(eq(expectedStart), any()))
            .thenReturn(expectedStart);
        
        // When
        DateConstraints constraints = constraintCalculator.calculateTaskConstraints(task1);
        
        // Then
        assertThat(constraints).isNotNull();
        assertThat(constraints.isFeasible()).isTrue();
        assertThat(constraints.getEarliestStartTime()).isEqualTo(expectedStart);
        
        verify(workingTimeCalculator).addWorkingTime(eq(task2.getEndDate()), eq(Duration.ofDays(lagDays)), any());
    }
    
    @Test
    void calculateTaskConstraints_StartToStartDependency_CalculatesCorrectly() {
        // Given
        task2.setStartDate(LocalDateTime.of(2024, 1, 5, 9, 0));
        task2.setEndDate(LocalDateTime.of(2024, 1, 7, 17, 0));
        
        Dependency dependency = new Dependency(task2, task1, DependencyType.SS, 0);
        when(dependencyRepository.findBySuccessorItem(task1)).thenReturn(Arrays.asList(dependency));
        when(dependencyRepository.findByPredecessorItem(task1)).thenReturn(Collections.emptyList());
        
        when(workingTimeCalculator.getNextWorkingTime(eq(task2.getStartDate()), any()))
            .thenReturn(task2.getStartDate());
        
        // When
        DateConstraints constraints = constraintCalculator.calculateTaskConstraints(task1);
        
        // Then
        assertThat(constraints).isNotNull();
        assertThat(constraints.isFeasible()).isTrue();
        assertThat(constraints.getEarliestStartTime()).isEqualTo(task2.getStartDate());
        
        // Should have SS dependency constraint
        assertThat(constraints.getConstraintReasons()).anyMatch(r -> 
            r.getDependencyType() == DependencyType.SS);
    }
    
    @Test
    void calculateTaskConstraints_ConflictingDependencies_MarksInfeasible() {
        // Given
        Task earlyPredecessor = new Task("Early Task", "Description", activity1);
        earlyPredecessor.setId(10L);
        earlyPredecessor.setStartDate(LocalDateTime.of(2024, 1, 20, 9, 0));
        earlyPredecessor.setEndDate(LocalDateTime.of(2024, 1, 22, 17, 0));
        
        Task lateSuccessor = new Task("Late Task", "Description", activity1);
        lateSuccessor.setId(11L);
        lateSuccessor.setStartDate(LocalDateTime.of(2024, 1, 15, 9, 0));
        lateSuccessor.setEndDate(LocalDateTime.of(2024, 1, 17, 17, 0));
        lateSuccessor.setDuration(Duration.ofDays(2));
        
        Dependency pred = new Dependency(earlyPredecessor, task1, DependencyType.FS, 0);
        Dependency succ = new Dependency(task1, lateSuccessor, DependencyType.FS, 0);
        
        when(dependencyRepository.findBySuccessorItem(task1)).thenReturn(Arrays.asList(pred));
        when(dependencyRepository.findByPredecessorItem(task1)).thenReturn(Arrays.asList(succ));
        
        when(workingTimeCalculator.getNextWorkingTime(any(), any()))
            .thenAnswer(invocation -> invocation.getArgument(0));
        when(workingTimeCalculator.subtractWorkingTime(eq(lateSuccessor.getStartDate()), eq(task1.getDuration()), any()))
            .thenReturn(LocalDateTime.of(2024, 1, 13, 9, 0)); // Earlier than predecessor end
        
        // When
        DateConstraints constraints = constraintCalculator.calculateTaskConstraints(task1);
        
        // Then
        assertThat(constraints).isNotNull();
        assertThat(constraints.isFeasible()).isFalse();
        assertThat(constraints.getConstraintViolations()).isNotEmpty();
        assertThat(constraints.getConstraintViolations()).anyMatch(v -> 
            v.contains("conflicting") || v.contains("impossible"));
    }
    
    @Test
    void calculateActivityConstraints_WithChildTasks_CalculatesFromTaskBoundaries() {
        // Given
        task1.setStartDate(LocalDateTime.of(2024, 1, 5, 9, 0));
        task1.setEndDate(LocalDateTime.of(2024, 1, 7, 17, 0));
        task2.setStartDate(LocalDateTime.of(2024, 1, 8, 9, 0));
        task2.setEndDate(LocalDateTime.of(2024, 1, 10, 17, 0));
        
        activity1.setTasks(Arrays.asList(task1, task2));
        
        when(dependencyRepository.findBySuccessorItem(activity1)).thenReturn(Collections.emptyList());
        when(dependencyRepository.findByPredecessorItem(activity1)).thenReturn(Collections.emptyList());
        
        // When
        DateConstraints constraints = constraintCalculator.calculateActivityConstraints(activity1);
        
        // Then
        assertThat(constraints).isNotNull();
        assertThat(constraints.getActivityId()).isEqualTo(activity1.getId());
        assertThat(constraints.isFeasible()).isTrue();
        
        // Activity should span from earliest task start to latest task end
        assertThat(constraints.getEarliestStartTime()).isEqualTo(task1.getStartDate());
        assertThat(constraints.getLatestEndTime()).isEqualTo(task2.getEndDate());
        
        // Should have duration constraint based on child tasks
        Duration expectedMinDuration = Duration.between(task1.getStartDate(), task2.getEndDate());
        assertThat(constraints.getMinimumDuration()).isEqualTo(expectedMinDuration);
    }
    
    @Test
    void calculateActivityConstraints_NoDependenciesNoTasks_ReturnsProjectBoundaries() {
        // Given
        activity1.setTasks(Collections.emptyList());
        
        when(dependencyRepository.findBySuccessorItem(activity1)).thenReturn(Collections.emptyList());
        when(dependencyRepository.findByPredecessorItem(activity1)).thenReturn(Collections.emptyList());
        
        // When
        DateConstraints constraints = constraintCalculator.calculateActivityConstraints(activity1);
        
        // Then
        assertThat(constraints).isNotNull();
        assertThat(constraints.getActivityId()).isEqualTo(activity1.getId());
        assertThat(constraints.isFeasible()).isTrue();
        assertThat(constraints.getEarliestStartTime()).isEqualTo(project.getStartDate());
        assertThat(constraints.getLatestEndTime()).isEqualTo(project.getEndDate());
    }
    
    @Test
    void calculateTaskConstraints_WithCircularReference_HandlesGracefully() {
        // Given - circular dependency detection should be handled at higher level
        // This test ensures the method doesn't get stuck in infinite recursion
        Dependency selfRef = new Dependency(task1, task1, DependencyType.FS, 0);
        when(dependencyRepository.findBySuccessorItem(task1)).thenReturn(Arrays.asList(selfRef));
        when(dependencyRepository.findByPredecessorItem(task1)).thenReturn(Arrays.asList(selfRef));
        
        // When & Then - should not hang or throw exception
        DateConstraints constraints = constraintCalculator.calculateTaskConstraints(task1);
        
        assertThat(constraints).isNotNull();
        // The method should handle the circular reference by tracking visited items
    }
    
    @Test
    void calculateTaskConstraints_CachesResults() {
        // Given
        when(dependencyRepository.findBySuccessorItem(task1)).thenReturn(Collections.emptyList());
        when(dependencyRepository.findByPredecessorItem(task1)).thenReturn(Collections.emptyList());
        
        // When - call twice
        DateConstraints constraints1 = constraintCalculator.calculateTaskConstraints(task1);
        DateConstraints constraints2 = constraintCalculator.calculateTaskConstraints(task1);
        
        // Then - should return same result (caching behavior)
        assertThat(constraints1).isNotNull();
        assertThat(constraints2).isNotNull();
        assertThat(constraints1.getTaskId()).isEqualTo(constraints2.getTaskId());
        
        // Repository should only be called once due to caching
        verify(dependencyRepository, times(1)).findBySuccessorItem(task1);
        verify(dependencyRepository, times(1)).findByPredecessorItem(task1);
    }
}