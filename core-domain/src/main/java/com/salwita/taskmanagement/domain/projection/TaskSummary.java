package com.salwita.taskmanagement.domain.projection;

import com.salwita.taskmanagement.domain.enums.Status;
import com.salwita.taskmanagement.domain.enums.TrackingStatus;

import java.time.LocalDateTime;

public interface TaskSummary {
    Long getId();
    String getName();
    String getDescription();
    Status getStatus();
    TrackingStatus getTrackingStatus();
    Integer getPercentageComplete();
    LocalDateTime getStartDate();
    LocalDateTime getEndDate();
    LocalDateTime getActualStartDate();
    LocalDateTime getActualEndDate();
    Long getActivityId();
    String getActivityName();
    Long getProjectId();
    String getProjectName();
    Long getAssigneeUserId();
    String getAssigneeUserName();
    Boolean getIsOverdue();
}