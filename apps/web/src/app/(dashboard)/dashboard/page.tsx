'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { useQuery } from '@tanstack/react-query';
import { motion, useReducedMotion } from 'framer-motion';
import api from '@/lib/api';
import { cn, formatCurrency } from '@/lib/utils';
import { DateRangeFilter, DEFAULT_RANGE, type DateRange } from '@/components/layout/DateRangeFilter';
import { MetricCard } from '@/components/ui/MetricCard';
import { ProgressStat } from '@/components/ui/ProgressStat';
import { SectionCard } from '@/components/ui/SectionCard';
import { SimpleBarChart } from '@/components/ui/SimpleBarChart';
import { LineChart } from '@/components/ui/LineChart';
import { DonutChart } from '@/components/ui/DonutChart';
import { cardMountProps } from '@/lib/motion';
import {
  Phone, MessageSquare, Mail, ListChecks, AlertTriangle, TrendingUp, Coffee, Circle,
  Wallet, Trophy, Users, UserPlus, CalendarClock, Target,
} from 'lucide-react';

function agentStatusMeta(status: string) {
  switch (status) {
    case 'ACTIVE': return { label: 'Active', dot: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50' };
    case 'BREAK': return { label: 'On Break', dot: 'bg-amber-500', text: 'text-amber-700', bg: 'bg-amber-50' };
    case 'INACTIVE': return { label: 'Inactive', dot: 'bg-red-500', text: 'text-red-700', bg: 'bg-red-50' };
    default: return { label: "Hasn't started", dot: 'bg-gray-300', text: 'text-gray-500', bg: 'bg-gray-100' };
  }
}

const prettyEnum = (v: string) => v.charAt(0) + v.slice(1).toLowerCase();

interface ContactsOverview {
  total: number;
  byStatus: { status: string; count: number }[];
  bySource: { source: string; count: number }[];
  dailyNewLeads: { date: string; label: string; count: number }[];
}

// Decorative only — see components/3d/DashboardHeroScene.tsx. Loaded client-side only
// (no SSR) since it touches WebGL/Canvas, and lazily so it never blocks first paint of
// the real dashboard content.
const DashboardHeroScene = dynamic(() => import('@/components/3d/DashboardHeroScene'), { ssr: false });

function SkeletonCard() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 animate-pulse">
      <div className="h-3 w-24 rounded bg-gray-100" />
      <div className="mt-3 h-7 w-20 rounded bg-gray-100" />
      <div className="mt-3 h-4 w-16 rounded-full bg-gray-100" />
    </div>
  );
}

