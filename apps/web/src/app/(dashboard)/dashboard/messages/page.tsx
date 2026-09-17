'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useState } from 'react';
import { Search, Send, MessageSquare, Users, Wifi, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { cn, getInitials } from '@/lib/utils';
import { useForm } from 'react-hook-form';
import { Modal } from '@/components/ui/Modal';

const channelBadge: Record<string, string> = {
  SMS: 'bg-blue-50 text-blue-700',
  WHATSAPP: 'bg-green-50 text-green-700',
};

export default function MessagesPage() {
  const qc = useQueryClient();
  const [selectedContact, setSelectedContact] = useState<any>(null);
  const [channel, setChannel] = useState<'SMS' | 'WHATSAPP'>('SMS');
  const [search, setSearch] = useState('');
  const [agentId, setAgentId] = useState('');
  const [connectOpen, setConnectOpen] = useState(false);

  const { data: contacts } = useQuery({
    queryKey: ['contacts-list'],
    queryFn: async () => { const { data } = await api.get('/api/v1/contacts?limit=100'); return data.data; },
  });

  const { data: agents } = useQuery({
    queryKey: ['team-users'],
    queryFn: async () => { const { data } = await api.get('/api/v1/tenants/me/users'); return data.data; },
  });

  const { data: tenant } = useQuery({
    queryKey: ['tenant'],
    queryFn: async () => { const { data } = await api.get('/api/v1/tenants/me'); return data.data; },
  });

  const { data: messages, isLoading: loadingMsgs } = useQuery({
    queryKey: ['messages', selectedContact?.id, agentId],
    queryFn: async () => {
      const { data } = await api.get('/api/v1/messages', {
        params: { contactId: selectedContact?.id, agentId: agentId || undefined, limit: 50 },
      });
      return data.data;
    },
    enabled: !!selectedContact,
    refetchInterval: 5000,
  });

  const { register, handleSubmit, reset } = useForm<{ body: string }>();

  const send = useMutation({
    mutationFn: (body: string) =>
      api.post('/api/v1/messages', { contactId: selectedContact?.id, channel, body }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['messages', selectedContact?.id, agentId] });
      reset();
    },
  });

  const filteredContacts = (contacts || []).filter((c: any) =>
    `${c.name} ${c.phone}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex h-full gap-0 rounded-xl bg-white shadow-sm ring-1 ring-gray-100 overflow-hidden" style={{ height: 'calc(100vh - 8rem)' }}>
      {/* Contact list sidebar */}
      <div className="w-72 flex-shrink-0 border-r border-gray-100 flex flex-col">
        <div className="p-4 border-b border-gray-100">
          <h1 className="text-lg font-bold text-gray-900">Messages</h1>
          <div className="relative mt-2">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search contacts..."
              className="w-full rounded-lg border border-gray-200 bg-white py-1.5 pl-8 pr-3 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none"
            />
          </div>
          <div className="relative mt-2">
            <Users className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
            <select
              value={agentId}
              onChange={(e) => setAgentId(e.target.value)}
              className="w-full appearance-none rounded-lg border border-gray-200 bg-white py-1.5 pl-8 pr-3 text-sm text-gray-700 focus:border-indigo-500 focus:outline-none"
            >
              <option value="">All agents</option>
              {(agents || []).map((a: any) => (
                <option key={a.id} value={a.id}>
                  {a.firstName} {a.lastName}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filteredContacts.map((c: any) => (
            <button
              key={c.id}
              onClick={() => setSelectedContact(c)}
              className={cn(
                'flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-50',
                selectedContact?.id === c.id && 'bg-indigo-50',
              )}
            >
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700">
                {getInitials(c.name)}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-gray-900">{c.name}</p>
                <p className="text-xs text-gray-500">{c.phone}</p>
              </div>
            </button>
          ))}
        </div>

        {/* Connected numbers */}
        <div className="border-t border-gray-100 p-3">
          <div className="flex items-center justify-between px-1 pb-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Connected Numbers</p>
            <button
              onClick={() => setConnectOpen(true)}
              className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold text-indigo-600 hover:bg-indigo-50"
            >
              <Plus className="h-3 w-3" />
              Connect
            </button>
          </div>
          {tenant?.whatsappPhoneNumberId ? (
            <div className="flex items-center gap-2.5 rounded-lg border border-gray-100 bg-gray-50/60 px-2.5 py-2">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-700">
                <Wifi className="h-3.5 w-3.5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-gray-900">WhatsApp Business</p>
                <p className="truncate text-[11px] text-gray-500">{tenant.whatsappPhoneNumberId}</p>
              </div>
              <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 ring-1 ring-emerald-100">
                Connected
              </span>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-gray-200 px-2.5 py-2 text-[11px] text-gray-400">
              No WhatsApp number connected yet.
            </div>
          )}
        </div>
      </div>

      {/* Conversation area */}
      {!selectedContact ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 text-gray-400">
          <MessageSquare className="h-10 w-10 opacity-20" />
          <p className="text-sm">Select a contact to view messages</p>
        </div>
      ) : (
        <div className="flex flex-1 flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700">
                {getInitials(selectedContact.name)}
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">{selectedContact.name}</p>
                <p className="text-xs text-gray-500">{selectedContact.phone}</p>
              </div>
            </div>
            <div className="flex gap-2">
              {(['SMS', 'WHATSAPP'] as const).map((ch) => (
                <button
                  key={ch}
                  onClick={() => setChannel(ch)}
                  className={cn(
                    'rounded-full px-3 py-1 text-xs font-medium',
                    channel === ch ? channelBadge[ch] : 'bg-gray-100 text-gray-600',
                  )}
                >
                  {ch === 'WHATSAPP' ? 'WhatsApp' : 'SMS'}
                </button>
              ))}
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-5 space-y-3">
            {loadingMsgs ? (
              <div className="flex h-32 items-center justify-center text-gray-400 text-sm">Loading...</div>
            ) : !messages?.length ? (
              <div className="flex h-32 items-center justify-center text-gray-400 text-sm">No messages yet. Send the first one.</div>
            ) : (
              [...messages].reverse().map((msg: any) => (
                <div key={msg.id} className={cn('flex', msg.direction === 'OUTBOUND' ? 'justify-end' : 'justify-start')}>
                  <div className={cn('max-w-xs rounded-2xl px-4 py-2', msg.direction === 'OUTBOUND' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-900')}>
                    <p className="text-sm">{msg.body}</p>
                    <div className={cn('mt-1 flex items-center gap-1 text-xs', msg.direction === 'OUTBOUND' ? 'text-indigo-200' : 'text-gray-400')}>
                      <span className={cn('inline-block rounded-full px-1.5', channelBadge[msg.channel])}>{msg.channel}</span>
                      <span>{format(new Date(msg.createdAt), 'h:mm a')}</span>
                      {msg.direction === 'OUTBOUND' && (
                        <span>{msg.status === 'DELIVERED' ? '✓✓' : msg.status === 'SENT' ? '✓' : ''}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Input */}
          <form
            onSubmit={handleSubmit(({ body }) => send.mutate(body))}
            className="flex items-center gap-3 border-t border-gray-100 px-5 py-3"
          >
            <input
              {...register('body', { required: true })}
              placeholder={`Send ${channel === 'WHATSAPP' ? 'WhatsApp' : 'SMS'} message...`}
              className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <button
              type="submit"
              disabled={send.isPending}
              className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}

      {/* Connect number stub modal */}
      <Modal open={connectOpen} onClose={() => setConnectOpen(false)} title="Connect a WhatsApp Number">
        <div className="space-y-3">
          <p className="text-sm text-gray-600">
            Your workspace currently supports a single connected WhatsApp Business number, configured
            once per tenant.
          </p>
          <div className="rounded-lg border border-amber-100 bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
            Multi-number support requires a WhatsApp Business API upgrade — contact support to add
            additional numbers to your workspace.
          </div>
          <button
            onClick={() => setConnectOpen(false)}
            className="w-full rounded-lg bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-200"
          >
            Got it
          </button>
        </div>
      </Modal>
    </div>
  );
}
