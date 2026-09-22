'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { Plus, ChevronRight, Briefcase, Settings2, GripVertical, Trash2, Check, X, BarChart3 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { motion, useReducedMotion } from 'framer-motion';
import { Modal } from '@/components/ui/Modal';
import { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { cn } from '@/lib/utils';
import { cardMountProps } from '@/lib/motion';
import { DonutChart } from '@/components/ui/DonutChart';
import { LineChart } from '@/components/ui/LineChart';
import { SimpleBarChart } from '@/components/ui/SimpleBarChart';

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

// ── Sales Analytics report ────────────────────────────────────────────────────
interface DealsAnalyticsData {
  pipelineByStage: { stageId: string; stage: string; order: number; color: string; count: number; value: number }[];
  outcomes: { won: { count: number; value: number }; lost: { count: number; value: number }; open: { count: number; value: number } };
  avgWonValue: number;
  byAgent: { agentId: string; name: string; count: number; value: number }[];
  bySource: { source: string; count: number; value: number }[];
  valueOverTime: { period: string; label: string; value: number; count: number }[];
  aging: { bucket: string; count: number }[];
}

function AnalyticsStat({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="rounded-lg bg-gray-50 p-3.5 text-center">
      <p className="text-xl font-bold" style={{ color }}>{value}</p>
      <p className="mt-0.5 text-[11px] uppercase tracking-wide text-gray-400">{label}</p>
    </div>
  );
}

function DealsAnalytics() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['deals-analytics'],
    queryFn: async () => {
      const { data } = await api.get('/api/v1/deals/analytics');
      return data.data as DealsAnalyticsData;
    },
  });

  if (isError) return null;

  if (isLoading || !data) {
    return <div className="h-56 animate-pulse rounded-xl bg-white shadow-sm ring-1 ring-gray-100" />;
  }

  const { pipelineByStage, outcomes, avgWonValue, byAgent, bySource, valueOverTime, aging } = data;
  const maxStageCount = Math.max(1, ...pipelineByStage.map((s) => s.count));
  const outcomeDonutData = [
    { label: 'Won', count: outcomes.won.count, color: '#34d399' },
    { label: 'Lost', count: outcomes.lost.count, color: '#f87171' },
    { label: 'Open', count: outcomes.open.count, color: '#94a3b8' },
  ].filter((d) => d.count > 0);
  const SOURCE_PALETTE = ['#10b981', '#6366f1', '#0ea5e9', '#f59e0b', '#ec4899', '#8b5cf6', '#3b82f6', '#fb923c'];
  const sourceIsDonut = bySource.length <= 5;
  const sourceSegments = bySource.map((s, i) => ({ label: s.source, value: s.value, color: SOURCE_PALETTE[i % SOURCE_PALETTE.length] }));

  return (
    <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Sales Overview</p>

      <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <AnalyticsStat label="Won value" value={formatCurrency(outcomes.won.value)} color="#059669" />
        <AnalyticsStat label="Lost value" value={formatCurrency(outcomes.lost.value)} color="#dc2626" />
        <AnalyticsStat label="Open pipeline" value={formatCurrency(outcomes.open.value)} color="#d97706" />
        <AnalyticsStat label="Avg. won deal" value={formatCurrency(avgWonValue)} color="#4f46e5" />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400">Pipeline by Stage</p>
          <div className="space-y-2.5">
            {pipelineByStage.map((s) => (
              <div key={s.stageId}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-gray-600">
                    <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: s.color }} />
                    {s.stage}
                  </span>
                  <span className="text-gray-400">{s.count} &middot; {formatCurrency(s.value)}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${(s.count / maxStageCount) * 100}%`, backgroundColor: s.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400">Won vs Lost</p>
          <DonutChart
            data={outcomeDonutData}
            nameKey="label"
            valueKey="count"
            colors={outcomeDonutData.map((d) => d.color)}
            height={140}
            showLegend={false}
            ariaLabel="Deals grouped by outcome"
          />
          <ul className="mt-2 space-y-1">
            {outcomeDonutData.map((d) => (
              <li key={d.label} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-gray-500">
                  <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: d.color }} />
                  {d.label}
                </span>
                <span className="text-gray-700">{d.count}</span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400">Deal Value &middot; last 6 months</p>
          <LineChart
            data={valueOverTime}
            xKey="label"
            series={[{ key: 'value', label: 'Won value', color: '#6366f1' }]}
            variant="area"
            height={170}
            formatValue={(value) => formatCurrency(value)}
            ariaLabel="Won deal value over the last 6 months"
          />
        </div>
      </div>

      {(byAgent.length > 0 || bySource.length > 0 || aging.some((a) => a.count > 0)) && (
        <div className="mt-5 grid gap-5 lg:grid-cols-3">
          {byAgent.length > 0 && (
            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400">Sales by Agent</p>
              <SimpleBarChart
                data={byAgent.slice(0, 6).map((a) => ({ label: a.name.split(' ')[0], value: a.value }))}
                height={140}
                formatValue={(n) => formatCurrency(n)}
              />
            </div>
          )}

          {bySource.length > 0 && (
            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400">Sales by Source</p>
              {sourceIsDonut ? (
                <DonutChart
                  data={sourceSegments}
                  nameKey="label"
                  valueKey="value"
                  colors={sourceSegments.map((s) => s.color)}
                  height={140}
                  showLegend={false}
                  formatValue={(n) => formatCurrency(n)}
                  ariaLabel="Deal value grouped by source"
                />
              ) : (
                <SimpleBarChart
                  data={sourceSegments.slice(0, 6).map((s) => ({ label: s.label, value: s.value }))}
                  height={140}
                  formatValue={(n) => formatCurrency(n)}
                />
              )}
            </div>
          )}

          {aging.some((a) => a.count > 0) && (
            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400">Open Deal Aging</p>
              <SimpleBarChart
                data={aging.map((a) => ({ label: a.bucket.replace(' days', 'd'), value: a.count }))}
                height={140}
                formatValue={(n) => `${n} deal${n === 1 ? '' : 's'}`}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function DealsPage() {
  const reduceMotion = useReducedMotion();
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const [movingDeal, setMovingDeal] = useState<any>(null);
  const [reportOpen, setReportOpen] = useState(true);

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
            onClick={() => setReportOpen((o) => !o)}
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-sm font-medium text-gray-600 shadow-sm transition hover:bg-gray-50"
          >
            <BarChart3 className="h-3.5 w-3.5" />
            {reportOpen ? 'Hide report' : 'Show report'}
          </button>
          <button
            onClick={() => router.push('/dashboard/pipeline')}
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

      {reportOpen && <DealsAnalytics />}

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
