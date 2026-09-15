'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { cn, formatCurrency } from '@/lib/utils';
import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { MetricCard } from '@/components/ui/MetricCard';
import { ProgressStat } from '@/components/ui/ProgressStat';
import { SectionCard } from '@/components/ui/SectionCard';

export default function ForecastPage() {
  const [windowKey, setWindowKey] = useState('30d');

  const { data, isLoading } = useQuery({
    queryKey: ['forecast'],
    queryFn: async () => {
      const { data } = await api.get('/api/v1/forecast');
      return data.data;
    },
  });

  const active = data?.forecastWindows?.find((w: any) => w.key === windowKey);

  if (isLoading) return <div className="flex h-48 items-center justify-center text-gray-400">Loading…</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Sales Forecast</h1>
        <p className="mt-1 flex items-center gap-1.5 text-xs text-gray-400">
          <Sparkles className="h-3 w-3" />
          Stage-level funnel math applied transparently — every number below is derived from your live pipeline, not a black-box model.
        </p>
      </div>

      {/* Window selector */}
      <div className="flex gap-1 rounded-lg bg-gray-100 p-1 w-fit">
        {(data?.forecastWindows ?? []).map((w: any) => (
          <button
            key={w.key}
            onClick={() => setWindowKey(w.key)}
            className={cn('rounded-md px-4 py-1.5 text-sm font-medium transition-colors', windowKey === w.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900')}
          >
            {w.label}
          </button>
        ))}
      </div>

      {active && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            index={0}
            label="Expected Conversions"
            value={String(active.expectedConversions)}
            numericValue={active.expectedConversions}
            formatValue={(n) => Math.round(n).toLocaleString()}
            sub={`Next ${active.label.toLowerCase()}`}
          />
          <MetricCard
            index={1}
            label="Expected Value"
            value={formatCurrency(active.expectedValue)}
            numericValue={active.expectedValue}
            formatValue={formatCurrency}
            sub="Probability-weighted"
          />
          <MetricCard
            index={2}
            label="Leads Gained"
            value={`+${active.projectedLeadsGained}`}
            numericValue={active.projectedLeadsGained}
            formatValue={(n) => `+${Math.round(n).toLocaleString()}`}
            valueClassName="text-emerald-600"
            sub="Projected from 30-day trend"
          />
          <MetricCard
            index={3}
            label="Leads Lost"
            value={`-${active.projectedLeadsLost}`}
            numericValue={active.projectedLeadsLost}
            formatValue={(n) => `-${Math.round(n).toLocaleString()}`}
            valueClassName="text-red-500"
            sub="Projected from 30-day trend"
          />
        </div>
      )}

      {/* Overall pipeline stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <MetricCard index={0} label="Win : Loss Ratio" value={`${data?.won ?? 0} : ${data?.lost ?? 0}`} sub={`Ratio ${data?.winLossRatio ?? 0}`} />
        <MetricCard index={1} label="Avg Close Time" value={`${data?.avgCloseTimeDays ?? 0} days`} sub="Average across won deals" />
        <MetricCard
          index={2}
          label="Open Pipeline Value"
          value={formatCurrency(data?.totalPipelineValue ?? 0)}
          numericValue={data?.totalPipelineValue ?? 0}
          formatValue={formatCurrency}
          sub="Total open pipeline value"
        />
      </div>

      {/* Stage Conversion Analysis */}
      <SectionCard title="Stage Conversion Analysis" subtitle="Conversion rate per pipeline stage">
        <div className="space-y-4">
          {(data?.stageConversion ?? []).map((s: any, i: number) => (
            <ProgressStat key={i} index={i} label={s.stage} count={`${s.count} · ${s.conversionRate}%`} percent={s.conversionRate} />
          ))}
          {(!data?.stageConversion || data.stageConversion.length === 0) && (
            <p className="text-sm text-gray-400">No pipeline stages configured yet.</p>
          )}
        </div>
      </SectionCard>
    </div>
  );
}
