'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Building2, Plus, Pencil, Trash2, ArrowRight } from 'lucide-react';
import api from '@/lib/api';
import { Modal } from '@/components/ui/Modal';
import { cn } from '@/lib/utils';

const STATUS_OPTIONS = ['UPCOMING', 'UNDER_CONSTRUCTION', 'READY', 'COMPLETED'] as const;

const STATUS_LABELS: Record<string, string> = {
  UPCOMING: 'Upcoming',
  UNDER_CONSTRUCTION: 'Under Construction',
  READY: 'Ready to Move',
  COMPLETED: 'Completed',
};

const statusPill: Record<string, string> = {
  UPCOMING: 'bg-gray-100 text-gray-600 ring-1 ring-gray-200',
  UNDER_CONSTRUCTION: 'bg-amber-50 text-amber-700 ring-1 ring-amber-100',
  READY: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100',
  COMPLETED: 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100',
};

const prettyEnum = (v: string) => STATUS_LABELS[v] ?? v;

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

const projectSchema = z.object({
  name: z.string().min(1, 'Required'),
  developer: z.string().optional(),
  location: z.string().optional(),
  city: z.string().optional(),
  status: z.enum(STATUS_OPTIONS).default('UPCOMING'),
  totalUnits: z.union([z.string(), z.number()]).optional(),
  description: z.string().optional(),
  latitude: z.union([z.string(), z.number()]).optional(),
  longitude: z.union([z.string(), z.number()]).optional(),
});
type ProjectForm = z.infer<typeof projectSchema>;

