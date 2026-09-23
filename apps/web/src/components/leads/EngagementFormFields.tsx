'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { MessageCircle } from 'lucide-react';
import api from '@/lib/api';
import { cn } from '@/lib/utils';
import type { EngagementForm } from '@/lib/engagementForms';

const inputCls = 'w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-violet-400 focus:ring-4 focus:ring-violet-100';

// Renders a saved Engagement Form's sections/fields and collects the agent's answers.
// `onAnswers` is called on every change so the parent (the disposition form) always has
// the latest values to submit alongside the rest of the outcome.
export function EngagementFormFields({
  form, contactId, answers, onAnswers,
}: {
  form: EngagementForm; contactId?: string; answers: Record<string, string | null>; onAnswers: (a: Record<string, string | null>) => void;
}) {
  const set = (id: string, v: string | null) => onAnswers({ ...answers, [id]: v });

  return (
    <div className="space-y-5">
      {form.schema.sections.map((section) => (
        <div key={section.id} className="overflow-hidden rounded-xl border border-gray-200">
          {section.title && <div className="bg-[#5B21B6] px-4 py-2.5 text-sm font-semibold text-white">{section.title}</div>}
          <div className="space-y-4 p-4">
            {section.description && <p className="text-sm text-gray-600">{section.description}</p>}

            {section.fields.map((f) => (
              <div key={f.id}>
                <label className="mb-1.5 block text-sm text-gray-700">
                  {f.label} {f.required && <span className="text-rose-500">*</span>}
                </label>
                {f.type === 'text' && (
                  <input className={inputCls} value={answers[f.id] ?? ''} onChange={(e) => set(f.id, e.target.value)} placeholder={f.label} />
                )}
                {f.type === 'date' && (
                  <input type="date" className={inputCls} value={answers[f.id] ?? ''} onChange={(e) => set(f.id, e.target.value)} />
                )}
                {f.type === 'radio' && (
                  <div className="space-y-2">
                    {(f.options ?? []).map((o) => (
                      <label key={o} className="flex cursor-pointer items-center gap-2.5 text-sm text-gray-700">
                        <span
                          onClick={() => set(f.id, o)}
                          className={cn('flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border-2', answers[f.id] === o ? 'border-violet-600' : 'border-gray-300')}
                        >
                          {answers[f.id] === o && <span className="h-2.5 w-2.5 rounded-full bg-violet-600" />}
                        </span>
                        <span onClick={() => set(f.id, o)}>{o}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {section.sendMessage?.enabled && <SendMessageButton contactId={contactId} body={section.sendMessage.body} />}
          </div>
        </div>
      ))}
    </div>
  );
}

function SendMessageButton({ contactId, body }: { contactId?: string; body?: string }) {
  const [status, setStatus] = useState<'idle' | 'sent' | 'error'>('idle');
  const send = useMutation({
    mutationFn: () => api.post('/api/v1/messages', { contactId, channel: 'WHATSAPP', body: body?.trim() || 'Thanks for your time!' }),
    onSuccess: () => setStatus('sent'),
    onError: () => setStatus('error'),
  });
  return (
    <div>
      <button
        type="button"
        onClick={() => send.mutate()}
        disabled={!contactId || send.isPending}
        className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-5 py-2 text-xs font-bold uppercase tracking-wide text-white shadow-sm transition hover:bg-emerald-600 disabled:opacity-60"
      >
        <MessageCircle className="h-4 w-4" /> {send.isPending ? 'Sending…' : 'Send Message'}
      </button>
      {status === 'sent' && <p className="mt-2 text-xs font-medium text-emerald-600">Notification sent successfully.</p>}
      {status === 'error' && <p className="mt-2 text-xs font-medium text-rose-600">Could not send the message.</p>}
    </div>
  );
}
