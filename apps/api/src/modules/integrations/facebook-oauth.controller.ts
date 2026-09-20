import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { env } from '@/config/env';
import prisma from '@/db/client';
import { redis } from '@/db/redis';
import { encrypt, decrypt } from '@/utils/crypto';
import { logger } from '@/utils/logger';
import { sendSuccess, sendError } from '@/utils/response';
import { AppError } from '@/middleware/errorHandler';
import { signFacebookOAuthState, verifyFacebookOAuthState } from '@/utils/jwt';
import {
  buildOAuthUrl,
  exchangeCodeForUserToken,
  exchangeForLongLivedUserToken,
  listManagedPages,
  subscribePageToLeadgen,
  unsubscribePage,
} from '@/providers/facebook/graph';

const redirectUri = () => `${env.API_URL}/api/v1/integrations/facebook/callback`;
const pendingKey = (id: string) => `fb:pending-connect:${id}`;

// Step 1 — tenant clicks "Connect with Facebook"; we hand back Meta's OAuth
// dialog URL. See buildOAuthUrl() in providers/facebook/graph.ts for scopes.
export const connect = async (req: Request, res: Response) => {
  if (!env.FACEBOOK_APP_ID || !env.FACEBOOK_APP_SECRET) {
    return sendError(res, 503, 'NOT_CONFIGURED', 'Facebook integration is not configured on this server');
  }
  const state = signFacebookOAuthState(req.tenantId!);
  const authUrl = buildOAuthUrl(redirectUri(), state);
  sendSuccess(res, { authUrl });
};

// Step 2 — Meta redirects the tenant's browser here (public, no auth header).
// We exchange the code, list the pages they manage, and stash the (still
// server-side only) page tokens behind a short-lived opaque id so the
// browser only ever sees that id, not real access tokens, before redirecting
// back into the app for page selection.
export const callback = async (req: Request, res: Response) => {
  const { code, state, error: fbError } = req.query as Record<string, string>;
  const failRedirect = (reason: string) =>
    res.redirect(`${env.WEB_URL}/dashboard/integrations?fbError=${encodeURIComponent(reason)}`);

  if (fbError) return failRedirect('Facebook authorization was cancelled or denied');
  if (!code || !state) return failRedirect('Missing authorization code');

  let tenantId: string;
  try {
    tenantId = verifyFacebookOAuthState(state).tenantId;
  } catch {
    return failRedirect('This connection link expired — please try again');
  }

  try {
    const shortLivedToken = await exchangeCodeForUserToken(code, redirectUri());
    const longLivedToken = await exchangeForLongLivedUserToken(shortLivedToken);
    const pages = await listManagedPages(longLivedToken);

    if (pages.length === 0) {
      return failRedirect('No Facebook Pages found for this account — you need to be an admin of at least one Page');
    }

    const selectionId = crypto.randomUUID();
    await redis.set(
      pendingKey(selectionId),
      JSON.stringify({ tenantId, pages }),
      'EX',
      600,
    );

    res.redirect(`${env.WEB_URL}/dashboard/integrations?fbConnect=${selectionId}`);
  } catch (err) {
    logger.error('Facebook OAuth callback failed', { err });
    failRedirect('Could not complete the Facebook connection — please try again');
  }
};

// Step 3 — frontend loads the pending page list (names only, tokens stay
// server-side) so the tenant can pick which Page to connect.
export const getPending = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const selectionId = req.params.selectionId as string;
    const raw = await redis.get(pendingKey(selectionId));
    if (!raw) throw new AppError(404, 'EXPIRED', 'This connection has expired — please reconnect with Facebook');

    const { tenantId, pages } = JSON.parse(raw) as { tenantId: string; pages: { id: string; name: string }[] };
    if (tenantId !== req.tenantId) throw new AppError(403, 'FORBIDDEN', 'This connection belongs to a different account');

    sendSuccess(res, { pages: pages.map((p) => ({ id: p.id, name: p.name })) });
  } catch (err) {
    next(err);
  }
};

// Step 4 — tenant picks a Page; we save its (encrypted) access token and
// auto-subscribe it to leadgen webhooks, so no manual Meta Dashboard step
// is required at all.
export const selectPage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { selectionId, pageId } = req.body as { selectionId?: string; pageId?: string };
    if (!selectionId || !pageId) throw new AppError(422, 'VALIDATION_ERROR', 'selectionId and pageId are required');

    const raw = await redis.get(pendingKey(selectionId));
    if (!raw) throw new AppError(404, 'EXPIRED', 'This connection has expired — please reconnect with Facebook');

    const { tenantId, pages } = JSON.parse(raw) as {
      tenantId: string;
      pages: { id: string; name: string; access_token: string }[];
    };
    if (tenantId !== req.tenantId) throw new AppError(403, 'FORBIDDEN', 'This connection belongs to a different account');

    const page = pages.find((p) => p.id === pageId);
    if (!page) throw new AppError(404, 'NOT_FOUND', 'That Page was not found in this connection — please reconnect');

    await subscribePageToLeadgen(page.id, page.access_token);

    const integration = await prisma.integration.upsert({
      where: { tenantId_type: { tenantId, type: 'FACEBOOK_LEADS' } },
      update: {
        isActive: true,
        externalId: page.id,
        config: { pageId: page.id, pageName: page.name, pageAccessTokenEnc: encrypt(page.access_token), tokenStatus: 'valid', connectedAt: new Date().toISOString() },
      },
      create: {
        tenantId,
        type: 'FACEBOOK_LEADS',
        isActive: true,
        externalId: page.id,
        config: { pageId: page.id, pageName: page.name, pageAccessTokenEnc: encrypt(page.access_token), tokenStatus: 'valid', connectedAt: new Date().toISOString() },
      },
    });

    await redis.del(pendingKey(selectionId));

    sendSuccess(res, { type: integration.type, isActive: integration.isActive, pageName: page.name });
  } catch (err) {
    next(err);
  }
};

export const disconnect = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const existing = await prisma.integration.findUnique({
      where: { tenantId_type: { tenantId: req.tenantId!, type: 'FACEBOOK_LEADS' } },
    });
    if (existing) {
      const cfg = existing.config as any;
      if (cfg?.pageId && cfg?.pageAccessTokenEnc) {
        await unsubscribePage(cfg.pageId, decrypt(cfg.pageAccessTokenEnc));
      }
      await prisma.integration.update({
        where: { id: existing.id },
        data: { isActive: false, externalId: null, config: {} },
      });
    }
    sendSuccess(res, { message: 'Disconnected' });
  } catch (err) {
    next(err);
  }
};
