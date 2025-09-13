package com.salwita.taskmanagement.domain.valueobject;

import jakarta.persistence.Embeddable;
import jakarta.persistence.Column;
import java.time.LocalTime;
import java.time.Duration;
import java.util.Objects;

@Embeddable
public class WorkingTimeRange {

    @Column(name = "start_time", nullable = false)
    private LocalTime startTime;

    @Column(name = "end_time", nullable = false)
    private LocalTime endTime;

    protected WorkingTimeRange() {
    }

    public WorkingTimeRange(LocalTime startTime, LocalTime endTime) {
        if (startTime == null || endTime == null) {
            throw new IllegalArgumentException("Start time and end time cannot be null");
        }
        if (!startTime.isBefore(endTime)) {
            throw new IllegalArgumentException("Start time must be before end time");
        }
        this.startTime = startTime;
        this.endTime = endTime;
    }

    public LocalTime getStartTime() {
        return startTime;
    }

    public LocalTime getEndTime() {
        return endTime;
    }

    public Duration getDuration() {
        return Duration.between(startTime, endTime);
    }

    public boolean contains(LocalTime time) {
        return !time.isBefore(startTime) && time.isBefore(endTime);
    }

    public boolean overlaps(WorkingTimeRange other) {
        return !this.endTime.isBefore(other.startTime) && !other.endTime.isBefore(this.startTime);
    }

    public WorkingTimeRange intersection(WorkingTimeRange other) {
        if (!overlaps(other)) {
            return null;
        }
        
        LocalTime intersectionStart = startTime.isAfter(other.startTime) ? startTime : other.startTime;
        LocalTime intersectionEnd = endTime.isBefore(other.endTime) ? endTime : other.endTime;
        
        return new WorkingTimeRange(intersectionStart, intersectionEnd);
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        WorkingTimeRange that = (WorkingTimeRange) o;
        return Objects.equals(startTime, that.startTime) &&
               Objects.equals(endTime, that.endTime);
    }

    @Override
    public int hashCode() {
        return Objects.hash(startTime, endTime);
    }

    @Override
    public String toString() {
        return "WorkingTimeRange{" +
               "startTime=" + startTime +
               ", endTime=" + endTime +
               ", duration=" + getDuration() +
               '}';
    }
}