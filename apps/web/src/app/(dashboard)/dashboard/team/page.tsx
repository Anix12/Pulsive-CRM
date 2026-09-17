'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Trash2, UsersRound } from 'lucide-react';
import api from '@/lib/api';
import { Modal } from '@/components/ui/Modal';
import { cn } from '@/lib/utils';

type Role = 'OWNER' | 'ADMIN' | 'MANAGER' | 'AGENT';
type Status = 'ACTIVE' | 'INACTIVE';

interface TeamUser {
  id: string;
  email: string;
  firstName: string;
  lastName?: string | null;
  role: Role;
  status: Status;
  phone?: string | null;
  createdAt: string;
}

const inputCls =
  'mt-1 block w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm transition placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20';

const inviteSchema = z.object({
  email: z.string().email('Enter a valid email'),
  firstName: z.string().min(1, 'Required'),
  lastName: z.string().optional(),
  role: z.enum(['ADMIN', 'MANAGER', 'AGENT']),
  password: z.string().min(8, 'At least 8 characters'),
});

type InviteForm = z.infer<typeof inviteSchema>;

const roleBadge: Record<Role, string> = {
  OWNER: 'bg-purple-50 text-purple-700 ring-purple-200',
  ADMIN: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
  MANAGER: 'bg-blue-50 text-blue-700 ring-blue-200',
  AGENT: 'bg-gray-100 text-gray-700 ring-gray-200',
};

function InviteModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<InviteForm>({ resolver: zodResolver(inviteSchema), defaultValues: { role: 'AGENT' } });

  const invite = useMutation({
    mutationFn: async (values: InviteForm) => {
      const { data } = await api.post('/api/v1/tenants/me/users', values);
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['team-users'] });
      reset();
      onClose();
    },
  });

  return (
    <Modal open={open} onClose={onClose} title="Invite team member" size="sm">
      <form
        className="space-y-3"
        onSubmit={handleSubmit((values) => invite.mutate(values))}
      >
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700">First name</label>
            <input className={inputCls} {...register('firstName')} />
            {errors.firstName && <p className="mt-1 text-xs text-red-500">{errors.firstName.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Last name</label>
            <input className={inputCls} {...register('lastName')} />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Email</label>
          <input className={inputCls} type="email" {...register('email')} />
          {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Temporary password</label>
          <input className={inputCls} type="password" {...register('password')} />
          {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Role</label>
          <select className={inputCls} {...register('role')}>
            <option value="AGENT">Agent</option>
            <option value="MANAGER">Manager</option>
            <option value="ADMIN">Admin</option>
          </select>
        </div>
        {invite.isError && (
          <p className="text-xs text-red-500">
            {(invite.error as any)?.response?.data?.error?.message || 'Failed to invite user'}
          </p>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={invite.isPending}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
          >
            {invite.isPending ? 'Inviting…' : 'Send invite'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default function TeamPage() {
  const [inviteOpen, setInviteOpen] = useState(false);
  const qc = useQueryClient();

  const { data: users, isLoading } = useQuery<TeamUser[]>({
    queryKey: ['team-users'],
    queryFn: async () => {
      const { data } = await api.get('/api/v1/tenants/me/users');
      return data.data;
    },
  });

  const updateRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: Role }) => {
      const { data } = await api.patch(`/api/v1/tenants/me/users/${userId}`, { role });
      return data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['team-users'] }),
  });

  const removeUser = useMutation({
    mutationFn: async (userId: string) => {
      await api.delete(`/api/v1/tenants/me/users/${userId}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['team-users'] }),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Team</h1>
        <button
          onClick={() => setInviteOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" />
          Invite member
        </button>
      </div>

      <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-100">
        {isLoading ? (
          <div className="flex h-40 items-center justify-center text-gray-400">Loading…</div>
        ) : !users?.length ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
            <UsersRound className="h-8 w-8 text-gray-300" />
            <p className="text-sm text-gray-500">No teammates yet. Invite your first one.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-400">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {u.firstName} {u.lastName}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{u.email}</td>
                  <td className="px-4 py-3">
                    {u.role === 'OWNER' ? (
                      <span
                        className={cn(
                          'inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1',
                          roleBadge[u.role],
                        )}
                      >
                        Owner
                      </span>
                    ) : (
                      <select
                        className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs font-medium text-gray-700"
                        value={u.role}
                        onChange={(e) => updateRole.mutate({ userId: u.id, role: e.target.value as Role })}
                      >
                        <option value="AGENT">Agent</option>
                        <option value="MANAGER">Manager</option>
                        <option value="ADMIN">Admin</option>
                      </select>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        'inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1',
                        u.status === 'ACTIVE'
                          ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                          : 'bg-gray-100 text-gray-500 ring-gray-200',
                      )}
                    >
                      {u.status === 'ACTIVE' ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {u.role !== 'OWNER' && u.status === 'ACTIVE' && (
                      <button
                        onClick={() => removeUser.mutate(u.id)}
                        className="rounded-md p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
                        title="Deactivate"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <InviteModal open={inviteOpen} onClose={() => setInviteOpen(false)} />
    </div>
  );
}
