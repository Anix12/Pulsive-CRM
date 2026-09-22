'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  Clock, Lock, MessageCircle, Mic, Minus, Phone, PhoneOff, PhoneOutgoing, ShieldAlert, Loader2, PartyPopper, X, Pencil, ClipboardList,
} from 'lucide-react';
import api from '@/lib/api';
import { cn, getInitials } from '@/lib/utils';
import { errorMessage } from '@/lib/leadViews';
import { useCallSession } from '@/store/callSession.store';
import { clock, useSessionCall, type CallStage } from '@/components/leads/useSessionCall';
import { useEngagementForm } from '@/lib/engagementForms';
import { usePresence } from '@/lib/presence';
import { BreakBlock } from '@/components/leads/BreakBlock';
import { EngagementFormFields } from '@/components/leads/EngagementFormFields';
import { EngagementFormBuilderModal } from '@/components/leads/EngagementFormBuilderModal';

const STAGES = ['OPEN', 'IN PROGRESS', 'INTERESTED', 'NOT INTERESTED', 'CONVERTED', 'LOST'];

type Tab = 'info' | 'dispose' | 'activity';

// Retries shown next to a reason are informational only (how many more times this
// reason may reasonably be tried before escalating) — nothing in the API enforces them yet.
const NOT_CONNECTED_REASONS: { label: string; retries?: number }[] = [
  { label: 'No Answer', retries: 7 },
  { label: 'Busy in another call', retries: 3 },
  { label: 'User disconnected the call', retries: 1 },
  { label: 'Switch off', retries: 1 },
  { label: 'Out of Coverage area / Network issue', retries: 1 },
  { label: 'Call not connected / can not be completed', retries: 1 },
  { label: 'Other reason', retries: 1 },
  { label: 'Incorrect / Invalid number' },
  { label: 'Incoming calls not available' },
  { label: 'Number not in use / does not exists / out of service' },
];
// "Yes Connected" has no reason list yet — its own layout is a separate follow-up.

const FOLLOW_UPS = [
  { key: '1h', label: '1 hour', ms: 3_600_000 },
  { key: '6h', label: '6 hours', ms: 6 * 3_600_000 },
  { key: '1d', label: '1 day', ms: 24 * 3_600_000 },
];

const FAILED_TEXT: Record<string, string> = {
  FAILED: 'The call could not be placed',
  BUSY: 'The lead was busy',
  NO_ANSWER: 'Nobody answered',
  CANCELLED: 'The call was cancelled',
};

// ─── Hero: the lead + the manual call control + live duration ────────────────────

