'use client';

import { useEffect, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Phone, Plus, Trash2, Volume2 } from 'lucide-react';
import api from '@/lib/api';
import { Modal } from '@/components/ui/Modal';

const VOICE_PERSONAS = [
  { id: 'helena', name: 'Helena', language: 'English', gender: 'Female' },
  { id: 'luna', name: 'Luna', language: 'English', gender: 'Female' },
  { id: 'orion', name: 'Orion', language: 'English', gender: 'Male' },
  { id: 'arcas', name: 'Arcas', language: 'English', gender: 'Male' },
  { id: 'asteria', name: 'Asteria', language: 'English', gender: 'Female' },
  { id: 'athena', name: 'Athena', language: 'English', gender: 'Female' },
  { id: 'zeus', name: 'Zeus', language: 'English', gender: 'Male' },
  { id: 'charon', name: 'Charon', language: 'English (Indian)', gender: 'Male' },
  { id: 'kore', name: 'Kore', language: 'English (Indian)', gender: 'Female' },
];

const SCRIPT_TEMPLATES: Record<string, { steps: string[]; faqs: { question: string; answer: string }[] }> = {
  'Real Estate': {
    steps: ['Confirm the lead is interested in the property', 'Share key details (location, price, size)', 'Offer a site visit slot', 'Confirm contact details for follow-up'],
    faqs: [{ question: 'Is the price negotiable?', answer: 'Our sales team can discuss pricing during the site visit.' }],
  },
  Education: {
    steps: ['Greet and confirm the program of interest', 'Explain eligibility and admission process', 'Answer fee/scholarship questions', 'Offer to connect with a counselor'],
    faqs: [{ question: 'What is the fee?', answer: 'Fees vary by program — a counselor will share the exact breakdown.' }],
  },
  'SaaS / IT': {
    steps: ['Confirm the use case and team size', 'Walk through key product features', 'Offer a demo slot', 'Confirm best contact time'],
    faqs: [{ question: 'Do you offer a free trial?', answer: 'Yes, a 14-day free trial is available.' }],
  },
  Healthcare: {
    steps: ['Confirm the service the caller is interested in', 'Check appointment availability', 'Share doctor/clinic details', 'Confirm booking details'],
    faqs: [{ question: 'Do you accept insurance?', answer: 'Coverage varies by provider — our staff will confirm during booking.' }],
  },
};

const wizardSchema = z.object({
  name: z.string().min(1, 'Required'),
  category: z.string().min(1, 'Required'),
  description: z.string().optional(),
  callDirection: z.enum(['OUTBOUND', 'INBOUND']),
  language: z.string().min(1, 'Required'),
  voiceId: z.string().optional(),

  greeting: z.string().min(1, 'Required'),

  systemPrompt: z.string().min(1, 'Required'),
  scriptSteps: z.array(z.object({ text: z.string() })),
  knowledgeBase: z.array(z.object({ topic: z.string(), content: z.string() })),
  pricingResponse: z.string().optional(),
  notInterestedResponse: z.string().optional(),
  escalationRules: z.string().optional(),
  forbiddenTopics: z.string().optional(),
  behavioralRules: z.string().optional(),
  faqs: z.array(z.object({ question: z.string(), answer: z.string() })),

  closingMessage: z.string().optional(),
  maxCallDurationSec: z.coerce.number().int().min(30).max(3600),
  dailyCallLimit: z.coerce.number().int().min(1).max(10000),
  customHangupEnabled: z.boolean(),
  customHangupLogic: z.string().optional(),
});

type WizardForm = z.infer<typeof wizardSchema>;

const TABS = [
  { key: 'basics', label: 'Basics & Voice', next: 'Next: Greeting' },
  { key: 'greeting', label: 'Greeting', next: 'Next: System Prompt' },
  { key: 'prompt', label: 'System Prompt & Rules', next: 'Next: Closing' },
  { key: 'closing', label: 'Closing & Hangup', next: null },
] as const;

type TabKey = typeof TABS[number]['key'];

