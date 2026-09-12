'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { DailyBriefingGate } from '@/components/daily-briefing/DailyBriefingGate';
import api from '@/lib/api';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  const router = useRouter();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated && !isAuthenticated) router.push('/login');
  }, [hydrated, isAuthenticated, router]);

  // Agent floor status: periodic heartbeat while the dashboard is open in this tab.
  useEffect(() => {
    if (!hydrated || !isAuthenticated) return;
    const ping = () => api.post('/api/v1/presence/heartbeat').catch(() => {});
    ping();
    const interval = setInterval(ping, 60000);
    return () => clearInterval(interval);
  }, [hydrated, isAuthenticated]);

  if (!hydrated || !isAuthenticated) return null;

  return (
    <div className="app-glow-bg flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-7">{children}</main>
      </div>
      <DailyBriefingGate />
    </div>
  );
}
