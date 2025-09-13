package com.salwita.taskmanagement.domain.enums;

public enum Status {
    NOT_STARTED("Not Started"),
    IN_PROGRESS("In Progress"),
    ON_HOLD("On Hold"),
    COMPLETED("Completed"),
    VERIFIED("Verified");

    private final String description;

    Status(String description) {
        this.description = description;
    }

    public String getDescription() {
        return description;
    }

    public boolean canTransitionTo(Status newStatus) {
        return switch (this) {
            case NOT_STARTED -> newStatus == IN_PROGRESS;
            case IN_PROGRESS -> newStatus == ON_HOLD || newStatus == COMPLETED;
            case ON_HOLD -> newStatus == IN_PROGRESS;
            case COMPLETED -> newStatus == VERIFIED;
            case VERIFIED -> false; // Terminal state
        };
    }
}