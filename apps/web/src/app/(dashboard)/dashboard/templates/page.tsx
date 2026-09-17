'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '@/components/ui/Modal';
import { Plus, Pencil, Trash2, Sparkles, Loader2, CheckCircle, Mail, MessageSquare, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

type Channel = 'SMS' | 'WHATSAPP' | 'EMAIL';
type MainTab = 'SMS' | 'WHATSAPP' | 'EMAIL' | 'EMAIL_SETUP';

const channelBadge: Record<Channel, string> = {
  SMS: 'bg-blue-50 text-blue-700 ring-1 ring-blue-100',
  WHATSAPP: 'bg-green-50 text-green-700 ring-1 ring-green-100',
  EMAIL: 'bg-violet-50 text-violet-700 ring-1 ring-violet-100',
};

function extractVariables(body: string, subject?: string): string[] {
  const text = `${body || ''} ${subject || ''}`;
  const matches = text.match(/{{\s*([a-zA-Z0-9_]+)\s*}}/g) || [];
  const names = matches.map((m) => m.replace(/[{}]/g, '').trim());
  return Array.from(new Set(names));
}

const templateSchema = z.object({
  name: z.string().min(1, 'Required'),
  subject: z.string().optional(),
  body: z.string().min(1, 'Required'),
  isDlt: z.boolean().optional(),
  dltTemplateId: z.string().optional(),
  dltSenderId: z.string().optional(),
});

type TemplateForm = z.infer<typeof templateSchema>;

const inputCls =
  'mt-1 block w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm transition placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20';

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

export default function TemplatesPage() {
  const qc = useQueryClient();
  const [mainTab, setMainTab] = useState<MainTab>('SMS');
  const [smsSubTab, setSmsSubTab] = useState<'NORMAL' | 'DLT'>('NORMAL');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [showAiInput, setShowAiInput] = useState(false);
  const [aiTopic, setAiTopic] = useState('');

  const { data: templates } = useQuery({
    queryKey: ['message-templates'],
    queryFn: async () => {
      const { data } = await api.get('/api/v1/messages/templates');
      return data.data as any[];
    },
  });

  const activeChannel: Channel = mainTab === 'EMAIL_SETUP' ? 'EMAIL' : mainTab;

  const filtered = (templates || []).filter((t) => {
    if (t.channel !== activeChannel) return false;
    if (activeChannel === 'SMS') return smsSubTab === 'DLT' ? t.isDlt : !t.isDlt;
    return true;
  });

  const form = useForm<TemplateForm>({
    resolver: zodResolver(templateSchema),
    defaultValues: { name: '', subject: '', body: '', isDlt: false, dltTemplateId: '', dltSenderId: '' },
  });

  useEffect(() => {
    if (editing) {
      form.reset({
        name: editing.name,
        subject: editing.subject || '',
        body: editing.body,
        isDlt: editing.isDlt || false,
        dltTemplateId: editing.dltTemplateId || '',
        dltSenderId: editing.dltSenderId || '',
      });
    } else {
      form.reset({ name: '', subject: '', body: '', isDlt: false, dltTemplateId: '', dltSenderId: '' });
    }
    setShowAiInput(false);
    setAiTopic('');
  }, [editing, modalOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  const isDlt = form.watch('isDlt');
  const bodyValue = form.watch('body');

  const saveTemplate = useMutation({
    mutationFn: (data: TemplateForm) => {
      const variables = extractVariables(data.body, data.subject);
      const payload: any = {
        name: data.name,
        channel: activeChannel,
        body: data.body,
        variables,
      };
      if (activeChannel === 'EMAIL') payload.subject = data.subject;
      if (activeChannel === 'SMS') {
        payload.isDlt = !!data.isDlt;
        if (data.isDlt) {
          payload.dltTemplateId = data.dltTemplateId;
          payload.dltSenderId = data.dltSenderId;
        }
      }
      return editing
        ? api.patch(`/api/v1/messages/templates/${editing.id}`, payload)
        : api.post('/api/v1/messages/templates', payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['message-templates'] });
      setModalOpen(false);
      setEditing(null);
    },
  });

  const toggleActive = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      api.patch(`/api/v1/messages/templates/${id}`, { isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['message-templates'] }),
  });

  const deleteTemplate = useMutation({
    mutationFn: (id: string) => api.delete(`/api/v1/messages/templates/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['message-templates'] }),
  });

  const aiDraft = useMutation({
    mutationFn: (topic: string) => api.post('/api/v1/messages/templates/ai-draft', { topic }),
    onSuccess: ({ data }) => {
      form.setValue('subject', data.data.subject);
      form.setValue('body', data.data.body);
      setShowAiInput(false);
      setAiTopic('');
    },
  });

  const openNew = () => {
    setEditing(null);
    setModalOpen(true);
  };
  const openEdit = (t: any) => {
    setEditing(t);
    setModalOpen(true);
  };

  const tabs: { key: MainTab; label: string }[] = [
    { key: 'SMS', label: 'SMS' },
    { key: 'WHATSAPP', label: 'WhatsApp' },
    { key: 'EMAIL', label: 'Email' },
    { key: 'EMAIL_SETUP', label: 'Email Setup' },
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-lg font-bold text-gray-900">Message Templates</h1>
        <p className="mt-0.5 text-sm text-gray-500">Manage reusable SMS, WhatsApp, and Email templates.</p>
      </div>

      {/* Tab bar */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 rounded-xl bg-gray-100/80 p-1 w-fit">
          {tabs.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setMainTab(key)}
              className={cn(
                'rounded-lg px-5 py-1.5 text-sm font-medium transition',
                mainTab === key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700',
              )}
            >
              {label}
            </button>
          ))}
        </div>
        {mainTab !== 'EMAIL_SETUP' && (
          <button
            onClick={openNew}
            className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
          >
            <Plus className="h-3.5 w-3.5" />
            New Template
          </button>
        )}
      </div>

      {/* SMS sub-tabs */}
      {mainTab === 'SMS' && (
        <div className="flex gap-2">
          {(['NORMAL', 'DLT'] as const).map((k) => (
            <button
              key={k}
              onClick={() => setSmsSubTab(k)}
              className={cn(
                'rounded-full px-3.5 py-1 text-xs font-semibold transition',
                smsSubTab === k
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
              )}
            >
              {k === 'NORMAL' ? 'Normal SMS' : 'DLT SMS'}
            </button>
          ))}
        </div>
      )}

      {/* Template list */}
      {mainTab !== 'EMAIL_SETUP' && (
        <div className="space-y-3">
          {filtered.length === 0 && (
            <div className="rounded-xl border border-dashed border-gray-200 bg-white p-8 text-center text-sm text-gray-400">
              No templates yet. Create your first one.
            </div>
          )}
          {filtered.map((t) => (
            <div
              key={t.id}
              className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-semibold', channelBadge[t.channel as Channel])}>
                      {t.channel}
                    </span>
                    {t.isDlt && (
                      <span className="flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 ring-1 ring-amber-100">
                        <ShieldCheck className="h-3 w-3" /> DLT
                      </span>
                    )}
                    {t.isAiGenerated && (
                      <span className="flex items-center gap-1 rounded-full bg-fuchsia-50 px-2 py-0.5 text-[10px] font-semibold text-fuchsia-700 ring-1 ring-fuchsia-100">
                        <Sparkles className="h-3 w-3" /> AI
                      </span>
                    )}
                    <h3 className="truncate text-sm font-semibold text-gray-900">{t.name}</h3>
                  </div>
                  {t.subject && <p className="mt-1 text-xs font-medium text-gray-600">Subject: {t.subject}</p>}
                  <p className="mt-1 line-clamp-2 text-sm text-gray-500">{t.body}</p>
                  {t.variables?.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {t.variables.map((v: string) => (
                        <span key={v} className="rounded-md bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-500">
                          {'{{' + v + '}}'}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    onClick={() => toggleActive.mutate({ id: t.id, isActive: !t.isActive })}
                    className={cn(
                      'rounded-full px-2.5 py-1 text-[11px] font-semibold transition',
                      t.isActive
                        ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100'
                        : 'bg-gray-100 text-gray-500 ring-1 ring-gray-200',
                    )}
                  >
                    {t.isActive ? 'Active' : 'Inactive'}
                  </button>
                  <button
                    onClick={() => openEdit(t)}
                    className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => deleteTemplate.mutate(t.id)}
                    className="rounded-md p-1.5 text-gray-300 hover:bg-red-50 hover:text-red-500"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Email Setup tab */}
      {mainTab === 'EMAIL_SETUP' && <EmailSetupPanel />}

      {/* New/Edit template modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Template' : 'New Template'}
        size="lg"
      >
        <form onSubmit={form.handleSubmit((d) => saveTemplate.mutate(d))} className="space-y-4">
          <Field label="Name" error={form.formState.errors.name?.message}>
            <input {...form.register('name')} className={inputCls} placeholder="e.g. MBA Admissions Open" />
          </Field>

          {activeChannel === 'EMAIL' && (
            <Field label="Subject">
              <input {...form.register('subject')} className={inputCls} placeholder="Email subject line" />
            </Field>
          )}

          {activeChannel === 'SMS' && (
            <div className="flex items-center gap-2 rounded-lg border border-gray-100 bg-gray-50/60 px-3 py-2">
              <input
                id="isDlt"
                type="checkbox"
                {...form.register('isDlt')}
                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <label htmlFor="isDlt" className="text-sm font-medium text-gray-700">
                Is DLT template (India TRAI DLT-registered)
              </label>
            </div>
          )}

          {activeChannel === 'SMS' && isDlt && (
            <div className="grid grid-cols-2 gap-4">
              <Field label="DLT Template ID">
                <input {...form.register('dltTemplateId')} className={inputCls} placeholder="e.g. 1707162400000000001" />
              </Field>
              <Field label="DLT Sender ID">
                <input {...form.register('dltSenderId')} className={inputCls} placeholder="e.g. LEADSZ" />
              </Field>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-700">Body</label>
              {activeChannel === 'EMAIL' && (
                <button
                  type="button"
                  onClick={() => setShowAiInput((v) => !v)}
                  className="flex items-center gap-1 rounded-md bg-fuchsia-50 px-2 py-1 text-xs font-semibold text-fuchsia-700 hover:bg-fuchsia-100"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  AI Draft
                </button>
              )}
            </div>

            {activeChannel === 'EMAIL' && showAiInput && (
              <div className="mt-2 flex items-center gap-2 rounded-lg border border-fuchsia-100 bg-fuchsia-50/50 p-2">
                <input
                  value={aiTopic}
                  onChange={(e) => setAiTopic(e.target.value)}
                  placeholder="What's this email about? e.g. MBA admissions open for Fall intake"
                  className="flex-1 rounded-md border border-fuchsia-200 bg-white px-2.5 py-1.5 text-sm text-gray-900 focus:border-fuchsia-400 focus:outline-none"
                />
                <button
                  type="button"
                  disabled={!aiTopic.trim() || aiDraft.isPending}
                  onClick={() => aiDraft.mutate(aiTopic.trim())}
                  className="flex items-center gap-1.5 rounded-md bg-fuchsia-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-fuchsia-500 disabled:opacity-50"
                >
                  {aiDraft.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                  Generate
                </button>
              </div>
            )}
            {aiDraft.isError && (
              <p className="mt-1 text-xs text-red-500">
                {(aiDraft.error as any)?.response?.data?.error?.message || 'AI draft failed. Please try again.'}
              </p>
            )}

            <textarea
              {...form.register('body')}
              rows={6}
              className={inputCls}
              placeholder="Write your message here. Use {{variableName}} for personalization, e.g. Hi {{name}}..."
            />
            {form.formState.errors.body && (
              <p className="mt-1 text-xs text-red-500">{form.formState.errors.body.message}</p>
            )}
            <p className="mt-1 text-xs text-gray-400">
              Tip: use <code className="rounded bg-gray-100 px-1">{'{{variableName}}'}</code> syntax — variables are
              auto-detected from your text.
            </p>
            {bodyValue && extractVariables(bodyValue, form.watch('subject')).length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {extractVariables(bodyValue, form.watch('subject')).map((v) => (
                  <span key={v} className="rounded-md bg-indigo-50 px-1.5 py-0.5 text-[10px] font-medium text-indigo-600">
                    {'{{' + v + '}}'}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 border-t border-gray-50 pt-4">
            <button
              type="submit"
              disabled={saveTemplate.isPending}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
            >
              {saveTemplate.isPending ? 'Saving…' : editing ? 'Save Changes' : 'Create Template'}
            </button>
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="rounded-lg px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100"
            >
              Cancel
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

const emailConfigSchema = z.object({
  provider: z.enum(['SES', 'SMTP']),
  sendingDomain: z.string().optional(),
  smtpHost: z.string().optional(),
  smtpPort: z.coerce.number().optional(),
  smtpUser: z.string().optional(),
  smtpPassword: z.string().optional(),
});

type EmailConfigForm = z.infer<typeof emailConfigSchema>;

function EmailSetupPanel() {
  const qc = useQueryClient();
  const [saved, setSaved] = useState(false);

  const { data: config } = useQuery({
    queryKey: ['email-config'],
    queryFn: async () => {
      const { data } = await api.get('/api/v1/messages/email-config');
      return data.data;
    },
  });

  const form = useForm<EmailConfigForm>({
    resolver: zodResolver(emailConfigSchema),
    values: {
      provider: config?.provider || 'SES',
      sendingDomain: config?.sendingDomain || '',
      smtpHost: config?.smtpHost || '',
      smtpPort: config?.smtpPort || undefined,
      smtpUser: config?.smtpUser || '',
      smtpPassword: '',
    },
  });

  const provider = form.watch('provider');

  const save = useMutation({
    mutationFn: (data: EmailConfigForm) => api.put('/api/v1/messages/email-config', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['email-config'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    },
  });

  return (
    <form
      onSubmit={form.handleSubmit((d) => save.mutate(d))}
      className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm space-y-5"
    >
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[15px] font-semibold text-gray-900">Email Sending Configuration</h2>
          <p className="mt-0.5 text-xs text-gray-400">Configure how outbound emails are sent for your workspace.</p>
        </div>
        <span
          className={cn(
            'flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold',
            config?.isVerified
              ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100'
              : 'bg-amber-50 text-amber-700 ring-1 ring-amber-100',
          )}
        >
          {config?.isVerified ? <CheckCircle className="h-3.5 w-3.5" /> : <Mail className="h-3.5 w-3.5" />}
          {config?.isVerified ? 'Verified' : 'Not Verified'}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 border-t border-gray-50 pt-4">
        <Field label="Provider">
          <select {...form.register('provider')} className={inputCls}>
            <option value="SES">Amazon SES</option>
            <option value="SMTP">Custom SMTP</option>
          </select>
        </Field>
        <Field label="Sending Domain">
          <input {...form.register('sendingDomain')} className={inputCls} placeholder="mail.yourcompany.com" />
        </Field>

        {provider === 'SMTP' && (
          <>
            <Field label="SMTP Host">
              <input {...form.register('smtpHost')} className={inputCls} placeholder="smtp.yourprovider.com" />
            </Field>
            <Field label="SMTP Port">
              <input {...form.register('smtpPort')} type="number" className={inputCls} placeholder="587" />
            </Field>
            <Field label="SMTP User">
              <input {...form.register('smtpUser')} className={inputCls} placeholder="username" />
            </Field>
            <Field label="SMTP Password">
              <input {...form.register('smtpPassword')} type="password" className={inputCls} placeholder="••••••••" />
            </Field>
          </>
        )}
      </div>

      <div className="flex items-center gap-3 border-t border-gray-50 pt-4">
        <button
          type="submit"
          disabled={save.isPending}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
        >
          {save.isPending ? 'Saving…' : 'Save Changes'}
        </button>
        {saved && (
          <span className="flex items-center gap-1.5 text-sm font-medium text-emerald-600">
            <CheckCircle className="h-4 w-4" />
            Saved
          </span>
        )}
      </div>
    </form>
  );
}
