'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { io, Socket } from 'socket.io-client';
import { ChevronUp, PhoneCall } from 'lucide-react';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { useCallSession } from '@/store/callSession.store';
import { clock, useSessionCall } from '@/components/leads/useSessionCall';

const SESSION_PATH = '/dashboard/contacts/session';

// Mounted once in the dashboard layout, so it is visible from every tab while a calling
// session is minimized. It also owns the live-call socket and restores an undisposed call
// after a reload, so an agent can never lose track of a lead they still have to dispose.
export function MinimizedCallBar() {
  const router = useRouter();
  const pathname = usePathname();
  const qc = useQueryClient();
  const accessToken = useAuthStore((s) => s.accessToken);
  const { active, minimized, index, queue, phase, maximize, restorePending } = useCallSession();
  const { stage, seconds } = useSessionCall();

  useEffect(() => {
    if (!accessToken) return;
    const socket: Socket = io(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000', { auth: { token: accessToken } });
    socket.on('call:status_update', () => qc.invalidateQueries({ queryKey: ['session-call'] }));
    return () => { socket.disconnect(); };
  }, [accessToken, qc]);

  useEffect(() => {
    if (!accessToken || useCallSession.getState().active) return;
    api.get('/api/v1/calls/session/pending')
      .then(({ data }) => {
        const call = data.data;
        if (call?.contactId && !useCallSession.getState().active) restorePending({ callId: call.id, contactId: call.contactId });
      })
      .catch(() => {});
  }, [accessToken, restorePending]);

  if (!active || !minimized || pathname === SESSION_PATH) return null;

  const mustDispose = phase === 'disposing';
  const live = stage === 'live';

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-4">
      <button
        onClick={() => { maximize(); router.push(SESSION_PATH); }}
        className="pointer-events-auto flex w-full max-w-xl items-center gap-4 rounded-2xl bg-gradient-to-r from-[#4C1D95] to-[#7C3AED] px-5 py-3 text-left text-white shadow-2xl ring-1 ring-white/20 transition hover:scale-[1.01]"
      >
        <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/15">
          {(live || stage === 'ringing-agent' || stage === 'dialling-lead') && (
            <span className="absolute inset-0 animate-ping rounded-full bg-white/30" />
          )}
          <PhoneCall className="relative h-5 w-5" />
        </span>

        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold">Maximize to go back to calling</span>
          <span className="block truncate text-xs text-violet-200">
            {queue.length > 0 && <>Lead {index + 1} of {queue.length}</>}
            {live && <> · Live {clock(seconds)}</>}
            {mustDispose && <> · Dispose required</>}
          </span>
        </span>

        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-[#5B21B6]">
          <ChevronUp className="h-5 w-5" />
        </span>
      </button>
    </div>
  );
}
