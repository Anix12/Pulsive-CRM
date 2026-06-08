'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { UserPlus, Trash2, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

type SettingsTab = 'general' | 'team';

const roleBadge: Record<string, string> = {
  OWNER: 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100',
  ADMIN: 'bg-violet-50 text-violet-700 ring-1 ring-violet-100',
  MANAGER: 'bg-blue-50 text-blue-700 ring-1 ring-blue-100',
  AGENT: 'bg-gray-100 text-gray-600 ring-1 ring-gray-200',
};

const avatarColors = [
  'bg-indigo-100 text-indigo-700',
  'bg-violet-100 text-violet-700',
  'bg-emerald-100 text-emerald-700',
  'bg-amber-100 text-amber-700',
];

function avatarColor(name: string) {
  return avatarColors[name.charCodeAt(0) % avatarColors.length];
}

const generalSchema = z.object({
  name: z.string().min(2),
  companyName: z.string().optional(),
  emailFrom: z.string().email().optional().or(z.literal('')),
  emailFromName: z.string().optional(),
});

const inviteSchema = z.object({
  firstName: z.string().min(1, 'Required'),
  lastName: z.string().optional(),
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Min 8 characters'),
  role: z.enum(['ADMIN', 'MANAGER', 'AGENT']).default('AGENT'),
});

type InviteForm = z.infer<typeof inviteSchema>;

const inputCls =
  'mt-1 block w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20';

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={inputCls} />;
}

