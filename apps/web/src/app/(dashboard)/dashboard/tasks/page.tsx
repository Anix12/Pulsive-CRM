'use client';

import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, isBefore, startOfToday, endOfToday, endOfWeek } from 'date-fns';
import { AlertTriangle, Check, CheckSquare, Plus, Trash2 } from 'lucide-react';
import api from '@/lib/api';
import { Modal } from '@/components/ui/Modal';
import { cn } from '@/lib/utils';

type StatusTab = 'ALL' | 'PENDING' | 'COMPLETED';
type DueFilter = 'ANY' | 'TODAY' | 'WEEK';

interface Task {
  id: string;
  title: string;
  description?: string | null;
  dueDate: string;
  status: 'PENDING' | 'COMPLETED';
  completedAt?: string | null;
  contact?: { id: string; name: string } | null;
  assignedTo: { id: string; firstName: string; lastName?: string | null };
}

const inputCls =
  'mt-1 block w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm transition placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20';

const taskSchema = z.object({
  title: z.string().min(1, 'Required'),
  description: z.string().optional(),
  contactId: z.string().optional(),
  assignedToId: z.string().min(1, 'Required'),
  dueDate: z.string().min(1, 'Required'),
});

type TaskForm = z.infer<typeof taskSchema>;

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

function NewTaskModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const [contactSearch, setContactSearch] = useState('');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<TaskForm>({ resolver: zodResolver(taskSchema) });

  const { data: users } = useQuery({
    queryKey: ['team-users'],
    queryFn: async () => {
      const { data } = await api.get('/api/v1/tenants/me/users');
      return data.data;
    },
    enabled: open,
  });

  const { data: contacts } = useQuery({
    queryKey: ['contacts-search', contactSearch],
    queryFn: async () => {
      const { data } = await api.get('/api/v1/contacts', {
        params: { search: contactSearch, limit: 10 },
      });
      return data.data;
    },
    enabled: open && contactSearch.length > 0,
  });

  const create = useMutation({
    mutationFn: (data: TaskForm) =>
      api.post('/api/v1/tasks', {
        ...data,
        dueDate: new Date(data.dueDate).toISOString(),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] });
      reset();
      setContactSearch('');
      onClose();
    },
  });

  return (
    <Modal open={open} onClose={onClose} title="New Task">
      <form onSubmit={handleSubmit((d) => create.mutate(d))} className="space-y-4">
        <Field label="Title" error={errors.title?.message}>
          <input {...register('title')} className={inputCls} placeholder="Follow up with contact" />
        </Field>

        <Field label="Description">
          <textarea {...register('description')} rows={2} className={inputCls} />
        </Field>

        <Field label="Contact (optional)">
          <input
            value={contactSearch}
            onChange={(e) => setContactSearch(e.target.value)}
            placeholder="Search contacts..."
            className={inputCls}
          />
          <select {...register('contactId', { setValueAs: (v) => (v === '' ? undefined : v) })} className={cn(inputCls, 'mt-2')}>
            <option value="">No contact</option>
            {(contacts || []).map((c: any) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Assignee" error={errors.assignedToId?.message}>
            <select {...register('assignedToId')} className={inputCls}>
              <option value="">Select...</option>
              {(users || []).map((u: any) => (
                <option key={u.id} value={u.id}>
                  {u.firstName} {u.lastName}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Due Date" error={errors.dueDate?.message}>
            <input {...register('dueDate')} type="date" className={inputCls} />
          </Field>
        </div>

        {create.isError && <p className="text-sm text-red-500">Failed to create task.</p>}

        <div className="flex justify-end gap-3 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={create.isPending}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
          >
            {create.isPending ? 'Creating…' : 'Create Task'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default function TasksPage() {
  const qc = useQueryClient();
  const [statusTab, setStatusTab] = useState<StatusTab>('ALL');
  const [assigneeFilter, setAssigneeFilter] = useState('');
  const [dueFilter, setDueFilter] = useState<DueFilter>('ANY');
  const [createOpen, setCreateOpen] = useState(false);

  const { data: users } = useQuery({
    queryKey: ['team-users'],
    queryFn: async () => {
      const { data } = await api.get('/api/v1/tenants/me/users');
      return data.data;
    },
  });

  const queryParams = useMemo(() => {
    const params: Record<string, string> = { limit: '100' };
    if (statusTab !== 'ALL') params.status = statusTab;
    if (assigneeFilter) params.assignedToId = assigneeFilter;
    if (dueFilter === 'TODAY') {
      params.dueAfter = startOfToday().toISOString();
      params.dueBefore = endOfToday().toISOString();
    } else if (dueFilter === 'WEEK') {
      params.dueAfter = startOfToday().toISOString();
      params.dueBefore = endOfWeek(new Date()).toISOString();
    }
    return params;
  }, [statusTab, assigneeFilter, dueFilter]);

  const { data: tasks, isLoading } = useQuery({
    queryKey: ['tasks', queryParams],
    queryFn: async () => {
      const { data } = await api.get('/api/v1/tasks', { params: queryParams });
      return data.data as Task[];
    },
  });

  const { data: overdueTasks } = useQuery({
    queryKey: ['tasks-overdue'],
    queryFn: async () => {
      const { data } = await api.get('/api/v1/tasks', { params: { overdue: 'true', limit: '100' } });
      return data.data as Task[];
    },
  });

  const complete = useMutation({
    mutationFn: (id: string) => api.patch(`/api/v1/tasks/${id}/complete`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] });
      qc.invalidateQueries({ queryKey: ['tasks-overdue'] });
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/api/v1/tasks/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] });
      qc.invalidateQueries({ queryKey: ['tasks-overdue'] });
    },
  });

  const overdueCount = overdueTasks?.length ?? 0;

  const statusTabs: { key: StatusTab; label: string }[] = [
    { key: 'ALL', label: 'All' },
    { key: 'PENDING', label: 'Pending' },
    { key: 'COMPLETED', label: 'Completed' },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tasks</h1>
          <p className="text-sm text-gray-500">Track follow-ups and to-dos</p>
        </div>
        <button
          onClick={() => setCreateOpen(true)}
          className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
        >
          <Plus className="h-4 w-4" /> New Task
        </button>
      </div>

      {overdueCount > 0 && (
        <div className="flex items-center gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
          <p className="text-sm font-medium text-amber-800">
            {overdueCount} overdue task{overdueCount !== 1 ? 's' : ''} need attention
          </p>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1 rounded-xl bg-gray-100/80 p-1 w-fit">
          {statusTabs.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setStatusTab(key)}
              className={cn(
                'rounded-lg px-4 py-1.5 text-sm font-medium transition',
                statusTab === key
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700',
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <select
          value={assigneeFilter}
          onChange={(e) => setAssigneeFilter(e.target.value)}
          className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 focus:border-indigo-500 focus:outline-none"
        >
          <option value="">All Assignees</option>
          {(users || []).map((u: any) => (
            <option key={u.id} value={u.id}>
              {u.firstName} {u.lastName}
            </option>
          ))}
        </select>

        <select
          value={dueFilter}
          onChange={(e) => setDueFilter(e.target.value as DueFilter)}
          className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 focus:border-indigo-500 focus:outline-none"
        >
          <option value="ANY">Any Due Date</option>
          <option value="TODAY">Due Today</option>
          <option value="WEEK">Due This Week</option>
        </select>
      </div>

      <div className="rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex h-48 items-center justify-center text-gray-500">Loading...</div>
        ) : !tasks?.length ? (
          <div className="flex h-64 flex-col items-center justify-center gap-3">
            <CheckSquare className="h-10 w-10 text-gray-200" />
            <p className="text-sm text-gray-500">No tasks found</p>
            <button onClick={() => setCreateOpen(true)} className="text-sm text-indigo-600 hover:underline">
              Create your first task
            </button>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-50">
            <thead className="bg-gray-50/60">
              <tr>
                {['', 'Title', 'Contact', 'Assignee', 'Due Date', 'Status', ''].map((h, i) => (
                  <th
                    key={i}
                    className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {tasks.map((task) => {
                const overdue =
                  task.status === 'PENDING' && isBefore(new Date(task.dueDate), new Date());
                return (
                  <tr key={task.id} className="group hover:bg-slate-50/50">
                    <td className="px-5 py-3.5">
                      <button
                        onClick={() => task.status === 'PENDING' && complete.mutate(task.id)}
                        disabled={task.status === 'COMPLETED'}
                        className={cn(
                          'flex h-5 w-5 items-center justify-center rounded-full border transition',
                          task.status === 'COMPLETED'
                            ? 'border-emerald-500 bg-emerald-500 text-white'
                            : 'border-gray-300 text-transparent hover:border-indigo-500',
                        )}
                        title={task.status === 'COMPLETED' ? 'Completed' : 'Mark complete'}
                      >
                        <Check className="h-3 w-3" />
                      </button>
                    </td>
                    <td className="px-5 py-3.5">
                      <p
                        className={cn(
                          'text-sm font-medium text-gray-900',
                          task.status === 'COMPLETED' && 'text-gray-400 line-through',
                        )}
                      >
                        {task.title}
                      </p>
                      {task.description && (
                        <p className="mt-0.5 line-clamp-1 text-xs text-gray-400">{task.description}</p>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-sm">
                      {task.contact ? (
                        <span className="font-medium text-indigo-600">
                          {task.contact.name}
                        </span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-gray-600">
                      {task.assignedTo.firstName} {task.assignedTo.lastName || ''}
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={cn(
                          'text-sm',
                          overdue ? 'font-semibold text-red-600' : 'text-gray-600',
                        )}
                      >
                        {format(new Date(task.dueDate), 'dd MMM yyyy')}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={cn(
                          'inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold',
                          task.status === 'COMPLETED'
                            ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100'
                            : overdue
                              ? 'bg-red-50 text-red-700 ring-1 ring-red-100'
                              : 'bg-gray-100 text-gray-600 ring-1 ring-gray-200',
                        )}
                      >
                        {task.status === 'COMPLETED' ? 'Completed' : overdue ? 'Overdue' : 'Pending'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={() => remove.mutate(task.id)}
                        className="rounded-md p-1.5 text-gray-300 opacity-0 transition hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <NewTaskModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}
