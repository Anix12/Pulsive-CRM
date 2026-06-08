'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import adminApi from '@/lib/adminApi';
import { useState } from 'react';
import { Shield, Users, LogOut, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { Modal } from '@/components/ui/Modal';
import { useRouter } from 'next/navigation';

const planBadge: Record<string, string> = {
  FREE: 'bg-gray-100 text-gray-600',
  STARTER: 'bg-blue-50 text-blue-700',
  PRO: 'bg-purple-100 text-purple-700',
  ENTERPRISE: 'bg-indigo-100 text-indigo-700',
};

const statusBadge: Record<string, string> = {
  ACTIVE: 'bg-green-50 text-green-700',
  SUSPENDED: 'bg-yellow-50 text-yellow-700',
  CANCELLED: 'bg-red-50 text-red-600',
};

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
    <Modal open={!!tenant} onClose={onClose} title={`Impersonate: ${tenant?.name}`} size="sm">
      <p className="text-sm text-gray-600">
        Generate a temporary access token to log in as this tenant's owner.
        This action will be recorded in the audit log.
      </p>
      {!token ? (
        <div className="mt-5 flex justify-end gap-3">
          <button onClick={onClose} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
          <button onClick={impersonate} disabled={loading} className="flex items-center gap-2 rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-500 disabled:opacity-50">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Generating...' : 'Generate Token'}
          </button>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          <div className="rounded-lg bg-gray-50 p-3">
            <p className="text-xs text-gray-500 mb-1">Access Token (expires in 15 min)</p>
            <p className="break-all text-xs font-mono text-gray-800">{token.slice(0, 40)}...</p>
          </div>
          <p className="text-xs text-gray-500">
            Copy the token, open the app, and use it via: Settings → Developer → Paste Token
          </p>
          <div className="flex justify-end gap-3">
            <button onClick={onClose} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Close</button>
            <button onClick={copyAndOpen} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500">
              Copy Token & Open App
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}

export default function AdminDashboard() {
  const router = useRouter();
  const qc = useQueryClient();
  const [impersonating, setImpersonating] = useState<any>(null);
  const [statusTarget, setStatusTarget] = useState<any>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-tenants'],
    queryFn: async () => { const { data } = await adminApi.get('/api/v1/admin/tenants'); return data.data; },
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      adminApi.patch(`/api/v1/admin/tenants/${id}/status`, { status }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-tenants'] }); setStatusTarget(null); },
  });

  const logout = () => {
    localStorage.removeItem('adminToken');
    router.push('/admin/login');
  };

  const totalActive = (data || []).filter((t: any) => t.status === 'ACTIVE').length;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gray-900 px-6 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="h-5 w-5 text-indigo-400" />
            <span className="font-bold text-white">Super Admin Panel</span>
          </div>
          <button onClick={logout} className="flex items-center gap-2 text-sm text-gray-400 hover:text-white">
            <LogOut className="h-4 w-4" /> Sign Out
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-8 space-y-6">
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Total Tenants', value: data?.length || 0 },
            { label: 'Active Tenants', value: totalActive },
            { label: 'Suspended', value: (data || []).filter((t: any) => t.status === 'SUSPENDED').length },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
              <p className="text-sm text-gray-500">{label}</p>
              <p className="mt-1 text-3xl font-bold text-gray-900">{value}</p>
            </div>
          ))}
        </div>

        <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-100">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-gray-400" />
              <h2 className="font-semibold text-gray-900">All Tenants</h2>
            </div>
          </div>

          {isLoading ? (
            <div className="flex h-48 items-center justify-center text-gray-500">Loading...</div>
          ) : (
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  {['Tenant', 'Plan', 'Status', 'Users', 'Contacts', 'Created', ''].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {(data || []).map((tenant: any) => (
                  <tr key={tenant.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-gray-900">{tenant.name}</p>
                      <p className="text-xs text-gray-500">{tenant.slug}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${planBadge[tenant.plan] || ''}`}>
                        {tenant.plan}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={tenant.status}
                        onChange={(e) => updateStatus.mutate({ id: tenant.id, status: e.target.value })}
                        className={`rounded-full border-0 px-2 py-0.5 text-xs font-medium ${statusBadge[tenant.status] || ''}`}
                      >
                        <option value="ACTIVE">ACTIVE</option>
                        <option value="SUSPENDED">SUSPENDED</option>
                        <option value="CANCELLED">CANCELLED</option>
                      </select>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{tenant._count?.users || 0}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{tenant._count?.contacts || 0}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {format(new Date(tenant.createdAt), 'dd MMM yyyy')}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setImpersonating(tenant)}
                        className="rounded-lg bg-orange-50 px-3 py-1.5 text-xs font-medium text-orange-700 hover:bg-orange-100"
                      >
                        Impersonate
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {impersonating && <ImpersonateModal tenant={impersonating} onClose={() => setImpersonating(null)} />}
    </div>
  );
}
