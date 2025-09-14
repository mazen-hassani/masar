package com.salwita.taskmanagement.scheduling.model;

import java.time.LocalDateTime;
import java.util.Objects;

/**
 * Abstract base class representing an item that can be scheduled (Activity or Task)
 */
public abstract class SchedulableItem {
    
    public abstract Long getId();
    public abstract String getName();
    public abstract String getType();
    public abstract LocalDateTime getPlannedStartDate();
    public abstract LocalDateTime getPlannedEndDate();
    public abstract Long getProjectId();
    
    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        SchedulableItem that = (SchedulableItem) o;
        return Objects.equals(getId(), that.getId()) && 
               Objects.equals(getType(), that.getType());
    }

    @Override
    public int hashCode() {
        return Objects.hash(getId(), getType());
    }

    @Override
    public String toString() {
        return getType() + "{id=" + getId() + ", name='" + getName() + "'}";
    }
}