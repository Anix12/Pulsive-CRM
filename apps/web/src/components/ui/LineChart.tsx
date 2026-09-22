'use client';

import { useReducedMotion } from 'framer-motion';
import {
  ResponsiveContainer, LineChart as RLineChart, AreaChart as RAreaChart,
  Line, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';
import { ChartTooltip } from './ChartTooltip';
import { chartColorAt } from '@/lib/chartColors';

export interface ChartSeriesDef {
  /** Key in each data object this series reads its value from. */
  key: string;
  /** Legend/tooltip label; defaults to `key`. */
  label?: string;
  /** Overrides the auto-cycled palette color for this series. */
  color?: string;
}

export interface LineChartProps {
  data: Record<string, unknown>[];
  /** Key in each data object used for the X axis (a date string or category label). */
  xKey: string;
  series: ChartSeriesDef[];
  /** 'line' (default) draws plain lines; 'area' fills beneath each line with a gradient. */
  variant?: 'line' | 'area';
  height?: number;
  /** Formats the X-axis tick and tooltip header — e.g. a date string → "12 Mar". */
  formatXLabel?: (value: string | number) => string;
  /** Formats a series value for the tooltip — e.g. a raw number → "₹12,000". */
  formatValue?: (value: number, seriesLabel: string) => string;
  loading?: boolean;
  emptyMessage?: string;
  ariaLabel?: string;
}

export function LineChart({
  data,
  xKey,
  series,
  variant = 'line',
  height = 240,
  formatXLabel,
  formatValue,
  loading,
  emptyMessage = 'No data for this period yet.',
  ariaLabel,
}: LineChartProps) {
  const reduceMotion = !!useReducedMotion();

  if (loading) {
    return <div className="animate-pulse rounded-lg bg-gray-50" style={{ height }} />;
  }

  if (!data.length || series.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-lg bg-gray-50/50 text-sm text-gray-400" style={{ height }}>
        {emptyMessage}
      </div>
    );
  }

  const sharedChildren = [
    <defs key="defs">
      {variant === 'area' &&
        series.map((s, i) => {
          const color = s.color ?? chartColorAt(i);
          return (
            <linearGradient key={s.key} id={`line-chart-gradient-${s.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.35} />
              <stop offset="95%" stopColor={color} stopOpacity={0.02} />
            </linearGradient>
          );
        })}
    </defs>,
    <CartesianGrid key="grid" strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />,
    <XAxis
      key="xaxis"
      dataKey={xKey}
      tickFormatter={formatXLabel}
      tick={{ fontSize: 11, fill: '#9ca3af' }}
      axisLine={{ stroke: '#f1f5f9' }}
      tickLine={false}
    />,
    <YAxis key="yaxis" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} width={40} allowDecimals={false} />,
    <Tooltip
      key="tooltip"
      content={
        <ChartTooltip
          formatLabel={formatXLabel as ((label: string | number) => React.ReactNode) | undefined}
          formatValue={(value, name) => (formatValue ? formatValue(Number(value), name) : String(value))}
        />
      }
    />,
    ...(series.length > 1 ? [<Legend key="legend" wrapperStyle={{ fontSize: 12 }} iconType="circle" iconSize={8} />] : []),
  ];

  return (
    <div
      role="img"
      aria-label={ariaLabel ?? `${variant === 'area' ? 'Area' : 'Line'} chart with ${series.length} series across ${data.length} points`}
      style={{ height }}
    >
      <ResponsiveContainer width="100%" height="100%">
        {variant === 'area' ? (
          <RAreaChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
            {sharedChildren}
            {series.map((s, i) => {
              const color = s.color ?? chartColorAt(i);
              return (
                <Area
                  key={s.key}
                  type="monotone"
                  dataKey={s.key}
                  name={s.label ?? s.key}
                  stroke={color}
                  strokeWidth={2}
                  fill={`url(#line-chart-gradient-${s.key})`}
                  isAnimationActive={!reduceMotion}
                  animationDuration={600}
                  animationEasing="ease-out"
                />
              );
            })}
          </RAreaChart>
        ) : (
          <RLineChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
            {sharedChildren}
            {series.map((s, i) => {
              const color = s.color ?? chartColorAt(i);
              return (
                <Line
                  key={s.key}
                  type="monotone"
                  dataKey={s.key}
                  name={s.label ?? s.key}
                  stroke={color}
                  strokeWidth={2}
                  dot={{ r: 3, strokeWidth: 0, fill: color }}
                  activeDot={{ r: 5 }}
                  isAnimationActive={!reduceMotion}
                  animationDuration={600}
                  animationEasing="ease-out"
                />
              );
            })}
          </RLineChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
