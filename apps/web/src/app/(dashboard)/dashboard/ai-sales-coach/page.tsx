'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import api from '@/lib/api';
import { cn, formatCurrency, getInitials, avatarColor } from '@/lib/utils';
import { format } from 'date-fns';
import {
  Phone, Users, Filter, DollarSign, XCircle, BarChart3,
  Bot, RefreshCw, MessageSquare, ArrowUpRight,
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { AiSalesCoachTabs } from './_tabs';

interface Overview {
  kpis: {
    activeCalls: number;
    leadsContactedToday: number;
    qualifiedLeadsToday: number;
    convertedToday: number;
    lostToday: number;
    revenueToday: number;
  };
  liveCalls: {
    id: string;
    contactId: string | null;
    agentId: string | null;
    agent: string;
    lead: string;
    phone: string;
    startedAt: string | null;
    disposition: string | null;
    isAiInitiated: boolean;
  }[];
  activityFeed: {
    id: string;
    type: string;
    subject: string;
    body: string | null;
    occurredAt: string;
    contactId: string | null;
    contactName: string | null;
    userName: string;
  }[];
  teamPerformance: { agentId: string; name: string; calls: number; qualified: number; converted: number; rate: number }[];
  callOutcomes: { label: string; count: number; category: string; color: string }[];
  totalCallsToday: number;
}

function useTicker() {
  const [, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);
}

function liveDuration(startedAt: string | null) {
  if (!startedAt) return '—';
  const secs = Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000));
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

const KPI_DEFS = [
  { key: 'activeCalls', label: 'Active Calls', icon: Phone, bg: 'bg-blue-50', fg: 'text-blue-600', href: undefined },
  { key: 'leadsContactedToday', label: 'Leads Contacted', icon: Users, bg: 'bg-indigo-50', fg: 'text-indigo-600', href: '/dashboard/contacts' },
  { key: 'qualifiedLeadsToday', label: 'Qualified Leads', icon: Filter, bg: 'bg-green-50', fg: 'text-green-600', href: '/dashboard/contacts' },
  { key: 'convertedToday', label: 'Converted', icon: DollarSign, bg: 'bg-green-50', fg: 'text-green-600', href: '/dashboard/deals' },
  { key: 'lostToday', label: 'Lost', icon: XCircle, bg: 'bg-red-50', fg: 'text-red-600', href: '/dashboard/deals' },
  { key: 'revenueToday', label: 'Revenue (Today)', icon: BarChart3, bg: 'bg-violet-50', fg: 'text-violet-600', href: '/dashboard/reports' },
] as const;

