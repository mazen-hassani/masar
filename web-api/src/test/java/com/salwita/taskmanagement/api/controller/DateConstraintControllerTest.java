package com.salwita.taskmanagement.api.controller;

import com.salwita.taskmanagement.domain.entity.*;
import com.salwita.taskmanagement.domain.enums.Role;
import com.salwita.taskmanagement.domain.model.*;
import com.salwita.taskmanagement.domain.repository.TaskRepository;
import com.salwita.taskmanagement.domain.repository.ActivityRepository;
import com.salwita.taskmanagement.domain.service.DateConstraintCalculator;
import com.salwita.taskmanagement.domain.service.ConstraintValidationService;
import com.salwita.taskmanagement.domain.valueobject.WorkingCalendar;
import com.salwita.taskmanagement.api.dto.DateValidityResponse;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.time.Duration;
import java.time.ZoneId;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(DateConstraintController.class)
class DateConstraintControllerTest {
    
    @Autowired
    private MockMvc mockMvc;
    
    @Autowired
    private ObjectMapper objectMapper;
    
    @MockBean
    private DateConstraintCalculator constraintCalculator;
    
    @MockBean
    private ConstraintValidationService validationService;
    
    @MockBean
    private TaskRepository taskRepository;
    
    @MockBean
    private ActivityRepository activityRepository;
    
    private Organisation organisation;
    private User user;
    private Project project;
    private Activity activity;
    private Task task;
    private WorkingCalendar workingCalendar;
    
    @BeforeEach
    void setUp() {
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
        
        task = new Task("Test Task", "Task description", activity);
        task.setId(1L);
        task.setDuration(Duration.ofDays(2));
    }
    