const defaultsFor = (agent?: any): WizardForm => ({
  name: agent?.name || '',
  category: agent?.category || 'General',
  description: agent?.description || '',
  callDirection: agent?.callDirection || 'OUTBOUND',
  language: agent?.language || 'English',
  voiceId: agent?.voiceId || '',
  greeting: agent?.greeting || '',
  systemPrompt: agent?.systemPrompt || '',
  scriptSteps: (agent?.scriptSteps || []).map((text: string) => ({ text })),
  knowledgeBase: agent?.knowledgeBase || [],
  pricingResponse: agent?.pricingResponse || '',
  notInterestedResponse: agent?.notInterestedResponse || '',
  escalationRules: agent?.escalationRules || '',
  forbiddenTopics: agent?.forbiddenTopics || '',
  behavioralRules: agent?.behavioralRules || '',
  faqs: agent?.faqs || [],
  closingMessage: agent?.closingMessage || '',
  maxCallDurationSec: agent?.maxCallDurationSec ?? 300,
  dailyCallLimit: agent?.dailyCallLimit ?? 100,
  customHangupEnabled: !!agent?.customHangupLogic,
  customHangupLogic: agent?.customHangupLogic || '',
});

const inputClass = 'mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none';
const labelClass = 'block text-sm font-medium text-gray-700';

function PlaygroundPanel({ agentId, agentName, status }: { agentId?: string; agentName: string; status: string }) {
  const [phone, setPhone] = useState('');
  const [customerName, setCustomerName] = useState('');

  const call = useMutation({
    mutationFn: () => api.post(`/api/v1/ai-calling/agents/${agentId}/call`, { toNumber: phone }),
    onSuccess: () => setPhone(''),
  });

  return (
    <div className="w-full shrink-0 space-y-4 lg:w-72">
      <div className="rounded-xl bg-[#0b1220] p-5 text-white">
        <div className="flex items-center justify-between text-[11px] uppercase tracking-wide text-gray-400">
          <span>Playground</span>
          <span className="flex items-center gap-1">
            <span className={`h-1.5 w-1.5 rounded-full ${agentId ? 'bg-green-400' : 'bg-gray-500'}`} />
            {agentId ? 'Live' : 'Draft'}
          </span>
        </div>
        <div className="mt-4 flex flex-col items-center text-center">
          <p className="text-sm font-semibold">{agentName || 'AI Agent'}</p>
          <p className="text-xs text-gray-400">Test your AI agent</p>
          <div className="mt-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-500">
            <Phone className="h-5 w-5" />
          </div>
          <p className="mt-3 text-[11px] text-gray-500">Browser mic test coming soon</p>
        </div>
      </div>

      <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-gray-900">Test Voice Call</p>
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500">Telephony</span>
        </div>
        <p className="mt-1 text-xs text-gray-500">Call a phone number to test the voice agent</p>

        <label className="mt-3 block text-[11px] font-semibold uppercase tracking-wide text-gray-500">Phone Number</label>
        <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+919876543210" className={inputClass} />

        <label className="mt-3 block text-[11px] font-semibold uppercase tracking-wide text-gray-500">Customer Name</label>
        <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Rahul" className={inputClass} />

        <button
          onClick={() => call.mutate()}
          disabled={!agentId || !phone || call.isPending}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Phone className="h-4 w-4" /> {call.isPending ? 'Calling...' : 'Make outbound call'}
        </button>
        {!agentId && <p className="mt-2 text-center text-xs text-amber-600">Save agent first to enable test calls</p>}
        {call.isError && <p className="mt-2 text-center text-xs text-red-500">Failed to start call.</p>}
      </div>
    </div>
  );
}

