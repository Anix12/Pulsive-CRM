'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Phone, Mail, Building, Tag } from 'lucide-react';
import { format } from 'date-fns';
import { getInitials } from '@/lib/utils';

const statusColors: Record<string, string> = {
  LEAD: 'bg-blue-50 text-blue-700',
  PROSPECT: 'bg-purple-50 text-purple-700',
  CUSTOMER: 'bg-green-50 text-green-700',
  CHURNED: 'bg-gray-100 text-gray-600',
  BLOCKED: 'bg-red-50 text-red-700',
};

const activityIcons: Record<string, string> = {
  CALL: '📞', SMS: '💬', WHATSAPP: '💚', NOTE: '📝',
  EMAIL: '📧', MEETING: '🤝', TASK: '✅',
  DEAL_STAGE_CHANGED: '🔄', CONTACT_CREATED: '👤', DEAL_CREATED: '💼',
};

export default function ContactDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const { data: contact, isLoading } = useQuery({
    queryKey: ['contact', id],
    queryFn: async () => { const { data } = await api.get(`/api/v1/contacts/${id}`); return data.data; },
  });

  if (isLoading) return <div className="flex h-64 items-center justify-center text-gray-500">Loading...</div>;
  if (!contact) return <div className="text-gray-500">Contact not found.</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 font-semibold text-indigo-700">
            {getInitials(contact.name)}
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{contact.name}</h1>
            {contact.jobTitle && <p className="text-sm text-gray-500">{contact.jobTitle}</p>}
          </div>
          <span className={`ml-2 inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[contact.status] || ''}`}>
            {contact.status}
          </span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-1">
          <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
            <h2 className="text-sm font-semibold text-gray-700">Contact Info</h2>
            <div className="mt-3 space-y-3">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Phone className="h-4 w-4 text-gray-400" />
                {contact.phone}
              </div>
              {contact.email && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Mail className="h-4 w-4 text-gray-400" />
                  {contact.email}
                </div>
              )}
              {contact.company && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Building className="h-4 w-4 text-gray-400" />
                  {contact.company}
                </div>
              )}
              {contact.tags?.length > 0 && (
                <div className="flex items-start gap-2 text-sm text-gray-600">
                  <Tag className="mt-0.5 h-4 w-4 text-gray-400" />
                  <div className="flex flex-wrap gap-1">
                    {contact.tags.map((tag: string) => (
                      <span key={tag} className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700">{tag}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <p className="mt-4 text-xs text-gray-400">Added {format(new Date(contact.createdAt), 'dd MMM yyyy')}</p>
          </div>

          {contact.deals?.length > 0 && (
            <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
              <h2 className="text-sm font-semibold text-gray-700">Deals ({contact.deals.length})</h2>
              <div className="mt-3 space-y-2">
                {contact.deals.map((deal: any) => (
                  <div key={deal.id} className="rounded-lg bg-gray-50 p-3">
                    <p className="text-sm font-medium text-gray-900">{deal.title}</p>
                    <p className="text-xs text-gray-500">{deal.stage?.name}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-2">
          <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
            <h2 className="text-sm font-semibold text-gray-700">Activity Timeline</h2>
            {!contact.activities?.length ? (
              <p className="mt-4 text-sm text-gray-400">No activity yet.</p>
            ) : (
              <div className="mt-4 space-y-4">
                {contact.activities.map((activity: any) => (
                  <div key={activity.id} className="flex gap-3">
                    <div className="mt-0.5 text-lg">{activityIcons[activity.type] || '•'}</div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{activity.subject}</p>
                      {activity.body && <p className="mt-0.5 text-sm text-gray-500">{activity.body}</p>}
                      <p className="mt-1 text-xs text-gray-400">
                        {activity.user?.firstName} · {format(new Date(activity.occurredAt), 'dd MMM, h:mm a')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
