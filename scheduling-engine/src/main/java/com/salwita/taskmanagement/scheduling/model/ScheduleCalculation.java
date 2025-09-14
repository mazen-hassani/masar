package com.salwita.taskmanagement.scheduling.model;

import com.salwita.taskmanagement.domain.entity.Activity;
import com.salwita.taskmanagement.domain.entity.Task;

import java.util.concurrent.ConcurrentHashMap;
import java.util.Map;

/**
 * Holds the calculated schedule for activities and tasks during scheduling operation
 */
public class ScheduleCalculation {
    
    private final Map<Activity, ItemSchedule> activitySchedules;
    private final Map<Task, ItemSchedule> taskSchedules;
    
    public ScheduleCalculation() {
        this.activitySchedules = new ConcurrentHashMap<>();
        this.taskSchedules = new ConcurrentHashMap<>();
    }
    
    public void addActivitySchedule(Activity activity, ItemSchedule schedule) {
        activitySchedules.put(activity, schedule);
    }
    
    public void addTaskSchedule(Task task, ItemSchedule schedule) {
        taskSchedules.put(task, schedule);
    }
    
    public ItemSchedule getActivitySchedule(Activity activity) {
        return activitySchedules.get(activity);
    }
    
    public ItemSchedule getTaskSchedule(Task task) {
        return taskSchedules.get(task);
    }
    
    public Map<Activity, ItemSchedule> getActivitySchedules() {
        return activitySchedules;
    }
    
    public Map<Task, ItemSchedule> getTaskSchedules() {
        return taskSchedules;
    }
    
    public int getTotalScheduledItems() {
        return activitySchedules.size() + taskSchedules.size();
    }
    
    public boolean isEmpty() {
        return activitySchedules.isEmpty() && taskSchedules.isEmpty();
    }
    
    public void clear() {
        activitySchedules.clear();
        taskSchedules.clear();
    }
}