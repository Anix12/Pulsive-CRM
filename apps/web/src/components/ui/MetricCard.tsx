'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCountUp } from '@/lib/useCountUp';
import { cardMountProps } from '@/lib/motion';
import { useTilt3D } from '@/lib/useTilt3D';

export type MetricTone = 'primary' | 'green' | 'red' | 'amber' | 'blue' | 'violet' | 'cyan';

interface ToneStyle {
  card: string;
  icon: string;
  label: string;
  value: string;
  sub: string;
  pillPositive: string;
  pillNegative: string;
}

const TONE_STYLES: Record<MetricTone, ToneStyle> = {
  primary: {
    card: 'bg-gradient-to-br from-indigo-500 to-purple-600 border-transparent shadow-lg shadow-indigo-500/25',
    icon: 'bg-white/20 text-white',
    label: 'text-indigo-100',
    value: 'text-white',
    sub: 'text-indigo-100/80',
    pillPositive: 'bg-white/25 text-white',
    pillNegative: 'bg-white/25 text-white',
  },
  green: {
    card: 'bg-emerald-50 border-emerald-100',
    icon: 'bg-emerald-500 text-white',
    label: 'text-emerald-700/70',
    value: 'text-gray-900',
    sub: 'text-emerald-700/60',
    pillPositive: 'bg-emerald-100 text-emerald-700',
    pillNegative: 'bg-rose-100 text-rose-700',
  },
  red: {
    card: 'bg-rose-50 border-rose-100',
    icon: 'bg-rose-500 text-white',
    label: 'text-rose-700/70',
    value: 'text-gray-900',
    sub: 'text-rose-700/60',
    pillPositive: 'bg-emerald-100 text-emerald-700',
    pillNegative: 'bg-rose-100 text-rose-700',
  },
  amber: {
    card: 'bg-amber-50 border-amber-100',
    icon: 'bg-amber-500 text-white',
    label: 'text-amber-700/70',
    value: 'text-gray-900',
    sub: 'text-amber-700/60',
    pillPositive: 'bg-emerald-100 text-emerald-700',
    pillNegative: 'bg-rose-100 text-rose-700',
  },
  blue: {
    card: 'bg-blue-50 border-blue-100',
    icon: 'bg-blue-500 text-white',
    label: 'text-blue-700/70',
    value: 'text-gray-900',
    sub: 'text-blue-700/60',
    pillPositive: 'bg-emerald-100 text-emerald-700',
    pillNegative: 'bg-rose-100 text-rose-700',
  },
  violet: {
    card: 'bg-violet-50 border-violet-100',
    icon: 'bg-violet-500 text-white',
    label: 'text-violet-700/70',
    value: 'text-gray-900',
    sub: 'text-violet-700/60',
    pillPositive: 'bg-emerald-100 text-emerald-700',
    pillNegative: 'bg-rose-100 text-rose-700',
  },
  cyan: {
    card: 'bg-cyan-50 border-cyan-100',
    icon: 'bg-cyan-500 text-white',
    label: 'text-cyan-700/70',
    value: 'text-gray-900',
    sub: 'text-cyan-700/60',
    pillPositive: 'bg-emerald-100 text-emerald-700',
    pillNegative: 'bg-rose-100 text-rose-700',
  },
};

// Cards auto-cycle through this palette by index when no explicit `tone` is given,
// so existing call sites get the colorful treatment for free. 'primary' (the vivid
// gradient hero style) is intentionally excluded — it's reserved for a card that
// explicitly opts in via `tone="primary"`, so every card group doesn't get its own hero.
const TONE_CYCLE: MetricTone[] = ['green', 'red', 'amber', 'blue', 'violet', 'cyan'];

export interface MetricCardChange {
  value: number;
  positive?: boolean; // defaults to (value >= 0)
  label?: string; // e.g. "vs previous period" — shown after the pill if provided
}

// Rendering a `React.ElementType`-typed variable directly as JSX (`<Icon />`) stops
// type-checking correctly once `@react-three/fiber` is anywhere in the program — its
// global `JSX.IntrinsicElements` augmentation (needed for `<mesh>`, `<group>`, etc.)
// balloons that union enough to break `JSX.LibraryManagedAttributes` resolution for a
// dynamically-typed component reference. Pinning to a concrete `ComponentType` sidesteps
// the broken generic path without touching behavior.
type IconComponent = React.ComponentType<{ className?: string }>;

export interface MetricCardProps {
  label: string;
  /** Already-formatted display value, used as-is when `numericValue` isn't given. */
  value: string;
  /** When provided (with `formatValue`), the card counts up from 0 to this on mount. */
  numericValue?: number;
  formatValue?: (n: number) => string;
  change?: MetricCardChange;
  /** Muted caption shown under the value when there's no change pill. */
  sub?: string;
  /** Overrides the default value text color, e.g. 'text-red-600' for an alert stat. */
  valueClassName?: string;
  icon?: React.ElementType;
  tone?: MetricTone;
  index?: number;
}

export function MetricCard({ label, value, numericValue, formatValue, change, sub, valueClassName, icon: Icon, tone, index = 0 }: MetricCardProps) {
  const reduceMotion = !!useReducedMotion();
  const canCountUp = numericValue != null && !!formatValue && Number.isFinite(numericValue);
  const animated = useCountUp(canCountUp ? numericValue! : 0, 800, reduceMotion || !canCountUp);
  const display = canCountUp ? formatValue!(animated) : value;

  const isPositive = change ? (change.positive ?? change.value >= 0) : true;
  const resolvedTone = tone ?? TONE_CYCLE[index % TONE_CYCLE.length];
  const t = TONE_STYLES[resolvedTone];
  const { ref: tiltRef, bind: tiltBind, style: tiltStyle, highlightStyle } = useTilt3D(!reduceMotion);
  const IconComp = Icon as IconComponent | undefined;

  return (
    <motion.div
      ref={tiltRef}
      {...tiltBind}
      {...cardMountProps(index, reduceMotion)}
      style={tiltStyle}
      className={cn(
        'relative overflow-hidden rounded-xl border p-5 transition-shadow duration-150 ease-out hover:shadow-md',
        t.card,
      )}
    >
      {tiltStyle && (
        <motion.div className="pointer-events-none absolute inset-0 rounded-xl" style={highlightStyle} />
      )}
      <div className="relative flex items-center justify-between gap-2">
        <p className={cn('text-xs font-semibold uppercase tracking-wide', t.label)}>{label}</p>
        {IconComp && (
          <motion.div
            className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', t.icon)}
            animate={reduceMotion ? undefined : { scale: [1, 1.08, 1] }}
            transition={reduceMotion ? undefined : { duration: 2.4, repeat: Infinity, ease: 'easeInOut', delay: index * 0.15 }}
          >
            <IconComp className="h-4 w-4" />
          </motion.div>
        )}
      </div>
      <p className={cn('mt-2 text-2xl font-bold tracking-tight', valueClassName ?? t.value)}>{display}</p>
      {change ? (
        <div className="mt-2.5 flex items-center gap-1.5">
          <span
            className={cn(
              'inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-semibold',
              isPositive ? t.pillPositive : t.pillNegative,
            )}
          >
            {isPositive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {isPositive ? '+' : ''}{change.value}%
          </span>
          {change.label && <span className={cn('text-[11px]', t.sub)}>{change.label}</span>}
        </div>
      ) : sub ? (
        <p className={cn('mt-2.5 text-[11px]', t.sub)}>{sub}</p>
      ) : null}
    </motion.div>
  );
}
