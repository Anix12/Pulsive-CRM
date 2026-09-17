'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { Plus, ChevronRight, Briefcase, Settings2, GripVertical, Trash2, Check, X } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { cn } from '@/lib/utils';

// ── Color palette for stage picker ────────────────────────────────────────────
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

// ── Manage Stages Modal ───────────────────────────────────────────────────────
function ManageStagesModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [addingNew, setAddingNew] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(STAGE_COLORS[0]);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState('');
  const editInputRef = useRef<HTMLInputElement>(null);

  const { data: stages = [] } = useQuery<any[]>({
    queryKey: ['deal-stages'],
    queryFn: async () => {
      const { data } = await api.get('/api/v1/deals/stages');
      return data.data;
    },
    enabled: open,
  });

  const updateStage = useMutation({
    mutationFn: ({ id, ...body }: { id: string; name?: string; color?: string }) =>
      api.patch(`/api/v1/deals/stages/${id}`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['deal-stages'] });
      setEditingId(null);
    },
  });

  const createStage = useMutation({
    mutationFn: (body: { name: string; color: string }) =>
      api.post('/api/v1/deals/stages', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['deal-stages'] });
      setAddingNew(false);
      setNewName('');
      setNewColor(STAGE_COLORS[0]);
    },
  });

  const deleteStage = useMutation({
    mutationFn: (id: string) => api.delete(`/api/v1/deals/stages/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['deal-stages'] });
      setDeleteConfirmId(null);
      setDeleteError('');
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message ?? 'Could not delete stage.';
      setDeleteError(msg);
    },
  });

  const reorder = useMutation({
    mutationFn: (orderedIds: string[]) =>
      api.put('/api/v1/deals/stages/reorder', { orderedIds }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['deal-stages'] }),
  });

  const startEdit = (stage: any) => {
    setEditingId(stage.id);
    setEditName(stage.name);
    setTimeout(() => editInputRef.current?.focus(), 50);
  };

  const commitEdit = (stage: any) => {
    if (editName.trim() && editName.trim() !== stage.name) {
      updateStage.mutate({ id: stage.id, name: editName.trim() });
    } else {
      setEditingId(null);
    }
  };

  const moveStage = (idx: number, dir: -1 | 1) => {
    const newOrder = [...stages];
    const swap = idx + dir;
    if (swap < 0 || swap >= newOrder.length) return;
    [newOrder[idx], newOrder[swap]] = [newOrder[swap], newOrder[idx]];
    reorder.mutate(newOrder.map((s) => s.id));
  };

  return (
    <Modal open={open} onClose={onClose} title="Manage Pipeline Stages" size="md">
      <div className="space-y-1">
        {stages.map((stage: any, idx: number) => (
          <div key={stage.id}>
            {deleteConfirmId === stage.id ? (
              <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3">
                <p className="text-sm font-medium text-red-700">Delete "{stage.name}"?</p>
                {deleteError ? (
                  <p className="mt-1 text-xs text-red-500">{deleteError}</p>
                ) : (
                  <p className="mt-0.5 text-xs text-red-400">
                    This cannot be undone. Stages with deals cannot be deleted.
                  </p>
                )}
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => {
                      setDeleteConfirmId(null);
                      setDeleteError('');
                    }}
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
              <div className="group flex items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 hover:border-gray-100 hover:bg-gray-50/60">
                {/* Reorder arrows */}
                <div className="flex flex-col gap-0.5">
                  <button
                    onClick={() => moveStage(idx, -1)}
                    disabled={idx === 0 || reorder.isPending}
                    className="rounded p-0.5 text-gray-300 enabled:hover:text-gray-500 disabled:opacity-30"
                  >
                    <GripVertical className="h-4 w-4 rotate-180" style={{ transform: 'scaleY(-1) rotate(0deg)' }} />
                  </button>
                </div>

                {/* Color dot + color picker */}
                <div className="relative shrink-0">
                  <div
                    className="h-3.5 w-3.5 rounded-full ring-2 ring-white ring-offset-1"
                    style={{ backgroundColor: stage.color }}
                  />
                </div>

                {/* Name — click to edit inline */}
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
                    className="flex-1 text-left text-sm font-medium text-gray-800 hover:text-indigo-600"
                  >
                    {stage.name}
                    {(stage.isWon || stage.isLost) && (
                      <span className="ml-2 text-[10px] font-normal text-gray-400 uppercase tracking-wide">
                        {stage.isWon ? 'Won' : 'Lost'} · System
                      </span>
                    )}
                  </button>
                )}

                {/* Color swatches (shown on hover, not for system stages) */}
                {editingId !== stage.id && !stage.isWon && !stage.isLost && (
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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

                {/* Move up/down + delete */}
                <div className="ml-auto flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => moveStage(idx, -1)}
                    disabled={idx === 0 || reorder.isPending}
                    className="rounded p-1 text-gray-300 hover:bg-gray-100 hover:text-gray-500 disabled:opacity-30"
                    title="Move up"
                  >
                    ↑
                  </button>
                  <button
                    onClick={() => moveStage(idx, 1)}
                    disabled={idx === stages.length - 1 || reorder.isPending}
                    className="rounded p-1 text-gray-300 hover:bg-gray-100 hover:text-gray-500 disabled:opacity-30"
                    title="Move down"
                  >
                    ↓
                  </button>
                  {!stage.isWon && !stage.isLost && (
                    <button
                      onClick={() => { setDeleteConfirmId(stage.id); setDeleteError(''); }}
                      className="rounded p-1 text-gray-300 hover:bg-red-50 hover:text-red-400"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Add new stage */}
        {addingNew ? (
          <div className="mt-2 rounded-xl border border-indigo-100 bg-indigo-50/50 p-3 space-y-3">
            <p className="text-xs font-semibold text-indigo-700">New Stage</p>
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newName.trim()) createStage.mutate({ name: newName.trim(), color: newColor });
                if (e.key === 'Escape') { setAddingNew(false); setNewName(''); }
              }}
              placeholder="Stage name…"
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
            <div>
              <p className="mb-1.5 text-[11px] font-medium text-gray-500">Pick a color</p>
              <div className="flex flex-wrap gap-2">
                {STAGE_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setNewColor(c)}
                    className={cn(
                      'h-5 w-5 rounded-full ring-2 ring-transparent transition',
                      newColor === c ? 'ring-gray-500 ring-offset-1' : 'hover:ring-gray-300 hover:ring-offset-1',
                    )}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => { setAddingNew(false); setNewName(''); }}
                className="flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-white"
              >
                <X className="h-3 w-3" /> Cancel
              </button>
              <button
                onClick={() => newName.trim() && createStage.mutate({ name: newName.trim(), color: newColor })}
                disabled={!newName.trim() || createStage.isPending}
                className="flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
              >
                <Check className="h-3 w-3" />
                {createStage.isPending ? 'Adding…' : 'Add Stage'}
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setAddingNew(true)}
            className="mt-2 flex w-full items-center gap-2 rounded-xl border border-dashed border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-400 transition hover:border-indigo-300 hover:text-indigo-600"
          >
            <Plus className="h-4 w-4" />
            Add Stage
          </button>
        )}
      </div>

      <div className="mt-5 flex justify-end border-t border-gray-50 pt-4">
        <button
          onClick={onClose}
          className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-700"
        >
          Done
        </button>
      </div>
    </Modal>
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
  const [createOpen, setCreateOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [movingDeal, setMovingDeal] = useState<any>(null);

  const { data: stagesData } = useQuery({
    queryKey: ['deal-stages'],
    queryFn: async () => {
      const { data } = await api.get('/api/v1/deals/stages');
      return data.data;
    },
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
            onClick={() => setManageOpen(true)}
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-sm font-medium text-gray-600 shadow-sm transition hover:bg-gray-50"
          >
            <Settings2 className="h-3.5 w-3.5" />
            Manage Stages
          </button>
          <button
            onClick={() => setCreateOpen(true)}
            className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500"
          >
            <Plus className="h-3.5 w-3.5" />
            New Deal
          </button>
        </div>
      </div>

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
                  {stageDeals.map((deal: any) => {
                    const temp = deal.contact?.temperature as keyof typeof tempConfig | undefined;
                    return (
                      <div
                        key={deal.id}
                        onClick={() => setMovingDeal(deal)}
                        className="cursor-pointer rounded-xl border border-gray-100 bg-white p-4 shadow-sm transition hover:border-indigo-100 hover:shadow-md"
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
                      </div>
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
      <ManageStagesModal open={manageOpen} onClose={() => setManageOpen(false)} />
      {movingDeal && (
        <MoveDealModal deal={movingDeal} stages={stages} onClose={() => setMovingDeal(null)} />
      )}
    </div>
  );
}
