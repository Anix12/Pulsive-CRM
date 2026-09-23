'use client';

import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { io, Socket } from 'socket.io-client';
import { Phone, Search, Smartphone, Check, PhoneOff } from 'lucide-react';
import { format } from 'date-fns';
import api from '@/lib/api';
import { cn, formatDuration } from '@/lib/utils';
import { useAuthStore } from '@/store/auth.store';

const STEPS = [
  { key: 'INITIATED', label: 'Requested' },
  { key: 'RINGING', label: 'Ringing' },
  { key: 'IN_PROGRESS', label: 'Connected' },
  { key: 'COMPLETED', label: 'Completed' },
];
const FAILED_STATUSES = ['FAILED', 'BUSY', 'NO_ANSWER', 'CANCELLED'];
const TERMINAL = ['COMPLETED', ...FAILED_STATUSES];

const failedText: Record<string, string> = {
  FAILED: 'Call failed. Check the Twilio configuration in Settings.',
  BUSY: 'The number was busy.',
  NO_ANSWER: 'No answer.',
  CANCELLED: 'Call was cancelled.',
};

const avatarColors = ['bg-indigo-600', 'bg-green-600', 'bg-amber-600', 'bg-pink-600', 'bg-cyan-600', 'bg-red-600'];
const avatarColor = (seed: string) => {
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return avatarColors[h % avatarColors.length];
};
const initials = (name: string) =>
  name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();

