'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Radar, RefreshCw } from 'lucide-react';
import api from '@/lib/api';
import { GoogleMap, type MapMarker } from '@/components/ui/GoogleMap';
import { cn } from '@/lib/utils';

interface AgentRow {
  agentId: string;
  name: string;
  role: string;
  status: string;
  lead: string | null;
  project: string | null;
  projectId: string | null;
  latitude: number | null;
  longitude: number | null;
  statusAt: string | null;
  lastSeen: string | null;
}

interface Overview {
  summary: { totalAgents: number; onTheWay: number; atSite: number; visiting: number; returning: number; idle: number };
  agents: AgentRow[];
}

const STATUS_LABELS: Record<string, string> = {
  ON_THE_WAY: 'On the way', AT_SITE: 'At Site', VISITING: 'Visiting', RETURNING: 'Returning', IDLE: 'Idle',
};

const STATUS_COLORS: Record<string, string> = {
  ON_THE_WAY: '#f59e0b', AT_SITE: '#8b5cf6', VISITING: '#ec4899', RETURNING: '#06b6d4', IDLE: '#9ca3af',
};

const statusPill: Record<string, string> = {
  ON_THE_WAY: 'bg-amber-50 text-amber-700 ring-1 ring-amber-100',
  AT_SITE: 'bg-violet-50 text-violet-700 ring-1 ring-violet-100',
  VISITING: 'bg-pink-50 text-pink-700 ring-1 ring-pink-100',
  RETURNING: 'bg-cyan-50 text-cyan-700 ring-1 ring-cyan-100',
  IDLE: 'bg-gray-100 text-gray-500 ring-1 ring-gray-200',
};

function StatCard({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-4 text-center shadow-sm">
      <p className="text-xl font-bold" style={{ color: color ?? '#111827' }}>{value}</p>
      <p className="mt-0.5 text-[11px] text-gray-500">{label}</p>
    </div>
  );
}

function durationSince(iso: string | null) {
  if (!iso) return '—';
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.max(0, Math.round(ms / 60000));
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

export default function AgentTrackerPage() {
  const [autoRefresh, setAutoRefresh] = useState(true);

  const { data, isLoading, dataUpdatedAt } = useQuery({
    queryKey: ['re-agent-tracker'],
    queryFn: async () => {
      const { data } = await api.get('/api/v1/real-estate/agent-tracker');
      return data.data as Overview;
    },
    refetchInterval: autoRefresh ? 30000 : false,
  });

  const summary = data?.summary;
  const agents = data?.agents ?? [];

  const mapMarkers: MapMarker[] = useMemo(() => {
    const byProject = new Map<string, MapMarker>();
    for (const a of agents) {
      if (!a.projectId || a.latitude == null || a.longitude == null) continue;
      if (!byProject.has(a.projectId)) {
        byProject.set(a.projectId, {
          id: a.projectId,
          lat: a.latitude,
          lng: a.longitude,
          title: a.project ?? undefined,
          color: STATUS_COLORS[a.status] ?? '#4f46e5',
          radiusMeters: 200,
        });
      }
    }
    return Array.from(byProject.values());
  }, [agents]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Agent Tracker</h1>
          <p className="text-sm text-gray-500">Live status and site visit monitoring</p>
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <label className="flex items-center gap-1.5">
            <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} className="h-3.5 w-3.5 rounded border-gray-300 text-indigo-600" />
            Auto-refresh (30s)
          </label>
          <span className="flex items-center gap-1">
            <RefreshCw className="h-3 w-3" />
            Updated {dataUpdatedAt ? format(new Date(dataUpdatedAt), 'HH:mm:ss') : '—'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <StatCard label="Total Agents" value={summary?.totalAgents ?? 0} />
        <StatCard label="On the way" value={summary?.onTheWay ?? 0} color={STATUS_COLORS.ON_THE_WAY} />
        <StatCard label="At Site" value={summary?.atSite ?? 0} color={STATUS_COLORS.AT_SITE} />
        <StatCard label="Returning" value={summary?.returning ?? 0} color={STATUS_COLORS.RETURNING} />
        <StatCard label="Idle" value={summary?.idle ?? 0} color={STATUS_COLORS.IDLE} />
      </div>

      <div className="rounded-xl border border-gray-100 bg-white p-3 shadow-sm">
        <GoogleMap markers={mapMarkers} height={380} />
        <div className="mt-3 flex flex-wrap items-center gap-4 border-t border-gray-50 pt-3 text-xs text-gray-500">
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: '#4f46e5' }} /> Projects (with geofence)</span>
          {Object.entries(STATUS_LABELS).filter(([k]) => k !== 'IDLE').map(([k, label]) => (
            <span key={k} className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: STATUS_COLORS[k] }} /> {label}</span>
          ))}
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: STATUS_COLORS.IDLE }} /> Idle</span>
        </div>
      </div>

      <div className="rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-gray-50 px-5 py-3">
          <h3 className="text-sm font-semibold text-gray-900">Agent Status</h3>
        </div>
        {isLoading ? (
          <div className="flex h-48 items-center justify-center text-gray-500">Loading...</div>
        ) : !agents.length ? (
          <div className="flex h-64 flex-col items-center justify-center gap-3">
            <Radar className="h-10 w-10 text-gray-200" />
            <p className="text-sm text-gray-500">No active agents</p>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-50">
            <thead className="bg-gray-50/60">
              <tr>
                {['Agent', 'Status', 'Lead', 'Project', 'Duration', 'GPS', 'Last Seen'].map((h) => (
                  <th key={h} className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {agents.map((a) => (
                <tr key={a.agentId} className="hover:bg-slate-50/50">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-50 text-[10px] font-bold text-indigo-700">
                        {a.name.charAt(0).toUpperCase()}
                      </span>
                      <span className="text-sm font-medium text-gray-900">{a.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={cn('inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold', statusPill[a.status])}>
                      {STATUS_LABELS[a.status] ?? a.status}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-gray-600">{a.lead ?? '-'}</td>
                  <td className="px-5 py-3.5 text-sm text-gray-600">{a.project ?? '-'}</td>
                  <td className="px-5 py-3.5 text-sm text-gray-600">{a.status === 'IDLE' ? '-' : durationSince(a.statusAt)}</td>
                  <td className="px-5 py-3.5 text-sm text-gray-400">{a.latitude != null ? `${a.latitude.toFixed(4)}, ${a.longitude?.toFixed(4)}` : '-'}</td>
                  <td className="px-5 py-3.5 text-sm text-gray-600">{a.lastSeen ? format(new Date(a.lastSeen), 'HH:mm:ss') : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
