'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Fragment, useState } from 'react';
import { Plus, Upload, Users, Send, Trash2, MessageSquare, Mail, Smartphone } from 'lucide-react';
import { format } from 'date-fns';
import { Modal } from '@/components/ui/Modal';
import { CsvImportModal } from '@/components/ui/CsvImportModal';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { cn } from '@/lib/utils';

type MarketingTab = 'lists' | 'campaigns';

const CHANNEL_OPTIONS = ['SMS', 'WHATSAPP', 'EMAIL'] as const;
const channelConfig: Record<string, { label: string; pill: string; icon: typeof Send }> = {
  SMS:      { label: 'SMS',      pill: 'bg-blue-50 text-blue-700 ring-1 ring-blue-100',       icon: Smartphone },
  WHATSAPP: { label: 'WhatsApp', pill: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100', icon: MessageSquare },
  EMAIL:    { label: 'Email',    pill: 'bg-violet-50 text-violet-700 ring-1 ring-violet-100',   icon: Mail },
};

const CAMPAIGN_STATUS_OPTIONS = ['DRAFT', 'SCHEDULED', 'SENT'] as const;
const campaignStatusConfig: Record<string, { label: string; pill: string }> = {
  DRAFT:     { label: 'Draft',     pill: 'bg-gray-100 text-gray-500 ring-1 ring-gray-200' },
  SCHEDULED: { label: 'Scheduled', pill: 'bg-amber-50 text-amber-700 ring-1 ring-amber-100' },
  SENT:      { label: 'Sent',      pill: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100' },
};

const inputCls =
  'block w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm transition placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20';

function Field({ label, error, required, children }: { label: string; error?: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="ml-0.5 text-red-400">*</span>}
      </label>
      <div className="mt-1">{children}</div>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

// ── New List Modal (name + tags, then hands off to CSV upload) ──────────────
const listSchema = z.object({
  name: z.string().min(1, 'Required'),
  tags: z.string().optional(),
});
type ListForm = z.infer<typeof listSchema>;

function NewListModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (listId: string) => void;
}) {
  const qc = useQueryClient();
  const { register, handleSubmit, reset, formState: { errors } } = useForm<ListForm>({
    resolver: zodResolver(listSchema),
  });

  const create = useMutation({
    mutationFn: (data: ListForm) =>
      api.post('/api/v1/marketing/lists', {
        name: data.name,
        tags: data.tags ? data.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
      }),
    onSuccess: ({ data }) => {
      qc.invalidateQueries({ queryKey: ['marketing-lists'] });
      reset();
      onClose();
      onCreated(data.data.id);
    },
  });

  return (
    <Modal open={open} onClose={onClose} title="New Marketing List">
      <form onSubmit={handleSubmit((d) => create.mutate(d))} className="space-y-4">
        <Field label="List Name" required error={errors.name?.message}>
          <input {...register('name')} className={inputCls} placeholder="e.g. Diwali Promo — Warm Leads" />
        </Field>
        <Field label="Tags">
          <input {...register('tags')} className={inputCls} placeholder="comma separated, e.g. vip, north-region" />
        </Field>
        {create.isError && <p className="text-sm text-red-500">Failed to create list.</p>}
        <div className="flex justify-end gap-3 pt-1">
          <button type="button" onClick={onClose} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">
            Cancel
          </button>
          <button type="submit" disabled={create.isPending} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50">
            {create.isPending ? 'Creating…' : 'Create & Upload Contacts'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ── New Marketing Campaign Modal ─────────────────────────────────────────────
const campaignSchema = z.object({
  name: z.string().min(1, 'Required'),
  listId: z.string().min(1, 'Required'),
  channel: z.enum(CHANNEL_OPTIONS),
  scheduledAt: z.string().optional(),
});
type CampaignForm = z.infer<typeof campaignSchema>;

function NewCampaignModal({ open, onClose, lists }: { open: boolean; onClose: () => void; lists: any[] }) {
  const qc = useQueryClient();
  const { register, handleSubmit, reset, formState: { errors } } = useForm<CampaignForm>({
    resolver: zodResolver(campaignSchema),
    defaultValues: { channel: 'SMS' },
  });

  const create = useMutation({
    mutationFn: (data: CampaignForm) =>
      api.post('/api/v1/marketing/campaigns', {
        name: data.name,
        listId: data.listId,
        channel: data.channel,
        scheduledAt: data.scheduledAt || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['marketing-campaigns'] });
      reset();
      onClose();
    },
  });

  return (
    <Modal open={open} onClose={onClose} title="New Marketing Campaign">
      <form onSubmit={handleSubmit((d) => create.mutate(d))} className="space-y-4">
        <Field label="Campaign Name" required error={errors.name?.message}>
          <input {...register('name')} className={inputCls} placeholder="e.g. August Fee Reminder Blast" />
        </Field>
        <Field label="Marketing List" required error={errors.listId?.message}>
          <select {...register('listId')} className={inputCls}>
            <option value="">Select list…</option>
            {lists.map((l) => (
              <option key={l.id} value={l.id}>{l.name} ({l._count?.members ?? 0})</option>
            ))}
          </select>
        </Field>
        <Field label="Channel" required>
          <select {...register('channel')} className={inputCls}>
            {CHANNEL_OPTIONS.map((c) => (
              <option key={c} value={c}>{channelConfig[c].label}</option>
            ))}
          </select>
        </Field>
        <Field label="Scheduled For (optional)">
          <input {...register('scheduledAt')} type="datetime-local" className={inputCls} />
        </Field>

        {create.isError && <p className="text-sm text-red-500">Failed to create campaign.</p>}

        <div className="flex justify-end gap-3 pt-1">
          <button type="button" onClick={onClose} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">
            Cancel
          </button>
          <button type="submit" disabled={create.isPending} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50">
            {create.isPending ? 'Creating…' : 'Create Campaign'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ── Lists Tab ─────────────────────────────────────────────────────────────────
function ListsTab() {
  const qc = useQueryClient();
  const [tagFilter, setTagFilter] = useState('');
  const [newListOpen, setNewListOpen] = useState(false);
  const [uploadListId, setUploadListId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['marketing-lists', tagFilter],
    queryFn: async () => {
      const { data } = await api.get('/api/v1/marketing/lists', {
        params: { tag: tagFilter || undefined, limit: 100 },
      });
      return data;
    },
  });

  const { data: detail } = useQuery({
    queryKey: ['marketing-list', expandedId],
    queryFn: async () => {
      const { data } = await api.get(`/api/v1/marketing/lists/${expandedId}`);
      return data.data;
    },
    enabled: !!expandedId,
  });

  const lists: any[] = data?.data ?? [];
  const allTags = Array.from(new Set(lists.flatMap((l) => l.tags || []))) as string[];

  const removeList = useMutation({
    mutationFn: (id: string) => api.delete(`/api/v1/marketing/lists/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['marketing-lists'] }); setDeleteId(null); },
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setTagFilter('')}
            className={cn(
              'rounded-lg border px-3 py-1.5 text-xs font-medium transition',
              tagFilter === '' ? 'border-indigo-200 bg-indigo-50 text-indigo-700' : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50',
            )}
          >
            All tags
          </button>
          {allTags.map((t) => (
            <button
              key={t}
              onClick={() => setTagFilter(tagFilter === t ? '' : t)}
              className={cn(
                'rounded-lg border px-3 py-1.5 text-xs font-medium transition',
                tagFilter === t ? 'border-indigo-200 bg-indigo-50 text-indigo-700' : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50',
              )}
            >
              {t}
            </button>
          ))}
        </div>
        <button
          onClick={() => setNewListOpen(true)}
          className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500"
        >
          <Upload className="h-3.5 w-3.5" />
          Upload List
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
        {isLoading ? (
          <div className="space-y-0 divide-y divide-gray-50">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-14 animate-pulse px-5 py-3.5" />
            ))}
          </div>
        ) : lists.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <Users className="h-10 w-10 text-gray-200" />
            <p className="text-sm text-gray-500">No marketing lists yet</p>
            <button onClick={() => setNewListOpen(true)} className="text-sm text-indigo-600 hover:underline">
              Upload your first list
            </button>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-50">
            <thead>
              <tr className="bg-gray-50/60">
                {['Name', 'Tags', 'Members', 'Created', ''].map((h) => (
                  <th key={h} className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {lists.map((l) => (
                <Fragment key={l.id}>
                  <tr
                    onClick={() => setExpandedId(expandedId === l.id ? null : l.id)}
                    className="cursor-pointer hover:bg-slate-50/60 transition-colors"
                  >
                    <td className="px-5 py-3.5 text-sm font-medium text-gray-900">{l.name}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex flex-wrap gap-1">
                        {(l.tags || []).map((t: string) => (
                          <span key={t} className="inline-flex rounded-full bg-violet-50 px-2 py-0.5 text-[11px] font-medium text-violet-700 ring-1 ring-violet-100">
                            {t}
                          </span>
                        ))}
                        {(!l.tags || l.tags.length === 0) && <span className="text-gray-300 text-xs">—</span>}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-gray-600">{l._count?.members ?? 0}</td>
                    <td className="px-5 py-3.5 text-sm text-gray-500">{format(new Date(l.createdAt), 'dd MMM yyyy')}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={(e) => { e.stopPropagation(); setUploadListId(l.id); }}
                          title="Upload more contacts"
                          className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                        >
                          <Upload className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setDeleteId(l.id); }}
                          className="rounded-md p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                  {expandedId === l.id && (
                    <tr key={`${l.id}-detail`}>
                      <td colSpan={5} className="bg-gray-50/60 px-5 py-4">
                        {!detail ? (
                          <p className="text-xs text-gray-400">Loading members…</p>
                        ) : detail.members.length === 0 ? (
                          <p className="text-xs text-gray-400">No members yet.</p>
                        ) : (
                          <div className="max-h-48 overflow-y-auto rounded-lg border border-gray-100 bg-white">
                            <table className="min-w-full text-xs">
                              <thead className="bg-gray-50">
                                <tr>
                                  {['Name', 'Phone', 'Email'].map((h) => (
                                    <th key={h} className="px-3 py-2 text-left font-medium text-gray-500">{h}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100">
                                {detail.members.map((m: any) => (
                                  <tr key={m.id}>
                                    <td className="px-3 py-1.5 text-gray-700">{m.contact.name}</td>
                                    <td className="px-3 py-1.5 text-gray-600">{m.contact.phone}</td>
                                    <td className="px-3 py-1.5 text-gray-500">{m.contact.email || '—'}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <NewListModal
        open={newListOpen}
        onClose={() => setNewListOpen(false)}
        onCreated={(listId) => setUploadListId(listId)}
      />

      {uploadListId && (
        <CsvImportModal
          open={!!uploadListId}
          onClose={() => setUploadListId(null)}
          onImported={() => qc.invalidateQueries({ queryKey: ['marketing-lists'] })}
          endpoint={`/api/v1/marketing/lists/${uploadListId}/upload`}
          title="Upload Contacts to List"
          resultLabel="Contacts"
        />
      )}

      <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title="Delete List" size="sm">
        <p className="text-sm text-gray-500">This will permanently delete the list and its membership records. Contacts themselves won&apos;t be deleted.</p>
        <div className="mt-5 flex justify-end gap-3">
          <button onClick={() => setDeleteId(null)} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">
            Cancel
          </button>
          <button
            onClick={() => deleteId && removeList.mutate(deleteId)}
            disabled={removeList.isPending}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-50"
          >
            {removeList.isPending ? 'Deleting…' : 'Delete List'}
          </button>
        </div>
      </Modal>
    </div>
  );
}

// ── Campaigns Tab (bulk sends) ───────────────────────────────────────────────
function CampaignsTab() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: listsData } = useQuery({
    queryKey: ['marketing-lists', 'all'],
    queryFn: async () => { const { data } = await api.get('/api/v1/marketing/lists', { params: { limit: 100 } }); return data; },
  });

  const { data, isLoading } = useQuery({
    queryKey: ['marketing-campaigns', statusFilter],
    queryFn: async () => {
      const { data } = await api.get('/api/v1/marketing/campaigns', {
        params: { status: statusFilter || undefined, limit: 100 },
      });
      return data;
    },
  });

  const campaigns: any[] = data?.data ?? [];
  const lists: any[] = listsData?.data ?? [];

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/api/v1/marketing/campaigns/${id}`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['marketing-campaigns'] }),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/api/v1/marketing/campaigns/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['marketing-campaigns'] }); setDeleteId(null); },
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setStatusFilter('')}
            className={cn(
              'rounded-lg border px-3 py-1.5 text-xs font-medium transition',
              statusFilter === '' ? 'border-indigo-200 bg-indigo-50 text-indigo-700' : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50',
            )}
          >
            All
          </button>
          {CAMPAIGN_STATUS_OPTIONS.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(statusFilter === s ? '' : s)}
              className={cn(
                'rounded-lg border px-3 py-1.5 text-xs font-medium transition',
                statusFilter === s ? 'border-indigo-200 bg-indigo-50 text-indigo-700' : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50',
              )}
            >
              {campaignStatusConfig[s].label}
            </button>
          ))}
        </div>
        <button
          onClick={() => setCreateOpen(true)}
          className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500"
        >
          <Plus className="h-3.5 w-3.5" />
          New Campaign
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
        {isLoading ? (
          <div className="space-y-0 divide-y divide-gray-50">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-14 animate-pulse px-5 py-3.5" />
            ))}
          </div>
        ) : campaigns.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <Send className="h-10 w-10 text-gray-200" />
            <p className="text-sm text-gray-500">No marketing campaigns yet</p>
            <button onClick={() => setCreateOpen(true)} className="text-sm text-indigo-600 hover:underline">
              Create your first campaign
            </button>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-50">
            <thead>
              <tr className="bg-gray-50/60">
                {['Name', 'List', 'Channel', 'Status', 'Scheduled', 'Sent', ''].map((h) => (
                  <th key={h} className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {campaigns.map((c) => {
                const ChannelIcon = channelConfig[c.channel]?.icon ?? Send;
                return (
                  <tr key={c.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-5 py-3.5 text-sm font-medium text-gray-900">{c.name}</td>
                    <td className="px-5 py-3.5 text-sm text-gray-600">{c.list?.name ?? '—'}</td>
                    <td className="px-5 py-3.5">
                      <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold', channelConfig[c.channel]?.pill)}>
                        <ChannelIcon className="h-3 w-3" />
                        {channelConfig[c.channel]?.label ?? c.channel}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <select
                        value={c.status}
                        onChange={(e) => updateStatus.mutate({ id: c.id, status: e.target.value })}
                        className={cn('rounded-full border-0 px-2.5 py-0.5 text-[11px] font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20', campaignStatusConfig[c.status]?.pill)}
                      >
                        {CAMPAIGN_STATUS_OPTIONS.map((s) => (
                          <option key={s} value={s}>{campaignStatusConfig[s].label}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-gray-500">
                      {c.scheduledAt ? format(new Date(c.scheduledAt), 'dd MMM yyyy, HH:mm') : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-gray-600">{c.sentCount ?? 0}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end">
                        <button onClick={() => setDeleteId(c.id)} className="rounded-md p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <NewCampaignModal open={createOpen} onClose={() => setCreateOpen(false)} lists={lists} />

      <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title="Delete Campaign" size="sm">
        <p className="text-sm text-gray-500">This will permanently delete the marketing campaign. This cannot be undone.</p>
        <div className="mt-5 flex justify-end gap-3">
          <button onClick={() => setDeleteId(null)} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">
            Cancel
          </button>
          <button
            onClick={() => deleteId && remove.mutate(deleteId)}
            disabled={remove.isPending}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-50"
          >
            {remove.isPending ? 'Deleting…' : 'Delete Campaign'}
          </button>
        </div>
      </Modal>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function MarketingPage() {
  const [tab, setTab] = useState<MarketingTab>('lists');

  const tabs: { key: MarketingTab; label: string }[] = [
    { key: 'lists', label: 'Lists' },
    { key: 'campaigns', label: 'Campaigns' },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Marketing</h1>
        <p className="text-sm text-gray-500">Bulk contact lists and outbound blast campaigns</p>
      </div>

      <div className="flex gap-1 rounded-xl bg-gray-100/80 p-1 w-fit">
        {tabs.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              'rounded-lg px-5 py-1.5 text-sm font-medium transition',
              tab === key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'lists' ? <ListsTab /> : <CampaignsTab />}
    </div>
  );
}
