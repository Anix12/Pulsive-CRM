'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { formatDuration } from '@/lib/utils';
import { Phone, PhoneIncoming, PhoneOutgoing } from 'lucide-react';
import { format } from 'date-fns';
import { Modal } from '@/components/ui/Modal';
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/store/auth.store';

const statusColors: Record<string, string> = {
  COMPLETED: 'bg-green-50 text-green-700',
  FAILED: 'bg-red-50 text-red-600',
  IN_PROGRESS: 'bg-blue-50 text-blue-700',
  RINGING: 'bg-yellow-50 text-yellow-700',
  BUSY: 'bg-orange-50 text-orange-600',
  NO_ANSWER: 'bg-gray-100 text-gray-600',
  INITIATED: 'bg-indigo-50 text-indigo-600',
  CANCELLED: 'bg-gray-100 text-gray-500',
};

const callSchema = z.object({
  contactId: z.string().min(1, 'Required'),
  toNumber: z.string().optional(),
});

type CallForm = z.infer<typeof callSchema>;

function InitiateCallModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();

  const { data: contactsData } = useQuery({
    queryKey: ['contacts-list'],
    queryFn: async () => { const { data } = await api.get('/api/v1/contacts?limit=100'); return data.data; },
    enabled: open,
  });

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<CallForm>({
    resolver: zodResolver(callSchema),
  });

  const selectedContactId = watch('contactId');
  const selectedContact = (contactsData || []).find((c: any) => c.id === selectedContactId);

  const initiate = useMutation({
    mutationFn: (data: CallForm) => api.post('/api/v1/calls', {
      contactId: data.contactId,
      toNumber: selectedContact?.phone,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['calls'] }); reset(); onClose(); },
  });

  return (
    <Modal open={open} onClose={onClose} title="Make a Call" size="sm">
      <form onSubmit={handleSubmit((d) => initiate.mutate(d))} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Select Contact *</label>
          <select {...register('contactId')} className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none">
            <option value="">Choose a contact...</option>
            {(contactsData || []).map((c: any) => (
              <option key={c.id} value={c.id}>{c.name} — {c.phone}</option>
            ))}
          </select>
          {errors.contactId && <p className="mt-1 text-xs text-red-500">{errors.contactId.message}</p>}
        </div>

        {selectedContact && (
          <div className="rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-700">
            Calling: <span className="font-medium">{selectedContact.phone}</span>
          </div>
        )}

        {initiate.isError && (
          <p className="text-sm text-red-500">Failed to initiate call. Check Twilio configuration in Settings.</p>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
          <button type="submit" disabled={initiate.isPending} className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50">
            <Phone className="h-4 w-4" />
            {initiate.isPending ? 'Calling...' : 'Call Now'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default function CallsPage() {
  const [callModal, setCallModal] = useState(false);
  const qc = useQueryClient();
  const { accessToken } = useAuthStore();

  const { data, isLoading } = useQuery({
    queryKey: ['calls'],
    queryFn: async () => { const { data } = await api.get('/api/v1/calls'); return data; },
  });

  useEffect(() => {
    if (!accessToken) return;
    const socket: Socket = io(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000', {
      auth: { token: accessToken },
    });
    socket.on('call:status_updated', () => {
      qc.invalidateQueries({ queryKey: ['calls'] });
    });
    return () => { socket.disconnect(); };
  }, [accessToken, qc]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Calls</h1>
          <p className="text-sm text-gray-500">{data?.meta?.total || 0} total</p>
        </div>
        <button
          onClick={() => setCallModal(true)}
          className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
        >
          <Phone className="h-4 w-4" /> Make a Call
        </button>
      </div>

      <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-100">
        {isLoading ? (
          <div className="flex h-48 items-center justify-center text-gray-500">Loading...</div>
        ) : !data?.data?.length ? (
          <div className="flex h-48 flex-col items-center justify-center gap-2 text-gray-400">
            <Phone className="h-8 w-8 opacity-30" />
            <p className="text-sm">No calls yet</p>
            <button onClick={() => setCallModal(true)} className="text-sm text-indigo-600 hover:underline">Make your first call</button>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-100">
            <thead>
              <tr className="bg-gray-50">
                {['Contact', 'Direction', 'Status', 'Duration', 'Agent', 'Date'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data.data.map((call: any) => (
                <tr key={call.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">
                    {call.contact ? call.contact.name : call.toNumber}
                  </td>
                  <td className="px-4 py-3">
                    {call.direction === 'OUTBOUND'
                      ? <span className="flex items-center gap-1 text-xs text-blue-600"><PhoneOutgoing className="h-3 w-3" /> Outbound</span>
                      : <span className="flex items-center gap-1 text-xs text-green-600"><PhoneIncoming className="h-3 w-3" /> Inbound</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[call.status] || 'bg-gray-100 text-gray-600'}`}>
                      {call.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {call.duration ? formatDuration(call.duration) : '—'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {call.agent ? `${call.agent.firstName} ${call.agent.lastName}` : '—'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {format(new Date(call.createdAt), 'dd MMM, h:mm a')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <InitiateCallModal open={callModal} onClose={() => setCallModal(false)} />
    </div>
  );
}
