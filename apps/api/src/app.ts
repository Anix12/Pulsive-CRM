import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import * as Sentry from '@sentry/node';
import { env } from '@/config/env';
import { globalRateLimiter } from '@/middleware/rateLimiter';
import { errorHandler, notFoundHandler } from '@/middleware/errorHandler';
import { logger } from '@/utils/logger';

// Route imports
import authRoutes from '@/modules/auth/auth.routes';
import tenantRoutes from '@/modules/tenants/tenants.routes';
import contactRoutes from '@/modules/contacts/contacts.routes';
import dealRoutes from '@/modules/deals/deals.routes';
import programRoutes from '@/modules/programs/programs.routes';
import applicationRoutes from '@/modules/applications/applications.routes';
import callRoutes from '@/modules/calls/calls.routes';
import messagingRoutes from '@/modules/messaging/messaging.routes';
import workflowRoutes from '@/modules/workflows/workflows.routes';
import reportRoutes from '@/modules/reports/reports.routes';
import adminRoutes from '@/modules/admin/admin.routes';
import apiKeyRoutes from '@/modules/api-keys/api-keys.routes';
import integrationRoutes from '@/modules/integrations/integrations.routes';
import webhookRoutes from '@/modules/webhooks/webhooks.routes';
import settingsRoutes from '@/modules/settings/settings.routes';
import presenceRoutes from '@/modules/presence/presence.routes';
import notificationRoutes from '@/modules/notifications/notifications.routes';
import taskRoutes from '@/modules/tasks/tasks.routes';
import campaignRoutes from '@/modules/campaigns/campaigns.routes';
import broadcastRoutes from '@/modules/broadcasts/broadcasts.routes';
import marketingRoutes from '@/modules/marketing/marketing.routes';
import forecastRoutes from '@/modules/forecast/forecast.routes';

if (env.SENTRY_DSN) {
  Sentry.init({ dsn: env.SENTRY_DSN, environment: env.NODE_ENV });
}

export const createApp = () => {
  const app = express();

  // Security
  app.use(helmet());
  app.use(cors({ origin: env.WEB_URL, credentials: true }));

  // Request parsing — stash raw body so webhook handlers can verify HMAC signatures
  app.use(express.json({
    limit: '10mb',
    verify: (req: any, _res, buf) => { req.rawBody = buf; },
  }));
  app.use(express.urlencoded({ extended: true }));
  app.use(compression() as any);

  // Logging
  app.use(
    morgan('combined', {
      stream: { write: (msg) => logger.info(msg.trim()) },
      skip: (req) => req.path === '/health',
    }),
  );

  // Rate limiting
  app.use(globalRateLimiter);

  // Health check
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // API routes
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/tenants', tenantRoutes);
  app.use('/api/v1/contacts', contactRoutes);
  app.use('/api/v1/deals', dealRoutes);
  app.use('/api/v1/programs', programRoutes);
  app.use('/api/v1/applications', applicationRoutes);
  app.use('/api/v1/calls', callRoutes);
  app.use('/api/v1/messages', messagingRoutes);
  app.use('/api/v1/workflows', workflowRoutes);
  app.use('/api/v1/reports', reportRoutes);
  app.use('/api/v1/api-keys', apiKeyRoutes);
  app.use('/api/v1/admin', adminRoutes);
  app.use('/api/v1/integrations', integrationRoutes);
  app.use('/api/v1/webhooks', webhookRoutes);
  app.use('/api/v1/settings', settingsRoutes);
  app.use('/api/v1/presence', presenceRoutes);
  app.use('/api/v1/notifications', notificationRoutes);
  app.use('/api/v1/tasks', taskRoutes);
  app.use('/api/v1/campaigns', campaignRoutes);
  app.use('/api/v1/broadcasts', broadcastRoutes);
  app.use('/api/v1/marketing', marketingRoutes);
  app.use('/api/v1/forecast', forecastRoutes);

  // Error handling
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};
