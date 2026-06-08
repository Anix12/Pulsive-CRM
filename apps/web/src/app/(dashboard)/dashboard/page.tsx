'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { useAuthStore } from '@/store/auth.store';
import { TrendingUp, Phone, MessageSquare, Trophy, ArrowUpRight, ArrowDownRight } from 'lucide-react';

function StatCard({
  label,
  value,
  icon: Icon,
  iconBg,
  iconColor,
  trend,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  trend?: { value: number; label: string };
}) {
  const isPositive = (trend?.value ?? 0) >= 0;
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div className={`rounded-lg p-2.5 ${iconBg}`}>
          <Icon className={`h-4 w-4 ${iconColor}`} />
        </div>
        {trend && (
          <span
            className={`flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
              isPositive
                ? 'bg-emerald-50 text-emerald-700'
                : 'bg-red-50 text-red-600'
            }`}
          >
            {isPositive ? (
              <ArrowUpRight className="h-3 w-3" />
            ) : (
              <ArrowDownRight className="h-3 w-3" />
            )}
            {Math.abs(trend.value)}%
          </span>
        )}
      </div>
      <div className="mt-4">
        <p className="text-2xl font-bold tracking-tight text-gray-900">{value}</p>
        <p className="mt-0.5 text-sm text-gray-500">{label}</p>
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm animate-pulse">
      <div className="h-9 w-9 rounded-lg bg-gray-100" />
      <div className="mt-4 space-y-2">
        <div className="h-6 w-20 rounded bg-gray-100" />
        <div className="h-4 w-32 rounded bg-gray-100" />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuthStore();
  const { data: report, isLoading } = useQuery({
    queryKey: ['reports', 'business-performance'],
    queryFn: async () => {
      const { data } = await api.get('/api/v1/reports/business-performance');
      return data.data;
    },
  });

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  })();

  const stats = [
    {
      label: 'Revenue this month',
      value: formatCurrency(report?.revenue?.total ?? 0),
      icon: TrendingUp,
      iconBg: 'bg-emerald-50',
      iconColor: 'text-emerald-600',
      trend: { value: 12, label: 'vs last month' },
    },
    {
      label: 'Calls made',
      value: report?.calls?.total ?? 0,
      icon: Phone,
      iconBg: 'bg-blue-50',
      iconColor: 'text-blue-600',
    },
    {
      label: 'Messages sent',
      value: report?.messages?.total ?? 0,
      icon: MessageSquare,
      iconBg: 'bg-violet-50',
      iconColor: 'text-violet-600',
    },
    {
      label: 'Deals won',
      value: report?.deals?.won ?? 0,
      icon: Trophy,
      iconBg: 'bg-amber-50',
      iconColor: 'text-amber-600',
      trend: {
        value:
          report?.deals?.total > 0
            ? Math.round((report.deals.won / report.deals.total) * 100)
            : 0,
        label: 'win rate',
      },
    },
  ];

  const conversionRate = report?.deals?.conversionRate ?? 0;
  const pipelineEntries = report?.pipeline
    ? Object.entries(report.pipeline as Record<string, { count: number; value: number }>)
    : [];
  const maxPipelineValue = Math.max(
    ...pipelineEntries.map(([, d]) => d.value),
    1,
  );

  return (
    <div className="space-y-7">
      {/* Greeting */}
      <div>
        <h2 className="text-xl font-bold text-gray-900">
          {greeting}, {user?.firstName ?? 'there'} 👋
        </h2>
        <p className="mt-0.5 text-sm text-gray-500">
          Here&apos;s how your team is performing this month.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
          : stats.map((s) => <StatCard key={s.label} {...s} />)}
      </div>

      {/* Pipeline + Conversion */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Pipeline breakdown */}
        <div className="col-span-2 rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-900">Pipeline by stage</h3>
              <p className="text-xs text-gray-400">Deal value distribution</p>
            </div>
          </div>
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="animate-pulse space-y-1.5">
                  <div className="flex justify-between">
                    <div className="h-3.5 w-24 rounded bg-gray-100" />
                    <div className="h-3.5 w-16 rounded bg-gray-100" />
                  </div>
                  <div className="h-2 w-full rounded-full bg-gray-100" />
                </div>
              ))}
            </div>
          ) : pipelineEntries.length === 0 ? (
            <p className="text-sm text-gray-400">No pipeline data yet.</p>
          ) : (
            <div className="space-y-4">
              {pipelineEntries.map(([stage, data]) => {
                const pct = Math.round((data.value / maxPipelineValue) * 100);
                return (
                  <div key={stage}>
                    <div className="mb-1.5 flex items-center justify-between text-sm">
                      <span className="font-medium text-gray-700">{stage}</span>
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        <span>{data.count} deals</span>
                        <span className="font-semibold text-gray-800">
                          {formatCurrency(data.value)}
                        </span>
                      </div>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                      <div
                        className="h-full rounded-full bg-indigo-500 transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Conversion */}
        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="mb-5">
            <h3 className="font-semibold text-gray-900">Conversion</h3>
            <p className="text-xs text-gray-400">Overall deal performance</p>
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center gap-4 animate-pulse">
              <div className="h-28 w-28 rounded-full bg-gray-100" />
            </div>
          ) : (
            <>
              {/* Donut stand-in */}
              <div className="flex flex-col items-center py-2">
                <div className="relative flex h-28 w-28 items-center justify-center">
                  <svg className="h-28 w-28 -rotate-90" viewBox="0 0 36 36">
                    <circle
                      cx="18"
                      cy="18"
                      r="15.9"
                      fill="none"
                      stroke="#f1f5f9"
                      strokeWidth="3.5"
                    />
                    <circle
                      cx="18"
                      cy="18"
                      r="15.9"
                      fill="none"
                      stroke="#6366f1"
                      strokeWidth="3.5"
                      strokeDasharray={`${conversionRate} ${100 - conversionRate}`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <span className="absolute text-xl font-bold text-gray-900">
                    {conversionRate}%
                  </span>
                </div>
                <p className="mt-2 text-xs font-medium text-gray-500">Win rate</p>
              </div>

              <div className="mt-4 space-y-2.5 border-t border-gray-50 pt-4">
                {[
                  { label: 'Total deals', value: report?.deals?.total ?? 0, color: 'text-gray-800' },
                  { label: 'Won', value: report?.deals?.won ?? 0, color: 'text-emerald-600' },
                  { label: 'Lost', value: report?.deals?.lost ?? 0, color: 'text-red-500' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">{label}</span>
                    <span className={`font-semibold ${color}`}>{value}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
