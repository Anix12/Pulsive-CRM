'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { CalendarCheck, Plus, Pencil, Trash2, BarChart3 } from 'lucide-react';
import api from '@/lib/api';
import { Modal } from '@/components/ui/Modal';
import { cn } from '@/lib/utils';
import { DonutChart } from '@/components/ui/DonutChart';
import { LineChart } from '@/components/ui/LineChart';
import { SimpleBarChart } from '@/components/ui/SimpleBarChart';
import { FunnelChart } from '@/components/ui/FunnelChart';

const STATUS_OPTIONS = ['TOKEN_RECEIVED', 'BOOKED', 'AGREEMENT_DONE', 'REGISTERED', 'CANCELLED'] as const;

const STATUS_LABELS: Record<string, string> = {
  TOKEN_RECEIVED: 'Token Received',
  BOOKED: 'Booked',
  AGREEMENT_DONE: 'Agreement Done',
  REGISTERED: 'Registered',
  CANCELLED: 'Cancelled',
};

const statusPill: Record<string, string> = {
  TOKEN_RECEIVED: 'bg-amber-50 text-amber-700 ring-1 ring-amber-100',
  BOOKED: 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100',
  AGREEMENT_DONE: 'bg-violet-50 text-violet-700 ring-1 ring-violet-100',
  REGISTERED: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100',
  CANCELLED: 'bg-gray-100 text-gray-500 ring-1 ring-gray-200',
};

