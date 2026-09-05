'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth.store';
import { singleLinks, navSections, type NavItem } from '@/lib/navSections';

function isActive(href: string, pathname: string) {
  return pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
}

function NavLink({
  href,
  label,
  icon: Icon,
  pathname,
}: Pick<NavItem, 'href' | 'label' | 'icon'> & { pathname: string }) {
  const active = isActive(href, pathname);
  return (
    <Link
      href={href}
      className={cn(
        'group relative flex items-center gap-2.5 rounded-lg px-2.5 py-[7px] text-[13px] font-medium transition-all duration-150',
        active
          ? 'bg-blue-50 text-blue-800'
          : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800',
      )}
    >
      {active && (
        <span className="absolute left-0 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-r-full bg-blue-500" />
      )}
      <Icon
        className={cn(
          'h-[15px] w-[15px] shrink-0 transition-colors',
          active ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600',
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
  const dashboard = singleLinks.find((l) => l.href === '/dashboard')!;
  const rest = singleLinks.filter((l) => l.href !== '/dashboard');

  return (
    <aside className="flex w-[218px] shrink-0 flex-col border-r border-gray-100 bg-white">
      {/* Brand */}
      <div className="flex h-14 items-center gap-2.5 border-b border-gray-100 px-4">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-400 to-blue-600 shadow-[0_0_16px_-4px_rgba(59,130,246,0.6)]">
          <span className="text-[13px] font-bold tracking-tight text-white">P</span>
        </div>
        <span className="text-[13.5px] font-semibold tracking-tight text-gray-900">
          <span className="text-gradient-brand">Pulsive</span>
        </span>
      </div>

      {/* Main nav — one button per area; sub-features live inside each area's page */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2.5 py-4">
        <NavLink {...dashboard} pathname={pathname} />
        <div className="my-2 border-t border-gray-100" />
        {navSections.map((section) => (
          <NavLink
            key={section.key}
            href={section.href}
            label={section.label}
            icon={section.icon}
            pathname={pathname}
          />
        ))}
        <div className="my-2 border-t border-gray-100" />
        {rest.map((link) => (
          <NavLink key={link.href} {...link} pathname={pathname} />
        ))}
      </nav>

      {/* User identity */}
      {user && (
        <div className="border-t border-gray-100 px-3 py-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-50 text-[11px] font-bold text-blue-700 ring-1 ring-blue-200">
              {initials || '?'}
            </div>
            <div className="min-w-0">
              <p className="truncate text-[12.5px] font-medium leading-tight text-gray-800">
                {user.firstName} {user.lastName}
              </p>
              <p className="text-[10px] capitalize leading-tight text-gray-400">
                {user.role?.toLowerCase()}
              </p>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
