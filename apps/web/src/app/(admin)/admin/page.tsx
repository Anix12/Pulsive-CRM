'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Shield, LogOut, Search, Plus, Users, Contact2, Briefcase, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import adminApi from '@/lib/adminApi';
import { cn } from '@/lib/utils';
import { planBadge, statusBadge, statusLabel, avatarColor, ComingSoonModal } from './adminUi';

type StatusFilter = 'ALL' | 'ACTIVE' | 'SUSPENDED' | 'CANCELLED';

function StatTile({
  value,
  label,
  className,
}: {
  value: number | string;
  label: string;
  className?: string;
}) {
  return (
    <div className={cn('rounded-xl px-5 py-4', className)}>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="mt-0.5 text-xs text-gray-500">{label}</p>
    </div>
  );
}

export default function AdminDashboard() {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [search, setSearch] = useState('');
  const [addOpen, setAddOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-tenants'],
    queryFn: async () => {
      const { data } = await adminApi.get('/api/v1/admin/tenants', { params: { limit: 100 } });
      return { tenants: data.data as any[], meta: data.meta };
    },
  });

  const tenants = data?.tenants || [];

  const counts = useMemo(
    () => ({
      ALL: tenants.length,
      ACTIVE: tenants.filter((t) => t.status === 'ACTIVE').length,
      SUSPENDED: tenants.filter((t) => t.status === 'SUSPENDED').length,
      CANCELLED: tenants.filter((t) => t.status === 'CANCELLED').length,
    }),
    [tenants],
  );

  const totalUsers = useMemo(
    () => tenants.reduce((sum, t) => sum + (t._count?.users || 0), 0),
    [tenants],
  );

  const filtered = useMemo(() => {
    return tenants.filter((t) => {
      if (statusFilter !== 'ALL' && t.status !== statusFilter) return false;
      if (search && !t.name.toLowerCase().includes(search.toLowerCase()) && !t.slug.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [tenants, statusFilter, search]);

  const logout = () => {
    localStorage.removeItem('adminToken');
    router.push('/admin/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 bg-white px-7 py-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-400 to-blue-600 shadow-[0_0_16px_-4px_rgba(59,130,246,0.6)]">
            <Shield className="h-4 w-4 text-white" />
          </div>
          <div>
            <h1 className="text-[15px] font-semibold text-gray-900">Platform Admin</h1>
            <p className="text-xs text-gray-400">Manage every company running on Pulsive</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-gray-500 ring-1 ring-gray-200 transition hover:bg-gray-50 hover:text-gray-700"
        >
          <LogOut className="h-3.5 w-3.5" /> Sign out
        </button>
      </div>

      <div className="mx-auto max-w-6xl space-y-6 px-7 py-7">
        {/* Stat tiles */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <StatTile value={tenants.length} label="Total companies" className="bg-white ring-1 ring-gray-100" />
          <StatTile value={counts.ACTIVE} label="Active" className="bg-emerald-50" />
          <StatTile value={counts.SUSPENDED} label="Suspended" className="bg-amber-50" />
          <StatTile value={counts.CANCELLED} label="Cancelled" className="bg-rose-50" />
          <StatTile value={totalUsers} label="Total users" className="bg-violet-50" />
        </div>

        {/* Filters + search + add */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-1 rounded-xl bg-gray-100/80 p-1 w-fit">
            {(['ALL', 'ACTIVE', 'SUSPENDED', 'CANCELLED'] as StatusFilter[]).map((key) => (
              <button
                key={key}
                onClick={() => setStatusFilter(key)}
                className={cn(
                  'rounded-lg px-3.5 py-1.5 text-[13px] font-medium transition whitespace-nowrap',
                  statusFilter === key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700',
                )}
              >
                {key === 'ALL' ? 'All' : statusLabel[key]}{' '}
                <span className="text-gray-400">{counts[key]}</span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2.5">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search companies..."
                className="w-56 rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <button
              onClick={() => setAddOpen(true)}
              className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-blue-500"
            >
              <Plus className="h-4 w-4" /> Add company
            </button>
          </div>
        </div>

        {/* Company list */}
        {isLoading ? (
          <div className="flex h-48 items-center justify-center text-sm text-gray-400">Loading companies...</div>
        ) : filtered.length === 0 ? (
          <div className="flex h-48 flex-col items-center justify-center gap-1 rounded-xl bg-white text-sm text-gray-400 ring-1 ring-gray-100">
            No companies match your filters.
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((tenant) => (
              <Link
                key={tenant.id}
                href={`/admin/${tenant.id}`}
                className="group flex items-center gap-4 rounded-xl bg-white p-5 ring-1 ring-gray-100 transition hover:ring-blue-200 hover:shadow-sm"
              >
                <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold', avatarColor(tenant.name))}>
                  {tenant.name?.[0]?.toUpperCase() || '?'}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-[14px] font-semibold text-gray-900">{tenant.name}</p>
                    <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-medium', statusBadge[tenant.status] || 'bg-gray-100 text-gray-600')}>
                      {statusLabel[tenant.status] || tenant.status}
                    </span>
                    <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-medium', planBadge[tenant.plan] || 'bg-gray-100 text-gray-600')}>
                      {tenant.plan}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-gray-400">{tenant.slug}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-gray-500">
                    <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5 text-gray-400" /> {tenant._count?.users ?? 0} users</span>
                    <span className="flex items-center gap-1"><Contact2 className="h-3.5 w-3.5 text-gray-400" /> {tenant._count?.contacts ?? 0} leads</span>
                    <span className="flex items-center gap-1"><Briefcase className="h-3.5 w-3.5 text-gray-400" /> {tenant._count?.deals ?? 0} deals</span>
                  </div>
                </div>

                <div className="hidden shrink-0 text-right sm:block">
                  <p className="text-xs text-gray-400">ID: {tenant.id.slice(-6)}</p>
                  <p className="mt-0.5 text-xs text-gray-400">{format(new Date(tenant.createdAt), 'd MMM yyyy')}</p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-gray-300 transition group-hover:text-blue-500" />
              </Link>
            ))}
          </div>
        )}

        {(data?.meta?.total ?? 0) > tenants.length && (
          <p className="text-center text-xs text-gray-400">
            Showing {tenants.length} of {data?.meta?.total} companies.
          </p>
        )}
      </div>

      <ComingSoonModal open={addOpen} onClose={() => setAddOpen(false)} feature="Add company" />
    </div>
  );
}
