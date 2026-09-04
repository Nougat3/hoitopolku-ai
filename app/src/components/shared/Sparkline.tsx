import { smoothPath } from '@/utils/graphUtils';

interface SparklineProps {
  values: number[];
  color: string;
  target?: number;
  width?: number;
  height?: number;
}

let sparkId = 0;

export function Sparkline({
  values,
  color,
  target,
  width = 120,
  height = 44
}: SparklineProps) {
  if (!values.length) return null;

  const id = `sp${sparkId++}`;
  const all = target !== undefined ? [...values, target] : values;
  const mn = Math.min(...all);
  const mx = Math.max(...all);
  const rg = mx - mn || 1;
  const pad = 9;
  const X = (i: number) => 7 + (i * (width - 14)) / (values.length - 1 || 1);
  const Y = (v: number) => height - pad - ((v - mn) / rg) * (height - pad * 2);
  const points = values.map((v, i) => ({ x: X(i), y: Y(v) }));
  const d = smoothPath(points);
  const last = points[points.length - 1];
  const ty = target !== undefined ? Y(target) : null;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-11" aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {ty !== null && (
        <>
          <rect x={0} y={ty} width={width} height={Math.max(0, height - ty)} fill="#4E7D3C" fillOpacity="0.08" />
          <line
            x1={0}
            y1={ty}
            x2={width}
            y2={ty}
            stroke="#4E7D3C"
            strokeWidth={2}
            strokeDasharray="6 5"
            strokeOpacity={0.7}
            strokeLinecap="round"
          />
        </>
      )}
      <path
        d={`${d} L${last.x} ${height} L${points[0].x} ${height} Z`}
        fill={`url(#${id})`}
      />
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={last.x} cy={last.y} r={5} fill="#fff" stroke={color} strokeWidth={3} />
    </svg>
  );
}
