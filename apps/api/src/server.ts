import 'dotenv/config';
import { createServer } from 'http';
import { env } from '@/config/env';
import { createApp } from '@/app';
import { initializeWebSocket } from '@/websocket';
import { initializeQueues } from '@/queue';
import { redis } from '@/db/redis';
import prisma from '@/db/client';
import { logger } from '@/utils/logger';

const start = async () => {
  try {
    // Validate DB connection
    await prisma.$connect();
    logger.info('Database connected');

    // Validate Redis connection
    await redis.connect();

    const app = createApp();
    const httpServer = createServer(app);

    // WebSocket
    initializeWebSocket(httpServer);

    // Background queues
    initializeQueues();

    httpServer.listen(env.API_PORT, '0.0.0.0', () => {
      logger.info(`API server running on port ${env.API_PORT} [${env.NODE_ENV}]`);
    });

    const shutdown = async (signal: string) => {
      logger.info(`Received ${signal}, shutting down gracefully`);
      httpServer.close(async () => {
        await prisma.$disconnect();
        await redis.quit();
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (err) {
    logger.error('Failed to start server: ' + String(err));
    if (err instanceof Error) logger.error(err.stack ?? err.message);
    process.exit(1);
  }
};

start();