export default function DashboardPage() {
  const reduceMotion = !!useReducedMotion();
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

  // contacts/overview is a separate, pre-existing endpoint with its own coarse
  // range vocabulary ('today'|'week'|'month'|'all') that doesn't map cleanly onto the
  // DateRangeFilter's arbitrary {from,to} presets, and its dailyNewLeads series is
  // hardcoded server-side to a trailing 7-day window regardless of any range passed.
  // Rather than force an inaccurate mapping onto the picker, these sections use the
  // endpoint's own natural, honestly-labeled windows (see report for details).
  const {
    data: contactsOverview,
    isLoading: contactsOverviewLoading,
    isError: contactsOverviewError,
  } = useQuery({
    queryKey: ['contacts', 'overview'],
    queryFn: async () => {
      const { data } = await api.get('/api/v1/contacts/overview');
      return data.data as ContactsOverview;
    },
    refetchInterval: 60000,
  });

  const dailyNewLeadsData = contactsOverview?.dailyNewLeads ?? [];
  const dailyNewLeadsLabels = Object.fromEntries(dailyNewLeadsData.map((d) => [d.date, d.label]));

  const leadsByStatusData = (contactsOverview?.byStatus ?? []).map((s) => ({
    status: prettyEnum(s.status),
    count: s.count,
  }));

  const rawBySource = contactsOverview?.bySource ?? [];
  const SOURCE_DONUT_THRESHOLD = 5;
  const leadsBySourceIsDonut = rawBySource.length <= SOURCE_DONUT_THRESHOLD;
  const leadsBySourceDonutData = rawBySource.map((s) => ({ source: s.source, count: s.count }));
  const leadsBySourceBarData = (() => {
    if (rawBySource.length <= SOURCE_DONUT_THRESHOLD + 1) {
      return rawBySource.map((s) => ({ label: s.source, value: s.count }));
    }
    // Cap the bar chart at the top sources + one aggregated "Other" bucket so a long
    // tail of free-text source values (real campaign/landing-page names) can't produce
    // an unreadably dense or overflowing chart.
    const top = rawBySource.slice(0, SOURCE_DONUT_THRESHOLD + 1);
    const rest = rawBySource.slice(SOURCE_DONUT_THRESHOLD + 1);
    const otherTotal = rest.reduce((sum, s) => sum + s.count, 0);
    return [
      ...top.map((s) => ({ label: s.source, value: s.count })),
      ...(otherTotal > 0 ? [{ label: 'Other', value: otherTotal }] : []),
    ];
  })();

  const conversionRate = report?.deals?.conversionRate ?? 0;
  const pipelineEntries = report?.pipeline
    ? Object.entries(report.pipeline as Record<string, { count: number; value: number }>)
    : [];
  const maxPipelineValue = Math.max(...pipelineEntries.map(([, d]) => d.value), 1);

  const dealOutcomeData = [
    { label: 'Total', value: report?.deals?.total ?? 0 },
    { label: 'Won', value: report?.deals?.won ?? 0 },
    { label: 'Lost', value: report?.deals?.lost ?? 0 },
  ];
  const dealOutcomeActiveIndex = dealOutcomeData.findIndex((d) => d.label === 'Won');

  return (
    <div className="relative space-y-6">
      <div className="pointer-events-none absolute -inset-x-4 -top-4 h-[420px] overflow-hidden [mask-image:linear-gradient(to_bottom,black_70%,transparent)]">
        <DashboardHeroScene />
      </div>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-0.5 text-sm text-gray-500">Your CRM overview and key metrics.</p>
        </div>
        <DateRangeFilter value={range} onChange={setRange} />
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
        ) : (
          <>
            <MetricCard
              index={0}
              tone="primary"
              icon={Wallet}
              label="Total Revenue"
              value={formatCurrency(report?.revenue?.total ?? 0)}
              numericValue={report?.revenue?.total ?? 0}
              formatValue={formatCurrency}
              change={{ value: 12, label: 'vs previous period' }}
            />
            <MetricCard
              index={1}
              icon={Phone}
              label="Calls Made"
              value={String(report?.calls?.total ?? 0)}
              numericValue={report?.calls?.total ?? 0}
              formatValue={(n) => Math.round(n).toLocaleString()}
              sub={`${report?.calls?.completionRate ?? 0}% completion rate`}
            />
            <MetricCard
              index={2}
              icon={MessageSquare}
              label="Messages Sent"
              value={String(report?.messages?.total ?? 0)}
              numericValue={report?.messages?.total ?? 0}
              formatValue={(n) => Math.round(n).toLocaleString()}
              sub="SMS · WhatsApp · Email"
            />
            <MetricCard
              index={3}
              icon={Trophy}
              label="Deals Won"
              value={String(report?.deals?.won ?? 0)}
              numericValue={report?.deals?.won ?? 0}
              formatValue={(n) => Math.round(n).toLocaleString()}
              change={{
                value: report?.deals?.total > 0 ? Math.round((report.deals.won / report.deals.total) * 100) : 0,
                label: 'win rate',
              }}
            />
          </>
        )}
      </div>

      {/* New Leads Trend */}
      <SectionCard title="New Leads Trend" subtitle="Last 7 days">
        {contactsOverviewError ? (
          <p className="flex h-[220px] items-center justify-center text-sm text-gray-400">Couldn&apos;t load this data.</p>
        ) : (
          <LineChart
            data={dailyNewLeadsData}
            xKey="date"
            series={[{ key: 'count', label: 'New Leads' }]}
            variant="area"
            height={220}
            loading={contactsOverviewLoading}
            formatXLabel={(value) => dailyNewLeadsLabels[value as string] ?? String(value)}
            formatValue={(value) => `${Math.round(value)} new lead${Math.round(value) === 1 ? '' : 's'}`}
            ariaLabel="New leads over the last 7 days"
          />
        )}
      </SectionCard>

      {/* Leads by Status / Leads by Source */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SectionCard index={0} title="Leads by Status" subtitle="All time">
          {contactsOverviewError ? (
            <p className="flex h-[220px] items-center justify-center text-sm text-gray-400">Couldn&apos;t load this data.</p>
          ) : (
            <DonutChart
              data={leadsByStatusData}
              nameKey="status"
              valueKey="count"
              height={220}
              loading={contactsOverviewLoading}
              centerValue={contactsOverview?.total ?? 0}
              centerLabel="Total Leads"
              formatValue={(value) => `${Math.round(value)}`}
              ariaLabel="Leads grouped by status"
            />
          )}
        </SectionCard>

        <SectionCard index={1} title="Leads by Source" subtitle="All time">
          {contactsOverviewError ? (
            <p className="flex h-[220px] items-center justify-center text-sm text-gray-400">Couldn&apos;t load this data.</p>
          ) : leadsBySourceIsDonut ? (
            <DonutChart
              data={leadsBySourceDonutData}
              nameKey="source"
              valueKey="count"
              height={220}
              loading={contactsOverviewLoading}
              formatValue={(value) => `${Math.round(value)}`}
              ariaLabel="Leads grouped by source"
            />
          ) : contactsOverviewLoading ? (
            <div className="h-[220px] animate-pulse rounded-lg bg-gray-50" />
          ) : (
            <SimpleBarChart data={leadsBySourceBarData} height={220} formatValue={(n) => `${n} leads`} />
          )}
        </SectionCard>
      </div>

      {/* Leads snapshot */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-gray-700">Leads Snapshot — {range.label}</h3>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {overviewLoading ? (
            Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)
          ) : (
            <>
              <MetricCard index={0} tone="blue" icon={Users} label="Total Leads" value={String(overview?.leads?.total ?? 0)} numericValue={overview?.leads?.total ?? 0} formatValue={(n) => Math.round(n).toLocaleString()} />
              <MetricCard index={1} tone="green" icon={UserPlus} label="New Leads" value={String(overview?.leads?.newInRange ?? 0)} numericValue={overview?.leads?.newInRange ?? 0} formatValue={(n) => Math.round(n).toLocaleString()} sub={range.label} />
              <MetricCard index={2} tone="amber" icon={CalendarClock} label="Pending Follow-ups" value={String(overview?.leads?.pendingFollowups ?? 0)} numericValue={overview?.leads?.pendingFollowups ?? 0} formatValue={(n) => Math.round(n).toLocaleString()} />
              <MetricCard index={3} tone="red" icon={AlertTriangle} label="Overdue Follow-ups" value={String(overview?.leads?.overdueFollowups ?? 0)} numericValue={overview?.leads?.overdueFollowups ?? 0} formatValue={(n) => Math.round(n).toLocaleString()} />
              <MetricCard
                index={4}
                tone="violet"
                icon={Target}
                label="Conversions"
                value={String(overview?.leads?.conversions ?? 0)}
                numericValue={overview?.leads?.conversions ?? 0}
                formatValue={(n) => Math.round(n).toLocaleString()}
                change={{ value: overview?.leads?.conversionRate ?? 0, label: 'rate' }}
              />
            </>
          )}
        </div>
      </div>

      {/* Activity strip */}
      <SectionCard title="Activity" subtitle={range.label}>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {[
            { label: 'Calls Made', value: overview?.activityInRange?.calls ?? 0, icon: Phone, color: 'text-blue-600' },
            { label: 'SMS Sent', value: overview?.activityInRange?.sms ?? 0, icon: MessageSquare, color: 'text-violet-600' },
            { label: 'Emails Sent', value: overview?.activityInRange?.emails ?? 0, icon: Mail, color: 'text-cyan-600' },
            { label: 'Tasks Due Today', value: overview?.activityInRange?.tasksDue ?? 0, icon: ListChecks, color: 'text-amber-600' },
            { label: 'Overdue', value: overview?.activityInRange?.overdueTasks ?? 0, icon: AlertTriangle, color: 'text-red-600' },
            { label: 'New Leads', value: overview?.activityInRange?.newLeads ?? 0, icon: TrendingUp, color: 'text-emerald-600' },
          ].map((a, i) => (
            <motion.div key={a.label} {...cardMountProps(i, reduceMotion)} className="flex items-center gap-2.5">
              <a.icon className={cn('h-4 w-4 shrink-0', a.color)} />
              <div>
                <p className="text-base font-bold text-gray-900">{a.value}</p>
                <p className="text-[11px] text-gray-400">{a.label}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </SectionCard>

      {/* Deal outcomes (bar chart) + Pipeline (progress list) */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <SectionCard
          index={0}
          className="lg:col-span-2"
          title="Deal Outcomes"
          subtitle={`Deal performance · ${range.label}`}
          trend={{ value: conversionRate, positive: true }}
        >
          {isLoading ? (
            <div className="h-[200px] animate-pulse rounded-lg bg-gray-50" />
          ) : (
            <SimpleBarChart data={dealOutcomeData} activeIndex={dealOutcomeActiveIndex} />
          )}
        </SectionCard>

        <SectionCard index={1} title="Pipeline" subtitle={`By stage · ${range.label}`}>
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="animate-pulse space-y-1.5">
                  <div className="flex justify-between">
                    <div className="h-3.5 w-24 rounded bg-gray-100" />
                    <div className="h-3.5 w-10 rounded bg-gray-100" />
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-gray-100" />
                </div>
              ))}
            </div>
          ) : pipelineEntries.length === 0 ? (
            <p className="text-sm text-gray-400">No pipeline data yet.</p>
          ) : (
            <div className="space-y-4">
              {pipelineEntries.map(([stage, data], i) => (
                <ProgressStat
                  key={stage}
                  index={i}
                  label={stage}
                  count={data.count}
                  percent={(data.value / maxPipelineValue) * 100}
                />
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      {/* Agent Activity */}
      <SectionCard
        title="Agent Activity"
        subtitle="Live floor status"
      >
        <div className="mb-4 -mt-2 flex items-center gap-3 text-[11px] text-gray-400">
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

        {agentFloor.length === 0 ? (
          <p className="py-6 text-center text-sm text-gray-400">No agents on the floor yet.</p>
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {agentFloor.map((a, i) => {
              const meta = agentStatusMeta(a.status);
              const initials = a.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
              return (
                <motion.div
                  key={a.userId}
                  {...cardMountProps(i, reduceMotion)}
                  className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2.5 transition-all duration-150 ease-out hover:-translate-y-0.5 hover:border-gray-200 hover:shadow-sm"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50 text-[11px] font-bold text-blue-700 ring-1 ring-blue-200">
                      {initials}
                    </div>
                    <div>
                      <p className="text-[13px] font-medium text-gray-800">{a.name}</p>
                      <p className="text-[11px] capitalize text-gray-400">{a.role?.toLowerCase()}</p>
                    </div>
                  </div>
                  <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold', meta.bg, meta.text)}>
                    {a.status === 'BREAK' ? <Coffee className="h-3 w-3" /> : <Circle className="h-2 w-2 fill-current" />}
                    {meta.label}
                    {a.status === 'BREAK' && a.breakMinutes !== null && ` · ${a.breakMinutes}m`}
                  </span>
                </motion.div>
              );
            })}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
