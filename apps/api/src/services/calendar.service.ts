// ABOUTME: Service for working time calculation and calendar management
// ABOUTME: Handles working hours, holidays, weekends, and timezone conversions

import {
  addDays,
  addMinutes,
  isBefore,
  isAfter,
  isEqual,
  format,
  eachDayOfInterval,
} from "date-fns";
import { utcToZonedTime, formatInTimeZone } from "date-fns-tz";
import { prisma } from "@/lib/prisma";
import { BaseService } from "./base.service";

export interface WorkingHours {
  start: string; // "09:00"
  end: string; // "17:00"
}

export interface CalendarConfig {
  timezone: string;
  workingDaysOfWeek: string; // "MTWTFSS" - M=1, T=2, W=3, T=4, F=5, S=6, S=7
  workingHours: WorkingHours[];
}

export interface WorkingTimeRange {
  start: Date;
  end: Date;
  workingHours: number;
}

const DAYS_OF_WEEK = ["S", "M", "T", "W", "T", "F", "S"]; // 0=Sun, 1=Mon, etc.

export class CalendarService extends BaseService {
  private calendarCache: Map<string, CalendarConfig> = new Map();
  private holidayCache: Map<string, Set<string>> = new Map(); // org -> set of "YYYY-MM-DD"

  /**
   * Get calendar configuration for an organisation
   */
  async getOrganisationCalendar(organisationId: string): Promise<CalendarConfig> {
    // Check cache first
    if (this.calendarCache.has(organisationId)) {
      return this.calendarCache.get(organisationId)!;
    }

    try {
      const org = await prisma.organisation.findUnique({
        where: { id: organisationId },
      });

      if (!org) {
        throw new Error("Organisation not found");
      }

      const config: CalendarConfig = {
        timezone: org.timezone,
        workingDaysOfWeek: org.workingDaysOfWeek,
        workingHours: org.workingHours as WorkingHours[],
      };

      this.calendarCache.set(organisationId, config);
      return config;
    } catch (error) {
      throw this.handlePrismaError(error);
    }
  }

  /**
   * Get holidays for an organisation
   */
  async getOrganisationHolidays(organisationId: string): Promise<Date[]> {
    try {
      const holidays = await prisma.holiday.findMany({
        where: { organisationId },
      });

      return holidays.map((h) => h.date);
    } catch (error) {
      throw this.handlePrismaError(error);
    }
  }

  /**
   * Check if a date is a holiday
   */
  async isHoliday(date: Date, organisationId: string): Promise<boolean> {
    try {
      const dateStr = format(date, "yyyy-MM-dd");

      // Check cache first
      if (!this.holidayCache.has(organisationId)) {
        const holidays = await this.getOrganisationHolidays(organisationId);
        const holidaySet = new Set(holidays.map((d) => format(d, "yyyy-MM-dd")));
        this.holidayCache.set(organisationId, holidaySet);
      }

      const holidaySet = this.holidayCache.get(organisationId)!;
      return holidaySet.has(dateStr);
    } catch (error) {
      throw this.handlePrismaError(error);
    }
  }

  /**
   * Check if a date is a working day (not weekend, not holiday)
   */
  async isWorkingDay(date: Date, calendar: CalendarConfig, organisationId: string): Promise<boolean> {
    // Check if weekend
    const dayOfWeek = date.getDay(); // 0=Sun, 1=Mon, etc.
    const dayChar = DAYS_OF_WEEK[dayOfWeek];
    const isWorkingDayOfWeek = calendar.workingDaysOfWeek.includes(dayChar);

    if (!isWorkingDayOfWeek) {
      return false;
    }

    // Check if holiday
    return !(await this.isHoliday(date, organisationId));
  }

  /**
   * Check if a specific time is within working hours
   */
  isWorkingTime(dateTime: Date, calendar: CalendarConfig): boolean {
    const timeStr = format(dateTime, "HH:mm");

    for (const hours of calendar.workingHours) {
      if (timeStr >= hours.start && timeStr < hours.end) {
        return true;
      }
    }

    return false;
  }

