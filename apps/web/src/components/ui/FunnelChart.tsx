'use client';

import { useReducedMotion } from 'framer-motion';
import { FunnelChart as RFunnelChart, Funnel, Cell, Tooltip, LabelList, ResponsiveContainer } from 'recharts';
import { ChartTooltip } from './ChartTooltip';
import { CHART_COLORS } from '@/lib/chartColors';

interface EnrichedDatum {
  [key: string]: unknown;
  __value: number;
  __pct: number | null;
  __dropOff: number;
}

export interface FunnelChartProps {
  /** Stages in funnel order — first stage is treated as 100% for percentage/drop-off math. */
  data: Record<string, unknown>[];
  /** Key in each data object holding the stage's display name. */
  nameKey: string;
  /** Key in each data object holding the stage's numeric count/value. */
  valueKey: string;
  height?: number;
  colors?: string[];
  formatValue?: (value: number) => string;
  /** Shows "-N drop-off" versus the previous stage, when the count decreased. */
  showDropOff?: boolean;
  loading?: boolean;
  emptyMessage?: string;
  ariaLabel?: string;
}

export function FunnelChart({
  data,
  nameKey,
  valueKey,
  height = 280,
  colors,
  formatValue = (n) => n.toLocaleString(),
  showDropOff = true,
  loading,
  emptyMessage = 'No stage data yet.',
  ariaLabel,
}: FunnelChartProps) {
  const reduceMotion = !!useReducedMotion();
  const palette = colors ?? CHART_COLORS;

  if (loading) {
    return <div className="animate-pulse rounded-lg bg-gray-50" style={{ height }} />;
  }

  if (!data.length) {
    return (
      <div className="flex items-center justify-center rounded-lg bg-gray-50/50 text-sm text-gray-400" style={{ height }}>
        {emptyMessage}
      </div>
    );
  }

  const firstValue = Number(data[0]?.[valueKey]) || 0;
  const enriched: EnrichedDatum[] = data.map((d, i) => {
    const value = Number(d[valueKey]) || 0;
    const prevValue = i > 0 ? Number(data[i - 1][valueKey]) || 0 : value;
    return {
      ...d,
      __value: value,
      __pct: firstValue > 0 ? Math.round((value / firstValue) * 100) : null,
      __dropOff: i > 0 ? Math.max(0, prevValue - value) : 0,
    };
  });

  return (
    <div role="img" aria-label={ariaLabel ?? 'Funnel chart of stage progression'} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <RFunnelChart margin={{ top: 16, right: 160, bottom: 16, left: 16 }}>
          <Tooltip
            content={
              <ChartTooltip
                formatValue={(value) => {
                  const num = Number(value);
                  const pct = firstValue > 0 ? Math.round((num / firstValue) * 100) : null;
                  return `${formatValue(num)}${pct != null ? ` (${pct}%)` : ''}`;
                }}
              />
            }
          />
          <Funnel
            dataKey="__value"
            nameKey={nameKey}
            data={enriched}
            isAnimationActive={!reduceMotion}
            animationDuration={500}
            animationEasing="ease-out"
          >
            {enriched.map((_, i) => (
              <Cell key={i} fill={palette[i % palette.length]} />
            ))}
            <LabelList
              content={(props: unknown) =>
                renderFunnelLabel(props as FunnelLabelProps, enriched, nameKey, formatValue, showDropOff)
              }
            />
          </Funnel>
        </RFunnelChart>
      </ResponsiveContainer>
    </div>
  );
}

interface FunnelLabelProps {
  x: number;
  y: number;
  width: number;
  height: number;
  index: number;
}

// Renders "Stage name / count · pct% / -N drop-off" beside each segment — visible by
// default (not just on hover) since a funnel's whole point is showing the progression
// at a glance, matching the existing pipeline-funnel report's plain-text convention.
function renderFunnelLabel(
  props: FunnelLabelProps,
  data: EnrichedDatum[],
  nameKey: string,
  formatValue: (n: number) => string,
  showDropOff: boolean,
) {
  const { x, y, width, height, index } = props;
  const d = data[index];
  if (!d) return null;
  const cy = y + height / 2;
  const textX = x + width + 12;

  return (
    <g>
      <text x={textX} y={cy - 6} fontSize={12} fontWeight={600} fill="#111827">
        {String(d[nameKey])}
      </text>
      <text x={textX} y={cy + 10} fontSize={11} fill="#6b7280">
        {formatValue(d.__value)}{d.__pct != null ? ` · ${d.__pct}%` : ''}
      </text>
      {showDropOff && d.__dropOff > 0 && (
        <text x={textX} y={cy + 24} fontSize={10} fill="#ef4444">
          -{formatValue(d.__dropOff)} drop-off
        </text>
      )}
    </g>
  );
}
