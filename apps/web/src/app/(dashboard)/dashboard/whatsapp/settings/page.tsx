'use client';

import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { CheckCircle2, Settings2, ExternalLink } from 'lucide-react';

const inputCls =
  'block w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm transition placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20';

export default function WhatsappSettingsPage() {
  const qc = useQueryClient();
  const [accessToken, setAccessToken] = useState('');
  const [phoneNumberId, setPhoneNumberId] = useState('');

  const { data: tenant, isLoading } = useQuery({
    queryKey: ['tenant-me'],
    queryFn: async () => { const { data } = await api.get('/api/v1/tenants/me'); return data.data; },
  });

  useEffect(() => {
    if (tenant?.whatsappPhoneNumberId) setPhoneNumberId(tenant.whatsappPhoneNumberId);
  }, [tenant]);

  const isConnected = !!tenant?.whatsappPhoneNumberId;

  const save = useMutation({
    mutationFn: () => api.put('/api/v1/tenants/me/whatsapp', { whatsappAccessToken: accessToken, whatsappPhoneNumberId: phoneNumberId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tenant-me'] });
      setAccessToken('');
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">WA Settings</h1>
        <p className="mt-1 text-sm text-gray-500">Connect your Meta WhatsApp Business API to enable real sending — Inbox, Broadcast, and Automation all use this connection.</p>
      </div>

      {isLoading ? (
        <div className="h-64 animate-pulse rounded-xl bg-white shadow-sm ring-1 ring-gray-100" />
      ) : (
        <div className="max-w-xl rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
          <div className="mb-5 flex items-center gap-2">
            {isConnected ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Connected
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 ring-1 ring-amber-200">
                <Settings2 className="h-3.5 w-3.5" />
                Not connected
              </span>
            )}
          </div>

          <form
            onSubmit={(e) => { e.preventDefault(); save.mutate(); }}
            className="space-y-4"
          >
            <div>
              <label className="block text-sm font-medium text-gray-700">Phone Number ID</label>
              <input
                value={phoneNumberId}
                onChange={(e) => setPhoneNumberId(e.target.value)}
                placeholder="e.g. 123456789012345"
                className={`mt-1 ${inputCls}`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Access Token</label>
              <input
                type="password"
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
                placeholder="Paste your Meta permanent access token"
                className={`mt-1 ${inputCls}`}
              />
              <p className="mt-1 text-xs text-gray-400">
                Stored encrypted. Get this from Meta Business Suite → WhatsApp → API Setup.
                {isConnected && ' Re-enter it here any time you want to update your connection.'}
              </p>
            </div>

            {save.isError && <p className="text-sm text-red-500">Failed to save. Check your credentials and try again.</p>}
            {save.isSuccess && <p className="text-sm text-emerald-600">Saved. WhatsApp sending is now live.</p>}

            <div className="flex items-center justify-between pt-2">
              <a
                href="https://business.facebook.com/wa/manage/home/"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-xs font-medium text-indigo-600 hover:underline"
              >
                Open Meta Business Suite
                <ExternalLink className="h-3 w-3" />
              </a>
              <button
                type="submit"
                disabled={save.isPending || !phoneNumberId || !accessToken}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
              >
                {save.isPending ? 'Saving…' : 'Save & Connect'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
