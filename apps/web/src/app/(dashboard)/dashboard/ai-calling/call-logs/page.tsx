'use client';

import { Fragment, useMemo, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { formatDuration } from '@/lib/utils';
import { ChevronRight, ChevronDown, Download, Bot } from 'lucide-react';
import { format } from 'date-fns';

const statusColors: Record<string, string> = {
  COMPLETED: 'bg-green-50 text-green-700',
  FAILED: 'bg-red-50 text-red-600',
  IN_PROGRESS: 'bg-blue-50 text-blue-700',
  RINGING: 'bg-yellow-50 text-yellow-700',
  BUSY: 'bg-orange-50 text-orange-600',
  NO_ANSWER: 'bg-gray-100 text-gray-600',
  INITIATED: 'bg-indigo-50 text-indigo-600',
  CANCELLED: 'bg-gray-100 text-gray-500',
};

function outcomePill(call: any) {
  if (call.aiSuccessEvaluation === true) return <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">Interested</span>;
  if (call.aiSuccessEvaluation === false) return <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-600">Not interested</span>;
  return <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">Unknown</span>;
}

function toCsv(rows: any[]): string {
  const headers = ['Date', 'Name', 'Phone', 'Duration', 'Outcome', 'Agent', 'Cost'];
  const lines = rows.map((c) => [
    format(new Date(c.createdAt), 'yyyy-MM-dd HH:mm'),
    c.contact?.name || 'Unknown',
    c.toNumber,
    c.duration ? formatDuration(c.duration) : '',
    c.aiSuccessEvaluation === true ? 'Interested' : c.aiSuccessEvaluation === false ? 'Not interested' : 'Unknown',
    c.aiAgent?.name || '',
    (c.cost || 0).toFixed(2),
  ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','));
  return [headers.join(','), ...lines].join('\n');
}

export default function AiCallingCallReportPage() {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [aiAgentId, setAiAgentId] = useState('');
  const [outcome, setOutcome] = useState('');
  const [listId, setListId] = useState('');
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data: agents } = useQuery({
    queryKey: ['ai-agents'],
    queryFn: async () => { const { data } = await api.get('/api/v1/ai-calling/agents'); return data.data; },
  });

  const { data: lists } = useQuery({
    queryKey: ['lead-lists'],
    queryFn: async () => { const { data } = await api.get('/api/v1/lead-lists'); return data.data; },
  });

  const params = useMemo(() => {
    const p: Record<string, string> = { isAiInitiated: 'true', limit: '100' };
    if (dateFrom) p.dateFrom = dateFrom;
    if (dateTo) p.dateTo = dateTo;
    if (aiAgentId) p.aiAgentId = aiAgentId;
    if (outcome) p.outcome = outcome;
    if (listId) p.listId = listId;
    if (search) p.search = search;
    return p;
  }, [dateFrom, dateTo, aiAgentId, outcome, listId, search]);

  const { data, isLoading } = useQuery({
    queryKey: ['ai-calls', params],
    queryFn: async () => { const { data } = await api.get('/api/v1/calls', { params }); return data; },
  });

  const stats = data?.meta?.stats;
  const rows = data?.data || [];

  const exportCsv = () => {
    const csv = toCsv(rows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `call-report-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">AI Calling</h1>
        <p className="text-sm text-gray-500">AI-powered outbound calling agents</p>
      </div>

      <div className="flex gap-2 border-b border-gray-100">
        <Link href="/dashboard/ai-calling" className="px-3 pb-2 text-sm font-medium text-gray-500 hover:text-gray-700">Agents</Link>
        <Link href="/dashboard/ai-calling/lead-lists" className="px-3 pb-2 text-sm font-medium text-gray-500 hover:text-gray-700">Lead Lists</Link>
        <span className="border-b-2 border-indigo-600 px-3 pb-2 text-sm font-semibold text-indigo-600">Call Report</span>
        <Link href="/dashboard/ai-calling/analytics" className="px-3 pb-2 text-sm font-medium text-gray-500 hover:text-gray-700">Analytics</Link>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-wide text-gray-400">From</label>
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="mt-1 rounded-lg border border-gray-300 px-2 py-1.5 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none" />
        </div>
        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-wide text-gray-400">To</label>
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="mt-1 rounded-lg border border-gray-300 px-2 py-1.5 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none" />
        </div>
        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-wide text-gray-400">Agent</label>
          <select value={aiAgentId} onChange={(e) => setAiAgentId(e.target.value)} className="mt-1 rounded-lg border border-gray-300 px-2 py-1.5 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none">
            <option value="">All agents</option>
            {(agents || []).map((a: any) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-wide text-gray-400">Outcome</label>
          <select value={outcome} onChange={(e) => setOutcome(e.target.value)} className="mt-1 rounded-lg border border-gray-300 px-2 py-1.5 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none">
            <option value="">All</option>
            <option value="interested">Interested</option>
            <option value="not_interested">Not interested</option>
            <option value="unknown">Unknown</option>
          </select>
        </div>
        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-wide text-gray-400">List</label>
          <select value={listId} onChange={(e) => setListId(e.target.value)} className="mt-1 rounded-lg border border-gray-300 px-2 py-1.5 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none">
            <option value="">All lists</option>
            {(lists || []).map((l: any) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </div>
        <div className="flex-1 min-w-[160px]">
          <label className="block text-[11px] font-semibold uppercase tracking-wide text-gray-400">Search</label>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Phone or name" className="mt-1 block w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none" />
        </div>
        <button onClick={exportCsv} className="ml-auto flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
          <Download className="h-4 w-4" /> Export CSV
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {[
          { label: 'Total calls', value: stats?.totalCalls ?? 0, color: 'text-gray-900' },
          { label: 'Connected', value: stats?.connected ?? 0, color: 'text-gray-900' },
          { label: 'Interested', value: stats?.interested ?? 0, color: 'text-green-600' },
          { label: 'Not interested', value: stats?.notInterested ?? 0, color: 'text-red-600' },
          { label: 'Avg duration', value: formatDuration(stats?.avgDuration ?? 0), color: 'text-gray-900' },
          { label: 'Total cost', value: `₹${(stats?.totalCost ?? 0).toFixed(2)}`, color: 'text-amber-600' },
        ].map((s) => (
          <div key={s.label} className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
            <p className="text-xs text-gray-500">{s.label}</p>
            <p className={`mt-1 text-xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-100">
        {isLoading ? (
          <div className="flex h-48 items-center justify-center text-gray-500">Loading...</div>
        ) : !rows.length ? (
          <div className="flex h-48 flex-col items-center justify-center gap-2 text-gray-400">
            <Bot className="h-8 w-8 opacity-30" />
            <p className="text-sm">No AI calls yet</p>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-100">
            <thead>
              <tr className="bg-gray-50">
                {['', 'Date / Time', 'Name', 'Phone', 'Duration', 'Outcome', 'Agent', 'Cost'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {rows.map((call: any) => (
                <Fragment key={call.id}>
                  <tr className="cursor-pointer hover:bg-gray-50" onClick={() => setExpanded(expanded === call.id ? null : call.id)}>
                    <td className="px-4 py-3">
                      {expanded === call.id ? <ChevronDown className="h-3.5 w-3.5 text-gray-400" /> : <ChevronRight className="h-3.5 w-3.5 text-gray-400" />}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{format(new Date(call.createdAt), 'dd MMM yyyy, h:mm a')}</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{call.contact?.name || 'Unknown'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{call.toNumber}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{call.duration ? formatDuration(call.duration) : '—'}</td>
                    <td className="px-4 py-3">{outcomePill(call)}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{call.aiAgent?.name || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">₹{(call.cost || 0).toFixed(2)}</td>
                  </tr>
                  {expanded === call.id && (
                    <tr className="bg-gray-50/60">
                      <td colSpan={8} className="px-8 py-4 text-sm text-gray-600">
                        <p className="mb-1"><span className="font-semibold text-gray-800">Status:</span> <span className={`ml-1 inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[call.status] || 'bg-gray-100 text-gray-600'}`}>{call.status}</span></p>
                        {call.aiSummary && <p className="mb-1"><span className="font-semibold text-gray-800">Summary:</span> {call.aiSummary}</p>}
                        {call.transcription ? (
                          <p className="whitespace-pre-wrap text-xs text-gray-500"><span className="font-semibold text-gray-800">Transcript:</span> {call.transcription.slice(0, 800)}{call.transcription.length > 800 ? '…' : ''}</p>
                        ) : (
                          <p className="text-xs text-gray-400">No transcript available.</p>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
