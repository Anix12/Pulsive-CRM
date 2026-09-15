'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { cn, formatCurrency, formatDuration } from '@/lib/utils';
import { useEffect, useState } from 'react';
import {
  Star, Clock, PhoneCall, MessageSquare, Mail, CalendarClock, LogIn,
  GitBranch, Upload, UserCheck, Megaphone, Radio, Filter as FilterIcon,
  Coffee, ArrowLeft,
} from 'lucide-react';
import { MetricCard } from '@/components/ui/MetricCard';
import { ProgressStat } from '@/components/ui/ProgressStat';
import { SectionCard } from '@/components/ui/SectionCard';
import { SimpleBarChart } from '@/components/ui/SimpleBarChart';
import { DonutChart } from '@/components/ui/DonutChart';
import { LineChart } from '@/components/ui/LineChart';
import { CHART_COLORS } from '@/lib/chartColors';

type ReportTab = 'business' | 'employees' | 'ai-human';
type TopTab = 'overview' | 'catalog';

const COLORS = CHART_COLORS;

// ── Report Catalog definitions ────────────────────────────────────────────────
interface ReportDef {
  key: string;
  label: string;
  category: string;
  icon: React.ElementType;
  endpoint: string;
}

const REPORT_CATALOG: ReportDef[] = [
  { key: 'call-disposition', label: 'Call Disposition', category: 'Calls', icon: PhoneCall, endpoint: '/api/v1/reports/call-disposition' },
  { key: 'call-report', label: 'Call Report', category: 'Calls', icon: PhoneCall, endpoint: '/api/v1/reports/call-report' },
  { key: 'campaign-call-logs', label: 'Campaign Call Logs', category: 'Calls', icon: Radio, endpoint: '/api/v1/reports/campaign-call-logs' },
  { key: 'sms', label: 'SMS Report', category: 'Messaging', icon: MessageSquare, endpoint: '/api/v1/reports/sms' },
  { key: 'email', label: 'Email Report', category: 'Messaging', icon: Mail, endpoint: '/api/v1/reports/email' },
  { key: 'follow-up', label: 'Follow-up Report', category: 'Leads & Pipeline', icon: CalendarClock, endpoint: '/api/v1/reports/follow-up' },
  { key: 'lead-stage', label: 'Lead Stage', category: 'Leads & Pipeline', icon: FilterIcon, endpoint: '/api/v1/reports/lead-stage' },
  { key: 'lead-source', label: 'Lead Source', category: 'Leads & Pipeline', icon: FilterIcon, endpoint: '/api/v1/reports/lead-source' },
  { key: 'pipeline-funnel', label: 'Pipeline Funnel', category: 'Leads & Pipeline', icon: GitBranch, endpoint: '/api/v1/reports/pipeline-funnel' },
  { key: 'import-logs', label: 'Import Logs', category: 'Leads & Pipeline', icon: Upload, endpoint: '/api/v1/reports/import-logs' },
  { key: 'agent-performance', label: 'Agent Performance', category: 'Team', icon: UserCheck, endpoint: '/api/v1/reports/agent-performance' },
  { key: 'login-activity', label: 'Login Activity', category: 'Team', icon: LogIn, endpoint: '/api/v1/reports/login-activity' },
  { key: 'break-report', label: 'Break Report', category: 'Team', icon: Coffee, endpoint: '/api/v1/reports/break-report' },
  { key: 'campaign-performance', label: 'Campaign Performance', category: 'Campaigns', icon: Megaphone, endpoint: '/api/v1/reports/campaign-performance' },
];

const CATEGORIES = Array.from(new Set(REPORT_CATALOG.map((r) => r.category)));

// ── localStorage-backed favorites / recently viewed ───────────────────────────
const FAV_KEY = 'crm.reports.favorites';
const RECENT_KEY = 'crm.reports.recent';

function useLocalList(storageKey: string) {
  const [list, setList] = useState<string[]>([]);
  useEffect(() => {
    try { setList(JSON.parse(localStorage.getItem(storageKey) || '[]')); } catch { setList([]); }
  }, [storageKey]);
  const persist = (next: string[]) => {
    setList(next);
    localStorage.setItem(storageKey, JSON.stringify(next));
  };
  return [list, persist] as const;
}

