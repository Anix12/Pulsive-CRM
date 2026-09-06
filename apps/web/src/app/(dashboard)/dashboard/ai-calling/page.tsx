'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { io, Socket } from 'socket.io-client';
import { Bot, Phone, Plus, Pencil, Trash2, KeyRound } from 'lucide-react';
import api from '@/lib/api';
import { Modal } from '@/components/ui/Modal';
import { useAuthStore } from '@/store/auth.store';
import { AgentWizard } from './AgentWizard';

const vapiSchema = z.object({
  vapiApiKey: z.string().min(1, 'Required'),
  vapiPhoneNumberId: z.string().min(1, 'Required'),
});

type VapiForm = z.infer<typeof vapiSchema>;

function VapiSetupCard() {
  const qc = useQueryClient();
  const { register, handleSubmit, formState: { errors } } = useForm<VapiForm>({ resolver: zodResolver(vapiSchema) });

  const save = useMutation({
    mutationFn: (data: VapiForm) => api.put('/api/v1/tenants/me/vapi', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tenant-me'] }),
  });

  return (
    <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
      <div className="flex items-center gap-2 text-gray-900">
        <KeyRound className="h-5 w-5 text-indigo-600" />
        <h2 className="text-base font-semibold">Connect Vapi to enable AI Calling</h2>
      </div>
      <p className="mt-1 text-sm text-gray-500">
        Add your Vapi API key and outbound phone number ID from your Vapi dashboard to start creating AI voice agents.
      </p>
      <form onSubmit={handleSubmit((d) => save.mutate(d))} className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-gray-700">Vapi API Key *</label>
          <input {...register('vapiApiKey')} type="password" className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none" />
          {errors.vapiApiKey && <p className="mt-1 text-xs text-red-500">{errors.vapiApiKey.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Vapi Phone Number ID *</label>
          <input {...register('vapiPhoneNumberId')} className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none" />
          {errors.vapiPhoneNumberId && <p className="mt-1 text-xs text-red-500">{errors.vapiPhoneNumberId.message}</p>}
        </div>
        <div className="sm:col-span-2">
          {save.isError && <p className="mb-2 text-sm text-red-500">Failed to save Vapi credentials.</p>}
          <button type="submit" disabled={save.isPending} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50">
            {save.isPending ? 'Saving...' : 'Save & Connect'}
          </button>
        </div>
      </form>
    </div>
  );
}

function AgentCard({ agent }: { agent: any }) {
  const qc = useQueryClient();
  const [phone, setPhone] = useState('');
  const [editOpen, setEditOpen] = useState(false);

  const call = useMutation({
    mutationFn: () => api.post(`/api/v1/ai-calling/agents/${agent.id}/call`, { toNumber: phone }),
    onSuccess: () => { setPhone(''); qc.invalidateQueries({ queryKey: ['ai-agents'] }); },
  });

  const remove = useMutation({
    mutationFn: () => api.delete(`/api/v1/ai-calling/agents/${agent.id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ai-agents'] }),
  });

  return (
    <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">{agent.name}</p>
            <p className="text-xs text-gray-500">{agent.language} · {agent.category}</p>
          </div>
        </div>
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${agent.status === 'ACTIVE' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
          {agent.status === 'ACTIVE' ? 'active' : 'paused'}
        </span>
      </div>

      <p className="mt-3 truncate text-sm italic text-gray-500">&ldquo;{agent.greeting}&rdquo;</p>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <div className="rounded-lg bg-gray-50 py-2 text-center">
          <p className="text-lg font-bold text-gray-900">{agent.totalCalls}</p>
          <p className="text-[11px] text-gray-500">Total calls</p>
        </div>
        <div className="rounded-lg bg-green-50 py-2 text-center">
          <p className="text-lg font-bold text-green-700">{agent.interestedCalls}</p>
          <p className="text-[11px] text-gray-500">Interested</p>
        </div>
        <div className="rounded-lg bg-blue-50 py-2 text-center">
          <p className="text-lg font-bold text-blue-700">{agent.connectedCalls}</p>
          <p className="text-[11px] text-gray-500">Connected</p>
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Enter phone number"
          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none"
        />
        <button
          onClick={() => call.mutate()}
          disabled={!phone || call.isPending}
          className="flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-2 text-sm font-semibold text-white hover:bg-green-500 disabled:opacity-50"
        >
          <Phone className="h-4 w-4" /> {call.isPending ? 'Calling...' : 'Call'}
        </button>
      </div>
      {call.isError && <p className="mt-2 text-xs text-red-500">Failed to start call.</p>}

      <div className="mt-3 flex gap-4 text-xs">
        <button onClick={() => setEditOpen(true)} className="flex items-center gap-1 text-gray-500 hover:text-indigo-600"><Pencil className="h-3 w-3" /> Edit</button>
        <button onClick={() => remove.mutate()} className="flex items-center gap-1 text-gray-500 hover:text-red-600"><Trash2 className="h-3 w-3" /> Delete</button>
      </div>

      <AgentWizard open={editOpen} onClose={() => setEditOpen(false)} agent={agent} />
    </div>
  );
}

export default function AiCallingPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const qc = useQueryClient();
  const { accessToken } = useAuthStore();

  const { data: tenant } = useQuery({
    queryKey: ['tenant-me'],
    queryFn: async () => { const { data } = await api.get('/api/v1/tenants/me'); return data.data; },
  });

  const { data: agents, isLoading } = useQuery({
    queryKey: ['ai-agents'],
    queryFn: async () => { const { data } = await api.get('/api/v1/ai-calling/agents'); return data.data; },
    enabled: !!tenant?.vapiConfigured,
  });

  useEffect(() => {
    if (!accessToken) return;
    const socket: Socket = io(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000', {
      auth: { token: accessToken },
    });
    socket.on('call:status_updated', () => {
      qc.invalidateQueries({ queryKey: ['ai-agents'] });
    });
    return () => { socket.disconnect(); };
  }, [accessToken, qc]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI Calling</h1>
          <p className="text-sm text-gray-500">AI-powered outbound calling agents</p>
        </div>
        {tenant?.vapiConfigured && (
          <button
            onClick={() => setCreateOpen(true)}
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
          >
            <Plus className="h-4 w-4" /> Create Agent
          </button>
        )}
      </div>

      <div className="flex gap-2 border-b border-gray-100">
        <span className="border-b-2 border-indigo-600 px-3 pb-2 text-sm font-semibold text-indigo-600">Agents</span>
        <Link href="/dashboard/ai-calling/lead-lists" className="px-3 pb-2 text-sm font-medium text-gray-500 hover:text-gray-700">Lead Lists</Link>
        <Link href="/dashboard/ai-calling/call-logs" className="px-3 pb-2 text-sm font-medium text-gray-500 hover:text-gray-700">Call Report</Link>
        <Link href="/dashboard/ai-calling/analytics" className="px-3 pb-2 text-sm font-medium text-gray-500 hover:text-gray-700">Analytics</Link>
      </div>

      {!tenant?.vapiConfigured ? (
        <VapiSetupCard />
      ) : isLoading ? (
        <div className="flex h-48 items-center justify-center text-gray-500">Loading...</div>
      ) : !agents?.length ? (
        <div className="flex h-48 flex-col items-center justify-center gap-2 rounded-xl bg-white text-gray-400 shadow-sm ring-1 ring-gray-100">
          <Bot className="h-8 w-8 opacity-30" />
          <p className="text-sm">No AI agents yet</p>
          <button onClick={() => setCreateOpen(true)} className="text-sm text-indigo-600 hover:underline">Create your first agent</button>
        </div>
      ) : (
        <>
          <p className="text-sm text-gray-500">{agents.length} AI Agent{agents.length === 1 ? '' : 's'}</p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {agents.map((agent: any) => <AgentCard key={agent.id} agent={agent} />)}
          </div>
        </>
      )}

      <AgentWizard open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}
