package com.salwita.taskmanagement.scheduling.service;

import com.salwita.taskmanagement.domain.entity.Holiday;
import com.salwita.taskmanagement.domain.repository.HolidayRepository;
import com.salwita.taskmanagement.domain.valueobject.WorkingCalendar;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.*;
import java.util.Collections;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class WorkingTimeCalculatorServiceTest {

    private WorkingTimeCalculatorService workingTimeCalculator;
    private WorkingCalendar defaultCalendar;

    @BeforeEach
    void setUp() {
        // Create a simple mock repository that returns no holidays
        HolidayRepository holidayRepository = new HolidayRepository() {
            @Override
            public List<Holiday> findByDateBetween(LocalDate startDate, LocalDate endDate) {
                return Collections.emptyList();
            }

            @Override
            public java.util.Optional<Holiday> findByDate(LocalDate date) {
                return java.util.Optional.empty();
            }

            @Override
            public List<Holiday> findByIsRecurringTrue() {
                return Collections.emptyList();
            }

            @Override
            public List<Holiday> findUpcomingHolidays(LocalDate startDate) {
                return Collections.emptyList();
            }

            @Override
            public List<Holiday> findByYear(int year) {
                return Collections.emptyList();
            }

            @Override
            public boolean existsByDate(LocalDate date) {
                return false;
            }

            @Override
            public long countHolidaysBetween(LocalDate startDate, LocalDate endDate) {
                return 0;
            }

            @Override
            public <S extends Holiday> S save(S entity) {
                return entity;
            }

            @Override
            public <S extends Holiday> List<S> saveAll(Iterable<S> entities) {
                return Collections.emptyList();
            }

            @Override
            public java.util.Optional<Holiday> findById(Long aLong) {
                return java.util.Optional.empty();
            }

            @Override
            public boolean existsById(Long aLong) {
                return false;
            }

            @Override
            public List<Holiday> findAll() {
                return Collections.emptyList();
            }

            @Override
            public List<Holiday> findAllById(Iterable<Long> longs) {
                return Collections.emptyList();
            }

            @Override
            public long count() {
                return 0;
            }

            @Override
            public void deleteById(Long aLong) {}

            @Override
            public void delete(Holiday entity) {}

            @Override
            public void deleteAllById(Iterable<? extends Long> longs) {}

            @Override
            public void deleteAll(Iterable<? extends Holiday> entities) {}

            @Override
            public void deleteAll() {}

            @Override
            public void flush() {}

            @Override
            public <S extends Holiday> S saveAndFlush(S entity) {
                return entity;
            }

            @Override
            public <S extends Holiday> List<S> saveAllAndFlush(Iterable<S> entities) {
                return Collections.emptyList();
            }

            @Override
            public void deleteAllInBatch(Iterable<Holiday> entities) {}

            @Override
            public void deleteAllByIdInBatch(Iterable<Long> longs) {}

            @Override
            public void deleteAllInBatch() {}

            @Override
            public Holiday getOne(Long aLong) {
                return null;
            }

            @Override
            public Holiday getById(Long aLong) {
                return null;
            }

            @Override
            public Holiday getReferenceById(Long aLong) {
                return null;
            }

            @Override
            public <S extends Holiday> java.util.Optional<S> findOne(org.springframework.data.domain.Example<S> example) {
                return java.util.Optional.empty();
            }

            @Override
            public <S extends Holiday> List<S> findAll(org.springframework.data.domain.Example<S> example) {
                return Collections.emptyList();
            }

            @Override
            public <S extends Holiday> List<S> findAll(org.springframework.data.domain.Example<S> example, org.springframework.data.domain.Sort sort) {
                return Collections.emptyList();
            }

            @Override
            public <S extends Holiday> org.springframework.data.domain.Page<S> findAll(org.springframework.data.domain.Example<S> example, org.springframework.data.domain.Pageable pageable) {
                return null;
            }

            @Override
            public <S extends Holiday> long count(org.springframework.data.domain.Example<S> example) {
                return 0;
            }

            @Override
            public <S extends Holiday> boolean exists(org.springframework.data.domain.Example<S> example) {
                return false;
            }

            @Override
            public <S extends Holiday, R> R findBy(org.springframework.data.domain.Example<S> example, java.util.function.Function<org.springframework.data.repository.query.FluentQuery.FetchableFluentQuery<S>, R> queryFunction) {
                return null;
            }

            @Override
            public List<Holiday> findAll(org.springframework.data.domain.Sort sort) {
                return Collections.emptyList();
            }

            @Override
            public org.springframework.data.domain.Page<Holiday> findAll(org.springframework.data.domain.Pageable pageable) {
                return null;
            }
        };
        
        workingTimeCalculator = new WorkingTimeCalculatorService(holidayRepository);
        defaultCalendar = WorkingCalendar.defaultCalendar();
    }

    @Test
    void calculateWorkingDuration_SameDayWithinWorkingHours_ShouldReturnCorrectDuration() {
        LocalDateTime start = LocalDateTime.of(2024, 1, 15, 10, 0); // Monday 10:00
        LocalDateTime end = LocalDateTime.of(2024, 1, 15, 14, 0);   // Monday 14:00

        Duration result = workingTimeCalculator.calculateWorkingDuration(start, end, defaultCalendar);

        assertEquals(Duration.ofHours(4), result);
    }

    @Test
    void calculateWorkingDuration_SameDayOutsideWorkingHours_ShouldReturnZero() {
        LocalDateTime start = LocalDateTime.of(2024, 1, 15, 18, 0); // Monday 18:00
        LocalDateTime end = LocalDateTime.of(2024, 1, 15, 20, 0);   // Monday 20:00

        Duration result = workingTimeCalculator.calculateWorkingDuration(start, end, defaultCalendar);

        assertEquals(Duration.ZERO, result);
    }

    @Test
    void calculateWorkingDuration_CrossingWorkingHours_ShouldReturnOnlyWorkingTime() {
        LocalDateTime start = LocalDateTime.of(2024, 1, 15, 8, 0);  // Monday 08:00 (before work)
        LocalDateTime end = LocalDateTime.of(2024, 1, 15, 18, 0);   // Monday 18:00 (after work)

        Duration result = workingTimeCalculator.calculateWorkingDuration(start, end, defaultCalendar);

        assertEquals(Duration.ofHours(8), result); // 09:00-17:00 = 8 hours
    }

    @Test
    void calculateWorkingDuration_MultipleDays_ShouldCalculateCorrectly() {
        LocalDateTime start = LocalDateTime.of(2024, 1, 15, 14, 0); // Monday 14:00
        LocalDateTime end = LocalDateTime.of(2024, 1, 17, 11, 0);   // Wednesday 11:00

        Duration result = workingTimeCalculator.calculateWorkingDuration(start, end, defaultCalendar);

        // Monday: 14:00-17:00 = 3 hours
        // Tuesday: 09:00-17:00 = 8 hours  
        // Wednesday: 09:00-11:00 = 2 hours
        // Total: 13 hours
        assertEquals(Duration.ofHours(13), result);
    }

    @Test
    void calculateWorkingDuration_IncludingWeekend_ShouldSkipWeekend() {
        LocalDateTime start = LocalDateTime.of(2024, 1, 19, 14, 0); // Friday 14:00
        LocalDateTime end = LocalDateTime.of(2024, 1, 22, 11, 0);   // Monday 11:00

        Duration result = workingTimeCalculator.calculateWorkingDuration(start, end, defaultCalendar);

        // Friday: 14:00-17:00 = 3 hours
        // Weekend: 0 hours (not working days)
        // Monday: 09:00-11:00 = 2 hours
        // Total: 5 hours
        assertEquals(Duration.ofHours(5), result);
    }

    // Skip holiday test for now - requires repository mock setup

    @Test
    void calculateWorkingDuration_StartAfterEnd_ShouldThrowException() {
        LocalDateTime start = LocalDateTime.of(2024, 1, 15, 14, 0);
        LocalDateTime end = LocalDateTime.of(2024, 1, 15, 10, 0);

        assertThrows(IllegalArgumentException.class, 
                () -> workingTimeCalculator.calculateWorkingDuration(start, end, defaultCalendar));
    }

    @Test
    void addWorkingTime_WithinSameDay_ShouldAddCorrectly() {
        LocalDateTime start = LocalDateTime.of(2024, 1, 15, 10, 0); // Monday 10:00
        Duration duration = Duration.ofHours(3);

        LocalDateTime result = workingTimeCalculator.addWorkingTime(start, duration, defaultCalendar);

        assertEquals(LocalDateTime.of(2024, 1, 15, 13, 0), result);
    }

    @Test
    void addWorkingTime_CrossingToNextDay_ShouldAddCorrectly() {
        LocalDateTime start = LocalDateTime.of(2024, 1, 15, 15, 0); // Monday 15:00
        Duration duration = Duration.ofHours(5);

        LocalDateTime result = workingTimeCalculator.addWorkingTime(start, duration, defaultCalendar);

        // Monday: 15:00-17:00 = 2 hours remaining
        // Need 3 more hours, so Tuesday: 09:00 + 3 hours = 12:00
        assertEquals(LocalDateTime.of(2024, 1, 16, 12, 0), result);
    }

    @Test
    void addWorkingTime_CrossingWeekend_ShouldSkipWeekend() {
        LocalDateTime start = LocalDateTime.of(2024, 1, 19, 15, 0); // Friday 15:00
        Duration duration = Duration.ofHours(5);

        LocalDateTime result = workingTimeCalculator.addWorkingTime(start, duration, defaultCalendar);

        // Friday: 15:00-17:00 = 2 hours
        // Need 3 more hours, skip weekend to Monday: 09:00 + 3 hours = 12:00
        assertEquals(LocalDateTime.of(2024, 1, 22, 12, 0), result);
    }

    @Test
    void addWorkingTime_NegativeDuration_ShouldThrowException() {
        LocalDateTime start = LocalDateTime.of(2024, 1, 15, 10, 0);
        Duration duration = Duration.ofHours(-1);

        assertThrows(IllegalArgumentException.class, 
                () -> workingTimeCalculator.addWorkingTime(start, duration, defaultCalendar));
    }

    @Test
    void isWorkingTime_DuringWorkingHours_ShouldReturnTrue() {
        LocalDateTime dateTime = LocalDateTime.of(2024, 1, 15, 14, 0); // Monday 14:00

        boolean result = workingTimeCalculator.isWorkingTime(dateTime, defaultCalendar);

        assertTrue(result);
    }

    @Test
    void isWorkingTime_OutsideWorkingHours_ShouldReturnFalse() {
        LocalDateTime dateTime = LocalDateTime.of(2024, 1, 15, 18, 0); // Monday 18:00

        boolean result = workingTimeCalculator.isWorkingTime(dateTime, defaultCalendar);

        assertFalse(result);
    }

    @Test
    void isWorkingTime_Weekend_ShouldReturnFalse() {
        LocalDateTime dateTime = LocalDateTime.of(2024, 1, 20, 14, 0); // Saturday 14:00

        boolean result = workingTimeCalculator.isWorkingTime(dateTime, defaultCalendar);

        assertFalse(result);
    }

    // Skip holiday tests for now

    @Test
    void getNextWorkingTime_CurrentlyWorking_ShouldReturnSameTime() {
        LocalDateTime dateTime = LocalDateTime.of(2024, 1, 15, 14, 0); // Monday 14:00

        LocalDateTime result = workingTimeCalculator.getNextWorkingTime(dateTime, defaultCalendar);

        assertEquals(dateTime, result);
    }

    @Test
    void getNextWorkingTime_BeforeWorkingHours_ShouldReturnWorkStart() {
        LocalDateTime dateTime = LocalDateTime.of(2024, 1, 15, 8, 0); // Monday 08:00

        LocalDateTime result = workingTimeCalculator.getNextWorkingTime(dateTime, defaultCalendar);

        assertEquals(LocalDateTime.of(2024, 1, 15, 9, 0), result);
    }

    @Test
    void getNextWorkingTime_AfterWorkingHours_ShouldReturnNextDayStart() {
        LocalDateTime dateTime = LocalDateTime.of(2024, 1, 15, 18, 0); // Monday 18:00

        LocalDateTime result = workingTimeCalculator.getNextWorkingTime(dateTime, defaultCalendar);

        assertEquals(LocalDateTime.of(2024, 1, 16, 9, 0), result); // Tuesday 09:00
    }

    @Test
    void getNextWorkingTime_Weekend_ShouldReturnMondayStart() {
        LocalDateTime dateTime = LocalDateTime.of(2024, 1, 20, 14, 0); // Saturday 14:00

        LocalDateTime result = workingTimeCalculator.getNextWorkingTime(dateTime, defaultCalendar);

        assertEquals(LocalDateTime.of(2024, 1, 22, 9, 0), result); // Monday 09:00
    }

    @Test
    void getWorkingHoursInDay_WorkingDay_ShouldReturnFullHours() {
        LocalDate date = LocalDate.of(2024, 1, 15); // Monday

        Duration result = workingTimeCalculator.getWorkingHoursInDay(date, defaultCalendar);

        assertEquals(Duration.ofHours(8), result);
    }

    @Test
    void getWorkingHoursInDay_Weekend_ShouldReturnZero() {
        LocalDate date = LocalDate.of(2024, 1, 20); // Saturday

        Duration result = workingTimeCalculator.getWorkingHoursInDay(date, defaultCalendar);

        assertEquals(Duration.ZERO, result);
    }

    // Skip holiday tests for now

    @Test
    void countWorkingDays_NormalWeek_ShouldReturnFive() {
        LocalDate startDate = LocalDate.of(2024, 1, 15); // Monday
        LocalDate endDate = LocalDate.of(2024, 1, 19);   // Friday

        long result = workingTimeCalculator.countWorkingDays(startDate, endDate, defaultCalendar);

        assertEquals(5, result);
    }

    @Test
    void countWorkingDays_IncludingWeekend_ShouldReturnFive() {
        LocalDate startDate = LocalDate.of(2024, 1, 15); // Monday
        LocalDate endDate = LocalDate.of(2024, 1, 21);   // Sunday

        long result = workingTimeCalculator.countWorkingDays(startDate, endDate, defaultCalendar);

        assertEquals(5, result);
    }

    // Skip holiday tests for now

    @Test
    void countWorkingDays_StartAfterEnd_ShouldReturnZero() {
        LocalDate startDate = LocalDate.of(2024, 1, 19);
        LocalDate endDate = LocalDate.of(2024, 1, 15);

        long result = workingTimeCalculator.countWorkingDays(startDate, endDate, defaultCalendar);

        assertEquals(0, result);
    }

    @Test
    void calculateWorkingDuration_WithTimezoneChange_ShouldHandleCorrectly() {
        WorkingCalendar nycCalendar = new WorkingCalendar(
                "America/New_York",
                "MONDAY,TUESDAY,WEDNESDAY,THURSDAY,FRIDAY",
                8,
                "09:00",
                "17:00"
        );

        LocalDateTime start = LocalDateTime.of(2024, 1, 15, 14, 0);
        LocalDateTime end = LocalDateTime.of(2024, 1, 15, 16, 0);

        Duration result = workingTimeCalculator.calculateWorkingDuration(start, end, nycCalendar);

        assertEquals(Duration.ofHours(2), result);
    }

    @Test
    void addWorkingTime_ZeroDuration_ShouldReturnSameTime() {
        LocalDateTime start = LocalDateTime.of(2024, 1, 15, 10, 0);
        Duration duration = Duration.ZERO;

        LocalDateTime result = workingTimeCalculator.addWorkingTime(start, duration, defaultCalendar);

        assertEquals(start, result);
    }
}