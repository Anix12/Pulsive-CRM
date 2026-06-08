import prisma from '@/db/client';
import { AppError } from '@/middleware/errorHandler';
import { generateApiKey, hashApiKey } from '@/utils/crypto';
import { AUDIT_ACTIONS } from '@/config/constants';

export const list = async (tenantId: string) => {
  return prisma.apiKey.findMany({
    where: { tenantId },
    select: { id: true, name: true, keyPrefix: true, scopes: true, isActive: true, lastUsedAt: true, expiresAt: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  });
};

export const create = async (tenantId: string, userId: string, name: string, scopes: string[]) => {
  const { raw, prefix } = generateApiKey();
  const keyHash = hashApiKey(raw);

  const apiKey = await prisma.apiKey.create({
    data: { tenantId, name, keyHash, keyPrefix: prefix, scopes },
  });

  await prisma.auditLog.create({
    data: { tenantId, userId, action: AUDIT_ACTIONS.API_KEY_CREATE, resource: 'api_keys', resourceId: apiKey.id },
  });

  // Return the raw key only once — never stored in plain text
  return { id: apiKey.id, name, keyPrefix: prefix, key: raw };
};

export const revoke = async (tenantId: string, userId: string, id: string) => {
  const existing = await prisma.apiKey.findFirst({ where: { id, tenantId } });
  if (!existing) throw new AppError(404, 'NOT_FOUND', 'API key not found');

  await prisma.apiKey.update({ where: { id }, data: { isActive: false } });

  await prisma.auditLog.create({
    data: { tenantId, userId, action: AUDIT_ACTIONS.API_KEY_REVOKE, resource: 'api_keys', resourceId: id },
  });
};
