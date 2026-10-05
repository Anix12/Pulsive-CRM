'use client';

import { useAuthStore } from '@/store/auth.store';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { LogOut, Headset } from 'lucide-react';
import { NotificationBell } from './NotificationBell';
import { BreakToggle } from './BreakToggle';
import { allNavItems, navSections } from '@/lib/navSections';

const pageTitles: [string, string][] = [...allNavItems]
  .sort((a, b) => b.href.length - a.href.length)
  .map((item) => [item.href, item.label]);

export function Header() {
  const { user, logout } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();

  const handleSwitchToAgentView = () => {
    const params = new URLSearchParams({
      name: `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim(),
      email: user?.email ?? '',
    });
    window.location.href = `/user-dashboard.html?${params.toString()}`;
  };

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  const title =
    pageTitles.find(([path]) => pathname === path || pathname.startsWith(path + '/'))?.[1] ??
    'Dashboard';

  const pageTitle = pathname.startsWith('/dashboard/contacts') ? 'Contacts' : title;
  const section = navSections.find((item) =>
    pathname === item.href ||
    item.items.some(({ href }) => pathname === href || pathname.startsWith(`${href}/`)),
  );

  return (
    <header className="relative z-30 flex h-11 shrink-0 items-center justify-between border-b border-[#e7eaf0] bg-[#f7f8fb] px-6">
      <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-2 text-[13px]">
        <Link href="/dashboard" className="shrink-0 text-[#8b95a5] transition-colors hover:text-[#23395d]">
          Pulsive
        </Link>
        {section && (
          <>
            <span aria-hidden="true" className="text-[#c0c6d0]">/</span>
            <Link href={section.href} className="truncate text-[#8b95a5] transition-colors hover:text-[#23395d]">
              {section.label}
            </Link>
          </>
        )}
        <span aria-hidden="true" className="text-[#c0c6d0]">/</span>
        <span className="truncate font-semibold text-[#17243a]">{pageTitle}</span>
      </nav>

      <div className="flex items-center gap-1">
        {user && user.role !== 'AGENT' && (
          <button
            onClick={handleSwitchToAgentView}
            className="mr-1 flex items-center gap-1.5 rounded-lg bg-[#18345e] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[#24477c]"
          >
            <Headset className="h-3.5 w-3.5" />
            Switch to Agent View
          </button>
        )}
        {user?.role !== 'ADMIN' && user?.role !== 'OWNER' && <BreakToggle />}
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
