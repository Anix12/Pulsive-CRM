'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { formatCurrency, formatDuration } from '@/lib/utils';
import { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';

type ReportTab = 'business' | 'employees' | 'ai-human';

const COLORS = ['#6366f1', '#34d399', '#f59e0b', '#f87171', '#60a5fa', '#a78bfa'];

export default function ReportsPage() {
  const [tab, setTab] = useState<ReportTab>('business');

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
      </div>

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
    </div>
  );
}
