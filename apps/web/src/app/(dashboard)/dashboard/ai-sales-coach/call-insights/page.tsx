'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Bot, PhoneCall } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { AiSalesCoachTabs } from '../_tabs';

interface DispositionRow { name: string; category: string; count: number }

const CATEGORY_COLOR: Record<string, string> = {
  Connected: '#16A34A',
  'Follow Up': '#7C3AED',
  'Not Connected': '#DC2626',
  Unclassified: '#9795AC',
};

export default function CallInsightsPage() {
  const { data, isLoading, isError, error } = useQuery<{ totalCalls: number; connected: number; dispositions: DispositionRow[] }>({
    queryKey: ['ai-sales-coach-call-insights'],
    queryFn: async () => (await api.get('/api/v1/reports/call-disposition')).data.data,
  });

  const dispositions = data?.dispositions ?? [];

  return (
    <div className="space-y-5">
      <AiSalesCoachTabs />
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Call Insights</h1>
        <p className="text-sm text-gray-500">Call outcomes and disposition breakdown this month.</p>
      </div>

      {isError ? (
        <div className="flex h-48 flex-col items-center justify-center gap-2 rounded-xl bg-white shadow-sm ring-1 ring-gray-100">
          <Bot className="h-8 w-8 text-gray-200" />
          <p className="text-sm text-gray-500">
            {(error as any)?.response?.status === 403 ? "You don't have access to this page." : 'Failed to load call insights.'}
          </p>
        </div>
      ) : isLoading ? (
        <div className="flex h-48 items-center justify-center text-gray-500">Loading...</div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
              <p className="text-2xl font-bold text-gray-900">{data!.totalCalls}</p>
              <p className="text-xs text-gray-400">Total Calls</p>
            </div>
            <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
              <p className="text-2xl font-bold text-gray-900">{data!.connected}</p>
              <p className="text-xs text-gray-400">Connected</p>
            </div>
            <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
              <p className="text-2xl font-bold text-gray-900">{dispositions.length}</p>
              <p className="text-xs text-gray-400">Dispositions Used</p>
            </div>
          </div>

          {dispositions.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-xl bg-white py-16 text-gray-400 shadow-sm ring-1 ring-gray-100">
              <PhoneCall className="h-8 w-8" />
              <p className="text-sm">No calls logged with a disposition yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1.3fr]">
              <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
                <h3 className="mb-3 text-sm font-semibold text-gray-900">By Category</h3>
                <div className="h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={dispositions}
                        dataKey="count"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={85}
                        strokeWidth={0}
                      >
                        {dispositions.map((d, i) => <Cell key={i} fill={CATEGORY_COLOR[d.category] ?? CATEGORY_COLOR.Unclassified} />)}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-gray-100">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-left text-[10px] font-bold uppercase tracking-wide text-gray-400">
                      <th className="px-5 py-3">Disposition</th>
                      <th className="px-5 py-3">Category</th>
                      <th className="px-5 py-3">Count</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dispositions.map((d) => (
                      <tr key={d.name} className="border-b border-gray-50 last:border-none">
                        <td className="px-5 py-3 font-medium text-gray-900">{d.name}</td>
                        <td className="px-5 py-3">
                          <span
                            className="rounded-full px-2 py-0.5 text-xs font-semibold"
                            style={{ background: `${CATEGORY_COLOR[d.category] ?? CATEGORY_COLOR.Unclassified}1A`, color: CATEGORY_COLOR[d.category] ?? CATEGORY_COLOR.Unclassified }}
                          >
                            {d.category}
                          </span>
                        </td>
                        <td className="px-5 py-3 font-mono">{d.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
