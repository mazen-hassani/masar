package com.salwita.taskmanagement.domain.service;

import com.salwita.taskmanagement.domain.valueobject.WorkingCalendar;

import java.time.Duration;
import java.time.LocalDateTime;

/**
 * Interface for working time calculations.
 * Implementation will be provided by the scheduling-engine module.
 */
public interface WorkingTimeCalculator {
    
    /**
     * Calculate working duration between two dates, excluding weekends/holidays/non-working hours
     */
    Duration calculateWorkingDuration(LocalDateTime startTime, LocalDateTime endTime, WorkingCalendar calendar);
    
    /**
     * Add working time to a start date
     */
    LocalDateTime addWorkingTime(LocalDateTime startTime, Duration duration, WorkingCalendar calendar);
    
    /**
     * Check if a datetime falls within working hours
     */
    boolean isWorkingTime(LocalDateTime dateTime, WorkingCalendar calendar);
    
    /**
     * Find the next working time after the given datetime
     */
    LocalDateTime getNextWorkingTime(LocalDateTime dateTime, WorkingCalendar calendar);
    
    /**
     * Get working hours duration for a specific day
     */
    Duration getWorkingHoursInDay(java.time.LocalDate date, WorkingCalendar calendar);
    
    /**
     * Count working days between two dates
     */
    long countWorkingDays(java.time.LocalDate startDate, java.time.LocalDate endDate, WorkingCalendar calendar);
    
    /**
     * Subtract working time from a start date
     */
    LocalDateTime subtractWorkingTime(LocalDateTime startTime, Duration duration, WorkingCalendar calendar);
}