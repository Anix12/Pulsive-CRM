'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { formatCurrency, cn } from '@/lib/utils';
import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Plus, Pencil, Trash2, GraduationCap } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const DEGREE_OPTIONS = ['UG', 'PG'] as const;

const degreeConfig: Record<string, { label: string; pill: string }> = {
  UG: { label: 'UG', pill: 'bg-blue-50 text-blue-700 ring-1 ring-blue-100' },
  PG: { label: 'PG', pill: 'bg-violet-50 text-violet-700 ring-1 ring-violet-100' },
};

// ── Form schema ───────────────────────────────────────────────────────────────
const programSchema = z.object({
  code: z
    .string()
    .min(1, 'Required')
    .regex(/^[A-Za-z0-9-]+$/, 'Letters, numbers, and hyphens only'),
  name: z.string().min(1, 'Required'),
  degreeLevel: z.enum(DEGREE_OPTIONS),
  department: z.string().optional(),
  durationMonths: z.string().optional(),
  intakeCapacity: z.string().optional(),
  tuitionFeePerYear: z.string().optional(),
});

type ProgramForm = z.infer<typeof programSchema>;

const inputCls =
  'mt-1 block w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm transition placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20';

// ── Program Form Modal ────────────────────────────────────────────────────────
function ProgramFormModal({ open, onClose, program }: { open: boolean; onClose: () => void; program?: any }) {
  const qc = useQueryClient();
  const isEdit = !!program;

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<ProgramForm>({
    resolver: zodResolver(programSchema),
    defaultValues: program
      ? {
          code: program.code,
          name: program.name,
          degreeLevel: program.degreeLevel,
          department: program.department ?? '',
          durationMonths: program.durationMonths?.toString() ?? '',
          intakeCapacity: program.intakeCapacity?.toString() ?? '',
          tuitionFeePerYear: program.tuitionFeePerYear?.toString() ?? '',
        }
      : { degreeLevel: 'UG' },
  });

  const save = useMutation({
    mutationFn: (data: ProgramForm) => {
      const body = {
        code: data.code,
        name: data.name,
        degreeLevel: data.degreeLevel,
        department: data.department || undefined,
        durationMonths: data.durationMonths ? parseInt(data.durationMonths, 10) : undefined,
        intakeCapacity: data.intakeCapacity ? parseInt(data.intakeCapacity, 10) : undefined,
        tuitionFeePerYear: data.tuitionFeePerYear ? parseFloat(data.tuitionFeePerYear) : undefined,
      };
      return isEdit
        ? api.patch(`/api/v1/programs/${program.id}`, body)
        : api.post('/api/v1/programs', body);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['programs'] });
      reset();
      onClose();
    },
  });

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Edit Program' : 'Add Program'}>
      <form onSubmit={handleSubmit((d) => save.mutate(d))} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Code <span className="text-red-400">*</span>
            </label>
            <input {...register('code')} placeholder="e.g. MBA-2026" className={inputCls} />
            {errors.code && <p className="mt-1 text-xs text-red-500">{errors.code.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Degree Level <span className="text-red-400">*</span>
            </label>
            <select {...register('degreeLevel')} className={inputCls}>
              {DEGREE_OPTIONS.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Program Name <span className="text-red-400">*</span>
          </label>
          <input {...register('name')} placeholder="e.g. Master of Business Administration" className={inputCls} />
          {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Department</label>
          <input {...register('department')} className={inputCls} />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Duration (months)</label>
            <input {...register('durationMonths')} type="number" className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Intake Capacity</label>
            <input {...register('intakeCapacity')} type="number" className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Fee/Year (₹)</label>
            <input {...register('tuitionFeePerYear')} type="number" className={inputCls} />
          </div>
        </div>

        {save.isError && <p className="text-sm text-red-500">Failed to save program.</p>}

        <div className="flex justify-end gap-3 pt-1">
          <button type="button" onClick={onClose} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">
            Cancel
          </button>
          <button type="submit" disabled={isSubmitting || save.isPending} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50">
            {save.isPending ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Program'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ── Programs Page ─────────────────────────────────────────────────────────────
export default function ProgramsPage() {
  const qc = useQueryClient();
  const [modal, setModal] = useState<{ open: boolean; program?: any }>({ open: false });
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['programs'],
    queryFn: async () => {
      const { data } = await api.get('/api/v1/programs', { params: { limit: 100 } });
      return data;
    },
  });

  const toggleActive = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      api.patch(`/api/v1/programs/${id}`, { isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['programs'] }),
  });

  const deleteProgram = useMutation({
    mutationFn: (id: string) => api.delete(`/api/v1/programs/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['programs'] }); setDeleteId(null); setDeleteError(''); },
    onError: (err: any) => {
      setDeleteError(err?.response?.data?.error?.message ?? 'Could not delete program.');
    },
  });

  const programs = data?.data ?? [];

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/dashboard/applications" className="flex items-center gap-1.5 text-xs font-medium text-gray-400 hover:text-gray-600">
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Applications
          </Link>
          <p className="mt-1 text-sm text-gray-400">{programs.length} {programs.length === 1 ? 'program' : 'programs'}</p>
        </div>
        <button
          onClick={() => setModal({ open: true })}
          className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Program
        </button>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
        {isLoading ? (
          <div className="space-y-0 divide-y divide-gray-50">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-3.5 animate-pulse">
                <div className="h-3.5 w-40 rounded bg-gray-100" />
                <div className="h-3 w-20 rounded bg-gray-100" />
              </div>
            ))}
          </div>
        ) : !programs.length ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100">
              <GraduationCap className="h-5 w-5 text-gray-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">No programs yet</p>
              <p className="mt-0.5 text-xs text-gray-400">Add your first program to start accepting applications</p>
            </div>
            <button
              onClick={() => setModal({ open: true })}
              className="mt-1 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
            >
              Add Program
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-50">
              <thead>
                <tr className="bg-gray-50/70">
                  {['Code', 'Name', 'Level', 'Department', 'Duration', 'Capacity', 'Fee/Year', 'Applications', 'Active', ''].map((h) => (
                    <th key={h} className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {programs.map((p: any) => (
                  <tr key={p.id} className="group hover:bg-slate-50/60 transition-colors">
                    <td className="px-5 py-3.5 text-sm font-medium text-gray-900">{p.code}</td>
                    <td className="px-5 py-3.5 text-sm text-gray-700">{p.name}</td>
                    <td className="px-5 py-3.5">
                      <span className={cn('inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold', degreeConfig[p.degreeLevel]?.pill)}>
                        {degreeConfig[p.degreeLevel]?.label ?? p.degreeLevel}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-gray-500">{p.department || <span className="text-gray-300">—</span>}</td>
                    <td className="px-5 py-3.5 text-sm text-gray-500">{p.durationMonths ? `${p.durationMonths} mo` : <span className="text-gray-300">—</span>}</td>
                    <td className="px-5 py-3.5 text-sm text-gray-500">{p.intakeCapacity ?? <span className="text-gray-300">—</span>}</td>
                    <td className="px-5 py-3.5 text-sm text-gray-500">
                      {p.tuitionFeePerYear ? formatCurrency(parseFloat(p.tuitionFeePerYear)) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-gray-500">{p._count?.applications ?? 0}</td>
                    <td className="px-5 py-3.5">
                      <button
                        onClick={() => toggleActive.mutate({ id: p.id, isActive: !p.isActive })}
                        disabled={toggleActive.isPending}
                        className={cn(
                          'relative inline-flex h-5 w-9 items-center rounded-full transition',
                          p.isActive ? 'bg-indigo-600' : 'bg-gray-200',
                        )}
                      >
                        <span
                          className={cn(
                            'inline-block h-3.5 w-3.5 transform rounded-full bg-white transition',
                            p.isActive ? 'translate-x-4.5' : 'translate-x-1',
                          )}
                          style={{ transform: p.isActive ? 'translateX(18px)' : 'translateX(4px)' }}
                        />
                      </button>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                        <button
                          onClick={() => setModal({ open: true, program: p })}
                          className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => { setDeleteId(p.id); setDeleteError(''); }}
                          className="rounded-md p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ProgramFormModal open={modal.open} onClose={() => setModal({ open: false })} program={modal.program} />

      <Modal open={!!deleteId} onClose={() => { setDeleteId(null); setDeleteError(''); }} title="Delete Program" size="sm">
        {deleteError ? (
          <p className="text-sm text-red-500">{deleteError}</p>
        ) : (
          <p className="text-sm text-gray-500">This will permanently delete the program and cannot be undone.</p>
        )}
        <div className="mt-5 flex justify-end gap-3">
          <button onClick={() => { setDeleteId(null); setDeleteError(''); }} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">
            Cancel
          </button>
          <button
            onClick={() => deleteId && deleteProgram.mutate(deleteId)}
            disabled={deleteProgram.isPending}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-50"
          >
            {deleteProgram.isPending ? 'Deleting…' : 'Delete Program'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
