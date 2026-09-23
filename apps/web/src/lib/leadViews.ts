import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

export type LeadStatusKey = 'uncontacted' | 'in_progress' | 'follow_up' | 'not_connected';
export type SortOrder = 'newest' | 'oldest' | 'name' | 'score';

export interface LeadViewFilters {
  campaignId?: string | null;
  stagesAndTags?: { stages: string[]; tags: string[] };
  leadStatus?: LeadStatusKey | null;
  creationDateRange?: { from?: string | null; to?: string | null };
  sortOrder?: SortOrder;
}

export interface LeadView {
  id: string;
  name: string;
  description: string | null;
  isSystemDefault: boolean;
  filters: LeadViewFilters | null;
  filtersSummary: string | null;
  leadCount: number;
}

export const LEAD_STATUS_LABELS: Record<LeadStatusKey, string> = {
  uncontacted: 'Uncontacted',
  in_progress: 'In progress',
  follow_up: 'Follow-up',
  not_connected: 'Not connected',
};

export const LEAD_STAGES = [
  'NEW', 'CONTACTED', 'QUALIFIED', 'PROPERTY_SHARED', 'VISIT_SCHEDULED',
  'VISIT_DONE', 'NEGOTIATION', 'BOOKING', 'CLOSED_WON', 'CLOSED_LOST',
];

export const useLeadViews = () =>
  useQuery<LeadView[]>({
    queryKey: ['lead-views'],
    queryFn: async () => (await api.get('/api/v1/lead-views')).data.data,
  });

export const useSaveLeadView = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, name, filters }: { id?: string; name: string; filters: LeadViewFilters }) =>
      id
        ? (await api.patch(`/api/v1/lead-views/${id}`, { name, filters })).data.data
        : (await api.post('/api/v1/lead-views', { name, filters })).data.data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['lead-views'] }),
  });
};

export const useDeleteLeadView = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => api.delete(`/api/v1/lead-views/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['lead-views'] }),
  });
};

export const fetchLeadQueue = async (viewId: string): Promise<{ viewName: string; leadIds: string[] }> =>
  (await api.get(`/api/v1/lead-views/${encodeURIComponent(viewId)}/queue`)).data.data;

export const errorMessage = (err: any, fallback = 'Something went wrong') =>
  err?.response?.data?.error?.message ?? err?.message ?? fallback;
