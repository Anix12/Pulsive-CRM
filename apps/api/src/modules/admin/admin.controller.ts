import { Request, Response, NextFunction } from 'express';
import * as service from './admin.service';
import { sendSuccess } from '@/utils/response';

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    sendSuccess(res, await service.adminLogin(req.body.email, req.body.password));
  } catch (err) { next(err); }
};

export const listTenants = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenants, meta } = await service.listTenants(req);
    sendSuccess(res, tenants, 200, meta);
  } catch (err) { next(err); }
};

export const getTenant = async (req: Request, res: Response, next: NextFunction) => {
  try {
    sendSuccess(res, await service.getTenant(req.params.tenantId));
  } catch (err) { next(err); }
};

export const impersonateTenant = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await service.impersonateTenant(req.superAdminId!, req.params.tenantId, req.body.userId);
    sendSuccess(res, result);
  } catch (err) { next(err); }
};

export const updateTenantStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    sendSuccess(res, await service.updateTenantStatus(req.superAdminId!, req.params.tenantId, req.body.status));
  } catch (err) { next(err); }
};

export const getImpersonationLogs = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { logs, meta } = await service.getImpersonationLogs(undefined, req.query.tenantId as string, req);
    sendSuccess(res, logs, 200, meta);
  } catch (err) { next(err); }
};

export const getAuditLogs = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { logs, meta } = await service.getAuditLogs(req.params.tenantId, req);
    sendSuccess(res, logs, 200, meta);
  } catch (err) { next(err); }
};