function ProjectFormModal({ open, onClose, project }: { open: boolean; onClose: () => void; project?: any }) {
  const qc = useQueryClient();
  const isEdit = !!project;

  const { register, handleSubmit, reset, formState: { errors } } = useForm<ProjectForm>({
    resolver: zodResolver(projectSchema),
    defaultValues: project
      ? {
          name: project.name,
          developer: project.developer ?? '',
          location: project.location ?? '',
          city: project.city ?? '',
          status: project.status,
          totalUnits: project.totalUnits ?? '',
          description: project.description ?? '',
          latitude: project.latitude ?? '',
          longitude: project.longitude ?? '',
        }
      : { status: 'UPCOMING' },
  });

  const save = useMutation({
    mutationFn: (data: ProjectForm) => {
      const payload = {
        ...data,
        totalUnits: data.totalUnits ? Number(data.totalUnits) : undefined,
        latitude: data.latitude !== '' && data.latitude !== undefined ? Number(data.latitude) : undefined,
        longitude: data.longitude !== '' && data.longitude !== undefined ? Number(data.longitude) : undefined,
      };
      return isEdit
        ? api.patch(`/api/v1/real-estate/projects/${project.id}`, payload)
        : api.post('/api/v1/real-estate/projects', payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['re-projects'] });
      reset();
      onClose();
    },
  });

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Edit Project' : 'New Project'} description="Manage a real estate project and its unit inventory" size="lg">
      <form onSubmit={handleSubmit((d) => save.mutate(d))} className="space-y-4">
        <Field label="Project Name" error={errors.name?.message}>
          <input {...register('name')} className={inputCls} placeholder="e.g. Skyline Towers" autoFocus />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Developer">
            <input {...register('developer')} className={inputCls} />
          </Field>
          <Field label="City">
            <input {...register('city')} className={inputCls} />
          </Field>
        </div>
        <Field label="Location">
          <input {...register('location')} className={inputCls} placeholder="Address / area" />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Status">
            <select {...register('status')} className={inputCls}>
              {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{prettyEnum(s)}</option>)}
            </select>
          </Field>
          <Field label="Total Units">
            <input {...register('totalUnits')} type="number" min={0} className={inputCls} />
          </Field>
        </div>
        <Field label="Description">
          <textarea {...register('description')} rows={3} className={inputCls} />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Latitude (for map)">
            <input {...register('latitude')} type="number" step="any" className={inputCls} placeholder="e.g. 18.5595" />
          </Field>
          <Field label="Longitude (for map)">
            <input {...register('longitude')} type="number" step="any" className={inputCls} placeholder="e.g. 73.7803" />
          </Field>
        </div>

        {save.isError && <p className="text-sm text-red-500">Failed to save. Please try again.</p>}

        <div className="flex justify-end gap-3 pt-1">
          <button type="button" onClick={onClose} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">
            Cancel
          </button>
          <button type="submit" disabled={save.isPending} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50">
            {save.isPending ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Project'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default function ProjectsPage() {
  const qc = useQueryClient();
  const router = useRouter();
  const [modal, setModal] = useState<{ open: boolean; project?: any }>({ open: false });
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['re-projects'],
    queryFn: async () => {
      const { data } = await api.get('/api/v1/real-estate/projects', { params: { limit: 100 } });
      return data.data as any[];
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/api/v1/real-estate/projects/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['re-projects'] });
      setDeleteId(null);
    },
  });

  const allProjects = data ?? [];
  const projects = statusFilter ? allProjects.filter((p) => p.status === statusFilter) : allProjects;
  const countOf = (s: string) => allProjects.filter((p) => p.status === s).length;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
          <p className="text-sm text-gray-500">Manage your real estate inventory</p>
        </div>
        <button
          onClick={() => setModal({ open: true })}
          className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
        >
          <Plus className="h-4 w-4" /> Add Project
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setStatusFilter(null)}
          className={cn(
            'rounded-full px-4 py-1.5 text-sm font-medium transition',
            statusFilter === null ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
          )}
        >
          All ({allProjects.length})
        </button>
        {STATUS_OPTIONS.map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={cn(
              'rounded-full px-4 py-1.5 text-sm font-medium transition',
              statusFilter === s ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
            )}
          >
            {STATUS_LABELS[s]} ({countOf(s)})
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex h-48 items-center justify-center text-gray-500">Loading...</div>
        ) : !projects.length ? (
          <div className="flex h-64 flex-col items-center justify-center gap-3">
            <Building2 className="h-10 w-10 text-gray-200" />
            <p className="text-sm text-gray-500">No projects yet</p>
            <button onClick={() => setModal({ open: true })} className="text-sm text-indigo-600 hover:underline">
              Create your first project
            </button>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-50">
            <thead className="bg-gray-50/60">
              <tr>
                {['Project', 'City', 'Units', 'Site Visits', 'Bookings', 'Status', ''].map((h) => (
                  <th key={h} className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {projects.map((p) => (
                <tr key={p.id} className="group hover:bg-slate-50/50">
                  <td className="px-5 py-3.5">
                    <button onClick={() => router.push(`/dashboard/real-estate/projects/${p.id}`)} className="flex items-center gap-1 text-sm font-semibold text-gray-900 hover:text-indigo-600">
                      {p.name}
                      <ArrowRight className="h-3 w-3 text-gray-300 group-hover:text-indigo-400" />
                    </button>
                    <p className="mt-0.5 text-xs text-gray-400">{p.developer || '—'}</p>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-gray-600">{p.city || '—'}</td>
                  <td className="px-5 py-3.5 text-sm text-gray-600">{p._count?.units ?? 0}{p.totalUnits ? ` / ${p.totalUnits}` : ''}</td>
                  <td className="px-5 py-3.5 text-sm text-gray-600">{p._count?.siteVisits ?? 0}</td>
                  <td className="px-5 py-3.5 text-sm text-gray-600">{p._count?.bookings ?? 0}</td>
                  <td className="px-5 py-3.5">
                    <span className={cn('inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold', statusPill[p.status])}>
                      {prettyEnum(p.status)}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                      <button onClick={() => setModal({ open: true, project: p })} className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
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

      <ProjectFormModal open={modal.open} onClose={() => setModal({ open: false })} project={modal.project} />

      <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title="Delete Project" size="sm">
        <p className="text-sm text-gray-500">This will permanently delete the project and all of its units.</p>
        <div className="mt-5 flex justify-end gap-3">
          <button onClick={() => setDeleteId(null)} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">
            Cancel
          </button>
          <button
            onClick={() => deleteId && remove.mutate(deleteId)}
            disabled={remove.isPending}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-50"
          >
            {remove.isPending ? 'Deleting…' : 'Delete Project'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
