'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import React, { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Modal } from '@/components/ui/Modal';
import { Copy, Check, CheckCircle2, Plug, Facebook, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface IntegrationDef {
  type: string;
  label: string;
  category: string;
  description: string;
  color: string;
  domain: string;
  fields: { key: string; label: string; placeholder: string; secret?: boolean }[];
  webhookBased: boolean;
  webhookInstructions?: (webhookUrl: string) => React.ReactNode;
  comingSoon?: boolean;
  // True for providers connected via a one-click OAuth flow instead of the
  // generic "paste your credentials" modal below — see FacebookConnect.
  oauthBased?: boolean;
}

const INTEGRATIONS: IntegrationDef[] = [
  {
    type: 'INDIAMART',
    label: 'IndiaMART',
    category: 'B2B Marketplace',
    description: 'Auto-capture leads from IndiaMART buyer enquiries into your CRM.',
    color: '#FF6B00',
    domain: 'indiamart.com',
    fields: [],
    webhookBased: true,
  },
  {
    type: 'JUSTDIAL',
    label: 'JustDial',
    category: 'Local Directory',
    description: 'Pull JustDial leads directly into contacts the moment they enquire.',
    color: '#FF5A00',
    domain: 'justdial.com',
    fields: [],
    webhookBased: true,
  },
  {
    type: 'TRADEINDIA',
    label: 'TradeIndia',
    category: 'B2B Marketplace',
    description: 'Capture buyer leads from TradeIndia listings automatically.',
    color: '#003087',
    domain: 'tradeindia.com',
    fields: [],
    webhookBased: true,
  },
  {
    type: 'SULEKHA',
    label: 'Sulekha',
    category: 'Lead Generation',
    description: 'Convert Sulekha service enquiries into CRM contacts instantly.',
    color: '#E63946',
    domain: 'sulekha.com',
    fields: [],
    webhookBased: true,
  },
  {
    type: 'ACRES_99',
    label: '99acres',
    category: 'Real Estate',
    description: 'Receive property buyer leads from 99acres directly into the CRM.',
    color: '#C0392B',
    domain: '99acres.com',
    fields: [],
    webhookBased: true,
  },
  {
    type: 'MAGICBRICKS',
    label: 'MagicBricks',
    category: 'Real Estate',
    description: 'Sync MagicBricks property enquiries as contacts automatically.',
    color: '#E74C3C',
    domain: 'magicbricks.com',
    fields: [],
    webhookBased: true,
  },
  {
    type: 'HOUSING',
    label: 'Housing.com',
    category: 'Real Estate',
    description: 'Capture Housing.com property leads into your sales pipeline.',
    color: '#2ECC71',
    domain: 'housing.com',
    fields: [],
    webhookBased: true,
  },
  {
    type: 'GOOGLE_ADS',
    label: 'Google Ads',
    category: 'Advertising',
    description: 'Collect leads from Google Ads Lead Form Extensions automatically.',
    color: '#4285F4',
    domain: 'google.com',
    fields: [],
    webhookBased: true,
  },
  {
    type: 'GOOGLE_FORMS',
    label: 'Google Forms',
    category: 'Lead Generation',
    description: 'Capture Google Form submissions as CRM contacts via Apps Script.',
    color: '#673AB7',
    domain: 'forms.google.com',
    fields: [
      { key: 'webhookSecret', label: 'Webhook Secret', placeholder: 'Any secret string (optional but recommended)', secret: true },
    ],
    webhookBased: true,
    webhookInstructions: (webhookUrl: string) => {
      const script = `var WEBHOOK_URL = '${webhookUrl}';
var WEBHOOK_SECRET = 'YOUR_SECRET_HERE'; // same as above

function onFormSubmit(e) {
  var responses = e.response.getItemResponses().map(function(item) {
    return {
      question: item.getItem().getTitle(),
      answer: String(item.getResponse())
    };
  });
  UrlFetchApp.fetch(WEBHOOK_URL, {
    method: 'post',
    contentType: 'application/json',
    headers: { 'X-Webhook-Secret': WEBHOOK_SECRET },
    payload: JSON.stringify({ responses: responses }),
    muteHttpExceptions: true
  });
}`;
      return (
        <div className="space-y-3 rounded-xl border border-amber-100 bg-amber-50 p-4">
          <p className="text-xs font-semibold text-amber-800">How to connect your Google Form</p>
          <ol className="space-y-2 text-xs text-amber-700">
            <li className="flex gap-2"><span className="font-bold shrink-0">1.</span><span>Open your Google Form → click the <strong>⋮ menu</strong> (top right) → <strong>Script editor</strong></span></li>
            <li className="flex gap-2"><span className="font-bold shrink-0">2.</span><span>Delete any existing code and paste the script below</span></li>
            <li className="flex gap-2"><span className="font-bold shrink-0">3.</span><span>Replace <code className="rounded bg-amber-100 px-1">YOUR_SECRET_HERE</code> with the Webhook Secret you set above</span></li>
            <li className="flex gap-2"><span className="font-bold shrink-0">4.</span><span>Click <strong>Save</strong>, then <strong>Triggers</strong> (clock icon) → <strong>Add Trigger</strong> → Function: <code className="rounded bg-amber-100 px-1">onFormSubmit</code>, Event: <strong>On form submit</strong></span></li>
            <li className="flex gap-2"><span className="font-bold shrink-0">5.</span><span>Authorize when prompted — submit a test entry and check your Contacts</span></li>
          </ol>
          <div className="relative">
            <pre className="overflow-x-auto rounded-lg bg-gray-900 p-3 text-[11px] leading-relaxed text-green-300">{script}</pre>
            <div className="absolute right-2 top-2">
              <CopyButton text={script} />
            </div>
          </div>
          <p className="text-[11px] text-amber-600">
            <strong>Field mapping:</strong> Question titles in your form are matched automatically — name the questions <em>Name, Phone, Email, Company, Message</em> for best results.
          </p>
        </div>
      );
    },
  },
  {
    type: 'FACEBOOK_LEADS',
    label: 'Facebook Lead Ads',
    category: 'Advertising',
    description: 'Capture Facebook & Instagram Lead Ad form submissions instantly — one click, no Meta developer setup required.',
    color: '#1877F2',
    domain: 'facebook.com',
    fields: [],
    webhookBased: false,
    oauthBased: true,
  },
  {
    type: 'GOOGLE_SHEETS',
    label: 'Google Sheets',
    category: 'Lead Generation',
    description: 'Auto-imports new rows as leads from a shared Google Sheet every 5 minutes.',
    color: '#0F9D58',
    domain: 'sheets.google.com',
    fields: [
      { key: 'sheetUrl', label: 'Google Sheet URL', placeholder: 'https://docs.google.com/spreadsheets/d/…' },
      { key: 'sheetName', label: 'Sheet / Tab Name (optional)', placeholder: 'Sheet1' },
    ],
    webhookBased: false,
    webhookInstructions: () => (
      <div className="space-y-2 rounded-xl border border-emerald-100 bg-emerald-50 p-4">
        <p className="text-xs font-semibold text-emerald-800">How to connect a Google Sheet</p>
        <ol className="space-y-2 text-xs text-emerald-700">
          <li className="flex gap-2"><span className="font-bold shrink-0">1.</span><span>Open your sheet → <strong>Share</strong> → set access to <strong>Anyone with the link can view</strong></span></li>
          <li className="flex gap-2"><span className="font-bold shrink-0">2.</span><span>Paste the sheet URL above. Include the tab name if leads aren&apos;t on the first tab.</span></li>
          <li className="flex gap-2"><span className="font-bold shrink-0">3.</span><span>Use column headers <em>Name, Phone, Email, Company</em> — new rows are imported as leads automatically every 5 minutes.</span></li>
        </ol>
      </div>
    ),
  },
  {
    type: 'CUSTOM',
    label: 'Custom Integration',
    category: 'Lead Generation',
    description: 'A generic webhook endpoint for landing pages, other CRMs, or custom apps.',
    color: '#334155',
    domain: 'example.com',
    fields: [],
    webhookBased: true,
    webhookInstructions: (webhookUrl: string) => (
      <div className="space-y-2 rounded-xl border border-gray-200 bg-gray-50 p-4">
        <p className="text-xs font-semibold text-gray-700">Payload format</p>
        <p className="text-xs text-gray-500">POST JSON to the webhook URL above. Common field names are matched automatically:</p>
        <pre className="overflow-x-auto rounded-lg bg-gray-900 p-3 text-[11px] leading-relaxed text-green-300">{`{
  "name": "Jane Doe",
  "phone": "+919876500000",
  "email": "jane@example.com",
  "company": "Acme Inc",
  "source": "Landing Page",
  "message": "Interested in demo"
}`}</pre>
      </div>
    ),
  },
  {
    type: 'ZAPIER',
    label: 'Zapier',
    category: 'Automation',
    description: 'Connect to 5,000+ apps through Zapier. Coming soon.',
    color: '#FF4A00',
    domain: 'zapier.com',
    fields: [],
    webhookBased: false,
    comingSoon: true,
  },
  {
    type: 'EXOTEL',
    label: 'Exotel',
    category: 'Calling',
    description: 'Connect Exotel for Indian virtual number calling and IVR.',
    color: '#7C3AED',
    domain: 'exotel.com',
    fields: [
      { key: 'apiKey', label: 'API Key', placeholder: 'Your Exotel API Key', secret: true },
      { key: 'apiToken', label: 'API Token', placeholder: 'Your Exotel API Token', secret: true },
      { key: 'subdomain', label: 'Subdomain', placeholder: 'mycompany.exotel.in' },
    ],
    webhookBased: false,
  },
];

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={copy}
      className="ml-2 shrink-0 rounded-md p-1 text-gray-400 transition hover:bg-gray-100 hover:text-indigo-600"
    >
      {copied ? (
        <Check className="h-3.5 w-3.5 text-emerald-500" />
      ) : (
        <Copy className="h-3.5 w-3.5" />
      )}
    </button>
  );
}

