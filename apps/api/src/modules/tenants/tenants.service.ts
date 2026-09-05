import prisma from '@/db/client';
import { AppError } from '@/middleware/errorHandler';
import { encrypt } from '@/utils/crypto';
import { AUDIT_ACTIONS } from '@/config/constants';
import { z } from 'zod';

export const UpdateTenantSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  companyName: z.string().optional(),
  logoUrl: z.string().url().optional(),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  emailFrom: z.string().email().optional(),
  emailFromName: z.string().optional(),
  inactivityTimeoutMinutes: z.number().int().min(1).max(240).optional(),
});

export const UpdateTwilioSchema = z.object({
  twilioAccountSid: z.string().min(1),
  twilioAuthToken: z.string().min(1),
  twilioPhoneNumber: z.string().min(1),
});

export const UpdateWhatsAppSchema = z.object({
  whatsappAccessToken: z.string().min(1),
  whatsappPhoneNumberId: z.string().min(1),
});

export const get = async (tenantId: string) => {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: { onboarding: true, _count: { select: { users: true, contacts: true, deals: true } } },
  });
  if (!tenant) throw new AppError(404, 'NOT_FOUND', 'Tenant not found');

  // Never return secrets
  const { twilioAuthToken, whatsappAccessToken, ...safe } = tenant as any;
  return {
    ...safe,
    twilioConfigured: !!twilioAuthToken,
    whatsappConfigured: !!whatsappAccessToken,
  };
};

export const update = async (tenantId: string, userId: string, data: z.infer<typeof UpdateTenantSchema>) => {
  const existing = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!existing) throw new AppError(404, 'NOT_FOUND', 'Tenant not found');

  const updated = await prisma.tenant.update({ where: { id: tenantId }, data });
  await prisma.auditLog.create({
    data: { tenantId, userId, action: AUDIT_ACTIONS.UPDATE, resource: 'tenant', resourceId: tenantId, before: existing as any, after: updated as any },
  });
  return updated;
};

export const updateTwilio = async (tenantId: string, userId: string, data: z.infer<typeof UpdateTwilioSchema>) => {
  const updated = await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      twilioAccountSid: data.twilioAccountSid,
      twilioAuthToken: encrypt(data.twilioAuthToken),
      twilioPhoneNumber: data.twilioPhoneNumber,
    },
  });
  await prisma.auditLog.create({
    data: { tenantId, userId, action: AUDIT_ACTIONS.UPDATE, resource: 'tenant_twilio', resourceId: tenantId },
  });
  await prisma.onboardingProgress.updateMany({
    where: { tenantId, connectedTwilio: false },
    data: { connectedTwilio: true },
  });
  return { configured: true };
};

export const updateWhatsApp = async (tenantId: string, data: z.infer<typeof UpdateWhatsAppSchema>) => {
  await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      whatsappAccessToken: encrypt(data.whatsappAccessToken),
      whatsappPhoneNumberId: data.whatsappPhoneNumberId,
    },
  });
  return { configured: true };
};

// ─── Team Management ──────────────────────────────────────────────────────────

export const listUsers = async (tenantId: string) => {
  return prisma.user.findMany({
    where: { tenantId },
    select: { id: true, email: true, firstName: true, lastName: true, role: true, status: true, phone: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  });
};

export const InviteUserSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1),
  lastName: z.string().optional(),
  role: z.enum(['ADMIN', 'MANAGER', 'AGENT']).default('AGENT'),
  password: z.string().min(8),
});

export const inviteUser = async (tenantId: string, data: z.infer<typeof InviteUserSchema>) => {
  const existing = await prisma.user.findUnique({ where: { tenantId_email: { tenantId, email: data.email.toLowerCase() } } });
  if (existing) throw new AppError(409, 'ALREADY_EXISTS', 'A user with this email already exists');

  const bcrypt = await import('bcryptjs');
  return prisma.user.create({
    data: {
      tenantId,
      email: data.email.toLowerCase(),
      passwordHash: await bcrypt.hash(data.password, 12),
      firstName: data.firstName,
      lastName: data.lastName,
      role: data.role,
      status: 'ACTIVE',
    },
    select: { id: true, email: true, firstName: true, lastName: true, role: true, status: true },
  });
};

export const UpdateUserRoleSchema = z.object({
  role: z.enum(['ADMIN', 'MANAGER', 'AGENT']).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
});

export const updateUserRole = async (tenantId: string, targetUserId: string, data: z.infer<typeof UpdateUserRoleSchema>) => {
  const user = await prisma.user.findFirst({ where: { id: targetUserId, tenantId } });
  if (!user) throw new AppError(404, 'NOT_FOUND', 'User not found');
  if (user.role === 'OWNER') throw new AppError(403, 'FORBIDDEN', 'Cannot change owner role');
  return prisma.user.update({
    where: { id: targetUserId },
    data,
    select: { id: true, email: true, firstName: true, lastName: true, role: true, status: true },
  });
};

export const removeUser = async (tenantId: string, targetUserId: string) => {
  const user = await prisma.user.findFirst({ where: { id: targetUserId, tenantId } });
  if (!user) throw new AppError(404, 'NOT_FOUND', 'User not found');
  if (user.role === 'OWNER') throw new AppError(403, 'FORBIDDEN', 'Cannot remove tenant owner');
  await prisma.user.update({ where: { id: targetUserId }, data: { status: 'INACTIVE' } });
};
