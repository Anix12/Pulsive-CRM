import bcrypt from 'bcryptjs';
import prisma from '@/db/client';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '@/utils/jwt';
import { AppError } from '@/middleware/errorHandler';
import { RegisterInput, LoginInput } from './auth.types';

const slugify = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .substring(0, 50);

const makeUniqueSlug = async (base: string): Promise<string> => {
  let slug = slugify(base);
  let exists = await prisma.tenant.findUnique({ where: { slug } });
  let i = 1;
  while (exists) {
    slug = `${slugify(base)}-${i++}`;
    exists = await prisma.tenant.findUnique({ where: { slug } });
  }
  return slug;
};

export const register = async (input: RegisterInput) => {
  const slug = await makeUniqueSlug(input.companyName);

  const tenant = await prisma.tenant.create({
    data: {
      name: input.companyName,
      slug,
      companyName: input.companyName,
      dealStages: {
        createMany: {
          data: [
            { name: 'New Lead', order: 1, probability: 10, color: '#94A3B8' },
            { name: 'Contacted', order: 2, probability: 25, color: '#60A5FA' },
            { name: 'Qualified', order: 3, probability: 50, color: '#A78BFA' },
            { name: 'Proposal Sent', order: 4, probability: 70, color: '#F59E0B' },
            { name: 'Won', order: 5, probability: 100, color: '#34D399', isWon: true },
            { name: 'Lost', order: 6, probability: 0, color: '#F87171', isLost: true },
          ],
        },
      },
      onboarding: { create: {} },
    },
  });

  const user = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      email: input.email.toLowerCase(),
      passwordHash: await bcrypt.hash(input.password, 12),
      firstName: input.firstName,
      lastName: input.lastName,
      role: 'OWNER',
    },
  });

  return generateTokens(user);
};

export const login = async (input: LoginInput) => {
  const user = await prisma.user.findFirst({
    where: { email: input.email.toLowerCase(), status: 'ACTIVE' },
    include: { tenant: { select: { status: true } } },
  });

  if (!user || !(await bcrypt.compare(input.password, user.passwordHash))) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
  }

  if (user.tenant.status !== 'ACTIVE') {
    throw new AppError(403, 'TENANT_INACTIVE', 'Account is not active');
  }

  return generateTokens(user);
};

export const refreshTokens = async (refreshToken: string) => {
  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw new AppError(401, 'INVALID_REFRESH_TOKEN', 'Invalid or expired refresh token');
  }

  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user || !user.refreshTokenHash) {
    throw new AppError(401, 'INVALID_REFRESH_TOKEN', 'Refresh token revoked');
  }

  const isValid = await bcrypt.compare(refreshToken, user.refreshTokenHash);
  if (!isValid) {
    throw new AppError(401, 'INVALID_REFRESH_TOKEN', 'Refresh token mismatch');
  }

  return generateTokens(user);
};

export const logout = async (userId: string) => {
  await prisma.user.update({
    where: { id: userId },
    data: { refreshTokenHash: null },
  });
};

const generateTokens = async (user: { id: string; tenantId: string; role: string; email: string; firstName: string; lastName: string }) => {
  const tokenPayload = { sub: user.id, tenantId: user.tenantId, role: user.role };
  const accessToken = signAccessToken(tokenPayload);
  const refreshToken = signRefreshToken(tokenPayload);

  await prisma.user.update({
    where: { id: user.id },
    data: { refreshTokenHash: await bcrypt.hash(refreshToken, 10) },
  });

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      tenantId: user.tenantId,
    },
  };
};
