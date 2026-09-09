'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { UsersRound, Plus, Pencil, Trash2 } from 'lucide-react';
import api from '@/lib/api';
import { Modal } from '@/components/ui/Modal';
import { cn } from '@/lib/utils';

const KYC_STATUSES = ['PENDING', 'VERIFIED', 'REJECTED'] as const;

const kycPill: Record<string, string> = {
  PENDING: 'bg-amber-50 text-amber-700 ring-1 ring-amber-100',
  VERIFIED: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100',
  REJECTED: 'bg-red-50 text-red-700 ring-1 ring-red-100',
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

const partnerSchema = z.object({
  name: z.string().min(1, 'Required'),
  phone: z.string().optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  kycStatus: z.enum(KYC_STATUSES).default('PENDING'),
  commissionPercent: z.union([z.string(), z.number()]).optional(),
  isActive: z.boolean().default(true),
});
type PartnerForm = z.infer<typeof partnerSchema>;

function PartnerFormModal({ open, onClose, partner }: { open: boolean; onClose: () => void; partner?: any }) {
  const qc = useQueryClient();
  const isEdit = !!partner;

  const { register, handleSubmit, reset, formState: { errors } } = useForm<PartnerForm>({
    resolver: zodResolver(partnerSchema),
    defaultValues: partner
      ? {
          name: partner.name,
          phone: partner.phone ?? '',
          email: partner.email ?? '',
          kycStatus: partner.kycStatus,
          commissionPercent: partner.commissionPercent ?? '',
          isActive: partner.isActive,
        }
      : { kycStatus: 'PENDING', isActive: true },
  });

  const save = useMutation({
    mutationFn: (data: PartnerForm) => {
      const payload = {
        ...data,
        email: data.email || undefined,
        commissionPercent: data.commissionPercent !== '' && data.commissionPercent !== undefined ? Number(data.commissionPercent) : undefined,
      };
      return isEdit
        ? api.patch(`/api/v1/real-estate/partners/${partner.id}`, payload)
        : api.post('/api/v1/real-estate/partners', payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['re-partners'] });
      reset();
      onClose();
    },
  });

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Edit Partner' : 'New Partner'} description="External broker or channel partner who sources leads" size="lg">
      <form onSubmit={handleSubmit((d) => save.mutate(d))} className="space-y-4">
        <Field label="Partner / Firm Name" error={errors.name?.message}>
          <input {...register('name')} className={inputCls} placeholder="e.g. Ashok Realty Partners" autoFocus />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Phone">
            <input {...register('phone')} className={inputCls} />
          </Field>
          <Field label="Email" error={errors.email?.message}>
            <input {...register('email')} type="email" className={inputCls} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="KYC Status">
            <select {...register('kycStatus')} className={inputCls}>
              {KYC_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Commission %">
            <input {...register('commissionPercent')} type="number" step="any" min={0} max={100} className={inputCls} placeholder="e.g. 2.5" />
          </Field>
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" {...register('isActive')} className="h-3.5 w-3.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
          Active
        </label>

        {save.isError && <p className="text-sm text-red-500">Failed to save. Please try again.</p>}

        <div className="flex justify-end gap-3 pt-1">
          <button type="button" onClick={onClose} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">
            Cancel
          </button>
          <button type="submit" disabled={save.isPending} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50">
            {save.isPending ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Partner'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default function PartnersPage() {
  const qc = useQueryClient();
  const [modal, setModal] = useState<{ open: boolean; partner?: any }>({ open: false });
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['re-partners'],
    queryFn: async () => {
      const { data } = await api.get('/api/v1/real-estate/partners', { params: { limit: 100 } });
      return data.data as any[];
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/api/v1/real-estate/partners/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['re-partners'] });
      setDeleteId(null);
    },
  });

  const partners = data ?? [];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Partners</h1>
          <p className="text-sm text-gray-500">External brokers and channel partners who source or co-sell leads</p>
        </div>
        <button
          onClick={() => setModal({ open: true })}
          className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
        >
          <Plus className="h-4 w-4" /> Add Partner
        </button>
      </div>

      <div className="rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex h-48 items-center justify-center text-gray-500">Loading...</div>
        ) : !partners.length ? (
          <div className="flex h-64 flex-col items-center justify-center gap-3">
            <UsersRound className="h-10 w-10 text-gray-200" />
            <p className="text-sm text-gray-500">No partners yet</p>
            <button onClick={() => setModal({ open: true })} className="text-sm text-indigo-600 hover:underline">
              Add your first partner
            </button>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-50">
            <thead className="bg-gray-50/60">
              <tr>
                {['Partner', 'Contact', 'KYC', 'Commission', 'Status', ''].map((h) => (
                  <th key={h} className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {partners.map((p) => (
                <tr key={p.id} className="group hover:bg-slate-50/50">
                  <td className="px-5 py-3.5 text-sm font-semibold text-gray-900">{p.name}</td>
                  <td className="px-5 py-3.5">
                    <p className="text-sm text-gray-600">{p.phone || '—'}</p>
                    <p className="text-xs text-gray-400">{p.email || '—'}</p>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={cn('inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold', kycPill[p.kycStatus])}>
                      {p.kycStatus}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-gray-600">{p.commissionPercent != null ? `${p.commissionPercent}%` : '—'}</td>
                  <td className="px-5 py-3.5">
                    <span className={cn('inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold', p.isActive ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100' : 'bg-gray-100 text-gray-500 ring-1 ring-gray-200')}>
                      {p.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                      <button onClick={() => setModal({ open: true, partner: p })} className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => setDeleteId(p.id)} className="rounded-md p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500">
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

      <PartnerFormModal open={modal.open} onClose={() => setModal({ open: false })} partner={modal.partner} />

      <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title="Delete Partner" size="sm">
        <p className="text-sm text-gray-500">This will permanently delete the partner record.</p>
        <div className="mt-5 flex justify-end gap-3">
          <button onClick={() => setDeleteId(null)} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">
            Cancel
          </button>
          <button
            onClick={() => deleteId && remove.mutate(deleteId)}
            disabled={remove.isPending}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-50"
          >
            {remove.isPending ? 'Deleting…' : 'Delete Partner'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
