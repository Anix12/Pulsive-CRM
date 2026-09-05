import { Job } from 'bullmq';
import prisma from '@/db/client';
import { logger } from '@/utils/logger';

interface WorkflowJobData {
  workflowId: string;
  tenantId: string;
  triggerData: Record<string, unknown>;
}

export const processWorkflow = async (job: Job<WorkflowJobData>): Promise<void> => {
  const { workflowId, tenantId, triggerData } = job.data;

  const execution = await prisma.workflowExecution.create({
    data: { workflowId, tenantId, status: 'RUNNING', triggerData },
  });

  try {
    const workflow = await prisma.workflow.findFirst({ where: { id: workflowId, tenantId, isActive: true } });
    if (!workflow) {
      await prisma.workflowExecution.update({ where: { id: execution.id }, data: { status: 'CANCELLED', completedAt: new Date() } });
      return;
    }

    const steps = workflow.steps as any[];
    for (const step of steps) {
      await prisma.workflowExecution.update({ where: { id: execution.id }, data: { currentStep: step.id } });
      await executeStep(step, tenantId, triggerData);
    }

    await Promise.all([
      prisma.workflowExecution.update({ where: { id: execution.id }, data: { status: 'COMPLETED', completedAt: new Date() } }),
      prisma.workflow.update({ where: { id: workflowId }, data: { runCount: { increment: 1 }, lastRunAt: new Date() } }),
    ]);
  } catch (err) {
    await prisma.workflowExecution.update({
      where: { id: execution.id },
      data: { status: 'FAILED', completedAt: new Date(), errorMessage: (err as Error).message },
    });
    throw err;
  }
};

const executeStep = async (step: any, tenantId: string, context: Record<string, unknown>): Promise<void> => {
  logger.debug('Executing workflow step', { type: step.type, tenantId });

  switch (step.type) {
    case 'WEBHOOK':
      if (step.config.url) {
        await fetch(step.config.url, {
          method: step.config.method || 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tenantId, context, step: step.id }),
        });
      }
      break;
    case 'WAIT':
      // Handled by BullMQ delay — placeholder for now
      break;
    default:
      logger.warn(`Unhandled workflow step type: ${step.type}`);
  }
};
