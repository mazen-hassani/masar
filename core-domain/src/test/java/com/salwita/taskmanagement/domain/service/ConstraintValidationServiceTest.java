package com.salwita.taskmanagement.domain.service;

import com.salwita.taskmanagement.domain.entity.*;
import com.salwita.taskmanagement.domain.enums.DependencyType;
import com.salwita.taskmanagement.domain.enums.Role;
import com.salwita.taskmanagement.domain.model.*;
import com.salwita.taskmanagement.domain.repository.TaskRepository;
import com.salwita.taskmanagement.domain.repository.ActivityRepository;
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
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ConstraintValidationServiceTest {
    
    @Mock
    private DateConstraintCalculator constraintCalculator;
    
    @Mock
    private TaskRepository taskRepository;
    
    @Mock
    private ActivityRepository activityRepository;
    
    @Mock
    private DependencyRepository dependencyRepository;
    
    
    @Mock
    private WorkingTimeCalculator workingTimeCalculator;
    
    private ConstraintValidationService validationService;
    
    private Organisation organisation;
    private User user;
    private Project project;
    private Activity activity;
    private Task task;
    private WorkingCalendar workingCalendar;
    
    @BeforeEach
    void setUp() {
        validationService = new ConstraintValidationService(
            constraintCalculator,
            taskRepository,
            activityRepository,
            dependencyRepository,
            workingTimeCalculator
        );
        
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
        
        activity = new Activity("Test Activity", "Description", project);
        activity.setId(1L);
        activity.setStartDate(LocalDateTime.of(2024, 1, 5, 9, 0));
        activity.setEndDate(LocalDateTime.of(2024, 1, 10, 17, 0));
        
        task = new Task("Test Task", "Task description", activity);
        task.setId(1L);
        task.setStartDate(LocalDateTime.of(2024, 1, 5, 9, 0));
        task.setEndDate(LocalDateTime.of(2024, 1, 7, 17, 0));
    }
    
    @Test
    void validateTaskDateChange_ValidChange_ReturnsSuccess() {
        // Given
        LocalDateTime newStart = LocalDateTime.of(2024, 1, 6, 9, 0);
        LocalDateTime newEnd = LocalDateTime.of(2024, 1, 8, 17, 0);
        TaskDateChange change = new TaskDateChange(task.getId(), newStart, newEnd);
        
        DateConstraints constraints = createValidConstraints();
        
        when(taskRepository.findById(task.getId())).thenReturn(Optional.of(task));
        when(constraintCalculator.calculateTaskConstraints(task)).thenReturn(constraints);
        when(dependencyRepository.findByPredecessorItem(task)).thenReturn(Collections.emptyList());
        
        // When
        EditValidationResult result = validationService.validateTaskDateChange(change);
        
        // Then
        assertThat(result).isNotNull();
        assertThat(result.isCanProceed()).isTrue();
        assertThat(result.getStatus()).isEqualTo(EditValidationResult.ValidationStatus.VALID);
        assertThat(result.hasErrors()).isFalse();
        
        verify(constraintCalculator).calculateTaskConstraints(task);
    }
    
    @Test
    void validateTaskDateChange_InvalidTaskId_ReturnsError() {
        // Given
        TaskDateChange change = new TaskDateChange();
        change.setTaskId(999L);
        change.setProposedStartDate(LocalDateTime.of(2024, 1, 6, 9, 0));
        change.setProposedEndDate(LocalDateTime.of(2024, 1, 8, 17, 0));
        
        when(taskRepository.findById(999L)).thenReturn(Optional.empty());
        
        // When
        EditValidationResult result = validationService.validateTaskDateChange(change);
        
        // Then
        assertThat(result).isNotNull();
        assertThat(result.isCanProceed()).isFalse();
        assertThat(result.getStatus()).isEqualTo(EditValidationResult.ValidationStatus.ERROR);
        assertThat(result.getErrors()).contains("Task not found: 999");
    }
    
    @Test
    void validateTaskDateChange_StartAfterEnd_ReturnsError() {
        // Given
        LocalDateTime newStart = LocalDateTime.of(2024, 1, 8, 9, 0);
        LocalDateTime newEnd = LocalDateTime.of(2024, 1, 6, 17, 0); // End before start
        TaskDateChange change = new TaskDateChange(task.getId(), newStart, newEnd);
        
        when(taskRepository.findById(task.getId())).thenReturn(Optional.of(task));
        
        // When
        EditValidationResult result = validationService.validateTaskDateChange(change);
        
        // Then
        assertThat(result).isNotNull();
        assertThat(result.isCanProceed()).isFalse();
        assertThat(result.getStatus()).isEqualTo(EditValidationResult.ValidationStatus.ERROR);
        assertThat(result.getErrors()).contains("Start date cannot be after end date");
    }
    
    @Test
    void validateTaskDateChange_ViolatesConstraints_ReturnsErrorWithSuggestions() {
        // Given
        LocalDateTime newStart = LocalDateTime.of(2024, 1, 1, 9, 0); // Too early
        LocalDateTime newEnd = LocalDateTime.of(2024, 1, 3, 17, 0);
        TaskDateChange change = new TaskDateChange(task.getId(), newStart, newEnd);
        
        DateConstraints constraints = createConstraintsWithEarlyLimit();
        
        when(taskRepository.findById(task.getId())).thenReturn(Optional.of(task));
        when(constraintCalculator.calculateTaskConstraints(task)).thenReturn(constraints);
        
        // When
        EditValidationResult result = validationService.validateTaskDateChange(change);
        
        // Then
        assertThat(result).isNotNull();
        assertThat(result.isCanProceed()).isFalse();
        assertThat(result.getStatus()).isEqualTo(EditValidationResult.ValidationStatus.ERROR);
        assertThat(result.getSuggestedStartDate()).isNotNull();
        assertThat(result.getSuggestedEndDate()).isNotNull();
    }
    
    @Test
    void validateTaskDateChange_WithDownstreamImpact_ReturnsWarning() {
        // Given
        LocalDateTime newStart = LocalDateTime.of(2024, 1, 6, 9, 0);
        LocalDateTime newEnd = LocalDateTime.of(2024, 1, 8, 17, 0);
        TaskDateChange change = new TaskDateChange(task.getId(), newStart, newEnd);
        
        DateConstraints constraints = createValidConstraints();
        Dependency dependency = createDependency();
        
        when(taskRepository.findById(task.getId())).thenReturn(Optional.of(task));
        when(constraintCalculator.calculateTaskConstraints(task)).thenReturn(constraints);
        when(dependencyRepository.findByPredecessorItem(task)).thenReturn(Arrays.asList(dependency));
        
        // When
        EditValidationResult result = validationService.validateTaskDateChange(change);
        
        // Then
        assertThat(result).isNotNull();
        assertThat(result.isCanProceed()).isTrue();
        assertThat(result.getStatus()).isEqualTo(EditValidationResult.ValidationStatus.WARNING);
        assertThat(result.getDownstreamImpact()).isNotNull();
        assertThat(result.getDownstreamImpact().hasImpact()).isTrue();
    }
    
    @Test
    void validateActivityDateChange_ValidChange_ReturnsSuccess() {
        // Given
        LocalDateTime newStart = LocalDateTime.of(2024, 1, 6, 9, 0);
        LocalDateTime newEnd = LocalDateTime.of(2024, 1, 12, 17, 0);
        ActivityDateChange change = new ActivityDateChange(activity.getId(), newStart, newEnd);
        
        DateConstraints constraints = createValidConstraints();
        
        when(activityRepository.findById(activity.getId())).thenReturn(Optional.of(activity));
        when(constraintCalculator.calculateActivityConstraints(activity)).thenReturn(constraints);
        when(dependencyRepository.findByPredecessorItem(activity)).thenReturn(Collections.emptyList());
        
        // When
        EditValidationResult result = validationService.validateActivityDateChange(change);
        
        // Then
        assertThat(result).isNotNull();
        assertThat(result.isCanProceed()).isTrue();
        assertThat(result.getStatus()).isEqualTo(EditValidationResult.ValidationStatus.VALID);
        assertThat(result.hasErrors()).isFalse();
        
        verify(constraintCalculator).calculateActivityConstraints(activity);
    }
    
    @Test
    void validateActivityDateChange_ConflictsWithChildTasks_ReturnsWarning() {
        // Given
        LocalDateTime newStart = LocalDateTime.of(2024, 1, 7, 9, 0); // After task start
        LocalDateTime newEnd = LocalDateTime.of(2024, 1, 12, 17, 0);
        ActivityDateChange change = new ActivityDateChange(activity.getId(), newStart, newEnd);
        change.setPropagateToTasks(true);
        
        DateConstraints constraints = createValidConstraints();
        activity.setTasks(Arrays.asList(task)); // Add child task
        
        when(activityRepository.findById(activity.getId())).thenReturn(Optional.of(activity));
        when(constraintCalculator.calculateActivityConstraints(activity)).thenReturn(constraints);
        when(dependencyRepository.findByPredecessorItem(activity)).thenReturn(Collections.emptyList());
        
        // When
        EditValidationResult result = validationService.validateActivityDateChange(change);
        
        // Then
        assertThat(result).isNotNull();
        assertThat(result.isCanProceed()).isTrue();
        assertThat(result.hasWarnings()).isTrue();
        assertThat(result.getWarnings()).anyMatch(w -> w.contains("Child tasks will need to be rescheduled"));
    }
    
    @Test
    void validateActivityDateChange_WithTaskPropagation_IncludesChildTasksInImpact() {
        // Given
        LocalDateTime newStart = LocalDateTime.of(2024, 1, 6, 9, 0);
        LocalDateTime newEnd = LocalDateTime.of(2024, 1, 12, 17, 0);
        ActivityDateChange change = new ActivityDateChange(activity.getId(), newStart, newEnd);
        change.setPropagateToTasks(true);
        
        DateConstraints constraints = createValidConstraints();
        activity.setTasks(Arrays.asList(task));
        
        when(activityRepository.findById(activity.getId())).thenReturn(Optional.of(activity));
        when(constraintCalculator.calculateActivityConstraints(activity)).thenReturn(constraints);
        when(dependencyRepository.findByPredecessorItem(activity)).thenReturn(Collections.emptyList());
        
        // When
        EditValidationResult result = validationService.validateActivityDateChange(change);
        
        // Then
        assertThat(result).isNotNull();
        assertThat(result.getDownstreamImpact()).isNotNull();
        assertThat(result.getDownstreamImpact().getImpactedTasks()).hasSize(1);
        assertThat(result.getDownstreamImpact().getImpactedTasks().get(0).getItemId()).isEqualTo(task.getId());
    }
    
    @Test
    void validateTaskDateChange_NullTaskId_ReturnsError() {
        // Given
        TaskDateChange change = new TaskDateChange();
        change.setTaskId(null);
        
        // When
        EditValidationResult result = validationService.validateTaskDateChange(change);
        
        // Then
        assertThat(result).isNotNull();
        assertThat(result.isCanProceed()).isFalse();
        assertThat(result.getStatus()).isEqualTo(EditValidationResult.ValidationStatus.ERROR);
        assertThat(result.getErrors()).contains("Task ID cannot be null");
    }
    
    @Test
    void validateActivityDateChange_NullActivityId_ReturnsError() {
        // Given
        ActivityDateChange change = new ActivityDateChange();
        change.setActivityId(null);
        
        // When
        EditValidationResult result = validationService.validateActivityDateChange(change);
        
        // Then
        assertThat(result).isNotNull();
        assertThat(result.isCanProceed()).isFalse();
        assertThat(result.getStatus()).isEqualTo(EditValidationResult.ValidationStatus.ERROR);
        assertThat(result.getErrors()).contains("Activity ID cannot be null");
    }
    
    // Helper methods
    
    private DateConstraints createValidConstraints() {
        DateConstraints constraints = new DateConstraints();
        constraints.setTaskId(task.getId());
        constraints.setProjectId(project.getId());
        constraints.setEarliestStartTime(LocalDateTime.of(2024, 1, 2, 9, 0));
        constraints.setLatestEndTime(LocalDateTime.of(2024, 1, 30, 17, 0));
        constraints.setMinimumDuration(Duration.ofDays(1));
        constraints.setFeasible(true);
        return constraints;
    }
    
    private DateConstraints createConstraintsWithEarlyLimit() {
        DateConstraints constraints = new DateConstraints();
        constraints.setTaskId(task.getId());
        constraints.setProjectId(project.getId());
        constraints.setEarliestStartTime(LocalDateTime.of(2024, 1, 5, 9, 0)); // Cannot start before this
        constraints.setLatestEndTime(LocalDateTime.of(2024, 1, 30, 17, 0));
        constraints.setMinimumDuration(Duration.ofDays(1));
        constraints.setFeasible(true);
        return constraints;
    }
    
    private Dependency createDependency() {
        Task dependentTask = new Task("Dependent Task", "Description", activity);
        dependentTask.setId(2L);
        
        return new Dependency(task, dependentTask, DependencyType.FS, 0);
    }
}