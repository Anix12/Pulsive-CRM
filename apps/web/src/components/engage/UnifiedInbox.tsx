'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2, Phone, Send } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import api from '@/lib/api';
import { cn, getInitials } from '@/lib/utils';

type Contact = {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  company?: string | null;
  source?: string | null;
  status?: string | null;
  temperature?: string | null;
  deal?: string | null;
  budget?: string | null;
  nextFollowUp?: string | null;
};

type Message = {
  id: string;
  contactId: string;
  body: string;
  channel: string;
  direction: string;
  status?: string;
  createdAt: string;
};

type DemoEvent = {
  channel: 'WHATSAPP' | 'AI CALL' | 'EMAIL' | 'SMS' | 'INTERNAL NOTE';
  body: string;
  time: string;
  summary?: string;
  next?: string;
};

type DemoContact = Contact & {
  unread?: boolean;
  preview: string;
  time: string;
  events: DemoEvent[];
};

const demoContacts: DemoContact[] = [
  {
    id: 'demo-rahul',
    name: 'Rahul Sharma',
    phone: '+91 98765 43210',
    email: 'rahul.sharma@abcent.in',
    company: 'ABC Enterprises',
    source: 'Website',
    status: 'Qualified',
    temperature: 'Hot',
    deal: '2BHK, Sector 45',
    budget: '₹80L',
    nextFollowUp: 'Tomorrow, 11:00 AM',
    unread: true,
    preview: 'WhatsApp: Sharing them now.',
    time: '2m',
    events: [
      {
        channel: 'WHATSAPP',
        body: 'You: Sharing the pricing details now, let me know if you have questions.',
        time: 'Today, 10:42 AM',
      },
      {
        channel: 'AI CALL',
        body: 'Outbound call · 4m 21s · Connected',
        summary: 'Interested in 2BHK, budget ₹80L. Requested pricing on WhatsApp. Follow up tomorrow.',
        next: 'Follow up tomorrow',
        time: 'Today, 10:20 AM',
      },
      {
        channel: 'EMAIL',
        body: 'Re: 2BHK Availability — Gurgaon Sector 45',
        summary: 'Thank you for sharing the brochure. Could you also send the floor plan for...',
        time: 'Yesterday, 4:15 PM',
      },
      {
        channel: 'SMS',
        body: 'Reminder: Site visit scheduled tomorrow at 11:00 AM, Sector 45.',
        time: '2 days ago, 9:00 AM',
      },
      {
        channel: 'INTERNAL NOTE',
        body: 'Aisha: Spouse also involved in decision — loop them into next call.',
        time: '3 days ago · Added by Aisha Khan',
      },
    ],
  },
  {
    id: 'demo-neha',
    name: 'Neha Gupta',
    phone: '+91 98765 10018',
    email: 'neha@example.in',
    company: 'Northstar Homes',
    source: 'Referral',
    status: 'Interested',
    temperature: 'Warm',
    deal: '3BHK, Golf Course Road',
    budget: '₹1.2Cr',
    nextFollowUp: 'Today, 2:00 PM',
    unread: true,
    preview: 'Call: 4m 21s · Interested',
    time: '18m',
    events: [
      {
        channel: 'AI CALL',
        body: 'Outbound call · 4m 21s · Connected',
        summary: 'Interested in a 3BHK. Asked for the project brochure and floor plans.',
        next: 'Send brochure today',
        time: 'Today, 10:05 AM',
      },
      {
        channel: 'WHATSAPP',
        body: 'You: I have sent the brochure. Let me know if you would like to book a visit.',
        time: 'Yesterday, 3:15 PM',
      },
    ],
  },
  {
    id: 'demo-aman',
    name: 'Aman Verma',
    phone: '+91 98765 10022',
    email: 'aman@example.in',
    company: 'Verma & Co.',
    source: 'Property portal',
    status: 'New lead',
    temperature: 'Warm',
    deal: '2BHK, Sector 45',
    budget: '₹75L',
    preview: 'Email: Re: Product Brochure',
    time: '1h',
    events: [
      {
        channel: 'EMAIL',
        body: 'Re: Product Brochure',
        summary: 'Thanks for sending the project details. I would like to know more about availability.',
        time: 'Today, 9:32 AM',
      },
    ],
  },
  {
    id: 'demo-priya',
    name: 'Priya Singh',
    phone: '+91 98765 10035',
    email: 'priya@example.in',
    company: 'Singh Properties',
    source: 'Website',
    status: 'Qualified',
    temperature: 'Hot',
    deal: '3BHK, Sector 56',
    budget: '₹1Cr',
    preview: 'SMS: Thanks, will check.',
    time: '3h',
    events: [
      {
        channel: 'SMS',
        body: 'Thanks, will check.',
        time: 'Today, 7:40 AM',
      },
    ],
  },
  {
    id: 'demo-arjun',
    name: 'Arjun Mehta',
    phone: '+91 98765 10041',
    email: 'arjun@example.in',
    company: 'Mehta Group',
    source: 'Referral',
    status: 'Follow up',
    temperature: 'Warm',
    deal: '2BHK, Sector 45',
    budget: '₹80L',
    preview: 'AI Call: Follow-up scheduled',
    time: 'Yesterday',
    events: [
      {
        channel: 'AI CALL',
        body: 'Outbound call · 2m 08s · Connected',
        summary: 'Asked to reconnect after reviewing the project details with family.',
        next: 'Call back next week',
        time: 'Yesterday, 3:10 PM',
      },
    ],
  },
];

