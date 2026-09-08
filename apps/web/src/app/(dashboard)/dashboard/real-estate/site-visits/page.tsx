'use client';

import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { MapPin, Plus, Pencil, Trash2, List, Map as MapIcon } from 'lucide-react';
import api from '@/lib/api';
import { Modal } from '@/components/ui/Modal';
import { GoogleMap, type MapMarker } from '@/components/ui/GoogleMap';
import { cn } from '@/lib/utils';

const STATUS_OPTIONS = ['SCHEDULED', 'ON_THE_WAY', 'AT_SITE', 'VISITING', 'VISIT_DONE', 'RETURNING', 'COMPLETED', 'CANCELLED', 'NO_SHOW'] as const;

const STATUS_LABELS: Record<string, string> = {
  SCHEDULED: 'Scheduled', ON_THE_WAY: 'On the way', AT_SITE: 'At Site', VISITING: 'Visiting',
  VISIT_DONE: 'Visit Done', RETURNING: 'Returning', COMPLETED: 'Completed', CANCELLED: 'Cancelled', NO_SHOW: 'No Show',
};

const STATUS_COLORS: Record<string, string> = {
  SCHEDULED: '#6366f1', ON_THE_WAY: '#f59e0b', AT_SITE: '#8b5cf6', VISITING: '#ec4899',
  VISIT_DONE: '#10b981', RETURNING: '#06b6d4', COMPLETED: '#10b981', CANCELLED: '#9ca3af', NO_SHOW: '#ef4444',
};

const statusPill: Record<string, string> = {
  SCHEDULED: 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100',
  ON_THE_WAY: 'bg-amber-50 text-amber-700 ring-1 ring-amber-100',
  AT_SITE: 'bg-violet-50 text-violet-700 ring-1 ring-violet-100',
  VISITING: 'bg-pink-50 text-pink-700 ring-1 ring-pink-100',
  VISIT_DONE: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100',
  RETURNING: 'bg-cyan-50 text-cyan-700 ring-1 ring-cyan-100',
  COMPLETED: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100',
  CANCELLED: 'bg-gray-100 text-gray-500 ring-1 ring-gray-200',
  NO_SHOW: 'bg-red-50 text-red-700 ring-1 ring-red-100',
};

// Status advances in this order; agents/managers step forward one stage at a time.
const NEXT_STATUS: Record<string, string | null> = {
  SCHEDULED: 'ON_THE_WAY', ON_THE_WAY: 'AT_SITE', AT_SITE: 'VISITING', VISITING: 'VISIT_DONE',
  VISIT_DONE: 'RETURNING', RETURNING: 'COMPLETED', COMPLETED: null, CANCELLED: null, NO_SHOW: null,
};

const inputCls =
  'mt-1 block w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm transition placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20';

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-3.5 text-center shadow-sm">
      <p className="text-xl font-bold" style={{ color: color ?? '#111827' }}>{value}</p>
      <p className="mt-0.5 text-[11px] text-gray-500">{label}</p>
    </div>
  );
}

const visitSchema = z.object({
  contactId: z.string().min(1, 'Required'),
  projectId: z.string().min(1, 'Required'),
  unitId: z.string().optional(),
  agentId: z.string().optional(),
  scheduledAt: z.string().min(1, 'Required'),
  status: z.enum(STATUS_OPTIONS).default('SCHEDULED'),
  interestLevel: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
  rating: z.union([z.string(), z.number()]).optional(),
  feedback: z.string().optional(),
});
type VisitForm = z.infer<typeof visitSchema>;

