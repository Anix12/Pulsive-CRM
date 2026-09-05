'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { cn, formatCurrency, formatDuration } from '@/lib/utils';
import { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import {
  Star, Clock, PhoneCall, MessageSquare, Mail, CalendarClock, LogIn,
  GitBranch, Upload, UserCheck, Megaphone, Radio, Filter as FilterIcon,
  Coffee, ArrowLeft,
} from 'lucide-react';

type ReportTab = 'business' | 'employees' | 'ai-human';
type TopTab = 'overview' | 'catalog';

const COLORS = ['#6366f1', '#34d399', '#f59e0b', '#f87171', '#60a5fa', '#a78bfa'];

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
    case 'call-disposition':
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <StatBox label="Total Calls" value={data?.totalCalls ?? 0} />
            <StatBox label="Connected" value={data?.connected ?? 0} />
            <StatBox label="Dispositions" value={(data?.dispositions ?? []).length} />
          </div>
          <SimpleTable
            headers={['Disposition', 'Category', 'Count']}
            rows={(data?.dispositions ?? []).map((d: any) => [d.name, d.category, d.count])}
            empty="No calls logged with a disposition yet."
          />
        </div>
      );
    case 'sms':
    case 'email':
      return (
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
      );
    case 'follow-up':
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatBox label="Pending" value={data?.pending ?? 0} />
            <StatBox label="Completed" value={data?.completed ?? 0} />
            <StatBox label="Overdue" value={data?.overdue ?? 0} tone="red" />
            <StatBox label="Due Today" value={data?.dueToday ?? 0} tone="amber" />
          </div>
          <SimpleTable
            headers={['Date', 'Tasks Due']}
            rows={(data?.dailySummary ?? []).map((d: any) => [d.date, d.count])}
            empty="No tasks due in the last 7 days."
          />
        </div>
      );
    case 'login-activity':
      return (
        <SimpleTable
          headers={['Name', 'Email', 'Logged In At', 'IP Address']}
          rows={(data?.logins ?? []).map((l: any) => [l.name, l.email, new Date(l.at).toLocaleString(), l.ipAddress ?? '—'])}
          empty="No login activity in this period."
        />
      );
    case 'lead-stage':
      return (
        <SimpleTable
          headers={['Stage', 'Leads']}
          rows={(data?.stages ?? []).map((s: any) => [s.stage, s.count])}
          empty="No leads yet."
        />
      );
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
    case 'lead-source':
      return (
        <SimpleTable
          headers={['Source', 'Leads']}
          rows={(data?.sources ?? []).map((s: any) => [s.source, s.count])}
          empty="No source data yet."
        />
      );
    case 'pipeline-funnel':
      return (
        <div className="space-y-2">
          {(data?.funnel ?? []).map((f: any, i: number) => (
            <div key={i} className="flex items-center gap-3">
              <span className="w-32 shrink-0 text-sm text-gray-600">{f.stage}</span>
              <div className="h-6 flex-1 overflow-hidden rounded bg-gray-100">
                <div
                  className="h-full rounded bg-indigo-500"
                  style={{ width: `${data.funnel[0]?.count ? (f.count / data.funnel[0].count) * 100 : 0}%` }}
                />
              </div>
              <span className="w-12 text-right text-sm font-semibold text-gray-900">{f.count}</span>
              {f.dropOff > 0 && <span className="w-20 text-right text-xs text-red-500">-{f.dropOff} drop-off</span>}
            </div>
          ))}
          {(!data?.funnel || data.funnel.length === 0) && <p className="text-sm text-gray-400">No pipeline stages configured.</p>}
        </div>
      );
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
    <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={cn('mt-1 text-xl font-bold', tone === 'red' ? 'text-red-600' : tone === 'amber' ? 'text-amber-600' : 'text-gray-900')}>{value}</p>
      {sub && <p className="mt-1 text-[11px] text-gray-400">{sub}</p>}
    </div>
  );
}

