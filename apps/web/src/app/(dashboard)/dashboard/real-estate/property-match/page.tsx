'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Sparkles, Search } from 'lucide-react';
import api from '@/lib/api';
import { cn } from '@/lib/utils';

const inputCls =
  'mt-1 block w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm transition placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</label>
      {children}
    </div>
  );
}

function StatCard({ label, value, tone }: { label: string; value: number; tone: 'indigo' | 'emerald' | 'gray' }) {
  const tones = {
    indigo: 'bg-indigo-50 text-indigo-700',
    emerald: 'bg-emerald-50 text-emerald-700',
    gray: 'bg-transparent text-gray-400',
  };
  return (
    <div className={cn('flex-1 rounded-xl p-5 text-center', tones[tone])}>
      <p className="text-2xl font-bold">{value}</p>
      <p className="mt-0.5 text-xs">{label}</p>
    </div>
  );
}

export default function PropertyMatchPage() {
  const [minBudget, setMinBudget] = useState('');
  const [maxBudget, setMaxBudget] = useState('');
  const [bhk, setBhk] = useState('');
  const [location, setLocation] = useState('');
  const [searchKey, setSearchKey] = useState(0);

  const { data: overviewStats } = useQuery({
    queryKey: ['re-property-match-stats'],
    queryFn: async () => {
      const { data } = await api.get('/api/v1/real-estate/property-match/stats');
      return data.data as { leadsWithRequirements: number; noRequirementsYet: number };
    },
  });

  const searchParams = { minBudget: minBudget || undefined, maxBudget: maxBudget || undefined, bhk: bhk || undefined, location: location || undefined };

  const { data: searchResult, isFetching: searching } = useQuery({
    queryKey: ['re-property-match-search', searchParams, searchKey],
    queryFn: async () => {
      const { data } = await api.get('/api/v1/real-estate/property-match/search', { params: searchParams });
      return data.data as { hasCriteria: boolean; leads: any[] };
    },
  });

  const reset = () => { setMinBudget(''); setMaxBudget(''); setBhk(''); setLocation(''); setSearchKey((k) => k + 1); };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Property Match AI</h1>
        <p className="text-sm text-gray-500">Find leads matching your property criteria</p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <StatCard label="Leads with Requirements" value={overviewStats?.leadsWithRequirements ?? 0} tone="indigo" />
        <StatCard label="Matching Leads" value={searchResult?.hasCriteria ? searchResult.leads.length : 0} tone="emerald" />
        <StatCard label="No Requirements Yet" value={overviewStats?.noRequirementsYet ?? 0} tone="gray" />
      </div>

      <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-900">Search Criteria</h3>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <div className="w-36">
            <Field label="Min Budget">
              <input value={minBudget} onChange={(e) => setMinBudget(e.target.value)} type="number" className={inputCls} placeholder="4000000" />
            </Field>
          </div>
          <div className="w-36">
            <Field label="Max Budget">
              <input value={maxBudget} onChange={(e) => setMaxBudget(e.target.value)} type="number" className={inputCls} placeholder="6000000" />
            </Field>
          </div>
          <div className="w-32">
            <Field label="BHK">
              <select value={bhk} onChange={(e) => setBhk(e.target.value)} className={inputCls}>
                <option value="">All</option>
                <option value="1BHK">1BHK</option>
                <option value="2BHK">2BHK</option>
                <option value="3BHK">3BHK</option>
                <option value="4BHK">4BHK</option>
                <option value="Villa">Villa</option>
              </select>
            </Field>
          </div>
          <div className="w-48">
            <Field label="Location">
              <input value={location} onChange={(e) => setLocation(e.target.value)} className={inputCls} placeholder="e.g. Baner" />
            </Field>
          </div>
          <button
            onClick={() => setSearchKey((k) => k + 1)}
            className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
          >
            <Search className="h-3.5 w-3.5" /> Find Matches
          </button>
          <button onClick={reset} className="text-sm text-gray-400 hover:text-gray-600">Reset</button>
        </div>
      </div>

      <div className="rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden">
        {searching ? (
          <div className="flex h-40 items-center justify-center text-gray-500">Searching…</div>
        ) : !searchResult?.hasCriteria ? (
          <div className="flex h-64 flex-col items-center justify-center gap-2 text-center">
            <Search className="h-10 w-10 text-gray-200" />
            <p className="text-sm text-gray-500">Enter budget, BHK or location above to find matching leads</p>
          </div>
        ) : !searchResult.leads.length ? (
          <div className="flex h-40 items-center justify-center text-sm text-gray-500">No leads match these criteria</div>
        ) : (
          <table className="min-w-full divide-y divide-gray-50">
            <thead className="bg-gray-50/60">
              <tr>
                {['Lead', 'Phone', 'City', 'Type', 'Budget Range', ''].map((h) => (
                  <th key={h} className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {searchResult.leads.map((pref: any) => (
                <tr key={pref.id} className="hover:bg-slate-50/50">
                  <td className="px-5 py-3.5 text-sm font-medium text-gray-900">{pref.contact?.name}</td>
                  <td className="px-5 py-3.5 text-sm text-gray-600">{pref.contact?.phone}</td>
                  <td className="px-5 py-3.5 text-sm text-gray-600">{pref.preferredCity || '—'}</td>
                  <td className="px-5 py-3.5 text-sm text-gray-600">{pref.preferredType || '—'}</td>
                  <td className="px-5 py-3.5 text-sm text-gray-600">
                    {pref.budgetMin || pref.budgetMax
                      ? `₹${Number(pref.budgetMin ?? 0).toLocaleString()} - ₹${Number(pref.budgetMax ?? 0).toLocaleString()}`
                      : '—'}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-100">
                      {pref.contact?.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <PerContactMatchTool />
    </div>
  );
}

// Secondary tool: pick one contact, save their preferences, and see which units match them.
function PerContactMatchTool() {
  const qc = useQueryClient();
  const [contactSearch, setContactSearch] = useState('');
  const [selectedContact, setSelectedContact] = useState<any | null>(null);

  const { data: contacts } = useQuery({
    queryKey: ['re-contacts-search', contactSearch],
    queryFn: async () => {
      const { data } = await api.get('/api/v1/contacts', { params: { search: contactSearch, limit: 10 } });
      return data.data as any[];
    },
    enabled: contactSearch.length > 0,
  });

  const { data: preference } = useQuery({
    queryKey: ['re-preference', selectedContact?.id],
    queryFn: async () => {
      const { data } = await api.get(`/api/v1/real-estate/property-match/preferences/${selectedContact.id}`);
      return data.data;
    },
    enabled: !!selectedContact,
  });

  const preferenceSchema = z.object({
    preferredCity: z.string().optional(),
    preferredType: z.string().optional(),
    budgetMin: z.union([z.string(), z.number()]).optional(),
    budgetMax: z.union([z.string(), z.number()]).optional(),
    preferredFloor: z.union([z.string(), z.number()]).optional(),
    facing: z.string().optional(),
    amenities: z.string().optional(), // comma-separated in the UI, split into an array on save
    commutePreference: z.string().optional(),
    notes: z.string().optional(),
  });
  type PreferenceForm = z.infer<typeof preferenceSchema>;

  const { register, handleSubmit } = useForm<PreferenceForm>({
    resolver: zodResolver(preferenceSchema),
    values: preference
      ? {
          preferredCity: preference.preferredCity ?? '',
          preferredType: preference.preferredType ?? '',
          budgetMin: preference.budgetMin ?? '',
          budgetMax: preference.budgetMax ?? '',
          preferredFloor: preference.preferredFloor ?? '',
          facing: preference.facing ?? '',
          amenities: Array.isArray(preference.amenities) ? preference.amenities.join(', ') : '',
          commutePreference: preference.commutePreference ?? '',
          notes: preference.notes ?? '',
        }
      : { preferredCity: '', preferredType: '', budgetMin: '', budgetMax: '', preferredFloor: '', facing: '', amenities: '', commutePreference: '', notes: '' },
  });

  const savePreference = useMutation({
    mutationFn: (data: PreferenceForm) => {
      const payload = {
        contactId: selectedContact.id,
        ...data,
        budgetMin: data.budgetMin ? Number(data.budgetMin) : undefined,
        budgetMax: data.budgetMax ? Number(data.budgetMax) : undefined,
        preferredFloor: data.preferredFloor !== '' && data.preferredFloor !== undefined ? Number(data.preferredFloor) : undefined,
        amenities: data.amenities ? data.amenities.split(',').map((a) => a.trim()).filter(Boolean) : undefined,
      };
      return api.post('/api/v1/real-estate/property-match/preferences', payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['re-preference', selectedContact?.id] });
      qc.invalidateQueries({ queryKey: ['re-property-match-stats'] });
    },
  });

  const { data: matchResult, isFetching: matching, refetch: findMatches } = useQuery({
    queryKey: ['re-matches', selectedContact?.id],
    queryFn: async () => {
      const { data } = await api.get(`/api/v1/real-estate/property-match/${selectedContact.id}`);
      return data.data as { preference: any; matches: any[] };
    },
    enabled: false,
  });

  return (
    <div className="space-y-4 border-t border-gray-100 pt-6">
      <div>
        <h2 className="text-base font-semibold text-gray-900">Match a Specific Lead</h2>
        <p className="text-sm text-gray-500">Save one lead's preferences and see which available units suit them</p>
      </div>

      <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
        <Field label="Find a contact">
          <div className="relative mt-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
            <input
              value={contactSearch}
              onChange={(e) => setContactSearch(e.target.value)}
              placeholder="Search contacts by name or phone…"
              className={cn(inputCls, 'pl-8')}
            />
          </div>
        </Field>
        {contacts && contacts.length > 0 && !selectedContact && (
          <div className="mt-2 max-h-48 divide-y divide-gray-50 overflow-y-auto rounded-lg border border-gray-100">
            {contacts.map((c) => (
              <button
                key={c.id}
                onClick={() => { setSelectedContact(c); setContactSearch(''); }}
                className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-gray-50"
              >
                <span className="font-medium text-gray-900">{c.name}</span>
                <span className="text-gray-400">{c.phone}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {selectedContact && (
        <>
          <div className="flex items-center justify-between rounded-xl border border-indigo-100 bg-indigo-50/50 px-5 py-3">
            <p className="text-sm font-medium text-indigo-900">Preferences for {selectedContact.name}</p>
            <button onClick={() => setSelectedContact(null)} className="text-xs font-medium text-indigo-600 hover:underline">
              Change contact
            </button>
          </div>

          <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
            <form onSubmit={handleSubmit((d) => savePreference.mutate(d))} className="grid grid-cols-2 gap-4">
              <Field label="Preferred City">
                <input {...register('preferredCity')} className={inputCls} />
              </Field>
              <Field label="Preferred Type">
                <input {...register('preferredType')} className={inputCls} placeholder="e.g. 2BHK" />
              </Field>
              <Field label="Budget Min">
                <input {...register('budgetMin')} type="number" className={inputCls} />
              </Field>
              <Field label="Budget Max">
                <input {...register('budgetMax')} type="number" className={inputCls} />
              </Field>
              <Field label="Preferred Floor">
                <input {...register('preferredFloor')} type="number" className={inputCls} />
              </Field>
              <Field label="Facing">
                <input {...register('facing')} className={inputCls} placeholder="e.g. North" />
              </Field>
              <div className="col-span-2">
                <Field label="Amenities (comma separated)">
                  <input {...register('amenities')} className={inputCls} placeholder="e.g. Gym, Swimming Pool, Clubhouse" />
                </Field>
              </div>
              <div className="col-span-2">
                <Field label="Commute Preference">
                  <input {...register('commutePreference')} className={inputCls} placeholder="e.g. near metro" />
                </Field>
              </div>
              <div className="col-span-2">
                <Field label="Notes">
                  <textarea {...register('notes')} rows={2} className={inputCls} />
                </Field>
              </div>
              <div className="col-span-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => findMatches()}
                  className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
                >
                  <Sparkles className="h-3.5 w-3.5" /> Find Matching Units
                </button>
                <button
                  type="submit"
                  disabled={savePreference.isPending}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
                >
                  {savePreference.isPending ? 'Saving…' : 'Save Preferences'}
                </button>
              </div>
            </form>
          </div>

          <div className="rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden">
            {matching ? (
              <div className="flex h-40 items-center justify-center text-gray-500">Finding matches…</div>
            ) : !matchResult ? (
              <div className="flex h-40 flex-col items-center justify-center gap-2 text-center">
                <Sparkles className="h-8 w-8 text-gray-200" />
                <p className="text-sm text-gray-500">Save preferences, then click "Find Matching Units"</p>
              </div>
            ) : !matchResult.matches.length ? (
              <div className="flex h-40 items-center justify-center text-sm text-gray-500">No available units match these preferences</div>
            ) : (
              <table className="min-w-full divide-y divide-gray-50">
                <thead className="bg-gray-50/60">
                  <tr>
                    {['Fit', 'Project', 'Unit', 'Type', 'Price', 'Why it matches'].map((h) => (
                      <th key={h} className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {matchResult.matches.map((u: any) => {
                    const tone = u.fitScore >= 70 ? 'bg-emerald-50 text-emerald-700 ring-emerald-100' : u.fitScore >= 40 ? 'bg-amber-50 text-amber-700 ring-amber-100' : 'bg-gray-100 text-gray-500 ring-gray-200';
                    return (
                      <tr key={u.id} className="hover:bg-slate-50/50">
                        <td className="px-5 py-3.5">
                          <span className={cn('inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1', tone)}>{u.fitScore}%</span>
                        </td>
                        <td className="px-5 py-3.5 text-sm font-medium text-gray-900">{u.project?.name}</td>
                        <td className="px-5 py-3.5 text-sm text-gray-600">{u.unitNumber}</td>
                        <td className="px-5 py-3.5 text-sm text-gray-600">{u.type || '—'}</td>
                        <td className="px-5 py-3.5 text-sm text-gray-600">{u.price ? `₹${Number(u.price).toLocaleString()}` : '—'}</td>
                        <td className="px-5 py-3.5">
                          <div className="flex flex-wrap gap-1">
                            {(u.fitReasons ?? []).map((r: string, i: number) => (
                              <span key={i} className="inline-flex rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-medium text-indigo-700 ring-1 ring-indigo-100">
                                {r}
                              </span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}
