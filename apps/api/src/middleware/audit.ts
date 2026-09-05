import { Request, Response, NextFunction } from 'express';
import prisma from '@/db/client';
import { logger } from '@/utils/logger';

interface AuditOptions {
  action: string;
  resource: string;
  getResourceId?: (req: Request) => string | undefined;
}

export const auditLog = (options: AuditOptions) => {
  return async (req: Request, _res: Response, next: NextFunction) => {
    // Fire-and-forget after response — attach to res.on('finish')
    const originalEnd = _res.end.bind(_res);
    (_res as any).end = async (...args: any[]) => {
      originalEnd(...args);

      if (_res.statusCode >= 400) return; // Only log successful operations

      try {
        const tenantId = req.tenantId;
        const userId = req.user?.id;
        if (!tenantId) return;

        await prisma.auditLog.create({
          data: {
            tenantId,
            userId: userId || null,
            action: options.action,
            resource: options.resource,
            resourceId: options.getResourceId?.(req),
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
            metadata: {
              method: req.method,
              path: req.path,
              isApiKeyAuth: req.isApiKeyAuth || false,
            },
          },
        });
      } catch (err) {
        logger.error('Failed to write audit log', { err });
      }
    };

    next();
  };
};

export const auditImpersonation = async (
  superAdminId: string,
  tenantId: string,
  action: string,
  metadata?: object,
) => {
  try {
    await prisma.impersonationLog.create({
      data: {
        superAdminId,
        tenantId,
        action,
        metadata: metadata || {},
      },
    });
  } catch (err) {
    logger.error('Failed to write impersonation log', { err });
  }
};
