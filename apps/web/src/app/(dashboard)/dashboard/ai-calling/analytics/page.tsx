'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Phone, PhoneCall, Sparkles, Bot } from 'lucide-react';

export default function AiCallingAnalyticsPage() {
  const { data: agents, isLoading } = useQuery({
    queryKey: ['ai-agents'],
    queryFn: async () => { const { data } = await api.get('/api/v1/ai-calling/agents'); return data.data; },
  });

  const totals = (agents || []).reduce(
    (acc: any, a: any) => ({
      totalCalls: acc.totalCalls + a.totalCalls,
      connectedCalls: acc.connectedCalls + a.connectedCalls,
      interestedCalls: acc.interestedCalls + a.interestedCalls,
    }),
    { totalCalls: 0, connectedCalls: 0, interestedCalls: 0 },
  );

  const connectRate = totals.totalCalls ? Math.round((totals.connectedCalls / totals.totalCalls) * 100) : 0;

  const stats = [
    { label: 'Total Calls', value: totals.totalCalls, icon: Phone, color: 'text-indigo-600 bg-indigo-50' },
    { label: 'Connected', value: totals.connectedCalls, icon: PhoneCall, color: 'text-blue-600 bg-blue-50' },
    { label: 'Interested', value: totals.interestedCalls, icon: Sparkles, color: 'text-green-600 bg-green-50' },
    { label: 'Connect Rate', value: `${connectRate}%`, icon: Bot, color: 'text-purple-600 bg-purple-50' },
  ];

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

          <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-100">
            <table className="min-w-full divide-y divide-gray-100">
              <thead>
                <tr className="bg-gray-50">
                  {['Agent', 'Total Calls', 'Connected', 'Interested'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {(agents || []).map((a: any) => (
                  <tr key={a.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{a.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{a.totalCalls}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{a.connectedCalls}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{a.interestedCalls}</td>
                  </tr>
                ))}
                {!agents?.length && (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-sm text-gray-400">No agents yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
