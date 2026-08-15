'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useMemo, useState } from 'react';
import { Plus, Upload, Megaphone, Pencil, Trash2, Users, Play, Pause, CheckCircle2 } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { CsvImportModal } from '@/components/ui/CsvImportModal';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { cn } from '@/lib/utils';

const STATUS_OPTIONS = ['ACTIVE', 'PAUSED', 'COMPLETED'] as const;
type CampaignStatus = typeof STATUS_OPTIONS[number];

const statusConfig: Record<CampaignStatus, { label: string; pill: string; icon: typeof Play }> = {
  ACTIVE:    { label: 'Active',    pill: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100', icon: Play },
  PAUSED:    { label: 'Paused',    pill: 'bg-amber-50 text-amber-700 ring-1 ring-amber-100',       icon: Pause },
  COMPLETED: { label: 'Completed', pill: 'bg-gray-100 text-gray-500 ring-1 ring-gray-200',          icon: CheckCircle2 },
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

// ── Campaign Form Modal ──────────────────────────────────────────────────────
const campaignSchema = z.object({
  name: z.string().min(1, 'Required'),
  category: z.string().optional(),
  source: z.string().optional(),
  status: z.enum(STATUS_OPTIONS).default('ACTIVE'),
});

type CampaignForm = z.infer<typeof campaignSchema>;

function CampaignFormModal({
  open,
  onClose,
  campaign,
  categoryOptions,
}: {
  open: boolean;
  onClose: () => void;
  campaign?: any;
  categoryOptions: string[];
}) {
  const qc = useQueryClient();
  const isEdit = !!campaign;

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<CampaignForm>({
    resolver: zodResolver(campaignSchema),
    defaultValues: campaign
      ? { name: campaign.name, category: campaign.category ?? '', source: campaign.source ?? '', status: campaign.status }
      : { status: 'ACTIVE' },
  });

  const save = useMutation({
    mutationFn: (data: CampaignForm) =>
      isEdit
        ? api.patch(`/api/v1/campaigns/${campaign.id}`, data)
        : api.post('/api/v1/campaigns', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['campaigns'] });
      reset();
      onClose();
    },
  });

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Edit Campaign' : 'New Campaign'}>
      <form onSubmit={handleSubmit((d) => save.mutate(d))} className="space-y-4">
        <Field label="Campaign Name" required error={errors.name?.message}>
          <input {...register('name')} className={inputCls} placeholder="e.g. Instagram Ads — August" />
        </Field>
        <Field label="Category">
          <input
            {...register('category')}
            list="campaign-category-options"
            className={inputCls}
            placeholder="e.g. Social, Referral, Events"
          />
          <datalist id="campaign-category-options">
            {categoryOptions.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </Field>
        <Field label="Source">
          <input {...register('source')} className={inputCls} placeholder="e.g. Facebook, Google Ads, Walk-in" />
        </Field>
        {isEdit && (
          <Field label="Status">
            <select {...register('status')} className={inputCls}>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{statusConfig[s].label}</option>
              ))}
            </select>
          </Field>
        )}

        {save.isError && <p className="text-sm text-red-500">Failed to save. Please try again.</p>}

        <div className="flex justify-end gap-3 pt-1">
          <button type="button" onClick={onClose} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">
            Cancel
          </button>
          <button type="submit" disabled={isSubmitting || save.isPending} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50">
            {save.isPending ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Campaign'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ── Campaigns Page ───────────────────────────────────────────────────────────
export default function CampaignsPage() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<CampaignStatus | ''>('');
  const [modal, setModal] = useState<{ open: boolean; campaign?: any }>({ open: false });
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [importCampaignId, setImportCampaignId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['campaigns', statusFilter],
    queryFn: async () => {
      const { data } = await api.get('/api/v1/campaigns', {
        params: { status: statusFilter || undefined, limit: 100 },
      });
      return data;
    },
  });

  const campaigns: any[] = data?.data ?? [];

  const categoryOptions = useMemo(
    () => Array.from(new Set(campaigns.map((c) => c.category).filter(Boolean))) as string[],
    [campaigns],
  );

  const deleteCampaign = useMutation({
    mutationFn: (id: string) => api.delete(`/api/v1/campaigns/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['campaigns'] }); setDeleteId(null); },
  });

  const toggleStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: CampaignStatus }) =>
      api.patch(`/api/v1/campaigns/${id}`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['campaigns'] }),
  });

  const total = data?.meta?.total ?? campaigns.length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Campaigns</h1>
          <p className="text-sm text-gray-500">{total.toLocaleString()} acquisition {total === 1 ? 'campaign' : 'campaigns'}</p>
        </div>
        <button
          onClick={() => setModal({ open: true })}
          className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500"
        >
          <Plus className="h-3.5 w-3.5" />
          New Campaign
        </button>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-1 rounded-xl bg-gray-100/80 p-1 w-fit">
        {(['', ...STATUS_OPTIONS] as const).map((s) => (
          <button
            key={s || 'all'}
            onClick={() => setStatusFilter(s)}
            className={cn(
              'rounded-lg px-5 py-1.5 text-sm font-medium transition',
              statusFilter === s ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700',
            )}
          >
            {s === '' ? 'All' : statusConfig[s].label}
          </button>
        ))}
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-40 animate-pulse rounded-xl border border-gray-100 bg-white shadow-sm" />
          ))}
        </div>
      ) : campaigns.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-xl border border-gray-100 bg-white shadow-sm">
          <Megaphone className="h-10 w-10 text-gray-200" />
          <p className="text-sm text-gray-500">{statusFilter ? 'No campaigns match this filter' : 'No campaigns yet'}</p>
          {!statusFilter && (
            <button onClick={() => setModal({ open: true })} className="text-sm text-indigo-600 hover:underline">
              Create your first campaign
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {campaigns.map((c) => (
            <div key={c.id} className="group flex flex-col justify-between rounded-xl border border-gray-100 bg-white p-5 shadow-sm transition hover:shadow-md">
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-100">
                    <Megaphone className="h-4 w-4 text-indigo-600" />
                  </div>
                  <span className={cn('inline-flex shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold', statusConfig[c.status as CampaignStatus]?.pill)}>
                    {statusConfig[c.status as CampaignStatus]?.label ?? c.status}
                  </span>
                </div>
                <p className="mt-3 truncate text-sm font-semibold text-gray-900">{c.name}</p>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  {c.category && (
                    <span className="inline-flex rounded-full bg-violet-50 px-2 py-0.5 text-[11px] font-medium text-violet-700 ring-1 ring-violet-100">
                      {c.category}
                    </span>
                  )}
                  {c.source && <span className="text-xs text-gray-400">via {c.source}</span>}
                </div>
                <div className="mt-3 flex items-center gap-1.5 text-xs text-gray-500">
                  <Users className="h-3.5 w-3.5" />
                  {(c._count?.contacts ?? 0).toLocaleString()} leads
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-gray-50 pt-3">
                <div className="flex items-center gap-1">
                  {STATUS_OPTIONS.filter((s) => s !== c.status).map((s) => {
                    const Icon = statusConfig[s].icon;
                    return (
                      <button
                        key={s}
                        title={`Mark ${statusConfig[s].label}`}
                        onClick={() => toggleStatus.mutate({ id: c.id, status: s })}
                        className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                      >
                        <Icon className="h-3.5 w-3.5" />
                      </button>
                    );
                  })}
                </div>
                <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <button
                    onClick={() => setImportCampaignId(c.id)}
                    title="Import leads via CSV"
                    className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                  >
                    <Upload className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => setModal({ open: true, campaign: c })}
                    className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => setDeleteId(c.id)}
                    className="rounded-md p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <CampaignFormModal
        open={modal.open}
        onClose={() => setModal({ open: false })}
        campaign={modal.campaign}
        categoryOptions={categoryOptions}
      />

      {importCampaignId && (
        <CsvImportModal
          open={!!importCampaignId}
          onClose={() => setImportCampaignId(null)}
          onImported={() => qc.invalidateQueries({ queryKey: ['campaigns'] })}
          endpoint={`/api/v1/campaigns/${importCampaignId}/import`}
          title="Import Leads from CSV"
          resultLabel="Leads"
        />
      )}

      <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title="Delete Campaign" size="sm">
        <p className="text-sm text-gray-500">This will permanently delete the campaign. Contacts already linked to it will remain but lose the association.</p>
        <div className="mt-5 flex justify-end gap-3">
          <button onClick={() => setDeleteId(null)} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">
            Cancel
          </button>
          <button
            onClick={() => deleteId && deleteCampaign.mutate(deleteId)}
            disabled={deleteCampaign.isPending}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-50"
          >
            {deleteCampaign.isPending ? 'Deleting…' : 'Delete Campaign'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
