'use client';

import { useAuthStore } from '@/store/auth.store';
import { useRouter, usePathname } from 'next/navigation';
import { LogOut, ArrowLeft } from 'lucide-react';
import { NotificationBell } from './NotificationBell';
import { BreakToggle } from './BreakToggle';

const pageTitles: [string, string][] = [
  ['/dashboard/contacts', 'Contacts'],
  ['/dashboard/deals', 'Pipeline'],
  ['/dashboard/calls', 'Calls'],
  ['/dashboard/messages', 'Messages'],
  ['/dashboard/workflows', 'Workflows'],
  ['/dashboard/reports', 'Reports'],
  ['/dashboard/forecast', 'Sales Forecast'],
  ['/dashboard/campaign-intelligence', 'Campaign Intelligence'],
  ['/dashboard/tasks', 'Tasks'],
  ['/dashboard/campaigns', 'Campaigns'],
  ['/dashboard/marketing', 'Marketing'],
  ['/dashboard/templates', 'Templates'],
  ['/dashboard/applications', 'Applications'],
  ['/dashboard/integrations', 'Integrations'],
  ['/dashboard/settings', 'Settings'],
  ['/dashboard', 'Dashboard'],
];

export function Header() {
  const { logout } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  const title =
    pageTitles.find(([path]) => pathname === path || pathname.startsWith(path + '/'))?.[1] ??
    'Dashboard';

  const isHome = pathname === '/dashboard';

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-white/[0.06] bg-white/[0.02] px-6 backdrop-blur-xl">
      <h1 className="text-[15px] font-semibold text-white/90">{title}</h1>

      <div className="flex items-center gap-1">
        <BreakToggle />
        <NotificationBell />

        <div className="mx-2 h-4 w-px bg-white/10" />

        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-white/50 transition-colors hover:bg-red-500/10 hover:text-red-400"
        >
          <LogOut className="h-3.5 w-3.5" />
          Sign out
        </button>
      </div>
    </header>
  );
}
