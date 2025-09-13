package com.salwita.taskmanagement.domain.entity;

import com.salwita.taskmanagement.domain.builder.OrganisationTestBuilder;
import com.salwita.taskmanagement.domain.builder.UserTestBuilder;
import com.salwita.taskmanagement.domain.enums.Role;
import com.salwita.taskmanagement.domain.enums.Status;
import com.salwita.taskmanagement.domain.enums.TrackingStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.*;

class TaskTest {

    private Organisation organisation;
    private User pmUser;
    private Project project;
    private Activity activity;

    @BeforeEach
    void setUp() {
        organisation = OrganisationTestBuilder.organisation().build();
        pmUser = UserTestBuilder.user()
                .withRole(Role.PM)
                .withOrganisation(organisation)
                .build();
        project = new Project("Test Project", "Test Description", organisation, pmUser);
        activity = new Activity("Test Activity", "Test Description", project);
    }

    @Test
    void shouldCreateTaskWithValidData() {
        Task task = new Task("Test Task", "Test Description", activity);

        assertEquals("Test Task", task.getName());
        assertEquals("Test Description", task.getDescription());
        assertEquals(Status.NOT_STARTED, task.getStatus());
        assertEquals(0, task.getPercentageComplete());
        assertEquals(activity, task.getActivity());
        assertNull(task.getAssigneeUser());
    }

    @Test
    void shouldCreateTaskWithAssignee() {
        User teamMember = UserTestBuilder.user()
                .withRole(Role.TEAM_MEMBER)
                .withOrganisation(organisation)
                .build();
        
        Task task = new Task("Test Task", "Test Description", activity, teamMember);

        assertEquals(teamMember, task.getAssigneeUser());
    }

    @Test
    void shouldUpdateStatusCorrectly() {
        Task task = new Task("Test Task", "Test Description", activity);

        task.updateStatus(Status.IN_PROGRESS);
        assertEquals(Status.IN_PROGRESS, task.getStatus());
        assertNotNull(task.getActualStartDate());

        task.updateStatus(Status.COMPLETED);
        assertEquals(Status.COMPLETED, task.getStatus());
        assertEquals(100, task.getPercentageComplete());
        assertNotNull(task.getActualEndDate());
    }

    @Test
    void shouldThrowExceptionForInvalidStatusTransition() {
        Task task = new Task("Test Task", "Test Description", activity);

        assertThrows(IllegalStateException.class, 
                () -> task.updateStatus(Status.COMPLETED));
    }

    @Test
    void shouldUpdateProgressCorrectly() {
        Task task = new Task("Test Task", "Test Description", activity);
        task.updateStatus(Status.IN_PROGRESS);

        task.updateProgress(50);
        assertEquals(50, task.getPercentageComplete());

        task.updateProgress(100);
        assertEquals(Status.COMPLETED, task.getStatus());
        assertEquals(100, task.getPercentageComplete());
    }

    @Test
    void shouldThrowExceptionWhenUpdatingProgressOnNonInProgressTask() {
        Task task = new Task("Test Task", "Test Description", activity);

        assertThrows(IllegalStateException.class, 
                () -> task.updateProgress(50));
    }

    @Test
    void shouldVerifyTaskCorrectly() {
        Task task = new Task("Test Task", "Test Description", activity);
        task.updateStatus(Status.IN_PROGRESS);
        task.updateStatus(Status.COMPLETED);

        task.verify(pmUser);

        assertEquals(Status.VERIFIED, task.getStatus());
        assertNotNull(task.getVerifiedAt());
        assertEquals(pmUser, task.getVerifiedByUser());
    }

    @Test
    void shouldThrowExceptionWhenVerifyingIncompleteTask() {
        Task task = new Task("Test Task", "Test Description", activity);

        assertThrows(IllegalStateException.class, 
                () -> task.verify(pmUser));
    }

    @Test
    void shouldThrowExceptionWhenNonPMTriesToVerify() {
        User teamMember = UserTestBuilder.user()
                .withRole(Role.TEAM_MEMBER)
                .withOrganisation(organisation)
                .build();
        
        Task task = new Task("Test Task", "Test Description", activity);
        task.updateStatus(Status.IN_PROGRESS);
        task.updateStatus(Status.COMPLETED);

        assertThrows(IllegalArgumentException.class, 
                () -> task.verify(teamMember));
    }

    @Test
    void shouldDetectOverdueTasks() {
        Task task = new Task("Test Task", "Test Description", activity);
        task.setTaskTimeline(LocalDateTime.now().minusDays(2), LocalDateTime.now().minusDays(1));
        task.updateStatus(Status.IN_PROGRESS);

        assertTrue(task.isOverdue());
    }

    @Test
    void shouldNotDetectOverdueForCompletedTasks() {
        Task task = new Task("Test Task", "Test Description", activity);
        task.setTaskTimeline(LocalDateTime.now().minusDays(2), LocalDateTime.now().minusDays(1));
        task.updateStatus(Status.IN_PROGRESS);
        task.updateStatus(Status.COMPLETED);

        assertFalse(task.isOverdue());
    }

    @Test
    void shouldUpdateTrackingStatus() {
        Task task = new Task("Test Task", "Test Description", activity);

        task.updateTrackingStatus(TrackingStatus.AT_RISK);
        assertEquals(TrackingStatus.AT_RISK, task.getTrackingStatus());
    }

    @Test
    void shouldAssignTaskToUser() {
        Task task = new Task("Test Task", "Test Description", activity);
        User teamMember = UserTestBuilder.user()
                .withRole(Role.TEAM_MEMBER)
                .withOrganisation(organisation)
                .build();

        task.assignTo(teamMember);
        assertEquals(teamMember, task.getAssigneeUser());
    }
}