import { Queue, Worker } from 'bullmq';
import Redis from 'ioredis';
import { env } from '@/config/env';
import { QUEUE_NAMES } from '@/config/constants';
import { logger } from '@/utils/logger';
import { processWorkflow } from './processors/workflow.processor';
import { syncGoogleSheets } from './processors/googleSheets.processor';

// BullMQ requires maxRetriesPerRequest: null
const connection = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null });

// Queues (exported for use in services)
export const workflowQueue = new Queue(QUEUE_NAMES.WORKFLOWS, { connection });
export const emailQueue = new Queue(QUEUE_NAMES.EMAIL, { connection });
export const googleSheetsSyncQueue = new Queue(QUEUE_NAMES.GOOGLE_SHEETS_SYNC, { connection });

export const initializeQueues = (): void => {
  const workflowWorker = new Worker(
    QUEUE_NAMES.WORKFLOWS,
    async (job) => processWorkflow(job),
    { connection, concurrency: 5 },
  );

  workflowWorker.on('completed', (job) => {
    logger.debug(`Workflow job ${job.id} completed`);
  });

  workflowWorker.on('failed', (job, err) => {
    logger.error(`Workflow job ${job?.id} failed`, { err });
  });

  const sheetsWorker = new Worker(
    QUEUE_NAMES.GOOGLE_SHEETS_SYNC,
    async () => syncGoogleSheets(),
    { connection, concurrency: 1 },
  );

  sheetsWorker.on('failed', (job, err) => {
    logger.error(`Google Sheets sync job ${job?.id} failed`, { err });
  });

  googleSheetsSyncQueue.add('sync', {}, { repeat: { every: 5 * 60 * 1000 }, removeOnComplete: 10, removeOnFail: 10 });

  logger.info('Queue workers initialized');
};