export default function WebDialerPage() {
  const qc = useQueryClient();
  const { accessToken } = useAuthStore();
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [notes, setNotes] = useState('');
  const [callId, setCallId] = useState<string | null>(null);
  const [callee, setCallee] = useState<{ name: string; phone: string; company?: string } | null>(null);
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data: contacts = [], isLoading } = useQuery<any[]>({
    queryKey: ['dialer-contacts', debounced],
    queryFn: async () => {
      const { data } = await api.get('/api/v1/contacts', { params: { limit: 50, search: debounced || undefined } });
      return data.data;
    },
  });

  const { data: activeCall } = useQuery<any>({
    queryKey: ['dialer-call', callId],
    queryFn: async () => (await api.get(`/api/v1/calls/${callId}`)).data.data,
    enabled: !!callId,
    refetchInterval: (q) => (q.state.data && TERMINAL.includes(q.state.data.status) ? false : 3000),
  });

  const { data: recent } = useQuery<any>({
    queryKey: ['calls', 'recent'],
    queryFn: async () => (await api.get('/api/v1/calls', { params: { limit: 5 } })).data,
  });

  useEffect(() => {
    if (!accessToken) return;
    const socket: Socket = io(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000', {
      auth: { token: accessToken },
    });
    socket.on('call:status_updated', () => {
      qc.invalidateQueries({ queryKey: ['dialer-call'] });
      qc.invalidateQueries({ queryKey: ['calls'] });
    });
    return () => { socket.disconnect(); };
  }, [accessToken, qc]);

  const status: string | null = activeCall?.status ?? (callId ? 'INITIATED' : null);
  const isTerminal = !!status && TERMINAL.includes(status);
  const isFailed = !!status && FAILED_STATUSES.includes(status);

  useEffect(() => {
    if (status !== 'IN_PROGRESS') return;
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [status]);

  const startCall = useMutation({
    mutationFn: async (c: any) => {
      const { data } = await api.post('/api/v1/calls', {
        contactId: c.id,
        toNumber: c.phone,
        notes: notes.trim() || undefined,
      });
      return { call: data.data, contact: c };
    },
    onSuccess: ({ call, contact }) => {
      setSeconds(0);
      setCallee({ name: contact.name, phone: contact.phone, company: contact.company });
      setCallId(call.id);
      qc.invalidateQueries({ queryKey: ['calls'] });
    },
  });

  const reset = () => {
    setCallId(null);
    setCallee(null);
    setSeconds(0);
    setNotes('');
    startCall.reset();
  };

  const stepIndex = STEPS.findIndex((s) => s.key === status);
  const inCall = !!callId;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Web Dialer</h1>
        <p className="text-sm text-gray-500">Pick a contact and start a call from your browser. Status updates live.</p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_280px]">
        <div className="space-y-5">
          <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
            {!inCall ? (
              <>
                <p className="mb-3 text-sm font-semibold text-gray-900">Call request</p>
                <div className="relative mb-3">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search contacts by name, phone or company"
                    className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-sm focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Notes for this call (optional)"
                  rows={2}
                  className="mb-3 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                />
                {startCall.isError && (
                  <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                    Could not start the call. Check the Twilio configuration in Settings.
                  </p>
                )}
                <div className="max-h-[420px] space-y-2 overflow-y-auto">
                  {isLoading ? (
                    <p className="py-8 text-center text-sm text-gray-400">Loading contacts…</p>
                  ) : contacts.length === 0 ? (
                    <p className="py-8 text-center text-sm text-gray-400">No contacts found</p>
                  ) : (
                    contacts.map((c) => (
                      <div key={c.id} className="flex items-center gap-3 rounded-lg border border-gray-100 p-2.5">
                        <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white', avatarColor(c.name))}>
                          {initials(c.name)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-gray-900">{c.name}</p>
                          <p className="truncate text-xs text-gray-500">{[c.company, c.phone].filter(Boolean).join(' · ')}</p>
                        </div>
                        <button
                          onClick={() => startCall.mutate(c)}
                          disabled={!c.phone || startCall.isPending}
                          className="flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-500 disabled:opacity-40"
                        >
                          <Phone className="h-3.5 w-3.5" />
                          {startCall.isPending && startCall.variables?.id === c.id ? 'Calling…' : 'Call'}
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="mb-4 flex items-center gap-3">
                  <div className={cn('flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white', avatarColor(callee?.name ?? ''))}>
                    {initials(callee?.name ?? '?')}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{callee?.name}</p>
                    <p className="text-xs text-gray-500">{[callee?.company, callee?.phone].filter(Boolean).join(' · ')}</p>
                  </div>
                </div>

                <div className="mb-4 flex flex-wrap gap-1.5">
                  {STEPS.map((s, i) => (
                    <span
                      key={s.key}
                      className={cn(
                        'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium',
                        isFailed ? 'bg-gray-100 text-gray-400'
                          : i < stepIndex || status === 'COMPLETED' ? 'bg-green-50 text-green-700'
                          : i === stepIndex ? 'bg-indigo-50 text-indigo-700'
                          : 'bg-gray-100 text-gray-400',
                      )}
                    >
                      {(i < stepIndex || status === 'COMPLETED') && !isFailed && <Check className="h-3 w-3" />}
                      {s.label}
                    </span>
                  ))}
                </div>

                <div className={cn('rounded-lg px-4 py-3 text-sm font-semibold', isFailed ? 'bg-red-50 text-red-700' : 'bg-gray-50 text-gray-800')}>
                  {isFailed ? failedText[status!]
                    : status === 'INITIATED' ? 'Call request created…'
                    : status === 'RINGING' ? 'Ringing…'
                    : status === 'IN_PROGRESS' ? `Call in progress — ${formatDuration(seconds)}`
                    : `Call completed${activeCall?.duration ? ` — ${formatDuration(activeCall.duration)}` : ''}`}
                </div>

                {isTerminal && (
                  <div className="mt-4 text-center">
                    <button onClick={reset} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                      Back to contacts
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
            <p className="mb-3 text-sm font-semibold text-gray-900">Recent calls</p>
            {!recent?.data?.length ? (
              <p className="text-sm text-gray-400">No calls yet</p>
            ) : (
              <ul className="divide-y divide-gray-50">
                {recent.data.map((c: any) => (
                  <li key={c.id} className="flex items-center justify-between py-2 text-sm">
                    <span className="font-medium text-gray-900">{c.contact?.name ?? c.toNumber}</span>
                    <span className="flex items-center gap-3 text-xs text-gray-500">
                      <span>{c.status}</span>
                      <span>{c.duration ? formatDuration(c.duration) : '—'}</span>
                      <span>{format(new Date(c.createdAt), 'dd MMM, h:mm a')}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="hidden justify-center lg:flex">
          <div className="h-[440px] w-[220px] rounded-[30px] bg-[#0d0d14] p-2 shadow-lg">
            <div className="flex h-full w-full flex-col items-center justify-center overflow-hidden rounded-[22px] bg-white">
              {!inCall ? (
                <div className="flex flex-col items-center gap-2 px-4 text-center">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
                    <Smartphone className="h-5 w-5" />
                  </div>
                  <p className="text-xs text-gray-400">Waiting for a call request</p>
                </div>
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-between bg-[#14121c] px-4 py-8 text-center text-white">
                  <div>
                    <div className={cn('mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full text-lg font-bold', avatarColor(callee?.name ?? ''))}>
                      {initials(callee?.name ?? '?')}
                    </div>
                    <p className="font-semibold">{callee?.name}</p>
                    <p className="mt-1.5 text-[11px] text-[#a99fc2]">
                      {status === 'IN_PROGRESS' ? 'Connected' : status === 'RINGING' ? 'Ringing…' : status === 'INITIATED' ? 'Calling…' : isFailed ? 'Call ended' : 'Completed'}
                    </p>
                    {status === 'IN_PROGRESS' && <p className="mt-1 font-mono text-sm">{formatDuration(seconds)}</p>}
                  </div>
                  <div className={cn('flex h-12 w-12 items-center justify-center rounded-full', isTerminal ? 'bg-gray-600' : 'bg-red-600')}>
                    <PhoneOff className="h-5 w-5" />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