  /**
   * Get total working hours in a day for the calendar
   */
  getTotalWorkingHoursInDay(calendar: CalendarConfig): number {
    let totalMinutes = 0;

    for (const hours of calendar.workingHours) {
      const [startHour, startMin] = hours.start.split(":").map(Number);
      const [endHour, endMin] = hours.end.split(":").map(Number);

      const startTotalMin = startHour * 60 + startMin;
      const endTotalMin = endHour * 60 + endMin;

      totalMinutes += endTotalMin - startTotalMin;
    }

    return totalMinutes / 60;
  }

  /**
   * Get the next working time from a given datetime
   */
  async getNextWorkingTime(
    dateTime: Date,
    calendar: CalendarConfig,
    organisationId: string
  ): Promise<Date> {
    let current = new Date(dateTime);
    const maxIterations = 365; // Prevent infinite loops
    let iterations = 0;

    while (iterations < maxIterations) {
      const isWorking = await this.isWorkingDay(current, calendar, organisationId);

      if (isWorking && this.isWorkingTime(current, calendar)) {
        return current;
      }

      // Move forward by 15 minutes
      current = addMinutes(current, 15);
      iterations++;
    }

    throw new Error("Could not find next working time within 365 days");
  }

  /**
   * Get the previous working time from a given datetime
   */
  async getPreviousWorkingTime(
    dateTime: Date,
    calendar: CalendarConfig,
    organisationId: string
  ): Promise<Date> {
    let current = new Date(dateTime);
    const maxIterations = 365;
    let iterations = 0;

    while (iterations < maxIterations) {
      const isWorking = await this.isWorkingDay(current, calendar, organisationId);

      if (isWorking && this.isWorkingTime(current, calendar)) {
        return current;
      }

      // Move backward by 15 minutes
      current = addMinutes(current, -15);
      iterations++;
    }

    throw new Error("Could not find previous working time within 365 days");
  }

  /**
   * Calculate working duration between two dates (in hours)
   * Excludes weekends, holidays, and non-working hours
   */
  async calculateWorkingDuration(
    start: Date,
    end: Date,
    calendar: CalendarConfig,
    organisationId: string
  ): Promise<number> {
    if (isAfter(start, end)) {
      return 0;
    }

    if (isEqual(start, end)) {
      return 0;
    }

    let current = new Date(start);
    let totalMinutes = 0;

    // Iterate through each day
    while (isBefore(current, end)) {
      const isWorking = await this.isWorkingDay(current, calendar, organisationId);

      if (isWorking) {
        // Get working hours for this day
        for (const hours of calendar.workingHours) {
          const [startHour, startMin] = hours.start.split(":").map(Number);
          const [endHour, endMin] = hours.end.split(":").map(Number);

          const dayStart = new Date(current);
          dayStart.setHours(startHour, startMin, 0, 0);

          const dayEnd = new Date(current);
          dayEnd.setHours(endHour, endMin, 0, 0);

          // Calculate overlap with requested range
          const rangeStart = isBefore(current, start) ? start : current;
          const rangeEnd = isBefore(end, dayEnd) ? end : dayEnd;

          if (isBefore(rangeStart, rangeEnd)) {
            const actualStart = isBefore(dayStart, rangeStart) ? rangeStart : dayStart;
            const actualEnd = isAfter(dayEnd, rangeEnd) ? rangeEnd : dayEnd;

            if (isBefore(actualStart, actualEnd)) {
              totalMinutes += (actualEnd.getTime() - actualStart.getTime()) / (1000 * 60);
            }
          }
        }
      }

      current = addDays(current, 1);
      current.setHours(0, 0, 0, 0);
    }

    return totalMinutes / 60;
  }

