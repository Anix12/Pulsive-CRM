'use client';

import { useEffect, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { cn } from '@/lib/utils';
import { Modal } from '@/components/ui/Modal';
import {
  Plus, Trash2, Check, X, GripVertical, Pencil, Loader2, GitBranch,
} from 'lucide-react';

interface Stage {
  id: string;
  name: string;
  color: string | null;
  order: number;
  isWon: boolean;
  isLost: boolean;
}

interface Pipeline {
  id: string;
  name: string;
  isDefault: boolean;
  stages: Stage[];
}

const STAGE_COLORS = [
  '#94A3B8', '#60A5FA', '#A78BFA', '#F59E0B',
  '#34D399', '#F87171', '#FB923C', '#38BDF8',
  '#4ADE80', '#E879F9', '#F472B6', '#818CF8',
];

const inputCls =
  'block w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm transition placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20';

// ── New / Rename Pipeline modal ─────────────────────────────────────────────
function PipelineFormModal({
  open, onClose, initialName, title, submitLabel, onSubmit, isPending,
}: {
  open: boolean;
  onClose: () => void;
  initialName?: string;
  title: string;
  submitLabel: string;
  onSubmit: (name: string) => void;
  isPending: boolean;
}) {
  const [name, setName] = useState(initialName ?? '');
  useEffect(() => { if (open) setName(initialName ?? ''); }, [open, initialName]);

  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      <form
        onSubmit={(e) => { e.preventDefault(); if (name.trim()) onSubmit(name.trim()); }}
        className="space-y-4"
      >
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Pipeline name</label>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Enterprise Sales"
            className={inputCls}
          />
        </div>
        <div className="flex justify-end gap-3 pt-1">
          <button type="button" onClick={onClose} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">
            Cancel
          </button>
          <button
            type="submit"
            disabled={!name.trim() || isPending}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
          >
            {isPending ? 'Saving…' : submitLabel}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default function PipelinePage() {
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'OWNER' || user?.role === 'ADMIN';

  const [activePipelineId, setActivePipelineId] = useState<string | null>(null);
  const [newPipelineOpen, setNewPipelineOpen] = useState(false);
  const [renamePipelineOpen, setRenamePipelineOpen] = useState(false);
  const [deletePipelineConfirm, setDeletePipelineConfirm] = useState(false);
  const [pipelineError, setPipelineError] = useState('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [addingStage, setAddingStage] = useState(false);
  const [newStageName, setNewStageName] = useState('');
  const [newStageColor, setNewStageColor] = useState(STAGE_COLORS[0]);
  const [deleteStageConfirmId, setDeleteStageConfirmId] = useState<string | null>(null);
  const [stageError, setStageError] = useState('');
  const [dragId, setDragId] = useState<string | null>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  const { data: pipelines = [], isLoading } = useQuery<Pipeline[]>({
    queryKey: ['pipelines-full'],
    queryFn: async () => (await api.get('/api/v1/deals/pipelines')).data.data,
  });

  useEffect(() => {
    if (!activePipelineId && pipelines.length) {
      setActivePipelineId(pipelines.find((p) => p.isDefault)?.id ?? pipelines[0].id);
    }
  }, [pipelines, activePipelineId]);

  const activePipeline = pipelines.find((p) => p.id === activePipelineId) ?? null;
  const stages = activePipeline?.stages ?? [];

  // ── Pipeline mutations ─────────────────────────────────────────────────────
  const createPipeline = useMutation({
    mutationFn: (name: string) => api.post('/api/v1/settings/pipelines', { name }),
    onSuccess: async (res) => {
      await qc.invalidateQueries({ queryKey: ['pipelines-full'] });
      setActivePipelineId(res.data.data.id);
      setNewPipelineOpen(false);
    },
  });

  const renamePipeline = useMutation({
    mutationFn: (name: string) => api.patch(`/api/v1/settings/pipelines/${activePipelineId}`, { name }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pipelines-full'] });
      setRenamePipelineOpen(false);
    },
  });

  const deletePipeline = useMutation({
    mutationFn: () => api.delete(`/api/v1/settings/pipelines/${activePipelineId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pipelines-full'] });
      setActivePipelineId(null);
      setDeletePipelineConfirm(false);
      setPipelineError('');
    },
    onError: (err: any) => {
      setPipelineError(err?.response?.data?.error?.message ?? 'Could not delete this pipeline.');
    },
  });

  // ── Stage mutations ─────────────────────────────────────────────────────────
  const invalidateStages = () => qc.invalidateQueries({ queryKey: ['pipelines-full'] });

  const createStage = useMutation({
    mutationFn: (body: { name: string; color: string }) =>
      api.post('/api/v1/deals/stages', { ...body, pipelineId: activePipelineId }),
    onSuccess: () => {
      invalidateStages();
      setAddingStage(false);
      setNewStageName('');
      setNewStageColor(STAGE_COLORS[0]);
    },
  });

  const updateStage = useMutation({
    mutationFn: ({ id, ...body }: { id: string; name?: string; color?: string }) =>
      api.patch(`/api/v1/deals/stages/${id}`, body),
    onSuccess: () => { invalidateStages(); setEditingId(null); },
  });

  const deleteStage = useMutation({
    mutationFn: (id: string) => api.delete(`/api/v1/deals/stages/${id}`),
    onSuccess: () => { invalidateStages(); setDeleteStageConfirmId(null); setStageError(''); },
    onError: (err: any) => setStageError(err?.response?.data?.error?.message ?? 'Could not delete stage.'),
  });

  const reorderStages = useMutation({
    mutationFn: (orderedIds: string[]) =>
      api.put('/api/v1/deals/stages/reorder', { orderedIds, pipelineId: activePipelineId }),
    onSuccess: () => invalidateStages(),
  });

  const startEdit = (stage: Stage) => {
    setEditingId(stage.id);
    setEditName(stage.name);
    setTimeout(() => editInputRef.current?.focus(), 50);
  };
  const commitEdit = (stage: Stage) => {
    if (editName.trim() && editName.trim() !== stage.name) updateStage.mutate({ id: stage.id, name: editName.trim() });
    else setEditingId(null);
  };

  // Native drag-and-drop reorder
  const handleDrop = (targetId: string) => {
    if (!dragId || dragId === targetId) { setDragId(null); return; }
    const ids = stages.map((s) => s.id);
    const from = ids.indexOf(dragId);
    const to = ids.indexOf(targetId);
    ids.splice(from, 1);
    ids.splice(to, 0, dragId);
    setDragId(null);
    reorderStages.mutate(ids);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Pipeline &amp; Stages</h1>
        <p className="mt-0.5 text-sm text-gray-500">Manage your pipelines and the stages leads move through.</p>
      </div>

      {isLoading ? (
        <div className="flex h-40 items-center justify-center text-gray-400">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : (
        <>
          {/* Pipeline tabs */}
          <div className="flex flex-wrap items-center gap-2">
            {pipelines.map((p) => (
              <button
                key={p.id}
                onClick={() => setActivePipelineId(p.id)}
                className={cn(
                  'flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold transition',
                  p.id === activePipelineId
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-white text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50',
                )}
              >
                {p.isDefault && <GitBranch className="h-3.5 w-3.5 opacity-70" />}
                {p.name}
              </button>
            ))}
            {isAdmin && (
              <button
                onClick={() => setNewPipelineOpen(true)}
                className="flex items-center gap-1.5 rounded-lg border border-dashed border-gray-300 px-4 py-2 text-sm font-medium text-gray-500 hover:border-indigo-300 hover:text-indigo-600"
              >
                <Plus className="h-4 w-4" /> New Pipeline
              </button>
            )}
          </div>

          {activePipeline && (
            <>
              {/* Rename / delete row */}
              {isAdmin && (
                <div className="flex items-center gap-4 text-sm">
                  <button
                    onClick={() => setRenamePipelineOpen(true)}
                    className="flex items-center gap-1.5 font-medium text-gray-500 hover:text-indigo-600"
                  >
                    <Pencil className="h-3.5 w-3.5" /> Rename
                  </button>
                  <button
                    onClick={() => { setDeletePipelineConfirm(true); setPipelineError(''); }}
                    className="flex items-center gap-1.5 font-medium text-red-500 hover:text-red-600"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Delete pipeline
                  </button>
                </div>
              )}

              {deletePipelineConfirm && (
                <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3">
                  <p className="text-sm font-medium text-red-700">Delete "{activePipeline.name}"?</p>
                  <p className="mt-0.5 text-xs text-red-400">
                    {pipelineError || 'This cannot be undone. Pipelines with stages cannot be deleted — move or delete their stages first.'}
                  </p>
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => { setDeletePipelineConfirm(false); setPipelineError(''); }}
                      className="rounded-lg border border-gray-200 px-3 py-1 text-xs font-medium text-gray-600 hover:bg-white"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => deletePipeline.mutate()}
                      disabled={deletePipeline.isPending}
                      className="rounded-lg bg-red-600 px-3 py-1 text-xs font-semibold text-white hover:bg-red-500 disabled:opacity-50"
                    >
                      {deletePipeline.isPending ? 'Deleting…' : 'Yes, delete'}
                    </button>
                  </div>
                </div>
              )}

              {/* Stage list */}
              <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-100">
                <div className="divide-y divide-gray-50">
                  {stages.map((stage) => (
                    <div key={stage.id}>
                      {deleteStageConfirmId === stage.id ? (
                        <div className="mx-3 my-2 rounded-xl border border-red-100 bg-red-50 px-4 py-3">
                          <p className="text-sm font-medium text-red-700">Delete "{stage.name}"?</p>
                          <p className="mt-0.5 text-xs text-red-400">{stageError || 'This cannot be undone. Stages with deals cannot be deleted.'}</p>
                          <div className="mt-3 flex gap-2">
                            <button
                              onClick={() => { setDeleteStageConfirmId(null); setStageError(''); }}
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
                        <div
                          draggable
                          onDragStart={() => setDragId(stage.id)}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={() => handleDrop(stage.id)}
                          className={cn(
                            'group flex items-center gap-3 px-5 py-3.5 transition',
                            dragId === stage.id ? 'opacity-40' : 'hover:bg-gray-50/60',
                          )}
                        >
                          <button className="cursor-grab text-gray-300 hover:text-gray-500 active:cursor-grabbing" title="Drag to reorder">
                            <GripVertical className="h-4 w-4" />
                          </button>

                          <span
                            className="h-3.5 w-3.5 shrink-0 rounded-full ring-2 ring-white ring-offset-1"
                            style={{ backgroundColor: stage.color ?? '#94A3B8' }}
                          />

                          {editingId === stage.id ? (
                            <input
                              ref={editInputRef}
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              onBlur={() => commitEdit(stage)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') commitEdit(stage);
                                if (e.key === 'Escape') setEditingId(null);
                              }}
                              className="flex-1 rounded-lg border border-indigo-300 bg-white px-2 py-1 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                            />
                          ) : (
                            <button
                              onClick={() => startEdit(stage)}
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

                          {editingId !== stage.id && !stage.isWon && !stage.isLost && (
                            <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                              {STAGE_COLORS.map((c) => (
                                <button
                                  key={c}
                                  onClick={() => updateStage.mutate({ id: stage.id, color: c })}
                                  className={cn(
                                    'h-3.5 w-3.5 rounded-full ring-2 ring-transparent transition',
                                    stage.color === c ? 'ring-gray-400 ring-offset-1' : 'hover:ring-gray-300 hover:ring-offset-1',
                                  )}
                                  style={{ backgroundColor: c }}
                                />
                              ))}
                            </div>
                          )}

                          {!stage.isWon && !stage.isLost && (
                            <button
                              onClick={() => { setDeleteStageConfirmId(stage.id); setStageError(''); }}
                              className="shrink-0 rounded p-1.5 text-gray-300 hover:bg-red-50 hover:text-red-400"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ))}

                  {stages.length === 0 && (
                    <p className="px-5 py-10 text-center text-sm text-gray-400">No stages in this pipeline yet.</p>
                  )}
                </div>

                {/* Add stage */}
                <div className="border-t border-gray-50 p-3">
                  {addingStage ? (
                    <div className="space-y-3 rounded-xl border border-indigo-100 bg-indigo-50/50 p-3">
                      <p className="text-xs font-semibold text-indigo-700">New Stage</p>
                      <input
                        autoFocus
                        value={newStageName}
                        onChange={(e) => setNewStageName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && newStageName.trim()) createStage.mutate({ name: newStageName.trim(), color: newStageColor });
                          if (e.key === 'Escape') { setAddingStage(false); setNewStageName(''); }
                        }}
                        placeholder="Stage name…"
                        className={inputCls}
                      />
                      <div>
                        <p className="mb-1.5 text-[11px] font-medium text-gray-500">Pick a color</p>
                        <div className="flex flex-wrap gap-2">
                          {STAGE_COLORS.map((c) => (
                            <button
                              key={c}
                              onClick={() => setNewStageColor(c)}
                              className={cn(
                                'h-5 w-5 rounded-full ring-2 ring-transparent transition',
                                newStageColor === c ? 'ring-gray-500 ring-offset-1' : 'hover:ring-gray-300 hover:ring-offset-1',
                              )}
                              style={{ backgroundColor: c }}
                            />
                          ))}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => { setAddingStage(false); setNewStageName(''); }}
                          className="flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-white"
                        >
                          <X className="h-3 w-3" /> Cancel
                        </button>
                        <button
                          onClick={() => newStageName.trim() && createStage.mutate({ name: newStageName.trim(), color: newStageColor })}
                          disabled={!newStageName.trim() || createStage.isPending}
                          className="flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
                        >
                          <Check className="h-3 w-3" />
                          {createStage.isPending ? 'Adding…' : 'Add Stage'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setAddingStage(true)}
                      className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-400 transition hover:border-indigo-300 hover:text-indigo-600"
                    >
                      <Plus className="h-4 w-4" />
                      Add Stage
                    </button>
                  )}
                </div>
              </div>
            </>
          )}
        </>
      )}

      <PipelineFormModal
        open={newPipelineOpen}
        onClose={() => setNewPipelineOpen(false)}
        title="New Pipeline"
        submitLabel="Create"
        isPending={createPipeline.isPending}
        onSubmit={(name) => createPipeline.mutate(name)}
      />
      <PipelineFormModal
        open={renamePipelineOpen}
        onClose={() => setRenamePipelineOpen(false)}
        title="Rename Pipeline"
        submitLabel="Save"
        initialName={activePipeline?.name}
        isPending={renamePipeline.isPending}
        onSubmit={(name) => renamePipeline.mutate(name)}
      />
    </div>
  );
}
