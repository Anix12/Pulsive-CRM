'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import {
  UserPlus, Trash2, CheckCircle, Plus, Pencil, ListChecks, Sparkles,
  GitBranch, ShieldCheck, PhoneCall, Coffee, CalendarClock, Copy,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type SettingsTab =
  | 'general' | 'team' | 'customFields' | 'scoringRules'
  | 'pipelines' | 'roles' | 'dispositions' | 'reportSchedules';

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
  inactivityTimeoutMinutes: z.coerce.number().int().min(1).max(240).optional(),
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
  'mt-1 block w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm transition placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20';

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

function SectionCard({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
        <div>
          <h2 className="text-[15px] font-semibold text-gray-900">{title}</h2>
          {description && <p className="mt-0.5 text-xs text-gray-400">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

function EmptyRow({ colSpan, label }: { colSpan: number; label: string }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-5 py-8 text-center text-sm text-gray-400">
        {label}
      </td>
    </tr>
  );
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
    enabled: tab === 'team' || tab === 'scoringRules' || tab === 'roles',
  });

  const generalForm = useForm({
    resolver: zodResolver(generalSchema),
    values: {
      name: tenant?.name || '',
      companyName: tenant?.companyName || '',
      emailFrom: tenant?.emailFrom || '',
      emailFromName: tenant?.emailFromName || '',
      inactivityTimeoutMinutes: tenant?.inactivityTimeoutMinutes ?? 15,
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
    { key: 'general', label: 'Company Profile' },
    { key: 'team', label: 'Team' },
    { key: 'customFields', label: 'Custom Fields' },
    { key: 'scoringRules', label: 'Scoring Rules' },
    { key: 'pipelines', label: 'Pipeline & Stages' },
    { key: 'roles', label: 'Roles & Permissions' },
    { key: 'dispositions', label: 'Call Dispositions' },
    { key: 'reportSchedules', label: 'Report Schedules' },
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Tab bar */}
      <div className="flex flex-wrap gap-1 rounded-xl bg-gray-100/80 p-1 w-fit">
        {tabs.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              'rounded-lg px-3.5 py-1.5 text-[13px] font-medium transition whitespace-nowrap',
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
        <div className="space-y-6">
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
              <Field
                label="Agent Inactivity Timeout (minutes)"
                error={generalForm.formState.errors.inactivityTimeoutMinutes?.message}
              >
                <Input
                  {...generalForm.register('inactivityTimeoutMinutes')}
                  type="number"
                  min={1}
                  max={240}
                />
                <p className="mt-1 text-[11px] text-gray-400">
                  Minutes of no activity before an agent is flagged inactive on the dashboard.
                </p>
              </Field>
              <Field label="Current Plan">
                <div className="mt-1 flex h-[38px] items-center">
                  <span className="inline-flex rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 ring-1 ring-indigo-100">
                    {tenant?.plan ?? '—'}
                  </span>
                </div>
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

          <BreakWindowsPanel />
        </div>
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

      {tab === 'customFields' && <CustomFieldsPanel />}
      {tab === 'scoringRules' && <ScoringRulesPanel users={users} />}
      {tab === 'pipelines' && <PipelinesPanel />}
      {tab === 'roles' && <RolesPanel />}
      {tab === 'dispositions' && <DispositionsPanel />}
      {tab === 'reportSchedules' && <ReportSchedulesPanel />}

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

// ── Break Windows ────────────────────────────────────────────────────────────

function BreakWindowsPanel() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', startTime: '11:30', endTime: '11:45' });

  const { data: windows = [] } = useQuery<any[]>({
    queryKey: ['break-windows'],
    queryFn: async () => {
      const { data } = await api.get('/api/v1/settings/break-windows');
      return data.data;
    },
  });

  const create = useMutation({
    mutationFn: (body: typeof form) => api.post('/api/v1/settings/break-windows', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['break-windows'] });
      setOpen(false);
      setForm({ name: '', startTime: '11:30', endTime: '11:45' });
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/api/v1/settings/break-windows/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['break-windows'] }),
  });

  return (
    <SectionCard
      title="Scheduled Break Windows"
      description="Named breaks (e.g. tea, lunch) that pause inactivity alerts on the dashboard"
      action={
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500"
        >
          <Plus className="h-3.5 w-3.5" /> Add Break Window
        </button>
      }
    >
      <div className="divide-y divide-gray-50">
        {windows.length === 0 && (
          <p className="px-5 py-6 text-center text-sm text-gray-400">No break windows configured yet.</p>
        )}
        {windows.map((w) => (
          <div key={w.id} className="flex items-center justify-between px-5 py-3">
            <div className="flex items-center gap-2.5">
              <Coffee className="h-4 w-4 text-amber-500" />
              <span className="text-sm font-medium text-gray-900">{w.name}</span>
              <span className="text-xs text-gray-400">{w.startTime}–{w.endTime}</span>
            </div>
            <button onClick={() => remove.mutate(w.id)} className="rounded-md p-1.5 text-gray-300 hover:bg-red-50 hover:text-red-500">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Add Break Window" size="sm">
        <form onSubmit={(e) => { e.preventDefault(); create.mutate(form); }} className="space-y-4">
          <Field label="Name">
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Morning Tea" required />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Start Time">
              <Input type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} required />
            </Field>
            <Field label="End Time">
              <Input type="time" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} required />
            </Field>
          </div>
          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={() => setOpen(false)} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={create.isPending} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50">
              {create.isPending ? 'Adding…' : 'Add'}
            </button>
          </div>
        </form>
      </Modal>
    </SectionCard>
  );
}

// ── Custom Fields ─────────────────────────────────────────────────────────────

function CustomFieldsPanel() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [entity, setEntity] = useState<'CONTACT' | 'DEAL'>('CONTACT');
  const [form, setForm] = useState({ name: '', key: '', type: 'TEXT', options: '' });

  const { data: fields = [] } = useQuery<any[]>({
    queryKey: ['custom-fields'],
    queryFn: async () => {
      const { data } = await api.get('/api/v1/settings/custom-fields');
      return data.data;
    },
  });

  const create = useMutation({
    mutationFn: () =>
      api.post('/api/v1/settings/custom-fields', {
        entity,
        name: form.name,
        key: form.key,
        type: form.type,
        options: form.type === 'DROPDOWN' ? form.options.split(',').map((o) => o.trim()).filter(Boolean) : [],
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['custom-fields'] });
      setOpen(false);
      setForm({ name: '', key: '', type: 'TEXT', options: '' });
    },
  });

  const toggleActive = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      api.patch(`/api/v1/settings/custom-fields/${id}`, { isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['custom-fields'] }),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/api/v1/settings/custom-fields/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['custom-fields'] }),
  });

  return (
    <SectionCard
      title="Custom Fields"
      description="Extra data fields you can capture on Leads and Deals"
      action={
        <button onClick={() => setOpen(true)} className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500">
          <Plus className="h-3.5 w-3.5" /> Add Field
        </button>
      }
    >
      <table className="min-w-full divide-y divide-gray-50">
        <thead className="bg-gray-50/60">
          <tr>
            {['Field', 'Key', 'Type', 'Entity', 'Active', ''].map((h) => (
              <th key={h} className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {fields.length === 0 && <EmptyRow colSpan={6} label="No custom fields yet." />}
          {fields.map((f: any) => (
            <tr key={f.id} className="group hover:bg-slate-50/50">
              <td className="px-5 py-3 text-sm font-medium text-gray-900">{f.name}</td>
              <td className="px-5 py-3 text-xs text-gray-400 font-mono">{f.key}</td>
              <td className="px-5 py-3 text-sm text-gray-500">{f.type}</td>
              <td className="px-5 py-3 text-sm text-gray-500">{f.entity === 'CONTACT' ? 'Lead' : 'Deal'}</td>
              <td className="px-5 py-3">
                <button
                  onClick={() => toggleActive.mutate({ id: f.id, isActive: !f.isActive })}
                  className={cn('inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold', f.isActive ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100' : 'bg-gray-100 text-gray-500 ring-1 ring-gray-200')}
                >
                  {f.isActive ? 'Active' : 'Inactive'}
                </button>
              </td>
              <td className="px-5 py-3 text-right">
                <button onClick={() => remove.mutate(f.id)} className="rounded-md p-1.5 text-gray-300 opacity-0 transition hover:bg-red-50 hover:text-red-500 group-hover:opacity-100">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <Modal open={open} onClose={() => setOpen(false)} title="Add Custom Field" size="sm">
        <form onSubmit={(e) => { e.preventDefault(); create.mutate(); }} className="space-y-4">
          <Field label="Applies To">
            <select value={entity} onChange={(e) => setEntity(e.target.value as any)} className={inputCls}>
              <option value="CONTACT">Lead</option>
              <option value="DEAL">Deal</option>
            </select>
          </Field>
          <Field label="Field Name">
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Course Interested In" required />
          </Field>
          <Field label="Field Key (lowercase, no spaces)">
            <Input value={form.key} onChange={(e) => setForm({ ...form, key: e.target.value })} placeholder="course_interested" required />
          </Field>
          <Field label="Type">
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className={inputCls}>
              {['TEXT', 'NUMBER', 'DROPDOWN', 'DATE', 'BOOLEAN'].map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>
          {form.type === 'DROPDOWN' && (
            <Field label="Options (comma separated)">
              <Input value={form.options} onChange={(e) => setForm({ ...form, options: e.target.value })} placeholder="MBA, MCA, BBA" />
            </Field>
          )}
          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={() => setOpen(false)} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={create.isPending} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50">
              {create.isPending ? 'Adding…' : 'Add Field'}
            </button>
          </div>
        </form>
      </Modal>
    </SectionCard>
  );
}

// ── Scoring Rules ─────────────────────────────────────────────────────────────

function ScoringRulesPanel({ users }: { users: any[] | undefined }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ field: 'source', operator: 'equals', value: '', points: 10 });

  const { data: rules = [] } = useQuery<any[]>({
    queryKey: ['scoring-rules'],
    queryFn: async () => {
      const { data } = await api.get('/api/v1/settings/scoring-rules');
      return data.data;
    },
  });

  const create = useMutation({
    mutationFn: () => api.post('/api/v1/settings/scoring-rules', form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['scoring-rules'] });
      setOpen(false);
      setForm({ field: 'source', operator: 'equals', value: '', points: 10 });
    },
  });

  const toggleActive = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      api.patch(`/api/v1/settings/scoring-rules/${id}`, { isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['scoring-rules'] }),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/api/v1/settings/scoring-rules/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['scoring-rules'] }),
  });

  return (
    <SectionCard
      title="Lead Scoring Rules"
      description="Automatically score leads. Scores recalculate instantly whenever a rule changes."
      action={
        <button onClick={() => setOpen(true)} className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500">
          <Plus className="h-3.5 w-3.5" /> Add Rule
        </button>
      }
    >
      <div className="divide-y divide-gray-50">
        {rules.length === 0 && <p className="px-5 py-8 text-center text-sm text-gray-400">No scoring rules yet.</p>}
        {rules.map((r: any) => (
          <div key={r.id} className="flex items-center justify-between px-5 py-3">
            <div className="flex items-center gap-2 text-sm">
              <ListChecks className="h-4 w-4 text-indigo-400" />
              <span className="text-gray-500">If</span>
              <span className="font-mono text-xs rounded bg-gray-100 px-1.5 py-0.5 text-gray-700">{r.field}</span>
              <span className="text-gray-500">{r.operator}</span>
              <span className="font-medium text-gray-900">"{r.value}"</span>
              <span className="text-gray-500">then</span>
              <span className={cn('font-semibold', r.points >= 0 ? 'text-emerald-600' : 'text-red-500')}>
                {r.points >= 0 ? `+${r.points}` : r.points} pts
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => toggleActive.mutate({ id: r.id, isActive: !r.isActive })}
                className={cn('inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold', r.isActive ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100' : 'bg-gray-100 text-gray-500 ring-1 ring-gray-200')}
              >
                {r.isActive ? 'Active' : 'Inactive'}
              </button>
              <button onClick={() => remove.mutate(r.id)} className="rounded-md p-1.5 text-gray-300 hover:bg-red-50 hover:text-red-500">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Add Scoring Rule" size="sm">
        <form onSubmit={(e) => { e.preventDefault(); create.mutate(); }} className="space-y-4">
          <Field label="Field">
            <Input value={form.field} onChange={(e) => setForm({ ...form, field: e.target.value })} placeholder="source, status, customFields.course" required />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Operator">
              <select value={form.operator} onChange={(e) => setForm({ ...form, operator: e.target.value })} className={inputCls}>
                {['equals', 'contains', 'gt', 'lt'].map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </Field>
            <Field label="Value">
              <Input value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} required />
            </Field>
          </div>
          <Field label="Points">
            <Input type="number" value={form.points} onChange={(e) => setForm({ ...form, points: Number(e.target.value) })} required />
          </Field>
          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={() => setOpen(false)} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={create.isPending} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50">
              {create.isPending ? 'Adding…' : 'Add Rule'}
            </button>
          </div>
        </form>
      </Modal>
    </SectionCard>
  );
}

// ── Pipelines & Stages ────────────────────────────────────────────────────────

function PipelinesPanel() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');

  const { data: pipelines = [] } = useQuery<any[]>({
    queryKey: ['pipelines'],
    queryFn: async () => {
      const { data } = await api.get('/api/v1/settings/pipelines');
      return data.data;
    },
  });

  const create = useMutation({
    mutationFn: () => api.post('/api/v1/settings/pipelines', { name }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pipelines'] });
      setOpen(false);
      setName('');
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/api/v1/settings/pipelines/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pipelines'] }),
  });

  return (
    <SectionCard
      title="Pipelines & Stages"
      description={`Multiple named pipelines, each with its own set of stages. Manage stage order/colors from the Pipeline board's "Manage Stages" button.`}
      action={
        <button onClick={() => setOpen(true)} className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500">
          <Plus className="h-3.5 w-3.5" /> New Pipeline
        </button>
      }
    >
      <div className="divide-y divide-gray-50">
        {pipelines.length === 0 && <p className="px-5 py-8 text-center text-sm text-gray-400">No additional pipelines yet — the default Pipeline board covers most workflows.</p>}
        {pipelines.map((p: any) => (
          <div key={p.id} className="px-5 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <GitBranch className="h-4 w-4 text-indigo-400" />
                <span className="text-sm font-semibold text-gray-900">{p.name}</span>
                {p.isDefault && <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-700 ring-1 ring-indigo-100">Default</span>}
              </div>
              <button onClick={() => remove.mutate(p.id)} className="rounded-md p-1.5 text-gray-300 hover:bg-red-50 hover:text-red-500">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {(p.stages || []).map((s: any) => (
                <span key={s.id} className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium" style={{ backgroundColor: `${s.color}1a`, color: s.color }}>
                  <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: s.color }} />
                  {s.name}
                </span>
              ))}
              {(p.stages || []).length === 0 && <span className="text-xs text-gray-400">No stages yet</span>}
            </div>
          </div>
        ))}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="New Pipeline" size="sm">
        <form onSubmit={(e) => { e.preventDefault(); create.mutate(); }} className="space-y-4">
          <Field label="Pipeline Name">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Admission Pipeline" required />
          </Field>
          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={() => setOpen(false)} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={create.isPending} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50">
              {create.isPending ? 'Creating…' : 'Create'}
            </button>
          </div>
        </form>
      </Modal>
    </SectionCard>
  );
}

// ── Roles & Permissions ───────────────────────────────────────────────────────

const MODULE_LABELS: Record<string, string> = {
  leads: 'Leads', campaigns: 'Campaigns', workflows: 'Workflows', tasks: 'Tasks',
  templates: 'Templates', marketing: 'Marketing', whatsappInbox: 'WhatsApp Inbox',
  reports: 'Reports', applications: 'Applications', usersAndRoles: 'Users & Roles',
  integrations: 'Integrations', settings: 'Settings',
};

function RolesPanel() {
  const qc = useQueryClient();
  const { data: rolePerms = [] } = useQuery<any[]>({
    queryKey: ['role-permissions'],
    queryFn: async () => {
      const { data } = await api.get('/api/v1/settings/role-permissions');
      return data.data;
    },
  });

  const save = useMutation({
    mutationFn: (body: any) => api.put('/api/v1/settings/role-permissions', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['role-permissions'] }),
  });

  const togglePerm = (row: any, mod: string, key: 'view' | 'edit') => {
    const next = {
      ...row.permissions,
      [mod]: { ...row.permissions[mod], [key]: !row.permissions[mod]?.[key] },
    };
    save.mutate({ role: row.role, permissions: next, managerScopedAccess: row.managerScopedAccess });
  };

  const toggleManagerScope = (row: any) => {
    save.mutate({ role: row.role, permissions: row.permissions, managerScopedAccess: !row.managerScopedAccess });
  };

  return (
    <SectionCard title="Roles & Permissions" description="Granular per-module access for each role">
      <div className="divide-y divide-gray-50">
        {rolePerms.map((row: any) => (
          <div key={row.role} className="px-5 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-indigo-400" />
                <span className={cn('inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold', roleBadge[row.role])}>{row.role}</span>
              </div>
              {row.role !== 'ADMIN' && (
                <label className="flex items-center gap-2 text-xs text-gray-500">
                  <input type="checkbox" checked={row.managerScopedAccess} onChange={() => toggleManagerScope(row)} className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                  Manager Access (restrict to own team's leads/reports)
                </label>
              )}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3">
              {Object.entries(MODULE_LABELS).map(([mod, label]) => (
                <div key={mod} className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-1.5">
                  <span className="text-xs text-gray-600">{label}</span>
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-1 text-[10px] text-gray-400">
                      <input type="checkbox" checked={!!row.permissions[mod]?.view} onChange={() => togglePerm(row, mod, 'view')} className="h-3 w-3 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                      View
                    </label>
                    <label className="flex items-center gap-1 text-[10px] text-gray-400">
                      <input type="checkbox" checked={!!row.permissions[mod]?.edit} onChange={() => togglePerm(row, mod, 'edit')} className="h-3 w-3 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                      Edit
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

// ── Call Dispositions ─────────────────────────────────────────────────────────

function DispositionsPanel() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', category: '' });

  const { data: dispositions = [] } = useQuery<any[]>({
    queryKey: ['call-dispositions'],
    queryFn: async () => {
      const { data } = await api.get('/api/v1/settings/call-dispositions');
      return data.data;
    },
  });

  const { data: stages = [] } = useQuery<any[]>({
    queryKey: ['deal-stages'],
    queryFn: async () => {
      const { data } = await api.get('/api/v1/deals/stages');
      return data.data;
    },
  });

  const create = useMutation({
    mutationFn: () => api.post('/api/v1/settings/call-dispositions', form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['call-dispositions'] });
      setOpen(false);
      setForm({ name: '', category: '' });
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/api/v1/settings/call-dispositions/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['call-dispositions'] }),
  });

  const updateStageMap = useMutation({
    mutationFn: ({ id, movesToStageId }: { id: string; movesToStageId: string }) =>
      api.patch(`/api/v1/settings/call-dispositions/${id}`, { movesToStageId: movesToStageId || null }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['call-dispositions'] }),
  });

  const copyFrom = useMutation({
    mutationFn: (toStageId: string) => api.post('/api/v1/settings/call-dispositions/copy', { toStageId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['call-dispositions'] }),
  });

  const grouped = dispositions.reduce((acc: Record<string, any[]>, d: any) => {
    (acc[d.category] ||= []).push(d);
    return acc;
  }, {});

  return (
    <SectionCard
      title="Call Dispositions"
      description="Categorized call outcomes. Optionally auto-move the lead's stage when a disposition is logged."
      action={
        <div className="flex items-center gap-2">
          {stages[0] && (
            <button
              onClick={() => copyFrom.mutate(stages[0].id)}
              className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50"
              title={`Copy from Pipeline into "${stages[0].name}"`}
            >
              <Copy className="h-3.5 w-3.5" /> Copy from Pipeline
            </button>
          )}
          <button onClick={() => setOpen(true)} className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500">
            <Plus className="h-3.5 w-3.5" /> Add Disposition
          </button>
        </div>
      }
    >
      <div className="divide-y divide-gray-50">
        {dispositions.length === 0 && <p className="px-5 py-8 text-center text-sm text-gray-400">No dispositions yet.</p>}
        {Object.entries(grouped).map(([category, items]) => (
          <div key={category} className="px-5 py-3">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400">{category}</p>
            <div className="space-y-1.5">
              {items.map((d: any) => (
                <div key={d.id} className="flex items-center justify-between rounded-lg bg-gray-50/60 px-3 py-2">
                  <div className="flex items-center gap-2">
                    <PhoneCall className="h-3.5 w-3.5 text-gray-400" />
                    <span className="text-sm text-gray-800">{d.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={d.movesToStageId ?? ''}
                      onChange={(e) => updateStageMap.mutate({ id: d.id, movesToStageId: e.target.value })}
                      className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs text-gray-600 focus:border-indigo-500 focus:outline-none"
                    >
                      <option value="">No stage change</option>
                      {stages.map((s: any) => <option key={s.id} value={s.id}>Move to {s.name}</option>)}
                    </select>
                    <button onClick={() => remove.mutate(d.id)} className="rounded-md p-1.5 text-gray-300 hover:bg-red-50 hover:text-red-500">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Add Call Disposition" size="sm">
        <form onSubmit={(e) => { e.preventDefault(); create.mutate(); }} className="space-y-4">
          <Field label="Category">
            <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Not Connected" required />
          </Field>
          <Field label="Disposition Name">
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="No Response" required />
          </Field>
          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={() => setOpen(false)} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={create.isPending} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50">
              {create.isPending ? 'Adding…' : 'Add'}
            </button>
          </div>
        </form>
      </Modal>
    </SectionCard>
  );
}

// ── Report Schedules ──────────────────────────────────────────────────────────

const REPORT_OPTIONS = [
  { key: 'call-disposition', label: 'Call Disposition' },
  { key: 'sms', label: 'SMS Report' },
  { key: 'email', label: 'Email Report' },
  { key: 'follow-up', label: 'Follow-up Report' },
  { key: 'login-activity', label: 'Login Activity' },
  { key: 'lead-stage', label: 'Lead Stage' },
  { key: 'import-logs', label: 'Import Logs' },
  { key: 'agent-performance', label: 'Agent Performance' },
  { key: 'campaign-performance', label: 'Campaign Performance' },
  { key: 'lead-source', label: 'Lead Source' },
  { key: 'pipeline-funnel', label: 'Pipeline Funnel' },
  { key: 'call-report', label: 'Call Report' },
  { key: 'campaign-call-logs', label: 'Campaign Call Logs' },
  { key: 'break-report', label: 'Break Report' },
];

function ReportSchedulesPanel() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', reportKeys: [] as string[], frequency: 'DAILY', timeOfDay: '19:00', recipientEmail: '' });

  const { data: schedules = [] } = useQuery<any[]>({
    queryKey: ['report-schedules'],
    queryFn: async () => {
      const { data } = await api.get('/api/v1/settings/report-schedules');
      return data.data;
    },
  });

  const create = useMutation({
    mutationFn: () => api.post('/api/v1/settings/report-schedules', form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['report-schedules'] });
      setOpen(false);
      setForm({ name: '', reportKeys: [], frequency: 'DAILY', timeOfDay: '19:00', recipientEmail: '' });
    },
  });

  const toggleActive = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      api.patch(`/api/v1/settings/report-schedules/${id}`, { isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['report-schedules'] }),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/api/v1/settings/report-schedules/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['report-schedules'] }),
  });

  const toggleKey = (key: string) => {
    setForm((f) => ({
      ...f,
      reportKeys: f.reportKeys.includes(key) ? f.reportKeys.filter((k) => k !== key) : [...f.reportKeys, key],
    }));
  };

  return (
    <SectionCard
      title="Report Schedules"
      description="Bundle reports into a recurring digest emailed on a schedule"
      action={
        <button onClick={() => setOpen(true)} className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500">
          <Plus className="h-3.5 w-3.5" /> New Schedule
        </button>
      }
    >
      <div className="divide-y divide-gray-50">
        {schedules.length === 0 && <p className="px-5 py-8 text-center text-sm text-gray-400">No report schedules yet.</p>}
        {schedules.map((s: any) => (
          <div key={s.id} className="flex items-center justify-between px-5 py-3">
            <div>
              <div className="flex items-center gap-2">
                <CalendarClock className="h-4 w-4 text-indigo-400" />
                <span className="text-sm font-medium text-gray-900">{s.name}</span>
              </div>
              <p className="mt-1 text-xs text-gray-400">
                {s.reportKeys.length} report{s.reportKeys.length !== 1 ? 's' : ''} · {s.frequency} at {s.timeOfDay} · to {s.recipientEmail}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => toggleActive.mutate({ id: s.id, isActive: !s.isActive })}
                className={cn('inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold', s.isActive ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100' : 'bg-gray-100 text-gray-500 ring-1 ring-gray-200')}
              >
                {s.isActive ? 'Active' : 'Paused'}
              </button>
              <button onClick={() => remove.mutate(s.id)} className="rounded-md p-1.5 text-gray-300 hover:bg-red-50 hover:text-red-500">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="New Report Schedule">
        <form onSubmit={(e) => { e.preventDefault(); create.mutate(); }} className="space-y-4">
          <Field label="Schedule Name">
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Daily Ops Digest" required />
          </Field>
          <div>
            <label className="block text-sm font-medium text-gray-700">Reports Included</label>
            <div className="mt-2 grid grid-cols-2 gap-1.5">
              {REPORT_OPTIONS.map((r) => (
                <label key={r.key} className="flex items-center gap-2 rounded-lg border border-gray-100 px-2.5 py-1.5 text-xs text-gray-600">
                  <input type="checkbox" checked={form.reportKeys.includes(r.key)} onChange={() => toggleKey(r.key)} className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                  {r.label}
                </label>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Frequency">
              <select value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value })} className={inputCls}>
                {['DAILY', 'WEEKLY', 'MONTHLY'].map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </Field>
            <Field label="Time">
              <Input type="time" value={form.timeOfDay} onChange={(e) => setForm({ ...form, timeOfDay: e.target.value })} required />
            </Field>
          </div>
          <Field label="Recipient Email">
            <Input type="email" value={form.recipientEmail} onChange={(e) => setForm({ ...form, recipientEmail: e.target.value })} required />
          </Field>
          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={() => setOpen(false)} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={create.isPending || form.reportKeys.length === 0} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50">
              {create.isPending ? 'Creating…' : 'Create Schedule'}
            </button>
          </div>
        </form>
      </Modal>
    </SectionCard>
  );
}
