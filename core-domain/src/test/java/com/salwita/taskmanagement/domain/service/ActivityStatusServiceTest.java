package com.salwita.taskmanagement.domain.service;

import com.salwita.taskmanagement.domain.entity.*;
import com.salwita.taskmanagement.domain.enums.Role;
import com.salwita.taskmanagement.domain.enums.Status;
import com.salwita.taskmanagement.domain.enums.TrackingStatus;
import com.salwita.taskmanagement.domain.repository.ActivityRepository;
import com.salwita.taskmanagement.domain.service.WorkingTimeCalculator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ActivityStatusServiceTest {

    @Mock
    private ActivityRepository activityRepository;
    
    @Mock
    private WorkingTimeCalculator workingTimeCalculator;

    private ActivityStatusService activityStatusService;
    private Organisation organisation;
    private User projectManager;
    private User teamMember;
    private Project project;
    private Activity activity;

    @BeforeEach
    void setUp() {
        activityStatusService = new ActivityStatusService(activityRepository, workingTimeCalculator);
        
        // Set up test data
        organisation = new Organisation("Test Org", "Test Org Description");
        organisation.setAtRiskThresholdPercentage(10);
                
        projectManager = new User("pm@test.com", "Project", "Manager", "hashedPassword", Role.PM, organisation);
                
        teamMember = new User("member@test.com", "Team", "Member", "hashedPassword", Role.TEAM_MEMBER, organisation);
                
        project = new Project("Test Project", "Test Project Description", organisation);
                
        activity = new Activity("Test Activity", "Description", project);
        activity.setStartDate(LocalDateTime.now().minusDays(5));
        activity.setEndDate(LocalDateTime.now().plusDays(5));
        activity.setPercentageComplete(50);
    }

    @Test
    void changeStatus_ValidTransition_ShouldUpdateStatus() {
        when(activityRepository.save(any(Activity.class))).thenReturn(activity);
        
        activityStatusService.changeStatus(activity, Status.IN_PROGRESS, teamMember);
        
        assertEquals(Status.IN_PROGRESS, activity.getStatus());
        assertNotNull(activity.getActualStartDate());
        verify(activityRepository).save(activity);
    }

    @Test
    void changeStatus_InvalidTransition_ShouldThrowException() {
        IllegalStateException exception = assertThrows(IllegalStateException.class,
                () -> activityStatusService.changeStatus(activity, Status.VERIFIED, teamMember));
        
        assertTrue(exception.getMessage().contains("Cannot transition from NOT_STARTED to VERIFIED"));
    }

    @Test
    void changeStatus_ToCompleted_ShouldSetActualEndDateAndFullPercentage() {
        activity.setStatus(Status.IN_PROGRESS);
        when(activityRepository.save(any(Activity.class))).thenReturn(activity);
        
        activityStatusService.changeStatus(activity, Status.COMPLETED, teamMember);
        
        assertEquals(Status.COMPLETED, activity.getStatus());
        assertEquals(100, activity.getPercentageComplete());
        assertNotNull(activity.getActualEndDate());
        verify(activityRepository).save(activity);
    }

    @Test
    void verifyActivity_ValidVerification_ShouldUpdateStatus() {
        activity.setStatus(Status.COMPLETED);
        // Add verified tasks to the activity
        Task task1 = new Task("Task 1", "Desc", activity, teamMember);
        task1.setStatus(Status.VERIFIED);
        Task task2 = new Task("Task 2", "Desc", activity, teamMember);
        task2.setStatus(Status.VERIFIED);
        activity.getTasks().add(task1);
        activity.getTasks().add(task2);
        
        when(activityRepository.save(any(Activity.class))).thenReturn(activity);
        
        activityStatusService.verifyActivity(activity, projectManager, new HashMap<>());
        
        assertEquals(Status.VERIFIED, activity.getStatus());
        assertNotNull(activity.getVerifiedAt());
        assertEquals(projectManager, activity.getVerifiedByUser());
        assertNull(activity.getTrackingStatus());
        verify(activityRepository).save(activity);
    }

    @Test
    void verifyActivity_NonProjectManager_ShouldThrowSecurityException() {
        activity.setStatus(Status.COMPLETED);
        
        SecurityException exception = assertThrows(SecurityException.class,
                () -> activityStatusService.verifyActivity(activity, teamMember, new HashMap<>()));
        
        assertEquals("Only Project Managers can verify activities", exception.getMessage());
    }

    @Test
    void verifyActivity_NotCompleted_ShouldThrowException() {
        activity.setStatus(Status.IN_PROGRESS);
        
        IllegalStateException exception = assertThrows(IllegalStateException.class,
                () -> activityStatusService.verifyActivity(activity, projectManager, new HashMap<>()));
        
        assertEquals("Can only verify completed activities", exception.getMessage());
    }

    @Test
    void verifyActivity_WithUnverifiedTasks_ShouldThrowException() {
        activity.setStatus(Status.COMPLETED);
        
        Task task1 = new Task("Task 1", "Desc", activity, teamMember);
        task1.setStatus(Status.VERIFIED);
        Task task2 = new Task("Task 2", "Desc", activity, teamMember);
        task2.setStatus(Status.COMPLETED); // Not verified
        activity.getTasks().add(task1);
        activity.getTasks().add(task2);
        
        IllegalStateException exception = assertThrows(IllegalStateException.class,
                () -> activityStatusService.verifyActivity(activity, projectManager, new HashMap<>()));
        
        assertTrue(exception.getMessage().contains("Cannot verify activity: 1 task(s) are not verified"));
    }

    @Test
    void recalculateStatusFromTasks_AllVerified_ShouldSetVerified() {
        Task task1 = new Task("Task 1", "Desc", activity, teamMember);
        task1.setStatus(Status.VERIFIED);
        Task task2 = new Task("Task 2", "Desc", activity, teamMember);
        task2.setStatus(Status.VERIFIED);
        activity.getTasks().add(task1);
        activity.getTasks().add(task2);
        
        when(activityRepository.save(any(Activity.class))).thenReturn(activity);
        
        activityStatusService.recalculateStatusFromTasks(activity);
        
        assertEquals(Status.VERIFIED, activity.getStatus());
        verify(activityRepository).save(activity);
    }

    @Test
    void recalculateStatusFromTasks_AllCompleted_ShouldSetCompleted() {
        Task task1 = new Task("Task 1", "Desc", activity, teamMember);
        task1.setStatus(Status.COMPLETED);
        Task task2 = new Task("Task 2", "Desc", activity, teamMember);
        task2.setStatus(Status.VERIFIED);
        activity.getTasks().add(task1);
        activity.getTasks().add(task2);
        
        when(activityRepository.save(any(Activity.class))).thenReturn(activity);
        
        activityStatusService.recalculateStatusFromTasks(activity);
        
        assertEquals(Status.COMPLETED, activity.getStatus());
        verify(activityRepository).save(activity);
    }

    @Test
    void recalculateStatusFromTasks_MixedStatus_ShouldSetInProgress() {
        Task task1 = new Task("Task 1", "Desc", activity, teamMember);
        task1.setStatus(Status.IN_PROGRESS);
        Task task2 = new Task("Task 2", "Desc", activity, teamMember);
        task2.setStatus(Status.NOT_STARTED);
        activity.getTasks().add(task1);
        activity.getTasks().add(task2);
        
        when(activityRepository.save(any(Activity.class))).thenReturn(activity);
        
        activityStatusService.recalculateStatusFromTasks(activity);
        
        assertEquals(Status.IN_PROGRESS, activity.getStatus());
        verify(activityRepository).save(activity);
    }

    @Test
    void recalculatePercentageFromTasks_ShouldCalculateAverage() {
        Task task1 = new Task("Task 1", "Desc", activity, teamMember);
        task1.setPercentageComplete(60);
        Task task2 = new Task("Task 2", "Desc", activity, teamMember);
        task2.setPercentageComplete(40);
        activity.getTasks().add(task1);
        activity.getTasks().add(task2);
        
        when(activityRepository.save(any(Activity.class))).thenReturn(activity);
        
        activityStatusService.recalculatePercentageFromTasks(activity);
        
        assertEquals(50, activity.getPercentageComplete()); // (60 + 40) / 2
        verify(activityRepository).save(activity);
    }

    @Test
    void calculateAndSetTrackingStatus_OnTrack_ShouldSetOnTrack() {
        activity.setStatus(Status.IN_PROGRESS);
        activity.setPercentageComplete(60);
        
        // Mock 50% time elapsed, 60% progress = on track
        when(workingTimeCalculator.calculateWorkingDuration(any(), any(), any()))
                .thenReturn(java.time.Duration.ofHours(40)) // total
                .thenReturn(java.time.Duration.ofHours(20)); // elapsed
        
        activityStatusService.calculateAndSetTrackingStatus(activity);
        
        assertEquals(TrackingStatus.ON_TRACK, activity.getTrackingStatus());
    }

    @Test
    void calculateAndSetTrackingStatus_NotInProgress_ShouldClearTrackingStatus() {
        activity.setStatus(Status.COMPLETED);
        activity.setTrackingStatus(TrackingStatus.AT_RISK);
        
        activityStatusService.calculateAndSetTrackingStatus(activity);
        
        assertNull(activity.getTrackingStatus());
    }

    @Test
    void verifyActivity_WithChecklist_RequiresChecklistComments() {
        activity.setStatus(Status.COMPLETED);
        activity.addChecklistItem("Review code quality");
        
        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class,
                () -> activityStatusService.verifyActivity(activity, projectManager, null));
        
        assertEquals("Checklist comments are required for activity verification", exception.getMessage());
    }

    @Test
    void verifyActivity_WithChecklistComments_ShouldSucceed() {
        activity.setStatus(Status.COMPLETED);
        activity.addChecklistItem("Review code quality");
        
        Map<String, String> checklistComments = new HashMap<>();
        checklistComments.put("Review code quality", "Code reviewed and approved");
        
        when(activityRepository.save(any(Activity.class))).thenReturn(activity);
        
        activityStatusService.verifyActivity(activity, projectManager, checklistComments);
        
        assertEquals(Status.VERIFIED, activity.getStatus());
        verify(activityRepository).save(activity);
    }
}