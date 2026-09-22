'use client';

import { Plus, Layers } from 'lucide-react';
import type { LeadView } from '@/lib/leadViews';
import { LeadViewCard } from './LeadViewCard';

interface Props {
  views: LeadView[] | undefined;
  isLoading: boolean;
  isError?: boolean;
  startingId?: string | null;
  onBreak?: boolean;
  onView: (v: LeadView) => void;
  onStartCalling: (v: LeadView) => void;
  onEdit: (v: LeadView) => void;
  onDelete: (v: LeadView) => void;
  onCreate: () => void;
}

// 1 column on phones, 2 on tablets, 3 on desktop.
const GRID = 'grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3';

function SkeletonCard() {
  return (
    <div className="animate-pulse overflow-hidden rounded-2xl bg-white ring-1 ring-gray-200/80">
      <div className="h-1.5 bg-gray-200" />
      <div className="space-y-3 p-5">
        <div className="flex gap-3">
          <div className="h-10 w-10 rounded-xl bg-gray-200" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-2/3 rounded bg-gray-200" />
            <div className="h-3 w-1/4 rounded bg-gray-100" />
          </div>
        </div>
        <div className="h-3 w-full rounded bg-gray-100" />
        <div className="h-3 w-3/4 rounded bg-gray-100" />
      </div>
      <div className="flex gap-3 border-t border-gray-100 p-4">
        <div className="h-8 flex-1 rounded-full bg-gray-100" />
        <div className="h-8 flex-1 rounded-full bg-gray-100" />
      </div>
    </div>
  );
}

function SectionTitle({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="mb-3 flex items-baseline gap-3">
      <h2 className="text-sm font-bold uppercase tracking-wider text-gray-900">{title}</h2>
      <span className="text-xs text-gray-400">{hint}</span>
    </div>
  );
}

export function LeadViewsGrid({ views, isLoading, isError, startingId, onBreak, onView, onStartCalling, onEdit, onDelete, onCreate }: Props) {
  if (isLoading) {
    return (
      <div className={GRID}>
        {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
      </div>
    );
  }

  if (isError || !views) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
        Could not load your lead views. Refresh the page to try again.
      </div>
    );
  }

  const system = views.filter((v) => v.isSystemDefault);
  const custom = views.filter((v) => !v.isSystemDefault);
  const card = (v: LeadView) => (
    <LeadViewCard
      key={v.id}
      view={v}
      starting={startingId === v.id}
      onBreak={onBreak}
      onView={onView}
      onStartCalling={onStartCalling}
      onEdit={onEdit}
      onDelete={onDelete}
    />
  );

  return (
    <div className="space-y-9">
      <section>
        <SectionTitle title="System views" hint="Built in and always up to date" />
        <div className={GRID}>{system.map(card)}</div>
      </section>

      <section>
        <SectionTitle title="My views" hint="Filters you saved" />
        {custom.length === 0 ? (
          <div className="flex flex-col items-center rounded-2xl border-2 border-dashed border-violet-200 bg-violet-50/40 px-6 py-12 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
              <Layers className="h-6 w-6" />
            </span>
            <p className="mt-4 text-base font-semibold text-gray-900">No custom views yet</p>
            <p className="mt-1 max-w-sm text-sm text-gray-500">
              Save a combination of campaign, stage, status and date filters once, then open or start calling it in one click.
            </p>
            <button
              onClick={onCreate}
              className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#5B21B6] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-800"
            >
              <Plus className="h-4 w-4" /> Create your first view
            </button>
          </div>
        ) : (
          <div className={GRID}>{custom.map(card)}</div>
        )}
      </section>
    </div>
  );
}
