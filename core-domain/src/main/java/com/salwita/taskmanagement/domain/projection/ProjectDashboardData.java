package com.salwita.taskmanagement.domain.projection;

import com.salwita.taskmanagement.domain.enums.Status;
import com.salwita.taskmanagement.domain.enums.TrackingStatus;

import java.time.LocalDateTime;

public interface ProjectDashboardData {
    Long getId();
    String getName();
    String getDescription();
    Status getStatus();
    TrackingStatus getTrackingStatus();
    Integer getPercentageComplete();
    LocalDateTime getStartDate();
    LocalDateTime getEndDate();
    String getAssignedPmUserName();
    Long getTotalActivities();
    Long getTotalTasks();
    Long getCompletedActivities();
    Long getCompletedTasks();
    Long getOnTrackItems();
    Long getAtRiskItems();
    Long getOffTrackItems();
    Long getOverdueItems();
}