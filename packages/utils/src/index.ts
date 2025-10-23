// ABOUTME: Shared utility functions for frontend and backend
// ABOUTME: Common helpers for date handling, formatting, API communication

/**
 * Format a date to ISO string
 */
export const formatDateToISO = (date: Date): string => {
  return date.toISOString();
};

/**
 * Parse ISO string to Date
 */
export const parseISOToDate = (iso: string): Date => {
  return new Date(iso);
};

/**
 * Get error message from various error types
 */
export const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  return String(error);
};

/**
 * Check if API call was successful
 */
export const isSuccess = (status: number): boolean => {
  return status >= 200 && status < 300;
};

/**
 * Generate CUID-like ID for temporary use
 */
export const generateId = (): string => {
  return Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
};
