'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Users, Briefcase, Phone, MessageSquare,
  Zap, TrendingUp, Plug, Settings,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth.store';

const navGroups = [
  {
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    ],
  },
  {
    label: 'Sales',
    items: [
      { href: '/dashboard/contacts', label: 'Contacts', icon: Users },
      { href: '/dashboard/deals', label: 'Pipeline', icon: Briefcase },
    ],
  },
  {
    label: 'Engage',
    items: [
      { href: '/dashboard/calls', label: 'Calls', icon: Phone },
      { href: '/dashboard/messages', label: 'Messages', icon: MessageSquare },
    ],
  },
  {
    label: 'Automate',
    items: [
      { href: '/dashboard/workflows', label: 'Workflows', icon: Zap },
      { href: '/dashboard/reports', label: 'Reports', icon: TrendingUp },
    ],
  },
];

const bottomItems = [
  { href: '/dashboard/integrations', label: 'Integrations', icon: Plug },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
];

function NavLink({
  href,
  label,
  icon: Icon,
  pathname,
}: {
  href: string;
  label: string;
  icon: React.ElementType;
  pathname: string;
}) {
  const isActive =
    pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
  return (
    <Link
      href={href}
      className={cn(
        'group flex items-center gap-2.5 rounded-lg px-2.5 py-[7px] text-[13px] font-medium transition-all duration-150',
        isActive
          ? 'bg-white/10 text-white'
          : 'text-white/45 hover:bg-white/[0.07] hover:text-white/80',
      )}
    >
      <Icon
        className={cn(
          'h-[15px] w-[15px] shrink-0 transition-colors',
          isActive ? 'text-indigo-400' : 'text-white/30 group-hover:text-white/60',
        )}
      />
      {label}
    </Link>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuthStore();

  const initials = `${user?.firstName?.[0] ?? ''}${user?.lastName?.[0] ?? ''}`.toUpperCase();

  return (
    <aside className="flex w-[218px] shrink-0 flex-col bg-[#0d0f14]">
      {/* Brand */}
      <div className="flex h-14 items-center gap-2.5 border-b border-white/[0.06] px-4">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500">
          <span className="text-[11px] font-bold tracking-tight text-white">CRM</span>
        </div>
        <span className="text-[13.5px] font-semibold tracking-tight text-white/90">
          CRM Pro
        </span>
      </div>

      {/* Main nav */}
      <nav className="flex-1 space-y-4 overflow-y-auto px-2.5 py-4">
        {navGroups.map((group, i) => (
          <div key={i}>
            {group.label && (
              <p className="mb-1 px-2.5 text-[10px] font-semibold uppercase tracking-[0.09em] text-white/25">
                {group.label}
              </p>
            )}
            <ul className="space-y-0.5">
              {group.items.map((item) => (
                <li key={item.href}>
                  <NavLink {...item} pathname={pathname} />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {/* Configure section */}
      <div className="border-t border-white/[0.06] px-2.5 py-3">
        <p className="mb-1 px-2.5 text-[10px] font-semibold uppercase tracking-[0.09em] text-white/25">
          Configure
        </p>
        <ul className="space-y-0.5">
          {bottomItems.map((item) => (
            <li key={item.href}>
              <NavLink {...item} pathname={pathname} />
            </li>
          ))}
        </ul>
      </div>

      {/* User identity */}
      {user && (
        <div className="border-t border-white/[0.06] px-3 py-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-500/25 text-[11px] font-bold text-indigo-300">
              {initials || '?'}
            </div>
            <div className="min-w-0">
              <p className="truncate text-[12.5px] font-medium leading-tight text-white/70">
                {user.firstName} {user.lastName}
              </p>
              <p className="text-[10px] capitalize leading-tight text-white/30">
                {user.role?.toLowerCase()}
              </p>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
