'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Modal } from '@/components/ui/Modal';
import { cn } from '@/lib/utils';
import {
  errorMessage,
  LEAD_STAGES,
  LEAD_STATUS_LABELS,
  useSaveLeadView,
  type LeadStatusKey,
  type LeadView,
  type SortOrder,
} from '@/lib/leadViews';

const field = 'w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100';
const label = 'mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500';

const SORTS: { value: SortOrder; label: string }[] = [
  { value: 'newest', label: 'Newest first (default)' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'name', label: 'Name A-Z' },
  { value: 'score', label: 'Highest score' },
];

const pretty = (s: string) => s.toLowerCase().replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());

// Create when `view` is undefined, edit (pre-filled) otherwise.
export function LeadViewModal({ open, onClose, view }: { open: boolean; onClose: () => void; view?: LeadView | null }) {
  const save = useSaveLeadView();
  const [name, setName] = useState('');
  const [campaignId, setCampaignId] = useState('');
  const [leadStatus, setLeadStatus] = useState<LeadStatusKey | ''>('');
  const [stages, setStages] = useState<string[]>([]);
  const [tags, setTags] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest');
  const [error, setError] = useState('');

  const { data: campaigns = [] } = useQuery<any[]>({
    queryKey: ['campaigns', 'options'],
    queryFn: async () => (await api.get('/api/v1/campaigns', { params: { limit: 100 } })).data.data,
    enabled: open,
  });

  useEffect(() => {
    if (!open) return;
    const f = view?.filters ?? {};
    setName(view?.name ?? '');
    setCampaignId(f.campaignId ?? '');
    setLeadStatus(f.leadStatus ?? '');
    setStages(f.stagesAndTags?.stages ?? []);
    setTags((f.stagesAndTags?.tags ?? []).join(', '));
    setFrom(f.creationDateRange?.from?.slice(0, 10) ?? '');
    setTo(f.creationDateRange?.to?.slice(0, 10) ?? '');
    setSortOrder(f.sortOrder ?? 'newest');
    setError('');
  }, [open, view]);

  const toggleStage = (s: string) => setStages((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return setError('Give your view a name');
    setError('');
    try {
      await save.mutateAsync({
        id: view?.id,
        name: name.trim(),
        filters: {
          campaignId: campaignId || null,
          leadStatus: leadStatus || null,
          stagesAndTags: { stages, tags: tags.split(',').map((t) => t.trim()).filter(Boolean) },
          creationDateRange: {
            from: from ? new Date(from).toISOString() : null,
            to: to ? new Date(`${to}T23:59:59`).toISOString() : null,
          },
          sortOrder,
        },
      });
      onClose();
    } catch (err) {
      setError(errorMessage(err, 'Could not save the view'));
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={view ? 'Edit view' : 'Create a new view'}
      description="Choose the filters this view should apply. You can change them any time."
    >
      <form onSubmit={submit} className="mt-5 space-y-5">
        <div>
          <label className={label}>View name</label>
          <input className={field} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Hot leads from IVR" maxLength={60} autoFocus />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={label}>Campaign</label>
            <select className={field} value={campaignId} onChange={(e) => setCampaignId(e.target.value)}>
              <option value="">All campaigns</option>
              {campaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className={label}>Lead status</label>
            <select className={field} value={leadStatus} onChange={(e) => setLeadStatus(e.target.value as LeadStatusKey | '')}>
              <option value="">Any status</option>
              {(Object.keys(LEAD_STATUS_LABELS) as LeadStatusKey[]).map((k) => <option key={k} value={k}>{LEAD_STATUS_LABELS[k]}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className={label}>Stages</label>
          <div className="flex flex-wrap gap-2">
            {LEAD_STAGES.map((s) => (
              <button
                type="button"
                key={s}
                onClick={() => toggleStage(s)}
                className={cn(
                  'rounded-full px-3 py-1.5 text-xs font-semibold ring-1 transition',
                  stages.includes(s) ? 'bg-[#5B21B6] text-white ring-[#5B21B6]' : 'bg-white text-gray-600 ring-gray-200 hover:ring-violet-300',
                )}
              >
                {pretty(s)}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className={label}>Tags</label>
          <input className={field} value={tags} onChange={(e) => setTags(e.target.value)} placeholder="Comma separated, e.g. b2b, tech" />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className={label}>Created from</label>
            <input type="date" className={field} value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <label className={label}>Created to</label>
            <input type="date" className={field} value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div>
            <label className={label}>Sorting</label>
            <select className={field} value={sortOrder} onChange={(e) => setSortOrder(e.target.value as SortOrder)}>
              {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
        </div>

        {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}

        <div className="flex justify-end gap-3 border-t border-gray-100 pt-4">
          <button type="button" onClick={onClose} className="rounded-full px-5 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-100">
            Cancel
          </button>
          <button
            type="submit"
            disabled={save.isPending}
            className="rounded-full bg-[#5B21B6] px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-800 disabled:opacity-60"
          >
            {save.isPending ? 'Saving…' : view ? 'Save changes' : 'Create view'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