export default function AiSalesCoachPage() {
  useTicker();

  const { data, isLoading, isError, error, dataUpdatedAt } = useQuery<Overview>({
    queryKey: ['ai-sales-coach-overview'],
    queryFn: async () => (await api.get('/api/v1/ai-sales-coach/overview')).data.data,
    refetchInterval: 15000,
  });

  if (isError) {
    const status = (error as any)?.response?.status;
    return (
      <div className="space-y-5">
        <AiSalesCoachTabs />
        <div className="flex h-64 flex-col items-center justify-center gap-2 rounded-xl bg-white shadow-sm ring-1 ring-gray-100">
          <Bot className="h-10 w-10 text-gray-200" />
          <p className="text-sm text-gray-500">
            {status === 403 ? "You don't have access to AI Sales Coach — it's available to Owners, Admins, and Managers." : 'Failed to load AI Sales Coach data.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <AiSalesCoachTabs />
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI Sales Coach</h1>
          <p className="text-sm text-gray-500">Live team performance and real-time call insights</p>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-500">
          <RefreshCw className="h-3 w-3" />
          {dataUpdatedAt ? `Updated ${format(new Date(dataUpdatedAt), 'HH:mm:ss')} · refreshes every 15s` : 'Loading…'}
        </div>
      </div>

      {isLoading || !data ? (
        <div className="flex h-48 items-center justify-center text-gray-500">Loading...</div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {KPI_DEFS.map((k) => {
              const Icon = k.icon;
              const raw = data.kpis[k.key];
              const value = k.key === 'revenueToday' ? formatCurrency(raw) : raw;
              const card = (
                <div className="flex items-center gap-3 rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-100 transition hover:ring-indigo-200">
                  <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg', k.bg)}>
                    <Icon className={cn('h-4.5 w-4.5', k.fg)} />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-lg font-bold text-gray-900">{value}</p>
                    <p className="truncate text-[11px] text-gray-400">{k.label}</p>
                  </div>
                </div>
              );
              return k.href ? <Link key={k.key} href={k.href}>{card}</Link> : <div key={k.key}>{card}</div>;
            })}
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.6fr_1fr]">
            {/* Live Calls Monitor */}
            <div className="rounded-xl bg-white shadow-sm ring-1 ring-gray-100">
              <div className="flex items-center gap-2 px-5 pt-4">
                <h3 className="text-sm font-semibold text-gray-900">Live Calls Monitor</h3>
                <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-bold text-green-700">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-500" /> {data.liveCalls.length} on call
                </span>
                <Link href="/dashboard/ai-sales-coach/live-calls" className="ml-auto flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-500">
                  View All <ArrowUpRight className="h-3 w-3" />
                </Link>
              </div>
              <p className="px-5 pb-3 pt-1 text-xs text-gray-400">Calls currently in progress across your team</p>
              {data.liveCalls.length === 0 ? (
                <p className="px-5 pb-6 text-sm text-gray-400">No calls in progress right now.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 text-left text-[10px] font-bold uppercase tracking-wide text-gray-400">
                        <th className="px-5 py-2">Agent</th>
                        <th className="px-5 py-2">Lead</th>
                        <th className="px-5 py-2">Phone</th>
                        <th className="px-5 py-2">Duration</th>
                        <th className="px-5 py-2">Disposition</th>
                        <th className="px-5 py-2">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.liveCalls.map((c) => (
                        <tr key={c.id} className="border-b border-gray-50 last:border-none">
                          <td className="px-5 py-2.5">
                            <div className="flex items-center gap-2">
                              <div className={cn('flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-white', avatarColor(c.agent))}>
                                {getInitials(c.agent)}
                              </div>
                              {c.agent}
                            </div>
                          </td>
                          <td className="px-5 py-2.5 font-medium text-gray-900">
                            {c.contactId ? (
                              <Link href={`/dashboard/contacts/${c.contactId}`} className="hover:text-indigo-600 hover:underline">
                                {c.lead}
                              </Link>
                            ) : c.lead}
                          </td>
                          <td className="px-5 py-2.5 font-mono text-xs text-gray-500">{c.phone}</td>
                          <td className="px-5 py-2.5 font-mono text-xs">{liveDuration(c.startedAt)}</td>
                          <td className="px-5 py-2.5 text-xs text-gray-500">{c.disposition || '—'}</td>
                          <td className="px-5 py-2.5">
                            <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-[10px] font-bold text-indigo-600">On Call</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Live Activity Feed */}
            <div className="rounded-xl bg-white shadow-sm ring-1 ring-gray-100">
              <div className="flex items-center gap-2 px-5 pt-4">
                <h3 className="text-sm font-semibold text-gray-900">Recent Activity</h3>
                <Link href="/dashboard/ai-sales-coach/activity" className="ml-auto flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-500">
                  View All <ArrowUpRight className="h-3 w-3" />
                </Link>
              </div>
              <p className="px-5 pb-3 pt-1 text-xs text-gray-400">Latest logged activity across your team</p>
              <div className="max-h-[420px] space-y-1 overflow-y-auto px-3 pb-4">
                {data.activityFeed.length === 0 ? (
                  <p className="px-2 text-sm text-gray-400">No recent activity yet.</p>
                ) : (
                  data.activityFeed.map((f) => (
                    <div key={f.id} className="flex gap-3 rounded-lg px-2 py-2 hover:bg-gray-50">
                      <span className="w-12 shrink-0 pt-0.5 font-mono text-[10px] text-gray-400">{format(new Date(f.occurredAt), 'HH:mm')}</span>
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
                        <MessageSquare className="h-3 w-3" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-gray-900">
                          <b>
                            {f.contactId ? (
                              <Link href={`/dashboard/contacts/${f.contactId}`} className="hover:text-indigo-600 hover:underline">
                                {f.contactName}
                              </Link>
                            ) : (f.contactName || f.userName)}
                          </b>
                          {' '}— {f.subject}
                        </p>
                        {f.body && <p className="truncate text-[11px] text-gray-400">{f.body}</p>}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.3fr_1fr]">
            {/* Team Performance */}
            <div className="rounded-xl bg-white shadow-sm ring-1 ring-gray-100">
              <div className="flex items-center gap-2 px-5 pt-4">
                <h3 className="text-sm font-semibold text-gray-900">Team Performance (Today)</h3>
                <Link href="/dashboard/ai-sales-coach/team-performance" className="ml-auto flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-500">
                  View Full Report <ArrowUpRight className="h-3 w-3" />
                </Link>
              </div>
              <div className="overflow-x-auto pt-2">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-left text-[10px] font-bold uppercase tracking-wide text-gray-400">
                      <th className="px-5 py-2">Agent</th>
                      <th className="px-5 py-2">Calls</th>
                      <th className="px-5 py-2">Qualified</th>
                      <th className="px-5 py-2">Converted</th>
                      <th className="px-5 py-2">Conversion %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.teamPerformance.map((t) => (
                      <tr key={t.agentId} className="border-b border-gray-50 last:border-none">
                        <td className="px-5 py-2.5">
                          <div className="flex items-center gap-2">
                            <div className={cn('flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-white', avatarColor(t.name))}>
                              {getInitials(t.name)}
                            </div>
                            {t.name}
                          </div>
                        </td>
                        <td className="px-5 py-2.5">{t.calls}</td>
                        <td className="px-5 py-2.5">{t.qualified}</td>
                        <td className="px-5 py-2.5">{t.converted}</td>
                        <td className="px-5 py-2.5 font-semibold">{t.rate}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Call Outcomes */}
            <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
              <div className="mb-2 flex items-center gap-2">
                <h3 className="text-sm font-semibold text-gray-900">Call Outcomes (Today)</h3>
                <Link href="/dashboard/ai-sales-coach/call-insights" className="ml-auto flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-500">
                  Call Insights <ArrowUpRight className="h-3 w-3" />
                </Link>
              </div>
              {data.callOutcomes.length === 0 ? (
                <div className="flex h-[180px] items-center justify-center text-sm text-gray-400">No calls logged today yet.</div>
              ) : (
                <div className="flex items-center gap-5">
                  <div className="relative h-[150px] w-[150px] shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={data.callOutcomes} dataKey="count" nameKey="label" cx="50%" cy="50%" innerRadius={48} outerRadius={70} strokeWidth={0}>
                          {data.callOutcomes.map((o, i) => <Cell key={i} fill={o.color} />)}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-xl font-bold text-gray-900">{data.totalCallsToday}</span>
                      <span className="text-[9px] text-gray-400">Total Calls</span>
                    </div>
                  </div>
                  <div className="flex-1 space-y-2">
                    {data.callOutcomes.map((o) => (
                      <div key={o.label} className="flex items-center gap-2 text-xs">
                        <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: o.color }} />
                        <span className="truncate text-gray-700">{o.label}</span>
                        <span className="ml-auto font-mono font-semibold text-gray-900">{o.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
