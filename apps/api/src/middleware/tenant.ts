import { Request, Response, NextFunction } from 'express';
import prisma from '@/db/client';
import { sendError } from '@/utils/response';

/**
 * Verifies the tenant is active after authentication.
 * Must run after authenticate middleware.
 */
export const requireActiveTenant = async (req: Request, res: Response, next: NextFunction) => {
  if (!req.tenantId) {
    return sendError(res, 401, 'UNAUTHORIZED', 'Tenant context missing');
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: req.tenantId },
    select: { id: true, status: true },
  });

  if (!tenant || tenant.status !== 'ACTIVE') {
    return sendError(res, 403, 'TENANT_INACTIVE', 'Tenant account is not active');
  }

  next();
};
