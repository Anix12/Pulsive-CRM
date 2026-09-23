import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Manual-dial calling session. The store only tracks *where the agent is* in the queue;
// nothing here ever places a call - the agent clicks the number on each lead themselves.
//   idle       -> on a lead, no call placed yet
//   calling    -> a call has been placed (ringing / live)
//   disposing  -> the call is over and the lead MUST be disposed before moving on
export type SessionPhase = 'idle' | 'calling' | 'disposing';

interface CallSessionState {
  active: boolean;
  viewId: string | null;
  viewName: string;
  queue: string[];
  index: number;
  callId: string | null;
  phase: SessionPhase;
  minimized: boolean;
  start: (p: { viewId: string; viewName: string; queue: string[] }) => void;
  restorePending: (p: { callId: string; contactId: string }) => void;
  callPlaced: (callId: string) => void;
  callEnded: () => void;
  // Called only after the disposition was saved successfully.
  advance: () => void;
  minimize: () => void;
  maximize: () => void;
  end: () => void;
}

const empty = {
  active: false,
  viewId: null,
  viewName: '',
  queue: [] as string[],
  index: 0,
  callId: null,
  phase: 'idle' as SessionPhase,
  minimized: false,
};

export const useCallSession = create<CallSessionState>()(
  persist(
    (set, get) => ({
      ...empty,
      start: ({ viewId, viewName, queue }) =>
        set({ ...empty, active: true, viewId, viewName, queue, index: 0 }),
      restorePending: ({ callId, contactId }) =>
        set({
          ...empty,
          active: true,
          viewName: 'Pending disposition',
          queue: [contactId],
          index: 0,
          callId,
          phase: 'disposing',
          minimized: true,
        }),
      callPlaced: (callId) => set({ callId, phase: 'calling' }),
      callEnded: () => set({ phase: 'disposing' }),
      advance: () => {
        const { index, queue } = get();
        if (index + 1 >= queue.length) set({ ...empty });
        else set({ index: index + 1, callId: null, phase: 'idle' });
      },
      minimize: () => set({ minimized: true }),
      maximize: () => set({ minimized: false }),
      end: () => set({ ...empty }),
    }),
    { name: 'call-session' },
  ),
);
