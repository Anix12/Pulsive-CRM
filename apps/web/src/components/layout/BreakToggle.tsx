'use client';

import { useEffect, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Coffee, ChevronDown } from 'lucide-react';
import api from '@/lib/api';
import { cn } from '@/lib/utils';
import { useCallSession } from '@/store/callSession.store';
import { usePresence, breakEndsAt } from '@/lib/presence';

const DURATIONS = [5, 10, 15, 30, 60];

const clock = (ms: number) => {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = String(Math.floor(total / 60)).padStart(2, '0');
  const s = String(total % 60).padStart(2, '0');
  return `${m}:${s}`;
};

export function BreakToggle() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [duration, setDuration] = useState<number>(15);
  const ref = useRef<HTMLDivElement>(null);
  const autoEndedRef = useRef(false);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const { data: presence } = usePresence();
  const minimizeSession = useCallSession((s) => s.minimize);
  const onBreak = presence?.status === 'BREAK';
  const endsAt = breakEndsAt(presence);

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!onBreak) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [onBreak]);

  // A calling session only ever pauses via a break now (no End Session mid-queue), so
  // starting one always steps the agent out of the active queue.
  const startBreak = useMutation({
    mutationFn: (label: string) => api.post('/api/v1/presence/break/start', { label, durationMinutes: duration }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['presence'] });
      minimizeSession();
      autoEndedRef.current = false;
      setOpen(false);
    },
  });

  const endBreak = useMutation({
    mutationFn: () => api.post('/api/v1/presence/break/end'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['presence'] }),
  });

  // Auto-resume the moment the chosen duration elapses - still endable early any time before that.
  useEffect(() => {
    if (!onBreak || !endsAt || autoEndedRef.current) return;
    if (now >= endsAt && !endBreak.isPending) {
      autoEndedRef.current = true;
      endBreak.mutate();
    }
  }, [now, onBreak, endsAt, endBreak]);

  if (onBreak) {
    return (
      <button
        onClick={() => endBreak.mutate()}
        disabled={endBreak.isPending}
        className="flex items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 transition hover:bg-amber-100 disabled:opacity-60"
        title={presence?.currentBreakLabel ?? undefined}
      >
        <Coffee className="h-3.5 w-3.5" />
        On break{endsAt ? <span className="tabular-nums">· {clock(endsAt - now)}</span> : null}
        <span className="ml-1 rounded-full bg-amber-200 px-1.5 py-0.5 text-[10px]">End</span>
      </button>
    );
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-800"
      >
        <Coffee className="h-3.5 w-3.5" />
        Take a Break
        <ChevronDown className="h-3 w-3" />
      </button>

      {open && <BreakMenu duration={duration} setDuration={setDuration} onStart={(label) => startBreak.mutate(label)} starting={startBreak.isPending} />}
    </div>
  );
}

function BreakMenu({
  duration, setDuration, onStart, starting,
}: { duration: number; setDuration: (n: number) => void; onStart: (label: string) => void; starting: boolean }) {
  const [windows, setWindows] = useState<any[] | null>(null);
  useEffect(() => {
    let cancelled = false;
    api.get('/api/v1/settings/break-windows').then(({ data }) => { if (!cancelled) setWindows(data.data); });
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="absolute right-0 top-full z-20 mt-2 w-64 rounded-xl bg-white p-3 shadow-lg ring-1 ring-gray-100">
      <p className="mb-1.5 px-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400">Duration</p>
      <div className="mb-3 flex flex-wrap gap-1.5 px-1">
        {DURATIONS.map((d) => (
          <button
            key={d}
            onClick={() => setDuration(d)}
            className={cn(
              'rounded-full px-2.5 py-1 text-xs font-semibold transition',
              duration === d ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
            )}
          >
            {d}m
          </button>
        ))}
      </div>

      <p className="mb-1.5 px-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400">Reason</p>
      {windows === null ? (
        <p className="px-3 py-2 text-xs text-gray-400">Loading…</p>
      ) : windows.length === 0 ? (
        <button
          onClick={() => onStart('Break')}
          disabled={starting}
          className="flex w-full items-center justify-center rounded-lg bg-amber-500 px-3 py-2 text-xs font-semibold text-white hover:bg-amber-600 disabled:opacity-60"
        >
          {starting ? 'Starting…' : `Start ${duration}m break`}
        </button>
      ) : (
        <div className="space-y-0.5">
          {windows.map((w: any) => (
            <button
              key={w.id}
              onClick={() => onStart(w.name)}
              disabled={starting}
              className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
            >
              {w.name}
              <span className="text-gray-400">{duration}m</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
