import jwt from 'jsonwebtoken';
import { env } from '@/config/env';

export interface JwtPayload {
  sub: string;       // userId
  tenantId: string;
  role: string;
  type: 'access' | 'refresh';
}

export interface SuperAdminJwtPayload {
  sub: string;
  type: 'super_admin';
  impersonatingTenantId?: string;
}

export const signAccessToken = (payload: Omit<JwtPayload, 'type'>): string => {
  return jwt.sign({ ...payload, type: 'access' }, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN,
  } as jwt.SignOptions);
};

export const signRefreshToken = (payload: Omit<JwtPayload, 'type'>): string => {
  return jwt.sign({ ...payload, type: 'refresh' }, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN,
  } as jwt.SignOptions);
};

export const verifyAccessToken = (token: string): JwtPayload => {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtPayload;
};

export const verifyRefreshToken = (token: string): JwtPayload => {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as JwtPayload;
};

export const signSuperAdminToken = (adminId: string): string => {
  return jwt.sign({ sub: adminId, type: 'super_admin' }, env.SUPER_ADMIN_JWT_SECRET, {
    expiresIn: '8h',
  });
};

export const verifySuperAdminToken = (token: string): SuperAdminJwtPayload => {
  return jwt.verify(token, env.SUPER_ADMIN_JWT_SECRET) as SuperAdminJwtPayload;
};
