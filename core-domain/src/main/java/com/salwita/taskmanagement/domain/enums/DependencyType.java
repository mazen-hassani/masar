package com.salwita.taskmanagement.domain.enums;

public enum DependencyType {
    FS("Finish-to-Start", "successor.start ≥ predecessor.end + lag"),
    SS("Start-to-Start", "successor.start ≥ predecessor.start + lag"),
    FF("Finish-to-Finish", "successor.end ≥ predecessor.end + lag"),
    SF("Start-to-Finish", "successor.end ≥ predecessor.start + lag");

    private final String description;
    private final String constraint;

    DependencyType(String description, String constraint) {
        this.description = description;
        this.constraint = constraint;
    }

    public String getDescription() {
        return description;
    }

    public String getConstraint() {
        return constraint;
    }
}