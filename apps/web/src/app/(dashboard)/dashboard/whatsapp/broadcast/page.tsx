'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, History, Plus, Lock, MessageCircle, ArrowRight, ArrowLeft,
  CheckCircle2, XCircle, Clock, Send, FileText, RotateCw,
} from 'lucide-react';

const inputCls =
  'block w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm transition placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20';

const STATUS_OPTIONS = ['LEAD', 'PROSPECT', 'CUSTOMER', 'CHURNED', 'BLOCKED'] as const;
const statusLabel: Record<string, string> = {
  LEAD: 'Lead', PROSPECT: 'Prospect', CUSTOMER: 'Customer', CHURNED: 'Churned', BLOCKED: 'Blocked',
};

const broadcastStatusPill: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-500 ring-gray-200',
  QUEUED: 'bg-amber-50 text-amber-700 ring-amber-200',
  SENDING: 'bg-blue-50 text-blue-700 ring-blue-200',
  COMPLETED: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  FAILED: 'bg-red-50 text-red-700 ring-red-200',
};

interface AudienceFilter {
  audienceSource: 'CAMPAIGN' | 'STATUS' | 'ALL';
  campaignId?: string;
  statusFilter?: string;
}

// ── Locked "Meta connection health" row — honest placeholder until Graph API is wired up ──
function MetaHealthRow({ connected }: { connected: boolean }) {
  const cards = [
    { label: 'Daily Meta messaging limit', hint: 'Unique contacts messaged today' },
    { label: 'Consecutive days of messaging', hint: 'Meta rewards consistent senders' },
    { label: 'Messaging quality', hint: 'Meta account health rating' },
  ];
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {cards.map((c) => (
        <div key={c.label} className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
          <div className="flex items-center gap-2">
            <Lock className="h-3.5 w-3.5 text-gray-300" />
            <p className="text-sm font-medium text-gray-500">{c.label}</p>
          </div>
          <p className="mt-2 text-xs text-gray-400">
            {connected
              ? 'Not available yet — needs Meta Graph API account-health integration.'
              : 'Connect your WhatsApp Business API to unlock this.'}
          </p>
        </div>
      ))}
    </div>
  );
}

function StatTile({ label, value, icon: Icon, color }: { label: string; value: number; icon: any; color: string }) {
  return (
    <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
      <div className="flex items-center justify-between">
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <Icon className="h-4 w-4" style={{ color }} />
      </div>
      <p className="mt-1 text-xs text-gray-400">{label}</p>
    </div>
  );
}

function BroadcastRow({ b }: { b: any }) {
  const stats = b.stats ?? {};
  return (
    <div className="flex items-center justify-between gap-4 border-b border-gray-50 px-5 py-3.5 last:border-0">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-gray-900">{b.name}</p>
        <p className="mt-0.5 truncate text-xs text-gray-400">
          {b.template?.name ?? 'No template'} · {b.audienceCount.toLocaleString()} leads
          {b.campaign ? ` · ${b.campaign.name}` : b.statusFilter ? ` · ${statusLabel[b.statusFilter]}` : ''}
        </p>
      </div>
      <div className="hidden shrink-0 items-center gap-3 text-xs text-gray-500 sm:flex">
        <span>{stats.SENT ?? 0} sent</span>
        <span>{stats.FAILED ?? 0} failed</span>
      </div>
      <span className={cn('shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1', broadcastStatusPill[b.status])}>
        {b.status}
      </span>
    </div>
  );
}

