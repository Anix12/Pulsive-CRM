'use client';

import { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { DailyBriefing } from './DailyBriefing';

const STORAGE_KEY = 'pulsive:dailyBriefing:lastSeen';

// Resets at midnight IST specifically — not the viewer's device timezone —
// since this CRM is built for Indian SMEs and "today" should mean the same
// thing for everyone regardless of what timezone their laptop is set to.
function todayKey() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
}

/** Shows the daily briefing overlay once per calendar day, on top of whatever
 * dashboard page the user first lands on. Fails open (no auto-briefing,
 * dashboard unaffected) if localStorage is unavailable — the replay button
 * still works either way, since it doesn't depend on storage. */
export function DailyBriefingGate() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      if (window.localStorage.getItem(STORAGE_KEY) !== todayKey()) setShow(true);
    } catch {
      // private-mode / storage-disabled browsers — just skip the auto-briefing
    }
  }, []);

  const dismiss = () => {
    try {
      window.localStorage.setItem(STORAGE_KEY, todayKey());
    } catch {
      // ignore
    }
    setShow(false);
  };

  if (show) return <DailyBriefing onDismiss={dismiss} />;

  return (
    <button
      type="button"
      onClick={() => setShow(true)}
      aria-label="Replay today's briefing"
      title="Replay today's briefing"
      className="group btn-gradient-brand fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full px-4 py-3 text-sm font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 hover:scale-105"
    >
      <span className="relative flex size-2 shrink-0">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-white opacity-75" />
        <span className="relative inline-flex size-2 rounded-full bg-white" />
      </span>
      <Sparkles className="size-4 transition-transform duration-300 group-hover:rotate-12" />
      Daily Brief
    </button>
  );
}
