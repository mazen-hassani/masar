package com.salwita.taskmanagement.scheduling.model;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Objects;

/**
 * Represents the calculated schedule for a single item (activity or task)
 */
public class ItemSchedule {
    
    private final LocalDateTime startTime;
    private final LocalDateTime endTime;
    private final Duration duration;
    private final boolean manuallyOverridden;
    
    public ItemSchedule(LocalDateTime startTime, LocalDateTime endTime, Duration duration) {
        this(startTime, endTime, duration, false);
    }
    
    public ItemSchedule(LocalDateTime startTime, LocalDateTime endTime, Duration duration, boolean manuallyOverridden) {
        this.startTime = startTime;
        this.endTime = endTime;
        this.duration = duration;
        this.manuallyOverridden = manuallyOverridden;
    }
    
    public LocalDateTime getStartTime() {
        return startTime;
    }
    
    public LocalDateTime getEndTime() {
        return endTime;
    }
    
    public Duration getDuration() {
        return duration;
    }
    
    public boolean isManuallyOverridden() {
        return manuallyOverridden;
    }
    
    public ItemSchedule withManualOverride(boolean manuallyOverridden) {
        return new ItemSchedule(startTime, endTime, duration, manuallyOverridden);
    }
    
    public ItemSchedule withNewTimes(LocalDateTime newStartTime, LocalDateTime newEndTime) {
        return new ItemSchedule(newStartTime, newEndTime, Duration.between(newStartTime, newEndTime), manuallyOverridden);
    }
    
    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        ItemSchedule that = (ItemSchedule) o;
        return manuallyOverridden == that.manuallyOverridden &&
               Objects.equals(startTime, that.startTime) &&
               Objects.equals(endTime, that.endTime) &&
               Objects.equals(duration, that.duration);
    }

    @Override
    public int hashCode() {
        return Objects.hash(startTime, endTime, duration, manuallyOverridden);
    }

    @Override
    public String toString() {
        return "ItemSchedule{" +
               "startTime=" + startTime +
               ", endTime=" + endTime +
               ", duration=" + duration +
               ", manuallyOverridden=" + manuallyOverridden +
               '}';
    }
}