// ── Overview tab ──────────────────────────────────────────────────────────────
function OverviewTab() {
  const { data: tenant } = useQuery({
    queryKey: ['tenant-me'],
    queryFn: async () => { const { data } = await api.get('/api/v1/tenants/me'); return data.data; },
  });
  const { data, isLoading } = useQuery({
    queryKey: ['broadcasts-overview'],
    queryFn: async () => { const { data } = await api.get('/api/v1/broadcasts/overview'); return data.data; },
  });

  const isConnected = !!tenant?.whatsappPhoneNumberId;
  const stats = data?.stats ?? { SENT: 0, DELIVERED: 0, READ: 0, REPLIED: 0, FAILED: 0 };

  return (
    <div className="space-y-5">
      {!isConnected && (
        <div className="flex items-center justify-between rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800 ring-1 ring-amber-200">
          <span>WhatsApp Business API isn&apos;t connected yet — broadcasts you create will be saved but won&apos;t send until you connect it.</span>
          <Link href="/dashboard/whatsapp/settings" className="shrink-0 font-semibold text-amber-900 hover:underline">
            Connect now →
          </Link>
        </div>
      )}

      <MetaHealthRow connected={isConnected} />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        <StatTile label="Sent" value={stats.SENT} icon={CheckCircle2} color="#4f46e5" />
        <StatTile label="Delivered" value={stats.DELIVERED} icon={CheckCircle2} color="#059669" />
        <StatTile label="Read" value={stats.READ} icon={CheckCircle2} color="#0ea5e9" />
        <StatTile label="Replied" value={stats.REPLIED} icon={RotateCw} color="#7c3aed" />
        <StatTile label="Failed" value={stats.FAILED} icon={XCircle} color="#dc2626" />
      </div>

      <div className="rounded-xl bg-white shadow-sm ring-1 ring-gray-100">
        <div className="border-b border-gray-100 px-5 py-3">
          <p className="text-sm font-semibold text-gray-700">Recent broadcasts</p>
        </div>
        {isLoading ? (
          <div className="h-32 animate-pulse" />
        ) : (data?.recentBroadcasts ?? []).length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-14 text-center">
            <MessageCircle className="h-8 w-8 text-gray-200" />
            <p className="text-sm text-gray-500">No broadcasts yet</p>
            <p className="text-xs text-gray-400">Create your first campaign to start messaging leads</p>
          </div>
        ) : (
          <div>{data.recentBroadcasts.map((b: any) => <BroadcastRow key={b.id} b={b} />)}</div>
        )}
      </div>
    </div>
  );
}

// ── Past broadcasts tab ───────────────────────────────────────────────────────
function PastBroadcastsTab() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['broadcasts-list'],
    queryFn: async () => { const { data } = await api.get('/api/v1/broadcasts', { params: { limit: 50 } }); return data.data; },
  });

  const resend = useMutation({
    mutationFn: (id: string) => api.post(`/api/v1/broadcasts/${id}/resend`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['broadcasts-list'] });
      qc.invalidateQueries({ queryKey: ['broadcasts-overview'] });
    },
  });

  const broadcasts: any[] = data ?? [];

  return (
    <div className="rounded-xl bg-white shadow-sm ring-1 ring-gray-100">
      {isLoading ? (
        <div className="h-40 animate-pulse" />
      ) : broadcasts.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
          <History className="h-8 w-8 text-gray-200" />
          <p className="text-sm text-gray-500">No past broadcasts yet</p>
        </div>
      ) : (
        broadcasts.map((b) => (
          <div key={b.id} className="flex items-center gap-3 border-b border-gray-50 px-5 py-3.5 last:border-0">
            <div className="min-w-0 flex-1">
              <BroadcastRow b={b} />
              {b.status === 'FAILED' && b.failureReason && (
                <p className="mt-1 pl-0 text-xs text-red-500">{b.failureReason}</p>
              )}
            </div>
            {b.status === 'FAILED' && (
              <button
                onClick={() => resend.mutate(b.id)}
                disabled={resend.isPending}
                className="shrink-0 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
              >
                Retry
              </button>
            )}
          </div>
        ))
      )}
    </div>
  );
}

