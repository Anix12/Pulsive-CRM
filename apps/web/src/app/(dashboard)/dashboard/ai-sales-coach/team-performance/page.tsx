'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { cn, formatDuration, getInitials, avatarColor } from '@/lib/utils';
import { Bot, UsersRound } from 'lucide-react';
import { AiSalesCoachTabs } from '../_tabs';

interface AgentPerf {
  agentId: string;
  name: string;
  calls: number;
  connectedCalls: number;
  messages: number;
  dealsWon: number;
  talkTimeSeconds: number;
}

export default function TeamPerformancePage() {
  const { data, isLoading, isError, error } = useQuery<{ agents: AgentPerf[] }>({
    queryKey: ['ai-sales-coach-agent-performance'],
    queryFn: async () => (await api.get('/api/v1/reports/agent-performance')).data.data,
  });

  const agents = data?.agents ?? [];

  return (
    <div className="space-y-5">
      <AiSalesCoachTabs />
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Team/Agent Performance</h1>
        <p className="text-sm text-gray-500">Calls, connect rate, and deals won per agent this month.</p>
      </div>

      {isError ? (
        <div className="flex h-48 flex-col items-center justify-center gap-2 rounded-xl bg-white shadow-sm ring-1 ring-gray-100">
          <Bot className="h-8 w-8 text-gray-200" />
          <p className="text-sm text-gray-500">
            {(error as any)?.response?.status === 403 ? "You don't have access to this page." : 'Failed to load team performance.'}
          </p>
        </div>
      ) : isLoading ? (
        <div className="flex h-48 items-center justify-center text-gray-500">Loading...</div>
      ) : agents.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl bg-white py-16 text-gray-400 shadow-sm ring-1 ring-gray-100">
          <UsersRound className="h-8 w-8" />
          <p className="text-sm">No agents found.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-gray-100">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-[10px] font-bold uppercase tracking-wide text-gray-400">
                <th className="px-5 py-3">Agent</th>
                <th className="px-5 py-3">Calls</th>
                <th className="px-5 py-3">Connected</th>
                <th className="px-5 py-3">Connect Rate</th>
                <th className="px-5 py-3">Messages</th>
                <th className="px-5 py-3">Deals Won</th>
                <th className="px-5 py-3">Talk Time</th>
              </tr>
            </thead>
            <tbody>
              {agents.map((a) => (
                <tr key={a.agentId} className="border-b border-gray-50 last:border-none">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <div className={cn('flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-white', avatarColor(a.name))}>
                        {getInitials(a.name)}
                      </div>
                      {a.name}
                    </div>
                  </td>
                  <td className="px-5 py-3">{a.calls}</td>
                  <td className="px-5 py-3">{a.connectedCalls}</td>
                  <td className="px-5 py-3 font-semibold">{a.calls > 0 ? Math.round((a.connectedCalls / a.calls) * 100) : 0}%</td>
                  <td className="px-5 py-3">{a.messages}</td>
                  <td className="px-5 py-3">{a.dealsWon}</td>
                  <td className="px-5 py-3 font-mono text-xs">{formatDuration(a.talkTimeSeconds)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
