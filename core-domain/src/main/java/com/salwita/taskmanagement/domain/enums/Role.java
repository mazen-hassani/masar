package com.salwita.taskmanagement.domain.enums;

public enum Role {
    PMO("PMO - Project Management Office"),
    PM("PM - Project Manager"),
    TEAM_MEMBER("Team Member"),
    CLIENT("Client");

    private final String description;

    Role(String description) {
        this.description = description;
    }

    public String getDescription() {
        return description;
    }
}