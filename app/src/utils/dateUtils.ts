/**
 * Date utilities for care path calculations
 */

/**
 * Check if two dates are the same day
 */
export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/**
 * Get day index from care path start date
 */
export function getDayIndex(carePathStart: Date, date: Date): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  const diff = date.getTime() - carePathStart.getTime();
  return Math.floor(diff / msPerDay);
}

/**
 * Get date from day index
 */
export function getDateFromIndex(carePathStart: Date, dayIndex: number): Date {
  const date = new Date(carePathStart);
  date.setDate(date.getDate() + dayIndex);
  return date;
}

/**
 * Add days to a date
 */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Get days between two dates
 */
export function daysBetween(start: Date, end: Date): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.floor((end.getTime() - start.getTime()) / msPerDay);
}
