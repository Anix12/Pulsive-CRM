import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

export interface Presence {
  status: 'ACTIVE' | 'BREAK' | 'INACTIVE' | 'OFFLINE';
  currentBreakLabel: string | null;
  breakStartedAt: string | null;
  breakDurationMinutes: number | null;
}

// Shared read of "am I on a break right now" - used to block calling/tasks anywhere in
// the app while a break is active, and to drive the countdown in the header.
export const usePresence = () =>
  useQuery<Presence>({
    queryKey: ['presence', 'me'],
    queryFn: async () => (await api.get('/api/v1/presence/me')).data.data,
    refetchInterval: 15000,
  });

export const breakEndsAt = (p?: Presence | null): number | null => {
  if (!p || p.status !== 'BREAK' || !p.breakStartedAt || !p.breakDurationMinutes) return null;
  return new Date(p.breakStartedAt).getTime() + p.breakDurationMinutes * 60_000;
};
