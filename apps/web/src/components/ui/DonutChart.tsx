'use client';

import { useReducedMotion } from 'framer-motion';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { ChartTooltip } from './ChartTooltip';
import { CHART_COLORS } from '@/lib/chartColors';

export interface DonutChartProps {
  data: Record<string, unknown>[];
  /** Key in each data object holding the segment's display name. */
  nameKey: string;
  /** Key in each data object holding the segment's numeric value. */
  valueKey: string;
  height?: number;
  colors?: string[];
  /** Big number shown in the center of the ring, e.g. a grand total. */
  centerValue?: string | number;
  /** Small muted caption under `centerValue`. */
  centerLabel?: string;
  showLegend?: boolean;
  /** Formats a segment's value for the tooltip; the "(N%) of total" suffix is added automatically. */
  formatValue?: (value: number, name: string) => string;
  loading?: boolean;
  emptyMessage?: string;
  ariaLabel?: string;
}

export function DonutChart({
  data,
  nameKey,
  valueKey,
  height = 220,
  colors,
  centerValue,
  centerLabel,
  showLegend = true,
  formatValue,
  loading,
  emptyMessage = 'No data yet.',
  ariaLabel,
}: DonutChartProps) {
  const reduceMotion = !!useReducedMotion();
  const palette = colors ?? CHART_COLORS;

  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{ height }}>
        <div className="animate-pulse rounded-full bg-gray-50" style={{ height: height * 0.85, width: height * 0.85 }} />
      </div>
    );
  }

  const total = data.reduce((sum, d) => sum + (Number(d[valueKey]) || 0), 0);
  if (!data.length || total <= 0) {
    return (
      <div className="flex items-center justify-center rounded-lg bg-gray-50/50 text-sm text-gray-400" style={{ height }}>
        {emptyMessage}
      </div>
    );
  }

  return (
    <div>
      <div role="img" aria-label={ariaLabel ?? 'Distribution donut chart'} className="relative" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              nameKey={nameKey}
              dataKey={valueKey}
              cx="50%"
              cy="50%"
              innerRadius="62%"
              outerRadius="92%"
              paddingAngle={data.length > 1 ? 2 : 0}
              isAnimationActive={!reduceMotion}
              animationDuration={700}
              animationEasing="ease-out"
            >
              {data.map((_, i) => (
                <Cell key={i} fill={palette[i % palette.length]} stroke="#fff" strokeWidth={2} />
              ))}
            </Pie>
            <Tooltip
              content={
                <ChartTooltip
                  formatValue={(value, name) => {
                    const num = Number(value);
                    const pct = total > 0 ? Math.round((num / total) * 100) : 0;
                    const formatted = formatValue ? formatValue(num, name) : String(num);
                    return `${formatted} (${pct}%)`;
                  }}
                />
              }
            />
          </PieChart>
        </ResponsiveContainer>
        {(centerValue != null || centerLabel) && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            {centerValue != null && <span className="text-xl font-bold text-gray-900">{centerValue}</span>}
            {centerLabel && <span className="text-[11px] text-gray-400">{centerLabel}</span>}
          </div>
        )}
      </div>
      {showLegend && (
        <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5">
          {data.map((d, i) => (
            <span key={i} className="flex items-center gap-1.5 text-xs text-gray-600">
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: palette[i % palette.length] }} />
              {String(d[nameKey])}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
