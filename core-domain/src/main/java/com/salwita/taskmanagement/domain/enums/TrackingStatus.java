package com.salwita.taskmanagement.domain.enums;

public enum TrackingStatus {
    ON_TRACK("On Track"),
    AT_RISK("At Risk"),
    OFF_TRACK("Off Track");

    private final String description;

    TrackingStatus(String description) {
        this.description = description;
    }

    public String getDescription() {
        return description;
    }
}