// ── New broadcast wizard ──────────────────────────────────────────────────────
function NewBroadcastWizard({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [filter, setFilter] = useState<AudienceFilter>({ audienceSource: 'CAMPAIGN' });
  const [templateId, setTemplateId] = useState('');
  const [result, setResult] = useState<any>(null);

  const { data: campaigns } = useQuery({
    queryKey: ['campaigns-for-broadcast'],
    queryFn: async () => { const { data } = await api.get('/api/v1/campaigns', { params: { limit: 100 } }); return data.data; },
  });

  const { data: templates } = useQuery({
    queryKey: ['whatsapp-templates'],
    queryFn: async () => { const { data } = await api.get('/api/v1/messages/templates'); return data.data; },
  });
  const whatsappTemplates = useMemo(() => (templates ?? []).filter((t: any) => t.channel === 'WHATSAPP'), [templates]);
  const selectedTemplate = whatsappTemplates.find((t: any) => t.id === templateId);

  const { data: preview, isFetching: previewLoading } = useQuery({
    queryKey: ['audience-preview', filter],
    queryFn: async () => {
      const { data } = await api.post('/api/v1/broadcasts/preview-audience', filter);
      return data.data as { total: number; byStatus: { status: string; count: number }[] };
    },
    enabled: filter.audienceSource === 'ALL' || (filter.audienceSource === 'CAMPAIGN' && !!filter.campaignId) || (filter.audienceSource === 'STATUS' && !!filter.statusFilter),
  });

  const send = useMutation({
    mutationFn: () => api.post('/api/v1/broadcasts', { name, templateId, ...filter }),
    onSuccess: ({ data }) => {
      setResult(data.data);
      qc.invalidateQueries({ queryKey: ['broadcasts-overview'] });
      qc.invalidateQueries({ queryKey: ['broadcasts-list'] });
    },
  });

  const steps = [
    { n: 1, label: 'Select audience' },
    { n: 2, label: 'Choose template' },
    { n: 3, label: 'Review & send' },
  ];

  const canProceedStep1 = name.trim().length > 0 && !!preview && preview.total > 0;
  const canProceedStep2 = !!templateId;

  if (result) {
    const isConfigured = result.status === 'COMPLETED';
    return (
      <div className="rounded-xl bg-white p-8 text-center shadow-sm ring-1 ring-gray-100">
        <div className={cn('mx-auto flex h-12 w-12 items-center justify-center rounded-full', isConfigured ? 'bg-emerald-50' : 'bg-amber-50')}>
          {isConfigured ? <CheckCircle2 className="h-6 w-6 text-emerald-600" /> : <Lock className="h-6 w-6 text-amber-600" />}
        </div>
        <h3 className="mt-4 text-base font-semibold text-gray-900">
          {isConfigured ? 'Broadcast sent' : 'Broadcast saved — not sent yet'}
        </h3>
        <p className="mx-auto mt-1 max-w-sm text-sm text-gray-500">
          {isConfigured
            ? `Sent to ${result.audienceCount} leads. Check Past broadcasts for delivery stats.`
            : result.failureReason}
        </p>
        {!isConfigured && (
          <Link href="/dashboard/whatsapp/settings" className="mt-3 inline-block text-sm font-semibold text-indigo-600 hover:underline">
            Connect WhatsApp Business API →
          </Link>
        )}
        <div className="mt-6">
          <button onClick={onClose} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500">
            Done
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-3">
        {steps.map((s) => (
          <div
            key={s.n}
            className={cn(
              'rounded-lg px-4 py-3 text-center ring-1',
              step === s.n ? 'bg-indigo-50 text-indigo-700 ring-indigo-200' : 'bg-white text-gray-400 ring-gray-100',
            )}
          >
            <p className="text-sm font-semibold">{s.n}</p>
            <p className="text-xs">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Campaign name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. JSPM MBA Aug Reminder" className={cn(inputCls, 'mt-1')} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Audience source</label>
              <select
                value={filter.audienceSource}
                onChange={(e) => setFilter({ audienceSource: e.target.value as AudienceFilter['audienceSource'] })}
                className={cn(inputCls, 'mt-1')}
              >
                <option value="CAMPAIGN">By campaign</option>
                <option value="STATUS">By lead status</option>
                <option value="ALL">All leads</option>
              </select>
            </div>
            {filter.audienceSource === 'CAMPAIGN' && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Select campaign</label>
                <select
                  value={filter.campaignId ?? ''}
                  onChange={(e) => setFilter((f) => ({ ...f, campaignId: e.target.value || undefined }))}
                  className={cn(inputCls, 'mt-1')}
                >
                  <option value="">Choose a campaign…</option>
                  {(campaigns ?? []).map((c: any) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            )}
            {filter.audienceSource === 'STATUS' && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Filter by status</label>
                <select
                  value={filter.statusFilter ?? ''}
                  onChange={(e) => setFilter((f) => ({ ...f, statusFilter: e.target.value || undefined }))}
                  className={cn(inputCls, 'mt-1')}
                >
                  <option value="">Choose a status…</option>
                  {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{statusLabel[s]}</option>)}
                </select>
              </div>
            )}

            <div className="rounded-lg bg-gray-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Audience preview</p>
              {previewLoading ? (
                <p className="mt-1 text-sm text-gray-400">Calculating…</p>
              ) : preview ? (
                <>
                  <p className="mt-1 text-2xl font-bold text-gray-900">{preview.total.toLocaleString()} leads</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {preview.byStatus.map((s) => (
                      <span key={s.status} className="rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-700">
                        {statusLabel[s.status]}: {s.count}
                      </span>
                    ))}
                  </div>
                </>
              ) : (
                <p className="mt-1 text-sm text-gray-400">Select an audience source to preview leads.</p>
              )}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3">
            <p className="text-sm font-medium text-gray-700">Choose a WhatsApp template</p>
            {whatsappTemplates.length === 0 ? (
              <div className="flex flex-col items-center gap-2 rounded-lg bg-gray-50 py-10 text-center">
                <FileText className="h-6 w-6 text-gray-300" />
                <p className="text-sm text-gray-500">No WhatsApp templates yet.</p>
                <Link href="/dashboard/templates" className="text-sm font-medium text-indigo-600 hover:underline">
                  Create one in Templates →
                </Link>
              </div>
            ) : (
              <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                {whatsappTemplates.map((t: any) => (
                  <button
                    key={t.id}
                    onClick={() => setTemplateId(t.id)}
                    className={cn(
                      'block w-full rounded-lg border p-3 text-left transition',
                      templateId === t.id ? 'border-indigo-400 bg-indigo-50' : 'border-gray-200 hover:bg-gray-50',
                    )}
                  >
                    <p className="text-sm font-semibold text-gray-900">{t.name}</p>
                    <p className="mt-0.5 line-clamp-2 text-xs text-gray-500">{t.body}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <p className="text-sm font-medium text-gray-700">Review & send</p>
            <div className="space-y-3 rounded-lg bg-gray-50 p-4 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Campaign name</span><span className="font-medium text-gray-900">{name}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Audience</span><span className="font-medium text-gray-900">{preview?.total ?? 0} leads</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Template</span><span className="font-medium text-gray-900">{selectedTemplate?.name}</span></div>
              <div className="border-t border-gray-200 pt-3">
                <p className="text-xs text-gray-400">Message preview</p>
                <p className="mt-1 whitespace-pre-wrap text-gray-700">{selectedTemplate?.body}</p>
              </div>
            </div>
            {send.isError && <p className="text-sm text-red-500">Something went wrong creating the broadcast.</p>}
          </div>
        )}

        <div className="mt-6 flex items-center justify-between border-t border-gray-100 pt-4">
          <button
            onClick={() => (step === 1 ? onClose() : setStep((s) => s - 1))}
            className="flex items-center gap-1 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {step === 1 ? 'Cancel' : 'Back'}
          </button>
          {step < 3 ? (
            <button
              onClick={() => setStep((s) => s + 1)}
              disabled={step === 1 ? !canProceedStep1 : !canProceedStep2}
              className="flex items-center gap-1 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-40"
            >
              Next: {step === 1 ? 'choose template' : 'review & send'}
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          ) : (
            <button
              onClick={() => send.mutate()}
              disabled={send.isPending}
              className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
            >
              <Send className="h-3.5 w-3.5" />
              {send.isPending ? 'Sending…' : 'Send Broadcast'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────
export default function BroadcastPage() {
  const [tab, setTab] = useState<'overview' | 'past'>('overview');
  const [wizardOpen, setWizardOpen] = useState(false);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Broadcast</h1>
        <p className="text-sm text-gray-500">Send WhatsApp campaigns to your leads</p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-xl bg-gray-100/80 p-1">
          <button
            onClick={() => { setTab('overview'); setWizardOpen(false); }}
            className={cn('flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-sm font-medium transition', tab === 'overview' && !wizardOpen ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700')}
          >
            <LayoutDashboard className="h-3.5 w-3.5" />
            Campaign overview
          </button>
          <button
            onClick={() => { setTab('past'); setWizardOpen(false); }}
            className={cn('flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-sm font-medium transition', tab === 'past' && !wizardOpen ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700')}
          >
            <History className="h-3.5 w-3.5" />
            Past broadcasts
          </button>
        </div>
        <button
          onClick={() => setWizardOpen(true)}
          className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-500"
        >
          <Plus className="h-3.5 w-3.5" />
          New campaign
        </button>
      </div>

      {wizardOpen ? (
        <NewBroadcastWizard onClose={() => setWizardOpen(false)} />
      ) : tab === 'overview' ? (
        <OverviewTab />
      ) : (
        <PastBroadcastsTab />
      )}
    </div>
  );
}
