'use client';

import { CalendarClock, Layers, Pencil, Phone, PhoneMissed, PhoneOff, Trash2, Eye, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LeadView } from '@/lib/leadViews';

interface Props {
  view: LeadView;
  onView: (view: LeadView) => void;
  onStartCalling: (view: LeadView) => void;
  onEdit?: (view: LeadView) => void;
  onDelete?: (view: LeadView) => void;
  starting?: boolean;
  onBreak?: boolean;
}

// Accent per system view; custom views share the brand purple.
const SYSTEM_STYLE: Record<string, { icon: typeof Layers; tint: string; chip: string; bar: string }> = {
  'system:all': { icon: Layers, tint: 'bg-violet-100 text-violet-700', chip: 'bg-violet-50 text-violet-700', bar: 'from-violet-500 to-fuchsia-500' },
  'system:uncontacted': { icon: PhoneOff, tint: 'bg-sky-100 text-sky-700', chip: 'bg-sky-50 text-sky-700', bar: 'from-sky-500 to-cyan-400' },
  'system:in-progress': { icon: Sparkles, tint: 'bg-amber-100 text-amber-700', chip: 'bg-amber-50 text-amber-700', bar: 'from-amber-500 to-orange-400' },
  'system:follow-up': { icon: CalendarClock, tint: 'bg-emerald-100 text-emerald-700', chip: 'bg-emerald-50 text-emerald-700', bar: 'from-emerald-500 to-teal-400' },
  'system:not-connected': { icon: PhoneMissed, tint: 'bg-rose-100 text-rose-700', chip: 'bg-rose-50 text-rose-700', bar: 'from-rose-500 to-pink-400' },
};
const CUSTOM_STYLE = { icon: Layers, tint: 'bg-violet-100 text-violet-700', chip: 'bg-violet-50 text-violet-700', bar: 'from-violet-600 to-indigo-500' };

export function LeadViewCard({ view, onView, onStartCalling, onEdit, onDelete, starting, onBreak }: Props) {
  const style = view.isSystemDefault ? SYSTEM_STYLE[view.id] ?? CUSTOM_STYLE : CUSTOM_STYLE;
  const Icon = style.icon;
  // System views are always callable; custom views only when something matches; nothing
  // is callable while the agent is on a break.
  const callDisabled = onBreak || (!view.isSystemDefault && view.leadCount === 0);
  const disabledReason = onBreak ? "You're on break" : 'No leads match this view';

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-200/80 transition duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:ring-violet-200">
      <div className={cn('h-1.5 w-full bg-gradient-to-r', style.bar)} />

      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start gap-3">
          <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', style.tint)}>
            <Icon className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-[17px] font-semibold text-[#5B21B6]" title={view.name}>{view.name}</h3>
            <span className={cn('mt-1 inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold', style.chip)}>
              {view.leadCount.toLocaleString()} {view.leadCount === 1 ? 'lead' : 'leads'}
            </span>
          </div>

          {!view.isSystemDefault && (
            <div className="flex shrink-0 items-center gap-0.5">
              <button
                onClick={() => onEdit?.(view)}
                aria-label={`Edit ${view.name}`}
                className="rounded-lg p-1.5 text-gray-400 transition hover:bg-violet-50 hover:text-violet-700"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                onClick={() => onDelete?.(view)}
                aria-label={`Delete ${view.name}`}
                className="rounded-lg p-1.5 text-gray-400 transition hover:bg-rose-50 hover:text-rose-600"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        <p className="mt-4 min-h-[44px] text-sm leading-relaxed text-gray-500">
          {view.isSystemDefault ? (
            view.description
          ) : (
            <>
              <span className="font-medium text-gray-600">Filters:</span> {view.filtersSummary}
            </>
          )}
        </p>
      </div>

      <div className="flex items-center gap-3 border-t border-gray-100 px-5 py-4">
        <button
          onClick={() => onView(view)}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-violet-50 whitespace-nowrap px-3 py-2 text-[11.5px] font-bold uppercase tracking-wide text-violet-700 transition hover:bg-violet-100"
        >
          <Eye className="h-3.5 w-3.5" /> View
        </button>

        {/* The wrapper carries the tooltip: disabled buttons swallow hover events. */}
        <span className="group/tip relative flex-1">
          <button
            onClick={() => onStartCalling(view)}
            disabled={callDisabled || starting}
            className={cn(
              'flex w-full items-center justify-center gap-1.5 rounded-full border whitespace-nowrap px-3 py-2 text-[11.5px] font-bold uppercase tracking-wide transition',
              callDisabled
                ? 'cursor-not-allowed border-gray-200 text-gray-400 opacity-60'
                : 'border-violet-300 text-violet-700 hover:bg-violet-700 hover:text-white',
            )}
          >
            <Phone className="h-3.5 w-3.5" /> {starting ? 'Loading…' : 'Start calling'}
          </button>
          {callDisabled && (
            <span
              role="tooltip"
              className="pointer-events-none absolute -top-9 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-lg bg-gray-900 px-2.5 py-1.5 text-xs font-medium text-white opacity-0 shadow-lg transition group-hover/tip:opacity-100"
            >
              {disabledReason}
            </span>
          )}
        </span>
      </div>
    </article>
  );
}
