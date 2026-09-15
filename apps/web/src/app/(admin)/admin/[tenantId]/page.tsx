'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  ArrowLeft, RefreshCw, LogIn, ShieldAlert, ShieldCheck, Pencil,
  Megaphone, Zap, MessageCircle, PhoneCall, Building2, Plug, GraduationCap, Truck,
  UserPlus, ScrollText, Wallet,
} from 'lucide-react';
import adminApi from '@/lib/adminApi';
import { Modal } from '@/components/ui/Modal';
import { cn } from '@/lib/utils';
import { planBadge, statusBadge, statusLabel, avatarColor, ComingSoonModal, PreviewBanner } from '../adminUi';

type Tab = 'overview' | 'users' | 'features' | 'credits' | 'settings' | 'activity';

const tabs: { key: Tab; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'users', label: 'Users' },
  { key: 'features', label: 'Features' },
  { key: 'credits', label: 'Credits' },
  { key: 'settings', label: 'Settings' },
  { key: 'activity', label: 'Activity' },
];

/** Real product modules — not the backend's actual per-tenant flags (there's no such table yet), just what the module list looks like today. */
const previewFeatures = [
  { icon: Megaphone, label: 'Campaigns' },
  { icon: Zap, label: 'Workflows' },
  { icon: GraduationCap, label: 'Applications' },
  { icon: Building2, label: 'Real Estate' },
  { icon: MessageCircle, label: 'WhatsApp' },
  { icon: PhoneCall, label: 'AI Calling' },
  { icon: Truck, label: 'Shipping' },
  { icon: Plug, label: 'Integrations' },
];

