'use client';

import { motion, useReducedMotion } from 'framer-motion';

export interface BarDatum {
  label: string;
  value: number;
}

export interface SimpleBarChartProps {
  data: BarDatum[];
  /** Index of the bar to highlight in the accent color; defaults to the largest value. */
  activeIndex?: number;
  height?: number;
  formatValue?: (n: number) => string;
}

export function SimpleBarChart({ data, activeIndex, height = 200, formatValue }: SimpleBarChartProps) {
  const reduceMotion = !!useReducedMotion();
  const max = Math.max(...data.map((d) => d.value), 1);
  const resolvedActive = activeIndex ?? data.reduce((best, d, i) => (d.value > (data[best]?.value ?? -Infinity) ? i : best), 0);

  return (
    <div className="flex gap-3" style={{ height }}>
      {data.map((d, i) => {
        const pct = Math.max(2, (d.value / max) * 100);
        const isActive = i === resolvedActive;
        // The highlighted bar animates in last, so it visually "lands" as the focal point.
        const delay = isActive ? data.length * 0.03 + 0.08 : i * 0.03;

        return (
          <div key={d.label} className="flex flex-1 flex-col items-center gap-2">
            <div className="flex w-full flex-1 flex-col justify-end">
              <motion.div
                className={`mx-auto w-full max-w-[36px] rounded-t-md ${isActive ? 'bg-blue-600' : 'bg-blue-100'}`}
                title={formatValue ? formatValue(d.value) : String(d.value)}
                initial={reduceMotion ? { height: `${pct}%` } : { height: 0 }}
                animate={{ height: `${pct}%` }}
                transition={reduceMotion ? { duration: 0 } : { duration: 0.5, ease: 'easeOut', delay }}
              />
            </div>
            <span className="text-[11px] font-medium text-gray-400">{d.label}</span>
          </div>
        );
      })}
    </div>
  );
}