type InboxFilter = 'ALL' | 'UNREAD' | 'RECENT';
type Channel = 'WHATSAPP' | 'SMS' | 'EMAIL';

const channelStyles: Record<DemoEvent['channel'], string> = {
  WHATSAPP: 'bg-emerald-50 text-emerald-700',
  'AI CALL': 'bg-violet-50 text-violet-700',
  EMAIL: 'bg-slate-100 text-slate-600',
  SMS: 'bg-purple-50 text-purple-700',
  'INTERNAL NOTE': 'bg-amber-50 text-amber-700',
};

function getMessageLabel(channel: string): DemoEvent['channel'] {
  if (channel === 'WHATSAPP' || channel === 'EMAIL' || channel === 'SMS') return channel;
  return 'SMS';
}

export function UnifiedInbox() {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<InboxFilter>('ALL');
  const [channel, setChannel] = useState<Channel>('WHATSAPP');
  const [draft, setDraft] = useState('');
  const [demoEvents, setDemoEvents] = useState<Record<string, DemoEvent[]>>({});

  const contactsQuery = useQuery({
    queryKey: ['contacts-list'],
    queryFn: async () => {
      const { data } = await api.get('/api/v1/contacts?limit=100');
      return data.data as Contact[];
    },
  });

  const demoMode = contactsQuery.isError || contactsQuery.data?.length === 0;
  const contacts = demoMode ? demoContacts : (contactsQuery.data ?? []);
  const selectedContact =
    contacts.find((contact) => contact.id === selectedId) ?? contacts[0] ?? null;

  useEffect(() => {
    if (selectedContact && selectedContact.id !== selectedId) {
      setSelectedId(selectedContact.id);
    }
  }, [selectedContact, selectedId]);

  const messagesQuery = useQuery({
    queryKey: ['messages', selectedContact?.id],
    queryFn: async () => {
      const { data } = await api.get('/api/v1/messages', {
        params: { contactId: selectedContact?.id, limit: 50 },
      });
      return data.data as Message[];
    },
    enabled: !!selectedContact && !demoMode,
    refetchInterval: 5000,
  });

  const recentMessagesQuery = useQuery({
    queryKey: ['messages-inbox'],
    queryFn: async () => {
      const { data } = await api.get('/api/v1/messages', { params: { limit: 100 } });
      return data.data as Message[];
    },
    enabled: !demoMode,
    refetchInterval: 10000,
  });

  const sendMessage = useMutation({
    mutationFn: (body: string) =>
      api.post('/api/v1/messages', { contactId: selectedContact?.id, channel, body }),
    onSuccess: async () => {
      setDraft('');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['messages', selectedContact?.id] }),
        queryClient.invalidateQueries({ queryKey: ['messages-inbox'] }),
      ]);
    },
  });

  const latestByContact = useMemo(() => {
    const latest = new Map<string, Message>();
    for (const message of recentMessagesQuery.data ?? []) {
      if (!latest.has(message.contactId)) latest.set(message.contactId, message);
    }
    return latest;
  }, [recentMessagesQuery.data]);

  const visibleContacts = useMemo(() => {
    const query = search.trim().toLowerCase();
    return contacts.filter((contact) => {
      const latest = latestByContact.get(contact.id);
      const demoContact = demoMode ? (contact as DemoContact) : undefined;
      const matchesSearch = !query ||
        `${contact.name} ${contact.phone ?? ''} ${contact.email ?? ''} ${contact.company ?? ''}`
          .toLowerCase()
          .includes(query);
      const matchesFilter = filter === 'ALL'
        || (filter === 'UNREAD' && (demoContact?.unread || latest?.direction === 'INBOUND'))
        || (filter === 'RECENT' && (demoContact || !!latest));
      return matchesSearch && matchesFilter;
    });
  }, [contacts, filter, latestByContact, search, demoMode]);

  const events = useMemo(() => {
    if (!selectedContact) return [];
    if (demoMode) return demoEvents[selectedContact.id] ?? (selectedContact as DemoContact).events;
    return [...(messagesQuery.data ?? [])].reverse().map((message): DemoEvent => ({
      channel: getMessageLabel(message.channel),
      body: `${message.direction === 'OUTBOUND' ? 'You: ' : ''}${message.body}`,
      time: format(new Date(message.createdAt), 'MMM d, h:mm a'),
    }));
  }, [demoEvents, demoMode, messagesQuery.data, selectedContact]);

  const submitMessage = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const body = draft.trim();
    if (!body || !selectedContact) return;

    if (demoMode) {
      setDemoEvents((current) => ({
        ...current,
        [selectedContact.id]: [
          ...(current[selectedContact.id] ?? (selectedContact as DemoContact).events),
          {
            channel,
            body: `You: ${body}`,
            time: `Today, ${format(new Date(), 'h:mm a')}`,
          },
        ],
      }));
      setDraft('');
      return;
    }

    sendMessage.mutate(body);
  };

  const currentError = contactsQuery.isError
    ? 'Could not load contacts. Showing the sample inbox; check the connection and refresh to see live data.'
    : messagesQuery.isError || recentMessagesQuery.isError
      ? 'Some inbox data could not be loaded. Try refreshing the page.'
      : null;

  return (
    <div className="flex h-[calc(100vh-8rem)] min-h-[560px] flex-col">
      <div className="grid min-h-0 flex-1 grid-cols-[minmax(210px,260px)_minmax(0,1fr)] overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm lg:grid-cols-[260px_minmax(0,1fr)_248px]">
        <aside className="flex min-h-0 flex-col border-r border-gray-200">
          <div className="border-b border-gray-100 p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Inbox</h2>
              {demoMode && <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700">Example</span>}
            </div>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search conversations..."
              aria-label="Search conversations"
              className="mt-3 w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-900 outline-none focus:border-blue-500 focus:bg-white"
            />
            <div className="mt-3 flex items-center gap-1">
              {(['ALL', 'UNREAD', 'RECENT'] as const).map((value) => (
                <button
                  key={value}
                  type="button"
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
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {contactsQuery.isLoading ? (
              <p className="px-4 py-8 text-center text-sm text-gray-400">Loading conversations...</p>
            ) : visibleContacts.length ? visibleContacts.map((contact) => {
              const latest = latestByContact.get(contact.id);
              const preview = demoMode ? (contact as DemoContact).preview : latest?.body;
              const when = demoMode ? (contact as DemoContact).time : latest?.createdAt;
              const unread = demoMode ? (contact as DemoContact).unread : latest?.direction === 'INBOUND';

              return (
                <button
                  key={contact.id}
                  type="button"
                  onClick={() => setSelectedId(contact.id)}
                  className={cn(
                    'flex w-full items-center gap-2.5 border-b border-gray-100 px-3 py-3 text-left transition-colors hover:bg-gray-50',
                    selectedContact?.id === contact.id && 'bg-blue-50/70',
                  )}
                >
                  <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-semibold text-slate-700">
                    {getInitials(contact.name)}
                    {unread && <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-xs font-semibold text-gray-900">{contact.name}</p>
                      {when && (
                        <span className="shrink-0 text-[9px] text-gray-400">
                          {demoMode ? when : formatDistanceToNow(new Date(when), { addSuffix: false })}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 truncate text-[10px] text-gray-500">{preview || contact.company || contact.phone || 'No messages yet'}</p>
                  </div>
                </button>
              );
            }) : (
              <p className="px-5 py-10 text-center text-sm text-gray-400">No conversations found.</p>
            )}
          </div>
        </aside>

        <section className="flex min-h-0 min-w-0 flex-col">
          {selectedContact ? (
            <>
              <header className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3 sm:px-5">
                <div className="flex min-w-0 items-center gap-2.5">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[10px] font-semibold text-white">{getInitials(selectedContact.name)}</div>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-gray-900">{selectedContact.name}</p>
                    <p className="truncate text-[10px] text-gray-500">{selectedContact.phone}{selectedContact.company ? ` · ${selectedContact.company}` : ''}</p>
                  </div>
                </div>
                {selectedContact.phone && <a href={`tel:${selectedContact.phone}`} title="Call contact" aria-label="Call contact" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white hover:bg-blue-700"><Phone className="h-4 w-4" /></a>}
              </header>

              {currentError && <p role="alert" className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-800">{currentError}</p>}

              <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto bg-gray-50/70 p-4 sm:p-5">
                {messagesQuery.isLoading && !demoMode ? (
                  <p className="py-8 text-center text-sm text-gray-400">Loading conversation...</p>
                ) : events.length ? events.map((item, index) => (
                  <article key={`${selectedContact.id}-${index}`} className={cn(
                    'rounded-lg border px-3 py-2.5',
                    item.channel === 'INTERNAL NOTE' ? 'border-amber-200 bg-amber-50/70' : 'border-gray-200 bg-white',
                    item.channel === 'AI CALL' && 'border-2 border-sky-400',
                  )}>
                    <span className={cn('inline-flex rounded-full px-2 py-0.5 text-[9px] font-semibold', channelStyles[item.channel])}>{item.channel}</span>
                    <p className="mt-1 text-[11px] font-medium leading-5 text-gray-800">{item.body}</p>
                    {item.summary && (
                      <div className={cn('mt-1 rounded border border-dashed px-2 py-1.5', item.channel === 'AI CALL' ? 'border-sky-300 bg-sky-50/50' : 'border-gray-200 bg-gray-50')}>
                        {item.channel === 'AI CALL' && <p className="mb-1 text-[9px] font-semibold uppercase tracking-wide text-gray-500">AI Summary</p>}
                        <p className="text-[10px] leading-4 text-gray-600">{item.summary}</p>
                      </div>
                    )}
                    <div className="mt-1.5 flex items-center justify-between gap-3">
                      <time className="text-[9px] text-gray-400">{item.time}</time>
                      {item.channel === 'AI CALL' && (
                        <Link href="/dashboard/calls" className="text-[10px] font-medium text-blue-600 hover:text-blue-700">
                          Play recording · View transcript
                        </Link>
                      )}
                    </div>
                  </article>
                )) : (
                  <div className="flex h-full items-center justify-center text-sm text-gray-400">No activity yet.</div>
                )}
              </div>

              <form onSubmit={submitMessage} className="flex items-center gap-2 border-t border-gray-200 bg-white p-3 sm:gap-2.5 sm:px-4">
                <select
                  value={channel}
                  onChange={(event) => setChannel(event.target.value as Channel)}
                  aria-label="Message channel"
                  className="max-w-28 rounded-full border border-gray-200 bg-emerald-50 px-2.5 py-2 text-[10px] font-medium text-emerald-700 outline-none focus:border-blue-500"
                >
                  <option value="WHATSAPP">WhatsApp</option>
                  <option value="SMS">SMS</option>
                  <option value="EMAIL">Email</option>
                </select>
                <input
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder="Write a message..."
                  aria-label="Write a message"
                  className="min-w-0 flex-1 rounded-md border border-gray-200 px-3 py-2 text-xs text-gray-900 outline-none focus:border-blue-500"
                />
                <button type="submit" disabled={!draft.trim() || sendMessage.isPending || (channel === 'EMAIL' && !demoMode)} className="flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-md bg-blue-600 px-3 text-xs font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">
                  <Send className="h-3.5 w-3.5" /> Send
                </button>
              </form>
              {sendMessage.isError && <p role="alert" className="border-t border-red-100 bg-red-50 px-4 py-2 text-xs text-red-700">Message could not be sent. Please try again.</p>}
              {channel === 'EMAIL' && !demoMode && <p className="border-t border-gray-100 bg-amber-50 px-4 py-2 text-xs text-amber-800">Email delivery is not configured yet.</p>}
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center text-sm text-gray-400">
              {contactsQuery.isError ? 'Could not load the inbox. Check your connection and try again.' : 'Select a conversation to open it.'}
            </div>
          )}
        </section>

        <aside className="hidden min-h-0 flex-col border-l border-gray-200 bg-white lg:flex">
          {selectedContact ? (
            <>
              <div className="space-y-2 border-b border-gray-100 px-4 py-4">
                <p className="text-[9px] font-semibold uppercase tracking-wide text-gray-400">Contact</p>
                <div className="space-y-1.5 text-[10px]">
                  <div><p className="text-gray-400">Phone</p><p className="font-medium text-gray-800">{selectedContact.phone || '—'}</p></div>
                  <div><p className="text-gray-400">Email</p><p className="break-all font-medium text-gray-800">{selectedContact.email || '—'}</p></div>
                  <div><p className="text-gray-400">Company</p><p className="font-medium text-gray-800">{selectedContact.company || '—'}</p></div>
                  <div><p className="text-gray-400">Source</p><p className="font-medium text-gray-800">{selectedContact.source || '—'}</p></div>
                </div>
              </div>
              <div className="space-y-2 border-b border-gray-100 px-4 py-3">
                <p className="text-[9px] font-semibold uppercase tracking-wide text-gray-400">Status</p>
                <div className="flex flex-wrap gap-1.5">
                  <span className="rounded-full bg-emerald-50 px-2 py-1 text-[9px] font-medium text-emerald-700">{selectedContact.status?.toLowerCase().replace(/_/g, ' ') || 'Lead'}</span>
                  {selectedContact.temperature && <span className="rounded-full bg-amber-50 px-2 py-1 text-[9px] font-medium text-amber-700">{selectedContact.temperature}</span>}
                </div>
              </div>
              <div className="space-y-2 border-b border-gray-100 px-4 py-3 text-[10px]">
                <p className="text-[9px] font-semibold uppercase tracking-wide text-gray-400">Deal</p>
                <div><p className="text-gray-400">Requirement</p><p className="font-medium text-gray-800">{selectedContact.deal || '—'}</p></div>
                <div><p className="text-gray-400">Budget</p><p className="font-medium text-gray-800">{selectedContact.budget || '—'}</p></div>
                <div><p className="text-gray-400">Next follow-up</p><p className="font-medium text-gray-800">{selectedContact.nextFollowUp || '—'}</p></div>
              </div>
              <div className="p-4">
                <Link href="/dashboard/contacts/list" className="flex w-full items-center justify-center rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-[10px] font-medium text-gray-700 hover:bg-gray-100">
                  <Building2 className="mr-1.5 h-3.5 w-3.5" /> Handoff to Sales
                </Link>
              </div>
            </>
          ) : <div className="p-4 text-xs text-gray-400">Contact details appear here.</div>}
        </aside>
      </div>
    </div>
  );
}
