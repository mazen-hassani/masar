package com.salwita.taskmanagement.domain.valueobject;

import jakarta.persistence.Embeddable;
import jakarta.persistence.Column;
import java.time.ZoneId;
import java.util.Objects;

@Embeddable
public class WorkingCalendar {
    
    @Column(name = "timezone", nullable = false)
    private String timezone = "UTC";
    
    @Column(name = "working_days", nullable = false)
    private String workingDays = "MONDAY,TUESDAY,WEDNESDAY,THURSDAY,FRIDAY"; // Comma-separated
    
    @Column(name = "working_hours_per_day", nullable = false)
    private Integer workingHoursPerDay = 8;
    
    @Column(name = "working_hours_start", nullable = false)
    private String workingHoursStart = "09:00";
    
    @Column(name = "working_hours_end", nullable = false)
    private String workingHoursEnd = "17:00";

    protected WorkingCalendar() {
        // Default constructor for JPA
    }

    public WorkingCalendar(String timezone, String workingDays, Integer workingHoursPerDay, 
                          String workingHoursStart, String workingHoursEnd) {
        this.timezone = timezone;
        this.workingDays = workingDays;
        this.workingHoursPerDay = workingHoursPerDay;
        this.workingHoursStart = workingHoursStart;
        this.workingHoursEnd = workingHoursEnd;
    }

    public static WorkingCalendar defaultCalendar() {
        return new WorkingCalendar();
    }

    public ZoneId getZoneId() {
        return ZoneId.of(timezone);
    }

    // Getters
    public String getTimezone() {
        return timezone;
    }

    public String getWorkingDays() {
        return workingDays;
    }

    public Integer getWorkingHoursPerDay() {
        return workingHoursPerDay;
    }

    public String getWorkingHoursStart() {
        return workingHoursStart;
    }

    public String getWorkingHoursEnd() {
        return workingHoursEnd;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        WorkingCalendar that = (WorkingCalendar) o;
        return Objects.equals(timezone, that.timezone) &&
               Objects.equals(workingDays, that.workingDays) &&
               Objects.equals(workingHoursPerDay, that.workingHoursPerDay) &&
               Objects.equals(workingHoursStart, that.workingHoursStart) &&
               Objects.equals(workingHoursEnd, that.workingHoursEnd);
    }

    @Override
    public int hashCode() {
        return Objects.hash(timezone, workingDays, workingHoursPerDay, workingHoursStart, workingHoursEnd);
    }

    @Override
    public String toString() {
        return "WorkingCalendar{" +
               "timezone='" + timezone + '\'' +
               ", workingDays='" + workingDays + '\'' +
               ", workingHoursPerDay=" + workingHoursPerDay +
               ", workingHoursStart='" + workingHoursStart + '\'' +
               ", workingHoursEnd='" + workingHoursEnd + '\'' +
               '}';
    }
}