package com.salwita.taskmanagement.domain.model;

import java.util.ArrayList;
import java.util.List;

/**
 * Represents the impact of a date change on downstream tasks and activities
 */
public class DownstreamImpact {
    
    private List<ImpactedItem> impactedTasks;
    private List<ImpactedItem> impactedActivities;
    private int totalImpactedItems;
    private boolean affectsCriticalPath;
    private boolean affectsProjectEndDate;
    private String impactSummary;
    
    public DownstreamImpact() {
        this.impactedTasks = new ArrayList<>();
        this.impactedActivities = new ArrayList<>();
        this.totalImpactedItems = 0;
        this.affectsCriticalPath = false;
        this.affectsProjectEndDate = false;
    }
    
    public static class ImpactedItem {
        private Long itemId;
        private String itemName;
        private String itemType; // "Task" or "Activity"
        private String impactType; // "DATE_SHIFT", "SCHEDULE_CONFLICT", "CRITICAL_PATH_CHANGE"
        private String impactDescription;
        private boolean requiresRescheduling;
        
        public ImpactedItem() {}
        
        public ImpactedItem(Long itemId, String itemName, String itemType, String impactType, String impactDescription) {
            this.itemId = itemId;
            this.itemName = itemName;
            this.itemType = itemType;
            this.impactType = impactType;
            this.impactDescription = impactDescription;
            this.requiresRescheduling = false;
        }
        
        // Getters and setters
        
        public Long getItemId() {
            return itemId;
        }
        
        public void setItemId(Long itemId) {
            this.itemId = itemId;
        }
        
        public String getItemName() {
            return itemName;
        }
        
        public void setItemName(String itemName) {
            this.itemName = itemName;
        }
        
        public String getItemType() {
            return itemType;
        }
        
        public void setItemType(String itemType) {
            this.itemType = itemType;
        }
        
        public String getImpactType() {
            return impactType;
        }
        
        public void setImpactType(String impactType) {
            this.impactType = impactType;
        }
        
        public String getImpactDescription() {
            return impactDescription;
        }
        
        public void setImpactDescription(String impactDescription) {
            this.impactDescription = impactDescription;
        }
        
        public boolean isRequiresRescheduling() {
            return requiresRescheduling;
        }
        
        public void setRequiresRescheduling(boolean requiresRescheduling) {
            this.requiresRescheduling = requiresRescheduling;
        }
    }
    
    // Helper methods to add impacted items
    
    public void addImpactedTask(Long taskId, String taskName, String impactType, String impactDescription) {
        ImpactedItem item = new ImpactedItem(taskId, taskName, "Task", impactType, impactDescription);
        this.impactedTasks.add(item);
        this.totalImpactedItems++;
    }
    
    public void addImpactedActivity(Long activityId, String activityName, String impactType, String impactDescription) {
        ImpactedItem item = new ImpactedItem(activityId, activityName, "Activity", impactType, impactDescription);
        this.impactedActivities.add(item);
        this.totalImpactedItems++;
    }
    
    public boolean hasImpact() {
        return totalImpactedItems > 0 || affectsCriticalPath || affectsProjectEndDate;
    }
    
    public boolean hasHighImpact() {
        return totalImpactedItems > 10 || affectsCriticalPath || affectsProjectEndDate;
    }
    
    // Getters and setters
    
    public List<ImpactedItem> getImpactedTasks() {
        return impactedTasks;
    }
    
    public void setImpactedTasks(List<ImpactedItem> impactedTasks) {
        this.impactedTasks = impactedTasks;
        updateTotalImpactedItems();
    }
    
    public List<ImpactedItem> getImpactedActivities() {
        return impactedActivities;
    }
    
    public void setImpactedActivities(List<ImpactedItem> impactedActivities) {
        this.impactedActivities = impactedActivities;
        updateTotalImpactedItems();
    }
    
    public int getTotalImpactedItems() {
        return totalImpactedItems;
    }
    
    public void setTotalImpactedItems(int totalImpactedItems) {
        this.totalImpactedItems = totalImpactedItems;
    }
    
    private void updateTotalImpactedItems() {
        this.totalImpactedItems = impactedTasks.size() + impactedActivities.size();
    }
    
    public boolean isAffectsCriticalPath() {
        return affectsCriticalPath;
    }
    
    public void setAffectsCriticalPath(boolean affectsCriticalPath) {
        this.affectsCriticalPath = affectsCriticalPath;
    }
    
    public boolean isAffectsProjectEndDate() {
        return affectsProjectEndDate;
    }
    
    public void setAffectsProjectEndDate(boolean affectsProjectEndDate) {
        this.affectsProjectEndDate = affectsProjectEndDate;
    }
    
    public String getImpactSummary() {
        return impactSummary;
    }
    
    public void setImpactSummary(String impactSummary) {
        this.impactSummary = impactSummary;
    }
    
    @Override
    public String toString() {
        return "DownstreamImpact{" +
               "totalImpactedItems=" + totalImpactedItems +
               ", affectsCriticalPath=" + affectsCriticalPath +
               ", affectsProjectEndDate=" + affectsProjectEndDate +
               ", impactSummary='" + impactSummary + '\'' +
               '}';
    }
}