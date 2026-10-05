'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
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
  if (href === '/dashboard/contacts' && pathname.startsWith('/dashboard/contacts/list')) {
    return false;
  }
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
          : 'text-[#b8c6dc] hover:bg-white/10 hover:text-white',
      )}
    >
      {active && (
        <motion.span
          layoutId="sidebar-active-bg"
          className="absolute inset-0 rounded-xl bg-[#24477c]"
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
              : 'text-[#91a5c5] group-hover:text-white',
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
          withinSection ? 'text-white' : 'text-[#b8c6dc] hover:bg-white/10 hover:text-white',
        )}
      >
        {withinSection && (
          <motion.span
            layoutId="sidebar-active-pill"
            className="absolute inset-0 rounded-lg bg-[#24477c]"
            transition={{ type: 'spring', stiffness: 500, damping: 34 }}
          />
        )}
        <Icon className={cn('relative z-10 h-[15px] w-[15px] shrink-0 transition-colors', withinSection ? 'text-white' : 'text-[#91a5c5] group-hover:text-white')} />
        <span className="relative z-10 flex-1 text-left">{section.label}</span>
        <ChevronRight
          className={cn(
            'relative z-10 h-3.5 w-3.5 shrink-0 transition-transform duration-150',
            isOpen && 'rotate-90',
            withinSection ? 'text-white' : 'text-[#91a5c5]',
          )}
        />
      </button>
      {isOpen && (
        <div className="my-0.5 ml-[14px] flex flex-col gap-0.5 border-l border-white/15 pl-[14px]">
          {section.items.map((item) => {
            const active = isActive(item.href, pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'rounded-md py-[6px] pl-2 text-left text-[12.5px] transition-colors',
                  active
                    ? 'rounded-r-md bg-white/10 font-semibold text-white'
                    : 'font-normal text-[#aebed5] hover:bg-white/5 hover:text-white',
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
  const contacts = singleLinks.find((l) => l.href === '/dashboard/contacts/list')!;
  const rest = singleLinks.filter((l) => l.href !== '/dashboard' && l.href !== contacts.href);

  return (
    <aside className="flex w-[190px] shrink-0 flex-col border-r border-[#20395f] bg-[#142b52]">
      {/* Brand */}
      <div className="flex h-16 shrink-0 items-center gap-2.5 border-b border-white/10 px-4">
        <Image
          src="/pulsive-logo.png"
          alt=""
          width={34}
          height={34}
          className="h-[34px] w-[34px] rounded-md bg-white object-contain p-0.5"
        />
        <span className="text-[14px] font-semibold tracking-tight text-white">
          Pulsive
        </span>
      </div>

      {/* Main nav — one button per area; sub-features live inside each area's page */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2.5 py-3">
        <NavLink {...dashboard} active={isActive(dashboard.href, pathname)} size="md" onClick={() => setExpanded({})} />
        <NavLink {...contacts} active={isActive(contacts.href, pathname)} size="md" />
        <div className="my-2 border-t border-white/10" />
        {navSections.map((section) => (
          <SidebarSection
            key={section.key}
            section={section}
            pathname={pathname}
            isOpen={!!expanded[section.key]}
            onToggle={() => toggleSection(section.key)}
          />
        ))}
        <div className="my-2 border-t border-white/10" />
        {rest.map((link) => (
          <NavLink key={link.href} {...link} active={isActive(link.href, pathname)} />
        ))}
      </nav>

      {/* User identity */}
      {user && (
        <div className="border-t border-white/10 px-3 py-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#24477c] text-[11px] font-bold text-white ring-1 ring-white/20">
              {initials || '?'}
            </div>
            <div className="min-w-0">
              <p className="truncate text-[12.5px] font-medium leading-tight text-white">
                {user.firstName} {user.lastName}
              </p>
              <p className="text-[10px] capitalize leading-tight text-[#aebed5]">
                {user.role?.toLowerCase()}
              </p>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
