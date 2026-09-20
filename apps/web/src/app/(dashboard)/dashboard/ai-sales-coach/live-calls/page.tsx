'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import api from '@/lib/api';
import { cn, getInitials, avatarColor } from '@/lib/utils';
import { Bot, PhoneCall } from 'lucide-react';
import { AiSalesCoachTabs } from '../_tabs';

interface LiveCall {
  id: string;
  contactId: string | null;
  agentId: string | null;
  agent: string;
  lead: string;
  phone: string;
  startedAt: string | null;
  disposition: string | null;
  isAiInitiated: boolean;
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

export default function LiveCallsPage() {
  useTicker();

  const { data, isLoading, isError, error } = useQuery<LiveCall[]>({
    queryKey: ['ai-sales-coach-live-calls'],
    queryFn: async () => (await api.get('/api/v1/ai-sales-coach/live-calls')).data.data,
    refetchInterval: 5000,
  });

  return (
    <div className="space-y-5">
      <AiSalesCoachTabs />
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Live Calls Monitor</h1>
        <p className="text-sm text-gray-500">Every call in progress across your team, updated every 5 seconds.</p>
      </div>

      {isError ? (
        <div className="flex h-48 flex-col items-center justify-center gap-2 rounded-xl bg-white shadow-sm ring-1 ring-gray-100">
          <Bot className="h-8 w-8 text-gray-200" />
          <p className="text-sm text-gray-500">
            {(error as any)?.response?.status === 403 ? "You don't have access to this page." : 'Failed to load live calls.'}
          </p>
        </div>
      ) : isLoading ? (
        <div className="flex h-48 items-center justify-center text-gray-500">Loading...</div>
      ) : (
        <div className="rounded-xl bg-white shadow-sm ring-1 ring-gray-100">
          <div className="flex items-center gap-2 px-5 pt-4 pb-1">
            <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-bold text-green-700">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-500" /> {data!.length} on call
            </span>
          </div>
          {data!.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-16 text-gray-400">
              <PhoneCall className="h-8 w-8" />
              <p className="text-sm">No calls in progress right now.</p>
            </div>
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
                    <th className="px-5 py-2">Source</th>
                    <th className="px-5 py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data!.map((c) => (
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
                          <Link href={`/dashboard/contacts/${c.contactId}`} className="hover:text-indigo-600 hover:underline">{c.lead}</Link>
                        ) : c.lead}
                      </td>
                      <td className="px-5 py-2.5 font-mono text-xs text-gray-500">{c.phone}</td>
                      <td className="px-5 py-2.5 font-mono text-xs">{liveDuration(c.startedAt)}</td>
                      <td className="px-5 py-2.5 text-xs text-gray-500">{c.disposition || '—'}</td>
                      <td className="px-5 py-2.5 text-xs text-gray-500">{c.isAiInitiated ? 'AI Agent' : 'Human Agent'}</td>
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
      )}
    </div>
  );
}
