'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Trash2, GripVertical, MessageCircle } from 'lucide-react';
import api from '@/lib/api';
import { Modal } from '@/components/ui/Modal';
import { cn } from '@/lib/utils';
import { errorMessage } from '@/lib/leadViews';
import {
  emptySchema, newField, newSection, useSaveEngagementForm,
  type EngagementForm, type EngagementFormSchema, type EngagementSection, type FieldType,
} from '@/lib/engagementForms';

const inputCls = 'w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100';
const FIELD_TYPES: { value: FieldType; label: string }[] = [
  { value: 'text', label: 'Short text' },
  { value: 'radio', label: 'Multiple choice' },
  { value: 'date', label: 'Date' },
];

export function EngagementFormBuilderModal({
  open, onClose, form, campaignId,
}: { open: boolean; onClose: () => void; form?: EngagementForm | null; campaignId: string | null }) {
  const save = useSaveEngagementForm();
  const [name, setName] = useState('');
  const [schema, setSchema] = useState<EngagementFormSchema>(emptySchema());
  const [error, setError] = useState('');

  const { data: campaigns = [] } = useQuery<any[]>({
    queryKey: ['campaigns', 'options'],
    queryFn: async () => (await api.get('/api/v1/campaigns', { params: { limit: 100 } })).data.data,
    enabled: open,
  });
  const [forCampaignId, setForCampaignId] = useState<string | null>(campaignId);

  useEffect(() => {
    if (!open) return;
    setName(form?.name ?? 'Engagement form');
    setSchema(form?.schema ?? { sections: [newSection()] });
    setForCampaignId(form?.campaignId ?? campaignId);
    setError('');
  }, [open, form, campaignId]);

  const updateSection = (id: string, patch: Partial<EngagementSection>) =>
    setSchema((s) => ({ sections: s.sections.map((sec) => (sec.id === id ? { ...sec, ...patch } : sec)) }));
  const removeSection = (id: string) => setSchema((s) => ({ sections: s.sections.filter((sec) => sec.id !== id) }));
  const addSection = () => setSchema((s) => ({ sections: [...s.sections, newSection()] }));

  const addFieldTo = (sectionId: string, type: FieldType) =>
    updateSection(sectionId, { fields: [...(schema.sections.find((s) => s.id === sectionId)?.fields ?? []), newField(type)] });
  const updateField = (sectionId: string, fieldId: string, patch: Partial<EngagementSection['fields'][number]>) => {
    const section = schema.sections.find((s) => s.id === sectionId);
    if (!section) return;
    updateSection(sectionId, { fields: section.fields.map((f) => (f.id === fieldId ? { ...f, ...patch } : f)) });
  };
  const removeField = (sectionId: string, fieldId: string) => {
    const section = schema.sections.find((s) => s.id === sectionId);
    if (!section) return;
    updateSection(sectionId, { fields: section.fields.filter((f) => f.id !== fieldId) });
  };

  const submit = async () => {
    if (!name.trim()) return setError('Give the form a name');
    setError('');
    try {
      await save.mutateAsync({ id: form?.id, name: name.trim(), campaignId: forCampaignId, schema });
      onClose();
    } catch (err) {
      setError(errorMessage(err, 'Could not save the form'));
    }
  };

  return (
    <Modal open={open} onClose={onClose} size="xl" title="Engagement form builder" description="Shown to the agent on a Yes Connected call. Each section can also send a WhatsApp message.">
      <div className="mt-4 space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">Form name</label>
            <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="Engagement form" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">Applies to</label>
            <select className={inputCls} value={forCampaignId ?? ''} onChange={(e) => setForCampaignId(e.target.value || null)}>
              <option value="">Tenant default (all campaigns without one of their own)</option>
              {campaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>

        <div className="max-h-[55vh] space-y-4 overflow-y-auto pr-1">
          {schema.sections.map((section) => (
            <div key={section.id} className="overflow-hidden rounded-xl border border-gray-200">
              <div className="flex items-center gap-2 bg-[#5B21B6] px-4 py-2.5">
                <GripVertical className="h-4 w-4 text-white/50" />
                <input
                  value={section.title}
                  onChange={(e) => updateSection(section.id, { title: e.target.value })}
                  placeholder="Untitled section"
                  className="flex-1 border-0 bg-transparent text-sm font-semibold text-white outline-none placeholder:text-white/60"
                />
                <button type="button" onClick={() => removeSection(section.id)} className="rounded p-1 text-white/70 hover:bg-white/10 hover:text-white">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-4 p-4">
                <textarea
                  value={section.description ?? ''}
                  onChange={(e) => updateSection(section.id, { description: e.target.value })}
                  placeholder="Script: Hello, my name is {{your_name}}. Thank you for your time!"
                  rows={2}
                  className={cn(inputCls, 'resize-none')}
                />

                {section.fields.map((f) => (
                  <div key={f.id} className="rounded-lg border border-gray-100 bg-gray-50/70 p-3">
                    <div className="flex items-center gap-2">
                      <select
                        value={f.type}
                        onChange={(e) => updateField(section.id, f.id, { type: e.target.value as FieldType, options: e.target.value === 'radio' ? (f.options ?? ['Option 1', 'Option 2']) : undefined })}
                        className="w-40 rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs"
                      >
                        {FIELD_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                      </select>
                      <input
                        value={f.label}
                        onChange={(e) => updateField(section.id, f.id, { label: e.target.value })}
                        placeholder="Question label"
                        className="flex-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-sm"
                      />
                      <label className="flex items-center gap-1.5 whitespace-nowrap text-xs text-gray-500">
                        <input type="checkbox" checked={!!f.required} onChange={(e) => updateField(section.id, f.id, { required: e.target.checked })} />
                        Required
                      </label>
                      <button type="button" onClick={() => removeField(section.id, f.id)} className="rounded p-1 text-gray-400 hover:bg-rose-50 hover:text-rose-600">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {f.type === 'radio' && (
                      <div className="mt-2 space-y-1.5 pl-2">
                        {(f.options ?? []).map((o, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full border border-gray-400" />
                            <input
                              value={o}
                              onChange={(e) => {
                                const options = [...(f.options ?? [])];
                                options[i] = e.target.value;
                                updateField(section.id, f.id, { options });
                              }}
                              className="flex-1 rounded-md border border-gray-200 bg-white px-2 py-1 text-xs"
                            />
                            <button
                              type="button"
                              onClick={() => updateField(section.id, f.id, { options: (f.options ?? []).filter((_, oi) => oi !== i) })}
                              className="text-gray-300 hover:text-rose-500"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() => updateField(section.id, f.id, { options: [...(f.options ?? []), `Option ${(f.options?.length ?? 0) + 1}`] })}
                          className="pl-4 text-xs font-semibold text-violet-600 hover:underline"
                        >
                          + Add option
                        </button>
                      </div>
                    )}
                  </div>
                ))}

                <div className="flex flex-wrap gap-2">
                  {FIELD_TYPES.map((t) => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => addFieldTo(section.id, t.value)}
                      className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:border-violet-300 hover:text-violet-700"
                    >
                      <Plus className="h-3 w-3" /> {t.label}
                    </button>
                  ))}
                </div>

                <div className="rounded-lg border border-gray-100 bg-gray-50/70 p-3">
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <input
                      type="checkbox"
                      checked={!!section.sendMessage?.enabled}
                      onChange={(e) => updateSection(section.id, { sendMessage: { enabled: e.target.checked, body: section.sendMessage?.body } })}
                    />
                    <MessageCircle className="h-4 w-4 text-emerald-600" /> Show a "Send Message" button on this section
                  </label>
                  {section.sendMessage?.enabled && (
                    <input
                      value={section.sendMessage?.body ?? ''}
                      onChange={(e) => updateSection(section.id, { sendMessage: { enabled: true, body: e.target.value } })}
                      placeholder="WhatsApp message to send"
                      className={cn(inputCls, 'mt-2')}
                    />
                  )}
                </div>
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={addSection}
            className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-200 py-3 text-sm font-semibold text-gray-500 hover:border-violet-300 hover:text-violet-700"
          >
            <Plus className="h-4 w-4" /> Add section
          </button>
        </div>

        {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}

        <div className="flex justify-end gap-3 border-t border-gray-100 pt-4">
          <button type="button" onClick={onClose} className="rounded-full px-5 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-100">
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={save.isPending}
            className="rounded-full bg-[#5B21B6] px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-800 disabled:opacity-60"
          >
            {save.isPending ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
