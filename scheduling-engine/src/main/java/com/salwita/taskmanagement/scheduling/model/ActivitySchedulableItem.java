package com.salwita.taskmanagement.scheduling.model;

import com.salwita.taskmanagement.domain.entity.Activity;

import java.time.LocalDateTime;

/**
 * Schedulable item wrapper for Activity entities
 */
public class ActivitySchedulableItem extends SchedulableItem {
    
    private final Activity activity;
    
    public ActivitySchedulableItem(Activity activity) {
        this.activity = activity;
    }
    
    public Activity getActivity() {
        return activity;
    }
    
    @Override
    public Long getId() {
        return activity.getId();
    }
    
    @Override
    public String getName() {
        return activity.getName();
    }
    
    @Override
    public String getType() {
        return "Activity";
    }
    
    @Override
    public LocalDateTime getPlannedStartDate() {
        return activity.getStartDate();
    }
    
    @Override
    public LocalDateTime getPlannedEndDate() {
        return activity.getEndDate();
    }
    
    @Override
    public Long getProjectId() {
        return activity.getProject().getId();
    }
}