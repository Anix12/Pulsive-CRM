'use client';

import { useAuthStore } from '@/store/auth.store';
import { useRouter, usePathname } from 'next/navigation';
import { LogOut, ArrowLeft } from 'lucide-react';
import { NotificationBell } from './NotificationBell';
import { BreakToggle } from './BreakToggle';
import { allNavItems } from '@/lib/navSections';

const pageTitles: [string, string][] = [...allNavItems]
  .sort((a, b) => b.href.length - a.href.length)
  .map((item) => [item.href, item.label]);

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
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-gray-100 bg-white/80 px-6 backdrop-blur-xl">
      <div className="flex items-center gap-2">
        {!isHome && (
          <button
            onClick={() => router.back()}
            aria-label="Go back"
            className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
        )}
        <h1 className="text-[15px] font-semibold text-gray-900">{title}</h1>
      </div>

      <div className="flex items-center gap-1">
        <BreakToggle />
        <NotificationBell />

        <div className="mx-2 h-4 w-px bg-gray-200" />

        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-gray-500 transition-colors hover:bg-red-50 hover:text-red-500"
        >
          <LogOut className="h-3.5 w-3.5" />
          Sign out
        </button>
      </div>
    </header>
  );
}