    @Test
    void getTaskConstraints_ValidTask_ReturnsConstraints() throws Exception {
        // Given
        DateConstraints constraints = createValidTaskConstraints();
        
        when(taskRepository.findById(1L)).thenReturn(Optional.of(task));
        when(constraintCalculator.calculateTaskConstraints(task)).thenReturn(constraints);
        
        // When & Then
        mockMvc.perform(get("/api/date-constraints/tasks/1"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.taskId").value(1L))
            .andExpect(jsonPath("$.feasible").value(true))
            .andExpect(jsonPath("$.earliestStartTime").exists())
            .andExpect(jsonPath("$.latestEndTime").exists());
        
        verify(constraintCalculator).calculateTaskConstraints(task);
    }
    
    @Test
    void getTaskConstraints_TaskNotFound_ReturnsNotFound() throws Exception {
        // Given
        when(taskRepository.findById(999L)).thenReturn(Optional.empty());
        
        // When & Then
        mockMvc.perform(get("/api/date-constraints/tasks/999"))
            .andExpect(status().isNotFound());
        
        verify(constraintCalculator, never()).calculateTaskConstraints(any());
    }
    
    @Test
    void getActivityConstraints_ValidActivity_ReturnsConstraints() throws Exception {
        // Given
        DateConstraints constraints = createValidActivityConstraints();
        
        when(activityRepository.findById(1L)).thenReturn(Optional.of(activity));
        when(constraintCalculator.calculateActivityConstraints(activity)).thenReturn(constraints);
        
        // When & Then
        mockMvc.perform(get("/api/date-constraints/activities/1"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.activityId").value(1L))
            .andExpect(jsonPath("$.feasible").value(true))
            .andExpect(jsonPath("$.earliestStartTime").exists())
            .andExpect(jsonPath("$.latestEndTime").exists());
        
        verify(constraintCalculator).calculateActivityConstraints(activity);
    }
    
    @Test
    void validateTaskDateChange_ValidChange_ReturnsSuccess() throws Exception {
        // Given
        DateConstraintController.TaskDateChangeRequest request = new DateConstraintController.TaskDateChangeRequest();
        request.setStartDate(LocalDateTime.of(2024, 1, 5, 9, 0));
        request.setEndDate(LocalDateTime.of(2024, 1, 7, 17, 0));
        request.setReason("User requested change");
        
        EditValidationResult validResult = EditValidationResult.valid("Change is valid");
        
        when(validationService.validateTaskDateChange(any(TaskDateChange.class))).thenReturn(validResult);
        
        // When & Then
        mockMvc.perform(post("/api/date-constraints/tasks/1/validate")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.canProceed").value(true))
            .andExpect(jsonPath("$.status").value("VALID"))
            .andExpect(jsonPath("$.primaryMessage").value("Change is valid"));
        
        verify(validationService).validateTaskDateChange(any(TaskDateChange.class));
    }
    
    @Test
    void validateTaskDateChange_InvalidChange_ReturnsError() throws Exception {
        // Given
        DateConstraintController.TaskDateChangeRequest request = new DateConstraintController.TaskDateChangeRequest();
        request.setStartDate(LocalDateTime.of(2024, 1, 7, 9, 0));
        request.setEndDate(LocalDateTime.of(2024, 1, 5, 17, 0)); // End before start
        request.setReason("Invalid date range");
        
        EditValidationResult errorResult = EditValidationResult.error("Start date cannot be after end date");
        
        when(validationService.validateTaskDateChange(any(TaskDateChange.class))).thenReturn(errorResult);
        
        // When & Then
        mockMvc.perform(post("/api/date-constraints/tasks/1/validate")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.canProceed").value(false))
            .andExpect(jsonPath("$.status").value("ERROR"))
            .andExpect(jsonPath("$.errors[0]").value("Start date cannot be after end date"));
        
        verify(validationService).validateTaskDateChange(any(TaskDateChange.class));
    }
    
    @Test
    void validateActivityDateChange_ValidChange_ReturnsSuccess() throws Exception {
        // Given
        DateConstraintController.ActivityDateChangeRequest request = new DateConstraintController.ActivityDateChangeRequest();
        request.setStartDate(LocalDateTime.of(2024, 1, 5, 9, 0));
        request.setEndDate(LocalDateTime.of(2024, 1, 12, 17, 0));
        request.setReason("Activity schedule adjustment");
        request.setPropagateToTasks(true);
        
        EditValidationResult validResult = EditValidationResult.valid("Activity change is valid");
        
        when(validationService.validateActivityDateChange(any(ActivityDateChange.class))).thenReturn(validResult);
        
        // When & Then
        mockMvc.perform(post("/api/date-constraints/activities/1/validate")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.canProceed").value(true))
            .andExpect(jsonPath("$.status").value("VALID"));
        
        verify(validationService).validateActivityDateChange(any(ActivityDateChange.class));
    }
    
    @Test
    void checkTaskDateValidity_ValidDates_ReturnsTrue() throws Exception {
        // Given
        DateConstraintController.DateRangeRequest request = new DateConstraintController.DateRangeRequest();
        request.setStartDate(LocalDateTime.of(2024, 1, 5, 9, 0));
        request.setEndDate(LocalDateTime.of(2024, 1, 7, 17, 0));
        
        DateConstraints constraints = createValidTaskConstraints();
        
        when(taskRepository.findById(1L)).thenReturn(Optional.of(task));
        when(constraintCalculator.calculateTaskConstraints(task)).thenReturn(constraints);
        
        // When & Then
        mockMvc.perform(post("/api/date-constraints/tasks/1/check-validity")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.valid").value(true))
            .andExpect(jsonPath("$.taskId").value(1L));
        
        verify(constraintCalculator).calculateTaskConstraints(task);
    }
    
    @Test
    void checkTaskDateValidity_InvalidDates_ReturnsFalse() throws Exception {
        // Given
        DateConstraintController.DateRangeRequest request = new DateConstraintController.DateRangeRequest();
        request.setStartDate(LocalDateTime.of(2024, 1, 1, 9, 0)); // Too early
        request.setEndDate(LocalDateTime.of(2024, 1, 3, 17, 0));
        
        DateConstraints constraints = createRestrictiveTaskConstraints();
        
        when(taskRepository.findById(1L)).thenReturn(Optional.of(task));
        when(constraintCalculator.calculateTaskConstraints(task)).thenReturn(constraints);
        
        // When & Then
        mockMvc.perform(post("/api/date-constraints/tasks/1/check-validity")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.valid").value(false))
            .andExpect(jsonPath("$.violations").isArray());
        
        verify(constraintCalculator).calculateTaskConstraints(task);
    }
    
    @Test
    void analyzeTaskDateChangeImpact_ReturnsDownstreamImpact() throws Exception {
        // Given
        DateConstraintController.TaskDateChangeRequest request = new DateConstraintController.TaskDateChangeRequest();
        request.setStartDate(LocalDateTime.of(2024, 1, 6, 9, 0));
        request.setEndDate(LocalDateTime.of(2024, 1, 8, 17, 0));
        request.setReason("Impact analysis");
        
        DownstreamImpact impact = new DownstreamImpact();
        impact.addImpactedTask(2L, "Dependent Task", "DATE_SHIFT", "Task will be delayed");
        impact.setAffectsCriticalPath(true);
        
        EditValidationResult result = EditValidationResult.valid("Valid with impact");
        result.setDownstreamImpact(impact);
        
        when(validationService.validateTaskDateChange(any(TaskDateChange.class))).thenReturn(result);
        
        // When & Then
        mockMvc.perform(post("/api/date-constraints/tasks/1/impact-analysis")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.totalImpactedItems").value(1))
            .andExpect(jsonPath("$.affectsCriticalPath").value(true))
            .andExpect(jsonPath("$.impactedTasks[0].itemId").value(2L));
        
        verify(validationService).validateTaskDateChange(any(TaskDateChange.class));
    }
    
    // Helper methods
    
    private DateConstraints createValidTaskConstraints() {
        DateConstraints constraints = new DateConstraints();
        constraints.setTaskId(1L);
        constraints.setProjectId(1L);
        constraints.setEarliestStartTime(LocalDateTime.of(2024, 1, 2, 9, 0));
        constraints.setLatestEndTime(LocalDateTime.of(2024, 1, 30, 17, 0));
        constraints.setMinimumDuration(Duration.ofDays(1));
        constraints.setFeasible(true);
        return constraints;
    }
    
    private DateConstraints createValidActivityConstraints() {
        DateConstraints constraints = new DateConstraints();
        constraints.setActivityId(1L);
        constraints.setProjectId(1L);
        constraints.setEarliestStartTime(LocalDateTime.of(2024, 1, 2, 9, 0));
        constraints.setLatestEndTime(LocalDateTime.of(2024, 1, 30, 17, 0));
        constraints.setMinimumDuration(Duration.ofDays(2));
        constraints.setFeasible(true);
        return constraints;
    }
    
    private DateConstraints createRestrictiveTaskConstraints() {
        DateConstraints constraints = new DateConstraints();
        constraints.setTaskId(1L);
        constraints.setProjectId(1L);
        constraints.setEarliestStartTime(LocalDateTime.of(2024, 1, 5, 9, 0)); // Later start
        constraints.setLatestEndTime(LocalDateTime.of(2024, 1, 20, 17, 0));
        constraints.setMinimumDuration(Duration.ofDays(2));
        constraints.setFeasible(true);
        return constraints;
    }
}