export default function SettingsPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<SettingsTab>('general');
  const [inviteOpen, setInviteOpen] = useState(false);
  const [savedSection, setSavedSection] = useState('');

  const markSaved = (section: string) => {
    setSavedSection(section);
    setTimeout(() => setSavedSection(''), 3000);
  };

  const { data: tenant } = useQuery({
    queryKey: ['tenant'],
    queryFn: async () => {
      const { data } = await api.get('/api/v1/tenants/me');
      return data.data;
    },
  });

  const { data: users } = useQuery({
    queryKey: ['team-users'],
    queryFn: async () => {
      const { data } = await api.get('/api/v1/tenants/me/users');
      return data.data;
    },
    enabled: tab === 'team',
  });

  const generalForm = useForm({
    resolver: zodResolver(generalSchema),
    values: {
      name: tenant?.name || '',
      companyName: tenant?.companyName || '',
      emailFrom: tenant?.emailFrom || '',
      emailFromName: tenant?.emailFromName || '',
    },
  });

  const inviteForm = useForm<InviteForm>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { role: 'AGENT' },
  });

  const saveGeneral = useMutation({
    mutationFn: (data: any) => api.patch('/api/v1/tenants/me', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tenant'] });
      markSaved('general');
    },
  });

  const inviteUser = useMutation({
    mutationFn: (data: InviteForm) => api.post('/api/v1/tenants/me/users', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['team-users'] });
      inviteForm.reset();
      setInviteOpen(false);
    },
  });

  const removeUser = useMutation({
    mutationFn: (userId: string) => api.delete(`/api/v1/tenants/me/users/${userId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['team-users'] }),
  });

  const updateRole = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) =>
      api.patch(`/api/v1/tenants/me/users/${userId}`, { role }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['team-users'] }),
  });

  const tabs: { key: SettingsTab; label: string }[] = [
    { key: 'general', label: 'General' },
    { key: 'team', label: 'Team' },
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Tab bar */}
      <div className="flex gap-1 rounded-xl bg-gray-100/80 p-1 w-fit">
        {tabs.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              'rounded-lg px-5 py-1.5 text-sm font-medium transition',
              tab === key
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* General tab */}
      {tab === 'general' && (
        <form
          onSubmit={generalForm.handleSubmit((d) => saveGeneral.mutate(d))}
          className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm space-y-5"
        >
          <div>
            <h2 className="text-[15px] font-semibold text-gray-900">Workspace Details</h2>
            <p className="mt-0.5 text-xs text-gray-400">Your company information and email settings</p>
          </div>

          <div className="grid grid-cols-2 gap-4 border-t border-gray-50 pt-4">
            <Field label="Workspace Name" error={generalForm.formState.errors.name?.message}>
              <Input {...generalForm.register('name')} />
            </Field>
            <Field label="Company Name">
              <Input {...generalForm.register('companyName')} />
            </Field>
            <Field
              label="From Email"
              error={generalForm.formState.errors.emailFrom?.message}
            >
              <Input
                {...generalForm.register('emailFrom')}
                type="email"
                placeholder="noreply@company.com"
              />
            </Field>
            <Field label="From Name">
              <Input {...generalForm.register('emailFromName')} placeholder="Company Name" />
            </Field>
          </div>

          <div className="flex items-center gap-3 border-t border-gray-50 pt-4">
            <button
              type="submit"
              disabled={saveGeneral.isPending}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
            >
              {saveGeneral.isPending ? 'Saving…' : 'Save Changes'}
            </button>
            {savedSection === 'general' && (
              <span className="flex items-center gap-1.5 text-sm font-medium text-emerald-600">
                <CheckCircle className="h-4 w-4" />
                Saved
              </span>
            )}
          </div>
        </form>
      )}

      {/* Team tab */}
      {tab === 'team' && (
        <div className="rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
            <div>
              <h2 className="text-[15px] font-semibold text-gray-900">Team Members</h2>
              <p className="mt-0.5 text-xs text-gray-400">
                {(users || []).length} member{(users || []).length !== 1 ? 's' : ''}
              </p>
            </div>
            <button
              onClick={() => setInviteOpen(true)}
              className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
            >
              <UserPlus className="h-3.5 w-3.5" />
              Add Member
            </button>
          </div>

          <table className="min-w-full divide-y divide-gray-50">
            <thead className="bg-gray-50/60">
              <tr>
                {['Member', 'Email', 'Role', 'Status', ''].map((h) => (
                  <th
                    key={h}
                    className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {(users || []).map((user: any) => {
                const initials = `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase();
                const colClass = avatarColor(user.firstName ?? 'A');
                return (
                  <tr key={user.id} className="group hover:bg-slate-50/50">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${colClass}`}
                        >
                          {initials}
                        </div>
                        <span className="text-sm font-medium text-gray-900">
                          {user.firstName} {user.lastName}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-gray-500">{user.email}</td>
                    <td className="px-5 py-3.5">
                      {user.role === 'OWNER' ? (
                        <span
                          className={cn(
                            'inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold',
                            roleBadge[user.role],
                          )}
                        >
                          Owner
                        </span>
                      ) : (
                        <select
                          value={user.role}
                          onChange={(e) =>
                            updateRole.mutate({ userId: user.id, role: e.target.value })
                          }
                          className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs font-medium text-gray-700 focus:border-indigo-500 focus:outline-none"
                        >
                          {['ADMIN', 'MANAGER', 'AGENT'].map((r) => (
                            <option key={r} value={r}>
                              {r.charAt(0) + r.slice(1).toLowerCase()}
                            </option>
                          ))}
                        </select>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={cn(
                          'inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold',
                          user.status === 'ACTIVE'
                            ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100'
                            : 'bg-gray-100 text-gray-500 ring-1 ring-gray-200',
                        )}
                      >
                        {user.status === 'ACTIVE' ? 'Active' : user.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      {user.role !== 'OWNER' && (
                        <button
                          onClick={() => removeUser.mutate(user.id)}
                          className="rounded-md p-1.5 text-gray-300 opacity-0 transition hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Add member modal */}
      <Modal open={inviteOpen} onClose={() => setInviteOpen(false)} title="Add Team Member">
        <form
          onSubmit={inviteForm.handleSubmit((d) => inviteUser.mutate(d))}
          className="space-y-4"
        >
          <div className="grid grid-cols-2 gap-4">
            <Field label="First Name" error={inviteForm.formState.errors.firstName?.message}>
              <Input {...inviteForm.register('firstName')} />
            </Field>
            <Field label="Last Name">
              <Input {...inviteForm.register('lastName')} />
            </Field>
          </div>
          <Field label="Email" error={inviteForm.formState.errors.email?.message}>
            <Input {...inviteForm.register('email')} type="email" />
          </Field>
          <Field
            label="Temporary Password"
            error={inviteForm.formState.errors.password?.message}
          >
            <Input
              {...inviteForm.register('password')}
              type="password"
              placeholder="Min 8 characters"
            />
          </Field>
          <Field label="Role">
            <select {...inviteForm.register('role')} className={inputCls}>
              <option value="AGENT">Agent</option>
              <option value="MANAGER">Manager</option>
              <option value="ADMIN">Admin</option>
            </select>
          </Field>

          {inviteUser.isError && (
            <p className="text-sm text-red-500">
              Failed to add user. Email may already be in use.
            </p>
          )}

          <div className="flex justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={() => setInviteOpen(false)}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={inviteUser.isPending}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
            >
              {inviteUser.isPending ? 'Adding…' : 'Add Member'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
