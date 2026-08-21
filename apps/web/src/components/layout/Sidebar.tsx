'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Users, Briefcase, Phone, MessageSquare,
  Zap, TrendingUp, Plug, Settings, GraduationCap, FileText,
  Megaphone, Send, CheckSquare, LineChart, Brain,
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
      { href: '/dashboard/contacts', label: 'Leads', icon: Users },
      { href: '/dashboard/deals', label: 'Pipeline', icon: Briefcase },
      { href: '/dashboard/campaigns', label: 'Campaigns', icon: Megaphone },
      { href: '/dashboard/tasks', label: 'Tasks', icon: CheckSquare },
    ],
  },
  {
    label: 'Engage',
    items: [
      { href: '/dashboard/calls', label: 'Calls', icon: Phone },
      { href: '/dashboard/messages', label: 'Messages', icon: MessageSquare },
      { href: '/dashboard/templates', label: 'Templates', icon: FileText },
      { href: '/dashboard/marketing', label: 'Marketing', icon: Send },
    ],
  },
  {
    label: 'Automate',
    items: [
      { href: '/dashboard/workflows', label: 'Workflows', icon: Zap },
      { href: '/dashboard/reports', label: 'Reports', icon: TrendingUp },
      { href: '/dashboard/forecast', label: 'Sales Forecast', icon: LineChart },
      { href: '/dashboard/campaign-intelligence', label: 'Campaign Intelligence', icon: Brain },
    ],
  },
  {
    label: 'Admissions',
    items: [
      { href: '/dashboard/applications', label: 'Applications', icon: GraduationCap },
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
        'group relative flex items-center gap-2.5 rounded-lg px-2.5 py-[7px] text-[13px] font-medium transition-all duration-150',
        isActive
          ? 'bg-gradient-to-r from-cyan-400/15 to-cyan-400/0 text-white'
          : 'text-white/45 hover:bg-white/[0.06] hover:text-white/80',
      )}
    >
      {isActive && (
        <span className="absolute left-0 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-r-full bg-cyan-400 shadow-[0_0_8px_1px_rgba(34,211,238,0.7)]" />
      )}
      <Icon
        className={cn(
          'h-[15px] w-[15px] shrink-0 transition-colors',
          isActive ? 'text-cyan-400' : 'text-white/30 group-hover:text-white/60',
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
    <aside className="flex w-[218px] shrink-0 flex-col border-r border-white/[0.06] bg-[#060a16]">
      {/* Brand */}
      <div className="flex h-14 items-center gap-2.5 border-b border-white/[0.06] px-4">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-400 to-blue-700 shadow-[0_0_16px_-2px_rgba(34,211,238,0.6)]">
          <span className="text-[13px] font-bold tracking-tight text-white">P</span>
        </div>
        <span className="text-[13.5px] font-semibold tracking-tight text-white/90">
          <span className="text-gradient-brand">Pulsive</span>
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
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400/30 to-blue-600/30 text-[11px] font-bold text-cyan-300 ring-1 ring-cyan-400/20">
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
