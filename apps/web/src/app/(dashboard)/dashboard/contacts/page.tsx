'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useState, useRef, useEffect } from 'react';
import { Plus, Search, Pencil, Trash2, Upload, Users, SlidersHorizontal, Columns3, Flame } from 'lucide-react';
import Link from 'next/link';
import { Modal } from '@/components/ui/Modal';
import { CsvImportModal } from '@/components/ui/CsvImportModal';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { cn, getInitials } from '@/lib/utils';

const STATUS_OPTIONS = ['LEAD', 'PROSPECT', 'CUSTOMER', 'CHURNED', 'BLOCKED'] as const;

const statusConfig: Record<string, { label: string; pill: string }> = {
  LEAD:     { label: 'Lead',     pill: 'bg-blue-400/10 text-blue-300 ring-1 ring-blue-400/20'     },
  PROSPECT: { label: 'Prospect', pill: 'bg-violet-400/10 text-violet-300 ring-1 ring-violet-400/20' },
  CUSTOMER: { label: 'Customer', pill: 'bg-emerald-400/10 text-emerald-300 ring-1 ring-emerald-400/20' },
  CHURNED:  { label: 'Churned',  pill: 'bg-white/[0.06] text-white/40 ring-1 ring-white/10'     },
  BLOCKED:  { label: 'Blocked',  pill: 'bg-red-400/10 text-red-300 ring-1 ring-red-400/20'         },
};

// ── Temperature config ────────────────────────────────────────────────────────
const TEMP_OPTIONS = ['HOT', 'WARM', 'COLD'] as const;
type Temperature = typeof TEMP_OPTIONS[number];

const tempConfig: Record<Temperature, { label: string; emoji: string; pill: string; chip: string }> = {
  HOT:  { label: 'Hot',  emoji: '🔥', pill: 'bg-orange-400/10 text-orange-300 ring-1 ring-orange-400/20', chip: 'border-orange-400/30 bg-orange-400/10 text-orange-300' },
  WARM: { label: 'Warm', emoji: '☀️', pill: 'bg-amber-400/10 text-amber-300 ring-1 ring-amber-400/20',   chip: 'border-amber-400/30 bg-amber-400/10 text-amber-300'   },
  COLD: { label: 'Cold', emoji: '❄️', pill: 'bg-sky-400/10 text-sky-300 ring-1 ring-sky-400/20',         chip: 'border-sky-400/30 bg-sky-400/10 text-sky-300'         },
};

// ── Avatar colors ─────────────────────────────────────────────────────────────
const avatarColors = [
  'bg-cyan-400/15 text-cyan-300',
  'bg-violet-400/15 text-violet-300',
  'bg-emerald-400/15 text-emerald-300',
  'bg-amber-400/15 text-amber-300',
  'bg-rose-400/15 text-rose-300',
  'bg-blue-400/15 text-blue-300',
];

function avatarColor(name: string) {
  return avatarColors[name.charCodeAt(0) % avatarColors.length];
}

// ── Form schema ───────────────────────────────────────────────────────────────
const contactSchema = z.object({
  name:            z.string().min(1, 'Required'),
  email:           z.string().email('Invalid email').optional().or(z.literal('')),
  phone:           z.string().min(7, 'Required'),
  alternatePhone:  z.string().optional(),
  company:     z.string().optional(),
  jobTitle:    z.string().optional(),
  status:      z.enum(STATUS_OPTIONS).default('LEAD'),
  temperature: z.enum(TEMP_OPTIONS).nullable().optional(),
  assignedToId: z.string().nullable().optional(),
  campaignId:  z.string().nullable().optional(),
});

type ContactForm = z.infer<typeof contactSchema>;

// ── Shared UI helpers ─────────────────────────────────────────────────────────
function InputField({ label, error, required, children }: { label: string; error?: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-white/70">
        {label}
        {required && <span className="ml-0.5 text-red-400">*</span>}
      </label>
      <div className="mt-1">{children}</div>
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  );
}

const inputCls =
  'block w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white/90 transition placeholder:text-white/25 focus:border-cyan-400/50 focus:outline-none focus:ring-2 focus:ring-cyan-400/20';