function SimpleTable({ headers, rows, empty }: { headers: string[]; rows: (string | number)[][]; empty: string }) {
  if (rows.length === 0) return <p className="py-8 text-center text-sm text-gray-400">{empty}</p>;
  return (
    <div className="overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-gray-100">
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
    { name: 'Won', value: business?.deals?.won || 0 },
    { name: 'Lost', value: business?.deals?.lost || 0 },
    { name: 'Open', value: (business?.deals?.total || 0) - (business?.deals?.won || 0) - (business?.deals?.lost || 0) },
  ].filter((d) => d.value > 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
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
              return (
                <>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <report.icon className="h-5 w-5 text-indigo-500" />
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
                  <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
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
                  <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
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
                  {REPORT_CATALOG.filter((r) => r.category === cat).map((r) => (
                    <button
                      key={r.key}
                      onClick={() => openReport(r.key)}
                      className="group flex items-center justify-between rounded-xl border border-gray-100 bg-white p-4 text-left shadow-sm transition hover:border-indigo-200 hover:shadow-md"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                          <r.icon className="h-4 w-4" />
                        </div>
                        <span className="text-sm font-medium text-gray-800">{r.label}</span>
                      </div>
                      <Star
                        onClick={(e) => { e.stopPropagation(); toggleFavorite(r.key); }}
                        className={cn('h-4 w-4 shrink-0 transition', favorites.includes(r.key) ? 'fill-current text-amber-500' : 'text-gray-200 group-hover:text-gray-300')}
                      />
                    </button>
                  ))}
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
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { label: 'Total Revenue', value: formatCurrency(business?.revenue?.total || 0), sub: 'Won deals this month' },
                { label: 'Calls Made', value: business?.calls?.total || 0, sub: `${business?.calls?.completionRate || 0}% completion rate` },
                { label: 'Messages Sent', value: business?.messages?.total || 0, sub: 'SMS + WhatsApp' },
                { label: 'Deals Won', value: business?.deals?.won || 0, sub: `${business?.deals?.conversionRate || 0}% conversion` },
                { label: 'Total Contacts', value: business?.contacts?.total || 0, sub: `${business?.contacts?.new || 0} new this month` },
                { label: 'Avg Call Duration', value: business?.calls?.avgDuration ? formatDuration(business.calls.avgDuration) : '—', sub: 'Per completed call' },
              ].map(({ label, value, sub }) => (
                <div key={label} className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
                  <p className="text-sm text-gray-500">{label}</p>
                  <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
                  <p className="mt-1 text-xs text-gray-400">{sub}</p>
                </div>
              ))}
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              {pipelineChartData.length > 0 && (
                <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
                  <h3 className="font-semibold text-gray-900 mb-4">Pipeline by Stage</h3>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={pipelineChartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v: any, name: string) => name === 'value' ? formatCurrency(v) : v} />
                      <Bar dataKey="deals" name="Deals" fill="#6366f1" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {dealPieData.length > 0 && (
                <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
                  <h3 className="font-semibold text-gray-900 mb-4">Deal Outcomes</h3>
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={dealPieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                        {dealPieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>
        )
      )}

      {tab === 'employees' && (
        loadingEmp ? <div className="flex h-48 items-center justify-center text-gray-500">Loading...</div> : (
          <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-100">
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
              { label: 'AI Initiated Calls', value: aiHuman?.calls?.aiInitiated || 0, total: aiHuman?.calls?.total || 0, color: 'bg-indigo-100 text-indigo-700' },
              { label: 'Human Calls', value: aiHuman?.calls?.human || 0, total: aiHuman?.calls?.total || 0, color: 'bg-purple-100 text-purple-700' },
            ].map(({ label, value, total, color }) => (
              <div key={label} className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
                <p className="text-sm text-gray-500">{label}</p>
                <p className="mt-1 text-3xl font-bold text-gray-900">{value}</p>
                <div className="mt-3 h-2 rounded-full bg-gray-100">
                  <div
                    className={`h-2 rounded-full ${color.split(' ')[0]}`}
                    style={{ width: `${total ? (value / total) * 100 : 0}%` }}
                  />
                </div>
                <p className="mt-1 text-xs text-gray-400">{total ? Math.round((value / total) * 100) : 0}% of total</p>
              </div>
            ))}
          </div>
        )
      )}
      </>
      )}
    </div>
  );
}
