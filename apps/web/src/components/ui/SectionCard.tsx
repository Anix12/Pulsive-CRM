'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { cardMountProps } from '@/lib/motion';

export interface SectionCardProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: { value: number; positive?: boolean };
  index?: number;
  className?: string;
  children: React.ReactNode;
}

export function SectionCard({ title, subtitle, icon, trend, index = 0, className, children }: SectionCardProps) {
  const reduceMotion = !!useReducedMotion();
  const isPositive = trend ? (trend.positive ?? trend.value >= 0) : true;

  return (
    <motion.div
      {...cardMountProps(index, reduceMotion)}
      className={cn(
        'rounded-xl border border-gray-200 bg-white p-5 transition-all duration-150 ease-out hover:-translate-y-0.5 hover:border-gray-300',
        className,
      )}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          {icon}
          <div>
            <h3 className="font-semibold text-gray-900">{title}</h3>
            {subtitle && <p className="text-xs text-gray-400">{subtitle}</p>}
          </div>
        </div>
        {trend && (
          <span
            className={cn(
              'inline-flex shrink-0 items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-semibold',
              isPositive ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600',
            )}
          >
            {isPositive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {isPositive ? '+' : ''}{trend.value}%
          </span>
        )}
      </div>
      {children}
    </motion.div>
  );
}