// ── Temperature Picker (used in form) ─────────────────────────────────────────
function TemperaturePicker({
  value,
  onChange,
}: {
  value: Temperature | null | undefined;
  onChange: (v: Temperature | null) => void;
}) {
  return (
    <div className="flex gap-2">
      {TEMP_OPTIONS.map((t) => (
        <button
          key={t}
          type="button"
          onClick={() => onChange(value === t ? null : t)}
          className={cn(
            'flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition',
            value === t
              ? tempConfig[t].chip
              : 'border-white/10 bg-white/[0.03] text-white/45 hover:bg-white/[0.06]',
          )}
        >
          {tempConfig[t].emoji} {tempConfig[t].label}
        </button>
      ))}
      {value && (
        <button
          type="button"
          onClick={() => onChange(null)}
          className="rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-white/35 hover:bg-white/[0.06]"
        >
          Clear
        </button>
      )}
    </div>
  );
}

// ── Contact Form Modal ────────────────────────────────────────────────────────
function ContactFormModal({ open, onClose, contact }: { open: boolean; onClose: () => void; contact?: any }) {
  const qc = useQueryClient();
  const isEdit = !!contact;

  const { data: agents = [] } = useQuery<any[]>({
    queryKey: ['team-users'],
    queryFn: async () => {
      const { data } = await api.get('/api/v1/tenants/me/users');
      return data.data;
    },
  });

  const { data: campaigns = [] } = useQuery<any[]>({
    queryKey: ['campaigns-list'],
    queryFn: async () => {
      const { data } = await api.get('/api/v1/campaigns?limit=100');
      return data.data;
    },
  });

  const buildDefaults = (c?: any): Partial<ContactForm> =>
    c
      ? { ...c, temperature: c.temperature ?? null, assignedToId: c.assignedToId ?? null, campaignId: c.campaignId ?? null }
      : { status: 'LEAD', temperature: null, assignedToId: null, campaignId: null };

  const { register, handleSubmit, reset, watch, setValue, formState: { errors, isSubmitting } } = useForm<ContactForm>({
    resolver: zodResolver(contactSchema),
    defaultValues: buildDefaults(contact),
  });

  // defaultValues is only read on first mount by react-hook-form, but this modal
  // stays mounted across opens with different contacts — resync the form whenever
  // the modal opens or the contact it's editing changes.
  useEffect(() => {
    if (!open) return;
    reset(buildDefaults(contact));
  }, [open, contact, reset]);

  const temperature = watch('temperature');

  const save = useMutation({
    mutationFn: (data: ContactForm) =>
      isEdit
        ? api.patch(`/api/v1/contacts/${contact.id}`, data)
        : api.post('/api/v1/contacts', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contacts'] });
      reset();
      onClose();
    },
  });

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Edit Contact' : 'New Contact'}>
      <form onSubmit={handleSubmit((d) => save.mutate(d))} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <InputField label="Name" required error={errors.name?.message}>
              <input {...register('name')} className={inputCls} />
            </InputField>
          </div>
          <InputField label="Phone" required error={errors.phone?.message}>
            <input {...register('phone')} className={inputCls} />
          </InputField>
          <InputField label="Alternate Phone">
            <input {...register('alternatePhone')} className={inputCls} />
          </InputField>
          <div className="col-span-2">
            <InputField label="Email" error={errors.email?.message}>
              <input {...register('email')} type="email" className={inputCls} />
            </InputField>
          </div>
          <InputField label="Company">
            <input {...register('company')} className={inputCls} />
          </InputField>
          <InputField label="Job Title">
            <input {...register('jobTitle')} className={inputCls} />
          </InputField>
          <InputField label="Status">
            <select {...register('status')} className={inputCls}>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{statusConfig[s].label}</option>
              ))}
            </select>
          </InputField>
          <InputField label="Assigned To">
            <select {...register('assignedToId', { setValueAs: (v) => (v === '' ? null : v) })} className={inputCls}>
              <option value="">Unassigned</option>
              {agents.map((a: any) => (
                <option key={a.id} value={a.id}>{a.firstName} {a.lastName}</option>
              ))}
            </select>
          </InputField>
          <InputField label="Campaign">
            <select {...register('campaignId', { setValueAs: (v) => (v === '' ? null : v) })} className={inputCls}>
              <option value="">No Campaign</option>
              {campaigns.map((c: any) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </InputField>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-white/70 mb-2">Lead Temperature</label>
            <TemperaturePicker
              value={temperature as Temperature | null}
              onChange={(v) => setValue('temperature', v)}
            />
          </div>
        </div>

        {save.isError && <p className="text-sm text-red-400">Failed to save. Please try again.</p>}

        <div className="flex justify-end gap-3 pt-1">
          <button type="button" onClick={onClose} className="rounded-lg border border-white/10 px-4 py-2 text-sm font-medium text-white/60 hover:bg-white/[0.06]">
            Cancel
          </button>
          <button type="submit" disabled={isSubmitting || save.isPending} className="btn-gradient-brand rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
            {save.isPending ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Contact'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ── Quick temperature toggle (inline on table row) ────────────────────────────
function TempToggle({ contact }: { contact: any }) {
  const qc = useQueryClient();
  const update = useMutation({
    mutationFn: (temperature: Temperature | null) =>
      api.patch(`/api/v1/contacts/${contact.id}`, { temperature }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contacts'] }),
  });

  const current = contact.temperature as Temperature | null;

  return (
    <div className="flex items-center gap-1">
      {TEMP_OPTIONS.map((t) => (
        <button
          key={t}
          title={`Mark as ${tempConfig[t].label}`}
          onClick={(e) => {
            e.stopPropagation();
            update.mutate(current === t ? null : t);
          }}
          disabled={update.isPending}
          className={cn(
            'rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 transition',
            current === t
              ? tempConfig[t].pill
              : 'bg-white/[0.03] text-white/20 ring-white/10 hover:ring-white/20 hover:text-white/40',
          )}
        >
          {tempConfig[t].emoji}
        </button>
      ))}
    </div>
  );
}

// ── Customizable columns ──────────────────────────────────────────────────────
const ALL_COLUMNS = [
  { key: 'phone', label: 'Phone' },
  { key: 'company', label: 'Company' },
  { key: 'source', label: 'Source' },
  { key: 'temperature', label: 'Temperature' },
  { key: 'score', label: 'Score' },
  { key: 'status', label: 'Status' },
  { key: 'assignedTo', label: 'Assigned To' },
] as const;
type ColumnKey = typeof ALL_COLUMNS[number]['key'];
const DEFAULT_COLUMNS: ColumnKey[] = ['phone', 'company', 'temperature', 'score', 'status', 'assignedTo'];

function ColumnPicker({ columns, onChange }: { columns: ColumnKey[]; onChange: (c: ColumnKey[]) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const toggle = (key: ColumnKey) => {
    onChange(columns.includes(key) ? columns.filter((c) => c !== key) : [...columns, key]);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-3.5 py-2 text-sm font-medium text-white/70 transition hover:bg-white/[0.08]"
      >
        <Columns3 className="h-3.5 w-3.5" />
        Columns
      </button>
      {open && (
        <div className="glass-panel absolute right-0 top-full z-20 mt-2 w-48 rounded-xl p-1.5">
          {ALL_COLUMNS.map((c) => (
            <label key={c.key} className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium text-white/70 hover:bg-white/[0.06]">
              <input type="checkbox" checked={columns.includes(c.key)} onChange={() => toggle(c.key)} className="rounded border-white/20 bg-white/[0.04] text-cyan-500 focus:ring-cyan-400/40" />
              {c.label}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Score badge ────────────────────────────────────────────────────────────────
function ScoreBadge({ score }: { score: number }) {
  const tier = score >= 50 ? 'bg-emerald-400/10 text-emerald-300 ring-emerald-400/20' : score >= 20 ? 'bg-amber-400/10 text-amber-300 ring-amber-400/20' : 'bg-white/[0.05] text-white/35 ring-white/10';
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1', tier)}>
      <Flame className="h-2.5 w-2.5" /> {score}
    </span>
  );
}

// ── Contacts Page ─────────────────────────────────────────────────────────────
export default function ContactsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [tempFilter, setTempFilter] = useState('');
  const [assigneeFilter, setAssigneeFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [minScore, setMinScore] = useState('');
  const [moreFiltersOpen, setMoreFiltersOpen] = useState(false);
  const [modal, setModal] = useState<{ open: boolean; contact?: any }>({ open: false });
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [columns, setColumns] = useState<ColumnKey[]>(DEFAULT_COLUMNS);
  const showCol = (k: ColumnKey) => columns.includes(k);

  const { data: agents = [] } = useQuery<any[]>({
    queryKey: ['team-users'],
    queryFn: async () => {
      const { data } = await api.get('/api/v1/tenants/me/users');
      return data.data;
    },
  });

  const { data, isLoading } = useQuery({
    queryKey: ['contacts', search, statusFilter, tempFilter, assigneeFilter, sourceFilter, minScore],
    queryFn: async () => {
      const { data } = await api.get('/api/v1/contacts', {
        params: {
          search: search || undefined,
          status: statusFilter || undefined,
          temperature: tempFilter || undefined,
          assignedToId: assigneeFilter || undefined,
          source: sourceFilter || undefined,
          minScore: minScore || undefined,
        },
      });
      return data;
    },
  });

  const deleteContact = useMutation({
    mutationFn: (id: string) => api.delete(`/api/v1/contacts/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['contacts'] }); setDeleteId(null); },
  });

  const total = data?.meta?.total ?? 0;

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-white/40">
          {total.toLocaleString()} {total === 1 ? 'contact' : 'contacts'}
        </p>
        <div className="flex items-center gap-2">
          <ColumnPicker columns={columns} onChange={setColumns} />
          <button
            onClick={() => setImportOpen(true)}
            className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-3.5 py-2 text-sm font-medium text-white/70 transition hover:bg-white/[0.08]"
          >
            <Upload className="h-3.5 w-3.5" />
            Import CSV
          </button>
          <button
            onClick={() => setModal({ open: true })}
            className="btn-gradient-brand flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-semibold text-white transition"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Contact
          </button>
        </div>
      </div>

      {/* Search + More Filters */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/25" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, phone…"
            className="w-full rounded-lg border border-white/10 bg-white/[0.04] py-2 pl-9 pr-4 text-sm text-white/90 placeholder:text-white/25 transition focus:border-cyan-400/50 focus:outline-none focus:ring-2 focus:ring-cyan-400/20"
          />
        </div>
        <button
          onClick={() => setMoreFiltersOpen((o) => !o)}
          className={cn(
            'flex items-center gap-1.5 rounded-lg border px-3.5 py-2 text-sm font-medium transition',
            moreFiltersOpen || sourceFilter || minScore
              ? 'border-cyan-400/30 bg-cyan-400/10 text-cyan-300'
              : 'border-white/10 bg-white/[0.04] text-white/60 hover:bg-white/[0.08]',
          )}
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          More Filters
        </button>
      </div>

      {moreFiltersOpen && (
        <div className="glass-panel flex flex-wrap items-end gap-4 rounded-xl p-4">
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wide text-white/35">Source</label>
            <input
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              placeholder="e.g. Facebook Ads"
              className="mt-1 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-sm text-white/90 placeholder:text-white/25 focus:border-cyan-400/50 focus:outline-none focus:ring-2 focus:ring-cyan-400/20"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wide text-white/35">Min Score</label>
            <input
              value={minScore}
              onChange={(e) => setMinScore(e.target.value)}
              type="number"
              placeholder="0"
              className="mt-1 w-24 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-sm text-white/90 placeholder:text-white/25 focus:border-cyan-400/50 focus:outline-none focus:ring-2 focus:ring-cyan-400/20"
            />
          </div>
          {(sourceFilter || minScore) && (
            <button
              onClick={() => { setSourceFilter(''); setMinScore(''); }}
              className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-white/45 hover:bg-white/[0.06]"
            >
              Clear
            </button>
          )}
        </div>
      )}

      {/* Filter chips — Status row */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-white/35 w-14 shrink-0">Status</span>
        <button
          onClick={() => setStatusFilter('')}
          className={cn(
            'rounded-lg border px-3 py-1.5 text-xs font-medium transition',
            statusFilter === '' ? 'border-cyan-400/30 bg-cyan-400/10 text-cyan-300' : 'border-white/10 bg-white/[0.03] text-white/45 hover:bg-white/[0.06]',
          )}
        >
          All
        </button>
        {STATUS_OPTIONS.map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(statusFilter === s ? '' : s)}
            className={cn(
              'rounded-lg border px-3 py-1.5 text-xs font-medium transition',
              statusFilter === s ? 'border-cyan-400/30 bg-cyan-400/10 text-cyan-300' : 'border-white/10 bg-white/[0.03] text-white/45 hover:bg-white/[0.06]',
            )}
          >
            {statusConfig[s].label}
          </button>
        ))}
      </div>

      {/* Filter chips — Temperature row */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-white/35 w-14 shrink-0">Temp</span>
        <button
          onClick={() => setTempFilter('')}
          className={cn(
            'rounded-lg border px-3 py-1.5 text-xs font-medium transition',
            tempFilter === '' ? 'border-cyan-400/30 bg-cyan-400/10 text-cyan-300' : 'border-white/10 bg-white/[0.03] text-white/45 hover:bg-white/[0.06]',
          )}
        >
          All
        </button>
        {TEMP_OPTIONS.map((t) => (
          <button
            key={t}
            onClick={() => setTempFilter(tempFilter === t ? '' : t)}
            className={cn(
              'rounded-lg border px-3 py-1.5 text-xs font-semibold transition',
              tempFilter === t ? tempConfig[t].chip : 'border-white/10 bg-white/[0.03] text-white/45 hover:bg-white/[0.06]',
            )}
          >
            {tempConfig[t].emoji} {tempConfig[t].label}
          </button>
        ))}
      </div>

      {/* Filter chips — Assigned To row */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-white/35 w-14 shrink-0">Owner</span>
        <button
          onClick={() => setAssigneeFilter('')}
          className={cn(
            'rounded-lg border px-3 py-1.5 text-xs font-medium transition',
            assigneeFilter === '' ? 'border-cyan-400/30 bg-cyan-400/10 text-cyan-300' : 'border-white/10 bg-white/[0.03] text-white/45 hover:bg-white/[0.06]',
          )}
        >
          All
        </button>
        <button
          onClick={() => setAssigneeFilter(assigneeFilter === 'unassigned' ? '' : 'unassigned')}
          className={cn(
            'rounded-lg border px-3 py-1.5 text-xs font-medium transition',
            assigneeFilter === 'unassigned' ? 'border-amber-400/30 bg-amber-400/10 text-amber-300' : 'border-white/10 bg-white/[0.03] text-white/45 hover:bg-white/[0.06]',
          )}
        >
          Unassigned
        </button>
        {agents.map((a: any) => (
          <button
            key={a.id}
            onClick={() => setAssigneeFilter(assigneeFilter === a.id ? '' : a.id)}
            className={cn(
              'rounded-lg border px-3 py-1.5 text-xs font-medium transition',
              assigneeFilter === a.id ? 'border-cyan-400/30 bg-cyan-400/10 text-cyan-300' : 'border-white/10 bg-white/[0.03] text-white/45 hover:bg-white/[0.06]',
            )}
          >
            {a.firstName} {a.lastName}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="glass-panel overflow-hidden rounded-xl">
        {isLoading ? (
          <div className="space-y-0 divide-y divide-white/[0.06]">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-3.5 animate-pulse">
                <div className="h-8 w-8 rounded-full bg-white/[0.06]" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3.5 w-36 rounded bg-white/[0.06]" />
                  <div className="h-3 w-24 rounded bg-white/[0.06]" />
                </div>
                <div className="h-3 w-20 rounded bg-white/[0.06]" />
                <div className="h-5 w-16 rounded-full bg-white/[0.06]" />
              </div>
            ))}
          </div>
        ) : !data?.data?.length ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/[0.05]">
              <Users className="h-5 w-5 text-white/30" />
            </div>
            <div>
              <p className="text-sm font-medium text-white/75">
                {search || statusFilter || tempFilter || assigneeFilter ? 'No contacts match your filter' : 'No contacts yet'}
              </p>
              <p className="mt-0.5 text-xs text-white/35">
                {search || statusFilter || tempFilter || assigneeFilter
                  ? 'Try adjusting your search or filters'
                  : 'Add your first contact to get started'}
              </p>
            </div>
            {!search && !statusFilter && !tempFilter && !assigneeFilter && (
              <button
                onClick={() => setModal({ open: true })}
                className="btn-gradient-brand mt-1 rounded-lg px-4 py-2 text-sm font-semibold text-white"
              >
                Add Contact
              </button>
            )}
          </div>
        ) : (
          <table className="min-w-full divide-y divide-white/[0.06]">
            <thead>
              <tr className="bg-white/[0.02]">
                <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-white/35">Name</th>
                {ALL_COLUMNS.filter((c) => showCol(c.key)).map((c) => (
                  <th key={c.key} className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-white/35">
                    {c.label}
                  </th>
                ))}
                <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-white/35" />
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06]">
              {data.data.map((contact: any) => {
                const initials = getInitials(contact.name);
                const colClass = avatarColor(contact.name ?? 'A');
                const temp = contact.temperature as Temperature | null;
                return (
                  <tr key={contact.id} className="group transition-colors hover:bg-white/[0.03]">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${colClass}`}>
                          {initials}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white/90">
                            {contact.name}
                          </p>
                          {contact.email && <p className="text-xs text-white/35">{contact.email}</p>}
                        </div>
                      </div>
                    </td>
                    {showCol('phone') && <td className="px-5 py-3.5 text-sm text-white/60">{contact.phone}</td>}
                    {showCol('company') && (
                      <td className="px-5 py-3.5 text-sm text-white/50">
                        {contact.company || <span className="text-white/20">—</span>}
                      </td>
                    )}
                    {showCol('source') && (
                      <td className="px-5 py-3.5 text-sm text-white/50">
                        {contact.source || <span className="text-white/20">—</span>}
                      </td>
                    )}
                    {showCol('temperature') && (
                      <td className="px-5 py-3.5">
                        {temp ? (
                          <span className={cn('inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold', tempConfig[temp].pill)}>
                            {tempConfig[temp].emoji} {tempConfig[temp].label}
                          </span>
                        ) : (
                          <span className="text-white/20 text-xs">—</span>
                        )}
                      </td>
                    )}
                    {showCol('score') && (
                      <td className="px-5 py-3.5">
                        <ScoreBadge score={contact.score ?? 0} />
                      </td>
                    )}
                    {showCol('status') && (
                      <td className="px-5 py-3.5">
                        <span className={cn('inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold', statusConfig[contact.status]?.pill ?? 'bg-white/[0.06] text-white/40')}>
                          {statusConfig[contact.status]?.label ?? contact.status}
                        </span>
                      </td>
                    )}
                    {showCol('assignedTo') && (
                      <td className="px-5 py-3.5">
                        {contact.assignedTo ? (
                          <span className="inline-flex items-center gap-1.5 text-sm text-white/70">
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-cyan-400/15 text-[9px] font-bold text-cyan-300">
                              {getInitials(`${contact.assignedTo.firstName} ${contact.assignedTo.lastName ?? ''}`)}
                            </span>
                            {contact.assignedTo.firstName} {contact.assignedTo.lastName}
                          </span>
                        ) : (
                          <span className="inline-flex rounded-full bg-white/[0.06] px-2.5 py-0.5 text-[11px] font-semibold text-white/35 ring-1 ring-white/10">
                            Unassigned
                          </span>
                        )}
                      </td>
                    )}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                        {/* Inline temperature quick-set */}
                        <TempToggle contact={contact} />
                        <div className="h-3.5 w-px bg-white/10" />
                        <Link
                          href={`/dashboard/contacts/${contact.id}`}
                          className="rounded-md px-2.5 py-1 text-xs font-medium text-cyan-300 hover:bg-cyan-400/10"
                        >
                          View
                        </Link>
                        <button
                          onClick={() => setModal({ open: true, contact })}
                          className="rounded-md p-1.5 text-white/35 hover:bg-white/[0.08] hover:text-white/70"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteId(contact.id)}
                          className="rounded-md p-1.5 text-white/35 hover:bg-red-400/10 hover:text-red-300"
                        >
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

      <ContactFormModal
        open={modal.open}
        onClose={() => setModal({ open: false })}
        contact={modal.contact}
      />

      <CsvImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={() => qc.invalidateQueries({ queryKey: ['contacts'] })}
      />

      <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title="Delete Contact" size="sm">
        <p className="text-sm text-white/45">This will permanently delete the contact and cannot be undone.</p>
        <div className="mt-5 flex justify-end gap-3">
          <button onClick={() => setDeleteId(null)} className="rounded-lg border border-white/10 px-4 py-2 text-sm font-medium text-white/60 hover:bg-white/[0.06]">
            Cancel
          </button>
          <button
            onClick={() => deleteId && deleteContact.mutate(deleteId)}
            disabled={deleteContact.isPending}
            className="rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white hover:bg-red-400 disabled:opacity-50"
          >
            {deleteContact.isPending ? 'Deleting…' : 'Delete Contact'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
