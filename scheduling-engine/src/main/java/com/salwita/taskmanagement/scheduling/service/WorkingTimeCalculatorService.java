package com.salwita.taskmanagement.scheduling.service;

import com.salwita.taskmanagement.domain.entity.Holiday;
import com.salwita.taskmanagement.domain.repository.HolidayRepository;
import com.salwita.taskmanagement.domain.service.WorkingTimeCalculator;
import com.salwita.taskmanagement.domain.valueobject.WorkingCalendar;
import com.salwita.taskmanagement.domain.valueobject.WorkingTimeRange;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.time.*;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class WorkingTimeCalculatorService implements WorkingTimeCalculator {

    private final HolidayRepository holidayRepository;
    
    @Autowired
    public WorkingTimeCalculatorService(HolidayRepository holidayRepository) {
        this.holidayRepository = holidayRepository;
    }

    public Duration calculateWorkingDuration(LocalDateTime startTime, LocalDateTime endTime, WorkingCalendar calendar) {
        if (startTime.isAfter(endTime)) {
            throw new IllegalArgumentException("Start time must be before or equal to end time");
        }

        ZoneId zoneId = calendar.getZoneId();
        ZonedDateTime start = startTime.atZone(zoneId);
        ZonedDateTime end = endTime.atZone(zoneId);
        
        Set<LocalDate> holidays = getHolidays(start.toLocalDate(), end.toLocalDate());
        Set<DayOfWeek> workingDays = parseWorkingDays(calendar.getWorkingDays());
        WorkingTimeRange workingHours = parseWorkingHours(calendar.getWorkingHoursStart(), calendar.getWorkingHoursEnd());
        
        Duration totalDuration = Duration.ZERO;
        LocalDate currentDate = start.toLocalDate();
        
        while (!currentDate.isAfter(end.toLocalDate())) {
            if (isWorkingDay(currentDate, workingDays, holidays)) {
                LocalDateTime dayStart = currentDate.atTime(workingHours.getStartTime());
                LocalDateTime dayEnd = currentDate.atTime(workingHours.getEndTime());
                
                LocalDateTime effectiveStart = dayStart;
                LocalDateTime effectiveEnd = dayEnd;
                
                if (currentDate.equals(start.toLocalDate())) {
                    effectiveStart = start.toLocalDateTime().isAfter(dayStart) ? start.toLocalDateTime() : dayStart;
                }
                
                if (currentDate.equals(end.toLocalDate())) {
                    effectiveEnd = end.toLocalDateTime().isBefore(dayEnd) ? end.toLocalDateTime() : dayEnd;
                }
                
                if (effectiveStart.isBefore(effectiveEnd)) {
                    totalDuration = totalDuration.plus(Duration.between(effectiveStart, effectiveEnd));
                }
            }
            
            currentDate = currentDate.plusDays(1);
        }
        
        return totalDuration;
    }

    public LocalDateTime addWorkingTime(LocalDateTime startTime, Duration duration, WorkingCalendar calendar) {
        if (duration.isNegative()) {
            throw new IllegalArgumentException("Duration must be positive");
        }
        
        ZoneId zoneId = calendar.getZoneId();
        ZonedDateTime current = startTime.atZone(zoneId);
        Duration remainingDuration = duration;
        
        Set<DayOfWeek> workingDays = parseWorkingDays(calendar.getWorkingDays());
        WorkingTimeRange workingHours = parseWorkingHours(calendar.getWorkingHoursStart(), calendar.getWorkingHoursEnd());
        
        while (remainingDuration.toMinutes() > 0) {
            LocalDate currentDate = current.toLocalDate();
            Set<LocalDate> holidays = getHolidays(currentDate, currentDate.plusDays(30));
            
            if (isWorkingDay(currentDate, workingDays, holidays)) {
                LocalDateTime dayStart = currentDate.atTime(workingHours.getStartTime());
                LocalDateTime dayEnd = currentDate.atTime(workingHours.getEndTime());
                
                LocalDateTime effectiveStart = current.toLocalDateTime().isAfter(dayStart) ? 
                    current.toLocalDateTime() : dayStart;
                
                if (effectiveStart.isBefore(dayEnd)) {
                    Duration availableTimeToday = Duration.between(effectiveStart, dayEnd);
                    
                    if (remainingDuration.compareTo(availableTimeToday) <= 0) {
                        return effectiveStart.plus(remainingDuration);
                    } else {
                        remainingDuration = remainingDuration.minus(availableTimeToday);
                    }
                }
            }
            
            current = current.toLocalDate().plusDays(1).atStartOfDay(zoneId);
        }
        
        return current.toLocalDateTime();
    }

    public boolean isWorkingTime(LocalDateTime dateTime, WorkingCalendar calendar) {
        ZoneId zoneId = calendar.getZoneId();
        ZonedDateTime zonedDateTime = dateTime.atZone(zoneId);
        LocalDate date = zonedDateTime.toLocalDate();
        LocalTime time = zonedDateTime.toLocalTime();
        
        Set<LocalDate> holidays = getHolidays(date, date);
        Set<DayOfWeek> workingDays = parseWorkingDays(calendar.getWorkingDays());
        WorkingTimeRange workingHours = parseWorkingHours(calendar.getWorkingHoursStart(), calendar.getWorkingHoursEnd());
        
        return isWorkingDay(date, workingDays, holidays) && 
               !time.isBefore(workingHours.getStartTime()) && 
               time.isBefore(workingHours.getEndTime());
    }

    public LocalDateTime getNextWorkingTime(LocalDateTime dateTime, WorkingCalendar calendar) {
        ZoneId zoneId = calendar.getZoneId();
        ZonedDateTime current = dateTime.atZone(zoneId);
        
        Set<DayOfWeek> workingDays = parseWorkingDays(calendar.getWorkingDays());
        WorkingTimeRange workingHours = parseWorkingHours(calendar.getWorkingHoursStart(), calendar.getWorkingHoursEnd());
        
        while (true) {
            LocalDate currentDate = current.toLocalDate();
            Set<LocalDate> holidays = getHolidays(currentDate, currentDate.plusDays(7));
            
            if (isWorkingDay(currentDate, workingDays, holidays)) {
                LocalTime currentTime = current.toLocalTime();
                LocalDateTime dayStart = currentDate.atTime(workingHours.getStartTime());
                
                if (currentTime.isBefore(workingHours.getStartTime())) {
                    return dayStart;
                } else if (currentTime.isBefore(workingHours.getEndTime())) {
                    return current.toLocalDateTime();
                }
            }
            
            current = current.toLocalDate().plusDays(1).atTime(workingHours.getStartTime()).atZone(zoneId);
        }
    }

    public Duration getWorkingHoursInDay(LocalDate date, WorkingCalendar calendar) {
        Set<LocalDate> holidays = getHolidays(date, date);
        Set<DayOfWeek> workingDays = parseWorkingDays(calendar.getWorkingDays());
        WorkingTimeRange workingHours = parseWorkingHours(calendar.getWorkingHoursStart(), calendar.getWorkingHoursEnd());
        
        if (isWorkingDay(date, workingDays, holidays)) {
            return Duration.between(workingHours.getStartTime(), workingHours.getEndTime());
        }
        
        return Duration.ZERO;
    }

    public long countWorkingDays(LocalDate startDate, LocalDate endDate, WorkingCalendar calendar) {
        if (startDate.isAfter(endDate)) {
            return 0;
        }
        
        Set<LocalDate> holidays = getHolidays(startDate, endDate);
        Set<DayOfWeek> workingDays = parseWorkingDays(calendar.getWorkingDays());
        
        return startDate.datesUntil(endDate.plusDays(1))
                .filter(date -> isWorkingDay(date, workingDays, holidays))
                .count();
    }

    public LocalDateTime subtractWorkingTime(LocalDateTime startTime, Duration duration, WorkingCalendar calendar) {
        if (duration.isNegative()) {
            throw new IllegalArgumentException("Duration must be positive");
        }
        
        ZoneId zoneId = calendar.getZoneId();
        ZonedDateTime current = startTime.atZone(zoneId);
        Duration remainingDuration = duration;
        
        Set<DayOfWeek> workingDays = parseWorkingDays(calendar.getWorkingDays());
        WorkingTimeRange workingHours = parseWorkingHours(calendar.getWorkingHoursStart(), calendar.getWorkingHoursEnd());
        
        while (remainingDuration.toMinutes() > 0) {
            LocalDate currentDate = current.toLocalDate();
            Set<LocalDate> holidays = getHolidays(currentDate.minusDays(30), currentDate);
            
            if (isWorkingDay(currentDate, workingDays, holidays)) {
                LocalDateTime dayStart = currentDate.atTime(workingHours.getStartTime());
                LocalDateTime dayEnd = currentDate.atTime(workingHours.getEndTime());
                
                LocalDateTime effectiveEnd = current.toLocalDateTime().isBefore(dayEnd) ? 
                    current.toLocalDateTime() : dayEnd;
                
                if (effectiveEnd.isAfter(dayStart)) {
                    Duration availableTimeToday = Duration.between(dayStart, effectiveEnd);
                    
                    if (remainingDuration.compareTo(availableTimeToday) <= 0) {
                        return effectiveEnd.minus(remainingDuration);
                    } else {
                        remainingDuration = remainingDuration.minus(availableTimeToday);
                    }
                }
            }
            
            current = current.toLocalDate().minusDays(1).atTime(workingHours.getEndTime()).atZone(zoneId);
        }
        
        return current.toLocalDateTime();
    }

    @Cacheable(value = "holidays", key = "#startDate + '_' + #endDate")
    private Set<LocalDate> getHolidays(LocalDate startDate, LocalDate endDate) {
        List<Holiday> holidays = holidayRepository.findByDateBetween(startDate, endDate);
        return holidays.stream()
                .map(Holiday::getDate)
                .collect(Collectors.toSet());
    }

    private Set<DayOfWeek> parseWorkingDays(String workingDaysStr) {
        return Set.of(workingDaysStr.split(","))
                .stream()
                .map(String::trim)
                .map(DayOfWeek::valueOf)
                .collect(Collectors.toSet());
    }

    private WorkingTimeRange parseWorkingHours(String startTime, String endTime) {
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("HH:mm");
        LocalTime start = LocalTime.parse(startTime, formatter);
        LocalTime end = LocalTime.parse(endTime, formatter);
        return new WorkingTimeRange(start, end);
    }

    private boolean isWorkingDay(LocalDate date, Set<DayOfWeek> workingDays, Set<LocalDate> holidays) {
        return workingDays.contains(date.getDayOfWeek()) && !holidays.contains(date);
    }
}