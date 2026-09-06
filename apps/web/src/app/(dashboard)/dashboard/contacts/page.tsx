'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useState, useRef, useEffect } from 'react';
import { Plus, Search, Pencil, Trash2, Upload, Users, SlidersHorizontal, Columns3, Flame, BarChart3 } from 'lucide-react';
import Link from 'next/link';
import { Modal } from '@/components/ui/Modal';
import { CsvImportModal } from '@/components/ui/CsvImportModal';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { cn, getInitials } from '@/lib/utils';

const STATUS_OPTIONS = ['LEAD', 'PROSPECT', 'CUSTOMER', 'CHURNED', 'BLOCKED'] as const;

const statusConfig: Record<string, { label: string; pill: string }> = {
  LEAD:     { label: 'Lead',     pill: 'bg-blue-50 text-blue-700 ring-1 ring-blue-100'     },
  PROSPECT: { label: 'Prospect', pill: 'bg-violet-50 text-violet-700 ring-1 ring-violet-100' },
  CUSTOMER: { label: 'Customer', pill: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100' },
  CHURNED:  { label: 'Churned',  pill: 'bg-gray-100 text-gray-500 ring-1 ring-gray-200'     },
  BLOCKED:  { label: 'Blocked',  pill: 'bg-red-50 text-red-700 ring-1 ring-red-100'         },
};

// ── Temperature config ────────────────────────────────────────────────────────
const TEMP_OPTIONS = ['HOT', 'WARM', 'COLD'] as const;
type Temperature = typeof TEMP_OPTIONS[number];

const tempConfig: Record<Temperature, { label: string; emoji: string; pill: string; chip: string }> = {
  HOT:  { label: 'Hot',  emoji: '🔥', pill: 'bg-orange-50 text-orange-700 ring-1 ring-orange-100', chip: 'border-orange-200 bg-orange-50 text-orange-700' },
  WARM: { label: 'Warm', emoji: '☀️', pill: 'bg-amber-50 text-amber-700 ring-1 ring-amber-100',   chip: 'border-amber-200 bg-amber-50 text-amber-700'   },
  COLD: { label: 'Cold', emoji: '❄️', pill: 'bg-sky-50 text-sky-700 ring-1 ring-sky-100',         chip: 'border-sky-200 bg-sky-50 text-sky-700'         },
};

// ── Avatar colors ─────────────────────────────────────────────────────────────
const avatarColors = [
  'bg-cyan-50 text-cyan-700',
  'bg-violet-50 text-violet-700',
  'bg-emerald-50 text-emerald-700',
  'bg-amber-50 text-amber-700',
  'bg-rose-50 text-rose-700',
  'bg-blue-50 text-blue-700',
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
      <label className="block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="ml-0.5 text-red-400">*</span>}
      </label>
      <div className="mt-1">{children}</div>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

const inputCls =
  'block w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm transition placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20';

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
              : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50',
          )}
        >
          {tempConfig[t].emoji} {tempConfig[t].label}
        </button>
      ))}
      {value && (
        <button
          type="button"
          onClick={() => onChange(null)}
          className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs text-gray-400 hover:bg-gray-50"
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
            <label className="block text-sm font-medium text-gray-700 mb-2">Lead Temperature</label>
            <TemperaturePicker
              value={temperature as Temperature | null}
              onChange={(v) => setValue('temperature', v)}
            />
          </div>
        </div>

        {save.isError && <p className="text-sm text-red-500">Failed to save. Please try again.</p>}

        <div className="flex justify-end gap-3 pt-1">
          <button type="button" onClick={onClose} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">
            Cancel
          </button>
          <button type="submit" disabled={isSubmitting || save.isPending} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50">
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
              : 'bg-gray-50 text-gray-300 ring-gray-200 hover:ring-gray-300 hover:text-gray-500',
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
        className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50"
      >
        <Columns3 className="h-3.5 w-3.5" />
        Columns
      </button>
      {open && (
        <div className="absolute right-0 top-full z-20 mt-2 w-48 rounded-xl bg-white p-1.5 shadow-lg ring-1 ring-gray-100">
          {ALL_COLUMNS.map((c) => (
            <label key={c.key} className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50">
              <input type="checkbox" checked={columns.includes(c.key)} onChange={() => toggle(c.key)} className="rounded border-gray-300 text-blue-600 focus:ring-blue-500/40" />
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
  const tier = score >= 50 ? 'bg-emerald-50 text-emerald-700 ring-emerald-100' : score >= 20 ? 'bg-amber-50 text-amber-700 ring-amber-100' : 'bg-gray-100 text-gray-500 ring-gray-200';
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1', tier)}>
      <Flame className="h-2.5 w-2.5" /> {score}
    </span>
  );
}

// ── Lead Overview report ──────────────────────────────────────────────────────
const RANGE_OPTIONS = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This week' },
  { value: 'month', label: 'This month' },
  { value: 'all', label: 'All time' },
] as const;

const statusBarColor: Record<string, string> = {
  LEAD: '#60a5fa',
  PROSPECT: '#a78bfa',
  CUSTOMER: '#34d399',
  CHURNED: '#d1d5db',
  BLOCKED: '#f87171',
};

const SOURCE_PALETTE = ['#10b981', '#6366f1', '#0ea5e9', '#f59e0b', '#ec4899', '#8b5cf6', '#3b82f6', '#fb923c'];

function OverviewStat({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="rounded-lg bg-gray-50 p-3.5 text-center">
      <p className="text-xl font-bold" style={{ color }}>{value}</p>
      <p className="mt-0.5 text-[11px] uppercase tracking-wide text-gray-400">{label}</p>
    </div>
  );
}

function SegmentedBar({ segments }: { segments: { label: string; count: number; color: string }[] }) {
  const total = segments.reduce((s, seg) => s + seg.count, 0);
  return (
    <div className="flex h-2 overflow-hidden rounded-full bg-gray-100">
      {segments.map((seg) =>
        seg.count > 0 ? (
          <div key={seg.label} style={{ width: `${(seg.count / (total || 1)) * 100}%`, backgroundColor: seg.color }} />
        ) : null,
      )}
    </div>
  );
}

function LeadOverview() {
  const [range, setRange] = useState<string>('all');

  const { data, isLoading } = useQuery({
    queryKey: ['contacts-overview', range],
    queryFn: async () => {
      const { data } = await api.get('/api/v1/contacts/overview', { params: { range } });
      return data.data as {
        total: number; converted: number; unassigned: number; overdueTasks: number;
        conversionRate: number; sourceCount: number;
        byStatus: { status: string; count: number }[];
        bySource: { source: string; count: number }[];
        dailyNewLeads: { date: string; label: string; count: number }[];
      };
    },
  });

  if (isLoading || !data) {
    return <div className="h-56 animate-pulse rounded-xl bg-white shadow-sm ring-1 ring-gray-100" />;
  }

  const statusSegments = data.byStatus.map((s) => ({
    label: statusConfig[s.status]?.label ?? s.status,
    count: s.count,
    color: statusBarColor[s.status] ?? '#d1d5db',
  }));
  const sourceSegments = data.bySource.map((s, i) => ({
    label: s.source,
    count: s.count,
    color: SOURCE_PALETTE[i % SOURCE_PALETTE.length],
  }));
  const maxDaily = Math.max(1, ...data.dailyNewLeads.map((d) => d.count));

  return (
    <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Lead Overview</p>
        <div className="flex gap-1 rounded-lg bg-gray-100 p-0.5">
          {RANGE_OPTIONS.map((r) => (
            <button
              key={r.value}
              onClick={() => setRange(r.value)}
              className={cn(
                'rounded-md px-2.5 py-1 text-xs font-medium transition',
                range === r.value ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700',
              )}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2.5 sm:grid-cols-6">
        <OverviewStat label="Total" value={data.total} color="#111827" />
        <OverviewStat label="Converted" value={data.converted} color="#059669" />
        <OverviewStat label="Overdue" value={data.overdueTasks} color="#dc2626" />
        <OverviewStat label="Unassigned" value={data.unassigned} color="#d97706" />
        <OverviewStat label="Conv. rate" value={`${data.conversionRate}%`} color="#4f46e5" />
        <OverviewStat label="Sources" value={data.sourceCount} color="#7c3aed" />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400">By Status</p>
          <SegmentedBar segments={statusSegments} />
          <ul className="mt-2 space-y-1">
            {statusSegments.map((s) => (
              <li key={s.label} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-gray-500">
                  <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: s.color }} />
                  {s.label}
                </span>
                <span className="text-gray-700">{s.count}</span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400">By Source</p>
          <SegmentedBar segments={sourceSegments} />
          <ul className="mt-2 max-h-32 space-y-1 overflow-y-auto pr-1">
            {sourceSegments.slice(0, 6).map((s) => (
              <li key={s.label} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 truncate text-gray-500">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: s.color }} />
                  <span className="truncate">{s.label}</span>
                </span>
                <span className="shrink-0 text-gray-700">{s.count}</span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400">Daily New Leads</p>
          <div className="flex h-24 items-end gap-1.5">
            {data.dailyNewLeads.map((d) => (
              <div key={d.date} className="flex flex-1 flex-col items-center gap-1">
                <div className="flex h-16 w-full items-end">
                  <div
                    className="w-full rounded-t bg-blue-400"
                    style={{ height: `${(d.count / maxDaily) * 100}%`, minHeight: d.count > 0 ? '3px' : '0' }}
                    title={`${d.count} leads`}
                  />
                </div>
                <span className="text-[10px] text-gray-400">{d.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
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
  const [reportOpen, setReportOpen] = useState(true);
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
        <p className="text-sm text-gray-500">
          {total.toLocaleString()} {total === 1 ? 'contact' : 'contacts'}
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setReportOpen((o) => !o)}
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50"
          >
            <BarChart3 className="h-3.5 w-3.5" />
            {reportOpen ? 'Hide report' : 'Show report'}
          </button>
          <ColumnPicker columns={columns} onChange={setColumns} />
          <button
            onClick={() => setImportOpen(true)}
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50"
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

      {reportOpen && <LeadOverview />}

      {/* Search + More Filters */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-300" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, phone…"
            className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-4 text-sm text-gray-900 placeholder:text-gray-400 transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>
        <button
          onClick={() => setMoreFiltersOpen((o) => !o)}
          className={cn(
            'flex items-center gap-1.5 rounded-lg border px-3.5 py-2 text-sm font-medium transition',
            moreFiltersOpen || sourceFilter || minScore
              ? 'border-blue-200 bg-blue-50 text-blue-700'
              : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50',
          )}
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          More Filters
        </button>
      </div>

      {moreFiltersOpen && (
        <div className="flex flex-wrap items-end gap-4 rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wide text-gray-400">Source</label>
            <input
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              placeholder="e.g. Facebook Ads"
              className="mt-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wide text-gray-400">Min Score</label>
            <input
              value={minScore}
              onChange={(e) => setMinScore(e.target.value)}
              type="number"
              placeholder="0"
              className="mt-1 w-24 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
          {(sourceFilter || minScore) && (
            <button
              onClick={() => { setSourceFilter(''); setMinScore(''); }}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-50"
            >
              Clear
            </button>
          )}
        </div>
      )}

      {/* Filter chips — Status row */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 w-14 shrink-0">Status</span>
        <button
          onClick={() => setStatusFilter('')}
          className={cn(
            'rounded-lg border px-3 py-1.5 text-xs font-medium transition',
            statusFilter === '' ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50',
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
              statusFilter === s ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50',
            )}
          >
            {statusConfig[s].label}
          </button>
        ))}
      </div>

      {/* Filter chips — Temperature row */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 w-14 shrink-0">Temp</span>
        <button
          onClick={() => setTempFilter('')}
          className={cn(
            'rounded-lg border px-3 py-1.5 text-xs font-medium transition',
            tempFilter === '' ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50',
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
              tempFilter === t ? tempConfig[t].chip : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50',
            )}
          >
            {tempConfig[t].emoji} {tempConfig[t].label}
          </button>
        ))}
      </div>

      {/* Filter chips — Assigned To row */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 w-14 shrink-0">Owner</span>
        <button
          onClick={() => setAssigneeFilter('')}
          className={cn(
            'rounded-lg border px-3 py-1.5 text-xs font-medium transition',
            assigneeFilter === '' ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50',
          )}
        >
          All
        </button>
        <button
          onClick={() => setAssigneeFilter(assigneeFilter === 'unassigned' ? '' : 'unassigned')}
          className={cn(
            'rounded-lg border px-3 py-1.5 text-xs font-medium transition',
            assigneeFilter === 'unassigned' ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50',
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
              assigneeFilter === a.id ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50',
            )}
          >
            {a.firstName} {a.lastName}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-100">
        {isLoading ? (
          <div className="space-y-0 divide-y divide-gray-100">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-3.5 animate-pulse">
                <div className="h-8 w-8 rounded-full bg-gray-100" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3.5 w-36 rounded bg-gray-100" />
                  <div className="h-3 w-24 rounded bg-gray-100" />
                </div>
                <div className="h-3 w-20 rounded bg-gray-100" />
                <div className="h-5 w-16 rounded-full bg-gray-100" />
              </div>
            ))}
          </div>
        ) : !data?.data?.length ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100">
              <Users className="h-5 w-5 text-gray-300" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">
                {search || statusFilter || tempFilter || assigneeFilter ? 'No contacts match your filter' : 'No contacts yet'}
              </p>
              <p className="mt-0.5 text-xs text-gray-400">
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
          <table className="min-w-full divide-y divide-gray-100">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">Name</th>
                {ALL_COLUMNS.filter((c) => showCol(c.key)).map((c) => (
                  <th key={c.key} className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                    {c.label}
                  </th>
                ))}
                <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.data.map((contact: any) => {
                const initials = getInitials(contact.name);
                const colClass = avatarColor(contact.name ?? 'A');
                const temp = contact.temperature as Temperature | null;
                return (
                  <tr key={contact.id} className="group transition-colors hover:bg-gray-50/60">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${colClass}`}>
                          {initials}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {contact.name}
                          </p>
                          {contact.email && <p className="text-xs text-gray-400">{contact.email}</p>}
                        </div>
                      </div>
                    </td>
                    {showCol('phone') && <td className="px-5 py-3.5 text-sm text-gray-600">{contact.phone}</td>}
                    {showCol('company') && (
                      <td className="px-5 py-3.5 text-sm text-gray-500">
                        {contact.company || <span className="text-gray-300">—</span>}
                      </td>
                    )}
                    {showCol('source') && (
                      <td className="px-5 py-3.5 text-sm text-gray-500">
                        {contact.source || <span className="text-gray-300">—</span>}
                      </td>
                    )}
                    {showCol('temperature') && (
                      <td className="px-5 py-3.5">
                        {temp ? (
                          <span className={cn('inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold', tempConfig[temp].pill)}>
                            {tempConfig[temp].emoji} {tempConfig[temp].label}
                          </span>
                        ) : (
                          <span className="text-gray-300 text-xs">—</span>
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
                        <span className={cn('inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold', statusConfig[contact.status]?.pill ?? 'bg-gray-100 text-gray-500')}>
                          {statusConfig[contact.status]?.label ?? contact.status}
                        </span>
                      </td>
                    )}
                    {showCol('assignedTo') && (
                      <td className="px-5 py-3.5">
                        {contact.assignedTo ? (
                          <span className="inline-flex items-center gap-1.5 text-sm text-gray-700">
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-cyan-50 text-[9px] font-bold text-cyan-700">
                              {getInitials(`${contact.assignedTo.firstName} ${contact.assignedTo.lastName ?? ''}`)}
                            </span>
                            {contact.assignedTo.firstName} {contact.assignedTo.lastName}
                          </span>
                        ) : (
                          <span className="inline-flex rounded-full bg-gray-100 px-2.5 py-0.5 text-[11px] font-semibold text-gray-500 ring-1 ring-gray-200">
                            Unassigned
                          </span>
                        )}
                      </td>
                    )}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                        {/* Inline temperature quick-set */}
                        <TempToggle contact={contact} />
                        <div className="h-3.5 w-px bg-gray-200" />
                        <Link
                          href={`/dashboard/contacts/${contact.id}`}
                          className="rounded-md px-2.5 py-1 text-xs font-medium text-blue-700 hover:bg-blue-50"
                        >
                          View
                        </Link>
                        <button
                          onClick={() => setModal({ open: true, contact })}
                          className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteId(contact.id)}
                          className="rounded-md p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500"
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
        <p className="text-sm text-gray-500">This will permanently delete the contact and cannot be undone.</p>
        <div className="mt-5 flex justify-end gap-3">
          <button onClick={() => setDeleteId(null)} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">
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
