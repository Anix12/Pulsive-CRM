'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Coffee } from 'lucide-react';
import api from '@/lib/api';
import { usePresence, breakEndsAt } from '@/lib/presence';

const clock = (ms: number) => {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = String(Math.floor(total / 60)).padStart(2, '0');
  const s = String(total % 60).padStart(2, '0');
  return `${m}:${s}`;
};

// Full-screen block shown wherever calling is off-limits while the agent is on a break.
export function BreakBlock() {
  const qc = useQueryClient();
  const { data: presence } = usePresence();
  const endsAt = breakEndsAt(presence);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const endBreak = useMutation({
    mutationFn: () => api.post('/api/v1/presence/break/end'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['presence'] }),
  });

  return (
    <div className="mx-auto mt-16 flex max-w-md flex-col items-center rounded-3xl bg-white p-10 text-center shadow-sm ring-1 ring-gray-200">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-amber-600"><Coffee className="h-8 w-8" /></span>
      <h1 className="mt-5 text-xl font-bold text-gray-900">You're on a break</h1>
      <p className="mt-1 text-sm text-gray-500">
        {presence?.currentBreakLabel ? `${presence.currentBreakLabel} · ` : ''}Calling and your queue are paused until you're back.
      </p>
      {endsAt && (
        <p className="mt-4 text-3xl font-bold tabular-nums text-amber-600">{clock(endsAt - now)}</p>
      )}
      <button
        onClick={() => endBreak.mutate()}
        disabled={endBreak.isPending}
        className="mt-6 rounded-full bg-[#5B21B6] px-6 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-violet-800 disabled:opacity-60"
      >
        {endBreak.isPending ? 'Resuming…' : 'End break now and resume'}
      </button>
    </div>
  );
}
