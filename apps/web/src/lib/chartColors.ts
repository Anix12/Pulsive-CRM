// Shared hex palette for recharts-based components (LineChart/DonutChart/FunnelChart).
// Matches the Tailwind color classes ProgressStat/MetricCard already cycle through
// (blue-500, emerald-500, amber-500, violet-500, pink-500, cyan-500) so chart series
// and progress bars read as the same visual language across the app.
export const CHART_COLORS = [
  '#3b82f6', // blue-500
  '#10b981', // emerald-500
  '#f59e0b', // amber-500
  '#8b5cf6', // violet-500
  '#ec4899', // pink-500
  '#06b6d4', // cyan-500
];

export const chartColorAt = (index: number) => CHART_COLORS[index % CHART_COLORS.length];
