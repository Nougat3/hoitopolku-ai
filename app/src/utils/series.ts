import type { BpMeasurement, MetricMeasurement } from '@/types/database';
import type { DataPoint } from '@/utils/calculations';

const DAY_MS = 86_400_000;

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function dayIndex(measuredAt: string, origin: Date): number {
  const d = startOfDay(new Date(measuredAt));
  const o = startOfDay(origin);
  return Math.round((d.getTime() - o.getTime()) / DAY_MS);
}

export function bpToSeries(rows: BpMeasurement[], origin: Date): DataPoint[] {
  return rows.map((r) => ({
    d: dayIndex(r.measured_at, origin),
    v: r.sys
  }));
}

export function metricToSeries(
  rows: MetricMeasurement[],
  origin: Date,
  metric: string
): DataPoint[] {
  return rows
    .filter((r) => r.metric === metric)
    .map((r) => ({
      d: dayIndex(r.measured_at, origin),
      v: r.value
    }));
}

export function rollingAvgLast7(points: DataPoint[]): number | null {
  if (!points.length) return null;
  const lastD = points[points.length - 1].d;
  const window = points.filter((p) => p.d > lastD - 7 && p.d <= lastD);
  if (!window.length) return null;
  return window.reduce((s, p) => s + p.v, 0) / window.length;
}
