'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useState } from 'react';
import { Plus, Zap, Play, Pause, Trash2, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { Modal } from '@/components/ui/Modal';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { cn } from '@/lib/utils';

const TRIGGER_TYPES = [
  { value: 'CONTACT_CREATED', label: 'Contact Created' },
  { value: 'INCOMING_CALL', label: 'Incoming Call' },
  { value: 'MESSAGE_RECEIVED', label: 'Message Received' },
  { value: 'DEAL_STAGE_CHANGED', label: 'Deal Stage Changed' },
  { value: 'SCHEDULE', label: 'Schedule (Cron)' },
];

const STEP_TYPES = [
  { value: 'SEND_SMS', label: 'Send SMS' },
  { value: 'SEND_WHATSAPP', label: 'Send WhatsApp' },
  { value: 'SCHEDULE_CALL', label: 'Schedule Call' },
  { value: 'CREATE_TASK', label: 'Create Task' },
  { value: 'WEBHOOK', label: 'Webhook' },
  { value: 'WAIT', label: 'Wait / Delay' },
];

const workflowSchema = z.object({
  name: z.string().min(1, 'Required'),
  description: z.string().optional(),
  triggerType: z.string().min(1, 'Required'),
  steps: z.array(z.object({
    type: z.string().min(1),
    config: z.object({
      message: z.string().optional(),
      url: z.string().optional(),
      delayMinutes: z.string().optional(),
      subject: z.string().optional(),
    }),
  })).min(1, 'Add at least one step'),
});

type WorkflowForm = z.infer<typeof workflowSchema>;

function WorkflowFormModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const { register, control, handleSubmit, watch, formState: { errors } } = useForm<WorkflowForm>({
    resolver: zodResolver(workflowSchema),
    defaultValues: { steps: [{ type: 'SEND_SMS', config: {} }] },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'steps' });
  const steps = watch('steps');

  const create = useMutation({
    mutationFn: (data: WorkflowForm) => api.post('/api/v1/workflows', {
      name: data.name,
      description: data.description,
      trigger: { type: data.triggerType, config: {} },
      steps: data.steps.map((s, i) => ({
        id: `step_${i}`,
        type: s.type,
        config: s.config,
        nextStepId: i < data.steps.length - 1 ? `step_${i + 1}` : null,
      })),
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['workflows'] }); onClose(); },
  });

  return (
    <Modal open={open} onClose={onClose} title="Create Workflow" size="lg">
      <form onSubmit={handleSubmit((d) => create.mutate(d))} className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700">Workflow Name *</label>
            <input {...register('name')} className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
            {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>}
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700">Description</label>
            <input {...register('description')} className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
          </div>
        </div>

        <div className="rounded-lg border border-indigo-100 bg-indigo-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600 mb-2">Trigger</p>
          <select {...register('triggerType')} className="block w-full rounded-lg border border-indigo-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none">
            <option value="">Select trigger...</option>
            {TRIGGER_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          {errors.triggerType && <p className="mt-1 text-xs text-red-500">{errors.triggerType.message}</p>}
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Steps</p>
            <button
              type="button"
              onClick={() => append({ type: 'SEND_SMS', config: {} })}
              className="flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-500"
            >
              <Plus className="h-3 w-3" /> Add Step
            </button>
          </div>

          {fields.map((field, i) => (
            <div key={field.id} className="rounded-lg border border-gray-200 p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700">{i + 1}</div>
                {i < fields.length - 1 && <ChevronRight className="h-4 w-4 text-gray-300" />}
                <div className="flex-1" />
                <button type="button" onClick={() => remove(i)} className="text-gray-400 hover:text-red-500">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600">Action</label>
                  <select {...register(`steps.${i}.type`)} className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none">
                    {STEP_TYPES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>

                {(steps[i]?.type === 'SEND_SMS' || steps[i]?.type === 'SEND_WHATSAPP') && (
                  <div>
                    <label className="block text-xs font-medium text-gray-600">Message</label>
                    <textarea
                      {...register(`steps.${i}.config.message`)}
                      rows={2}
                      placeholder="Hi {{name}}, ..."
                      className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                )}

                {steps[i]?.type === 'WEBHOOK' && (
                  <div>
                    <label className="block text-xs font-medium text-gray-600">Webhook URL</label>
                    <input {...register(`steps.${i}.config.url`)} placeholder="https://..." className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none" />
                  </div>
                )}

                {steps[i]?.type === 'WAIT' && (
                  <div>
                    <label className="block text-xs font-medium text-gray-600">Delay (minutes)</label>
                    <input {...register(`steps.${i}.config.delayMinutes`)} type="number" placeholder="60" className="mt-1 block w-32 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none" />
                  </div>
                )}

                {steps[i]?.type === 'CREATE_TASK' && (
                  <div>
                    <label className="block text-xs font-medium text-gray-600">Task Subject</label>
                    <input {...register(`steps.${i}.config.subject`)} placeholder="Follow up with contact" className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none" />
                  </div>
                )}
              </div>
            </div>
          ))}
          {errors.steps && <p className="text-xs text-red-500">{errors.steps.message}</p>}
        </div>

        {create.isError && <p className="text-sm text-red-500">Failed to create workflow.</p>}

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
          <button type="submit" disabled={create.isPending} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50">
            {create.isPending ? 'Creating...' : 'Create Workflow'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default function WorkflowsPage() {
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['workflows'],
    queryFn: async () => { const { data } = await api.get('/api/v1/workflows'); return data.data; },
  });

  const toggle = useMutation({
    mutationFn: (id: string) => api.patch(`/api/v1/workflows/${id}/toggle`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workflows'] }),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/api/v1/workflows/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workflows'] }),
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Workflows</h1>
          <p className="text-sm text-gray-500">Automate your sales process</p>
        </div>
        <button onClick={() => setCreateOpen(true)} className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500">
          <Plus className="h-4 w-4" /> New Workflow
        </button>
      </div>

      {isLoading ? (
        <div className="flex h-48 items-center justify-center text-gray-500">Loading...</div>
      ) : !data?.length ? (
        <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-xl bg-white shadow-sm ring-1 ring-gray-100">
          <Zap className="h-10 w-10 text-gray-200" />
          <p className="text-sm text-gray-500">No workflows yet</p>
          <button onClick={() => setCreateOpen(true)} className="text-sm text-indigo-600 hover:underline">Create your first workflow</button>
        </div>
      ) : (
        <div className="space-y-3">
          {data.map((wf: any) => (
            <div key={wf.id} className="flex items-center justify-between rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
              <div className="flex items-center gap-4">
                <div className={cn('flex h-9 w-9 items-center justify-center rounded-lg', wf.isActive ? 'bg-indigo-100' : 'bg-gray-100')}>
                  <Zap className={cn('h-4 w-4', wf.isActive ? 'text-indigo-600' : 'text-gray-400')} />
                </div>
                <div>
                  <p className="font-medium text-gray-900">{wf.name}</p>
                  <p className="text-xs text-gray-500">
                    Trigger: {TRIGGER_TYPES.find((t) => t.value === wf.trigger?.type)?.label || wf.trigger?.type}
                    {' · '}{(wf.steps || []).length} steps
                    {wf.runCount > 0 && ` · Ran ${wf.runCount} times`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {wf.lastRunAt && (
                  <span className="text-xs text-gray-400">Last run {format(new Date(wf.lastRunAt), 'dd MMM')}</span>
                )}
                <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', wf.isActive ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500')}>
                  {wf.isActive ? 'Active' : 'Inactive'}
                </span>
                <button
                  onClick={() => toggle.mutate(wf.id)}
                  className="rounded-lg border border-gray-200 p-1.5 text-gray-500 hover:bg-gray-50"
                  title={wf.isActive ? 'Pause' : 'Activate'}
                >
                  {wf.isActive ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                </button>
                <button onClick={() => remove.mutate(wf.id)} className="rounded-lg border border-gray-200 p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <WorkflowFormModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}