function CallHero({
  lead, stage, seconds, status, onCall, onHangup, calling, hanging, needPhone, phone, setPhone, error,
}: {
  lead: any; stage: CallStage; seconds: number; status?: string;
  onCall: () => void; onHangup: () => void; calling: boolean; hanging: boolean;
  needPhone: boolean; phone: string; setPhone: (v: string) => void; error: string;
}) {
  const active = stage === 'ringing-agent' || stage === 'dialling-lead' || stage === 'live';
  const statusText =
    stage === 'ringing-agent' ? 'Ringing your mobile - pick up to connect'
    : stage === 'dialling-lead' ? `Connecting you to ${lead?.name ?? 'the lead'}…`
    : stage === 'live' ? 'Live conversation'
    : stage === 'ended' ? 'Call ended'
    : stage === 'failed' ? FAILED_TEXT[status ?? ''] ?? 'Call not connected'
    : 'Ready when you are';

  return (
    <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#3B0F7A] via-[#5B21B6] to-[#8B5CF6] p-6 text-white shadow-xl sm:p-8">
      <div className="pointer-events-none absolute -left-16 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 right-10 h-64 w-64 rounded-full bg-fuchsia-400/20 blur-3xl" />

      <div className="relative flex flex-wrap items-center justify-between gap-6">
        <div className="flex min-w-0 items-center gap-4">
          <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-xl font-bold ring-1 ring-white/25">
            {getInitials(lead?.name)}
          </span>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-widest text-violet-200">Now calling</p>
            <h2 className="truncate text-2xl font-bold">{lead?.name ?? '…'}</h2>
            <p className="truncate text-sm text-violet-200">
              {[lead?.jobTitle, lead?.company].filter(Boolean).join(' · ') || 'No company on file'}
            </p>
          </div>
        </div>

        {/* Live duration */}
        <div className="text-center sm:text-right">
          <div className="text-6xl font-bold tabular-nums tracking-tight sm:text-7xl">{clock(seconds)}</div>
          <div className="mt-1 flex items-center justify-center gap-2 text-sm text-violet-100 sm:justify-end">
            {stage === 'live' && <span className="relative flex h-2.5 w-2.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300 opacity-75" /><span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" /></span>}
            {(stage === 'ringing-agent' || stage === 'dialling-lead') && <Loader2 className="h-4 w-4 animate-spin" />}
            {statusText}
          </div>
        </div>
      </div>

      {/* The agent dials manually: this card is the only thing that places a call. */}
      <div className="relative mt-7 flex flex-wrap items-center gap-4 rounded-2xl bg-white/10 p-4 ring-1 ring-white/20 backdrop-blur">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-violet-200">Lead number</p>
          <p className="truncate text-2xl font-semibold tabular-nums">{lead?.phone ?? '-'}</p>
          {stage === 'none' && (
            <p className="mt-0.5 text-xs text-violet-200">We ring your mobile first, then connect the lead.</p>
          )}
        </div>

        {needPhone && stage === 'none' && (
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Your mobile, e.g. +919876543210"
            className="w-full rounded-xl border-0 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none ring-2 ring-white/40 focus:ring-white sm:w-64"
          />
        )}

        {active ? (
          <button
            onClick={onHangup}
            disabled={hanging}
            className="inline-flex items-center gap-2 rounded-full bg-rose-500 px-6 py-3 text-sm font-bold text-white shadow-lg transition hover:bg-rose-600 disabled:opacity-60"
          >
            <PhoneOff className="h-4 w-4" /> {hanging ? 'Ending…' : 'End call'}
          </button>
        ) : (
          <button
            onClick={onCall}
            disabled={calling || stage !== 'none'}
            className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-bold text-[#5B21B6] shadow-lg transition hover:scale-105 hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
          >
            {calling ? <Loader2 className="h-4 w-4 animate-spin" /> : <PhoneOutgoing className="h-4 w-4" />}
            {calling ? 'Calling your mobile…' : stage === 'none' ? 'Call now' : 'Call finished'}
          </button>
        )}
      </div>

      {error && <p className="relative mt-3 rounded-xl bg-rose-500/20 px-4 py-2.5 text-sm text-rose-50 ring-1 ring-rose-300/40">{error}</p>}
    </section>
  );
}

// ─── Dispose: mandatory before the next lead ────────────────────────────────────

function DisposePanel({
  callId, contactId, campaignId, elapsedSeconds, onDone,
}: { callId: string | null; contactId?: string; campaignId?: string | null; elapsedSeconds: number; onDone: () => void }) {
  const qc = useQueryClient();
  const [connected, setConnected] = useState<boolean | null>(null);
  const [reason, setReason] = useState('');
  const [stage, setStage] = useState(STAGES[0]);
  const [followUp, setFollowUp] = useState<string | null>(null);
  const [customDate, setCustomDate] = useState('');
  const [remark, setRemark] = useState('');
  const [error, setError] = useState('');
  const [reassign, setReassign] = useState(false);
  const [copyCampaign, setCopyCampaign] = useState(false);
  const [moveCampaign, setMoveCampaign] = useState(false);
  const [sendMsg, setSendMsg] = useState<'idle' | 'sent' | 'error'>('idle');
  const [formOpen, setFormOpen] = useState(true);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string | null>>({});
  const { data: engagementForm } = useEngagementForm(campaignId);

  const followUpAt = (() => {
    if (followUp === 'custom') return customDate ? new Date(customDate).toISOString() : undefined;
    const preset = FOLLOW_UPS.find((f) => f.key === followUp);
    return preset ? new Date(Date.now() + preset.ms).toISOString() : undefined;
  })();

  const valid = connected !== null && (connected || !!reason) && (followUp !== 'custom' || !!customDate);

  const sendMessage = useMutation({
    mutationFn: () => api.post('/api/v1/messages', { contactId, channel: 'WHATSAPP', body: 'Hi, we tried reaching you on call. Please call us back or reply here.' }),
    onSuccess: () => setSendMsg('sent'),
    onError: () => setSendMsg('error'),
  });

  // Re-assign / Copy / Move are shown to match the disposition screen but have no
  // backend action yet — nothing is wired to them beyond visually toggling.
  const submit = useMutation({
    mutationFn: () => {
      const body = {
        connected,
        reason: connected ? undefined : reason,
        remark: remark.trim() || undefined,
        followUpAt,
        stage: connected ? stage : undefined,
        engagementFormId: connected ? engagementForm?.id : undefined,
        answers: connected && Object.keys(answers).length ? answers : undefined,
      };
      return callId
        ? api.post(`/api/v1/calls/${callId}/outcome`, body)
        // No call was ever placed for this lead — dispose it directly.
        : api.post('/api/v1/calls/session/dispose', { contactId, ...body });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lead-views'] });
      onDone();
    },
    onError: (err) => setError(errorMessage(err, 'Could not save. Try again.')),
  });

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <p className="text-center text-xs font-semibold text-rose-500">
        Time elapsed <span className="ml-1 rounded bg-rose-50 px-1.5 py-0.5 tabular-nums">{clock(elapsedSeconds)}</span>
      </p>

      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <p className="mb-4 text-center text-sm font-semibold text-gray-900">Was call connected?</p>
        <div className="flex justify-center gap-4">
          <button
            type="button"
            onClick={() => { setConnected(false); setReason(''); }}
            className={cn(
              'rounded-full px-8 py-2.5 text-sm font-bold text-white shadow-sm transition',
              connected === false ? 'bg-rose-600' : 'bg-rose-400 hover:bg-rose-500',
            )}
          >
            Not Connected
          </button>
          <button
            type="button"
            onClick={() => setConnected(true)}
            className={cn(
              'rounded-full px-8 py-2.5 text-sm font-bold text-white shadow-sm transition',
              connected === true ? 'bg-emerald-700' : 'bg-emerald-500 hover:bg-emerald-600',
            )}
          >
            Yes Connected
          </button>
        </div>
      </div>

      {connected === false && (
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="mb-5 flex justify-center">
            <button
              type="button"
              onClick={() => sendMessage.mutate()}
              disabled={!contactId || sendMessage.isPending}
              className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-5 py-2 text-xs font-bold uppercase tracking-wide text-white shadow-sm transition hover:bg-emerald-600 disabled:opacity-60"
            >
              <MessageCircle className="h-4 w-4" /> {sendMessage.isPending ? 'Sending…' : 'Send Message'}
            </button>
          </div>
          {sendMsg === 'sent' && <p className="mb-4 text-center text-xs font-medium text-emerald-600">Notification sent successfully.</p>}
          {sendMsg === 'error' && <p className="mb-4 text-center text-xs font-medium text-rose-600">Could not send the message.</p>}

          <p className="mb-3 text-sm text-gray-800">
            Please specify the reason? <span className="text-rose-500">*</span>
          </p>
          <div className="space-y-2.5">
            {NOT_CONNECTED_REASONS.map((r) => (
              <label key={r.label} className="flex cursor-pointer items-center gap-2.5 text-sm text-gray-700">
                <span
                  onClick={() => setReason(r.label)}
                  className={cn(
                    'flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border-2 transition',
                    reason === r.label ? 'border-pink-600' : 'border-gray-300',
                  )}
                >
                  {reason === r.label && <span className="h-2.5 w-2.5 rounded-full bg-pink-600" />}
                </span>
                <span onClick={() => setReason(r.label)}>{r.label}</span>
                {r.retries != null && <span className="text-xs font-medium text-rose-500">(Retries left: {r.retries})</span>}
              </label>
            ))}
          </div>
        </div>
      )}

      {connected === true && (
        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
          <button
            type="button"
            onClick={() => setFormOpen((o) => !o)}
            className="flex w-full items-center gap-2 border-b border-gray-100 px-6 py-3.5 text-left text-sm font-semibold text-gray-800 hover:bg-gray-50"
          >
            <ClipboardList className="h-4 w-4 text-violet-500" />
            Engagement Form
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => { e.stopPropagation(); setBuilderOpen(true); }}
              className="ml-auto rounded-lg p-1.5 text-gray-400 hover:bg-violet-50 hover:text-violet-700"
              aria-label="Edit engagement form"
            >
              <Pencil className="h-3.5 w-3.5" />
            </span>
          </button>
          {formOpen && (
            <div className="space-y-5 p-6">
              {engagementForm ? (
                <EngagementFormFields form={engagementForm} contactId={contactId} answers={answers} onAnswers={setAnswers} />
              ) : (
                <p className="text-sm text-gray-400">
                  No engagement form set up yet for this campaign.{' '}
                  <button type="button" onClick={() => setBuilderOpen(true)} className="font-semibold text-violet-600 hover:underline">Create one</button>
                </p>
              )}

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">Stage <span className="text-rose-500">*</span></label>
                <select value={stage} onChange={(e) => setStage(e.target.value)} className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100">
                  {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
          )}

          <EngagementFormBuilderModal open={builderOpen} onClose={() => setBuilderOpen(false)} form={engagementForm} campaignId={campaignId ?? null} />
        </div>
      )}

      {connected !== null && (
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <p className="mb-3 text-sm font-semibold text-gray-900">Select next action:</p>
          <p className="mb-2 text-xs font-medium text-gray-500">Next follow-up in:</p>
          <div className="mb-4 flex flex-wrap gap-2">
            {[...FOLLOW_UPS, { key: 'custom', label: 'Pick date & time' }].map((f) => {
              const on = followUp === f.key;
              return (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setFollowUp(on ? null : f.key)}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition',
                    on ? 'border-violet-500 bg-white text-violet-700' : 'border-gray-200 bg-white text-gray-600 hover:border-violet-300',
                  )}
                >
                  {f.label}
                  {on && <X className="h-3 w-3" onClick={(e) => { e.stopPropagation(); setFollowUp(null); }} />}
                </button>
              );
            })}
          </div>
          {followUp === 'custom' && (
            <input
              type="datetime-local"
              value={customDate}
              onChange={(e) => setCustomDate(e.target.value)}
              className="mb-4 rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
            />
          )}

          <div className="mb-4 space-y-2.5">
            {[
              { v: reassign, set: setReassign, label: 'Re-assign this lead?' },
              { v: copyCampaign, set: setCopyCampaign, label: 'Copy lead to other campaign?' },
              { v: moveCampaign, set: setMoveCampaign, label: 'Move lead to other campaign?' },
            ].map((c) => (
              <label key={c.label} className="flex cursor-pointer items-center gap-2.5 text-sm text-gray-700">
                <span
                  onClick={() => c.set(!c.v)}
                  className={cn(
                    'flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded border-2 transition',
                    c.v ? 'border-[#5B21B6] bg-[#5B21B6]' : 'border-gray-300 bg-white',
                  )}
                >
                  {c.v && <svg viewBox="0 0 12 12" className="h-3 w-3 text-white"><path d="M2.5 6.2 5 8.7l4.5-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                </span>
                <span onClick={() => c.set(!c.v)}>{c.label}</span>
              </label>
            ))}
          </div>

          <p className="mb-1.5 text-xs font-medium text-gray-500">Dispose Remark</p>
          <div className="relative">
            <input
              value={remark}
              onChange={(e) => setRemark(e.target.value.slice(0, 1500))}
              placeholder="Enter remarks here"
              className="w-full rounded-xl border border-gray-200 py-2.5 pl-3.5 pr-10 text-sm outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
            />
            <Mic className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          </div>
          <p className="mt-1 text-right text-xs text-gray-400">{remark.length}/1500</p>
        </div>
      )}

      {error && <p className="rounded-xl bg-rose-50 px-4 py-2.5 text-sm text-rose-700">{error}</p>}

      <div className="flex justify-center pt-1">
        <button
          onClick={() => { setError(''); submit.mutate(); }}
          disabled={!valid || submit.isPending}
          className="rounded-full bg-[#5B21B6] px-10 py-3 text-sm font-bold text-white shadow-md transition hover:bg-violet-800 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {submit.isPending ? 'Saving…' : 'Submit'}
        </button>
      </div>
    </div>
  );
}

