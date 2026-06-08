import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, verifySuperAdminToken } from '@/utils/jwt';
import { hashApiKey } from '@/utils/crypto';
import prisma from '@/db/client';
import { sendError } from '@/utils/response';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        tenantId: string;
        role: string;
        email: string;
      };
      tenantId?: string;
      isSuperAdmin?: boolean;
      superAdminId?: string;
      isApiKeyAuth?: boolean;
    }
  }
}

export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return sendError(res, 401, 'UNAUTHORIZED', 'Missing authorization header');
  }

  // API Key authentication
  if (authHeader.startsWith('ApiKey ')) {
    return authenticateApiKey(authHeader.substring(7), req, res, next);
  }

  // Bearer JWT authentication
  if (authHeader.startsWith('Bearer ')) {
    return authenticateJwt(authHeader.substring(7), req, res, next);
  }

  return sendError(res, 401, 'UNAUTHORIZED', 'Invalid authorization format');
};

const authenticateJwt = async (
  token: string,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const payload = verifyAccessToken(token);
    const user = await prisma.user.findFirst({
      where: { id: payload.sub, tenantId: payload.tenantId, status: 'ACTIVE' },
      select: { id: true, tenantId: true, role: true, email: true },
    });

    if (!user) {
      return sendError(res, 401, 'UNAUTHORIZED', 'User not found or inactive');
    }

    req.user = user;
    req.tenantId = user.tenantId;
    next();
  } catch {
    return sendError(res, 401, 'UNAUTHORIZED', 'Invalid or expired token');
  }
};

const authenticateApiKey = async (
  key: string,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const keyHash = hashApiKey(key);
    const apiKey = await prisma.apiKey.findUnique({
      where: { keyHash },
      include: { tenant: { select: { id: true, status: true } } },
    });

    if (!apiKey || !apiKey.isActive || apiKey.tenant.status !== 'ACTIVE') {
      return sendError(res, 401, 'UNAUTHORIZED', 'Invalid or inactive API key');
    }

    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
      return sendError(res, 401, 'UNAUTHORIZED', 'API key has expired');
    }

    await prisma.apiKey.update({
      where: { id: apiKey.id },
      data: { lastUsedAt: new Date() },
    });

    req.tenantId = apiKey.tenantId;
    req.isApiKeyAuth = true;
    next();
  } catch {
    return sendError(res, 401, 'UNAUTHORIZED', 'Invalid API key');
  }
};

export const authenticateSuperAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return sendError(res, 401, 'UNAUTHORIZED', 'Missing authorization header');
  }

  try {
    const payload = verifySuperAdminToken(authHeader.substring(7));
    const admin = await prisma.superAdmin.findUnique({
      where: { id: payload.sub, isActive: true },
    });

    if (!admin) {
      return sendError(res, 401, 'UNAUTHORIZED', 'Super admin not found or inactive');
    }

    req.isSuperAdmin = true;
    req.superAdminId = admin.id;
    next();
  } catch {
    return sendError(res, 401, 'UNAUTHORIZED', 'Invalid or expired super admin token');
  }
};

export const requireRole = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return sendError(res, 401, 'UNAUTHORIZED', 'Authentication required');
    }
    if (!roles.includes(req.user.role)) {
      return sendError(res, 403, 'FORBIDDEN', 'Insufficient permissions');
    }
    next();
  };
};