function IntegrationLogo({
  domain,
  label,
  color,
}: {
  domain: string;
  label: string;
  color: string;
}) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white text-xs font-bold"
        style={{ backgroundColor: color }}
      >
        {label.slice(0, 2).toUpperCase()}
      </div>
    );
  }
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white p-1.5 ring-1 ring-gray-100 shadow-sm">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`https://www.google.com/s2/favicons?domain=${domain}&sz=128`}
        alt={label}
        className="h-full w-full object-contain"
        onError={() => setFailed(true)}
      />
    </div>
  );
}

const inputCls =
  'mt-1 block w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm transition placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20';

export default function IntegrationsPage() {
  return (
    <Suspense fallback={null}>
      <IntegrationsPageInner />
    </Suspense>
  );
}

function IntegrationsPageInner() {
  const qc = useQueryClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [active, setActive] = useState<IntegrationDef | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});

  const [fbPending, setFbPending] = useState<{ selectionId: string; pages: { id: string; name: string }[] } | null>(null);
  const [fbError, setFbError] = useState<string | null>(null);
  const fbErrorRef = useRef<HTMLDivElement>(null);

  // The page-level banner below can render off-screen if you're scrolled down
  // to the Facebook card (it lives further down the page) — bring it into
  // view instead of relying on the reader to notice it appeared up top.
  useEffect(() => {
    if (fbError) fbErrorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [fbError]);

  const { data: integrations = [] } = useQuery({
    queryKey: ['integrations'],
    queryFn: async () => {
      const { data } = await api.get('/api/v1/integrations');
      return data.data as any[];
    },
  });

  const statusMap = Object.fromEntries((integrations).map((i: any) => [i.type, i]));

  // After the Facebook OAuth redirect lands back here, fetch the tenant's
  // Page list (fbConnect=<opaque selectionId>, tokens never touch the browser)
  // or surface a friendly error (fbError=<reason>), then clean the URL.
  useEffect(() => {
    const fbConnect = searchParams.get('fbConnect');
    const err = searchParams.get('fbError');

    if (fbConnect) {
      api.get(`/api/v1/integrations/facebook/pending/${fbConnect}`)
        .then(({ data }) => setFbPending({ selectionId: fbConnect, pages: data.data.pages }))
        .catch(() => setFbError('This connection has expired — please try connecting again.'));
      router.replace('/dashboard/integrations');
    } else if (err) {
      setFbError(err);
      router.replace('/dashboard/integrations');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const extractErrorMessage = (err: unknown, fallback: string): string =>
    (err as any)?.response?.data?.error?.message ?? (err as any)?.message ?? fallback;

  const connectFacebook = useMutation({
    mutationFn: async () => {
      const { data } = await api.get('/api/v1/integrations/facebook/connect');
      return data.data.authUrl as string;
    },
    onSuccess: (authUrl) => { window.location.href = authUrl; },
    onError: (err) => setFbError(extractErrorMessage(err, 'Could not start the Facebook connection. Please try again.')),
  });

  const selectFacebookPage = useMutation({
    mutationFn: (pageId: string) =>
      api.post('/api/v1/integrations/facebook/select-page', { selectionId: fbPending!.selectionId, pageId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['integrations'] });
      setFbPending(null);
    },
    onError: (err) => {
      setFbPending(null);
      setFbError(extractErrorMessage(err, 'Could not connect that Page. Please try again.'));
    },
  });

  const disconnectFacebook = useMutation({
    mutationFn: () => api.post('/api/v1/integrations/facebook/disconnect'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['integrations'] }),
    onError: (err) => setFbError(extractErrorMessage(err, 'Could not disconnect Facebook. Please try again.')),
  });

  const save = useMutation({
    mutationFn: () => api.post(`/api/v1/integrations/${active!.type}`, form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['integrations'] });
      setActive(null);
      setForm({});
    },
  });

  const saveError: string | null = save.isError
    ? extractErrorMessage(save.error, 'Failed to save. Please try again.')
    : null;

  const disconnect = useMutation({
    mutationFn: (type: string) => api.delete(`/api/v1/integrations/${type}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['integrations'] }),
  });

  const openConfigure = (def: IntegrationDef) => {
    save.reset();
    setActive(def);
    setForm({});
  };

  const webhookUrl = active ? statusMap[active.type]?.webhookUrl : null;

  const grouped = INTEGRATIONS.reduce<Record<string, IntegrationDef[]>>((acc, i) => {
    if (!acc[i.category]) acc[i.category] = [];
    acc[i.category].push(i);
    return acc;
  }, {});

  const connectedCount = integrations.filter((i: any) => i.isActive).length;

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      {fbError && (
        <div ref={fbErrorRef} className="flex items-start justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <p className="text-sm text-amber-800">{fbError}</p>
          </div>
          <button onClick={() => setFbError(null)} className="text-xs font-semibold text-amber-700 hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Summary */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-400">
          {connectedCount} of {INTEGRATIONS.length} connected
        </p>
        {connectedCount > 0 && (
          <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-100">
            <CheckCircle2 className="h-3.5 w-3.5" />
            {connectedCount} active
          </span>
        )}
      </div>

      {/* Grouped integration cards */}
      {Object.entries(grouped).map(([category, items]) => (
        <div key={category}>
          <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.09em] text-gray-400">
            {category}
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((def) => {
              const status = statusMap[def.type];
              const connected = status?.isActive;
              return (
                <div
                  key={def.type}
                  className={cn(
                    'flex flex-col justify-between rounded-xl border bg-white p-5 shadow-sm transition',
                    def.comingSoon ? 'border-gray-100 opacity-60' : connected ? 'border-emerald-100' : 'border-gray-100',
                  )}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <IntegrationLogo domain={def.domain} label={def.label} color={def.color} />
                      {def.comingSoon ? (
                        <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700 ring-1 ring-amber-100">
                          Coming Soon
                        </span>
                      ) : connected ? (
                        <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-100">
                          <CheckCircle2 className="h-3 w-3" />
                          Connected
                        </span>
                      ) : (
                        <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-[11px] font-medium text-gray-400">
                          Not connected
                        </span>
                      )}
                    </div>
                    <div className="mt-3">
                      <p className="text-[13.5px] font-semibold text-gray-900">{def.label}</p>
                      <p className="mt-1.5 text-xs leading-relaxed text-gray-400">
                        {def.description}
                      </p>
                    </div>
                  </div>

                  {def.oauthBased ? (
                    <>
                      {connected && status?.config?.pageName && (
                        <p className="mt-3 text-[11px] text-gray-400">
                          Connected as <span className="font-medium text-gray-600">{status.config.pageName}</span>
                          {status.config.tokenStatus === 'invalid' && (
                            <span className="ml-1.5 inline-flex items-center gap-1 font-semibold text-amber-600">
                              <AlertTriangle className="h-3 w-3" /> needs reconnect
                            </span>
                          )}
                        </p>
                      )}
                      <div className="mt-4 flex gap-2">
                        <button
                          onClick={() => connectFacebook.mutate()}
                          disabled={connectFacebook.isPending}
                          className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-[#1877F2] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#1467d6] disabled:opacity-50"
                        >
                          <Facebook className="h-3.5 w-3.5" />
                          {connectFacebook.isPending ? 'Redirecting…' : connected ? 'Reconnect' : 'Connect with Facebook'}
                        </button>
                        {connected && (
                          <button
                            onClick={() => disconnectFacebook.mutate()}
                            disabled={disconnectFacebook.isPending}
                            className="rounded-lg border border-red-100 px-3 py-1.5 text-xs font-semibold text-red-500 transition hover:bg-red-50 disabled:opacity-50"
                          >
                            Disconnect
                          </button>
                        )}
                      </div>
                      {/* Shown right here, not just in the page-level banner —
                          this card can be scrolled well below the fold. */}
                      {(connectFacebook.isError || disconnectFacebook.isError) && (
                        <p className="mt-2 flex items-start gap-1.5 text-[11px] text-red-600">
                          <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                          {extractErrorMessage(
                            connectFacebook.error ?? disconnectFacebook.error,
                            'Something went wrong. Please try again.',
                          )}
                        </p>
                      )}
                    </>
                  ) : (
                    <div className="mt-4 flex gap-2">
                      <button
                        onClick={() => openConfigure(def)}
                        disabled={def.comingSoon}
                        className="flex-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-white"
                      >
                        {connected ? 'Reconfigure' : 'Configure'}
                      </button>
                      {connected && (
                        <button
                          onClick={() => disconnect.mutate(def.type)}
                          disabled={disconnect.isPending}
                          className="rounded-lg border border-red-100 px-3 py-1.5 text-xs font-semibold text-red-500 transition hover:bg-red-50 disabled:opacity-50"
                        >
                          Disconnect
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Configure modal */}
      <Modal
        open={!!active}
        size={active?.webhookInstructions ? 'lg' : 'md'}
        onClose={() => {
          setActive(null);
          setForm({});
        }}
        title={
          active ? (
            <div className="flex items-center gap-3">
              <IntegrationLogo domain={active.domain} label={active.label} color={active.color} />
              <div>
                <p className="text-[15px] font-semibold text-gray-900">{active.label}</p>
                <p className="text-xs text-gray-400">{active.category}</p>
              </div>
            </div>
          ) : (
            ''
          )
        }
      >
        {active && (
          <div className="space-y-5">
            {/* Webhook URL */}
            {active.webhookBased && webhookUrl && (
              <div className="rounded-xl bg-indigo-50 p-4 ring-1 ring-indigo-100">
                <p className="text-xs font-semibold text-indigo-700">Webhook URL</p>
                {!active.webhookInstructions && (
                  <p className="mt-0.5 text-xs text-indigo-500">
                    Copy this URL and paste it into your {active.label} account under lead delivery or webhook settings.
                  </p>
                )}
                <div className="mt-2.5 flex items-center rounded-lg border border-indigo-200 bg-white px-3 py-2">
                  <code className="flex-1 break-all text-xs text-gray-700">{webhookUrl}</code>
                  <CopyButton text={webhookUrl} />
                </div>
              </div>
            )}

            {active.webhookBased && !webhookUrl && (
              <div className="rounded-xl bg-gray-50 p-4 ring-1 ring-gray-100">
                <p className="text-xs font-semibold text-gray-600">Webhook URL</p>
                <p className="mt-0.5 text-xs text-gray-400">
                  Save this integration first to generate your webhook URL.
                </p>
              </div>
            )}

            {/* Config fields */}
            {active.fields.length > 0 ? (
              <div className="space-y-3">
                {active.fields.map((f) => (
                  <div key={f.key}>
                    <label className="block text-sm font-medium text-gray-700">{f.label}</label>
                    <input
                      type={f.secret ? 'password' : 'text'}
                      placeholder={f.placeholder}
                      value={form[f.key] || ''}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, [f.key]: e.target.value }))
                      }
                      className={inputCls}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-start gap-2.5 rounded-xl border border-gray-100 bg-gray-50/50 p-4">
                <Plug className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
                <p className="text-sm text-gray-500">
                  No additional configuration needed. Copy the webhook URL above and paste it
                  into your {active.label} account settings to start receiving leads.
                </p>
              </div>
            )}

            {/* Per-integration setup instructions */}
            {active.webhookInstructions && (
              !active.webhookBased
                ? active.webhookInstructions(webhookUrl ?? '')
                : webhookUrl
                  ? active.webhookInstructions(webhookUrl)
                  : (
                    <div className="rounded-xl border border-amber-100 bg-amber-50 p-4">
                      <p className="text-xs font-semibold text-amber-800">Setup instructions</p>
                      <p className="mt-1 text-xs text-amber-700">
                        Click <strong>Save &amp; Enable</strong> first — your personalised Apps Script code will appear here with your webhook URL pre-filled.
                      </p>
                    </div>
                  )
            )}

            {saveError && (
              <p className="text-sm text-red-500">{saveError}</p>
            )}

            <div className="flex justify-end gap-3 pt-1">
              <button
                type="button"
                onClick={() => {
                  setActive(null);
                  setForm({});
                }}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => save.mutate()}
                disabled={save.isPending}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
              >
                {save.isPending ? 'Saving…' : 'Save & Enable'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Facebook Page picker — shown once after the OAuth redirect returns */}
      <Modal
        open={!!fbPending}
        size="sm"
        onClose={() => setFbPending(null)}
        title="Choose a Facebook Page"
        description="Leads submitted to this Page's Lead Ads will be captured as contacts automatically."
      >
        <div className="space-y-2">
          {fbPending?.pages.map((page) => (
            <button
              key={page.id}
              onClick={() => selectFacebookPage.mutate(page.id)}
              disabled={selectFacebookPage.isPending}
              className="flex w-full items-center justify-between rounded-lg border border-gray-200 px-4 py-2.5 text-left text-sm font-medium text-gray-700 transition hover:border-indigo-300 hover:bg-indigo-50 disabled:opacity-50"
            >
              {page.name}
              {selectFacebookPage.isPending && <span className="text-xs text-gray-400">Connecting…</span>}
            </button>
          ))}
        </div>
      </Modal>
    </div>
  );
}
