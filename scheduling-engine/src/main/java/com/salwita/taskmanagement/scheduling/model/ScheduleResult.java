package com.salwita.taskmanagement.scheduling.model;

/**
 * Result of a scheduling operation with performance metrics and status
 */
public class ScheduleResult {
    
    private boolean success;
    private String error;
    private long totalTime;
    private long graphBuildTime;
    private long topologicalSortTime;
    private long scheduleCalculationTime;
    private long applyTime;
    private int scheduledActivities;
    private int scheduledTasks;
    private int affectedItemsCount;
    
    public ScheduleResult() {
        this.success = false;
        this.scheduledActivities = 0;
        this.scheduledTasks = 0;
        this.affectedItemsCount = 0;
    }
    
    // Getters and setters
    
    public boolean isSuccess() {
        return success;
    }
    
    public void setSuccess(boolean success) {
        this.success = success;
    }
    
    public String getError() {
        return error;
    }
    
    public void setError(String error) {
        this.error = error;
    }
    
    public long getTotalTime() {
        return totalTime;
    }
    
    public void setTotalTime(long totalTime) {
        this.totalTime = totalTime;
    }
    
    public long getGraphBuildTime() {
        return graphBuildTime;
    }
    
    public void setGraphBuildTime(long graphBuildTime) {
        this.graphBuildTime = graphBuildTime;
    }
    
    public long getTopologicalSortTime() {
        return topologicalSortTime;
    }
    
    public void setTopologicalSortTime(long topologicalSortTime) {
        this.topologicalSortTime = topologicalSortTime;
    }
    
    public long getScheduleCalculationTime() {
        return scheduleCalculationTime;
    }
    
    public void setScheduleCalculationTime(long scheduleCalculationTime) {
        this.scheduleCalculationTime = scheduleCalculationTime;
    }
    
    public long getApplyTime() {
        return applyTime;
    }
    
    public void setApplyTime(long applyTime) {
        this.applyTime = applyTime;
    }
    
    public int getScheduledActivities() {
        return scheduledActivities;
    }
    
    public void setScheduledActivities(int scheduledActivities) {
        this.scheduledActivities = scheduledActivities;
    }
    
    public int getScheduledTasks() {
        return scheduledTasks;
    }
    
    public void setScheduledTasks(int scheduledTasks) {
        this.scheduledTasks = scheduledTasks;
    }
    
    public int getAffectedItemsCount() {
        return affectedItemsCount;
    }
    
    public void setAffectedItemsCount(int affectedItemsCount) {
        this.affectedItemsCount = affectedItemsCount;
    }
    
    @Override
    public String toString() {
        return "ScheduleResult{" +
               "success=" + success +
               ", error='" + error + '\'' +
               ", totalTime=" + totalTime + "ms" +
               ", scheduledActivities=" + scheduledActivities +
               ", scheduledTasks=" + scheduledTasks +
               ", affectedItemsCount=" + affectedItemsCount +
               '}';
    }
}