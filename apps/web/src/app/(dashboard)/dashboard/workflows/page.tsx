'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useRouter } from 'next/navigation';
import { Plus, Zap, Play, Pause, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { triggerLabel } from '@/lib/workflowConfig';

export default function WorkflowsPage() {
  const qc = useQueryClient();
  const router = useRouter();

  const { data, isLoading } = useQuery({
    queryKey: ['workflows'],
    queryFn: async () => { const { data } = await api.get('/api/v1/workflows'); return data.data; },
  });

  const toggle = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      api.patch(`/api/v1/workflows/${id}/toggle`, { isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workflows'] }),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/api/v1/workflows/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workflows'] }),
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Workflows</h1>
          <p className="text-sm text-gray-500">Automate your sales process</p>
        </div>
        <button onClick={() => router.push('/dashboard/workflows/new')} className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500">
          <Plus className="h-4 w-4" /> New Workflow
        </button>
      </div>

      {isLoading ? (
        <div className="flex h-48 items-center justify-center text-gray-500">Loading...</div>
      ) : !data?.length ? (
        <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-xl bg-white shadow-sm ring-1 ring-gray-100">
          <Zap className="h-10 w-10 text-gray-200" />
          <p className="text-sm text-gray-500">No workflows yet</p>
          <button onClick={() => router.push('/dashboard/workflows/new')} className="text-sm text-indigo-600 hover:underline">Create your first workflow</button>
        </div>
      ) : (
        <div className="space-y-3">
          {data.map((wf: any) => (
            <div key={wf.id} className="flex items-center justify-between rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
              <div className="flex items-center gap-4">
                <div className={cn('flex h-9 w-9 items-center justify-center rounded-lg', wf.isActive ? 'bg-indigo-100' : 'bg-gray-100')}>
                  <Zap className={cn('h-4 w-4', wf.isActive ? 'text-indigo-600' : 'text-gray-400')} />
                </div>
                <div>
                  <p className="font-medium text-gray-900">{wf.name}</p>
                  <p className="text-xs text-gray-500">
                    Trigger: {triggerLabel(wf.trigger?.type)}
                    {' · '}{(wf.steps || []).length} steps
                    {wf.runCount > 0 && ` · Ran ${wf.runCount} times`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {wf.lastRunAt && (
                  <span className="text-xs text-gray-400">Last run {format(new Date(wf.lastRunAt), 'dd MMM')}</span>
                )}
                <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', wf.isActive ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500')}>
                  {wf.isActive ? 'Active' : 'Inactive'}
                </span>
                <button
                  onClick={() => toggle.mutate({ id: wf.id, isActive: !wf.isActive })}
                  className="rounded-lg border border-gray-200 p-1.5 text-gray-500 hover:bg-gray-50"
                  title={wf.isActive ? 'Pause' : 'Activate'}
                >
                  {wf.isActive ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                </button>
                <button onClick={() => remove.mutate(wf.id)} className="rounded-lg border border-gray-200 p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
