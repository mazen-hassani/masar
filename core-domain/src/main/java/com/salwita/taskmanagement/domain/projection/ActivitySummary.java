package com.salwita.taskmanagement.domain.projection;

import com.salwita.taskmanagement.domain.enums.Status;
import com.salwita.taskmanagement.domain.enums.TrackingStatus;

import java.time.LocalDateTime;

public interface ActivitySummary {
    Long getId();
    String getName();
    String getDescription();
    Status getStatus();
    TrackingStatus getTrackingStatus();
    Integer getPercentageComplete();
    LocalDateTime getStartDate();
    LocalDateTime getEndDate();
    Long getProjectId();
    String getProjectName();
    Long getTotalTasks();
    Long getCompletedTasks();
    Double getAverageTaskProgress();
}