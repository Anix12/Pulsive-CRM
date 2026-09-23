'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, useReducedMotion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth.store';
import {
  singleLinks,
  navSections,
  type NavItem,
  type NavSection,
} from '@/lib/navSections';
import { TAP_SPRING } from '@/lib/motion';

function isActive(href: string, pathname: string) {
  return pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
}

function sectionContainsActiveRoute(section: NavSection, pathname: string) {
  return isActive(section.href, pathname) || section.items.some((item) => isActive(item.href, pathname));
}

function NavLink({
  href,
  label,
  icon: Icon,
  active,
  size = 'default',
  onClick,
}: Pick<NavItem, 'href' | 'label' | 'icon'> & {
  active: boolean;
  size?: 'default' | 'md';
  onClick?: () => void;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        'group relative flex items-center gap-2.5 rounded-xl font-medium transition-colors duration-150 ease-out active:scale-[0.97]',
        size === 'md'
          ? 'px-2.5 py-2 text-[14px]'
          : 'px-2.5 py-[7px] text-[13px]',
        active
          ? 'text-white'
          : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800',
      )}
    >
      {active && (
        <motion.span
          layoutId="sidebar-active-bg"
          className="absolute inset-0 rounded-xl bg-blue-600 shadow-md shadow-blue-500/30"
          transition={
            reduceMotion
              ? { duration: 0 }
              : { type: 'spring', stiffness: 500, damping: 40 }
          }
        />
      )}

      <motion.span
        className="relative z-10 flex shrink-0"
        whileTap={reduceMotion ? undefined : { scale: 1.15 }}
        transition={reduceMotion ? { duration: 0 } : TAP_SPRING}
      >
        <Icon
          className={cn(
            'shrink-0 transition-colors duration-150',
            size === 'md' ? 'h-4 w-4' : 'h-[15px] w-[15px]',
            active
              ? 'text-white'
              : 'text-gray-400 group-hover:text-gray-600',
          )}
        />
      </motion.span>

      <span className="relative z-10">{label}</span>
    </Link>
  );
}

/**
 * One top-level nav entry. If `section.items` is empty it's a plain link
 * (no chevron, no expand behavior). Otherwise it's an accordion: clicking
 * the row toggles its own sub-tabs open/closed, independent of every other
 * section — this is driven entirely by `navSections` data, so adding or
 * removing a tab/sub-tab never touches this component.
 */
function SidebarSection({
  section,
  pathname,
  isOpen,
  onToggle,
}: {
  section: NavSection;
  pathname: string;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const router = useRouter();
  const withinSection = sectionContainsActiveRoute(section, pathname);
  const Icon = section.icon;

  if (section.items.length === 0) {
    return <NavLink href={section.href} label={section.label} icon={section.icon} active={withinSection} />;
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => {
          if (withinSection) {
            onToggle();
            return;
          }
          router.push(section.href);
          if (!isOpen) onToggle();
        }}
        aria-expanded={isOpen}
        className={cn(
          'group relative flex w-full items-center gap-2.5 rounded-lg px-2.5 py-[7px] text-[13px] font-medium transition-colors duration-150',
          withinSection ? 'text-white' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800',
        )}
      >
        {withinSection && (
          <motion.span
            layoutId="sidebar-active-pill"
            className="absolute inset-0 rounded-lg bg-blue-600"
            transition={{ type: 'spring', stiffness: 500, damping: 34 }}
          />
        )}
        <Icon className={cn('relative z-10 h-[15px] w-[15px] shrink-0 transition-colors', withinSection ? 'text-white' : 'text-gray-400 group-hover:text-gray-600')} />
        <span className="relative z-10 flex-1 text-left">{section.label}</span>
        <ChevronRight
          className={cn(
            'relative z-10 h-3.5 w-3.5 shrink-0 transition-transform duration-150',
            isOpen && 'rotate-90',
            withinSection ? 'text-white' : 'text-gray-400',
          )}
        />
      </button>
      {isOpen && (
        <div className="my-0.5 ml-[14px] flex flex-col gap-0.5 border-l border-gray-100 pl-[14px]">
          {section.items.map((item) => {
            const active = isActive(item.href, pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'rounded-md py-[6px] pl-2 text-left text-[12.5px] transition-colors',
                  active ? 'font-semibold text-blue-700' : 'font-normal text-gray-500 hover:bg-gray-50 hover:text-gray-800',
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuthStore();

  // Independent open/closed state per section, keyed by section.key — works
  // the same whether there are 2 sections or 20. Seeded once so whichever
  // section holds the initial route starts expanded.
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const section of navSections) {
      initial[section.key] = sectionContainsActiveRoute(section, pathname);
    }
    return initial;
  });

  // If the route changes to a page inside a section that isn't open yet
  // (e.g. navigated there some other way), auto-expand it — without ever
  // collapsing sections the user already opened.
  useEffect(() => {
    setExpanded((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const section of navSections) {
        if (!next[section.key] && sectionContainsActiveRoute(section, pathname)) {
          next[section.key] = true;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [pathname]);

  const toggleSection = (key: string) => setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));

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
        <NavLink {...dashboard} active={isActive(dashboard.href, pathname)} size="md" onClick={() => setExpanded({})} />
        <div className="my-2 border-t border-gray-100" />
        {navSections.map((section) => (
          <SidebarSection
            key={section.key}
            section={section}
            pathname={pathname}
            isOpen={!!expanded[section.key]}
            onToggle={() => toggleSection(section.key)}
          />
        ))}
        <div className="my-2 border-t border-gray-100" />
        {rest.map((link) => (
          <NavLink key={link.href} {...link} active={isActive(link.href, pathname)} />
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
