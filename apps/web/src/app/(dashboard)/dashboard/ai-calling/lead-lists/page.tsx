'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ListChecks, Upload, Trash2, Users, PhoneCall, Sparkles, FileText } from 'lucide-react';
import api from '@/lib/api';
import { CsvImportModal } from '@/components/ui/CsvImportModal';

export default function AiCallingLeadListsPage() {
  const [importOpen, setImportOpen] = useState(false);
  const qc = useQueryClient();

  const { data: lists, isLoading } = useQuery({
    queryKey: ['lead-lists'],
    queryFn: async () => { const { data } = await api.get('/api/v1/lead-lists'); return data.data; },
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/api/v1/lead-lists/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['lead-lists'] }),
  });

  const totals = (lists || []).reduce(
    (acc: any, l: any) => ({
      totalLeads: acc.totalLeads + l.totalLeads,
      callsMade: acc.callsMade + l.callsMade,
      qualified: acc.qualified + l.qualified,
    }),
    { totalLeads: 0, callsMade: 0, qualified: 0 },
  );

  const stats = [
    { label: 'Total lists', value: lists?.length || 0, icon: ListChecks, color: 'text-indigo-600 bg-indigo-50' },
    { label: 'Total leads', value: totals.totalLeads, icon: Users, color: 'text-blue-600 bg-blue-50' },
    { label: 'Calls made', value: totals.callsMade, icon: PhoneCall, color: 'text-purple-600 bg-purple-50' },
    { label: 'Qualified', value: totals.qualified, icon: Sparkles, color: 'text-green-600 bg-green-50' },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI Calling</h1>
          <p className="text-sm text-gray-500">AI-powered outbound calling agents</p>
        </div>
        <button
          onClick={() => setImportOpen(true)}
          className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
        >
          <Upload className="h-4 w-4" /> Upload CSV
        </button>
      </div>

      <div className="flex gap-2 border-b border-gray-100">
        <Link href="/dashboard/ai-calling" className="px-3 pb-2 text-sm font-medium text-gray-500 hover:text-gray-700">Agents</Link>
        <span className="border-b-2 border-indigo-600 px-3 pb-2 text-sm font-semibold text-indigo-600">Lead Lists</span>
        <Link href="/dashboard/ai-calling/call-logs" className="px-3 pb-2 text-sm font-medium text-gray-500 hover:text-gray-700">Call Report</Link>
        <Link href="/dashboard/ai-calling/analytics" className="px-3 pb-2 text-sm font-medium text-gray-500 hover:text-gray-700">Analytics</Link>
      </div>

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
        {isLoading ? (
          <div className="flex h-48 items-center justify-center text-gray-500">Loading...</div>
        ) : !lists?.length ? (
          <div className="flex h-48 flex-col items-center justify-center gap-2 text-gray-400">
            <FileText className="h-8 w-8 opacity-30" />
            <p className="text-sm">No lead lists yet. Upload a CSV to start.</p>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-100">
            <thead>
              <tr className="bg-gray-50">
                {['Name', 'Total Leads', 'Calls Made', 'Qualified', 'Created', ''].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {lists.map((list: any) => (
                <tr key={list.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{list.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{list.totalLeads}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{list.callsMade}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{list.qualified}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{format(new Date(list.createdAt), 'dd MMM, h:mm a')}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => remove.mutate(list.id)}
                      className="flex items-center gap-1 text-xs text-gray-500 hover:text-red-600"
                    >
                      <Trash2 className="h-3 w-3" /> Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <CsvImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={() => qc.invalidateQueries({ queryKey: ['lead-lists'] })}
        endpoint="/api/v1/lead-lists/import"
        title="Upload Lead List"
        resultLabel="Leads"
      />
    </div>
  );
}
