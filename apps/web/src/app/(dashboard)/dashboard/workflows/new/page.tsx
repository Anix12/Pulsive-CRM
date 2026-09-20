'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { cn } from '@/lib/utils';
import { TRIGGER_TYPES, STEP_TYPES, stepMeta } from '@/lib/workflowConfig';
import { Plus, Trash2, X } from 'lucide-react';

interface StepInstance {
  id: string;
  type: string;
  config: Record<string, string>;
}

let stepSeq = 0;
const nextStepId = () => `step_${Date.now()}_${stepSeq++}`;

function StepConfigFields({
  step,
  onChange,
  teamUsers,
  stages,
  campaigns,
}: {
  step: StepInstance;
  onChange: (config: Record<string, string>) => void;
  teamUsers: any[];
  stages: any[];
  campaigns: any[];
}) {
  const set = (key: string, value: string) => onChange({ ...step.config, [key]: value });
  const inputCls = 'mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500';
  const labelCls = 'block text-xs font-medium text-gray-600';

  switch (step.type) {
    case 'SEND_EMAIL':
      return (
        <div className="space-y-2">
          <div><label className={labelCls}>Subject</label><input className={inputCls} value={step.config.subject || ''} onChange={(e) => set('subject', e.target.value)} placeholder="Thanks for reaching out, {{name}}" /></div>
          <div><label className={labelCls}>Body</label><textarea className={inputCls} rows={3} value={step.config.body || ''} onChange={(e) => set('body', e.target.value)} placeholder="Hi {{name}}, ..." /></div>
        </div>
      );
    case 'SEND_SMS':
      return (
        <div><label className={labelCls}>Message</label><textarea className={inputCls} rows={2} value={step.config.message || ''} onChange={(e) => set('message', e.target.value)} placeholder="Hi {{name}}, ..." /></div>
      );
    case 'WAIT':
      return (
        <div><label className={labelCls}>Delay (minutes)</label><input type="number" className={cn(inputCls, 'w-32')} value={step.config.delayMinutes || ''} onChange={(e) => set('delayMinutes', e.target.value)} placeholder="60" /></div>
      );
    case 'CONDITION':
      return (
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className={labelCls}>Field</label>
            <select className={inputCls} value={step.config.field || ''} onChange={(e) => set('field', e.target.value)}>
              <option value="">Select...</option>
              <option value="temperature">Lead Temperature</option>
              <option value="score">Lead Score</option>
              <option value="dealValue">Deal Value</option>
              <option value="source">Source</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Operator</label>
            <select className={inputCls} value={step.config.operator || ''} onChange={(e) => set('operator', e.target.value)}>
              <option value="">Select...</option>
              <option value="equals">Equals</option>
              <option value="greater_than">Greater than</option>
              <option value="less_than">Less than</option>
              <option value="contains">Contains</option>
            </select>
          </div>
          <div><label className={labelCls}>Value</label><input className={inputCls} value={step.config.value || ''} onChange={(e) => set('value', e.target.value)} /></div>
        </div>
      );
    case 'ASSIGN_AGENT':
      return (
        <div>
          <label className={labelCls}>Agent</label>
          <select className={inputCls} value={step.config.agentId || ''} onChange={(e) => set('agentId', e.target.value)}>
            <option value="">Select agent...</option>
            {teamUsers.map((u: any) => <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>)}
          </select>
        </div>
      );
    case 'CHANGE_STAGE':
      return (
        <div>
          <label className={labelCls}>Stage</label>
          <select className={inputCls} value={step.config.stageId || ''} onChange={(e) => set('stageId', e.target.value)}>
            <option value="">Select stage...</option>
            {stages.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
      );
    case 'CREATE_TASK':
      return (
        <div><label className={labelCls}>Task Subject</label><input className={inputCls} value={step.config.subject || ''} onChange={(e) => set('subject', e.target.value)} placeholder="Follow up with lead" /></div>
      );
    case 'ADD_NOTE':
      return (
        <div><label className={labelCls}>Note</label><textarea className={inputCls} rows={2} value={step.config.note || ''} onChange={(e) => set('note', e.target.value)} placeholder="Note text..." /></div>
      );
    case 'CHANGE_CAMPAIGN':
      return (
        <div>
          <label className={labelCls}>Campaign</label>
          <select className={inputCls} value={step.config.campaignId || ''} onChange={(e) => set('campaignId', e.target.value)}>
            <option value="">Select campaign...</option>
            {campaigns.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      );
    case 'DUPLICATE_LEAD':
      return <p className="text-xs text-gray-500">Creates a copy of the lead that triggered this workflow. No configuration needed.</p>;
    case 'WEBHOOK':
      return (
        <div><label className={labelCls}>Webhook URL</label><input className={inputCls} value={step.config.url || ''} onChange={(e) => set('url', e.target.value)} placeholder="https://..." /></div>
      );
    default:
      return null;
  }
}

export default function NewWorkflowPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [triggerType, setTriggerType] = useState('');
  const [steps, setSteps] = useState<StepInstance[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [error, setError] = useState('');

  const { data: teamUsers = [] } = useQuery<any[]>({
    queryKey: ['team-users'],
    queryFn: async () => (await api.get('/api/v1/tenants/me/users')).data.data,
  });
  const { data: stages = [] } = useQuery<any[]>({
    queryKey: ['deal-stages'],
    queryFn: async () => (await api.get('/api/v1/deals/stages')).data.data,
  });
  const { data: campaigns = [] } = useQuery<any[]>({
    queryKey: ['campaigns-lite'],
    queryFn: async () => (await api.get('/api/v1/campaigns')).data.data,
  });

  const addStep = (type: string) => {
    setSteps((prev) => [...prev, { id: nextStepId(), type, config: {} }]);
    setPickerOpen(false);
  };
  const removeStep = (id: string) => setSteps((prev) => prev.filter((s) => s.id !== id));
  const updateStepConfig = (id: string, config: Record<string, string>) =>
    setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, config } : s)));

  const save = useMutation({
    mutationFn: () =>
      api.post('/api/v1/workflows', {
        name,
        description: description || undefined,
        trigger: { type: triggerType, config: {} },
        steps: steps.map((s, i) => ({
          id: s.id,
          type: s.type,
          config: s.config,
          nextStepId: i < steps.length - 1 ? steps[i + 1].id : null,
        })),
        isActive: false,
      }),
    onSuccess: () => router.push('/dashboard/workflows'),
    onError: (err: any) => setError(err?.response?.data?.error?.message || 'Failed to save workflow'),
  });

  const handleSave = () => {
    if (!name.trim()) return setError('Workflow name is required');
    if (!triggerType) return setError('Select a trigger');
    if (steps.length === 0) return setError('Add at least one step');
    setError('');
    save.mutate();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">New Workflow</h1>
          <p className="text-sm text-gray-500">Build your automation sequence</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/dashboard/workflows')} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
            Cancel
          </button>
          <button onClick={handleSave} disabled={save.isPending} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50">
            {save.isPending ? 'Saving...' : 'Save Workflow'}
          </button>
        </div>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</div>}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[380px_1fr]">
        {/* Left column */}
        <div className="space-y-5">
          <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
            <h2 className="mb-4 text-sm font-semibold text-gray-900">Workflow Details</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium uppercase tracking-wide text-gray-500">Name *</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. New Lead Welcome"
                  className="mt-1.5 block w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium uppercase tracking-wide text-gray-500">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="mt-1.5 block w-full resize-y rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
            <h2 className="mb-4 flex items-center gap-1.5 text-sm font-semibold text-gray-900">
              <span className="text-orange-500">⚡</span> Trigger
            </h2>
            <div className="space-y-2">
              {TRIGGER_TYPES.map((t) => {
                const Icon = t.icon;
                const active = triggerType === t.value;
                return (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setTriggerType(t.value)}
                    className={cn(
                      'flex w-full items-start gap-3 rounded-lg border px-3.5 py-3 text-left transition-colors',
                      active ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50',
                    )}
                  >
                    <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', active ? 'text-indigo-600' : 'text-gray-400')} />
                    <span>
                      <span className={cn('block text-sm font-medium', active ? 'text-indigo-700' : 'text-gray-900')}>{t.label}</span>
                      <span className="block text-xs text-gray-500">{t.description}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
          <h2 className="mb-4 text-sm font-semibold text-gray-900">Automation Steps</h2>

          {steps.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-400">No steps yet. Add your first step below.</p>
          ) : (
            <div className="space-y-3">
              {steps.map((step, i) => {
                const meta = stepMeta(step.type);
                const Icon = meta?.icon;
                return (
                  <div key={step.id} className="rounded-lg border border-gray-200 p-4">
                    <div className="mb-3 flex items-center gap-2">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700">{i + 1}</div>
                      {Icon && <Icon className="h-4 w-4 text-gray-500" />}
                      <span className="text-sm font-medium text-gray-900">{meta?.label || step.type}</span>
                      <div className="flex-1" />
                      <button onClick={() => removeStep(step.id)} className="text-gray-400 hover:text-red-500">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <StepConfigFields
                      step={step}
                      onChange={(config) => updateStepConfig(step.id, config)}
                      teamUsers={teamUsers}
                      stages={stages}
                      campaigns={campaigns}
                    />
                  </div>
                );
              })}
            </div>
          )}

          <div className="relative mt-4 border-t border-dashed border-gray-200 pt-4">
            <button
              type="button"
              onClick={() => setPickerOpen((v) => !v)}
              className="flex w-full items-center justify-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-500"
            >
              <Plus className="h-4 w-4" /> Add step
            </button>

            {pickerOpen && (
              <div className="mt-3 rounded-lg border border-gray-200 bg-white p-3 shadow-lg">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">Choose a step</span>
                  <button onClick={() => setPickerOpen(false)} className="text-gray-400 hover:text-gray-600"><X className="h-3.5 w-3.5" /></button>
                </div>
                <div className="grid grid-cols-2 gap-1">
                  {STEP_TYPES.map((s) => {
                    const Icon = s.icon;
                    return (
                      <button
                        key={s.value}
                        type="button"
                        onClick={() => addStep(s.value)}
                        className="flex items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-700"
                      >
                        <Icon className="h-4 w-4 text-gray-400" />
                        {s.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