const STAGE_TILE_COLORS: Record<string, string> = {
  TOKEN_RECEIVED: 'bg-amber-50 text-amber-700',
  BOOKED: 'bg-indigo-50 text-indigo-700',
  AGREEMENT_DONE: 'bg-violet-50 text-violet-700',
  REGISTERED: 'bg-emerald-50 text-emerald-700',
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

function fmtMoney(n: number) {
  if (!n) return '-';
  return `₹${n.toLocaleString()}`;
}

const bookingSchema = z.object({
  contactId: z.string().min(1, 'Required'),
  projectId: z.string().min(1, 'Required'),
  unitId: z.string().min(1, 'Required'),
  agentId: z.string().optional(),
  bookingAmount: z.union([z.string(), z.number()]).optional(),
  totalAmount: z.union([z.string(), z.number()]).optional(),
  status: z.enum(STATUS_OPTIONS).default('TOKEN_RECEIVED'),
  brokeragePercent: z.union([z.string(), z.number()]).optional(),
  brokerageReceived: z.union([z.string(), z.number()]).optional(),
});
type BookingForm = z.infer<typeof bookingSchema>;

function BookingFormModal({ open, onClose, booking }: { open: boolean; onClose: () => void; booking?: any }) {
  const qc = useQueryClient();
  const isEdit = !!booking;
  const [contactSearch, setContactSearch] = useState('');

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<BookingForm>({
    resolver: zodResolver(bookingSchema),
    defaultValues: booking
      ? {
          contactId: booking.contactId,
          projectId: booking.projectId,
          unitId: booking.unitId,
          agentId: booking.agentId ?? '',
          bookingAmount: booking.bookingAmount ?? '',
          totalAmount: booking.totalAmount ?? '',
          status: booking.status,
          brokeragePercent: booking.brokeragePercent ?? '',
          brokerageReceived: booking.brokerageReceived ?? '',
        }
      : { status: 'TOKEN_RECEIVED' },
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
    queryKey: ['re-units-avail', projectId],
    queryFn: async () => {
      const { data } = await api.get(`/api/v1/real-estate/projects/${projectId}/units`, { params: { status: 'AVAILABLE' } });
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
    mutationFn: (data: BookingForm) => {
      const payload = {
        ...data,
        agentId: data.agentId || null,
        bookingAmount: data.bookingAmount ? Number(data.bookingAmount) : undefined,
        totalAmount: data.totalAmount ? Number(data.totalAmount) : undefined,
        brokeragePercent: data.brokeragePercent !== '' && data.brokeragePercent !== undefined ? Number(data.brokeragePercent) : undefined,
        brokerageReceived: data.brokerageReceived !== '' && data.brokerageReceived !== undefined ? Number(data.brokerageReceived) : undefined,
      };
      return isEdit
        ? api.patch(`/api/v1/real-estate/bookings/${booking.id}`, payload)
        : api.post('/api/v1/real-estate/bookings', payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['re-bookings'] });
      qc.invalidateQueries({ queryKey: ['re-bookings-stats'] });
      reset();
      onClose();
    },
  });

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Edit Booking' : 'New Booking'} size="lg">
      <form onSubmit={handleSubmit((d) => save.mutate(d))} className="space-y-4">
        <Field label="Contact" error={errors.contactId?.message}>
          <input value={contactSearch} onChange={(e) => setContactSearch(e.target.value)} placeholder="Search contacts…" className={inputCls} />
          <select {...register('contactId')} className={cn(inputCls, 'mt-2')}>
            <option value="">{isEdit ? booking.contact?.name : 'Select a contact…'}</option>
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
          <Field label="Unit" error={errors.unitId?.message}>
            <select {...register('unitId')} className={inputCls}>
              <option value="">{isEdit ? booking.unit?.unitNumber : 'Select a unit…'}</option>
              {(units || []).map((u) => <option key={u.id} value={u.id}>{u.unitNumber}</option>)}
            </select>
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Booking Amount">
            <input {...register('bookingAmount')} type="number" className={inputCls} />
          </Field>
          <Field label="Total Deal Value">
            <input {...register('totalAmount')} type="number" className={inputCls} />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Agent">
            <select {...register('agentId')} className={inputCls}>
              <option value="">Unassigned</option>
              {(users || []).map((u) => <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>)}
            </select>
          </Field>
          <Field label="Status">
            <select {...register('status')} className={inputCls}>
              {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
            </select>
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Brokerage %">
            <input {...register('brokeragePercent')} type="number" step="0.1" className={inputCls} placeholder="e.g. 2" />
          </Field>
          <Field label="Brokerage Received">
            <input {...register('brokerageReceived')} type="number" className={inputCls} />
          </Field>
        </div>

        {save.isError && <p className="text-sm text-red-500">Failed to save. Please try again.</p>}

        <div className="flex justify-end gap-3 pt-1">
          <button type="button" onClick={onClose} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">
            Cancel
          </button>
          <button type="submit" disabled={save.isPending} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50">
            {save.isPending ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Booking'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

const STATUS_HEX: Record<string, string> = {
  TOKEN_RECEIVED: '#f59e0b', BOOKED: '#6366f1', AGREEMENT_DONE: '#8b5cf6', REGISTERED: '#10b981', CANCELLED: '#9ca3af',
};

interface BookingStats {
  tokenReceived: number; booked: number; agreementDone: number; registered: number; cancelled: number;
  totalDealValue: number; totalBrokerage: number; brokeragePending: number;
  statusBreakdown: { status: string; count: number }[];
  byProject: { projectId: string; name: string; count: number; value: number }[];
  byAgent: { agentId: string; name: string; count: number; value: number }[];
  valueOverTime: { period: string; label: string; value: number; count: number }[];
}

function BookingsAnalytics({ stats }: { stats: BookingStats }) {
  const statusSegments = stats.statusBreakdown
    .map((s) => ({ label: STATUS_LABELS[s.status] ?? s.status, count: s.count, color: STATUS_HEX[s.status] ?? '#d1d5db' }))
    .filter((s) => s.count > 0);

  const funnelData = [
    { stage: 'Token Received', value: stats.tokenReceived + stats.booked + stats.agreementDone + stats.registered },
    { stage: 'Booked', value: stats.booked + stats.agreementDone + stats.registered },
    { stage: 'Agreement Done', value: stats.agreementDone + stats.registered },
    { stage: 'Registered', value: stats.registered },
  ];
  const hasFunnelData = funnelData[0].value > 0;

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Booking Overview</p>

      <div className="mt-4 grid gap-5 lg:grid-cols-2">
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400">Booking Status</p>
          <DonutChart
            data={statusSegments}
            nameKey="label"
            valueKey="count"
            colors={statusSegments.map((s) => s.color)}
            height={160}
            ariaLabel="Bookings grouped by status"
          />
        </div>
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
            Booking Progression <span className="normal-case text-gray-300">· non-cancelled bookings reaching each stage</span>
          </p>
          {hasFunnelData ? (
            <FunnelChart
              data={funnelData}
              nameKey="stage"
              valueKey="value"
              colors={['#f59e0b', '#6366f1', '#8b5cf6', '#10b981']}
              height={200}
            />
          ) : (
            <div className="flex h-[200px] items-center justify-center rounded-lg bg-gray-50/50 text-sm text-gray-400">No data yet.</div>
          )}
        </div>
      </div>

      <div className="mt-5">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400">Booking Value · last 6 months</p>
        <LineChart
          data={stats.valueOverTime}
          xKey="label"
          series={[{ key: 'value', label: 'Booking value', color: '#6366f1' }]}
          variant="area"
          height={170}
          formatValue={(v) => fmtMoney(v)}
          ariaLabel="Non-cancelled booking value over the last 6 months"
        />
      </div>

      {(stats.byProject.length > 0 || stats.byAgent.length > 0) && (
        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          {stats.byProject.length > 0 && (
            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400">Bookings by Project</p>
              <SimpleBarChart
                data={stats.byProject.slice(0, 6).map((p) => ({ label: p.name, value: p.count }))}
                height={150}
                formatValue={(n) => `${n} booking${n === 1 ? '' : 's'}`}
              />
            </div>
          )}
          {stats.byAgent.length > 0 && (
            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400">Bookings by Agent</p>
              <SimpleBarChart
                data={stats.byAgent.slice(0, 6).map((a) => ({ label: a.name, value: a.value }))}
                height={150}
                formatValue={(n) => fmtMoney(n)}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function BookingsPage() {
  const qc = useQueryClient();
  const [modal, setModal] = useState<{ open: boolean; booking?: any }>({ open: false });
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [reportOpen, setReportOpen] = useState(true);

  const { data, isLoading } = useQuery({
    queryKey: ['re-bookings', statusFilter],
    queryFn: async () => {
      const { data } = await api.get('/api/v1/real-estate/bookings', { params: { limit: 100, status: statusFilter || undefined } });
      return data.data as any[];
    },
  });

  const { data: stats } = useQuery({
    queryKey: ['re-bookings-stats'],
    queryFn: async () => {
      const { data } = await api.get('/api/v1/real-estate/bookings/stats');
      return data.data;
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/api/v1/real-estate/bookings/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['re-bookings'] });
      qc.invalidateQueries({ queryKey: ['re-bookings-stats'] });
      setDeleteId(null);
    },
  });

  const bookings = data ?? [];
  const stageOptions = ['TOKEN_RECEIVED', 'BOOKED', 'AGREEMENT_DONE', 'REGISTERED'] as const;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bookings</h1>
          <p className="text-sm text-gray-500">Track deals, payments & brokerage</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setReportOpen((o) => !o)}
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-sm font-medium text-gray-600 shadow-sm transition hover:bg-gray-50"
          >
            <BarChart3 className="h-3.5 w-3.5" />
            {reportOpen ? 'Hide report' : 'Show report'}
          </button>
          <button
            onClick={() => setModal({ open: true })}
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
          >
            <Plus className="h-4 w-4" /> New Booking
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stageOptions.map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(statusFilter === s ? null : s)}
            className={cn(
              'rounded-xl p-4 text-left shadow-sm ring-1 transition',
              statusFilter === s ? 'ring-2 ring-indigo-400' : 'ring-gray-100',
              STAGE_TILE_COLORS[s],
            )}
          >
            <span className="inline-flex rounded-full bg-white/60 px-2 py-0.5 text-[11px] font-semibold">{STATUS_LABELS[s]}</span>
            <p className="mt-2 text-2xl font-bold">{stats?.[s === 'TOKEN_RECEIVED' ? 'tokenReceived' : s === 'BOOKED' ? 'booked' : s === 'AGREEMENT_DONE' ? 'agreementDone' : 'registered'] ?? 0}</p>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-100 bg-indigo-50/40 p-4">
          <p className="text-xs text-gray-500">Total Deal Value</p>
          <p className="mt-1 text-lg font-bold text-gray-900">{fmtMoney(stats?.totalDealValue ?? 0)}</p>
        </div>
        <div className="rounded-xl border border-gray-100 bg-emerald-50/40 p-4">
          <p className="text-xs text-gray-500">Total Brokerage</p>
          <p className="mt-1 text-lg font-bold text-gray-900">{fmtMoney(stats?.totalBrokerage ?? 0)}</p>
        </div>
        <div className="rounded-xl border border-gray-100 bg-amber-50/40 p-4">
          <p className="text-xs text-gray-500">Brokerage Pending</p>
          <p className="mt-1 text-lg font-bold text-gray-900">{fmtMoney(stats?.brokeragePending ?? 0)}</p>
        </div>
      </div>

      {reportOpen && stats && (stats.tokenReceived + stats.booked + stats.agreementDone + stats.registered + stats.cancelled > 0) && (
        <BookingsAnalytics stats={stats} />
      )}

      {statusFilter && (
        <button onClick={() => setStatusFilter(null)} className="text-xs font-medium text-indigo-600 hover:underline">
          Clear filter: {STATUS_LABELS[statusFilter]} ✕
        </button>
      )}

      <div className="rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex h-48 items-center justify-center text-gray-500">Loading...</div>
        ) : !bookings.length ? (
          <div className="flex h-64 flex-col items-center justify-center gap-3">
            <CalendarCheck className="h-10 w-10 text-gray-200" />
            <p className="text-sm text-gray-500">No bookings yet</p>
            <button onClick={() => setModal({ open: true })} className="text-sm text-indigo-600 hover:underline">
              Create your first booking
            </button>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-50">
            <thead className="bg-gray-50/60">
              <tr>
                {['Contact', 'Project / Unit', 'Agent', 'Deal Value', 'Brokerage', 'Status', ''].map((h) => (
                  <th key={h} className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {bookings.map((b) => (
                <tr key={b.id} className="group hover:bg-slate-50/50">
                  <td className="px-5 py-3.5">
                    <p className="text-sm font-medium text-gray-900">{b.contact?.name}</p>
                    <p className="text-xs text-gray-400">{format(new Date(b.bookingDate), 'dd MMM yyyy')}</p>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-gray-600">{b.project?.name} · {b.unit?.unitNumber}</td>
                  <td className="px-5 py-3.5 text-sm text-gray-600">
                    {b.agent ? `${b.agent.firstName} ${b.agent.lastName || ''}` : <span className="text-gray-300">Unassigned</span>}
                  </td>
                  <td className="px-5 py-3.5 text-sm text-gray-600">{fmtMoney(Number(b.totalAmount ?? 0))}</td>
                  <td className="px-5 py-3.5 text-sm text-gray-600">
                    {b.brokerageAmount ? `${fmtMoney(Number(b.brokerageAmount))} ${b.brokerageReceived ? `(${fmtMoney(Number(b.brokerageReceived))} recv'd)` : ''}` : '—'}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={cn('inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold', statusPill[b.status])}>
                      {STATUS_LABELS[b.status]}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                      <button onClick={() => setModal({ open: true, booking: b })} className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => setDeleteId(b.id)} className="rounded-md p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <BookingFormModal open={modal.open} onClose={() => setModal({ open: false })} booking={modal.booking} />

      <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title="Delete Booking" size="sm">
        <p className="text-sm text-gray-500">This will permanently delete the booking.</p>
        <div className="mt-5 flex justify-end gap-3">
          <button onClick={() => setDeleteId(null)} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">
            Cancel
          </button>
          <button
            onClick={() => deleteId && remove.mutate(deleteId)}
            disabled={remove.isPending}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-50"
          >
            {remove.isPending ? 'Deleting…' : 'Delete Booking'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
