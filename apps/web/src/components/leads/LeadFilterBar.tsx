'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CalendarDays, ChevronDown, Flag, Megaphone, SlidersHorizontal, Workflow } from 'lucide-react';
import api from '@/lib/api';
import { Modal } from '@/components/ui/Modal';
import { cn } from '@/lib/utils';
import { LEAD_STATUS_LABELS, type LeadStatusKey } from '@/lib/leadViews';

// Filters of the "View leads" screen. They narrow the view that is open.
export interface LeadFilters {
  campaignIds: string[];
  stagesTags: string[];
  leadStatuses: string[];
  datePreset: string;
  dateFrom: string;
  dateTo: string;
  name: string;
  phone: string;
  email: string;
  custom: Record<string, string>;
  assignedToIds: string[];
  followUp: string;
  includeClosed: boolean;
  // true once the filters came from the All Filters search (which has the converted/lost checkbox)
  viaSearch: boolean;
}

export const EMPTY_FILTERS: LeadFilters = {
  campaignIds: [], stagesTags: [], leadStatuses: [], datePreset: '', dateFrom: '', dateTo: '',
  name: '', phone: '', email: '', custom: {}, assignedToIds: [], followUp: '', includeClosed: false, viaSearch: false,
};

export const DATE_PRESETS = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'last7', label: 'Last 7 Days' },
  { value: 'last30', label: 'Last 30 Days' },
  { value: 'custom', label: 'Custom Date' },
];

const FOLLOW_UPS = [
  { value: 'today', label: 'Due today' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'none', label: 'No follow-up scheduled' },
];

const pretty = (s: string) => (/^[A-Z_]+$/.test(s) ? s.toLowerCase().replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase()) : s);

const activeCount = (f: LeadFilters) =>
  (f.campaignIds.length ? 1 : 0) + (f.stagesTags.length ? 1 : 0) + (f.leadStatuses.length ? 1 : 0) +
  (f.datePreset ? 1 : 0) + (f.name || f.phone || f.email ? 1 : 0) + (Object.values(f.custom).some(Boolean) ? 1 : 0) +
  (f.assignedToIds.length ? 1 : 0) + (f.followUp ? 1 : 0);

// Query params understood by GET /api/v1/contacts
export const filtersToParams = (f: LeadFilters) => ({
  campaignIds: f.campaignIds.join(',') || undefined,
  stagesTags: f.stagesTags.join(',') || undefined,
  leadStatuses: f.leadStatuses.join(',') || undefined,
  datePreset: f.datePreset || undefined,
  dateFrom: f.datePreset === 'custom' ? f.dateFrom || undefined : undefined,
  dateTo: f.datePreset === 'custom' ? f.dateTo || undefined : undefined,
  name: f.name || undefined,
  phone: f.phone || undefined,
  email: f.email || undefined,
  custom: Object.values(f.custom).some(Boolean) ? JSON.stringify(f.custom) : undefined,
  assignedToIds: f.assignedToIds.join(',') || undefined,
  followUp: f.followUp || undefined,
  // Only an explicit search from All Filters hides converted and lost leads.
  includeClosed: f.viaSearch && !f.includeClosed ? 'false' : undefined,
});

// ─── Option lists ───────────────────────────────────────────────────────────────

function useOptions(enabled = true) {
  const campaigns = useQuery<any[]>({
    queryKey: ['campaigns', 'options'],
    queryFn: async () => (await api.get('/api/v1/campaigns', { params: { limit: 100 } })).data.data,
    enabled,
  });
  const users = useQuery<any[]>({
    queryKey: ['team-users'],
    queryFn: async () => (await api.get('/api/v1/tenants/me/users')).data.data,
    enabled,
  });
  const opts = useQuery<{ stages: string[]; tags: string[]; customFields: string[] }>({
    queryKey: ['contacts', 'filter-options'],
    queryFn: async () => (await api.get('/api/v1/contacts/filter-options')).data.data,
    enabled,
  });
  return {
    campaigns: (campaigns.data ?? []).map((c) => ({ value: c.id as string, label: c.name as string })),
    users: (users.data ?? []).map((u) => ({ value: u.id as string, label: `${u.firstName} ${u.lastName}`.trim() })),
    stagesTags: [...(opts.data?.stages ?? []), ...(opts.data?.tags ?? [])].map((v) => ({ value: v, label: pretty(v) })),
    statuses: (Object.keys(LEAD_STATUS_LABELS) as LeadStatusKey[]).map((k) => ({ value: k, label: LEAD_STATUS_LABELS[k] === 'In progress' ? 'In-Progress' : LEAD_STATUS_LABELS[k] })),
    customFields: opts.data?.customFields ?? [],
  };
}