// ─── Lead detail tabs ───────────────────────────────────────────────────────────

const Row = ({ k, v }: { k: string; v?: React.ReactNode }) => (
  <div className="flex items-start justify-between gap-4 border-b border-gray-50 py-2.5 text-sm last:border-0">
    <dt className="text-gray-400">{k}</dt>
    <dd className="max-w-[60%] break-words text-right font-medium text-gray-800">{v || '-'}</dd>
  </div>
);

function InfoTab({ lead }: { lead: any }) {
  return (
    <div className="grid gap-5 md:grid-cols-2">
      <div className="rounded-2xl bg-gray-50/70 p-5">
        <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-500">About</h3>
        <dl>
          <Row k="Name" v={lead?.name} />
          <Row k="Mobile" v={lead?.phone} />
          <Row k="Email" v={lead?.email} />
          <Row k="Company" v={lead?.company} />
          <Row k="Job title" v={lead?.jobTitle} />
          <Row k="Created" v={lead?.createdAt && format(new Date(lead.createdAt), 'dd MMM yyyy, hh:mm a')} />
        </dl>
      </div>
      <div className="rounded-2xl bg-gray-50/70 p-5">
        <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-500">Lead progress</h3>
        <dl>
          <Row k="Status" v={lead?.status} />
          <Row k="Temperature" v={lead?.temperature} />
          <Row k="Score" v={lead?.score} />
          <Row k="Source" v={lead?.source} />
          <Row k="Assigned to" v={lead?.assignedTo && `${lead.assignedTo.firstName} ${lead.assignedTo.lastName}`} />
          <Row
            k="Tags"
            v={lead?.tags?.length ? (
              <span className="flex flex-wrap justify-end gap-1">
                {lead.tags.map((t: string) => <span key={t} className="rounded-full bg-violet-100 px-2 py-0.5 text-xs text-violet-700">{t}</span>)}
              </span>
            ) : undefined}
          />
        </dl>
      </div>
    </div>
  );
}

