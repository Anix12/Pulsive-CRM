'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus, Upload, Megaphone, Pencil, Trash2, Search, Pin,
  Play, Pause, CheckCircle2, PhoneCall, ArrowRight, Layers,
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { CsvImportModal } from '@/components/ui/CsvImportModal';
import { AvatarStack } from '@/components/ui/AvatarStack';
import { PercentRing } from '@/components/ui/PercentRing';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { cn, categoryColor } from '@/lib/utils';

const STATUS_OPTIONS = ['ACTIVE', 'PAUSED', 'COMPLETED'] as const;
type CampaignStatus = typeof STATUS_OPTIONS[number];

const PRIORITY_OPTIONS = ['LOW', 'MEDIUM', 'HIGH'] as const;
const DUPLICATE_CHECK_OPTIONS = ['NONE', 'MOBILE_ONLY', 'EMAIL_ONLY', 'BOTH'] as const;
const ASSIGNMENT_RULE_OPTIONS = ['MANUAL', 'ROUND_ROBIN'] as const;

const statusConfig: Record<CampaignStatus, { label: string; pill: string; icon: typeof Play }> = {
  ACTIVE:    { label: 'Active',    pill: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100', icon: Play },
  PAUSED:    { label: 'Paused',    pill: 'bg-amber-50 text-amber-700 ring-1 ring-amber-100',       icon: Pause },
  COMPLETED: { label: 'Completed', pill: 'bg-gray-100 text-gray-500 ring-1 ring-gray-200',          icon: CheckCircle2 },
};

const prettyEnum = (v: string) =>
  v.charAt(0) + v.slice(1).toLowerCase().replace(/_/g, ' ');

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
  priority: z.enum(PRIORITY_OPTIONS).default('MEDIUM'),
  duplicateCheck: z.enum(DUPLICATE_CHECK_OPTIONS).default('MOBILE_ONLY'),
  assignmentRule: z.enum(ASSIGNMENT_RULE_OPTIONS).default('MANUAL'),
  pipelineId: z.string().optional(),
});

type CampaignForm = z.infer<typeof campaignSchema>;

function CampaignFormModal({
  open,
  onClose,
  campaign,
  categoryOptions,
  pipelines,
}: {
  open: boolean;
  onClose: () => void;
  campaign?: any;
  categoryOptions: string[];
  pipelines: { id: string; name: string }[];
}) {
  const qc = useQueryClient();
  const isEdit = !!campaign;

  const { register, handleSubmit, reset, watch, setValue, formState: { errors, isSubmitting } } = useForm<CampaignForm>({
    resolver: zodResolver(campaignSchema),
    defaultValues: campaign
      ? {
          name: campaign.name,
          category: campaign.category ?? '',
          source: campaign.source ?? '',
          status: campaign.status,
          priority: campaign.priority ?? 'MEDIUM',
          duplicateCheck: campaign.duplicateCheck ?? 'MOBILE_ONLY',
          assignmentRule: campaign.assignmentRule ?? 'MANUAL',
          pipelineId: campaign.pipelineId ?? '',
        }
      : { status: 'ACTIVE', priority: 'MEDIUM', duplicateCheck: 'MOBILE_ONLY', assignmentRule: 'MANUAL' },
  });

  const [customCategory, setCustomCategory] = useState(
    !!campaign?.category && !categoryOptions.includes(campaign.category),
  );
  const category = watch('category');

  useEffect(() => {
    if (open) {
      reset();
      setCustomCategory(!!campaign?.category && !categoryOptions.includes(campaign.category));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, reset]);

  const save = useMutation({
    mutationFn: (data: CampaignForm) => {
      const payload = { ...data, pipelineId: data.pipelineId || null };
      return isEdit
        ? api.patch(`/api/v1/campaigns/${campaign.id}`, payload)
        : api.post('/api/v1/campaigns', payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['campaigns'] });
      qc.invalidateQueries({ queryKey: ['campaign-categories'] });
      reset();
      onClose();
    },
  });

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Edit Campaign' : 'New Campaign'} description="Create a campaign to organize and track leads" size="lg">
      <form onSubmit={handleSubmit((d) => save.mutate(d))} className="space-y-4">
        <Field label="Campaign Name" required error={errors.name?.message}>
          <input {...register('name')} className={inputCls} placeholder="e.g. Instagram Ads — August" autoFocus />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Pipeline">
            <select {...register('pipelineId')} className={inputCls}>
              <option value="">No pipeline</option>
              {pipelines.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Category">
            {customCategory ? (
              <div className="flex gap-1.5">
                <input
                  {...register('category')}
                  className={inputCls}
                  placeholder="New category name"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => { setCustomCategory(false); setValue('category', ''); }}
                  className="shrink-0 rounded-lg border border-gray-200 px-2.5 text-xs font-medium text-gray-500 hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <select
                value={category ?? ''}
                onChange={(e) => {
                  if (e.target.value === '__custom__') { setCustomCategory(true); setValue('category', ''); }
                  else setValue('category', e.target.value);
                }}
                className={inputCls}
              >
                <option value="">No category</option>
                {categoryOptions.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
                <option value="__custom__">+ Add new category…</option>
              </select>
            )}
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Status">
            <select {...register('status')} className={inputCls}>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{statusConfig[s].label}</option>
              ))}
            </select>
          </Field>
          <Field label="Priority">
            <select {...register('priority')} className={inputCls}>
              {PRIORITY_OPTIONS.map((p) => (
                <option key={p} value={p}>{prettyEnum(p)}</option>
              ))}
            </select>
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Duplicate Check">
            <select {...register('duplicateCheck')} className={inputCls}>
              {DUPLICATE_CHECK_OPTIONS.map((d) => (
                <option key={d} value={d}>{prettyEnum(d)}</option>
              ))}
            </select>
          </Field>
          <Field label="Assignment Rule">
            <select {...register('assignmentRule')} className={inputCls}>
              {ASSIGNMENT_RULE_OPTIONS.map((a) => (
                <option key={a} value={a}>{prettyEnum(a)}</option>
              ))}
            </select>
          </Field>
        </div>

        <Field label="Source">
          <input {...register('source')} className={inputCls} placeholder="e.g. Facebook, Google Ads, Walk-in" />
        </Field>

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