type Option = { value: string; label: string };

// ─── Small building blocks ──────────────────────────────────────────────────────

function Check({ checked }: { checked: boolean }) {
  return (
    <span className={cn('flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px] border-2 transition', checked ? 'border-[#5B21B6] bg-[#5B21B6]' : 'border-gray-400 bg-white')}>
      {checked && <svg viewBox="0 0 12 12" className="h-3 w-3 text-white"><path d="M2.5 6.2 5 8.7l4.5-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
    </span>
  );
}
function Radio({ checked }: { checked: boolean }) {
  return (
    <span className={cn('flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border-2 transition', checked ? 'border-[#5B21B6]' : 'border-gray-400')}>
      {checked && <span className="h-2 w-2 rounded-full bg-[#5B21B6]" />}
    </span>
  );
}

function OptionList({ options, value, onChange, single, empty }: { options: Option[]; value: string[]; onChange: (v: string[]) => void; single?: boolean; empty?: string }) {
  if (!options.length) return <p className="px-2 py-6 text-center text-sm text-gray-400">{empty ?? 'Nothing to choose from yet'}</p>;
  return (
    <ul className="max-h-64 space-y-0.5 overflow-y-auto pr-1">
      {options.map((o) => {
        const on = value.includes(o.value);
        return (
          <li key={o.value}>
            <button
              type="button"
              onClick={() => onChange(single ? (on ? [] : [o.value]) : on ? value.filter((v) => v !== o.value) : [...value, o.value])}
              className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left text-sm text-gray-600 transition hover:bg-violet-50"
            >
              {single ? <Radio checked={on} /> : <Check checked={on} />}
              <span className={cn('truncate', on && 'font-semibold text-gray-900')}>{o.label}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

const inputCls = 'w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-violet-400 focus:ring-4 focus:ring-violet-100';

function DateFields({ f, set }: { f: Pick<LeadFilters, 'datePreset' | 'dateFrom' | 'dateTo'>; set: (p: Partial<LeadFilters>) => void }) {
  return (
    <>
      <OptionList single options={DATE_PRESETS} value={f.datePreset ? [f.datePreset] : []} onChange={(v) => set({ datePreset: v[0] ?? '' })} />
      {f.datePreset === 'custom' && (
        <div className="mt-2 grid grid-cols-2 gap-2 px-2">
          <input type="date" className={inputCls} value={f.dateFrom} onChange={(e) => set({ dateFrom: e.target.value })} />
          <input type="date" className={inputCls} value={f.dateTo} onChange={(e) => set({ dateTo: e.target.value })} />
        </div>
      )}
    </>
  );
}

// ─── Toolbar dropdown: pick, then Update ────────────────────────────────────────

function FilterDropdown({ icon: Icon, label, count, children, onOpen, onUpdate }: {
  icon: typeof Megaphone; label: string; count: number; children: React.ReactNode; onOpen: () => void; onUpdate: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => { if (!open) onOpen(); setOpen(!open); }}
        className={cn(
          'flex items-center gap-2.5 rounded-xl border bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition hover:border-violet-300',
          count || open ? 'border-violet-400 ring-2 ring-violet-100' : 'border-gray-200',
        )}
      >
        <Icon className="h-[18px] w-[18px] text-gray-600" />
        {label}
        {count > 0 && <span className="rounded-full bg-[#5B21B6] px-1.5 text-[11px] font-bold text-white">{count}</span>}
        <ChevronDown className={cn('h-4 w-4 text-gray-500 transition', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="absolute left-0 top-[calc(100%+8px)] z-30 w-72 rounded-2xl bg-white shadow-xl ring-1 ring-gray-200">
          <div className="p-3">{children}</div>
          <div className="flex justify-end border-t border-gray-100 px-4 py-3">
            <button
              type="button"
              onClick={() => { onUpdate(); setOpen(false); }}
              className="rounded-xl bg-[#5B21B6] px-6 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-800"
            >
              Update
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── All Filters: the "Search" dialog ───────────────────────────────────────────

const TABS = ['Lead Details', 'Campaign', 'Assigned to', 'Follow-Up', 'Lead Status', 'Creation Date', 'Stages & Tags'] as const;
type Tab = (typeof TABS)[number];

function AllFiltersModal({ open, onClose, applied, onSearch }: {
  open: boolean; onClose: () => void; applied: LeadFilters; onSearch: (f: LeadFilters) => void;
}) {
  const [draft, setDraft] = useState<LeadFilters>(applied);
  const [tab, setTab] = useState<Tab>('Lead Details');
  const options = useOptions(open);
  useEffect(() => { if (open) { setDraft(applied); setTab('Lead Details'); } }, [open, applied]);
  const set = (p: Partial<LeadFilters>) => setDraft((d) => ({ ...d, ...p }));
  const filled = activeCount(draft) > 0;

  return (
    <Modal open={open} onClose={onClose} size="xl" title={<span className="text-lg font-semibold text-[#5B21B6]">Search</span>}>
      <div className="-mx-6 mt-3 border-t border-gray-100" />
      <div className="-mb-2 mt-4 grid min-h-[380px] grid-cols-[190px_1fr] gap-6">
        <nav className="space-y-1 border-r border-gray-100 pr-3">
          {TABS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={cn(
                'block w-full rounded-lg border-l-4 px-3 py-3 text-left text-sm transition',
                tab === t ? 'border-[#5B21B6] bg-violet-50 font-semibold text-gray-900' : 'border-transparent text-gray-500 hover:bg-gray-50',
              )}
            >
              {t}
            </button>
          ))}
        </nav>

        <div className="max-h-[400px] overflow-y-auto pr-2">
          {tab === 'Lead Details' && (
            <div className="space-y-3">
              <p className="text-sm font-semibold text-gray-700">Basic Details</p>
              <input className={inputCls} placeholder="Contact Name" value={draft.name} onChange={(e) => set({ name: e.target.value })} />
              <input className={inputCls} placeholder="Contact Number" value={draft.phone} onChange={(e) => set({ phone: e.target.value })} />
              <input className={inputCls} placeholder="Email" value={draft.email} onChange={(e) => set({ email: e.target.value })} />
              {options.customFields.length > 0 && (
                <>
                  <p className="pt-3 text-sm font-semibold text-gray-700">Custom Contact Property</p>
                  {options.customFields.map((k) => (
                    <input key={k} className={inputCls} placeholder={k} value={draft.custom[k] ?? ''} onChange={(e) => set({ custom: { ...draft.custom, [k]: e.target.value } })} />
                  ))}
                </>
              )}
            </div>
          )}
          {tab === 'Campaign' && <OptionList options={options.campaigns} value={draft.campaignIds} onChange={(v) => set({ campaignIds: v })} />}
          {tab === 'Assigned to' && (
            <OptionList options={[{ value: 'unassigned', label: 'Unassigned' }, ...options.users]} value={draft.assignedToIds} onChange={(v) => set({ assignedToIds: v })} />
          )}
          {tab === 'Follow-Up' && <OptionList single options={FOLLOW_UPS} value={draft.followUp ? [draft.followUp] : []} onChange={(v) => set({ followUp: v[0] ?? '' })} />}
          {tab === 'Lead Status' && <OptionList options={options.statuses} value={draft.leadStatuses} onChange={(v) => set({ leadStatuses: v })} />}
          {tab === 'Creation Date' && <DateFields f={draft} set={set} />}
          {tab === 'Stages & Tags' && <OptionList options={options.stagesTags} value={draft.stagesTags} onChange={(v) => set({ stagesTags: v })} />}
        </div>
      </div>

      <div className="-mx-6 mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 px-6 pt-4">
        <label className="flex cursor-pointer items-center gap-3 text-sm text-gray-700">
          <input type="checkbox" className="sr-only" checked={draft.includeClosed} onChange={(e) => set({ includeClosed: e.target.checked })} />
          <Check checked={draft.includeClosed} />
          Do you want to include converted and lost leads in your search?
        </label>
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => setDraft(EMPTY_FILTERS)} disabled={!filled} className="rounded-full bg-gray-100 px-5 py-2 text-sm font-semibold text-gray-500 transition enabled:hover:bg-gray-200 disabled:opacity-60">
            Reset
          </button>
          <button type="button" onClick={onClose} className="rounded-full border border-gray-300 px-6 py-2 text-sm font-semibold text-gray-800 transition hover:bg-gray-50">
            Cancel
          </button>
          <button
            type="button"
            disabled={!filled}
            onClick={() => { onSearch({ ...draft, viaSearch: true }); onClose(); }}
            className="rounded-full bg-[#5B21B6] px-6 py-2 text-sm font-semibold text-white shadow-sm transition enabled:hover:bg-violet-800 disabled:bg-gray-200 disabled:text-gray-400"
          >
            Search
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ─── The bar ────────────────────────────────────────────────────────────────────

export function LeadFilterBar({ value, onChange }: { value: LeadFilters; onChange: (f: LeadFilters) => void }) {
  const options = useOptions();
  const [draft, setDraft] = useState(value);
  const [allOpen, setAllOpen] = useState(false);
  const set = (p: Partial<LeadFilters>) => setDraft((d) => ({ ...d, ...p }));
  const open = () => setDraft(value); // every dropdown starts from what is applied
  const apply = () => onChange(draft);
  const total = useMemo(() => activeCount(value), [value]);

  return (
    <div className="flex flex-wrap items-center gap-3">
      <FilterDropdown icon={Megaphone} label="Campaigns" count={value.campaignIds.length} onOpen={open} onUpdate={apply}>
        <OptionList options={options.campaigns} value={draft.campaignIds} onChange={(v) => set({ campaignIds: v })} empty="No campaigns yet" />
      </FilterDropdown>
      <FilterDropdown icon={Workflow} label="Stages & Tags" count={value.stagesTags.length} onOpen={open} onUpdate={apply}>
        <OptionList options={options.stagesTags} value={draft.stagesTags} onChange={(v) => set({ stagesTags: v })} />
      </FilterDropdown>
      <FilterDropdown icon={Flag} label="Lead Status" count={value.leadStatuses.length} onOpen={open} onUpdate={apply}>
        <OptionList options={options.statuses} value={draft.leadStatuses} onChange={(v) => set({ leadStatuses: v })} />
      </FilterDropdown>
      <FilterDropdown icon={CalendarDays} label="Creation Date" count={value.datePreset ? 1 : 0} onOpen={open} onUpdate={apply}>
        <DateFields f={draft} set={set} />
      </FilterDropdown>

      <button
        type="button"
        onClick={() => setAllOpen(true)}
        className={cn(
          'flex items-center gap-2.5 rounded-xl border bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition hover:border-violet-300',
          total ? 'border-violet-400 ring-2 ring-violet-100' : 'border-gray-200',
        )}
      >
        <SlidersHorizontal className="h-[18px] w-[18px] text-gray-600" />
        All Filters
        {total > 0 && <span className="rounded-full bg-[#5B21B6] px-1.5 text-[11px] font-bold text-white">{total}</span>}
      </button>

      {total > 0 && (
        <button type="button" onClick={() => onChange(EMPTY_FILTERS)} className="text-sm font-semibold text-[#5B21B6] hover:underline">
          Clear filters
        </button>
      )}

      <AllFiltersModal open={allOpen} onClose={() => setAllOpen(false)} applied={value} onSearch={onChange} />
    </div>
  );
}