function ActivityTab({ lead }: { lead: any }) {
  const items: any[] = lead?.activities ?? [];
  if (!items.length) return <p className="py-10 text-center text-sm text-gray-400">No activity yet for this lead.</p>;
  return (
    <ol className="relative space-y-4 border-l-2 border-violet-100 pl-6">
      {items.map((a) => (
        <li key={a.id} className="relative">
          <span className="absolute -left-[31px] top-1 h-3 w-3 rounded-full border-2 border-white bg-violet-500" />
          <p className="text-sm font-semibold text-gray-800">{a.subject}</p>
          {a.body && <p className="text-sm text-gray-500">{a.body}</p>}
          <p className="text-xs text-gray-400">{format(new Date(a.occurredAt), 'dd MMM yyyy, hh:mm a')}</p>
        </li>
      ))}
    </ol>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────────

export default function CallingSessionPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const s = useCallSession();
  const { call, stage, seconds } = useSessionCall();
  const { data: presence } = usePresence();

  const [tab, setTab] = useState<Tab>('info');
  const [finished, setFinished] = useState(false);
  const [loadingNext, setLoadingNext] = useState(false);
  const [needPhone, setNeedPhone] = useState(false);
  const [phone, setPhone] = useState('');
  const [callError, setCallError] = useState('');

  const leadId = s.queue[s.index];
  const mustDispose = s.phase === 'disposing';
  const { data: lead } = useQuery<any>({
    queryKey: ['session-lead', leadId],
    queryFn: async () => (await api.get(`/api/v1/contacts/${leadId}`)).data.data,
    enabled: !!leadId,
  });

  // Landing here means the agent is back in the session.
  useEffect(() => { s.maximize(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // The moment a call ends the agent is taken to Dispose; a fresh lead starts on Lead info.
  useEffect(() => {
    if (s.phase === 'disposing') setTab('dispose');
    if (s.phase === 'idle') setTab('info');
  }, [s.phase, leadId]);

  const placeCall = useMutation({
    mutationFn: async () =>
      (await api.post('/api/v1/calls/session', { contactId: leadId, agentPhone: phone.trim() || undefined })).data.data,
    onSuccess: (c) => { setCallError(''); setNeedPhone(false); s.callPlaced(c.id); },
    onError: (err: any) => {
      const code = err?.response?.data?.error?.code;
      if (code === 'AGENT_PHONE_REQUIRED') setNeedPhone(true);
      setCallError(errorMessage(err, 'Could not place the call'));
    },
  });

  const hangup = useMutation({
    mutationFn: () => api.post(`/api/v1/calls/${s.callId}/hangup`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['session-call'] }),
    onError: (err) => setCallError(errorMessage(err, 'Could not end the call')),
  });

  const submitted = () => {
    const wasLast = s.index + 1 >= s.queue.length;
    setLoadingNext(true);
    setTimeout(() => {
      if (wasLast) setFinished(true);
      s.advance();
      setLoadingNext(false);
    }, 700);
  };

  if (presence?.status === 'BREAK') return <BreakBlock />;

  if (finished) {
    return (
      <div className="mx-auto mt-16 flex max-w-md flex-col items-center rounded-3xl bg-white p-10 text-center shadow-sm ring-1 ring-gray-200">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600"><PartyPopper className="h-8 w-8" /></span>
        <h1 className="mt-5 text-xl font-bold text-gray-900">Queue complete</h1>
        <p className="mt-1 text-sm text-gray-500">Every lead in this view has been called and disposed.</p>
        <Link href="/dashboard/contacts" className="mt-6 rounded-full bg-[#5B21B6] px-6 py-2.5 text-sm font-bold text-white hover:bg-violet-800">Back to lead views</Link>
      </div>
    );
  }

  if (!s.active || !leadId) {
    return (
      <div className="mx-auto mt-16 flex max-w-md flex-col items-center rounded-3xl bg-white p-10 text-center shadow-sm ring-1 ring-gray-200">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-violet-100 text-violet-600"><Phone className="h-8 w-8" /></span>
        <h1 className="mt-5 text-xl font-bold text-gray-900">No active calling session</h1>
        <p className="mt-1 text-sm text-gray-500">Pick a lead view and press Start calling.</p>
        <Link href="/dashboard/contacts" className="mt-6 rounded-full bg-[#5B21B6] px-6 py-2.5 text-sm font-bold text-white hover:bg-violet-800">Go to lead views</Link>
      </div>
    );
  }

  const total = s.queue.length;
  const percent = Math.round((s.index / total) * 100);

  const tabs: { key: Tab; label: string; locked?: boolean; alert?: boolean }[] = [
    { key: 'info', label: 'Lead information' },
    { key: 'dispose', label: 'Dispose lead', alert: mustDispose },
    { key: 'activity', label: 'Activity' },
  ];

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      {/* Queue rail */}
      <aside className="space-y-4 lg:sticky lg:top-0 lg:self-start">
        <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Calling from</p>
          <h2 className="mt-1 truncate text-lg font-bold text-[#5B21B6]">{s.viewName}</h2>

          <div className="mt-5 flex items-center gap-4">
            <div className="relative h-20 w-20 shrink-0 rounded-full" style={{ background: `conic-gradient(#7C3AED ${percent * 3.6}deg, #EDE9FE 0deg)` }}>
              <div className="absolute inset-[6px] flex items-center justify-center rounded-full bg-white text-sm font-bold text-gray-800">{percent}%</div>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">Lead {s.index + 1}<span className="text-base font-medium text-gray-400"> of {total}</span></p>
              <p className="text-xs text-gray-500">{s.index} done · {total - s.index - 1} to go</p>
            </div>
          </div>
        </div>

        <div className="rounded-3xl bg-amber-50 p-5 text-sm text-amber-900 ring-1 ring-amber-200">
          <p className="flex items-center gap-2 font-bold"><ShieldAlert className="h-4 w-4" /> Manual dialling</p>
          <p className="mt-1 text-xs leading-relaxed text-amber-800">
            Nothing is dialled for you. Call each lead yourself, then record the outcome whenever you're ready - disposing never blocks your next call.
          </p>
        </div>

        {/* No End Session mid-queue - the queue keeps going lead to lead until it's done.
            Minimize steps away without losing your place; Take a Break (header) is the
            only thing that pauses the session for you. */}
        <button
          onClick={() => { s.minimize(); router.push('/dashboard/contacts'); }}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 ring-1 ring-gray-200 transition hover:bg-gray-50"
        >
          <Minus className="h-4 w-4" /> Minimize
        </button>
      </aside>

      {/* Main */}
      <div className="min-w-0 space-y-5">
        <CallHero
          lead={lead}
          stage={stage}
          seconds={seconds}
          status={call?.status}
          onCall={() => { setCallError(''); placeCall.mutate(); }}
          onHangup={() => hangup.mutate()}
          calling={placeCall.isPending}
          hanging={hangup.isPending}
          needPhone={needPhone}
          phone={phone}
          setPhone={setPhone}
          error={callError}
        />

        <div className="relative rounded-3xl bg-white p-2 shadow-sm ring-1 ring-gray-200 sm:p-3">
          <nav className="flex gap-1 rounded-2xl bg-gray-100 p-1" role="tablist">
            {tabs.map((t) => (
              <button
                key={t.key}
                role="tab"
                aria-selected={tab === t.key}
                onClick={() => !t.locked && setTab(t.key)}
                disabled={t.locked}
                className={cn(
                  'relative flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition',
                  tab === t.key ? 'bg-white text-[#5B21B6] shadow-sm' : 'text-gray-500 hover:text-gray-800',
                  t.locked && 'cursor-not-allowed opacity-50 hover:text-gray-500',
                )}
              >
                {t.locked && <Lock className="h-3.5 w-3.5" />}
                {t.label}
                {t.alert && <span className="absolute right-2 top-2 h-2 w-2 animate-pulse rounded-full bg-rose-500" />}
              </button>
            ))}
          </nav>

          <div className="p-4 sm:p-5">
            {loadingNext ? (
              <div className="flex flex-col items-center gap-3 py-16 text-gray-500">
                <Loader2 className="h-7 w-7 animate-spin text-violet-600" />
                <p className="text-sm font-medium">Loading next lead…</p>
              </div>
            ) : tab === 'info' ? (
              <InfoTab lead={lead} />
            ) : tab === 'activity' ? (
              <ActivityTab lead={lead} />
            ) : (
              // No call is required first — a lead can be disposed on its own at any time.
              <DisposePanel key={s.callId ?? leadId} callId={s.callId} contactId={leadId} campaignId={lead?.campaignId ?? null} elapsedSeconds={seconds} onDone={submitted} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
