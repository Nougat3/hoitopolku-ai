/**
 * Formatting utilities
 * Migrated from demo - Finnish locale formatting
 */

/**
 * Format number with optional decimals
 * Replaces dot with comma for Finnish locale
 */
export function formatValue(value: number, decimals: boolean): string {
  if (decimals) {
    return value.toFixed(1).replace('.', ',');
  }
  return String(Math.round(value));
}

/**
 * Format date as dd.mm.yyyy
 */
export function formatDate(date: Date): string {
  return `${date.getDate()}.${date.getMonth() + 1}.${date.getFullYear()}`;
}

/**
 * Format time as HH.mm
 */
export function formatTime(date: Date = new Date()): string {
  return `${String(date.getHours()).padStart(2, '0')}.${String(date.getMinutes()).padStart(2, '0')}`;
}

/**
 * Parse Finnish-formatted number (comma as decimal separator)
 */
export function parseNumber(value: string): number | null {
  if (!value) return null;
  const normalized = value.replace(',', '.');
  const parsed = parseFloat(normalized);
  return isNaN(parsed) ? null : parsed;
}

/**
 * Format month name in Finnish
 */
export function formatMonthYear(date: Date): string {
  const months = [
    'tammikuu', 'helmikuu', 'maaliskuu', 'huhtikuu',
    'toukokuu', 'kesäkuu', 'heinäkuu', 'elokuu',
    'syyskuu', 'lokakuu', 'marraskuu', 'joulukuu'
  ];
  
  const month = months[date.getMonth()];
  return `${month.charAt(0).toUpperCase()}${month.slice(1)} ${date.getFullYear()}`;
}

/**
 * Format week number (ISO week)
 */
export function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}
