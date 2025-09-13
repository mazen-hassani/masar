package com.salwita.taskmanagement.domain.service;

import com.salwita.taskmanagement.domain.entity.*;
import com.salwita.taskmanagement.domain.enums.Role;
import com.salwita.taskmanagement.domain.enums.Status;
import com.salwita.taskmanagement.domain.enums.TrackingStatus;
import com.salwita.taskmanagement.domain.repository.TaskRepository;
import com.salwita.taskmanagement.domain.valueobject.WorkingCalendar;
import com.salwita.taskmanagement.domain.service.WorkingTimeCalculator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Arrays;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TaskStatusServiceTest {

    @Mock
    private TaskRepository taskRepository;
    
    @Mock
    private WorkingTimeCalculator workingTimeCalculator;
    
    @Mock
    private ActivityStatusService activityStatusService;

    private TaskStatusService taskStatusService;
    private Organisation organisation;
    private User projectManager;
    private User teamMember;
    private Project project;
    private Activity activity;
    private Task task;

    @BeforeEach
    void setUp() {
        taskStatusService = new TaskStatusService(taskRepository, workingTimeCalculator, activityStatusService);
        
        // Set up test data
        organisation = new Organisation("Test Org", "Test Org Description");
        organisation.setAtRiskThresholdPercentage(10);
                
        projectManager = new User("pm@test.com", "Project", "Manager", "hashedPassword", Role.PM, organisation);
                
        teamMember = new User("member@test.com", "Team", "Member", "hashedPassword", Role.TEAM_MEMBER, organisation);
                
        project = new Project("Test Project", "Test Project Description", organisation);
                
        activity = new Activity("Test Activity", "Description", project);
        task = new Task("Test Task", "Task Description", activity, teamMember);
        task.setStartDate(LocalDateTime.now().minusDays(5));
        task.setEndDate(LocalDateTime.now().plusDays(5));
        task.setPercentageComplete(50);
    }

    @Test
    void changeStatus_ValidTransition_ShouldUpdateStatus() {
        when(taskRepository.save(any(Task.class))).thenReturn(task);
        
        taskStatusService.changeStatus(task, Status.IN_PROGRESS, teamMember);
        
        assertEquals(Status.IN_PROGRESS, task.getStatus());
        assertNotNull(task.getActualStartDate());
        verify(taskRepository).save(task);
        verify(activityStatusService).recalculateStatusFromTasks(activity);
    }

    @Test
    void changeStatus_InvalidTransition_ShouldThrowException() {
        IllegalStateException exception = assertThrows(IllegalStateException.class,
                () -> taskStatusService.changeStatus(task, Status.VERIFIED, teamMember));
        
        assertTrue(exception.getMessage().contains("Cannot transition from NOT_STARTED to VERIFIED"));
    }

    @Test
    void changeStatus_ToCompleted_ShouldSetActualEndDateAndFullPercentage() {
        task.setStatus(Status.IN_PROGRESS);
        when(taskRepository.save(any(Task.class))).thenReturn(task);
        
        taskStatusService.changeStatus(task, Status.COMPLETED, teamMember);
        
        assertEquals(Status.COMPLETED, task.getStatus());
        assertEquals(100, task.getPercentageComplete());
        assertNotNull(task.getActualEndDate());
        verify(taskRepository).save(task);
    }

    @Test
    void verifyTask_ValidVerification_ShouldUpdateStatus() {
        task.setStatus(Status.COMPLETED);
        when(taskRepository.save(any(Task.class))).thenReturn(task);
        
        taskStatusService.verifyTask(task, projectManager);
        
        assertEquals(Status.VERIFIED, task.getStatus());
        assertNotNull(task.getVerifiedAt());
        assertEquals(projectManager, task.getVerifiedByUser());
        assertNull(task.getTrackingStatus());
        verify(taskRepository).save(task);
    }

    @Test
    void verifyTask_NonProjectManager_ShouldThrowSecurityException() {
        task.setStatus(Status.COMPLETED);
        
        SecurityException exception = assertThrows(SecurityException.class,
                () -> taskStatusService.verifyTask(task, teamMember));
        
        assertEquals("Only Project Managers can verify tasks", exception.getMessage());
    }

    @Test
    void verifyTask_NotCompleted_ShouldThrowException() {
        task.setStatus(Status.IN_PROGRESS);
        
        IllegalStateException exception = assertThrows(IllegalStateException.class,
                () -> taskStatusService.verifyTask(task, projectManager));
        
        assertEquals("Can only verify completed tasks", exception.getMessage());
    }

    @Test
    void updatePercentageComplete_ValidUpdate_ShouldUpdatePercentage() {
        task.setStatus(Status.IN_PROGRESS);
        when(taskRepository.save(any(Task.class))).thenReturn(task);
        
        taskStatusService.updatePercentageComplete(task, 75, teamMember);
        
        assertEquals(75, task.getPercentageComplete());
        verify(taskRepository).save(task);
        verify(activityStatusService).recalculatePercentageFromTasks(activity);
    }

    @Test
    void updatePercentageComplete_NotInProgress_ShouldThrowException() {
        task.setStatus(Status.NOT_STARTED);
        
        IllegalStateException exception = assertThrows(IllegalStateException.class,
                () -> taskStatusService.updatePercentageComplete(task, 50, teamMember));
        
        assertEquals("Can only update percentage when task is In Progress", exception.getMessage());
    }

    @Test
    void updatePercentageComplete_InvalidPercentage_ShouldThrowException() {
        task.setStatus(Status.IN_PROGRESS);
        
        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class,
                () -> taskStatusService.updatePercentageComplete(task, 150, teamMember));
        
        assertEquals("Percentage must be between 0 and 100", exception.getMessage());
    }

    @Test
    void calculateAndSetTrackingStatus_OnTrack_ShouldSetOnTrack() {
        task.setStatus(Status.IN_PROGRESS);
        task.setPercentageComplete(60);
        
        // Mock 50% time elapsed, 60% progress = on track
        when(workingTimeCalculator.calculateWorkingDuration(any(), any(), any()))
                .thenReturn(java.time.Duration.ofHours(40)) // total
                .thenReturn(java.time.Duration.ofHours(20)); // elapsed
        
        taskStatusService.calculateAndSetTrackingStatus(task);
        
        assertEquals(TrackingStatus.ON_TRACK, task.getTrackingStatus());
    }

    @Test
    void calculateAndSetTrackingStatus_AtRisk_ShouldSetAtRisk() {
        task.setStatus(Status.IN_PROGRESS);
        task.setPercentageComplete(35);
        
        // Mock 50% time elapsed, 35% progress = at risk (below 40% threshold)
        when(workingTimeCalculator.calculateWorkingDuration(any(), any(), any()))
                .thenReturn(java.time.Duration.ofHours(40)) // total
                .thenReturn(java.time.Duration.ofHours(20)); // elapsed
        
        taskStatusService.calculateAndSetTrackingStatus(task);
        
        assertEquals(TrackingStatus.AT_RISK, task.getTrackingStatus());
    }

    @Test
    void calculateAndSetTrackingStatus_OffTrack_ShouldSetOffTrack() {
        task.setStatus(Status.IN_PROGRESS);
        task.setPercentageComplete(20);
        
        // Mock 50% time elapsed, 20% progress = off track (below 30% threshold)
        when(workingTimeCalculator.calculateWorkingDuration(any(), any(), any()))
                .thenReturn(java.time.Duration.ofHours(40)) // total
                .thenReturn(java.time.Duration.ofHours(20)); // elapsed
        
        taskStatusService.calculateAndSetTrackingStatus(task);
        
        assertEquals(TrackingStatus.OFF_TRACK, task.getTrackingStatus());
    }

    @Test
    void calculateAndSetTrackingStatus_NotInProgress_ShouldClearTrackingStatus() {
        task.setStatus(Status.COMPLETED);
        task.setTrackingStatus(TrackingStatus.AT_RISK);
        
        taskStatusService.calculateAndSetTrackingStatus(task);
        
        assertNull(task.getTrackingStatus());
    }

    @Test
    void recalculateTrackingStatusForInProgressTasks_ShouldProcessAllInProgressTasks() {
        Task task1 = new Task("Task 1", "Desc", activity, teamMember);
        task1.setStatus(Status.IN_PROGRESS);
        Task task2 = new Task("Task 2", "Desc", activity, teamMember);
        task2.setStatus(Status.IN_PROGRESS);
        
        when(taskRepository.findByStatus(Status.IN_PROGRESS)).thenReturn(Arrays.asList(task1, task2));
        
        taskStatusService.recalculateTrackingStatusForInProgressTasks();
        
        verify(taskRepository).findByStatus(Status.IN_PROGRESS);
        // Verify that tracking status calculation was called for both tasks
        assertEquals(TrackingStatus.ON_TRACK, task1.getTrackingStatus()); // Default when no dates
        assertEquals(TrackingStatus.ON_TRACK, task2.getTrackingStatus()); // Default when no dates
    }
}