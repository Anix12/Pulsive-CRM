import prisma from '@/db/client';
import { decrypt } from '@/utils/crypto';
import { logger } from '@/utils/logger';
import { isPageTokenValid } from '@/providers/facebook/graph';
import { createNotification } from '@/modules/notifications/notifications.service';

// Facebook Page tokens obtained via a long-lived user token don't expire
// under normal use, but they do get invalidated if the connecting user
// changes their Facebook password, revokes the app, or the Page is
// unpublished — none of which we're told about. Without this check, leads
// would silently stop flowing in with no signal to the tenant (see
// webhooks.controller.ts's error logging on the receiving end for the other
// half of this fix). Runs once a day; see queue/index.ts for the schedule.
export const checkFacebookTokens = async (): Promise<void> => {
  const integrations = await prisma.integration.findMany({
    where: { type: 'FACEBOOK_LEADS', isActive: true },
  });

  for (const integration of integrations) {
    const cfg = integration.config as any;
    if (!cfg?.pageId || !cfg?.pageAccessTokenEnc) continue;

    try {
      const token = decrypt(cfg.pageAccessTokenEnc);
      const valid = await isPageTokenValid(cfg.pageId, token);
      const wasInvalid = cfg.tokenStatus === 'invalid';

      if (!valid && !wasInvalid) {
        await prisma.integration.update({
          where: { id: integration.id },
          data: { config: { ...cfg, tokenStatus: 'invalid' } },
        });

        const admins = await prisma.user.findMany({
          where: { tenantId: integration.tenantId, role: { in: ['OWNER', 'ADMIN'] }, status: 'ACTIVE' },
          select: { id: true },
        });
        for (const admin of admins) {
          await createNotification(integration.tenantId, admin.id, {
            type: 'INTEGRATION_TOKEN_EXPIRED',
            title: 'Facebook Lead Ads disconnected',
            body: `Access to your Facebook Page "${cfg.pageName || 'Unknown'}" has expired or was revoked. Reconnect it in Settings → Integrations to keep receiving leads.`,
            link: '/dashboard/integrations',
          });
        }
        logger.warn(`Facebook Page token invalid for tenant ${integration.tenantId}, page ${cfg.pageId} — notified admins`);
      } else if (valid && wasInvalid) {
        await prisma.integration.update({
          where: { id: integration.id },
          data: { config: { ...cfg, tokenStatus: 'valid' } },
        });
      }
    } catch (err) {
      logger.error(`Facebook token check failed for integration ${integration.id}`, { err });
    }
  }
};
