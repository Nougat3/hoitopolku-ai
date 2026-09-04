import { Sparkline } from '@/components/shared/Sparkline';
import { formatValue } from '@/utils/formatting';
import { tileState } from '@/utils/calculations';

export interface MetricTileData {
  key: string;
  name: string;
  color: string;
  unit: string;
  values: number[];
  target?: number;
  decimals?: boolean;
}

interface MetricTileProps {
  metric: MetricTileData;
  onClick?: () => void;
}

export function MetricTile({ metric, onClick }: MetricTileProps) {
  const last = metric.values[metric.values.length - 1];
  const first = metric.values[0];
  const state =
    last !== undefined && first !== undefined
      ? tileState(metric.target, last, first, !!metric.decimals)
      : { status: 'off' as const, label: 'Ei dataa' };

  const statusClass =
    state.status === 'ok'
      ? 'bg-[var(--green-t)] text-[var(--green)]'
      : state.status === 'mid'
        ? 'bg-[var(--amber-t)] text-[var(--amber)]'
        : 'bg-[var(--red-t)] text-[var(--red)]';

  return (
    <button
      type="button"
      onClick={onClick}
      className="tile text-left w-full"
    >
      <span className="flex items-center gap-2 text-sm font-semibold text-[var(--mid)]">
        <i className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: metric.color }} />
        {metric.name}
      </span>
      <div className="mt-2 flex items-end justify-between gap-3">
        <div>
          <div className="text-2xl font-bold tracking-tight">
            {last !== undefined ? formatValue(last, !!metric.decimals) : '—'}
            <span className="text-sm font-medium text-[var(--mid)] ml-1">{metric.unit}</span>
          </div>
          <span className={`inline-block mt-1 text-xs font-semibold px-2 py-0.5 rounded-full ${statusClass}`}>
            {state.label}
          </span>
        </div>
        {metric.values.length > 1 && (
          <div className="w-28 shrink-0">
            <Sparkline values={metric.values.slice(-10)} color={metric.color} target={metric.target} />
          </div>
        )}
      </div>
    </button>
  );
}
