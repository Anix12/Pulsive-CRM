'use client';

import { useAuthStore } from '@/store/auth.store';
import { useRouter, usePathname } from 'next/navigation';
import { LogOut, Bell } from 'lucide-react';

const pageTitles: [string, string][] = [
  ['/dashboard/contacts', 'Contacts'],
  ['/dashboard/deals', 'Pipeline'],
  ['/dashboard/calls', 'Calls'],
  ['/dashboard/messages', 'Messages'],
  ['/dashboard/workflows', 'Workflows'],
  ['/dashboard/reports', 'Reports'],
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

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-gray-100 bg-white px-6">
      <h1 className="text-[15px] font-semibold text-gray-900">{title}</h1>

      <div className="flex items-center gap-1">
        <button
          className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-50 hover:text-gray-600"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" />
        </button>

        <div className="mx-2 h-4 w-px bg-gray-200" />

        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-gray-500 transition-colors hover:bg-red-50 hover:text-red-600"
        >
          <LogOut className="h-3.5 w-3.5" />
          Sign out
        </button>
      </div>
    </header>
  );
}
