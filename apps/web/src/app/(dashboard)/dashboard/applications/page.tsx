'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import Link from 'next/link';
import { Plus, Search, ChevronRight, GraduationCap, Settings2 } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const APPLICATION_STATUSES = ['SUBMITTED', 'UNDER_REVIEW', 'SHORTLISTED', 'OFFERED', 'ENROLLED', 'REJECTED'] as const;

const statusConfig: Record<string, { label: string; pill: string }> = {
  SUBMITTED:    { label: 'Submitted',    pill: 'bg-blue-50 text-blue-700 ring-1 ring-blue-100'       },
  UNDER_REVIEW: { label: 'Under Review', pill: 'bg-amber-50 text-amber-700 ring-1 ring-amber-100'    },
  SHORTLISTED:  { label: 'Shortlisted',  pill: 'bg-violet-50 text-violet-700 ring-1 ring-violet-100' },
  OFFERED:      { label: 'Offered',      pill: 'bg-cyan-50 text-cyan-700 ring-1 ring-cyan-100'       },
  ENROLLED:     { label: 'Enrolled',     pill: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100' },
  REJECTED:     { label: 'Rejected',     pill: 'bg-red-50 text-red-600 ring-1 ring-red-100'          },
};

const FUNNEL_LABELS: Record<string, string> = {
  SUBMITTED: 'Submitted',
  UNDER_REVIEW: 'Under Review',
  SHORTLISTED: 'Shortlisted',
  OFFERED: 'Offered',
  ENROLLED: 'Enrolled',
};

const inputCls =
  'mt-1 block w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20';

// ── Funnel strip ──────────────────────────────────────────────────────────────
function FunnelStrip() {
  const { data, isLoading } = useQuery({
    queryKey: ['applications-funnel'],
    queryFn: async () => {
      const { data } = await api.get('/api/v1/applications/funnel');
      return data.data;
    },
  });

  const stages = data?.funnel ?? [];
  const total = data?.total ?? 0;

  const cards = [
    { label: 'Total', count: total, accent: 'text-gray-900' },
    ...stages.map((s: any) => ({ label: FUNNEL_LABELS[s.stage] ?? s.stage, count: s.count, accent: 'text-indigo-600' })),
  ];

  if (isLoading) {
    return (
      <div className="flex gap-3 overflow-x-auto">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-20 w-36 shrink-0 animate-pulse rounded-xl border border-gray-100 bg-white shadow-sm" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1">
      {cards.map((c, i) => (
        <div key={c.label} className="flex items-center gap-2">
          <div className="w-36 shrink-0 rounded-xl border border-gray-100 bg-white px-4 py-3 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{c.label}</p>
            <p className={cn('mt-1 text-xl font-bold', c.accent)}>{c.count.toLocaleString()}</p>
          </div>
          {i < cards.length - 1 && <ChevronRight className="h-4 w-4 shrink-0 text-gray-300" />}
        </div>
      ))}
    </div>
  );
}

// ── Searchable contact select ─────────────────────────────────────────────────
function ContactSelect({ value, onChange }: { value: { id: string; label: string } | null; onChange: (v: { id: string; label: string } | null) => void }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);

  const { data } = useQuery({
    queryKey: ['contacts-search', query],
    queryFn: async () => {
      const { data } = await api.get('/api/v1/contacts', { params: { search: query || undefined, limit: 10 } });
      return data.data;
    },
    enabled: open,
  });

  return (
    <div className="relative">
      <input
        value={value ? value.label : query}
        onChange={(e) => { onChange(null); setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Search contact by name or phone…"
        className={inputCls}
      />
      {open && (data || []).length > 0 && (
        <div className="absolute z-10 mt-1 max-h-52 w-full overflow-y-auto rounded-lg border border-gray-100 bg-white py-1 shadow-lg">
          {(data || []).map((c: any) => (
            <button
              key={c.id}
              type="button"
              onMouseDown={() => {
                onChange({ id: c.id, label: c.name + (c.phone ? ` — ${c.phone}` : '') });
                setOpen(false);
              }}
              className="block w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-indigo-50"
            >
              {c.name}
              {c.phone && <span className="text-gray-400"> — {c.phone}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── New Application Modal ─────────────────────────────────────────────────────
const applicationSchema = z.object({
  contactId: z.string().min(1, 'Select a contact'),
  programId: z.string().min(1, 'Select a program'),
  notes: z.string().optional(),
});

type ApplicationForm = z.infer<typeof applicationSchema>;

function CreateApplicationModal({ open, onClose, programs }: { open: boolean; onClose: () => void; programs: any[] }) {
  const qc = useQueryClient();
  const [contact, setContact] = useState<{ id: string; label: string } | null>(null);

  const { register, handleSubmit, reset, setValue, formState: { errors, isSubmitting } } = useForm<ApplicationForm>({
    resolver: zodResolver(applicationSchema),
  });

  const create = useMutation({
    mutationFn: (data: ApplicationForm) => api.post('/api/v1/applications', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['applications'] });
      qc.invalidateQueries({ queryKey: ['applications-funnel'] });
      reset();
      setContact(null);
      onClose();
    },
  });

  return (
    <Modal open={open} onClose={() => { onClose(); setContact(null); }} title="New Application">
      <form
        onSubmit={handleSubmit((d) => create.mutate(d))}
        className="space-y-4"
      >
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Applicant <span className="text-red-400">*</span>
          </label>
          <ContactSelect
            value={contact}
            onChange={(v) => { setContact(v); setValue('contactId', v?.id ?? ''); }}
          />
          {errors.contactId && <p className="mt-1 text-xs text-red-500">{errors.contactId.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Program <span className="text-red-400">*</span>
          </label>
          <select {...register('programId')} className={inputCls}>
            <option value="">Select a program</option>
            {programs.filter((p: any) => p.isActive).map((p: any) => (
              <option key={p.id} value={p.id}>{p.code} — {p.name}</option>
            ))}
          </select>
          {errors.programId && <p className="mt-1 text-xs text-red-500">{errors.programId.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Notes</label>
          <textarea {...register('notes')} rows={3} className={inputCls} />
        </div>

        {create.isError && <p className="text-sm text-red-500">Failed to create application.</p>}

        <div className="flex justify-end gap-3 pt-1">
          <button type="button" onClick={() => { onClose(); setContact(null); }} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">
            Cancel
          </button>
          <button type="submit" disabled={isSubmitting || create.isPending} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50">
            {create.isPending ? 'Creating…' : 'Create Application'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ── Application Detail Modal ──────────────────────────────────────────────────
function ApplicationDetailModal({ application, onClose }: { application: any; onClose: () => void }) {
  const qc = useQueryClient();
  const [status, setStatus] = useState(application.status);
  const [notes, setNotes] = useState(application.notes ?? '');

  const update = useMutation({
    mutationFn: () => api.patch(`/api/v1/applications/${application.id}`, { status, notes }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['applications'] });
      qc.invalidateQueries({ queryKey: ['applications-funnel'] });
      onClose();
    },
  });

  return (
    <Modal open={!!application} onClose={onClose} title={application.appNumber}>
      <div className="space-y-4">
        <div className="rounded-lg border border-gray-100 bg-gray-50/60 px-4 py-3">
          <p className="text-sm font-medium text-gray-900">
            {application.contact?.name}
          </p>
          <p className="text-xs text-gray-400">{application.contact?.phone}{application.contact?.email && ` · ${application.contact.email}`}</p>
          <p className="mt-1 text-xs text-gray-500">{application.program?.code} — {application.program?.name}</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Status</label>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputCls}>
            {APPLICATION_STATUSES.map((s) => (
              <option key={s} value={s}>{statusConfig[s].label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Notes</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} className={inputCls} />
        </div>

        {update.isError && <p className="text-sm text-red-500">Failed to update application.</p>}

        <div className="flex justify-end gap-3 pt-1">
          <button type="button" onClick={onClose} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">
            Cancel
          </button>
          <button
            onClick={() => update.mutate()}
            disabled={update.isPending}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
          >
            {update.isPending ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ── Applications Page ─────────────────────────────────────────────────────────
export default function ApplicationsPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [programFilter, setProgramFilter] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [selected, setSelected] = useState<any>(null);

  const { data: programsData } = useQuery({
    queryKey: ['programs-all'],
    queryFn: async () => {
      const { data } = await api.get('/api/v1/programs', { params: { limit: 100 } });
      return data.data;
    },
  });
  const programs = programsData ?? [];

  const { data, isLoading } = useQuery({
    queryKey: ['applications', search, statusFilter, programFilter],
    queryFn: async () => {
      const { data } = await api.get('/api/v1/applications', {
        params: {
          search: search || undefined,
          status: statusFilter || undefined,
          programId: programFilter || undefined,
          limit: 50,
        },
      });
      return data;
    },
  });

  const applications = data?.data ?? [];
  const total = data?.meta?.total ?? 0;

  return (
    <div className="space-y-5">
      {/* Funnel */}
      <FunnelStrip />

      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-gray-400">
          {total.toLocaleString()} {total === 1 ? 'application' : 'applications'}
        </p>
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/applications/programs"
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-sm font-medium text-gray-600 shadow-sm transition hover:bg-gray-50"
          >
            <Settings2 className="h-3.5 w-3.5" />
            Manage Programs
          </Link>
          <button
            onClick={() => setCreateOpen(true)}
            className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500"
          >
            <Plus className="h-3.5 w-3.5" />
            New Application
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, mobile, or app number…"
          className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-4 text-sm text-gray-900 shadow-sm transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        >
          <option value="">All statuses</option>
          {APPLICATION_STATUSES.map((s) => (
            <option key={s} value={s}>{statusConfig[s].label}</option>
          ))}
        </select>
        <select
          value={programFilter}
          onChange={(e) => setProgramFilter(e.target.value)}
          className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        >
          <option value="">All programs</option>
          {programs.map((p: any) => (
            <option key={p.id} value={p.id}>{p.code} — {p.name}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
        {isLoading ? (
          <div className="space-y-0 divide-y divide-gray-50">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-3.5 animate-pulse">
                <div className="h-3.5 w-24 rounded bg-gray-100" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3.5 w-36 rounded bg-gray-100" />
                  <div className="h-3 w-24 rounded bg-gray-100" />
                </div>
                <div className="h-5 w-20 rounded-full bg-gray-100" />
              </div>
            ))}
          </div>
        ) : !applications.length ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100">
              <GraduationCap className="h-5 w-5 text-gray-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">
                {search || statusFilter || programFilter ? 'No applications match your filter' : 'No applications yet'}
              </p>
              <p className="mt-0.5 text-xs text-gray-400">
                {search || statusFilter || programFilter ? 'Try adjusting your search or filters' : 'Create the first application to get started'}
              </p>
            </div>
            {!search && !statusFilter && !programFilter && (
              <button
                onClick={() => setCreateOpen(true)}
                className="mt-1 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
              >
                New Application
              </button>
            )}
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-50">
            <thead>
              <tr className="bg-gray-50/70">
                {['App #', 'Applicant', 'Program', 'Status', 'Submitted', ''].map((h) => (
                  <th key={h} className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {applications.map((a: any) => (
                <tr
                  key={a.id}
                  onClick={() => setSelected(a)}
                  className="group cursor-pointer hover:bg-slate-50/60 transition-colors"
                >
                  <td className="px-5 py-3.5 text-sm font-medium text-gray-900">{a.appNumber}</td>
                  <td className="px-5 py-3.5">
                    <p className="text-sm font-medium text-gray-900">{a.contact?.name}</p>
                    <p className="text-xs text-gray-400">{a.contact?.phone}</p>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-gray-500">{a.program?.code} — {a.program?.name}</td>
                  <td className="px-5 py-3.5">
                    <span className={cn('inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold', statusConfig[a.status]?.pill ?? 'bg-gray-100 text-gray-500')}>
                      {statusConfig[a.status]?.label ?? a.status}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-gray-500">
                    {new Date(a.submittedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <ChevronRight className="ml-auto h-4 w-4 text-gray-300 opacity-0 transition-opacity group-hover:opacity-100" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <CreateApplicationModal open={createOpen} onClose={() => setCreateOpen(false)} programs={programs} />
      {selected && <ApplicationDetailModal application={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
