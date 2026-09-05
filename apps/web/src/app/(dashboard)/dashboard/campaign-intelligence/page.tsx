'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { cn } from '@/lib/utils';
import { Trophy, Megaphone, Globe } from 'lucide-react';

export default function CampaignIntelligencePage() {
  const { data, isLoading } = useQuery({
    queryKey: ['campaign-intelligence'],
    queryFn: async () => {
      const { data } = await api.get('/api/v1/campaigns/intelligence');
      return data.data;
    },
  });

  if (isLoading) return <div className="flex h-48 items-center justify-center text-gray-400">Loading…</div>;

  const kpis = data?.kpis;
  const channels = data?.channels;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Campaign Intelligence</h1>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        {[
          { label: 'Campaigns', value: kpis?.campaignCount ?? 0 },
          { label: 'Total Leads', value: kpis?.totalLeads ?? 0 },
          { label: 'Contact Rate', value: `${kpis?.contactRate ?? 0}%` },
          { label: 'Conversion Rate', value: `${kpis?.conversionRate ?? 0}%` },
          { label: 'Lost Rate', value: `${kpis?.lostRate ?? 0}%` },
        ].map((k) => (
          <div key={k.label} className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
            <p className="text-xs text-gray-500">{k.label}</p>
            <p className="mt-1 text-xl font-bold text-gray-900">{k.value}</p>
          </div>
        ))}
      </div>

      {/* Channel breakdown */}
      <div className="grid gap-4 sm:grid-cols-2">
        {[
          { key: 'paidAds', label: 'Paid Ads', icon: Megaphone, color: 'text-indigo-600 bg-indigo-50' },
          { key: 'webLeads', label: 'Web Leads', icon: Globe, color: 'text-emerald-600 bg-emerald-50' },
        ].map(({ key, label, icon: Icon, color }) => {
          const ch = channels?.[key];
          return (
            <div key={key} className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
              <div className="mb-3 flex items-center gap-2">
                <div className={cn('rounded-lg p-2', color)}><Icon className="h-4 w-4" /></div>
                <h3 className="font-semibold text-gray-900">{label}</h3>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><p className="text-gray-400">Leads</p><p className="font-semibold text-gray-900">{ch?.leads ?? 0}</p></div>
                <div><p className="text-gray-400">Contacted</p><p className="font-semibold text-gray-900">{ch?.contactedPct ?? 0}%</p></div>
                <div><p className="text-gray-400">Converted</p><p className="font-semibold text-emerald-600">{ch?.convertedPct ?? 0}%</p></div>
                <div><p className="text-gray-400">Lost</p><p className="font-semibold text-red-500">{ch?.lostPct ?? 0}%</p></div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Best performing callout */}
      {data?.bestPerformingCampaign && (
        <div className="flex items-center gap-3 rounded-xl bg-emerald-50 p-4 ring-1 ring-emerald-100">
          <Trophy className="h-6 w-6 text-emerald-600" />
          <div>
            <p className="text-sm font-semibold text-emerald-800">Best performing campaign: {data.bestPerformingCampaign.name}</p>
            <p className="text-xs text-emerald-600">{data.bestPerformingCampaign.conversionPct}% conversion rate across {data.bestPerformingCampaign.leads} leads</p>
          </div>
        </div>
      )}

      {/* Campaign Rankings */}
      <div className="overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-gray-100">
        <table className="min-w-full divide-y divide-gray-100">
          <thead className="bg-gray-50">
            <tr>
              {['Campaign', 'Leads', 'Contact %', 'Interest %', 'Conversion %', 'Lost %'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {(data?.rankings ?? []).map((r: any) => (
              <tr key={r.campaignId} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm font-medium text-gray-900">{r.name}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{r.leads}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{r.contactPct}%</td>
                <td className="px-4 py-3 text-sm text-gray-600">{r.interestPct}%</td>
                <td className="px-4 py-3 text-sm font-medium text-emerald-600">{r.conversionPct}%</td>
                <td className="px-4 py-3 text-sm text-red-500">{r.lostPct}%</td>
              </tr>
            ))}
            {(!data?.rankings || data.rankings.length === 0) && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-400">No campaigns yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
