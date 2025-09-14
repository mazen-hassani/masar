package com.salwita.taskmanagement.scheduling.model;

import com.salwita.taskmanagement.domain.entity.Task;

import java.time.LocalDateTime;

/**
 * Schedulable item wrapper for Task entities
 */
public class TaskSchedulableItem extends SchedulableItem {
    
    private final Task task;
    
    public TaskSchedulableItem(Task task) {
        this.task = task;
    }
    
    public Task getTask() {
        return task;
    }
    
    @Override
    public Long getId() {
        return task.getId();
    }
    
    @Override
    public String getName() {
        return task.getName();
    }
    
    @Override
    public String getType() {
        return "Task";
    }
    
    @Override
    public LocalDateTime getPlannedStartDate() {
        return task.getStartDate();
    }
    
    @Override
    public LocalDateTime getPlannedEndDate() {
        return task.getEndDate();
    }
    
    @Override
    public Long getProjectId() {
        return task.getActivity().getProject().getId();
    }
}