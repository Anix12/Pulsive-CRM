'use client';

// Shared recharts `<Tooltip content={...} />` renderer for LineChart/DonutChart/FunnelChart,
// styled to match Pulsive's card conventions instead of recharts' unstyled default.
export interface ChartTooltipPayloadEntry {
  name?: string;
  value?: number | string;
  color?: string;
  dataKey?: string | number;
}

export interface ChartTooltipProps {
  active?: boolean;
  label?: string | number;
  payload?: ChartTooltipPayloadEntry[];
  formatLabel?: (label: string | number) => React.ReactNode;
  formatValue?: (value: number | string, name: string, dataKey?: string | number) => React.ReactNode;
}

export function ChartTooltip({ active, label, payload, formatLabel, formatValue }: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs shadow-lg">
      {label != null && (
        <p className="mb-1 font-semibold text-gray-900">{formatLabel ? formatLabel(label) : label}</p>
      )}
      <div className="space-y-0.5">
        {payload.map((entry, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: entry.color }} />
            {entry.name && <span className="text-gray-500">{entry.name}:</span>}
            <span className="font-semibold text-gray-900">
              {entry.value != null ? (formatValue ? formatValue(entry.value, String(entry.name ?? ''), entry.dataKey) : entry.value) : ''}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
