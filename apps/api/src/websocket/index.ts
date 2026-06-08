import { Server as HttpServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import { env } from '@/config/env';
import { verifyAccessToken } from '@/utils/jwt';
import { logger } from '@/utils/logger';

let io: SocketServer;

export const initializeWebSocket = (httpServer: HttpServer): void => {
  io = new SocketServer(httpServer, {
    cors: { origin: env.WEB_URL, credentials: true },
    transports: ['websocket', 'polling'],
  });

  // Authenticate socket connections via JWT
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('Authentication required'));

    try {
      const payload = verifyAccessToken(token);
      (socket as any).userId = payload.sub;
      (socket as any).tenantId = payload.tenantId;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const tenantId = (socket as any).tenantId;
    const userId = (socket as any).userId;

    // Each user joins their tenant room for scoped broadcasts
    socket.join(`tenant:${tenantId}`);
    socket.join(`user:${userId}`);

    logger.debug('WebSocket connected', { userId, tenantId });

    socket.on('disconnect', () => {
      logger.debug('WebSocket disconnected', { userId });
    });
  });

  logger.info('WebSocket server initialized');
};

export const getIo = (): SocketServer => {
  if (!io) throw new Error('WebSocket not initialized');
  return io;
};

export const emitToTenant = (tenantId: string, event: string, data: unknown): void => {
  getIo().to(`tenant:${tenantId}`).emit(event, data);
};

export const emitToUser = (userId: string, event: string, data: unknown): void => {
  getIo().to(`user:${userId}`).emit(event, data);
};