// ── Individual report detail renderer ─────────────────────────────────────────
function ReportDetail({ report }: { report: ReportDef }) {
  const [view, setView] = useState<'daily' | 'hourly'>('daily');
  const isCallReport = report.key === 'call-report';

  const { data, isLoading } = useQuery({
    queryKey: ['report-detail', report.key, isCallReport ? view : null],
    queryFn: async () => {
      const { data } = await api.get(report.endpoint, { params: isCallReport ? { view } : undefined });
      return data.data;
    },
  });

  if (isLoading) return <div className="flex h-48 items-center justify-center text-gray-400">Loading…</div>;

  switch (report.key) {
    case 'call-disposition': {
      const dispositions = data?.dispositions ?? [];
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <StatBox label="Total Calls" value={data?.totalCalls ?? 0} />
            <StatBox label="Connected" value={data?.connected ?? 0} />
            <StatBox label="Dispositions" value={dispositions.length} />
          </div>
          {dispositions.length > 0 && (
            <SimpleBarChart
              data={dispositions.slice(0, 8).map((d: any) => ({ label: d.name, value: d.count }))}
              height={150}
              formatValue={(n) => `${n} call${n === 1 ? '' : 's'}`}
            />
          )}
          <SimpleTable
            headers={['Disposition', 'Category', 'Count']}
            rows={dispositions.map((d: any) => [d.name, d.category, d.count])}
            empty="No calls logged with a disposition yet."
          />
        </div>
      );
    }
    case 'sms':
    case 'email': {
      const channelSegments = [
        { label: 'Sent', count: data?.sent ?? 0, color: '#6366f1' },
        { label: 'Delivered', count: data?.delivered ?? 0, color: '#34d399' },
        { label: 'Failed', count: data?.failed ?? 0, color: '#f87171' },
      ].filter((s) => s.count > 0);
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatBox label="Total" value={data?.total ?? 0} />
            <StatBox label="Sent" value={data?.sent ?? 0} />
            <StatBox label="Delivered" value={data?.delivered ?? 0} />
            <StatBox label="Failed" value={data?.failed ?? 0} />
            {report.key === 'email' && (
              <>
                <StatBox label="Open Rate" value={`${data?.openRate ?? 0}%`} sub="Provider tracking not connected" />
                <StatBox label="Click Rate" value={`${data?.clickRate ?? 0}%`} sub="Provider tracking not connected" />
              </>
            )}
          </div>
          {channelSegments.length > 0 && (
            <div className="max-w-xs">
              <DonutChart
                data={channelSegments}
                nameKey="label"
                valueKey="count"
                colors={channelSegments.map((s) => s.color)}
                height={160}
                ariaLabel={`${report.label} messages grouped by delivery status`}
              />
            </div>
          )}
        </div>
      );
    }
    case 'follow-up': {
      const dailySummary = data?.dailySummary ?? [];
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatBox label="Pending" value={data?.pending ?? 0} />
            <StatBox label="Completed" value={data?.completed ?? 0} />
            <StatBox label="Overdue" value={data?.overdue ?? 0} tone="red" />
            <StatBox label="Due Today" value={data?.dueToday ?? 0} tone="amber" />
          </div>
          {dailySummary.length > 0 && (
            <LineChart
              data={dailySummary}
              xKey="date"
              series={[{ key: 'count', label: 'Tasks Due', color: '#6366f1' }]}
              variant="area"
              height={160}
              formatValue={(v) => `${Math.round(v)} task${Math.round(v) === 1 ? '' : 's'}`}
              ariaLabel="Tasks due over the last 7 days"
            />
          )}
          <SimpleTable
            headers={['Date', 'Tasks Due']}
            rows={dailySummary.map((d: any) => [d.date, d.count])}
            empty="No tasks due in the last 7 days."
          />
        </div>
      );
    }
    case 'login-activity':
      return (
        <SimpleTable
          headers={['Name', 'Email', 'Logged In At', 'IP Address']}
          rows={(data?.logins ?? []).map((l: any) => [l.name, l.email, new Date(l.at).toLocaleString(), l.ipAddress ?? '—'])}
          empty="No login activity in this period."
        />
      );
    case 'lead-stage': {
      const stages = data?.stages ?? [];
      const stageSegments = stages.map((s: any, i: number) => ({ label: s.stage, count: s.count, color: CHART_COLORS[i % CHART_COLORS.length] }));
      return (
        <div className="space-y-4">
          {stageSegments.length > 0 && (
            <div className="max-w-xs">
              <DonutChart
                data={stageSegments}
                nameKey="label"
                valueKey="count"
                colors={stageSegments.map((s: any) => s.color)}
                height={180}
                ariaLabel="Leads grouped by stage"
              />
            </div>
          )}
          <SimpleTable
            headers={['Stage', 'Leads']}
            rows={stages.map((s: any) => [s.stage, s.count])}
            empty="No leads yet."
          />
        </div>
      );
    }
    case 'import-logs':
      return (
        <SimpleTable
          headers={['Resource', 'Imported', 'By', 'At']}
          rows={(data?.imports ?? []).map((i: any) => [i.resource, i.importedCount, i.by, new Date(i.at).toLocaleString()])}
          empty="No CSV imports yet."
        />
      );
    case 'agent-performance':
      return (
        <SimpleTable
          headers={['Agent', 'Calls', 'Connected', 'Messages', 'Deals Won', 'Talk Time']}
          rows={(data?.agents ?? []).map((a: any) => [a.name, a.calls, a.connectedCalls, a.messages, a.dealsWon, formatDuration(a.talkTimeSeconds)])}
          empty="No agents found."
        />
      );
    case 'campaign-performance':
      return (
        <SimpleTable
          headers={['Campaign', 'Leads', 'Converted', 'Lost', 'Conversion %']}
          rows={(data?.campaigns ?? []).map((c: any) => [c.name, c.leads, c.converted, c.lost, `${c.conversionRate}%`])}
          empty="No campaigns yet."
        />
      );
    case 'lead-source': {
      const sources = data?.sources ?? [];
      const sourceIsDonut = sources.length <= 6;
      return (
        <div className="space-y-4">
          {sources.length > 0 && (
            <div className={sourceIsDonut ? 'max-w-xs' : undefined}>
              {sourceIsDonut ? (
                <DonutChart
                  data={sources.map((s: any, i: number) => ({ source: s.source, count: s.count, color: CHART_COLORS[i % CHART_COLORS.length] }))}
                  nameKey="source"
                  valueKey="count"
                  colors={sources.map((_: any, i: number) => CHART_COLORS[i % CHART_COLORS.length])}
                  height={180}
                  ariaLabel="Leads grouped by source"
                />
              ) : (
                <SimpleBarChart
                  data={[...sources].sort((a: any, b: any) => b.count - a.count).slice(0, 12).map((s: any) => ({ label: s.source, value: s.count }))}
                  height={160}
                  formatValue={(n) => `${n} lead${n === 1 ? '' : 's'}`}
                />
              )}
            </div>
          )}
          <SimpleTable
            headers={['Source', 'Leads']}
            rows={sources.map((s: any) => [s.source, s.count])}
            empty="No source data yet."
          />
        </div>
      );
    }
    case 'pipeline-funnel': {
      // Not rendered as a FunnelChart: a deal sits in exactly one stage at a time (current
      // pipeline position, not a cumulative "reached this stage or beyond" count), so later
      // stages can legitimately hold more deals than earlier ones — a funnel shape would
      // misrepresent that. Same reasoning as the Deals page's "Pipeline by Stage" bar chart.
      const funnel = data?.funnel ?? [];
      return funnel.length > 0 ? (
        <SimpleBarChart
          data={funnel.map((f: any) => ({ label: f.stage, value: f.count }))}
          height={Math.max(160, 40 * Math.min(funnel.length, 6))}
          formatValue={(n) => `${n} deal${n === 1 ? '' : 's'}`}
        />
      ) : (
        <p className="text-sm text-gray-400">No pipeline stages configured.</p>
      );
    }
    case 'call-report':
      return (
        <div className="space-y-4">
          <div className="flex gap-1 rounded-lg bg-gray-100 p-1 w-fit">
            {(['daily', 'hourly'] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={cn('rounded-md px-4 py-1.5 text-xs font-medium transition-colors', view === v ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500')}
              >
                {v === 'daily' ? 'Table View' : 'Hourly Report'}
              </button>
            ))}
          </div>
          {view === 'daily' ? (
            <SimpleTable
              headers={['Agent', 'Total', 'Connected', 'Not Connected', 'Out Connected', 'In Connected', 'Unanswered', 'Avg Duration']}
              rows={(data?.rows ?? []).map((r: any) => [r.agent, r.total, r.connected, r.notConnected, r.outConnected, r.inConnected, r.unanswered, formatDuration(r.avgDuration)])}
              empty="No calls logged."
            />
          ) : (
            <SimpleTable
              headers={['Hour', 'Calls']}
              rows={(data?.hours ?? []).map((h: any) => [`${h.hour}:00`, h.count])}
              empty="No calls logged."
            />
          )}
        </div>
      );
    case 'campaign-call-logs':
      return (
        <SimpleTable
          headers={['Campaign', 'Contact', 'Agent', 'Status', 'Duration', 'Recording']}
          rows={(data?.calls ?? []).map((c: any) => [
            c.campaign, c.contact, c.agent, c.status, formatDuration(c.duration ?? 0),
            c.recordingUrl ? 'Available' : '—',
          ])}
          empty="No calls linked to a campaign yet."
        />
      );
    case 'break-report':
      return (
        <SimpleTable
          headers={['Agent', 'Total Breaks', 'Total Minutes']}
          rows={(data?.agents ?? []).map((a: any) => [a.agent, a.breaks, a.totalMinutes])}
          empty="No breaks logged in this period."
        />
      );
    default:
      return <p className="text-sm text-gray-400">Report not available.</p>;
  }
}