export function AgentWizard({ open, onClose, agent }: { open: boolean; onClose: () => void; agent?: any }) {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabKey>('basics');
  const [savedAgent, setSavedAgent] = useState<any>(agent || null);

  const { register, handleSubmit, control, watch, setValue, trigger, reset, formState: { errors } } = useForm<WizardForm>({
    resolver: zodResolver(wizardSchema),
    defaultValues: defaultsFor(agent),
  });

  useEffect(() => {
    if (open) {
      setSavedAgent(agent || null);
      setActiveTab('basics');
      reset(defaultsFor(agent));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, agent]);

  const scriptSteps = useFieldArray({ control, name: 'scriptSteps' });
  const knowledgeBase = useFieldArray({ control, name: 'knowledgeBase' });
  const faqs = useFieldArray({ control, name: 'faqs' });

  const selectedVoiceId = watch('voiceId');
  const customHangupEnabled = watch('customHangupEnabled');
  const callDirection = watch('callDirection');
  const currentName = watch('name');

  const toPayload = (data: WizardForm) => ({
    name: data.name,
    category: data.category,
    description: data.description || undefined,
    callDirection: data.callDirection,
    language: data.language,
    voiceId: data.voiceId || undefined,
    greeting: data.greeting,
    systemPrompt: data.systemPrompt,
    scriptSteps: data.scriptSteps.map((s) => s.text).filter(Boolean),
    knowledgeBase: data.knowledgeBase.filter((k) => k.topic || k.content),
    pricingResponse: data.pricingResponse || undefined,
    notInterestedResponse: data.notInterestedResponse || undefined,
    escalationRules: data.escalationRules || undefined,
    forbiddenTopics: data.forbiddenTopics || undefined,
    behavioralRules: data.behavioralRules || undefined,
    faqs: data.faqs.filter((f) => f.question || f.answer),
    closingMessage: data.closingMessage || undefined,
    maxCallDurationSec: data.maxCallDurationSec,
    dailyCallLimit: data.dailyCallLimit,
    customHangupLogic: data.customHangupEnabled ? data.customHangupLogic || undefined : undefined,
  });

  const save = useMutation({
    mutationFn: (data: WizardForm) => {
      const payload = toPayload(data);
      return savedAgent
        ? api.patch(`/api/v1/ai-calling/agents/${savedAgent.id}`, payload)
        : api.post('/api/v1/ai-calling/agents', payload);
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['ai-agents'] });
      setSavedAgent(res.data.data);
    },
  });

  const applyTemplate = (templateName: string) => {
    const tpl = SCRIPT_TEMPLATES[templateName];
    if (!tpl) return;
    setValue('scriptSteps', tpl.steps.map((text) => ({ text })));
    setValue('faqs', tpl.faqs);
  };

  const previewVoice = (name: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    const utterance = new SpeechSynthesisUtterance(`Hi, this is ${name}. I'll be handling your calls today.`);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };

  const activeIndex = TABS.findIndex((t) => t.key === activeTab);

  const goNext = async () => {
    let valid = true;
    if (activeTab === 'basics') valid = await trigger(['name', 'category', 'language']);
    if (activeTab === 'greeting') valid = await trigger(['greeting']);
    if (activeTab === 'prompt') valid = await trigger(['systemPrompt']);
    if (valid && activeIndex < TABS.length - 1) setActiveTab(TABS[activeIndex + 1].key);
  };

  const goPrev = () => {
    if (activeIndex > 0) setActiveTab(TABS[activeIndex - 1].key);
  };

  const onSubmit = handleSubmit((data) => save.mutate(data));

  const handleClose = () => { reset(); onClose(); };

  return (
    <Modal open={open} onClose={handleClose} title={savedAgent ? 'Edit Agent' : 'Create AI Agent'} size="xl">
      <form onSubmit={onSubmit} className="flex flex-col gap-5 lg:flex-row">
        <div className="min-w-0 flex-1">
          <div className="flex gap-1 overflow-x-auto border-b border-gray-100 pb-px">
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setActiveTab(t.key)}
                className={`whitespace-nowrap border-b-2 px-3 pb-2 text-sm font-medium ${
                  activeTab === t.key ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="mt-4 space-y-4">
            {activeTab === 'basics' && (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className={labelClass}>Agent Name *</label>
                    <input {...register('name')} placeholder="e.g. Srushti — JSPM Counselor" className={inputClass} />
                    {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>}
                  </div>
                  <div>
                    <label className={labelClass}>Industry</label>
                    <select {...register('category')} className={inputClass}>
                      {['General', 'Education', 'Real Estate', 'SaaS / IT', 'Healthcare', 'Sales', 'Support'].map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Agent Description</label>
                  <textarea {...register('description')} rows={2} maxLength={200} placeholder="Brief description of what this agent does..." className={inputClass} />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className={labelClass}>Call Direction</label>
                    <div className="mt-1 flex overflow-hidden rounded-lg border border-gray-300">
                      <button
                        type="button"
                        onClick={() => setValue('callDirection', 'OUTBOUND')}
                        className={`flex-1 py-2 text-sm font-semibold ${callDirection === 'OUTBOUND' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600'}`}
                      >
                        Outbound
                      </button>
                      <button
                        type="button"
                        disabled
                        title="Inbound calling is coming soon"
                        className="flex-1 cursor-not-allowed bg-gray-50 py-2 text-sm font-medium text-gray-400"
                      >
                        Inbound
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>Language *</label>
                    <input {...register('language')} className={inputClass} />
                    {errors.language && <p className="mt-1 text-xs text-red-500">{errors.language.message}</p>}
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Voice Model Persona</label>
                  <div className="mt-2 grid max-h-72 grid-cols-1 gap-2 overflow-y-auto pr-1 sm:grid-cols-3">
                    {VOICE_PERSONAS.map((v) => (
                      <button
                        type="button"
                        key={v.id}
                        onClick={() => setValue('voiceId', v.id)}
                        className={`rounded-lg border p-3 text-left text-sm transition ${
                          selectedVoiceId === v.id ? 'border-indigo-500 ring-1 ring-indigo-500' : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <p className="font-medium text-gray-900">{v.name}</p>
                        <p className="text-xs text-gray-500">{v.language}, {v.gender}</p>
                        <div className="mt-1.5 flex items-center gap-2">
                          <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${v.gender === 'Female' ? 'bg-pink-50 text-pink-600' : 'bg-blue-50 text-blue-600'}`}>{v.gender}</span>
                          <span
                            role="button"
                            onClick={(e) => { e.stopPropagation(); previewVoice(v.name); }}
                            className="flex items-center gap-1 text-[11px] text-indigo-600 hover:underline"
                          >
                            <Volume2 className="h-3 w-3" /> Preview
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {activeTab === 'greeting' && (
              <div>
                <label className={labelClass}>Greeting Welcome Line</label>
                <p className="mt-0.5 text-xs text-gray-500">The exact sentence spoken by the AI voice agent as soon as the call connects.</p>
                <textarea
                  {...register('greeting')}
                  rows={6}
                  placeholder="e.g. Hi {name}, I am calling from JSPM University regarding B.Tech admissions. Is this a good time?"
                  className={`${inputClass} mt-2`}
                />
                {errors.greeting && <p className="mt-1 text-xs text-red-500">{errors.greeting.message}</p>}
              </div>
            )}

            {activeTab === 'prompt' && (
              <div className="space-y-5">
                <div>
                  <label className={labelClass}>Core Instructions *</label>
                  <textarea {...register('systemPrompt')} rows={4} placeholder="Describe how the agent should behave, what it should ask, and how it should handle objections..." className={inputClass} />
                  {errors.systemPrompt && <p className="mt-1 text-xs text-red-500">{errors.systemPrompt.message}</p>}
                </div>

                <div>
                  <p className={labelClass}>Script Template</p>
                  <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {Object.entries(SCRIPT_TEMPLATES).map(([name, tpl]) => (
                      <button type="button" key={name} onClick={() => applyTemplate(name)} className="rounded-lg border border-gray-200 p-2 text-left text-xs hover:border-indigo-300 hover:bg-indigo-50/50">
                        <p className="font-medium text-gray-800">{name}</p>
                        <p className="text-gray-400">{tpl.steps.length} steps</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <p className={labelClass}>Script Steps</p>
                    <button type="button" onClick={() => scriptSteps.append({ text: '' })} className="flex items-center gap-1 text-xs font-medium text-indigo-600 hover:underline"><Plus className="h-3 w-3" /> Add step</button>
                  </div>
                  <div className="mt-2 space-y-2">
                    {scriptSteps.fields.map((f, i) => (
                      <div key={f.id} className="flex gap-2">
                        <input {...register(`scriptSteps.${i}.text` as const)} placeholder={`Step ${i + 1}`} className={inputClass} />
                        <button type="button" onClick={() => scriptSteps.remove(i)} className="shrink-0 rounded-lg p-2 text-gray-400 hover:bg-gray-50 hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <p className={labelClass}>Knowledge Base & Business Details</p>
                    <button type="button" onClick={() => knowledgeBase.append({ topic: '', content: '' })} className="flex items-center gap-1 text-xs font-medium text-indigo-600 hover:underline"><Plus className="h-3 w-3" /> Add topic</button>
                  </div>
                  <div className="mt-2 space-y-2">
                    {knowledgeBase.fields.map((f, i) => (
                      <div key={f.id} className="flex gap-2">
                        <input {...register(`knowledgeBase.${i}.topic` as const)} placeholder="Topic" className={`${inputClass} w-1/3`} />
                        <input {...register(`knowledgeBase.${i}.content` as const)} placeholder="Details" className={inputClass} />
                        <button type="button" onClick={() => knowledgeBase.remove(i)} className="shrink-0 rounded-lg p-2 text-gray-400 hover:bg-gray-50 hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className={labelClass}>If asked about pricing</label>
                    <textarea {...register('pricingResponse')} rows={2} placeholder="Response when asked about fees..." className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>If not interested</label>
                    <textarea {...register('notInterestedResponse')} rows={2} placeholder="Polite exit response..." className={inputClass} />
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Escalation Rules</label>
                  <textarea {...register('escalationRules')} rows={2} placeholder="When to transfer to a human — e.g. if customer wants counselor, scholarship details..." className={inputClass} />
                </div>

                <div>
                  <label className={labelClass}>Forbidden Topics</label>
                  <textarea {...register('forbiddenTopics')} rows={2} placeholder="Don't discuss competitor fees, don't make placement guarantees..." className={inputClass} />
                </div>

                <div>
                  <label className={labelClass}>Strict Behavioral Rules</label>
                  <textarea {...register('behavioralRules')} rows={2} placeholder="Always confirm name first. Never ask two questions. Keep under 25 words..." className={inputClass} />
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <p className={labelClass}>Frequently Asked Questions</p>
                    <button type="button" onClick={() => faqs.append({ question: '', answer: '' })} className="flex items-center gap-1 text-xs font-medium text-indigo-600 hover:underline"><Plus className="h-3 w-3" /> Add FAQ</button>
                  </div>
                  <div className="mt-2 space-y-2">
                    {faqs.fields.map((f, i) => (
                      <div key={f.id} className="flex gap-2">
                        <input {...register(`faqs.${i}.question` as const)} placeholder="Q: What is the fee?" className={inputClass} />
                        <input {...register(`faqs.${i}.answer` as const)} placeholder="A: ..." className={inputClass} />
                        <button type="button" onClick={() => faqs.remove(i)} className="shrink-0 rounded-lg p-2 text-gray-400 hover:bg-gray-50 hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'closing' && (
              <div className="space-y-4">
                <div>
                  <label className={labelClass}>Closing Message</label>
                  <p className="mt-0.5 text-xs text-gray-500">The farewell message spoken when the call ends.</p>
                  <textarea {...register('closingMessage')} rows={3} placeholder="Thank you {name} for your time! Our counselor will connect with you shortly." className={`${inputClass} mt-2`} />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className={labelClass}>Max Call Duration (sec)</label>
                    <input type="number" {...register('maxCallDurationSec')} className={inputClass} />
                    {errors.maxCallDurationSec && <p className="mt-1 text-xs text-red-500">{errors.maxCallDurationSec.message}</p>}
                  </div>
                  <div>
                    <label className={labelClass}>Daily Limit</label>
                    <input type="number" {...register('dailyCallLimit')} className={inputClass} />
                    {errors.dailyCallLimit && <p className="mt-1 text-xs text-red-500">{errors.dailyCallLimit.message}</p>}
                  </div>
                </div>

                <label className="flex items-start gap-2">
                  <input type="checkbox" {...register('customHangupEnabled')} className="mt-1" />
                  <span>
                    <span className="block text-sm font-medium text-gray-700">Custom Hangup Logic</span>
                    <span className="block text-xs text-gray-500">Enable custom conditions for when the AI should end the call</span>
                  </span>
                </label>
                {customHangupEnabled && (
                  <textarea {...register('customHangupLogic')} rows={2} placeholder="e.g. Hang up if the customer says 'not interested' twice..." className={inputClass} />
                )}
              </div>
            )}
          </div>

          {save.isError && <p className="mt-4 text-sm text-red-500">Failed to save agent. Check your Vapi configuration.</p>}

          <div className="mt-6 flex items-center justify-between border-t border-gray-100 pt-4">
            {activeIndex > 0 ? (
              <button type="button" onClick={goPrev} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Previous</button>
            ) : <span />}

            {activeIndex < TABS.length - 1 ? (
              <button type="button" onClick={goNext} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500">{TABS[activeIndex].next}</button>
            ) : (
              <div className="flex gap-3">
                <button type="button" onClick={handleClose} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={save.isPending} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50">
                  {save.isPending ? 'Saving...' : savedAgent ? 'Save Changes' : 'Create Agent'}
                </button>
              </div>
            )}
          </div>
        </div>

        <PlaygroundPanel agentId={savedAgent?.id} agentName={currentName} status={savedAgent?.status || 'DRAFT'} />
      </form>
    </Modal>
  );
}