  /**
   * Add working time (in hours) to a start date
   * Respects working calendar, weekends, holidays, and working hours
   */
  async addWorkingTime(
    start: Date,
    hours: number,
    calendar: CalendarConfig,
    organisationId: string
  ): Promise<Date> {
    let current = new Date(start);
    let remainingMinutes = hours * 60;

    const maxIterations = 365 * 24; // Safety limit
    let iterations = 0;

    while (remainingMinutes > 0 && iterations < maxIterations) {
      const isWorking = await this.isWorkingDay(current, calendar, organisationId);

      if (isWorking && this.isWorkingTime(current, calendar)) {
        // Find which working hour block we're in
        const timeStr = format(current, "HH:mm");
        let minutesAddedThisBlock = 0;

        for (const hours of calendar.workingHours) {
          if (timeStr >= hours.start && timeStr < hours.end) {
            const [endHour, endMin] = hours.end.split(":").map(Number);
            const endTime = new Date(current);
            endTime.setHours(endHour, endMin, 0, 0);

            const minutesToEndOfBlock = Math.floor(
              (endTime.getTime() - current.getTime()) / (1000 * 60)
            );

            if (minutesToEndOfBlock >= remainingMinutes) {
              // We can finish within this block
              current = addMinutes(current, remainingMinutes);
              remainingMinutes = 0;
            } else {
              // Use up this block
              remainingMinutes -= minutesToEndOfBlock;
              minutesAddedThisBlock = minutesToEndOfBlock;
              current = addMinutes(current, minutesAddedThisBlock);
            }

            break;
          }
        }

        // If no minutes were added this iteration, move to next working time
        if (minutesAddedThisBlock === 0 && remainingMinutes > 0) {
          current = await this.getNextWorkingTime(current, calendar, organisationId);
        }
      } else {
        // Not working time, move to next working time
        current = await this.getNextWorkingTime(current, calendar, organisationId);
      }

      iterations++;
    }

    if (remainingMinutes > 0) {
      throw new Error(
        `Could not add ${hours} hours within 365 days. Only added ${hours - remainingMinutes / 60} hours.`
      );
    }

    return current;
  }

  /**
   * Get all working days in a date range
   */
  async getWorkingDaysInRange(
    start: Date,
    end: Date,
    calendar: CalendarConfig,
    organisationId: string
  ): Promise<Date[]> {
    const days = eachDayOfInterval({ start, end });
    const workingDays: Date[] = [];

    for (const day of days) {
      const isWorking = await this.isWorkingDay(day, calendar, organisationId);
      if (isWorking) {
        workingDays.push(day);
      }
    }

    return workingDays;
  }

  /**
   * Snap a datetime to the nearest working time
   */
  async snapToWorkingTime(
    dateTime: Date,
    calendar: CalendarConfig,
    organisationId: string,
    direction: "forward" | "backward" = "forward"
  ): Promise<Date> {
    if (direction === "forward") {
      return this.getNextWorkingTime(dateTime, calendar, organisationId);
    } else {
      return this.getPreviousWorkingTime(dateTime, calendar, organisationId);
    }
  }

  /**
   * Convert datetime to organisation's timezone
   */
  convertToTimezone(date: Date, timezone: string): Date {
    return utcToZonedTime(date, timezone);
  }

  /**
   * Format date in organisation's timezone
   */
  formatInTimezone(date: Date, timezone: string, formatStr: string = "yyyy-MM-dd HH:mm:ss"): string {
    return formatInTimeZone(date, timezone, formatStr);
  }

  /**
   * Clear calendar cache (for testing or after updates)
   */
  clearCache(): void {
    this.calendarCache.clear();
    this.holidayCache.clear();
  }

  /**
   * Cache calendar after update
   */
  invalidateCache(organisationId?: string): void {
    if (organisationId) {
      this.calendarCache.delete(organisationId);
      this.holidayCache.delete(organisationId);
    } else {
      this.clearCache();
    }
  }
}

export const calendarService = new CalendarService();
