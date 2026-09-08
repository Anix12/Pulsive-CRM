'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { CalendarCheck, Plus, Pencil, Trash2 } from 'lucide-react';
import api from '@/lib/api';
import { Modal } from '@/components/ui/Modal';
import { cn } from '@/lib/utils';

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

export default function BookingsPage() {
  const qc = useQueryClient();
  const [modal, setModal] = useState<{ open: boolean; booking?: any }>({ open: false });
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

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
        <button
          onClick={() => setModal({ open: true })}
          className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
        >
          <Plus className="h-4 w-4" /> New Booking
        </button>
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
