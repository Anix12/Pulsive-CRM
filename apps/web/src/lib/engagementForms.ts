import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

export type FieldType = 'text' | 'radio' | 'date';

export interface EngagementField {
  id: string;
  type: FieldType;
  label: string;
  options?: string[];
  required?: boolean;
}

export interface EngagementSection {
  id: string;
  title: string;
  description?: string;
  fields: EngagementField[];
  sendMessage?: { enabled: boolean; body?: string };
}

export interface EngagementFormSchema {
  sections: EngagementSection[];
}

export interface EngagementForm {
  id: string;
  name: string;
  campaignId: string | null;
  schema: EngagementFormSchema;
  updatedAt: string;
}

const uid = () => Math.random().toString(36).slice(2, 10);

export const emptySchema = (): EngagementFormSchema => ({ sections: [] });

export const newSection = (): EngagementSection => ({ id: uid(), title: 'Untitled section', description: '', fields: [] });

export const newField = (type: FieldType): EngagementField => ({
  id: uid(),
  type,
  label: type === 'text' ? 'Question' : type === 'radio' ? 'Choose one' : 'Pick a date',
  options: type === 'radio' ? ['Option 1', 'Option 2'] : undefined,
  required: false,
});

// The form to show for this lead: its campaign's own form, else the tenant default.
export const useEngagementForm = (campaignId?: string | null) =>
  useQuery<EngagementForm | null>({
    queryKey: ['engagement-form', 'resolve', campaignId ?? null],
    queryFn: async () => (await api.get('/api/v1/engagement-forms/resolve', { params: { campaignId: campaignId || undefined } })).data.data,
  });

export const useEngagementForms = () =>
  useQuery<(EngagementForm & { campaign: { id: string; name: string } | null })[]>({
    queryKey: ['engagement-forms'],
    queryFn: async () => (await api.get('/api/v1/engagement-forms')).data.data,
  });

export const useSaveEngagementForm = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, name, campaignId, schema }: { id?: string; name: string; campaignId: string | null; schema: EngagementFormSchema }) =>
      id
        ? (await api.patch(`/api/v1/engagement-forms/${id}`, { name, campaignId, schema })).data.data
        : (await api.post('/api/v1/engagement-forms', { name, campaignId, schema })).data.data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['engagement-forms'] });
      qc.invalidateQueries({ queryKey: ['engagement-form'] });
    },
  });
};
