import bcrypt from 'bcryptjs';
import prisma from '@/db/client';
import { AppError } from '@/middleware/errorHandler';
import { signAccessToken, signSuperAdminToken, verifySuperAdminToken } from '@/utils/jwt';
import { auditImpersonation } from '@/middleware/audit';
import { getPagination } from '@/utils/pagination';
import { paginationMeta } from '@/utils/response';
import { Request } from 'express';

export const adminLogin = async (email: string, password: string) => {
  const admin = await prisma.superAdmin.findUnique({ where: { email, isActive: true } });
  if (!admin || !(await bcrypt.compare(password, admin.passwordHash))) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid credentials');
  }
  return { token: signSuperAdminToken(admin.id), admin: { id: admin.id, email: admin.email, name: admin.name } };
};

export const listTenants = async (req: Request) => {
  const { page, limit, skip } = getPagination(req);
  const { search, status } = req.query as Record<string, string>;
  const where: any = {};
  if (status) where.status = status;
  if (search) where.OR = [
    { name: { contains: search, mode: 'insensitive' } },
    { slug: { contains: search, mode: 'insensitive' } },
  ];

  const [tenants, total] = await Promise.all([
    prisma.tenant.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { users: true, contacts: true, deals: true } } },
    }),
    prisma.tenant.count({ where }),
  ]);

  return { tenants, meta: paginationMeta(total, page, limit) };
};

export const getTenant = async (tenantId: string) => {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: {
      users: { select: { id: true, email: true, firstName: true, lastName: true, role: true, status: true } },
      onboarding: true,
      _count: { select: { contacts: true, deals: true, calls: true, messages: true } },
    },
  });
  if (!tenant) throw new AppError(404, 'NOT_FOUND', 'Tenant not found');
  return tenant;
};

export const impersonateTenant = async (superAdminId: string, tenantId: string, userId?: string) => {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) throw new AppError(404, 'NOT_FOUND', 'Tenant not found');

  let targetUser;
  if (userId) {
    targetUser = await prisma.user.findFirst({ where: { id: userId, tenantId } });
  } else {
    targetUser = await prisma.user.findFirst({ where: { tenantId, role: 'OWNER', status: 'ACTIVE' } });
  }

  if (!targetUser) throw new AppError(404, 'NOT_FOUND', 'No valid user found for impersonation');

  const accessToken = signAccessToken({ sub: targetUser.id, tenantId, role: targetUser.role });

  await auditImpersonation(superAdminId, tenantId, 'IMPERSONATE_LOGIN', {
    targetUserId: targetUser.id,
    targetUserEmail: targetUser.email,
  });

  return { accessToken, user: { id: targetUser.id, email: targetUser.email, tenantId } };
};

export const updateTenantStatus = async (superAdminId: string, tenantId: string, status: string) => {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) throw new AppError(404, 'NOT_FOUND', 'Tenant not found');

  await auditImpersonation(superAdminId, tenantId, 'STATUS_CHANGE', { from: tenant.status, to: status });

  return prisma.tenant.update({ where: { id: tenantId }, data: { status: status as any } });
};

export const getImpersonationLogs = async (superAdminId?: string, tenantId?: string, req?: Request) => {
  const page = req ? getPagination(req).page : 1;
  const limit = req ? getPagination(req).limit : 50;
  const skip = (page - 1) * limit;

  const where: any = {};
  if (superAdminId) where.superAdminId = superAdminId;
  if (tenantId) where.tenantId = tenantId;

  const [logs, total] = await Promise.all([
    prisma.impersonationLog.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: { superAdmin: { select: { id: true, name: true, email: true } } },
    }),
    prisma.impersonationLog.count({ where }),
  ]);

  return { logs, meta: paginationMeta(total, page, limit) };
};

export const getAuditLogs = async (tenantId: string, req: Request) => {
  const { page, limit, skip } = getPagination(req);
  const { resource, userId, action } = req.query as Record<string, string>;

  const where: any = { tenantId };
  if (resource) where.resource = resource;
  if (userId) where.userId = userId;
  if (action) where.action = action;

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
    }),
    prisma.auditLog.count({ where }),
  ]);

  return { logs, meta: paginationMeta(total, page, limit) };
};
