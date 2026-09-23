'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { useCallSession } from '@/store/callSession.store';

const FAILED = ['FAILED', 'BUSY', 'NO_ANSWER', 'CANCELLED'];
export const isTerminal = (status?: string | null) => status === 'COMPLETED' || (!!status && FAILED.includes(status));

export type CallStage = 'none' | 'ringing-agent' | 'dialling-lead' | 'live' | 'ended' | 'failed';

// Polls the active session call and derives the stage + live duration shown on the
// session screen and in the minimized bar. The lead's leg being answered (answeredAt)
// starts the timer, so it measures the conversation, not the ringing.
export function useSessionCall() {
  const callId = useCallSession((s) => s.callId);
  const callEnded = useCallSession((s) => s.callEnded);

  const { data: call } = useQuery<any>({
    queryKey: ['session-call', callId],
    queryFn: async () => (await api.get(`/api/v1/calls/${callId}`)).data.data,
    enabled: !!callId,
    refetchInterval: (q) => (q.state.data && isTerminal(q.state.data.status) ? false : 2000),
  });

  const [now, setNow] = useState(() => Date.now());
  const live = !!call?.answeredAt && !isTerminal(call?.status);
  useEffect(() => {
    if (!live) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [live]);

  const status: string | undefined = call?.status;
  useEffect(() => {
    if (isTerminal(status)) callEnded();
  }, [status, callEnded]);

  let stage: CallStage = 'none';
  if (callId) {
    if (status === 'FAILED' || status === 'BUSY' || status === 'NO_ANSWER' || status === 'CANCELLED') stage = 'failed';
    else if (status === 'COMPLETED') stage = 'ended';
    else if (call?.answeredAt) stage = 'live';
    else if (status === 'IN_PROGRESS') stage = 'dialling-lead';
    else stage = 'ringing-agent';
  }

  let seconds = 0;
  if (call?.answeredAt) {
    if (live) seconds = Math.max(0, Math.floor((now - new Date(call.answeredAt).getTime()) / 1000));
    else if (call.duration != null) seconds = call.duration;
    else if (call.endedAt) seconds = Math.max(0, Math.floor((new Date(call.endedAt).getTime() - new Date(call.answeredAt).getTime()) / 1000));
  }

  return { call, stage, seconds, isActive: stage === 'ringing-agent' || stage === 'dialling-lead' || stage === 'live' };
}

export const clock = (total: number) => {
  const m = Math.floor(total / 60).toString().padStart(2, '0');
  const s = (total % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
};
