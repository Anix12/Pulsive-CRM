'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import api from '@/lib/api';
import { format } from 'date-fns';
import { Bot, MessageSquare, Activity as ActivityIcon } from 'lucide-react';
import { AiSalesCoachTabs } from '../_tabs';

interface ActivityItem {
  id: string;
  type: string;
  subject: string;
  body: string | null;
  occurredAt: string;
  contactId: string | null;
  contactName: string | null;
  userName: string;
}

export default function LiveActivityPage() {
  const [limit, setLimit] = useState(50);

  const { data, isLoading, isError, error, isFetching } = useQuery<ActivityItem[]>({
    queryKey: ['ai-sales-coach-activity', limit],
    queryFn: async () => (await api.get('/api/v1/ai-sales-coach/activity', { params: { limit } })).data.data,
    refetchInterval: 15000,
  });

  return (
    <div className="space-y-5">
      <AiSalesCoachTabs />
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Live Activity</h1>
        <p className="text-sm text-gray-500">A running feed of calls, stage changes, and other lead activity across your team.</p>
      </div>

      {isError ? (
        <div className="flex h-48 flex-col items-center justify-center gap-2 rounded-xl bg-white shadow-sm ring-1 ring-gray-100">
          <Bot className="h-8 w-8 text-gray-200" />
          <p className="text-sm text-gray-500">
            {(error as any)?.response?.status === 403 ? "You don't have access to this page." : 'Failed to load activity.'}
          </p>
        </div>
      ) : isLoading ? (
        <div className="flex h-48 items-center justify-center text-gray-500">Loading...</div>
      ) : (
        <div className="rounded-xl bg-white shadow-sm ring-1 ring-gray-100">
          {data!.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-16 text-gray-400">
              <ActivityIcon className="h-8 w-8" />
              <p className="text-sm">No activity logged yet.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {data!.map((f) => (
                <div key={f.id} className="flex gap-3 px-5 py-3 hover:bg-gray-50">
                  <span className="w-24 shrink-0 pt-0.5 font-mono text-[11px] text-gray-400">{format(new Date(f.occurredAt), 'dd MMM, HH:mm')}</span>
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
                    <MessageSquare className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-gray-900">
                      <b>
                        {f.contactId ? (
                          <Link href={`/dashboard/contacts/${f.contactId}`} className="hover:text-indigo-600 hover:underline">{f.contactName}</Link>
                        ) : (f.contactName || f.userName)}
                      </b>
                      {' '}— {f.subject}
                      <span className="ml-2 text-xs font-normal text-gray-400">logged by {f.userName}</span>
                    </p>
                    {f.body && <p className="mt-0.5 text-xs text-gray-400">{f.body}</p>}
                  </div>
                  <span className="shrink-0 self-start rounded-full bg-gray-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-400">{f.type.replace(/_/g, ' ')}</span>
                </div>
              ))}
            </div>
          )}
          {data!.length >= limit && (
            <div className="border-t border-gray-100 p-3 text-center">
              <button
                onClick={() => setLimit((n) => n + 50)}
                disabled={isFetching}
                className="text-xs font-medium text-indigo-600 hover:text-indigo-500 disabled:opacity-50"
              >
                {isFetching ? 'Loading…' : 'Load more'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