function SiteVisitFormModal({ open, onClose, visit }: { open: boolean; onClose: () => void; visit?: any }) {
  const qc = useQueryClient();
  const isEdit = !!visit;
  const [contactSearch, setContactSearch] = useState('');

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<VisitForm>({
    resolver: zodResolver(visitSchema),
    defaultValues: visit
      ? {
          contactId: visit.contactId,
          projectId: visit.projectId,
          unitId: visit.unitId ?? '',
          agentId: visit.agentId ?? '',
          scheduledAt: visit.scheduledAt ? visit.scheduledAt.slice(0, 16) : '',
          status: visit.status,
          interestLevel: visit.interestLevel ?? undefined,
          rating: visit.rating ?? '',
          feedback: visit.feedback ?? '',
        }
      : { status: 'SCHEDULED' },
  });

  const projectId = watch('projectId');

  const { data: contacts } = useQuery({
    queryKey: ['re-contacts-search', contactSearch],
    queryFn: async () => {
      const { data } = await api.get('/api/v1/contacts', { params: { search: contactSearch, limit: 10 } });
      return data.data as any[];
    },
    enabled: open && contactSearch.length > 0,
  });

  const { data: projects } = useQuery({
    queryKey: ['re-projects-all'],
    queryFn: async () => {
      const { data } = await api.get('/api/v1/real-estate/projects', { params: { limit: 100 } });
      return data.data as any[];
    },
    enabled: open,
  });

  const { data: units } = useQuery({
    queryKey: ['re-units', projectId],
    queryFn: async () => {
      const { data } = await api.get(`/api/v1/real-estate/projects/${projectId}/units`);
      return data.data as any[];
    },
    enabled: open && !!projectId,
  });

  const { data: users } = useQuery({
    queryKey: ['team-users'],
    queryFn: async () => {
      const { data } = await api.get('/api/v1/tenants/me/users');
      return data.data as any[];
    },
    enabled: open,
  });

  const save = useMutation({
    mutationFn: (data: VisitForm) => {
      const payload = {
        ...data,
        scheduledAt: new Date(data.scheduledAt).toISOString(),
        unitId: data.unitId || null,
        agentId: data.agentId || null,
        rating: data.rating ? Number(data.rating) : undefined,
      };
      return isEdit
        ? api.patch(`/api/v1/real-estate/site-visits/${visit.id}`, payload)
        : api.post('/api/v1/real-estate/site-visits', payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['re-site-visits'] });
      qc.invalidateQueries({ queryKey: ['re-site-visits-stats'] });
      reset();
      onClose();
    },
  });

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Edit Site Visit' : 'New Site Visit'} size="lg">
      <form onSubmit={handleSubmit((d) => save.mutate(d))} className="space-y-4">
        <Field label="Contact" error={errors.contactId?.message}>
          <input value={contactSearch} onChange={(e) => setContactSearch(e.target.value)} placeholder="Search contacts…" className={inputCls} />
          <select {...register('contactId')} className={cn(inputCls, 'mt-2')}>
            <option value="">{isEdit ? visit.contact?.name : 'Select a contact…'}</option>
            {(contacts || []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Project" error={errors.projectId?.message}>
            <select {...register('projectId')} className={inputCls}>
              <option value="">Select a project…</option>
              {(projects || []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </Field>
          <Field label="Unit (optional)">
            <select {...register('unitId')} className={inputCls}>
              <option value="">No specific unit</option>
              {(units || []).map((u) => <option key={u.id} value={u.id}>{u.unitNumber}</option>)}
            </select>
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Scheduled At" error={errors.scheduledAt?.message}>
            <input {...register('scheduledAt')} type="datetime-local" className={inputCls} />
          </Field>
          <Field label="Agent">
            <select {...register('agentId')} className={inputCls}>
              <option value="">Unassigned</option>
              {(users || []).map((u) => <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>)}
            </select>
          </Field>
        </div>

        <Field label="Status">
          <select {...register('status')} className={inputCls}>
            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
          </select>
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Interest Level">
            <select {...register('interestLevel')} className={inputCls}>
              <option value="">Not set</option>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
            </select>
          </Field>
          <Field label="Rating (1-5)">
            <input {...register('rating')} type="number" min={1} max={5} className={inputCls} />
          </Field>
        </div>

        <Field label="Feedback">
          <textarea {...register('feedback')} rows={2} className={inputCls} />
        </Field>

        {save.isError && <p className="text-sm text-red-500">Failed to save. Please try again.</p>}

        <div className="flex justify-end gap-3 pt-1">
          <button type="button" onClick={onClose} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">
            Cancel
          </button>
          <button type="submit" disabled={save.isPending} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50">
            {save.isPending ? 'Saving…' : isEdit ? 'Save Changes' : 'Schedule Visit'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

type DateRangeKey = 'TODAY' | 'WEEK' | 'MONTH' | 'CUSTOM';

export default function SiteVisitsPage() {
  const qc = useQueryClient();
  const [modal, setModal] = useState<{ open: boolean; visit?: any }>({ open: false });
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [view, setView] = useState<'list' | 'map'>('list');
  const [rangeKey, setRangeKey] = useState<DateRangeKey>('TODAY');
  const [customFrom, setCustomFrom] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [customTo, setCustomTo] = useState(format(new Date(), 'yyyy-MM-dd'));

  const { from, to } = useMemo(() => {
    const now = new Date();
    if (rangeKey === 'TODAY') return { from: startOfDay(now), to: endOfDay(now) };
    if (rangeKey === 'WEEK') return { from: startOfWeek(now), to: endOfWeek(now) };
    if (rangeKey === 'MONTH') return { from: startOfMonth(now), to: endOfMonth(now) };
    return { from: startOfDay(new Date(customFrom)), to: endOfDay(new Date(customTo)) };
  }, [rangeKey, customFrom, customTo]);

  const queryParams = {
    from: from.toISOString(), to: to.toISOString(),
    status: statusFilter || undefined,
    limit: 100,
  };

  const { data, isLoading } = useQuery({
    queryKey: ['re-site-visits', queryParams],
    queryFn: async () => {
      const { data } = await api.get('/api/v1/real-estate/site-visits', { params: queryParams });
      return data.data as any[];
    },
  });

  const { data: stats } = useQuery({
    queryKey: ['re-site-visits-stats', from.toISOString(), to.toISOString()],
    queryFn: async () => {
      const { data } = await api.get('/api/v1/real-estate/site-visits/stats', { params: { from: from.toISOString(), to: to.toISOString() } });
      return data.data;
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/api/v1/real-estate/site-visits/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['re-site-visits'] });
      qc.invalidateQueries({ queryKey: ['re-site-visits-stats'] });
      setDeleteId(null);
    },
  });

  const advanceStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/api/v1/real-estate/site-visits/${id}/status`, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['re-site-visits'] });
      qc.invalidateQueries({ queryKey: ['re-site-visits-stats'] });
    },
  });

  const visits = data ?? [];

  const mapMarkers: MapMarker[] = useMemo(() => {
    const byProject = new Map<string, MapMarker>();
    for (const v of visits) {
      if (!v.project?.latitude || !v.project?.longitude) continue;
      if (!byProject.has(v.project.id)) {
        byProject.set(v.project.id, {
          id: v.project.id,
          lat: Number(v.project.latitude),
          lng: Number(v.project.longitude),
          title: v.project.name,
          color: STATUS_COLORS[v.status] ?? '#4f46e5',
          radiusMeters: v.project.geofenceMeters ?? 200,
        });
      }
    }
    return Array.from(byProject.values());
  }, [visits]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Site Visits</h1>
          <p className="text-sm text-gray-500">Track and manage all site visit trips</p>
        </div>
        <button
          onClick={() => setModal({ open: true })}
          className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
        >
          <Plus className="h-4 w-4" /> Schedule Visit
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1 rounded-xl bg-gray-100/80 p-1">
          {(['TODAY', 'WEEK', 'MONTH'] as const).map((k) => (
            <button
              key={k}
              onClick={() => setRangeKey(k)}
              className={cn('rounded-lg px-4 py-1.5 text-sm font-medium transition', rangeKey === k ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700')}
            >
              {k === 'TODAY' ? 'Today' : k === 'WEEK' ? 'This Week' : 'This Month'}
            </button>
          ))}
        </div>
        <input type="date" value={customFrom} onChange={(e) => { setCustomFrom(e.target.value); setRangeKey('CUSTOM'); }} className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700" />
        <span className="text-sm text-gray-400">to</span>
        <input type="date" value={customTo} onChange={(e) => { setCustomTo(e.target.value); setRangeKey('CUSTOM'); }} className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700" />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        <StatCard label="Total" value={stats?.total ?? 0} />
        <StatCard label="Scheduled" value={stats?.scheduled ?? 0} color="#6366f1" />
        <StatCard label="Active" value={stats?.active ?? 0} color="#f59e0b" />
        <StatCard label="Completed" value={stats?.completed ?? 0} color="#10b981" />
        <StatCard label="No Show" value={stats?.noShow ?? 0} color="#ef4444" />
        <StatCard label="Avg Visit" value={`${stats?.avgVisitMinutes ?? 0}m`} color="#8b5cf6" />
        <StatCard label="Avg Travel" value={`${stats?.avgTravelMinutes ?? 0}m`} color="#06b6d4" />
      </div>

      <div className="flex items-center justify-between">
        <div className="flex gap-1 rounded-xl bg-gray-100/80 p-1">
          <button onClick={() => setView('list')} className={cn('flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-sm font-medium transition', view === 'list' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700')}>
            <List className="h-3.5 w-3.5" /> List View
          </button>
          <button onClick={() => setView('map')} className={cn('flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-sm font-medium transition', view === 'map' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700')}>
            <MapIcon className="h-3.5 w-3.5" /> Map View
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <button onClick={() => setStatusFilter(null)} className={cn('rounded-full px-3 py-1 text-xs font-medium transition', statusFilter === null ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}>
          All
        </button>
        {STATUS_OPTIONS.map((s) => (
          <button key={s} onClick={() => setStatusFilter(s)} className={cn('rounded-full px-3 py-1 text-xs font-medium transition', statusFilter === s ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}>
            {STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      {view === 'map' ? (
        <div className="rounded-xl border border-gray-100 bg-white p-3 shadow-sm">
          <GoogleMap markers={mapMarkers} height={420} />
        </div>
      ) : (
        <div className="rounded-xl border border-gray-100 bg-white shadow-sm overflow-x-auto">
          {isLoading ? (
            <div className="flex h-48 items-center justify-center text-gray-500">Loading...</div>
          ) : !visits.length ? (
            <div className="flex h-64 flex-col items-center justify-center gap-3">
              <MapPin className="h-10 w-10 text-gray-200" />
              <p className="text-sm text-gray-500">No site visits found</p>
              <button onClick={() => setModal({ open: true })} className="text-sm text-indigo-600 hover:underline">
                Schedule your first visit
              </button>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-50">
              <thead className="bg-gray-50/60">
                <tr>
                  {['Lead', 'Project', 'Agent', 'Scheduled', 'Status', 'Interest', 'Rating', ''].map((h) => (
                    <th key={h} className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {visits.map((v) => {
                  const next = NEXT_STATUS[v.status];
                  return (
                    <tr key={v.id} className="group hover:bg-slate-50/50">
                      <td className="px-5 py-3.5">
                        <p className="text-sm font-medium text-gray-900">{v.contact?.name}</p>
                        <p className="text-xs text-gray-400">{v.contact?.phone}</p>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-gray-600">
                        {v.project?.name}{v.unit ? ` · ${v.unit.unitNumber}` : ''}
                      </td>
                      <td className="px-5 py-3.5 text-sm text-gray-600">
                        {v.agent ? `${v.agent.firstName} ${v.agent.lastName || ''}` : <span className="text-gray-300">Unassigned</span>}
                      </td>
                      <td className="px-5 py-3.5 text-sm text-gray-600">{format(new Date(v.scheduledAt), 'dd MMM, h:mm a')}</td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <span className={cn('inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold', statusPill[v.status])}>
                            {STATUS_LABELS[v.status]}
                          </span>
                          {next && (
                            <button
                              onClick={() => advanceStatus.mutate({ id: v.id, status: next })}
                              title={`Advance to ${STATUS_LABELS[next]}`}
                              className="rounded-md border border-gray-200 px-1.5 py-0.5 text-[10px] font-medium text-gray-500 opacity-0 hover:bg-gray-50 group-hover:opacity-100"
                            >
                              → {STATUS_LABELS[next]}
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-gray-600">{v.interestLevel ? v.interestLevel.charAt(0) + v.interestLevel.slice(1).toLowerCase() : '—'}</td>
                      <td className="px-5 py-3.5 text-sm text-gray-600">{v.rating ? `${v.rating}/5` : '—'}</td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                          <button onClick={() => setModal({ open: true, visit: v })} className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => setDeleteId(v.id)} className="rounded-md p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500">
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
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-900">Agent Performance</h3>
          <div className="mt-3 space-y-2">
            {!stats?.agentPerformance?.length ? (
              <p className="text-sm text-gray-400">No data yet</p>
            ) : stats.agentPerformance.map((a: any) => (
              <div key={a.agentId} className="flex items-center justify-between text-sm">
                <span className="text-gray-700">{a.name}</span>
                <span className="text-gray-400">{a.completed}/{a.total} completed</span>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-900">Project Performance</h3>
          <div className="mt-3 space-y-2">
            {!stats?.projectPerformance?.length ? (
              <p className="text-sm text-gray-400">No data yet</p>
            ) : stats.projectPerformance.map((p: any) => (
              <div key={p.projectId} className="flex items-center justify-between text-sm">
                <span className="text-gray-700">{p.name}</span>
                <span className="text-gray-400">{p.completed}/{p.total} completed</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <SiteVisitFormModal open={modal.open} onClose={() => setModal({ open: false })} visit={modal.visit} />

      <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title="Delete Site Visit" size="sm">
        <p className="text-sm text-gray-500">This will permanently delete the site visit.</p>
        <div className="mt-5 flex justify-end gap-3">
          <button onClick={() => setDeleteId(null)} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">
            Cancel
          </button>
          <button
            onClick={() => deleteId && remove.mutate(deleteId)}
            disabled={remove.isPending}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-50"
          >
            {remove.isPending ? 'Deleting…' : 'Delete Visit'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
