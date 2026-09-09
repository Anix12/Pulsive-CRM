'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Plus, Pencil, Trash2, Layers } from 'lucide-react';
import api from '@/lib/api';
import { Modal } from '@/components/ui/Modal';
import { cn } from '@/lib/utils';

const UNIT_STATUS_OPTIONS = ['AVAILABLE', 'HOLD', 'BOOKED', 'SOLD'] as const;

const unitStatusPill: Record<string, string> = {
  AVAILABLE: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100',
  HOLD: 'bg-amber-50 text-amber-700 ring-1 ring-amber-100',
  BOOKED: 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100',
  SOLD: 'bg-gray-100 text-gray-500 ring-1 ring-gray-200',
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

const unitSchema = z.object({
  unitNumber: z.string().min(1, 'Required'),
  tower: z.string().optional(),
  floor: z.union([z.string(), z.number()]).optional(),
  type: z.string().optional(),
  areaSqft: z.union([z.string(), z.number()]).optional(),
  price: z.union([z.string(), z.number()]).optional(),
  facing: z.string().optional(),
  status: z.enum(UNIT_STATUS_OPTIONS).default('AVAILABLE'),
});
type UnitForm = z.infer<typeof unitSchema>;

function UnitFormModal({ open, onClose, projectId, unit }: { open: boolean; onClose: () => void; projectId: string; unit?: any }) {
  const qc = useQueryClient();
  const isEdit = !!unit;

  const { register, handleSubmit, reset, formState: { errors } } = useForm<UnitForm>({
    resolver: zodResolver(unitSchema),
    defaultValues: unit
      ? { unitNumber: unit.unitNumber, tower: unit.tower ?? '', floor: unit.floor ?? '', type: unit.type ?? '', areaSqft: unit.areaSqft ?? '', price: unit.price ?? '', facing: unit.facing ?? '', status: unit.status }
      : { status: 'AVAILABLE' },
  });

  const save = useMutation({
    mutationFn: (data: UnitForm) => {
      const payload = {
        ...data,
        floor: data.floor !== '' && data.floor !== undefined ? Number(data.floor) : undefined,
        areaSqft: data.areaSqft !== '' && data.areaSqft !== undefined ? Number(data.areaSqft) : undefined,
        price: data.price !== '' && data.price !== undefined ? Number(data.price) : undefined,
      };
      return isEdit
        ? api.patch(`/api/v1/real-estate/units/${unit.id}`, payload)
        : api.post(`/api/v1/real-estate/projects/${projectId}/units`, payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['re-project', projectId] });
      reset();
      onClose();
    },
  });

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Edit Unit' : 'New Unit'} size="lg">
      <form onSubmit={handleSubmit((d) => save.mutate(d))} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Unit Number" error={errors.unitNumber?.message}>
            <input {...register('unitNumber')} className={inputCls} placeholder="e.g. A-1204" autoFocus />
          </Field>
          <Field label="Tower / Block">
            <input {...register('tower')} className={inputCls} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Floor">
            <input {...register('floor')} type="number" className={inputCls} />
          </Field>
          <Field label="Type">
            <input {...register('type')} className={inputCls} placeholder="e.g. 2BHK" />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Area (sqft)">
            <input {...register('areaSqft')} type="number" className={inputCls} />
          </Field>
          <Field label="Price">
            <input {...register('price')} type="number" className={inputCls} />
          </Field>
        </div>
        <Field label="Facing">
          <input {...register('facing')} className={inputCls} placeholder="e.g. North" />
        </Field>
        <Field label="Status">
          <select {...register('status')} className={inputCls}>
            {UNIT_STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </Field>

        {save.isError && <p className="text-sm text-red-500">Failed to save. Please try again.</p>}

        <div className="flex justify-end gap-3 pt-1">
          <button type="button" onClick={onClose} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">
            Cancel
          </button>
          <button type="submit" disabled={save.isPending} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50">
            {save.isPending ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Unit'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default function ProjectDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const [modal, setModal] = useState<{ open: boolean; unit?: any }>({ open: false });
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: project, isLoading } = useQuery({
    queryKey: ['re-project', params.id],
    queryFn: async () => {
      const { data } = await api.get(`/api/v1/real-estate/projects/${params.id}`);
      return data.data;
    },
  });

  const removeUnit = useMutation({
    mutationFn: (id: string) => api.delete(`/api/v1/real-estate/units/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['re-project', params.id] });
      setDeleteId(null);
    },
  });

  if (isLoading || !project) {
    return <div className="flex h-48 items-center justify-center text-gray-500">Loading...</div>;
  }

  return (
    <div className="space-y-5">
      <button onClick={() => router.push('/dashboard/real-estate/projects')} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Projects
      </button>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
          <p className="text-sm text-gray-500">{[project.developer, project.city, project.location].filter(Boolean).join(' · ') || 'No details'}</p>
        </div>
        <button
          onClick={() => setModal({ open: true })}
          className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
        >
          <Plus className="h-4 w-4" /> Add Unit
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          <p className="text-xs text-gray-400">Total Units</p>
          <p className="mt-1 text-xl font-bold text-gray-900">{project._count?.units ?? 0}</p>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          <p className="text-xs text-gray-400">Site Visits</p>
          <p className="mt-1 text-xl font-bold text-gray-900">{project._count?.siteVisits ?? 0}</p>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          <p className="text-xs text-gray-400">Bookings</p>
          <p className="mt-1 text-xl font-bold text-gray-900">{project._count?.bookings ?? 0}</p>
        </div>
      </div>

      <div className="rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden">
        {!project.units?.length ? (
          <div className="flex h-56 flex-col items-center justify-center gap-3">
            <Layers className="h-10 w-10 text-gray-200" />
            <p className="text-sm text-gray-500">No units yet</p>
            <button onClick={() => setModal({ open: true })} className="text-sm text-indigo-600 hover:underline">
              Add your first unit
            </button>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-50">
            <thead className="bg-gray-50/60">
              <tr>
                {['Unit', 'Tower', 'Floor', 'Type', 'Area (sqft)', 'Price', 'Status', ''].map((h) => (
                  <th key={h} className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {project.units.map((u: any) => (
                <tr key={u.id} className="group hover:bg-slate-50/50">
                  <td className="px-5 py-3.5 text-sm font-medium text-gray-900">{u.unitNumber}</td>
                  <td className="px-5 py-3.5 text-sm text-gray-600">{u.tower || '—'}</td>
                  <td className="px-5 py-3.5 text-sm text-gray-600">{u.floor ?? '—'}</td>
                  <td className="px-5 py-3.5 text-sm text-gray-600">{u.type || '—'}</td>
                  <td className="px-5 py-3.5 text-sm text-gray-600">{u.areaSqft ?? '—'}</td>
                  <td className="px-5 py-3.5 text-sm text-gray-600">{u.price ? `₹${Number(u.price).toLocaleString()}` : '—'}</td>
                  <td className="px-5 py-3.5">
                    <span className={cn('inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold', unitStatusPill[u.status])}>
                      {u.status}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                      <button onClick={() => setModal({ open: true, unit: u })} className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => setDeleteId(u.id)} className="rounded-md p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500">
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

      <UnitFormModal open={modal.open} onClose={() => setModal({ open: false })} projectId={params.id} unit={modal.unit} />

      <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title="Delete Unit" size="sm">
        <p className="text-sm text-gray-500">This will permanently delete the unit.</p>
        <div className="mt-5 flex justify-end gap-3">
          <button onClick={() => setDeleteId(null)} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">
            Cancel
          </button>
          <button
            onClick={() => deleteId && removeUnit.mutate(deleteId)}
            disabled={removeUnit.isPending}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-50"
          >
            {removeUnit.isPending ? 'Deleting…' : 'Delete Unit'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