// ── Import: pick a target campaign, then reuse the CSV modal ────────────────
function ImportPickCampaignModal({
  open,
  onClose,
  campaigns,
  onPicked,
}: {
  open: boolean;
  onClose: () => void;
  campaigns: any[];
  onPicked: (campaignId: string) => void;
}) {
  const [id, setId] = useState('');
  return (
    <Modal open={open} onClose={onClose} title="Import Leads" description="Choose which campaign to import leads into" size="sm">
      <div className="space-y-4">
        <Field label="Campaign" required>
          <select className={inputCls} value={id} onChange={(e) => setId(e.target.value)}>
            <option value="">Select a campaign…</option>
            {campaigns.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </Field>
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">
            Cancel
          </button>
          <button
            onClick={() => id && onPicked(id)}
            disabled={!id}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
          >
            Continue
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ── Category sidebar ─────────────────────────────────────────────────────────
function CategorySidebar({
  categories,
  totalCount,
  selected,
  onSelect,
  extraCategories,
  onAddCategory,
}: {
  categories: { category: string; count: number }[];
  totalCount: number;
  selected: string | null;
  onSelect: (c: string | null) => void;
  extraCategories: string[];
  onAddCategory: (name: string) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');

  const known = new Set(categories.map((c) => c.category));
  const merged = [
    ...categories,
    ...extraCategories.filter((c) => !known.has(c)).map((c) => ({ category: c, count: 0 })),
  ];

  return (
    <div className="w-56 shrink-0 rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-gray-400">Categories</p>
      <ul className="space-y-0.5">
        <li>
          <button
            onClick={() => onSelect(null)}
            className={cn(
              'flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-sm transition',
              selected === null ? 'bg-indigo-50 font-medium text-indigo-700' : 'text-gray-600 hover:bg-gray-50',
            )}
          >
            <span className="flex items-center gap-2">
              <Layers className="h-3.5 w-3.5 text-gray-400" />
              All campaigns
            </span>
            <span className="text-xs text-gray-400">{totalCount}</span>
          </button>
        </li>
        {merged.map((c) => (
          <li key={c.category}>
            <button
              onClick={() => onSelect(c.category)}
              className={cn(
                'flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-sm transition',
                selected === c.category ? 'bg-indigo-50 font-medium text-indigo-700' : 'text-gray-600 hover:bg-gray-50',
              )}
            >
              <span className="flex items-center gap-2 truncate">
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: categoryColor(c.category) }} />
                <span className="truncate">{c.category}</span>
              </span>
              <span className="text-xs text-gray-400">{c.count}</span>
            </button>
          </li>
        ))}
      </ul>

      {adding ? (
        <form
          className="mt-3 flex gap-1.5"
          onSubmit={(e) => {
            e.preventDefault();
            if (name.trim()) onAddCategory(name.trim());
            setName('');
            setAdding(false);
          }}
        >
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => setAdding(false)}
            placeholder="Category name"
            className="w-full rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none"
          />
        </form>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="mt-3 flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-gray-400 hover:bg-gray-50 hover:text-gray-600"
        >
          <Plus className="h-3.5 w-3.5" />
          Add category
        </button>
      )}
    </div>
  );
}

// ── Campaigns Page ───────────────────────────────────────────────────────────
export default function CampaignsPage() {
  const qc = useQueryClient();
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<CampaignStatus | ''>('');
  const [category, setCategory] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [modal, setModal] = useState<{ open: boolean; campaign?: any }>({ open: false });
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [importCampaignId, setImportCampaignId] = useState<string | null>(null);
  const [pickImportOpen, setPickImportOpen] = useState(false);
  const [extraCategories, setExtraCategories] = useState<string[]>([]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('pulsive:campaignCategories');
      if (stored) setExtraCategories(JSON.parse(stored));
    } catch { /* ignore */ }
  }, []);

  const addExtraCategory = (name: string) => {
    setExtraCategories((prev) => {
      if (prev.includes(name)) return prev;
      const next = [...prev, name];
      try { localStorage.setItem('pulsive:campaignCategories', JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  };

  const { data, isLoading } = useQuery({
    queryKey: ['campaigns', statusFilter, category, debouncedSearch],
    queryFn: async () => {
      const { data } = await api.get('/api/v1/campaigns', {
        params: { status: statusFilter || undefined, category: category || undefined, search: debouncedSearch || undefined, limit: 100 },
      });
      return data;
    },
  });

  const { data: categoriesData } = useQuery({
    queryKey: ['campaign-categories'],
    queryFn: async () => {
      const { data } = await api.get('/api/v1/campaigns/categories');
      return data.data as { category: string; count: number }[];
    },
  });

  const { data: pipelines } = useQuery({
    queryKey: ['pipelines'],
    queryFn: async () => {
      const { data } = await api.get('/api/v1/deals/pipelines');
      return data.data as { id: string; name: string }[];
    },
  });

  const campaigns: any[] = data?.data ?? [];
  const totalCount = categoriesData?.reduce((s, c) => s + c.count, 0) ?? campaigns.length;

  const categoryOptions = useMemo(
    () => Array.from(new Set([...(categoriesData?.map((c) => c.category) ?? []), ...extraCategories])),
    [categoriesData, extraCategories],
  );

  const deleteCampaign = useMutation({
    mutationFn: (id: string) => api.delete(`/api/v1/campaigns/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['campaigns'] });
      qc.invalidateQueries({ queryKey: ['campaign-categories'] });
      setDeleteId(null);
    },
  });

  const toggleStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: CampaignStatus }) =>
      api.patch(`/api/v1/campaigns/${id}`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['campaigns'] }),
  });

  const togglePin = useMutation({
    mutationFn: (id: string) => api.post(`/api/v1/campaigns/${id}/pin`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['campaigns'] }),
  });

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Campaigns</h1>
          <p className="text-sm text-gray-500">Manage and track all your campaigns</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPickImportOpen(true)}
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-sm font-medium text-gray-600 shadow-sm transition hover:bg-gray-50"
          >
            <Upload className="h-3.5 w-3.5" />
            Import
          </button>
          <button
            onClick={() => setModal({ open: true })}
            className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500"
          >
            <Plus className="h-3.5 w-3.5" />
            New Campaign
          </button>
        </div>
      </div>

      {/* Search + status tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search campaigns…"
            className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-8 pr-3 text-sm text-gray-900 placeholder:text-gray-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>
        <div className="flex gap-1 rounded-xl bg-gray-100/80 p-1">
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
      </div>

      <div className="flex items-start gap-5">
        <CategorySidebar
          categories={categoriesData ?? []}
          totalCount={totalCount}
          selected={category}
          onSelect={setCategory}
          extraCategories={extraCategories}
          onAddCategory={addExtraCategory}
        />

        <div className="min-w-0 flex-1 space-y-3">
          <p className="text-sm text-gray-500">{campaigns.length.toLocaleString()} {campaigns.length === 1 ? 'campaign' : 'campaigns'}</p>

          {isLoading ? (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-52 animate-pulse rounded-xl border border-gray-100 bg-white shadow-sm" />
              ))}
            </div>
          ) : campaigns.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-xl border border-gray-100 bg-white shadow-sm">
              <Megaphone className="h-10 w-10 text-gray-200" />
              <p className="text-sm text-gray-500">
                {statusFilter || category ? 'No campaigns match these filters' : 'No campaigns yet'}
              </p>
              {!statusFilter && !category && (
                <button onClick={() => setModal({ open: true })} className="text-sm text-indigo-600 hover:underline">
                  Create your first campaign
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
              {campaigns.map((c) => {
                const stats = c.stats ?? { total: c._count?.contacts ?? 0, new: 0, calls: 0, converted: 0, conversionPct: 0 };
                const color = categoryColor(c.category);
                return (
                  <div key={c.id} className="group flex flex-col justify-between rounded-xl border border-gray-100 bg-white p-5 shadow-sm transition hover:shadow-md">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
                          <p className="truncate text-sm font-semibold text-gray-900">{c.name}</p>
                        </div>
                        <PercentRing percent={stats.conversionPct} color={color} />
                      </div>
                      <p className="mt-0.5 text-xs text-gray-400">
                        {c.pipeline?.name ?? 'No pipeline'}{c.source ? ` · via ${c.source}` : ''}
                      </p>

                      <div className="mt-4 grid grid-cols-4 gap-1 text-center">
                        <div>
                          <p className="text-base font-bold text-gray-900">{stats.total}</p>
                          <p className="text-[10px] uppercase tracking-wide text-gray-400">Total</p>
                        </div>
                        <div>
                          <p className="text-base font-bold text-indigo-600">{stats.new}</p>
                          <p className="text-[10px] uppercase tracking-wide text-gray-400">New</p>
                        </div>
                        <div>
                          <p className="text-base font-bold text-amber-600">{stats.calls}</p>
                          <p className="text-[10px] uppercase tracking-wide text-gray-400">Calls</p>
                        </div>
                        <div>
                          <p className="text-base font-bold text-emerald-600">{stats.converted}</p>
                          <p className="text-[10px] uppercase tracking-wide text-gray-400">Converted</p>
                        </div>
                      </div>

                      <div className="mt-3 h-1 overflow-hidden rounded-full bg-gray-100">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${stats.conversionPct}%`, backgroundColor: color }}
                        />
                      </div>

                      <div className="mt-3 flex items-center justify-between">
                        <AvatarStack people={c.assignees ?? []} />
                        {c.category && (
                          <span
                            className="inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium"
                            style={{ backgroundColor: `${color}1a`, color }}
                          >
                            {c.category}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 flex items-center gap-2 border-t border-gray-50 pt-3">
                      <button
                        onClick={() => router.push(`/dashboard/calls?campaignId=${c.id}`)}
                        className="flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-500"
                      >
                        <PhoneCall className="h-3 w-3" />
                        Dialer
                      </button>
                      <button
                        onClick={() => router.push(`/dashboard/campaigns/${c.id}`)}
                        className="flex items-center gap-1 rounded-lg border border-indigo-200 px-3 py-1.5 text-xs font-semibold text-indigo-600 transition hover:bg-indigo-50"
                      >
                        Open
                        <ArrowRight className="h-3 w-3" />
                      </button>

                      <div className="ml-auto flex items-center gap-0.5">
                        {STATUS_OPTIONS.filter((s) => s !== c.status).map((s) => {
                          const Icon = statusConfig[s].icon;
                          return (
                            <button
                              key={s}
                              title={`Mark ${statusConfig[s].label}`}
                              onClick={() => toggleStatus.mutate({ id: c.id, status: s })}
                              className="hidden rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 sm:inline-flex"
                            >
                              <Icon className="h-3.5 w-3.5" />
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="mt-2 flex items-center justify-between">
                      <span className={cn('inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold', statusConfig[c.status as CampaignStatus]?.pill)}>
                        {statusConfig[c.status as CampaignStatus]?.label ?? c.status}
                      </span>
                      <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                        <button
                          onClick={() => togglePin.mutate(c.id)}
                          title={c.isPinned ? 'Unpin' : 'Pin'}
                          className={cn('rounded-md p-1.5 hover:bg-gray-100', c.isPinned ? 'text-indigo-500' : 'text-gray-400 hover:text-gray-600')}
                        >
                          <Pin className={cn('h-3.5 w-3.5', c.isPinned && 'fill-current')} />
                        </button>
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
                );
              })}
            </div>
          )}
        </div>
      </div>

      <CampaignFormModal
        open={modal.open}
        onClose={() => setModal({ open: false })}
        campaign={modal.campaign}
        categoryOptions={categoryOptions}
        pipelines={pipelines ?? []}
      />

      <ImportPickCampaignModal
        open={pickImportOpen}
        onClose={() => setPickImportOpen(false)}
        campaigns={campaigns}
        onPicked={(id) => {
          setPickImportOpen(false);
          setImportCampaignId(id);
        }}
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
