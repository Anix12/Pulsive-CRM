'use client';

import { motion, useReducedMotion } from 'framer-motion';

export interface ProgressStatProps {
  label: string;
  count: number | string;
  percent: number; // 0-100
  /** Tailwind bg-* class for the fill/dot; auto-cycles through a palette by index when omitted. */
  color?: string;
  index?: number;
}

// Auto-cycled so each pipeline stage / list row gets a distinct color for free.
const COLOR_CYCLE = ['bg-blue-500', 'bg-emerald-500', 'bg-amber-500', 'bg-violet-500', 'bg-pink-500', 'bg-cyan-500'];

export function ProgressStat({ label, count, percent, color, index = 0 }: ProgressStatProps) {
  const reduceMotion = !!useReducedMotion();
  const clamped = Math.max(0, Math.min(100, percent));
  const resolvedColor = color ?? COLOR_CYCLE[index % COLOR_CYCLE.length];

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-sm">
        <span className="flex items-center gap-2 font-medium text-gray-700">
          <span className={`h-2 w-2 shrink-0 rounded-full ${resolvedColor}`} />
          {label}
        </span>
        <span className="font-semibold text-gray-900">{count}</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
        <motion.div
          className={`h-full rounded-full ${resolvedColor}`}
          initial={reduceMotion ? { width: `${clamped}%` } : { width: 0 }}
          animate={{ width: `${clamped}%` }}
          transition={reduceMotion ? { duration: 0 } : { duration: 0.6, ease: 'easeOut', delay: index * 0.08 }}
        />
      </div>
    </div>
  );
}