function ImpersonateModal({ tenant, onClose }: { tenant: any; onClose: () => void }) {
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState('');

  const impersonate = async () => {
    setLoading(true);
    try {
      const { data } = await adminApi.post(`/api/v1/admin/tenants/${tenant.id}/impersonate`, {});
      setToken(data.data.accessToken);
    } finally {
      setLoading(false);
    }
  };

  const copyAndOpen = () => {
    navigator.clipboard.writeText(token);
    window.open('/', '_blank');
  };

  return (
    <Modal open={!!tenant} onClose={onClose} title={`Log in as: ${tenant?.name}`} size="sm">
      <p className="text-sm text-gray-600">
        Generate a temporary access token to log in as this company's owner. This action is recorded in the audit log.
      </p>
      {!token ? (
        <div className="mt-5 flex justify-end gap-3">
          <button onClick={onClose} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
          <button onClick={impersonate} disabled={loading} className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50">
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
            {loading ? 'Generating...' : 'Generate token'}
          </button>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          <div className="rounded-lg bg-gray-50 p-3">
            <p className="mb-1 text-xs text-gray-500">Access token (expires in 15 min)</p>
            <p className="break-all font-mono text-xs text-gray-800">{token.slice(0, 40)}...</p>
          </div>
          <p className="text-xs text-gray-500">Copy the token, open the app, and use it via: Settings → Developer → Paste Token</p>
          <div className="flex justify-end gap-3">
            <button onClick={onClose} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Close</button>
            <button onClick={copyAndOpen} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500">
              Copy token & open app
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}

function StatTile({ value, label }: { value: number | string; label: string }) {
  return (
    <div className="rounded-xl bg-white px-4 py-3.5 text-center ring-1 ring-gray-100">
      <p className="text-xl font-bold text-gray-900">{value}</p>
      <p className="mt-0.5 text-[11px] text-gray-500">{label}</p>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-gray-50 py-2.5 last:border-0">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-medium text-gray-900">{value}</span>
    </div>
  );
}

function ConnectionRow({ label, connected }: { label: string; connected: boolean }) {
  return (
    <div className="flex items-center justify-between border-b border-gray-50 py-2.5 last:border-0">
      <span className="text-sm text-gray-500">{label}</span>
      <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-medium', connected ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500')}>
        {connected ? 'Connected' : 'Not connected'}
      </span>
    </div>
  );
}

export default function TenantDetailPage() {
  const { tenantId } = useParams<{ tenantId: string }>();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>('overview');
  const [impersonating, setImpersonating] = useState<any>(null);
  const [comingSoon, setComingSoon] = useState<string | null>(null);

  const { data: tenant, isLoading } = useQuery({
    queryKey: ['admin-tenant', tenantId],
    queryFn: async () => {
      const { data } = await adminApi.get(`/api/v1/admin/tenants/${tenantId}`);
      return data.data;
    },
  });

  const { data: auditLogs, isLoading: auditLoading } = useQuery({
    queryKey: ['admin-tenant-audit', tenantId],
    queryFn: async () => {
      const { data } = await adminApi.get(`/api/v1/admin/tenants/${tenantId}/audit-logs`, { params: { limit: 30 } });
      return data.data as any[];
    },
    enabled: tab === 'activity',
  });

  const updateStatus = useMutation({
    mutationFn: (status: string) => adminApi.patch(`/api/v1/admin/tenants/${tenantId}/status`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-tenant', tenantId] }),
  });

  if (isLoading || !tenant) {
    return <div className="flex min-h-screen items-center justify-center bg-gray-50 text-sm text-gray-400">Loading company...</div>;
  }

  const isSuspended = tenant.status === 'SUSPENDED';

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="border-b border-gray-100 bg-white px-7 py-4">
        <div className="mx-auto flex max-w-6xl items-start justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <Link href="/admin" className="mt-1 rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div className={cn('mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-base font-bold', avatarColor(tenant.name))}>
              {tenant.name?.[0]?.toUpperCase() || '?'}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-[16px] font-semibold text-gray-900">{tenant.name}</h1>
                <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-medium', statusBadge[tenant.status] || 'bg-gray-100 text-gray-600')}>
                  {statusLabel[tenant.status] || tenant.status}
                </span>
                <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-medium', planBadge[tenant.plan] || 'bg-gray-100 text-gray-600')}>
                  {tenant.plan}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-gray-400">
                ID: {tenant.id.slice(-6)} · {tenant.slug} · Joined {format(new Date(tenant.createdAt), 'd MMM yyyy')}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              onClick={() => setImpersonating(tenant)}
              className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 ring-1 ring-gray-200 hover:bg-gray-50"
            >
              <LogIn className="h-4 w-4" /> Login as
            </button>
            <button
              onClick={() => setComingSoon('Edit company')}
              className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 ring-1 ring-gray-200 hover:bg-gray-50"
            >
              <Pencil className="h-4 w-4" /> Edit
            </button>
            <button
              onClick={() => updateStatus.mutate(isSuspended ? 'ACTIVE' : 'SUSPENDED')}
              disabled={updateStatus.isPending}
              className={cn(
                'flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold disabled:opacity-50',
                isSuspended ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'bg-rose-50 text-rose-600 hover:bg-rose-100',
              )}
            >
              {isSuspended ? <ShieldCheck className="h-4 w-4" /> : <ShieldAlert className="h-4 w-4" />}
              {isSuspended ? 'Activate' : 'Suspend'}
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl space-y-6 px-7 py-7">
        {/* Stat tiles */}
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
          <StatTile value={tenant.users?.length ?? 0} label="Users" />
          <StatTile value={tenant._count?.contacts ?? 0} label="Leads" />
          <StatTile value={tenant._count?.deals ?? 0} label="Deals" />
          <StatTile value={tenant._count?.calls ?? 0} label="Calls" />
          <StatTile value={tenant._count?.messages ?? 0} label="Messages" />
          <StatTile value={tenant.plan} label="Plan" />
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-1 rounded-xl bg-gray-100/80 p-1 w-fit">
          {tabs.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={cn(
                'rounded-lg px-3.5 py-1.5 text-[13px] font-medium transition whitespace-nowrap',
                tab === key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700',
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Overview */}
        {tab === 'overview' && (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <div className="rounded-xl bg-white p-5 ring-1 ring-gray-100">
              <div className="mb-1 flex items-center justify-between">
                <h2 className="text-[14px] font-semibold text-gray-900">Company info</h2>
                <button onClick={() => setComingSoon('Edit company')} className="text-xs font-medium text-blue-600 hover:text-blue-700">Edit</button>
              </div>
              <InfoRow label="Name" value={tenant.name} />
              <InfoRow label="Slug" value={tenant.slug} />
              <InfoRow label="Plan" value={tenant.plan} />
              <InfoRow label="Status" value={statusLabel[tenant.status] || tenant.status} />
              <InfoRow label="Branding name" value={tenant.companyName || '—'} />
              <InfoRow label="Email from" value={tenant.emailFrom || '—'} />
              <InfoRow
                label="Brand color"
                value={
                  <span className="flex items-center gap-1.5">
                    <span className="h-3.5 w-3.5 rounded-full ring-1 ring-black/10" style={{ backgroundColor: tenant.primaryColor || '#6366F1' }} />
                    {tenant.primaryColor || '#6366F1'}
                  </span>
                }
              />
              <InfoRow label="Created" value={format(new Date(tenant.createdAt), 'd MMM yyyy')} />
            </div>

            <div className="space-y-5">
              <div className="rounded-xl bg-white p-5 ring-1 ring-gray-100">
                <h2 className="mb-3 text-[14px] font-semibold text-gray-900">Quick actions</h2>
                <div className="grid grid-cols-2 gap-2.5">
                  <button onClick={() => setImpersonating(tenant)} className="flex items-center gap-2.5 rounded-lg bg-gray-50 px-3 py-2.5 text-left hover:bg-gray-100">
                    <LogIn className="h-4 w-4 text-blue-500" />
                    <div>
                      <p className="text-xs font-semibold text-gray-800">Login as admin</p>
                      <p className="text-[10px] text-gray-400">Access their CRM</p>
                    </div>
                  </button>
                  <button onClick={() => setTab('users')} className="flex items-center gap-2.5 rounded-lg bg-gray-50 px-3 py-2.5 text-left hover:bg-gray-100">
                    <UserPlus className="h-4 w-4 text-emerald-500" />
                    <div>
                      <p className="text-xs font-semibold text-gray-800">View users</p>
                      <p className="text-[10px] text-gray-400">{tenant.users?.length ?? 0} on this account</p>
                    </div>
                  </button>
                  <button onClick={() => setComingSoon('Add credits')} className="flex items-center gap-2.5 rounded-lg bg-gray-50 px-3 py-2.5 text-left hover:bg-gray-100">
                    <Wallet className="h-4 w-4 text-amber-500" />
                    <div>
                      <p className="text-xs font-semibold text-gray-800">Add credits</p>
                      <p className="text-[10px] text-gray-400">SMS, Email, AI</p>
                    </div>
                  </button>
                  <button onClick={() => setTab('activity')} className="flex items-center gap-2.5 rounded-lg bg-gray-50 px-3 py-2.5 text-left hover:bg-gray-100">
                    <ScrollText className="h-4 w-4 text-purple-500" />
                    <div>
                      <p className="text-xs font-semibold text-gray-800">View activity</p>
                      <p className="text-[10px] text-gray-400">Audit log</p>
                    </div>
                  </button>
                </div>
              </div>

              <div className="rounded-xl bg-white p-5 ring-1 ring-gray-100">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-[14px] font-semibold text-gray-900">Features enabled</h2>
                </div>
                <PreviewBanner>Preview only — per-tenant feature toggles aren't wired up yet.</PreviewBanner>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {previewFeatures.slice(0, 4).map(({ icon: Icon, label }) => (
                    <div key={label} className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2">
                      <Icon className="h-3.5 w-3.5 text-gray-400" />
                      <span className="text-xs font-medium text-gray-600">{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Users */}
        {tab === 'users' && (
          <div className="overflow-hidden rounded-xl bg-white ring-1 ring-gray-100">
            <table className="min-w-full divide-y divide-gray-50">
              <thead className="bg-gray-50">
                <tr>
                  {['Name', 'Email', 'Role', 'Status'].map((h) => (
                    <th key={h} className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {(tenant.users || []).map((u: any) => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3 text-sm font-medium text-gray-900">{u.firstName} {u.lastName}</td>
                    <td className="px-5 py-3 text-sm text-gray-600">{u.email}</td>
                    <td className="px-5 py-3 text-sm text-gray-600">{u.role}</td>
                    <td className="px-5 py-3">
                      <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-medium', u.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500')}>
                        {u.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {(!tenant.users || tenant.users.length === 0) && (
                  <tr><td colSpan={4} className="px-5 py-8 text-center text-sm text-gray-400">No users yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Features */}
        {tab === 'features' && (
          <div className="rounded-xl bg-white p-5 ring-1 ring-gray-100">
            <PreviewBanner>Preview only — toggling these here isn't wired up to the backend yet.</PreviewBanner>
            <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {previewFeatures.map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center justify-between rounded-lg bg-gray-50 px-3.5 py-2.5">
                  <span className="flex items-center gap-2.5 text-sm font-medium text-gray-700">
                    <Icon className="h-4 w-4 text-gray-400" /> {label}
                  </span>
                  <span className="rounded-full bg-gray-200 px-2 py-0.5 text-[11px] font-medium text-gray-500">—</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Credits */}
        {tab === 'credits' && (
          <div className="rounded-xl bg-white p-5 ring-1 ring-gray-100">
            <PreviewBanner>Preview only — credit balances and top-ups aren't wired up to the backend yet.</PreviewBanner>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
              {['SMS credits', 'Email credits', 'AI voice minutes'].map((label) => (
                <div key={label} className="rounded-lg bg-gray-50 px-4 py-4 text-center">
                  <p className="text-xl font-bold text-gray-300">—</p>
                  <p className="mt-0.5 text-xs text-gray-500">{label}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Settings */}
        {tab === 'settings' && (
          <div className="rounded-xl bg-white p-5 ring-1 ring-gray-100">
            <h2 className="mb-1 text-[14px] font-semibold text-gray-900">Integrations</h2>
            <p className="mb-3 text-xs text-gray-400">Derived from whether this company has connected each provider.</p>
            <ConnectionRow label="Twilio (SMS / Voice)" connected={!!tenant.twilioAccountSid} />
            <ConnectionRow label="WhatsApp Business API" connected={!!tenant.whatsappAccessToken} />
            <ConnectionRow label="Vapi (AI Calling)" connected={!!tenant.vapiApiKey} />
          </div>
        )}

        {/* Activity */}
        {tab === 'activity' && (
          <div className="rounded-xl bg-white ring-1 ring-gray-100">
            {auditLoading ? (
              <div className="flex h-32 items-center justify-center text-sm text-gray-400">Loading activity...</div>
            ) : !auditLogs || auditLogs.length === 0 ? (
              <div className="flex h-32 items-center justify-center text-sm text-gray-400">No activity recorded yet.</div>
            ) : (
              <ul className="divide-y divide-gray-50">
                {auditLogs.map((log) => (
                  <li key={log.id} className="flex items-center justify-between px-5 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-gray-800">
                        {log.action} <span className="text-gray-400">·</span> {log.resource}
                      </p>
                      <p className="text-xs text-gray-400">
                        {log.user ? `${log.user.firstName} ${log.user.lastName}` : 'System'}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs text-gray-400">{format(new Date(log.createdAt), 'd MMM, h:mm a')}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {impersonating && <ImpersonateModal tenant={impersonating} onClose={() => setImpersonating(null)} />}
      <ComingSoonModal open={!!comingSoon} onClose={() => setComingSoon(null)} feature={comingSoon || ''} />
    </div>
  );
}
