'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const TABS = [
  { href: '/dashboard/ai-sales-coach', label: 'Overview' },
  { href: '/dashboard/ai-sales-coach/live-calls', label: 'Live Calls Monitor' },
  { href: '/dashboard/ai-sales-coach/team-performance', label: 'Team/Agent Performance' },
  { href: '/dashboard/ai-sales-coach/activity', label: 'Live Activity' },
  { href: '/dashboard/ai-sales-coach/call-insights', label: 'Call Insights' },
];

export function AiSalesCoachTabs() {
  const pathname = usePathname();
  return (
    <div className="flex gap-1 overflow-x-auto border-b border-gray-200">
      {TABS.map((t) => {
        const active = pathname === t.href;
        return (
          <Link
            key={t.href}
            href={t.href}
            className={cn(
              'whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition-colors',
              active ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-800',
            )}
          >
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}
