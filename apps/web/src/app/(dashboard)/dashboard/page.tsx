'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { cn, formatCurrency } from '@/lib/utils';
import { useAuthStore } from '@/store/auth.store';
import { DateRangeFilter, DEFAULT_RANGE, type DateRange } from '@/components/layout/DateRangeFilter';
import {
  TrendingUp, Phone, MessageSquare, Trophy, ArrowUpRight, ArrowDownRight,
  Users, CalendarClock, AlertTriangle, Target, Mail, ListChecks, UserPlus,
  Coffee, Circle,
} from 'lucide-react';

function StatCard({
  label,
  sublabel,
  value,
  icon: Icon,
  iconBg,
  iconColor,
  trend,
}: {
  label: string;
  sublabel?: string;
  value: string | number;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  trend?: { value: number; label: string };
}) {
  const isPositive = (trend?.value ?? 0) >= 0;
  return (
    <div className="glass-panel glass-panel-hover rounded-xl p-5">
      <div className="flex items-start justify-between">
        <div className={`rounded-lg p-2.5 ${iconBg}`}>
          <Icon className={`h-4 w-4 ${iconColor}`} />
        </div>
        {trend && (
          <span
            className={`flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
              isPositive
                ? 'bg-emerald-400/10 text-emerald-300'
                : 'bg-red-400/10 text-red-300'
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
        <p className="text-2xl font-bold tracking-tight text-white">{value}</p>
        <p className="mt-0.5 text-sm text-white/45">{label}</p>
        {sublabel && <p className="mt-0.5 text-[11px] text-white/25">{sublabel}</p>}
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="glass-panel rounded-xl p-5 animate-pulse">
      <div className="h-9 w-9 rounded-lg bg-white/[0.06]" />
      <div className="mt-4 space-y-2">
        <div className="h-6 w-20 rounded bg-white/[0.06]" />
        <div className="h-4 w-32 rounded bg-white/[0.06]" />
      </div>
    </div>
  );
}

function agentStatusMeta(status: string) {
  switch (status) {
    case 'ACTIVE': return { label: 'Active', dot: 'bg-emerald-400', text: 'text-emerald-300', bg: 'bg-emerald-400/10' };
    case 'BREAK': return { label: 'On Break', dot: 'bg-amber-400', text: 'text-amber-300', bg: 'bg-amber-400/10' };
    case 'INACTIVE': return { label: 'Inactive', dot: 'bg-red-400', text: 'text-red-300', bg: 'bg-red-400/10' };
    default: return { label: "Hasn't started", dot: 'bg-white/30', text: 'text-white/40', bg: 'bg-white/[0.05]' };
  }
}

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [range, setRange] = useState<DateRange>(DEFAULT_RANGE);
  const rangeParams = { from: range.from.toISOString(), to: range.to.toISOString() };

  const { data: report, isLoading } = useQuery({
    queryKey: ['reports', 'business-performance', rangeParams.from, rangeParams.to],
    queryFn: async () => {
      const { data } = await api.get('/api/v1/reports/business-performance', { params: rangeParams });
      return data.data;
    },
  });

  const { data: overview, isLoading: overviewLoading } = useQuery({
    queryKey: ['reports', 'dashboard-overview', rangeParams.from, rangeParams.to],
    queryFn: async () => {
      const { data } = await api.get('/api/v1/reports/dashboard-overview', { params: rangeParams });
      return data.data;
    },
    refetchInterval: 60000,
  });

  const { data: agentFloor = [] } = useQuery<any[]>({
    queryKey: ['presence', 'agents'],
    queryFn: async () => {
      const { data } = await api.get('/api/v1/presence/agents');
      return data.data;
    },
    refetchInterval: 30000,
  });

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  })();

  const stats = [
    {
      label: `Revenue ${range.label}`,
      value: formatCurrency(report?.revenue?.total ?? 0),
      icon: TrendingUp,
      iconBg: 'bg-emerald-400/10',
      iconColor: 'text-emerald-300',
      trend: { value: 12, label: 'vs previous period' },
    },
    {
      label: `Calls made ${range.label}`,
      value: report?.calls?.total ?? 0,
      icon: Phone,
      iconBg: 'bg-blue-400/10',
      iconColor: 'text-blue-300',
    },
    {
      label: `Messages sent ${range.label}`,
      sublabel: 'SMS · WhatsApp · Email',
      value: report?.messages?.total ?? 0,
      icon: MessageSquare,
      iconBg: 'bg-violet-400/10',
      iconColor: 'text-violet-300',
    },
    {
      label: `Sales won ${range.label}`,
      value: report?.deals?.won ?? 0,
      icon: Trophy,
      iconBg: 'bg-amber-400/10',
      iconColor: 'text-amber-300',
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
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-white">
            {greeting}, {user?.firstName ?? 'there'} 👋
          </h2>
          <p className="mt-0.5 text-sm text-white/45">
            Here&apos;s how your team is performing {range.label}.
          </p>
        </div>
        <DateRangeFilter value={range} onChange={setRange} />
      </div>

      {/* Lead KPI tiles */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-white/70">Leads Snapshot — {range.label}</h3>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {overviewLoading ? (
            Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)
          ) : (
            <>
              <StatCard label="Total Leads" value={overview?.leads?.total ?? 0} icon={Users} iconBg="bg-cyan-400/10" iconColor="text-cyan-300" />
              <StatCard label={`New Leads ${range.label}`} value={overview?.leads?.newInRange ?? 0} icon={UserPlus} iconBg="bg-blue-400/10" iconColor="text-blue-300" />
              <StatCard label="Pending Follow-ups" value={overview?.leads?.pendingFollowups ?? 0} icon={CalendarClock} iconBg="bg-amber-400/10" iconColor="text-amber-300" />
              <StatCard label="Overdue Follow-ups" value={overview?.leads?.overdueFollowups ?? 0} icon={AlertTriangle} iconBg="bg-red-400/10" iconColor="text-red-300" />
              <StatCard
                label={`Conversions ${range.label}`}
                value={`${overview?.leads?.conversions ?? 0}`}
                icon={Target}
                iconBg="bg-emerald-400/10"
                iconColor="text-emerald-300"
                trend={{ value: overview?.leads?.conversionRate ?? 0, label: 'rate' }}
              />
            </>
          )}
        </div>
      </div>

      {/* Activity strip */}
      <div className="glass-panel rounded-xl p-5">
        <h3 className="mb-4 text-sm font-semibold text-white/70">Activity — {range.label}</h3>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {[
            { label: 'Calls Made', value: overview?.activityInRange?.calls ?? 0, icon: Phone, color: 'text-blue-300' },
            { label: 'SMS Sent', value: overview?.activityInRange?.sms ?? 0, icon: MessageSquare, color: 'text-violet-300' },
            { label: 'Emails Sent', value: overview?.activityInRange?.emails ?? 0, icon: Mail, color: 'text-cyan-300' },
            { label: 'Tasks Due Today', value: overview?.activityInRange?.tasksDue ?? 0, icon: ListChecks, color: 'text-amber-300' },
            { label: 'Overdue', value: overview?.activityInRange?.overdueTasks ?? 0, icon: AlertTriangle, color: 'text-red-300' },
            { label: 'New Leads', value: overview?.activityInRange?.newLeads ?? 0, icon: TrendingUp, color: 'text-emerald-300' },
          ].map((a) => (
            <div key={a.label} className="flex items-center gap-2.5">
              <a.icon className={cn('h-4 w-4 shrink-0', a.color)} />
              <div>
                <p className="text-base font-bold text-white">{a.value}</p>
                <p className="text-[11px] text-white/35">{a.label}</p>
              </div>
            </div>
          ))}
        </div>
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
        <div className="glass-panel col-span-2 rounded-xl p-5">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-white">Pipeline by stage</h3>
              <p className="text-xs text-white/35">Deal value distribution — {range.label}</p>
            </div>
          </div>
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="animate-pulse space-y-1.5">
                  <div className="flex justify-between">
                    <div className="h-3.5 w-24 rounded bg-white/[0.06]" />
                    <div className="h-3.5 w-16 rounded bg-white/[0.06]" />
                  </div>
                  <div className="h-2 w-full rounded-full bg-white/[0.06]" />
                </div>
              ))}
            </div>
          ) : pipelineEntries.length === 0 ? (
            <p className="text-sm text-white/35">No pipeline data yet.</p>
          ) : (
            <div className="space-y-4">
              {pipelineEntries.map(([stage, data]) => {
                const pct = Math.round((data.value / maxPipelineValue) * 100);
                return (
                  <div key={stage}>
                    <div className="mb-1.5 flex items-center justify-between text-sm">
                      <span className="font-medium text-white/75">{stage}</span>
                      <div className="flex items-center gap-3 text-xs text-white/45">
                        <span>{data.count} deals</span>
                        <span className="font-semibold text-white/85">
                          {formatCurrency(data.value)}
                        </span>
                      </div>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-white/[0.06]">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-600 shadow-[0_0_10px_-1px_rgba(34,211,238,0.7)] transition-all duration-500"
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
        <div className="glass-panel rounded-xl p-5">
          <div className="mb-5">
            <h3 className="font-semibold text-white">Conversion</h3>
            <p className="text-xs text-white/35">Deal performance — {range.label}</p>
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center gap-4 animate-pulse">
              <div className="h-28 w-28 rounded-full bg-white/[0.06]" />
            </div>
          ) : (
            <>
              {/* Donut stand-in */}
              <div className="flex flex-col items-center py-2">
                <div className="relative flex h-28 w-28 items-center justify-center">
                  <svg className="h-28 w-28 -rotate-90" viewBox="0 0 36 36">
                    <defs>
                      <linearGradient id="conversionGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#22d3ee" />
                        <stop offset="100%" stopColor="#0b3d91" />
                      </linearGradient>
                    </defs>
                    <circle
                      cx="18"
                      cy="18"
                      r="15.9"
                      fill="none"
                      stroke="rgba(255,255,255,0.08)"
                      strokeWidth="3.5"
                    />
                    <circle
                      cx="18"
                      cy="18"
                      r="15.9"
                      fill="none"
                      stroke="url(#conversionGradient)"
                      strokeWidth="3.5"
                      strokeDasharray={`${conversionRate} ${100 - conversionRate}`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <span className="absolute text-xl font-bold text-white">
                    {conversionRate}%
                  </span>
                </div>
                <p className="mt-2 text-xs font-medium text-white/45">Win rate</p>
              </div>

              <div className="mt-4 space-y-2.5 border-t border-white/[0.06] pt-4">
                {[
                  { label: 'Total deals', value: report?.deals?.total ?? 0, color: 'text-white/80' },
                  { label: 'Won', value: report?.deals?.won ?? 0, color: 'text-emerald-300' },
                  { label: 'Lost', value: report?.deals?.lost ?? 0, color: 'text-red-300' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="flex items-center justify-between text-sm">
                    <span className="text-white/45">{label}</span>
                    <span className={`font-semibold ${color}`}>{value}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Agent Activity */}
      <div className="glass-panel rounded-xl p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-white">Agent Activity</h3>
            <p className="text-xs text-white/35">Live floor status</p>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-white/35">
            {['ACTIVE', 'BREAK', 'INACTIVE', 'NOT_STARTED'].map((s) => {
              const meta = agentStatusMeta(s);
              return (
                <span key={s} className="flex items-center gap-1">
                  <Circle className={cn('h-2 w-2 fill-current', meta.dot.replace('bg-', 'text-'))} />
                  {meta.label}
                </span>
              );
            })}
          </div>
        </div>

        {agentFloor.length === 0 ? (
          <p className="py-6 text-center text-sm text-white/35">No agents on the floor yet.</p>
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {agentFloor.map((a) => {
              const meta = agentStatusMeta(a.status);
              const initials = a.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
              return (
                <div key={a.userId} className="flex items-center justify-between rounded-lg border border-white/[0.06] px-3 py-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400/25 to-blue-600/25 text-[11px] font-bold text-cyan-300 ring-1 ring-cyan-400/15">
                      {initials}
                    </div>
                    <div>
                      <p className="text-[13px] font-medium text-white/85">{a.name}</p>
                      <p className="text-[11px] capitalize text-white/35">{a.role?.toLowerCase()}</p>
                    </div>
                  </div>
                  <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold', meta.bg, meta.text)}>
                    {a.status === 'BREAK' ? <Coffee className="h-3 w-3" /> : <Circle className="h-2 w-2 fill-current" />}
                    {meta.label}
                    {a.status === 'BREAK' && a.breakMinutes !== null && ` · ${a.breakMinutes}m`}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