function StatBox({ label, value, sub, tone }: { label: string; value: string | number; sub?: string; tone?: 'red' | 'amber' }) {
  return (
    <MetricCard
      label={label}
      value={String(value)}
      sub={sub}
      valueClassName={tone === 'red' ? 'text-red-600' : tone === 'amber' ? 'text-amber-600' : undefined}
    />
  );
}

function SimpleTable({ headers, rows, empty }: { headers: string[]; rows: (string | number)[][]; empty: string }) {
  if (rows.length === 0) return <p className="py-8 text-center text-sm text-gray-400">{empty}</p>;
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
      <table className="min-w-full divide-y divide-gray-100">
        <thead className="bg-gray-50">
          <tr>
            {headers.map((h) => <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">{h}</th>)}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {rows.map((row, i) => (
            <tr key={i} className="hover:bg-gray-50">
              {row.map((cell, j) => <td key={j} className="px-4 py-3 text-sm text-gray-700">{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function ReportsPage() {
  const [tab, setTab] = useState<ReportTab>('business');
  const [topTab, setTopTab] = useState<TopTab>('overview');
  const [selectedReport, setSelectedReport] = useState<string | null>(null);
  const [favorites, setFavorites] = useLocalList(FAV_KEY);
  const [recent, setRecent] = useLocalList(RECENT_KEY);

  const openReport = (key: string) => {
    setSelectedReport(key);
    setRecent([key, ...recent.filter((r) => r !== key)].slice(0, 5));
  };

  const toggleFavorite = (key: string) => {
    setFavorites(favorites.includes(key) ? favorites.filter((f) => f !== key) : [...favorites, key]);
  };

  const { data: business, isLoading: loadingBiz } = useQuery({
    queryKey: ['reports', 'business'],
    queryFn: async () => { const { data } = await api.get('/api/v1/reports/business-performance'); return data.data; },
  });

  const { data: employees, isLoading: loadingEmp } = useQuery({
    queryKey: ['reports', 'employees'],
    queryFn: async () => { const { data } = await api.get('/api/v1/reports/employee-attribution'); return data.data; },
    enabled: tab === 'employees',
  });

  const { data: aiHuman, isLoading: loadingAI } = useQuery({
    queryKey: ['reports', 'ai-human'],
    queryFn: async () => { const { data } = await api.get('/api/v1/reports/ai-vs-human'); return data.data; },
    enabled: tab === 'ai-human',
  });

  const tabs: { key: ReportTab; label: string }[] = [
    { key: 'business', label: 'Business Performance' },
    { key: 'employees', label: 'Employee Attribution' },
    { key: 'ai-human', label: 'AI vs Human' },
  ];

  const pipelineChartData = business?.pipeline
    ? Object.entries(business.pipeline as Record<string, any>).map(([name, d]) => ({
        name, deals: (d as any).count, value: (d as any).value,
      }))
    : [];

  const dealPieData = [
    { name: 'Won', value: business?.deals?.won || 0, color: '#34d399' },
    { name: 'Lost', value: business?.deals?.lost || 0, color: '#f87171' },
    { name: 'Open', value: (business?.deals?.total || 0) - (business?.deals?.won || 0) - (business?.deals?.lost || 0), color: '#9ca3af' },
  ].filter((d) => d.value > 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
        <p className="mt-0.5 text-sm text-gray-500">Business performance and team analytics.</p>
      </div>

      <div className="flex items-center justify-end">
        <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
          {(['overview', 'catalog'] as const).map((t) => (
            <button
              key={t}
              onClick={() => { setTopTab(t); setSelectedReport(null); }}
              className={cn('rounded-md px-4 py-1.5 text-sm font-medium transition-colors', topTab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900')}
            >
              {t === 'overview' ? 'Overview' : 'Report Catalog'}
            </button>
          ))}
        </div>
      </div>

      {topTab === 'catalog' && (
        selectedReport ? (
          <div className="space-y-5">
            <button
              onClick={() => setSelectedReport(null)}
              className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-800"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back to catalog
            </button>
            {(() => {
              const report = REPORT_CATALOG.find((r) => r.key === selectedReport)!;
              // See MetricCard.tsx's IconComponent comment: pinning to a concrete
              // ComponentType sidesteps a JSX.LibraryManagedAttributes resolution issue
              // that appears once @react-three/fiber's global JSX augmentation is loaded.
              const Icon = report.icon as React.ComponentType<{ className?: string }>;
              return (
                <>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className="h-5 w-5 text-indigo-500" />
                      <h2 className="text-lg font-semibold text-gray-900">{report.label}</h2>
                    </div>
                    <button
                      onClick={() => toggleFavorite(report.key)}
                      className={cn('rounded-lg p-2 transition', favorites.includes(report.key) ? 'text-amber-500' : 'text-gray-300 hover:text-gray-400')}
                    >
                      <Star className={cn('h-4 w-4', favorites.includes(report.key) && 'fill-current')} />
                    </button>
                  </div>
                  <ReportDetail report={report} />
                </>
              );
            })()}
          </div>
        ) : (
          <div className="space-y-6">
            {(favorites.length > 0 || recent.length > 0) && (
              <div className="grid gap-4 sm:grid-cols-2">
                {favorites.length > 0 && (
                  <div className="rounded-xl border border-gray-200 bg-white p-4">
                    <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-400">
                      <Star className="h-3 w-3 fill-current text-amber-500" /> Favorites
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {favorites.map((key) => {
                        const r = REPORT_CATALOG.find((x) => x.key === key);
                        if (!r) return null;
                        return (
                          <button key={key} onClick={() => openReport(key)} className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50">
                            {r.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
                {recent.length > 0 && (
                  <div className="rounded-xl border border-gray-200 bg-white p-4">
                    <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-400">
                      <Clock className="h-3 w-3" /> Recently Viewed
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {recent.map((key) => {
                        const r = REPORT_CATALOG.find((x) => x.key === key);
                        if (!r) return null;
                        return (
                          <button key={key} onClick={() => openReport(key)} className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50">
                            {r.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {CATEGORIES.map((cat) => (
              <div key={cat}>
                <h3 className="mb-3 text-sm font-semibold text-gray-700">{cat}</h3>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {REPORT_CATALOG.filter((r) => r.category === cat).map((r) => {
                    const Icon = r.icon as React.ComponentType<{ className?: string }>;
                    return (
                    <button
                      key={r.key}
                      onClick={() => openReport(r.key)}
                      className="group flex items-center justify-between rounded-xl border border-gray-100 bg-white p-4 text-left shadow-sm transition hover:border-indigo-200 hover:shadow-md"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                          <Icon className="h-4 w-4" />
                        </div>
                        <span className="text-sm font-medium text-gray-800">{r.label}</span>
                      </div>
                      <Star
                        onClick={(e) => { e.stopPropagation(); toggleFavorite(r.key); }}
                        className={cn('h-4 w-4 shrink-0 transition', favorites.includes(r.key) ? 'fill-current text-amber-500' : 'text-gray-200 group-hover:text-gray-300')}
                      />
                    </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {topTab === 'overview' && (
      <>
      <div className="flex gap-1 rounded-lg bg-gray-100 p-1 w-fit">
        {tabs.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${tab === key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'business' && (
        loadingBiz ? <div className="flex h-48 items-center justify-center text-gray-500">Loading...</div> : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard
                index={0}
                label="Total Revenue"
                value={formatCurrency(business?.revenue?.total || 0)}
                numericValue={business?.revenue?.total || 0}
                formatValue={formatCurrency}
                sub="Won deals this month"
              />
              <MetricCard
                index={1}
                label="Calls Made"
                value={String(business?.calls?.total || 0)}
                numericValue={business?.calls?.total || 0}
                formatValue={(n) => Math.round(n).toLocaleString()}
                sub={`${business?.calls?.completionRate || 0}% completion rate`}
              />
              <MetricCard
                index={2}
                label="Messages Sent"
                value={String(business?.messages?.total || 0)}
                numericValue={business?.messages?.total || 0}
                formatValue={(n) => Math.round(n).toLocaleString()}
                sub="SMS + WhatsApp"
              />
              <MetricCard
                index={3}
                label="Deals Won"
                value={String(business?.deals?.won || 0)}
                numericValue={business?.deals?.won || 0}
                formatValue={(n) => Math.round(n).toLocaleString()}
                sub={`${business?.deals?.conversionRate || 0}% conversion`}
              />
              <MetricCard
                index={4}
                label="Total Contacts"
                value={String(business?.contacts?.total || 0)}
                numericValue={business?.contacts?.total || 0}
                formatValue={(n) => Math.round(n).toLocaleString()}
                sub={`${business?.contacts?.new || 0} new this month`}
              />
              <MetricCard
                index={5}
                label="Avg Call Duration"
                value={business?.calls?.avgDuration ? formatDuration(business.calls.avgDuration) : '—'}
                sub="Per completed call"
              />
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              {pipelineChartData.length > 0 && (
                <SectionCard index={0} title="Pipeline by Stage" subtitle="Deals per stage">
                  <SimpleBarChart
                    data={pipelineChartData.map((d) => ({ label: d.name, value: d.deals }))}
                    formatValue={(n) => `${n} deals`}
                  />
                </SectionCard>
              )}

              {dealPieData.length > 0 && (
                <SectionCard index={1} title="Deal Outcomes" subtitle="Won · Lost · Open">
                  <DonutChart
                    data={dealPieData}
                    nameKey="name"
                    valueKey="value"
                    colors={dealPieData.map((d) => d.color)}
                    height={220}
                    ariaLabel="Deals grouped by outcome"
                  />
                </SectionCard>
              )}
            </div>
          </div>
        )
      )}

      {tab === 'employees' && (
        loadingEmp ? <div className="flex h-48 items-center justify-center text-gray-500">Loading...</div> : (
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
            {!employees?.length ? (
              <div className="flex h-48 items-center justify-center text-gray-400 text-sm">No employee data available.</div>
            ) : (
              <table className="min-w-full divide-y divide-gray-100">
                <thead className="bg-gray-50">
                  <tr>
                    {['Agent', 'Calls', 'Avg Duration', 'Messages', 'Deals Won', 'Revenue'].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {employees.map((emp: any) => (
                    <tr key={emp.user.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700">
                            {emp.user.firstName?.[0]}{emp.user.lastName?.[0]}
                          </div>
                          <span className="text-sm font-medium text-gray-900">{emp.user.firstName} {emp.user.lastName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{emp.calls.total}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{emp.calls.avgDuration ? formatDuration(emp.calls.avgDuration) : '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{emp.messages.total}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{emp.deals.won}/{emp.deals.total}</td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{formatCurrency(emp.deals.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )
      )}

      {tab === 'ai-human' && (
        loadingAI ? <div className="flex h-48 items-center justify-center text-gray-500">Loading...</div> : (
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { label: 'AI Initiated Calls', value: aiHuman?.calls?.aiInitiated || 0, total: aiHuman?.calls?.total || 0, color: 'bg-blue-600' },
              { label: 'Human Calls', value: aiHuman?.calls?.human || 0, total: aiHuman?.calls?.total || 0, color: 'bg-violet-500' },
            ].map(({ label, value, total, color }, i) => {
              const pct = total ? Math.round((value / total) * 100) : 0;
              return (
                <SectionCard key={label} index={i} title={label} subtitle={`${pct}% of total`}>
                  <p className="text-3xl font-bold text-gray-900">{value}</p>
                  <div className="mt-3">
                    <ProgressStat label="Share of total" count={`${pct}%`} percent={pct} color={color} index={i} />
                  </div>
                </SectionCard>
              );
            })}
          </div>
        )
      )}
      </>
      )}
    </div>
  );
}
