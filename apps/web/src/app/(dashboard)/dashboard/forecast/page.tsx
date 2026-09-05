'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { cn, formatCurrency } from '@/lib/utils';
import { useState } from 'react';
import { TrendingUp, TrendingDown, Scale, Clock, Wallet, Sparkles } from 'lucide-react';

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
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
            <p className="text-sm text-gray-500">Expected Conversions</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{active.expectedConversions}</p>
            <p className="mt-1 text-xs text-gray-400">Next {active.label.toLowerCase()}</p>
          </div>
          <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
            <p className="text-sm text-gray-500">Expected Value</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{formatCurrency(active.expectedValue)}</p>
            <p className="mt-1 text-xs text-gray-400">Probability-weighted</p>
          </div>
          <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
            <p className="flex items-center gap-1 text-sm text-gray-500"><TrendingUp className="h-3.5 w-3.5 text-emerald-500" /> Leads Gained</p>
            <p className="mt-1 text-2xl font-bold text-emerald-600">+{active.projectedLeadsGained}</p>
            <p className="mt-1 text-xs text-gray-400">Projected from 30-day trend</p>
          </div>
          <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
            <p className="flex items-center gap-1 text-sm text-gray-500"><TrendingDown className="h-3.5 w-3.5 text-red-500" /> Leads Lost</p>
            <p className="mt-1 text-2xl font-bold text-red-500">-{active.projectedLeadsLost}</p>
            <p className="mt-1 text-xs text-gray-400">Projected from 30-day trend</p>
          </div>
        </div>
      )}

      {/* Overall pipeline stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="flex items-center gap-3 rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
          <Scale className="h-8 w-8 rounded-lg bg-indigo-50 p-2 text-indigo-600" />
          <div>
            <p className="text-lg font-bold text-gray-900">{data?.won ?? 0} : {data?.lost ?? 0}</p>
            <p className="text-xs text-gray-400">Win : Loss ratio ({data?.winLossRatio ?? 0})</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
          <Clock className="h-8 w-8 rounded-lg bg-amber-50 p-2 text-amber-600" />
          <div>
            <p className="text-lg font-bold text-gray-900">{data?.avgCloseTimeDays ?? 0} days</p>
            <p className="text-xs text-gray-400">Average close time</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
          <Wallet className="h-8 w-8 rounded-lg bg-emerald-50 p-2 text-emerald-600" />
          <div>
            <p className="text-lg font-bold text-gray-900">{formatCurrency(data?.totalPipelineValue ?? 0)}</p>
            <p className="text-xs text-gray-400">Total open pipeline value</p>
          </div>
        </div>
      </div>

      {/* Stage Conversion Analysis */}
      <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
        <h3 className="mb-4 font-semibold text-gray-900">Stage Conversion Analysis</h3>
        <div className="space-y-3">
          {(data?.stageConversion ?? []).map((s: any, i: number) => (
            <div key={i} className="flex items-center gap-3">
              <span className="w-32 shrink-0 text-sm text-gray-600">{s.stage}</span>
              <div className="h-5 flex-1 overflow-hidden rounded bg-gray-100">
                <div className="h-full rounded bg-indigo-500" style={{ width: `${s.conversionRate}%` }} />
              </div>
              <span className="w-12 text-right text-sm font-semibold text-gray-900">{s.count}</span>
              <span className="w-14 text-right text-xs text-gray-400">{s.conversionRate}%</span>
            </div>
          ))}
          {(!data?.stageConversion || data.stageConversion.length === 0) && (
            <p className="text-sm text-gray-400">No pipeline stages configured yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
