/**
 * Mathematical and calculation utilities
 * Migrated from hoitopolku-demo.html and laakaripro.html
 * These are pure functions - no side effects, easy to test
 */

export interface DataPoint {
  d: number; // day index
  v: number; // value
}

/**
 * Calculate 7-day rolling average
 * Used for blood pressure, glucose trends
 */
export function rolling(points: DataPoint[], window = 7): DataPoint[] {
  const DAYS = Math.max(...points.map(p => p.d)) + 1;
  const out: DataPoint[] = [];
  
  for (let d = window - 1; d < DAYS; d++) {
    const windowPoints = points.filter(p => p.d > d - window && p.d <= d);
    if (windowPoints.length >= Math.ceil(window * 0.7)) { // At least 70% of window
      const avg = windowPoints.reduce((sum, p) => sum + p.v, 0) / windowPoints.length;
      out.push({ d, v: avg });
    }
  }
  
  return out;
}

/**
 * Calculate linear regression and project future values
 * Returns null if not enough data points
 */
export function project(
  points: DataPoint[],
  lastN: number
): { slope: number; at: (d: number) => number } | null {
  const L = points.slice(-lastN);
  if (L.length < 5) return null;

  const mx = L.reduce((sum, p) => sum + p.d, 0) / L.length;
  const my = L.reduce((sum, p) => sum + p.v, 0) / L.length;

  let num = 0;
  let den = 0;
  L.forEach(p => {
    num += (p.d - mx) * (p.v - my);
    den += (p.d - mx) ** 2;
  });

  if (den === 0) return null;

  const slope = num / den;
  const intercept = my - slope * mx;

  return {
    slope,
    at: (d: number) => slope * d + intercept
  };
}

/**
 * Determine tile state based on current value vs target
 */
export function tileState(
  target: number | undefined,
  currentValue: number,
  initialValue: number,
  decimal: boolean
): { status: 'ok' | 'mid' | 'off'; label: string } {
  if (target && currentValue <= target) {
    return { status: 'ok', label: 'Tavoitteessa' };
  }

  const change = initialValue - currentValue;
  const threshold = decimal ? 0.2 : 2;

  if (change > threshold) {
    return { status: 'mid', label: 'Laskusuunnassa' };
  }

  return { status: 'off', label: 'Ei laskusuuntaa' };
}

/**
 * Calculate how many days in the last 7 have measurements
 */
export function measurementProgress(
  measurements: DataPoint[],
  todayIndex: number,
  window = 7
): number {
  let count = 0;
  for (let d = todayIndex - (window - 1); d <= todayIndex; d++) {
    if (measurements.some(m => m.d === d)) {
      count++;
    }
  }
  return count;
}

/**
 * Generate series data for a metric
 * Either raw data or rolling average depending on metric type
 */
export function series(
  data: DataPoint[],
  useDense: boolean
): DataPoint[] {
  return useDense ? rolling(data) : data.map(p => ({ d: p.d, v: p.v }));
}
