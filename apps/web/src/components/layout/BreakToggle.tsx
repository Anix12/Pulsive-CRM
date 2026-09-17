'use client';

import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Coffee, ChevronDown } from 'lucide-react';
import api from '@/lib/api';
import { cn } from '@/lib/utils';

export function BreakToggle() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const { data: windows = [] } = useQuery<any[]>({
    queryKey: ['break-windows'],
    queryFn: async () => {
      const { data } = await api.get('/api/v1/settings/break-windows');
      return data.data;
    },
    enabled: open,
  });

  const { data: myPresence } = useQuery<any>({
    queryKey: ['presence', 'me'],
    queryFn: async () => {
      const { data } = await api.get('/api/v1/presence/me');
      return data.data;
    },
    refetchInterval: 30000,
  });

  const startBreak = useMutation({
    mutationFn: (label: string) => api.post('/api/v1/presence/break/start', { label }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['presence'] });
      setOpen(false);
    },
  });

  const endBreak = useMutation({
    mutationFn: () => api.post('/api/v1/presence/break/end'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['presence'] }),
  });

  const anyOnBreak = myPresence?.status === 'BREAK';

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => (anyOnBreak ? endBreak.mutate() : setOpen((o) => !o))}
        className={cn(
          'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
          anyOnBreak ? 'bg-amber-50 text-amber-700 hover:bg-amber-100' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800',
        )}
      >
        <Coffee className="h-3.5 w-3.5" />
        {anyOnBreak ? 'End Break' : 'Take a Break'}
        {!anyOnBreak && <ChevronDown className="h-3 w-3" />}
      </button>

      {open && !anyOnBreak && (
        <div className="absolute right-0 top-full z-20 mt-2 w-52 rounded-xl bg-white p-1.5 shadow-lg ring-1 ring-gray-100">
          {windows.length === 0 ? (
            <p className="px-3 py-2 text-xs text-gray-400">No break windows configured in Settings yet.</p>
          ) : (
            windows.map((w: any) => (
              <button
                key={w.id}
                onClick={() => startBreak.mutate(w.name)}
                className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs font-medium text-gray-700 hover:bg-gray-50"
              >
                {w.name}
                <span className="text-gray-400">{w.startTime}–{w.endTime}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
