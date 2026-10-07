'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Building2, Mail, MessageSquare, Phone, Plus, Search, Send, Users, Wifi } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { cn, getInitials } from '@/lib/utils';
import { useForm } from 'react-hook-form';
import { Modal } from '@/components/ui/Modal';

const channelBadge: Record<string, string> = {
  SMS: 'bg-blue-50 text-blue-700',
  WHATSAPP: 'bg-green-50 text-green-700',
};

type InboxFilter = 'ALL' | 'UNREAD' | 'RECENT';

export default function MessagesPage() {
  const qc = useQueryClient();
  const [selectedContact, setSelectedContact] = useState<any>(null);
  const [channel, setChannel] = useState<'SMS' | 'WHATSAPP' | 'EMAIL'>('SMS');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<InboxFilter>('ALL');
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

  const { data: recentMessages = [] } = useQuery({
    queryKey: ['messages-inbox', agentId],
    queryFn: async () => {
      const { data } = await api.get('/api/v1/messages', {
        params: { agentId: agentId || undefined, limit: 100 },
      });
      return data.data;
    },
    refetchInterval: 5000,
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

  const latestMessageByContact = new Map<string, any>();
  for (const message of recentMessages) {
    if (!latestMessageByContact.has(message.contactId)) latestMessageByContact.set(message.contactId, message);
  }

  const filteredContacts = (contacts || []).filter((contact: any) => {
    const matchesSearch = `${contact.name} ${contact.phone} ${contact.email || ''} ${contact.company || ''}`
      .toLowerCase()
      .includes(search.toLowerCase());
    const latestMessage = latestMessageByContact.get(contact.id);
    const matchesFilter = filter === 'ALL'
      || (filter === 'UNREAD' && latestMessage?.direction === 'INBOUND')
      || (filter === 'RECENT' && !!latestMessage);
    return matchesSearch && matchesFilter;
  });

  useEffect(() => {
    if (!selectedContact && contacts?.length) setSelectedContact(contacts[0]);
  }, [contacts, selectedContact]);

  return (
    <div className="flex h-[calc(100vh-8rem)] min-h-[520px] flex-col">
      <div className="grid min-h-0 flex-1 grid-cols-[minmax(220px,280px)_minmax(0,1fr)] overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm xl:grid-cols-[280px_minmax(0,1fr)_248px]">
        <aside className="flex min-h-0 flex-col border-r border-gray-200">
          <div className="border-b border-gray-100 p-4">
            <h2 className="text-lg font-semibold text-gray-900">Inbox</h2>
            <div className="relative mt-3">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search conversations..."
                className="w-full rounded-md border border-gray-200 bg-gray-50 py-2 pl-9 pr-3 text-sm text-gray-900 outline-none focus:border-blue-500 focus:bg-white"
              />
            </div>
            <div className="mt-3 flex items-center gap-1">
              {(['ALL', 'UNREAD', 'RECENT'] as const).map((value) => (
                <button
                  key={value}
                  onClick={() => setFilter(value)}
                  className={cn(
                    'rounded-full px-3 py-1 text-xs font-medium transition-colors',
                    filter === value ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-100',
                  )}
                >
                  {value === 'ALL' ? 'All' : value === 'UNREAD' ? 'Unread' : 'Recent'}
                </button>
              ))}
            </div>
            <div className="relative mt-3">
              <Users className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
              <select
                value={agentId}
                onChange={(event) => setAgentId(event.target.value)}
                aria-label="Filter by agent"
                className="w-full appearance-none rounded-md border border-gray-200 bg-white py-1.5 pl-8 pr-3 text-xs text-gray-700 outline-none focus:border-blue-500"
              >
                <option value="">All agents</option>
                {(agents || []).map((agent: any) => (
                  <option key={agent.id} value={agent.id}>{agent.firstName} {agent.lastName}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {filteredContacts.length ? filteredContacts.map((contact: any) => {
              const preview = latestMessageByContact.get(contact.id);
              return (
                <button
                  key={contact.id}
                  onClick={() => setSelectedContact(contact)}
                  className={cn(
                    'flex w-full items-start gap-3 border-b border-gray-100 px-3 py-3 text-left transition-colors hover:bg-gray-50',
                    selectedContact?.id === contact.id && 'bg-blue-50/70',
                  )}
                >
                  <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-700">
                    {getInitials(contact.name)}
                    {preview?.direction === 'INBOUND' && <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-blue-500" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-semibold text-gray-900">{contact.name}</p>
                      {preview?.createdAt && <span className="shrink-0 text-[10px] text-gray-400">{formatDistanceToNow(new Date(preview.createdAt), { addSuffix: false })}</span>}
                    </div>
                    <p className="mt-0.5 truncate text-xs text-gray-500">
                      {preview?.body || contact.company || contact.phone || 'No messages yet'}
                    </p>
                    {preview?.channel && <span className={cn('mt-1 inline-flex rounded px-1.5 py-0.5 text-[9px] font-semibold', channelBadge[preview.channel] || 'bg-gray-100 text-gray-600')}>{preview.channel}</span>}
                  </div>
                </button>
              );
            }) : (
              <div className="px-5 py-10 text-center text-sm text-gray-400">No conversations found.</div>
            )}
          </div>

          <div className="border-t border-gray-100 p-3">
            <div className="mb-2 flex items-center justify-between px-1">
              <p className="text-[10px] font-semibold uppercase text-gray-400">Connected Number</p>
              <button onClick={() => setConnectOpen(true)} aria-label="Connect WhatsApp number" title="Connect WhatsApp number" className="rounded p-1 text-blue-600 hover:bg-blue-50"><Plus className="h-4 w-4" /></button>
            </div>
            {tenant?.whatsappPhoneNumberId ? (
              <div className="flex items-center gap-2 rounded-md bg-gray-50 px-2.5 py-2">
                <Wifi className="h-4 w-4 shrink-0 text-emerald-600" />
                <span className="truncate text-xs text-gray-600">{tenant.whatsappPhoneNumberId}</span>
              </div>
            ) : <p className="text-xs text-gray-400">No WhatsApp number connected.</p>}
          </div>
        </aside>

        <section className="flex min-h-0 min-w-0 flex-col">
          {selectedContact ? (
            <>
              <header className="flex items-center justify-between border-b border-gray-200 px-4 py-3 sm:px-5">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-700">{getInitials(selectedContact.name)}</div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-gray-900">{selectedContact.name}</p>
                    <p className="truncate text-xs text-gray-500">{selectedContact.phone}</p>
                  </div>
                </div>
                <a href={`tel:${selectedContact.phone}`} title="Call contact" aria-label="Call contact" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white hover:bg-blue-700"><Phone className="h-4 w-4" /></a>
              </header>

              <div className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-gray-50/70 p-4 sm:p-5">
                {loadingMsgs ? (
                  <div className="flex h-full items-center justify-center text-sm text-gray-400">Loading conversation...</div>
                ) : !messages?.length ? (
                  <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-gray-400">
                    <MessageSquare className="h-8 w-8 opacity-30" />
                    <p className="text-sm">No messages yet. Start the conversation.</p>
                  </div>
                ) : [...messages].reverse().map((message: any) => (
                  <div key={message.id} className={cn('flex', message.direction === 'OUTBOUND' ? 'justify-end' : 'justify-start')}>
                    <div className={cn('max-w-[85%] rounded-lg border px-3 py-2.5 sm:max-w-[75%]', message.direction === 'OUTBOUND' ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-200 bg-white text-gray-800')}>
                      <p className="whitespace-pre-wrap break-words text-sm">{message.body}</p>
                      <div className={cn('mt-2 flex items-center gap-2 text-[10px]', message.direction === 'OUTBOUND' ? 'text-blue-100' : 'text-gray-400')}>
                        <span>{message.channel === 'WHATSAPP' ? 'WhatsApp' : 'SMS'}</span>
                        <span>{format(new Date(message.createdAt), 'h:mm a')}</span>
                        {message.direction === 'OUTBOUND' && <span>{message.status === 'DELIVERED' ? '✓✓' : message.status === 'SENT' ? '✓' : ''}</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <form onSubmit={handleSubmit(({ body }) => channel !== 'EMAIL' && send.mutate(body))} className="flex items-center gap-2 border-t border-gray-200 bg-white p-3 sm:gap-3 sm:px-4">
                <select value={channel} onChange={(event) => setChannel(event.target.value as 'SMS' | 'WHATSAPP' | 'EMAIL')} aria-label="Message channel" className="max-w-28 rounded-md border border-gray-200 bg-white px-2 py-2 text-xs text-gray-600 outline-none focus:border-blue-500">
                  <option value="EMAIL">Email</option>
                  <option value="WHATSAPP">WhatsApp</option>
                  <option value="SMS">SMS</option>
                </select>
                <input
                  {...register('body', { required: true })}
                  placeholder={channel === 'EMAIL' ? 'Email sending is not available yet' : 'Write a message...'}
                  className="min-w-0 flex-1 rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-500"
                />
                <button type="submit" disabled={send.isPending || channel === 'EMAIL'} title={channel === 'EMAIL' ? 'Email sending is not available yet' : 'Send message'} aria-label="Send message" className="flex h-9 w-10 shrink-0 items-center justify-center rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"><Send className="h-4 w-4" /></button>
              </form>
              {channel === 'EMAIL' && <p className="border-t border-gray-100 bg-amber-50 px-4 py-2 text-xs text-amber-800">Email is available as a channel option, but email delivery is not configured yet.</p>}
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 text-gray-400">
              <MessageSquare className="h-9 w-9 opacity-25" />
              <p className="text-sm">Select a conversation to open it.</p>
            </div>
          )}
        </section>

        <aside className="hidden min-h-0 flex-col border-l border-gray-200 bg-white xl:flex">
          {selectedContact ? (
            <>
              <div className="border-b border-gray-100 px-4 py-4 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-700">{getInitials(selectedContact.name)}</div>
                <h2 className="mt-2 truncate text-sm font-semibold text-gray-900">{selectedContact.name}</h2>
                <p className="mt-0.5 truncate text-xs text-gray-500">{selectedContact.company || 'Contact'}</p>
                <Link href="/dashboard/contacts" className="mt-3 inline-flex text-xs font-medium text-blue-600 hover:text-blue-700">View in Contacts</Link>
              </div>
              <div className="space-y-4 overflow-y-auto p-4">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Contact</p>
                  <div className="mt-2 space-y-2.5">
                    <div className="flex gap-2 text-xs text-gray-600"><Phone className="h-3.5 w-3.5 shrink-0 text-gray-400" /><span className="break-all">{selectedContact.phone}</span></div>
                    {selectedContact.email && <div className="flex gap-2 text-xs text-gray-600"><Mail className="h-3.5 w-3.5 shrink-0 text-gray-400" /><span className="break-all">{selectedContact.email}</span></div>}
                    {selectedContact.company && <div className="flex gap-2 text-xs text-gray-600"><Building2 className="h-3.5 w-3.5 shrink-0 text-gray-400" /><span>{selectedContact.company}</span></div>}
                  </div>
                </div>
                <div className="border-t border-gray-100 pt-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Lead details</p>
                  <dl className="mt-2 space-y-2 text-xs">
                    <div className="flex justify-between gap-2"><dt className="text-gray-500">Status</dt><dd className="font-medium text-gray-800">{selectedContact.status?.toLowerCase().replace(/_/g, ' ') || '—'}</dd></div>
                    <div className="flex justify-between gap-2"><dt className="text-gray-500">Temperature</dt><dd className="font-medium text-gray-800">{selectedContact.temperature?.toLowerCase() || '—'}</dd></div>
                    <div className="flex justify-between gap-2"><dt className="text-gray-500">Source</dt><dd className="truncate font-medium text-gray-800">{selectedContact.source || '—'}</dd></div>
                  </dl>
                </div>
              </div>
            </>
          ) : <div className="p-4 text-xs text-gray-400">Contact details appear here.</div>}
        </aside>
      </div>

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
