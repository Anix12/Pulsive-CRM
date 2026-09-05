'use client';

import { useEffect, useRef, useState } from 'react';
import {
  startOfDay, endOfDay, startOfWeek, startOfMonth, endOfMonth,
  subDays, startOfQuarter, endOfQuarter, format, isSameDay,
} from 'date-fns';
import { Calendar, ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface DateRange {
  from: Date;
  to: Date;
  label: string;
}

const now = () => new Date();

function buildPresets(): { key: string; label: string; range: () => DateRange }[] {
  return [
    { key: 'today', label: 'Today', range: () => ({ from: startOfDay(now()), to: endOfDay(now()), label: 'today' }) },
    { key: 'yesterday', label: 'Yesterday', range: () => { const y = subDays(now(), 1); return { from: startOfDay(y), to: endOfDay(y), label: 'yesterday' }; } },
    { key: '7d', label: 'Last 7 days', range: () => ({ from: startOfDay(subDays(now(), 6)), to: endOfDay(now()), label: 'in the last 7 days' }) },
    { key: 'week', label: 'This week', range: () => ({ from: startOfWeek(now()), to: endOfDay(now()), label: 'this week' }) },
    { key: 'month', label: 'This month', range: () => ({ from: startOfMonth(now()), to: endOfDay(now()), label: 'this month' }) },
    { key: '30d', label: 'Last 30 days', range: () => ({ from: startOfDay(subDays(now(), 29)), to: endOfDay(now()), label: 'in the last 30 days' }) },
    { key: 'quarter', label: 'This quarter', range: () => ({ from: startOfQuarter(now()), to: endOfQuarter(now()), label: 'this quarter' }) },
  ];
}

export const PRESETS = buildPresets();
export const DEFAULT_RANGE: DateRange = PRESETS[4].range(); // "This month" — keeps prior default behavior

export function DateRangeFilter({ value, onChange }: { value: DateRange; onChange: (r: DateRange) => void }) {
  const [open, setOpen] = useState(false);
  const [customFrom, setCustomFrom] = useState(format(value.from, 'yyyy-MM-dd'));
  const [customTo, setCustomTo] = useState(format(value.to, 'yyyy-MM-dd'));
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const activePreset = PRESETS.find((p) => {
    const r = p.range();
    return isSameDay(r.from, value.from) && isSameDay(r.to, value.to);
  });

  const displayLabel = activePreset
    ? activePreset.label
    : `${format(value.from, 'd MMM')} – ${format(value.to, 'd MMM yyyy')}`;

  const applyCustom = () => {
    if (!customFrom || !customTo) return;
    const from = startOfDay(new Date(customFrom));
    const to = endOfDay(new Date(customTo));
    onChange({ from, to, label: `from ${format(from, 'd MMM')} to ${format(to, 'd MMM')}` });
    setOpen(false);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
      >
        <Calendar className="h-3.5 w-3.5 text-blue-600" />
        {displayLabel}
        <ChevronDown className={cn('h-3.5 w-3.5 text-gray-400 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="glass-panel absolute right-0 top-full z-30 mt-2 w-64 rounded-xl p-2">
          <ul className="space-y-0.5">
            {PRESETS.map((p) => {
              const r = p.range();
              const isActive = isSameDay(r.from, value.from) && isSameDay(r.to, value.to);
              return (
                <li key={p.key}>
                  <button
                    onClick={() => { onChange(r); setOpen(false); }}
                    className={cn(
                      'flex w-full items-center justify-between rounded-lg px-3 py-1.5 text-left text-sm transition',
                      isActive ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50',
                    )}
                  >
                    {p.label}
                    {isActive && <Check className="h-3.5 w-3.5" />}
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="mt-2 border-t border-gray-100 pt-2.5">
            <p className="mb-1.5 px-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400">Custom range</p>
            <div className="flex items-center gap-1.5 px-1">
              <input
                type="date"
                value={customFrom}
                max={customTo}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="w-full rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700 focus:border-blue-500 focus:outline-none"
              />
              <span className="text-gray-300">–</span>
              <input
                type="date"
                value={customTo}
                min={customFrom}
                onChange={(e) => setCustomTo(e.target.value)}
                className="w-full rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700 focus:border-blue-500 focus:outline-none"
              />
            </div>
            <button
              onClick={applyCustom}
              className="btn-gradient-brand mt-2 w-full rounded-md py-1.5 text-xs font-semibold text-white"
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
