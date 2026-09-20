'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Phone, PhoneCall, Sparkles, Bot } from 'lucide-react';
import { formatDuration } from '@/lib/utils';
import { DonutChart } from '@/components/ui/DonutChart';
import { SimpleBarChart } from '@/components/ui/SimpleBarChart';

interface AiAgentRow {
  id: string; name: string;
  totalCalls: number; connectedCalls: number; interestedCalls: number; notInterestedCalls: number;
  avgDuration: number; totalCost: number;
}

export default function AiCallingAnalyticsPage() {
  const { data: agents, isLoading } = useQuery({
    queryKey: ['ai-agents'],
    queryFn: async () => { const { data } = await api.get('/api/v1/ai-calling/agents'); return data.data as AiAgentRow[]; },
  });

  const rows = agents || [];

  const totals = rows.reduce(
    (acc, a) => ({
      totalCalls: acc.totalCalls + a.totalCalls,
      connectedCalls: acc.connectedCalls + a.connectedCalls,
      interestedCalls: acc.interestedCalls + a.interestedCalls,
      notInterestedCalls: acc.notInterestedCalls + a.notInterestedCalls,
      totalCost: acc.totalCost + a.totalCost,
    }),
    { totalCalls: 0, connectedCalls: 0, interestedCalls: 0, notInterestedCalls: 0, totalCost: 0 },
  );
  const unknownCalls = Math.max(0, totals.totalCalls - totals.interestedCalls - totals.notInterestedCalls);

  const connectRate = totals.totalCalls ? Math.round((totals.connectedCalls / totals.totalCalls) * 100) : 0;

  const stats = [
    { label: 'Total Calls', value: totals.totalCalls, icon: Phone, color: 'text-indigo-600 bg-indigo-50' },
    { label: 'Connected', value: totals.connectedCalls, icon: PhoneCall, color: 'text-blue-600 bg-blue-50' },
    { label: 'Interested', value: totals.interestedCalls, icon: Sparkles, color: 'text-green-600 bg-green-50' },
    { label: 'Connect Rate', value: `${connectRate}%`, icon: Bot, color: 'text-purple-600 bg-purple-50' },
  ];

  const outcomeSegments = [
    { label: 'Interested', count: totals.interestedCalls, color: '#34d399' },
    { label: 'Not Interested', count: totals.notInterestedCalls, color: '#f87171' },
    { label: 'Unknown', count: unknownCalls, color: '#9ca3af' },
  ].filter((d) => d.count > 0);

  const hasCost = rows.some((a) => a.totalCost > 0);
  const hasDuration = rows.some((a) => a.avgDuration > 0);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">AI Calling</h1>
        <p className="text-sm text-gray-500">AI-powered outbound calling agents</p>
      </div>

      <div className="flex gap-2 border-b border-gray-100">
        <Link href="/dashboard/ai-calling" className="px-3 pb-2 text-sm font-medium text-gray-500 hover:text-gray-700">Agents</Link>
        <Link href="/dashboard/ai-calling/lead-lists" className="px-3 pb-2 text-sm font-medium text-gray-500 hover:text-gray-700">Lead Lists</Link>
        <Link href="/dashboard/ai-calling/call-logs" className="px-3 pb-2 text-sm font-medium text-gray-500 hover:text-gray-700">Call Report</Link>
        <span className="border-b-2 border-indigo-600 px-3 pb-2 text-sm font-semibold text-indigo-600">Analytics</span>
      </div>

      {isLoading ? (
        <div className="flex h-48 items-center justify-center text-gray-500">Loading...</div>
      ) : !rows.length ? (
        <div className="flex h-48 flex-col items-center justify-center gap-2 rounded-xl bg-white text-gray-400 shadow-sm ring-1 ring-gray-100">
          <Bot className="h-8 w-8 opacity-30" />
          <p className="text-sm">No AI agents yet</p>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label} className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
                <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${s.color}`}>
                  <s.icon className="h-4 w-4" />
                </div>
                <p className="mt-3 text-2xl font-bold text-gray-900">{s.value}</p>
                <p className="text-xs text-gray-500">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Agent Performance & Outcomes</p>
            <div className="mt-4 grid gap-5 lg:grid-cols-3">
              <div>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400">Calls by Agent</p>
                <SimpleBarChart
                  data={rows.map((a) => ({ label: a.name, value: a.totalCalls }))}
                  height={160}
                  formatValue={(n) => `${n} call${n === 1 ? '' : 's'}`}
                />
              </div>

              <div>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400">Call Outcomes</p>
                {outcomeSegments.length > 0 ? (
                  <>
                    <DonutChart
                      data={outcomeSegments}
                      nameKey="label"
                      valueKey="count"
                      colors={outcomeSegments.map((s) => s.color)}
                      height={140}
                      showLegend={false}
                      ariaLabel="AI calls grouped by outcome"
                    />
                    <ul className="mt-2 space-y-1">
                      {outcomeSegments.map((s) => (
                        <li key={s.label} className="flex items-center justify-between text-xs">
                          <span className="flex items-center gap-1.5 text-gray-500">
                            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: s.color }} />
                            {s.label}
                          </span>
                          <span className="text-gray-700">{s.count}</span>
                        </li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <div className="flex h-[140px] items-center justify-center rounded-lg bg-gray-50/50 text-sm text-gray-400">
                    No outcome data yet.
                  </div>
                )}
              </div>

              {hasDuration ? (
                <div>
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400">Avg Duration by Agent</p>
                  <SimpleBarChart
                    data={rows.map((a) => ({ label: a.name, value: a.avgDuration }))}
                    height={160}
                    formatValue={(n) => formatDuration(n)}
                  />
                </div>
              ) : hasCost ? (
                <div>
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400">Cost by Agent</p>
                  <SimpleBarChart
                    data={rows.map((a) => ({ label: a.name, value: a.totalCost }))}
                    height={160}
                    formatValue={(n) => `₹${n.toFixed(2)}`}
                  />
                </div>
              ) : null}
            </div>
          </div>

          <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-100">
            <table className="min-w-full divide-y divide-gray-100">
              <thead>
                <tr className="bg-gray-50">
                  {['Agent', 'Total Calls', 'Connected', 'Interested', 'Not Interested', 'Avg Duration', 'Cost'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {rows.map((a) => (
                  <tr key={a.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{a.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{a.totalCalls}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{a.connectedCalls}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{a.interestedCalls}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{a.notInterestedCalls}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{a.avgDuration ? formatDuration(a.avgDuration) : '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">₹{a.totalCost.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
