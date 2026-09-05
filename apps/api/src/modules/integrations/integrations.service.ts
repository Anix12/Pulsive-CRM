import prisma from '@/db/client';
import { env } from '@/config/env';

export const INTEGRATION_TYPES = [
  'INDIAMART',
  'JUSTDIAL',
  'TRADEINDIA',
  'SULEKHA',
  'ACRES_99',
  'MAGICBRICKS',
  'HOUSING',
  'GOOGLE_ADS',
  'FACEBOOK_LEADS',
  'GOOGLE_FORMS',
  'GOOGLE_SHEETS',
  'CUSTOM',
  'EXOTEL',
] as const;

export type IntegrationType = (typeof INTEGRATION_TYPES)[number];

// Not yet wired to a live connector — shown in the catalog as a placeholder.
export const COMING_SOON_TYPES = ['ZAPIER'] as const;

export const list = async (tenantId: string) => {
  const saved = await prisma.integration.findMany({ where: { tenantId } });
  const savedMap = Object.fromEntries(saved.map((i) => [i.type, i]));

  const live = INTEGRATION_TYPES.map((type) => ({
    type,
    isActive: savedMap[type]?.isActive ?? false,
    config: savedMap[type]?.config ?? {},
    webhookUrl: hasWebhook(type) ? `${env.API_URL}/api/v1/webhooks/${type.toLowerCase().replace('_', '-')}/${tenantId}` : null,
    comingSoon: false,
  }));

  const comingSoon = COMING_SOON_TYPES.map((type) => ({
    type,
    isActive: false,
    config: {},
    webhookUrl: null,
    comingSoon: true,
  }));

  return [...live, ...comingSoon];
};

export const upsert = async (tenantId: string, type: string, config: Record<string, string>) => {
  return prisma.integration.upsert({
    where: { tenantId_type: { tenantId, type } },
    update: { config, isActive: true, updatedAt: new Date() },
    create: { tenantId, type, config, isActive: true },
  });
};

export const disconnect = async (tenantId: string, type: string) => {
  const existing = await prisma.integration.findUnique({
    where: { tenantId_type: { tenantId, type } },
  });
  if (!existing) return;
  return prisma.integration.update({
    where: { tenantId_type: { tenantId, type } },
    data: { isActive: false, config: {}, updatedAt: new Date() },
  });
};

const hasWebhook = (type: string) => type !== 'EXOTEL' && type !== 'GOOGLE_SHEETS';
