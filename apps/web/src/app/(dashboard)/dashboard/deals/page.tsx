'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { Plus, ChevronRight, Briefcase, GripVertical, Trash2, Check, X, Star, Pencil } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { Modal } from '@/components/ui/Modal';
import { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { cn } from '@/lib/utils';
import { cardMountProps } from '@/lib/motion';

// ── Color palette for the stage color picker ───────────────────────────────────
const STAGE_COLORS = [
  '#94A3B8', '#60A5FA', '#A78BFA', '#F59E0B',
  '#34D399', '#F87171', '#FB923C', '#38BDF8',
  '#4ADE80', '#E879F9', '#F472B6', '#818CF8',
];

// ── Schemas ───────────────────────────────────────────────────────────────────
const dealSchema = z.object({
  title: z.string().min(1, 'Required'),
  contactId: z.string().min(1, 'Required'),
  stageId: z.string().min(1, 'Required'),
  value: z.string().optional(),
  expectedCloseDate: z.string().optional(),
});

type DealForm = z.infer<typeof dealSchema>;

const inputCls =
  'mt-1 block w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm transition placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20';

// ── Pipeline & Stages panel (inline, replaces the old "Sales Overview" report) ─
const errMsg = (err: any, fallback: string) =>
  err?.response?.data?.error?.message ?? err?.response?.data?.message ?? fallback;

function PipelineStagesPanel({
  activePipelineId,
  onSelectPipeline,
}: {
  activePipelineId: string | undefined;
  onSelectPipeline: (id: string) => void;
}) {
  const qc = useQueryClient();
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [addingPipeline, setAddingPipeline] = useState(false);
  const [newPipelineName, setNewPipelineName] = useState('');
  const [editingStageId, setEditingStageId] = useState<string | null>(null);
  const [editStageName, setEditStageName] = useState('');
  const [newStageName, setNewStageName] = useState('');
  const [newStageColor, setNewStageColor] = useState(STAGE_COLORS[0]);
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [deleteStageId, setDeleteStageId] = useState<string | null>(null);
  const [deleteStageError, setDeleteStageError] = useState('');
  const [deletePipelineConfirm, setDeletePipelineConfirm] = useState(false);
  const [deletePipelineError, setDeletePipelineError] = useState('');
  const editStageRef = useRef<HTMLInputElement>(null);

  const { data: pipelines = [] } = useQuery<any[]>({
    queryKey: ['pipelines'],
    queryFn: async () => {
      const { data } = await api.get('/api/v1/settings/pipelines');
      return data.data;
    },
  });

  const activePipeline =
    pipelines.find((p: any) => p.id === activePipelineId) ??
    pipelines.find((p: any) => p.isDefault) ??
    pipelines[0];
  const pipelineId = activePipeline?.id;

  const { data: stages = [] } = useQuery<any[]>({
    queryKey: ['deal-stages', pipelineId],
    queryFn: async () => {
      const { data } = await api.get('/api/v1/deals/stages', { params: { pipelineId } });
      return data.data;
    },
    enabled: !!pipelineId,
  });

  const invalidateStages = () => qc.invalidateQueries({ queryKey: ['deal-stages', pipelineId] });

  const createPipeline = useMutation({
    mutationFn: (name: string) => api.post('/api/v1/settings/pipelines', { name }),
    onSuccess: ({ data }) => {
      qc.invalidateQueries({ queryKey: ['pipelines'] });
      setAddingPipeline(false);
      setNewPipelineName('');
      onSelectPipeline(data.data.id);
    },
  });

  const renamePipeline = useMutation({
    mutationFn: (name: string) => api.patch(`/api/v1/settings/pipelines/${pipelineId}`, { name }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pipelines'] });
      setRenaming(false);
    },
  });

  const deletePipeline = useMutation({
    mutationFn: () => api.delete(`/api/v1/settings/pipelines/${pipelineId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pipelines'] });
      setDeletePipelineError('');
      setDeletePipelineConfirm(false);
      const fallback = pipelines.find((p: any) => p.id !== pipelineId);
      if (fallback) onSelectPipeline(fallback.id);
    },
    onError: (err: any) => setDeletePipelineError(errMsg(err, 'Could not delete pipeline.')),
  });

  const createStage = useMutation({
    mutationFn: ({ name, color }: { name: string; color: string }) =>
      api.post('/api/v1/deals/stages', { name, color, pipelineId }),
    onSuccess: () => {
      invalidateStages();
      setNewStageName('');
      setNewStageColor(STAGE_COLORS[0]);
    },
  });

  const renameStage = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => api.patch(`/api/v1/deals/stages/${id}`, { name }),
    onSuccess: () => {
      invalidateStages();
      setEditingStageId(null);
    },
  });

  const deleteStage = useMutation({
    mutationFn: (id: string) => api.delete(`/api/v1/deals/stages/${id}`),
    onSuccess: () => {
      invalidateStages();
      setDeleteStageId(null);
      setDeleteStageError('');
    },
    onError: (err: any) => setDeleteStageError(errMsg(err, 'Could not delete stage.')),
  });

  const reorder = useMutation({
    mutationFn: (orderedIds: string[]) => api.put('/api/v1/deals/stages/reorder', { orderedIds, pipelineId }),
    onSuccess: () => invalidateStages(),
  });

  const startEditStage = (stage: any) => {
    setEditingStageId(stage.id);
    setEditStageName(stage.name);
    setTimeout(() => editStageRef.current?.focus(), 50);
  };

  const commitEditStage = (stage: any) => {
    if (editStageName.trim() && editStageName.trim() !== stage.name) {
      renameStage.mutate({ id: stage.id, name: editStageName.trim() });
    } else {
      setEditingStageId(null);
    }
  };

  const handleDrop = (targetIdx: number) => {
    if (!dragId) return;
    const fromIdx = stages.findIndex((s: any) => s.id === dragId);
    setDragId(null);
    if (fromIdx === -1 || fromIdx === targetIdx) return;
    const next = [...stages];
    const [moved] = next.splice(fromIdx, 1);
    next.splice(targetIdx, 0, moved);
    reorder.mutate(next.map((s: any) => s.id));
  };

  return (
    <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Pipeline &amp; Stages</p>

      {/* Pipeline tabs */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {pipelines.map((p: any) => (
          <button
            key={p.id}
            onClick={() => { onSelectPipeline(p.id); setDeletePipelineConfirm(false); setDeletePipelineError(''); setRenaming(false); }}
            className={cn(
              'flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium transition',
              p.id === pipelineId
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-gray-50 text-gray-600 hover:bg-gray-100',
            )}
          >
            {p.isDefault && <Star className="h-3.5 w-3.5 fill-current" />}
            {p.name}
          </button>
        ))}
        {addingPipeline ? (
          <div className="flex items-center gap-1.5">
            <input
              autoFocus
              value={newPipelineName}
              onChange={(e) => setNewPipelineName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newPipelineName.trim()) createPipeline.mutate(newPipelineName.trim());
                if (e.key === 'Escape') { setAddingPipeline(false); setNewPipelineName(''); }
              }}
              placeholder="Pipeline name…"
              className="rounded-lg border border-indigo-200 bg-white px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
            <button
              onClick={() => newPipelineName.trim() && createPipeline.mutate(newPipelineName.trim())}
              disabled={!newPipelineName.trim() || createPipeline.isPending}
              className="rounded-lg bg-indigo-600 p-1.5 text-white hover:bg-indigo-500 disabled:opacity-50"
            >
              <Check className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => { setAddingPipeline(false); setNewPipelineName(''); }}
              className="rounded-lg border border-gray-200 p-1.5 text-gray-500 hover:bg-gray-50"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setAddingPipeline(true)}
            className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-indigo-600 hover:bg-indigo-50"
          >
            <Plus className="h-3.5 w-3.5" /> New Pipeline
          </button>
        )}
      </div>

      {/* Rename / Delete pipeline */}
      {activePipeline && (
        <div className="mt-2.5 flex items-center gap-4">
          {renaming ? (
            <div className="flex items-center gap-1.5">
              <input
                autoFocus
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && renameValue.trim()) renamePipeline.mutate(renameValue.trim());
                  if (e.key === 'Escape') setRenaming(false);
                }}
                className="rounded-lg border border-indigo-200 bg-white px-2.5 py-1 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
              <button onClick={() => renameValue.trim() && renamePipeline.mutate(renameValue.trim())} className="text-xs font-medium text-indigo-600 hover:text-indigo-700">
                Save
              </button>
              <button onClick={() => setRenaming(false)} className="text-xs font-medium text-gray-400 hover:text-gray-600">
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => { setRenaming(true); setRenameValue(activePipeline.name); }}
              className="flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-indigo-600"
            >
              <Pencil className="h-3 w-3" /> Rename
            </button>
          )}
          {pipelines.length > 1 && (
            deletePipelineConfirm ? (
              <div className="flex items-center gap-2 text-xs">
                <span className="font-medium text-red-600">Delete "{activePipeline.name}"?</span>
                <button
                  onClick={() => deletePipeline.mutate()}
                  disabled={deletePipeline.isPending}
                  className="font-semibold text-red-500 hover:text-red-600 disabled:opacity-50"
                >
                  {deletePipeline.isPending ? 'Deleting…' : 'Yes, delete'}
                </button>
                <button
                  onClick={() => { setDeletePipelineConfirm(false); setDeletePipelineError(''); }}
                  className="font-medium text-gray-400 hover:text-gray-600"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setDeletePipelineConfirm(true)}
                className="flex items-center gap-1 text-xs font-medium text-red-400 hover:text-red-500"
              >
                <Trash2 className="h-3 w-3" /> Delete pipeline
              </button>
            )
          )}
        </div>
      )}
      {deletePipelineError && <p className="mt-1.5 text-xs text-red-500">{deletePipelineError}</p>}

      {/* Stage list */}
      <div className="mt-4 space-y-1">
        {stages.map((stage: any, idx: number) => (
          <div
            key={stage.id}
            draggable
            onDragStart={() => setDragId(stage.id)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => handleDrop(idx)}
          >
            {deleteStageId === stage.id ? (
              <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3">
                <p className="text-sm font-medium text-red-700">Delete "{stage.name}"?</p>
                {deleteStageError ? (
                  <p className="mt-1 text-xs text-red-500">{deleteStageError}</p>
                ) : (
                  <p className="mt-0.5 text-xs text-red-400">This cannot be undone. Stages with deals cannot be deleted.</p>
                )}
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => { setDeleteStageId(null); setDeleteStageError(''); }}
                    className="rounded-lg border border-gray-200 px-3 py-1 text-xs font-medium text-gray-600 hover:bg-white"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => deleteStage.mutate(stage.id)}
                    disabled={deleteStage.isPending}
                    className="rounded-lg bg-red-600 px-3 py-1 text-xs font-semibold text-white hover:bg-red-500 disabled:opacity-50"
                  >
                    {deleteStage.isPending ? 'Deleting…' : 'Yes, delete'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="group flex cursor-grab items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 hover:border-gray-100 hover:bg-gray-50/60 active:cursor-grabbing">
                <GripVertical className="h-4 w-4 shrink-0 text-gray-300" />
                <div className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: stage.color }} />

                {editingStageId === stage.id ? (
                  <input
                    ref={editStageRef}
                    value={editStageName}
                    onChange={(e) => setEditStageName(e.target.value)}
                    onBlur={() => commitEditStage(stage)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') commitEditStage(stage);
                      if (e.key === 'Escape') setEditingStageId(null);
                    }}
                    className="flex-1 rounded-lg border border-indigo-300 bg-white px-2 py-1 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                ) : (
                  <button
                    onClick={() => startEditStage(stage)}
                    className="flex-1 text-left text-sm font-semibold text-gray-800 hover:text-indigo-600"
                  >
                    {stage.name}
                    {(stage.isWon || stage.isLost) && (
                      <span className="ml-2 text-[10px] font-normal text-gray-400 uppercase tracking-wide">
                        {stage.isWon ? 'Won' : 'Lost'} · System
                      </span>
                    )}
                  </button>
                )}

                {!stage.isWon && !stage.isLost && (
                  <button
                    onClick={() => { setDeleteStageId(stage.id); setDeleteStageError(''); }}
                    className="shrink-0 rounded p-1 text-gray-300 opacity-0 transition-opacity hover:bg-red-50 hover:text-red-400 group-hover:opacity-100"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add new stage */}
      <div className="mt-5 border-t border-gray-50 pt-4">
        <p className="mb-2 text-sm font-semibold text-gray-800">Add New Stage</p>
        <div className="flex gap-2">
          <input
            value={newStageName}
            onChange={(e) => setNewStageName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && newStageName.trim()) createStage.mutate({ name: newStageName.trim(), color: newStageColor });
            }}
            placeholder="Enter stage name"
            className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />

          {/* Color picker */}
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setColorPickerOpen((o) => !o)}
              title="Pick a color"
              className="flex h-[38px] w-[38px] items-center justify-center rounded-lg border border-gray-200 bg-white hover:bg-gray-50"
            >
              <span className="h-4 w-4 rounded-full ring-1 ring-black/5" style={{ backgroundColor: newStageColor }} />
            </button>
            {colorPickerOpen && (
              <div className="absolute right-0 top-[calc(100%+6px)] z-10 flex w-[168px] flex-wrap gap-2 rounded-lg border border-gray-100 bg-white p-2.5 shadow-lg">
                {STAGE_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => { setNewStageColor(c); setColorPickerOpen(false); }}
                    className={cn(
                      'h-5 w-5 rounded-full ring-2 ring-transparent transition',
                      newStageColor === c ? 'ring-gray-400 ring-offset-1' : 'hover:ring-gray-300 hover:ring-offset-1',
                    )}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => newStageName.trim() && createStage.mutate({ name: newStageName.trim(), color: newStageColor })}
            disabled={!newStageName.trim() || createStage.isPending}
            className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
          >
            <Plus className="h-3.5 w-3.5" />
            {createStage.isPending ? 'Adding…' : 'Add Stage'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Create Deal Modal ─────────────────────────────────────────────────────────
function CreateDealModal({ open, onClose, stages }: { open: boolean; onClose: () => void; stages: any[] }) {
  const qc = useQueryClient();

  const { data: contactsData } = useQuery({
    queryKey: ['contacts-list'],
    queryFn: async () => {
      const { data } = await api.get('/api/v1/contacts?limit=100');
      return data.data;
    },
    enabled: open,
  });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<DealForm>({
    resolver: zodResolver(dealSchema),
    defaultValues: { stageId: stages[0]?.id },
  });

  const create = useMutation({
    mutationFn: (data: DealForm) =>
      api.post('/api/v1/deals', {
        ...data,
        value: data.value ? parseFloat(data.value) : undefined,
        expectedCloseDate: data.expectedCloseDate
          ? new Date(data.expectedCloseDate).toISOString()
          : undefined,
      }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['deals'] }); reset(); onClose(); },
  });

  return (
    <Modal open={open} onClose={onClose} title="New Deal">
      <form onSubmit={handleSubmit((d) => create.mutate(d))} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Deal Title <span className="text-red-400">*</span>
          </label>
          <input {...register('title')} className={inputCls} placeholder="e.g. Website Redesign" />
          {errors.title && <p className="mt-1 text-xs text-red-500">{errors.title.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Contact <span className="text-red-400">*</span>
          </label>
          <select {...register('contactId')} className={inputCls}>
            <option value="">Select a contact</option>
            {(contactsData || []).map((c: any) => (
              <option key={c.id} value={c.id}>
                {c.name} — {c.company || c.phone}
              </option>
            ))}
          </select>
          {errors.contactId && <p className="mt-1 text-xs text-red-500">{errors.contactId.message}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Stage <span className="text-red-400">*</span></label>
            <select {...register('stageId')} className={inputCls}>
              {stages.map((s: any) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Value (₹)</label>
            <input {...register('value')} type="number" placeholder="0" className={inputCls} />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Expected Close Date</label>
          <input {...register('expectedCloseDate')} type="date" className={inputCls} />
        </div>

        {create.isError && <p className="text-sm text-red-500">Failed to create deal.</p>}

        <div className="flex justify-end gap-3 pt-1">
          <button type="button" onClick={onClose} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">
            Cancel
          </button>
          <button type="submit" disabled={isSubmitting || create.isPending} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50">
            {create.isPending ? 'Creating…' : 'Create Deal'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ── Move Deal Modal ───────────────────────────────────────────────────────────
function MoveDealModal({ deal, stages, onClose }: { deal: any; stages: any[]; onClose: () => void }) {
  const qc = useQueryClient();
  const move = useMutation({
    mutationFn: (stageId: string) => api.patch(`/api/v1/deals/${deal.id}`, { stageId }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['deals'] }); onClose(); },
  });

  return (
    <Modal open={!!deal} onClose={onClose} title="Move Deal" size="sm">
      <p className="mb-4 text-sm font-medium text-gray-700">{deal.title}</p>
      <div className="space-y-2">
        {stages.map((s: any) => (
          <button
            key={s.id}
            onClick={() => move.mutate(s.id)}
            disabled={s.id === deal.stageId || move.isPending}
            className="flex w-full items-center justify-between rounded-lg border border-gray-100 bg-gray-50/50 px-4 py-2.5 text-sm transition hover:bg-gray-50 disabled:opacity-40"
          >
            <div className="flex items-center gap-2.5">
              <div className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
              <span className={s.id === deal.stageId ? 'font-semibold text-gray-900' : 'text-gray-700'}>{s.name}</span>
            </div>
            {s.id === deal.stageId ? (
              <span className="text-xs font-semibold text-indigo-600">Current</span>
            ) : (
              <ChevronRight className="h-4 w-4 text-gray-300" />
            )}
          </button>
        ))}
      </div>
    </Modal>
  );
}

// ── Temperature badge (shown on deal cards) ───────────────────────────────────
const tempConfig = {
  HOT:  { label: 'Hot',  emoji: '🔥', cls: 'bg-orange-50 text-orange-600 ring-orange-100' },
  WARM: { label: 'Warm', emoji: '☀️', cls: 'bg-amber-50 text-amber-600 ring-amber-100'   },
  COLD: { label: 'Cold', emoji: '❄️', cls: 'bg-sky-50 text-sky-600 ring-sky-100'         },
} as const;

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function DealsPage() {
  const reduceMotion = useReducedMotion();
  const [createOpen, setCreateOpen] = useState(false);
  const [movingDeal, setMovingDeal] = useState<any>(null);
  const [activePipelineId, setActivePipelineId] = useState<string | undefined>(undefined);

  const { data: pipelines = [] } = useQuery<any[]>({
    queryKey: ['pipelines'],
    queryFn: async () => {
      const { data } = await api.get('/api/v1/settings/pipelines');
      return data.data;
    },
  });

  const resolvedPipelineId =
    pipelines.find((p: any) => p.id === activePipelineId)?.id ??
    pipelines.find((p: any) => p.isDefault)?.id ??
    pipelines[0]?.id;

  const { data: stagesData } = useQuery({
    queryKey: ['deal-stages', resolvedPipelineId],
    queryFn: async () => {
      const { data } = await api.get('/api/v1/deals/stages', { params: { pipelineId: resolvedPipelineId } });
      return data.data;
    },
    enabled: !!resolvedPipelineId,
  });

  const { data: dealsData, isLoading } = useQuery({
    queryKey: ['deals'],
    queryFn: async () => {
      const { data } = await api.get('/api/v1/deals?limit=200');
      return data.data;
    },
  });

  const stages = stagesData || [];
  const deals = dealsData || [];

  const dealsByStage = stages.reduce((acc: Record<string, any[]>, stage: any) => {
    acc[stage.id] = deals.filter((d: any) => d.stageId === stage.id);
    return acc;
  }, {});

  const totalValue = deals.reduce((sum: number, d: any) => sum + (parseFloat(d.value) || 0), 0);

  return (
    <div className="flex h-full flex-col space-y-5">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-400">
          {deals.length} deals &middot; {formatCurrency(totalValue)} pipeline
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCreateOpen(true)}
            className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500"
          >
            <Plus className="h-3.5 w-3.5" />
            New Deal
          </button>
        </div>
      </div>

      <PipelineStagesPanel activePipelineId={resolvedPipelineId} onSelectPipeline={setActivePipelineId} />

      {/* Kanban board */}
      {isLoading ? (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="w-64 shrink-0 animate-pulse space-y-3">
              <div className="h-4 w-32 rounded bg-gray-200" />
              {Array.from({ length: 3 }).map((_, j) => (
                <div key={j} className="h-20 rounded-xl bg-white border border-gray-100" />
              ))}
            </div>
          ))}
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {stages.map((stage: any) => {
            const stageDeals = dealsByStage[stage.id] || [];
            const stageValue = stageDeals.reduce((s: number, d: any) => s + (parseFloat(d.value) || 0), 0);
            return (
              <div key={stage.id} className="w-[256px] shrink-0">
                {/* Column header */}
                <div className="mb-3 rounded-lg bg-white px-3.5 py-2.5 shadow-sm border border-gray-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full" style={{ backgroundColor: stage.color }} />
                      <span className="text-[13px] font-semibold text-gray-800">{stage.name}</span>
                    </div>
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-500">
                      {stageDeals.length}
                    </span>
                  </div>
                  {stageValue > 0 && (
                    <p className="mt-0.5 pl-4 text-[11px] font-medium text-gray-400">
                      {formatCurrency(stageValue)}
                    </p>
                  )}
                </div>

                {/* Deal cards */}
                <div className="space-y-2">
                  {stageDeals.map((deal: any, i: number) => {
                    const temp = deal.contact?.temperature as keyof typeof tempConfig | undefined;
                    return (
                      <motion.div
                        key={deal.id}
                        {...cardMountProps(i, !!reduceMotion)}
                        onClick={() => setMovingDeal(deal)}
                        className="cursor-pointer rounded-xl border border-gray-100 bg-white p-4 shadow-sm transition-all duration-150 ease-out hover:-translate-y-0.5 hover:border-indigo-100 hover:shadow-md"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-[13px] font-semibold text-gray-900 leading-snug flex-1">
                            {deal.title}
                          </p>
                          {temp && tempConfig[temp] && (
                            <span
                              className={cn(
                                'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1',
                                tempConfig[temp].cls,
                              )}
                            >
                              {tempConfig[temp].emoji} {tempConfig[temp].label}
                            </span>
                          )}
                        </div>
                        {deal.contact && (
                          <p className="mt-1 text-xs text-gray-400">
                            {deal.contact.name}
                            {deal.contact.company && ` · ${deal.contact.company}`}
                          </p>
                        )}
                        <div className="mt-3 flex items-center justify-between">
                          {deal.value ? (
                            <span className="text-sm font-bold text-indigo-600">
                              {formatCurrency(parseFloat(deal.value))}
                            </span>
                          ) : (
                            <span />
                          )}
                          {deal.expectedCloseDate && (
                            <span className="text-[11px] text-gray-400">
                              {new Date(deal.expectedCloseDate).toLocaleDateString('en-IN', {
                                day: 'numeric',
                                month: 'short',
                              })}
                            </span>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}

                  {stageDeals.length === 0 && (
                    <div className="flex flex-col items-center gap-1.5 rounded-xl border-2 border-dashed border-gray-100 py-6 text-center">
                      <Briefcase className="h-4 w-4 text-gray-300" />
                      <p className="text-xs text-gray-300">No deals</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <CreateDealModal open={createOpen} onClose={() => setCreateOpen(false)} stages={stages} />
      {movingDeal && (
        <MoveDealModal deal={movingDeal} stages={stages} onClose={() => setMovingDeal(null)} />
      )}
    </div>
  );
}
