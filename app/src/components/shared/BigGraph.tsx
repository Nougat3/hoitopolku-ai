import { useMemo, useState } from 'react';
import type { DataPoint } from '@/utils/calculations';
import { project, series } from '@/utils/calculations';
import { smoothPath } from '@/utils/graphUtils';
import { formatValue } from '@/utils/formatting';

interface BigGraphProps {
  name: string;
  color: string;
  data: DataPoint[];
  target?: number;
  unit: string;
  dense?: boolean;
  decimals?: boolean;
}

type Range = 14 | 42 | 0;

export function BigGraph({
  name,
  color,
  data,
  target,
  unit,
  dense = true,
  decimals = false
}: BigGraphProps) {
  const [range, setRange] = useState<Range>(14);
  const today = data.length ? Math.max(...data.map((p) => p.d)) : 0;

  const chart = useMemo(() => {
    const W = 640;
    const H = 280;
    const PL = 36;
    const PR = 16;
    const PT = 24;
    const PB = 28;
    const dMin = dense && range ? Math.max(0, today - range + 1) : 0;
    const line = series(data, dense).filter((p) => p.d >= dMin);
    const raw = data.filter((p) => p.d >= dMin);
    const proj = dense ? project(series(data, true), 28) : null;
    let projEnd: number | null = null;
    if (proj && target !== undefined && proj.slope < -0.002) {
      for (let d = today + 1; d <= today + 56; d++) {
        if (proj.at(d) <= target) {
          projEnd = d;
          break;
        }
      }
    }
    const xEnd = projEnd ?? today;
    const allVals = raw.map((p) => p.v).concat(target !== undefined ? [target] : []);
    if (!allVals.length) return null;
    const mn = Math.min(...allVals);
    const mx = Math.max(...allVals);
    const pad = (mx - mn) * 0.14 || 1;
    const vMin = mn - pad;
    const vMax = mx + pad;
    const X = (d: number) => PL + ((d - dMin) / (xEnd - dMin || 1)) * (W - PL - PR);
    const Y = (v: number) => PT + ((vMax - v) / (vMax - vMin || 1)) * (H - PT - PB);
    const ty = target !== undefined ? Y(target) : null;

    let seg: DataPoint[] = [];
    const segs: DataPoint[][] = [];
    line.forEach((p, i) => {
      if (i && p.d - line[i - 1].d > (dense ? 2 : 14)) {
        segs.push(seg);
        seg = [];
      }
      seg.push(p);
    });
    if (seg.length) segs.push(seg);

    return { W, H, PL, PR, PT, PB, X, Y, ty, raw, segs, line, proj, projEnd, today };
  }, [data, dense, range, target, today]);

  if (!chart || !data.length) {
    return (
      <div className="rounded-2xl border border-[var(--line)] bg-white p-6 text-[var(--mid)]">
        Ei vielä mittauksia.
      </div>
    );
  }

  const last = chart.line[chart.line.length - 1];

  return (
    <div className="rounded-2xl border border-[var(--line)] bg-white p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
        <div>
          <h3 className="text-lg font-bold">{name}</h3>
          {last && (
            <p className="text-[var(--mid)] text-sm mt-0.5">
              Viimeisin {formatValue(last.v, decimals)} {unit}
              {target !== undefined && ` · tavoite ${formatValue(target, decimals)}`}
            </p>
          )}
        </div>
        <div className="flex gap-1 bg-[var(--g0)] rounded-full p-1">
          {(
            [
              [14, '14 vrk'],
              [42, '6 vk'],
              [0, 'Koko']
            ] as const
          ).map(([r, label]) => (
            <button
              key={label}
              type="button"
              className={`px-3 py-1.5 text-xs font-semibold rounded-full ${
                range === r ? 'bg-white shadow-sm' : 'text-[var(--mid)]'
              }`}
              onClick={() => setRange(r)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <svg viewBox={`0 0 ${chart.W} ${chart.H}`} className="w-full h-auto">
        {chart.ty !== null && (
          <>
            <rect
              x={0}
              y={chart.ty}
              width={chart.W}
              height={Math.max(0, chart.H - chart.PB - chart.ty)}
              fill="#4E7D3C"
              fillOpacity={0.08}
            />
            <line
              x1={0}
              y1={chart.ty}
              x2={chart.W}
              y2={chart.ty}
              stroke="#4E7D3C"
              strokeWidth={1.6}
              strokeDasharray="6 5"
              strokeOpacity={0.75}
            />
          </>
        )}
        {dense &&
          chart.raw.map((p) => (
            <circle key={`r-${p.d}-${p.v}`} cx={chart.X(p.d)} cy={chart.Y(p.v)} r={2} fill="#C9CDD2" />
          ))}
        {chart.segs.map((sg, i) => {
          if (sg.length < 2) return null;
          const P = sg.map((p) => ({ x: chart.X(p.d), y: chart.Y(p.v) }));
          return (
            <path
              key={i}
              d={smoothPath(P)}
              fill="none"
              stroke={color}
              strokeWidth={2.8}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          );
        })}
        {last && (
          <circle cx={chart.X(last.d)} cy={chart.Y(last.v)} r={5} fill="#fff" stroke={color} strokeWidth={3} />
        )}
      </svg>

      {chart.projEnd && target !== undefined && (
        <p className="text-sm text-[var(--mid)] mt-2">
          Nykyisellä trendillä tavoite (~{formatValue(target, decimals)} {unit}) voisi täyttyä noin{' '}
          {chart.projEnd - chart.today} päivässä.
        </p>
      )}
    </div>
  );
}
