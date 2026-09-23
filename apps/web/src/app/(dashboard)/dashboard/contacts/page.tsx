'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, PhoneCall } from 'lucide-react';
import { LeadViewsGrid } from '@/components/leads/LeadViewsGrid';
import { LeadViewModal } from '@/components/leads/LeadViewModal';
import { DeleteViewConfirm } from '@/components/leads/DeleteViewConfirm';
import { errorMessage, fetchLeadQueue, useLeadViews, type LeadView } from '@/lib/leadViews';
import { useCallSession } from '@/store/callSession.store';
import { usePresence } from '@/lib/presence';

export default function LeadViewsPage() {
  const router = useRouter();
  const { data: views, isLoading, isError } = useLeadViews();
  const session = useCallSession();
  const { data: presence } = usePresence();
  const onBreak = presence?.status === 'BREAK';

  const [modal, setModal] = useState<{ open: boolean; view?: LeadView | null }>({ open: false });
  const [deleting, setDeleting] = useState<LeadView | null>(null);
  const [startingId, setStartingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const openList = (v: LeadView) => router.push(`/dashboard/contacts/list?viewId=${encodeURIComponent(v.id)}`);

  const startCalling = async (v: LeadView) => {
    setError('');
    if (onBreak) return setError("You're on break - end it to start calling");
    // One session at a time: an unfinished one (possibly with an undisposed call) resumes.
    if (session.active) {
      session.maximize();
      return router.push('/dashboard/contacts/session');
    }
    setStartingId(v.id);
    try {
      const { leadIds, viewName } = await fetchLeadQueue(v.id);
      if (!leadIds.length) return setError('No leads match this view');
      session.start({ viewId: v.id, viewName, queue: leadIds });
      router.push('/dashboard/contacts/session');
    } catch (err) {
      setError(errorMessage(err, 'Could not start calling'));
    } finally {
      setStartingId(null);
    }
  };

  return (
    <div className="space-y-7">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#4C1D95] via-[#5B21B6] to-[#7C3AED] px-7 py-7 text-white shadow-lg">
        <div className="pointer-events-none absolute -right-10 -top-16 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-20 right-32 h-44 w-44 rounded-full bg-fuchsia-400/20 blur-2xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Lead views</h1>
            <p className="mt-1 max-w-xl text-sm text-violet-100">
              Open a slice of your leads, or start calling it. You dial every lead yourself and dispose each call before the next one.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {session.active && (
              <button
                onClick={() => { session.maximize(); router.push('/dashboard/contacts/session'); }}
                className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2.5 text-sm font-semibold ring-1 ring-white/30 backdrop-blur transition hover:bg-white/25"
              >
                <PhoneCall className="h-4 w-4" /> Resume calling
              </button>
            )}
            <button
              onClick={() => setModal({ open: true, view: null })}
              className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-bold text-[#5B21B6] shadow-sm transition hover:bg-violet-50"
            >
              <Plus className="h-4 w-4" /> New view
            </button>
          </div>
        </div>
      </div>

      {error && <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</p>}

      <LeadViewsGrid
        views={views}
        isLoading={isLoading}
        isError={isError}
        startingId={startingId}
        onBreak={onBreak}
        onView={openList}
        onStartCalling={startCalling}
        onEdit={(v) => setModal({ open: true, view: v })}
        onDelete={setDeleting}
        onCreate={() => setModal({ open: true, view: null })}
      />

      <LeadViewModal open={modal.open} view={modal.view} onClose={() => setModal({ open: false })} />
      <DeleteViewConfirm view={deleting} onClose={() => setDeleting(null)} />
    </div>
  );
}
