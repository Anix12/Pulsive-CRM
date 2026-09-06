'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, PhoneCall, Users, Layers, Tag, Radio, Link2, Copy, Check, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { getInitials, categoryColor, cn } from '@/lib/utils';
import { AvatarStack } from '@/components/ui/AvatarStack';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

function webhookUrlFor(token: string) {
  return `${API_BASE}/api/v1/webhooks/integrate/${token}/leads`;
}

const statusColors: Record<string, string> = {
  LEAD: 'bg-blue-50 text-blue-700',
  PROSPECT: 'bg-purple-50 text-purple-700',
  CUSTOMER: 'bg-green-50 text-green-700',
  CHURNED: 'bg-gray-100 text-gray-600',
  BLOCKED: 'bg-red-50 text-red-700',
};

const campaignStatusPill: Record<string, string> = {
  ACTIVE: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100',
  PAUSED: 'bg-amber-50 text-amber-700 ring-1 ring-amber-100',
  COMPLETED: 'bg-gray-100 text-gray-500 ring-1 ring-gray-200',
};

const prettyEnum = (v?: string | null) =>
  v ? v.charAt(0) + v.slice(1).toLowerCase().replace(/_/g, ' ') : '—';

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
      <p className="text-xl font-bold" style={{ color }}>{value}</p>
      <p className="mt-0.5 text-xs text-gray-500">{label}</p>
    </div>
  );
}

// ── Lead Capture Link ─────────────────────────────────────────────────────────
// Lets a business point any external form (a landing page, a Facebook lead form,
// etc.) straight at this one campaign — the form just posts its normal fields
// (name, phone, email, ...) to this URL, nothing campaign-specific required.
function LeadCaptureLinkCard({ campaignId, token }: { campaignId: string; token: string | null }) {
  const qc = useQueryClient();
  const [copied, setCopied] = useState(false);

  const generate = useMutation({
    mutationFn: () => api.post(`/api/v1/campaigns/${campaignId}/webhook-token`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['campaign', campaignId] }),
  });

  const url = token ? webhookUrlFor(token) : null;

  const copy = async () => {
    if (!url) return;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
      <h2 className="flex items-center gap-1.5 text-sm font-semibold text-gray-700">
        <Link2 className="h-4 w-4 text-gray-400" />
        Lead Capture Link
      </h2>
      <p className="mt-1 text-xs text-gray-400">
        Point any website form or ad-lead form at this URL — new leads land straight in this campaign.
      </p>

      {url ? (
        <>
          <div className="mt-3 flex items-center gap-2">
            <input
              readOnly
              value={url}
              onFocus={(e) => e.target.select()}
              className="min-w-0 flex-1 truncate rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600"
            />
            <button
              onClick={copy}
              title="Copy link"
              className="flex shrink-0 items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          </div>
          <button
            onClick={() => generate.mutate()}
            disabled={generate.isPending}
            className="mt-2 flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 disabled:opacity-50"
          >
            <RefreshCw className="h-3 w-3" />
            {generate.isPending ? 'Regenerating…' : 'Regenerate link'}
          </button>
          <p className="mt-1 text-[11px] text-gray-400">Regenerating invalidates the old link immediately.</p>
        </>
      ) : (
        <button
          onClick={() => generate.mutate()}
          disabled={generate.isPending}
          className="mt-3 flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50"
        >
          <Link2 className="h-3.5 w-3.5" />
          {generate.isPending ? 'Generating…' : 'Generate Lead Link'}
        </button>
      )}
    </div>
  );
}

export default function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const { data: campaign, isLoading } = useQuery({
    queryKey: ['campaign', id],
    queryFn: async () => { const { data } = await api.get(`/api/v1/campaigns/${id}`); return data.data; },
  });

  if (isLoading) return <div className="flex h-64 items-center justify-center text-gray-500">Loading…</div>;
  if (!campaign) return <div className="text-gray-500">Campaign not found.</div>;

  const stats = campaign.stats ?? { total: 0, new: 0, calls: 0, converted: 0, conversionPct: 0 };
  const color = categoryColor(campaign.category);
  const assignees = Array.from(
    new Map(
      (campaign.contacts ?? [])
        .filter((c: any) => c.assignedTo)
        .map((c: any) => [c.assignedTo.id, c.assignedTo]),
    ).values(),
  ) as { id: string; firstName: string; lastName?: string | null }[];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
          <div>
            <h1 className="text-xl font-bold text-gray-900">{campaign.name}</h1>
            <p className="text-xs text-gray-400">{campaign.pipeline?.name ?? 'No pipeline'}{campaign.source ? ` · via ${campaign.source}` : ''}</p>
          </div>
          <span className={cn('inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold', campaignStatusPill[campaign.status])}>
            {prettyEnum(campaign.status)}
          </span>
        </div>
        <button
          onClick={() => router.push(`/dashboard/calls?campaignId=${campaign.id}`)}
          className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-500"
        >
          <PhoneCall className="h-3.5 w-3.5" />
          Open Dialer
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Total Leads" value={stats.total} color="#111827" />
        <StatCard label="New" value={stats.new} color="#4f46e5" />
        <StatCard label="Calls" value={stats.calls} color="#d97706" />
        <StatCard label="Converted" value={stats.converted} color="#059669" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-1">
          <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
            <h2 className="text-sm font-semibold text-gray-700">Campaign Settings</h2>
            <div className="mt-3 space-y-3 text-sm">
              <div className="flex items-center gap-2 text-gray-600">
                <Tag className="h-4 w-4 text-gray-400" />
                {campaign.category || 'Uncategorized'}
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <Layers className="h-4 w-4 text-gray-400" />
                Priority: {prettyEnum(campaign.priority)}
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <Radio className="h-4 w-4 text-gray-400" />
                Duplicate check: {prettyEnum(campaign.duplicateCheck)}
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <Users className="h-4 w-4 text-gray-400" />
                Assignment: {prettyEnum(campaign.assignmentRule)}
              </div>
            </div>
          </div>

          <LeadCaptureLinkCard campaignId={campaign.id} token={campaign.leadWebhookToken} />

          <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
            <h2 className="text-sm font-semibold text-gray-700">Assigned Team</h2>
            <div className="mt-3">
              {assignees.length > 0 ? (
                <AvatarStack people={assignees} max={8} />
              ) : (
                <p className="text-sm text-gray-400">No leads assigned yet.</p>
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="rounded-xl bg-white shadow-sm ring-1 ring-gray-100">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
              <h2 className="text-sm font-semibold text-gray-700">Leads in this campaign</h2>
              <Link href={`/dashboard/contacts?campaignId=${campaign.id}`} className="text-xs font-medium text-indigo-600 hover:underline">
                View all in Leads
              </Link>
            </div>
            {(campaign.contacts ?? []).length === 0 ? (
              <div className="flex h-40 items-center justify-center text-sm text-gray-400">No leads yet.</div>
            ) : (
              <ul className="divide-y divide-gray-50">
                {campaign.contacts.map((c: any) => (
                  <li key={c.id}>
                    <Link href={`/dashboard/contacts/${c.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700">
                        {getInitials(c.name)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-gray-900">{c.name}</p>
                        <p className="truncate text-xs text-gray-400">{c.phone}</p>
                      </div>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${statusColors[c.status] || ''}`}>
                        {c.status}
                      </span>
                      <span className="w-14 shrink-0 text-right text-xs text-gray-400">{format(new Date(c.createdAt), 'dd MMM')}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
