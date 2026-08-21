import prisma from '@/db/client';
import { AppError } from '@/middleware/errorHandler';
import { getPagination } from '@/utils/pagination';
import { paginationMeta } from '@/utils/response';
import { AUDIT_ACTIONS } from '@/config/constants';
import { Request } from 'express';
import { CreateApplicationInput, UpdateApplicationInput } from './applications.types';

const CONTACT_SELECT = { id: true, name: true, phone: true, email: true } as const;
const PROGRAM_SELECT = { id: true, code: true, name: true } as const;

const FUNNEL_STAGES = ['SUBMITTED', 'UNDER_REVIEW', 'SHORTLISTED', 'OFFERED', 'ENROLLED'] as const;
const DECISION_STATUSES = ['OFFERED', 'ENROLLED', 'REJECTED'];

const generateAppNumber = async (tenantId: string): Promise<string> => {
  const year = new Date().getFullYear();
  for (let attempt = 0; attempt < 5; attempt++) {
    const rand = Math.floor(10000 + Math.random() * 90000);
    const candidate = `APP-${year}-${rand}`;
    const exists = await prisma.application.findFirst({ where: { tenantId, appNumber: candidate } });
    if (!exists) return candidate;
  }
  throw new AppError(500, 'APP_NUMBER_GEN_FAILED', 'Could not generate a unique application number, please try again');
};

export const list = async (tenantId: string, req: Request) => {
  const { page, limit, skip } = getPagination(req);
  const { search, status, programId } = req.query as Record<string, string>;

  const where: any = { tenantId };
  if (status) where.status = status;
  if (programId) where.programId = programId;
  if (search) {
    where.OR = [
      { appNumber: { contains: search, mode: 'insensitive' } },
      {
        contact: {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { phone: { contains: search } },
          ],
        },
      },
    ];
  }

  const [applications, total] = await Promise.all([
    prisma.application.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: { contact: { select: CONTACT_SELECT }, program: { select: PROGRAM_SELECT } },
    }),
    prisma.application.count({ where }),
  ]);

  return { applications, meta: paginationMeta(total, page, limit) };
};

export const funnel = async (tenantId: string) => {
  const groups = await prisma.application.groupBy({
    by: ['status'],
    where: { tenantId },
    _count: true,
  });

  const countFor = (status: string) => groups.find((g) => g.status === status)?._count ?? 0;

  const funnelStages = FUNNEL_STAGES.map((stage) => ({ stage, count: countFor(stage) }));
  const rejected = countFor('REJECTED');
  const total = funnelStages.reduce((sum, s) => sum + s.count, 0);

  return { funnel: funnelStages, total, rejected };
};

export const getById = async (tenantId: string, id: string) => {
  const application = await prisma.application.findFirst({
    where: { id, tenantId },
    include: { contact: { select: CONTACT_SELECT }, program: { select: PROGRAM_SELECT } },
  });
  if (!application) throw new AppError(404, 'NOT_FOUND', 'Application not found');
  return application;
};

export const create = async (tenantId: string, userId: string, input: CreateApplicationInput) => {
  const contact = await prisma.contact.findFirst({ where: { id: input.contactId, tenantId } });
  if (!contact) throw new AppError(404, 'NOT_FOUND', 'Contact not found');

  const program = await prisma.program.findFirst({ where: { id: input.programId, tenantId } });
  if (!program) throw new AppError(404, 'NOT_FOUND', 'Program not found');

  let appNumber = input.appNumber;
  if (appNumber) {
    const taken = await prisma.application.findFirst({ where: { tenantId, appNumber } });
    if (taken) throw new AppError(409, 'DUPLICATE_APP_NUMBER', `Application number "${appNumber}" is already in use`);
  } else {
    appNumber = await generateAppNumber(tenantId);
  }

  const application = await prisma.application.create({
    data: {
      tenantId,
      contactId: input.contactId,
      programId: input.programId,
      appNumber,
      notes: input.notes,
    },
    include: { contact: { select: CONTACT_SELECT }, program: { select: PROGRAM_SELECT } },
  });

  await Promise.all([
    prisma.activity.create({
      data: {
        tenantId,
        contactId: application.contactId,
        userId,
        type: 'NOTE',
        subject: `Application ${application.appNumber} submitted for ${program.name}`,
      },
    }),
    prisma.auditLog.create({
      data: { tenantId, userId, action: AUDIT_ACTIONS.CREATE, resource: 'applications', resourceId: application.id, after: application as any },
    }),
  ]);

  return application;
};

export const update = async (tenantId: string, userId: string, id: string, input: UpdateApplicationInput) => {
  const existing = await prisma.application.findFirst({ where: { id, tenantId } });
  if (!existing) throw new AppError(404, 'NOT_FOUND', 'Application not found');

  const statusChanged = !!input.status && input.status !== existing.status;

  const data: any = { ...input };
  if (statusChanged) {
    data.decidedAt = DECISION_STATUSES.includes(input.status as string) ? new Date() : null;
  }

  const updated = await prisma.application.update({
    where: { id },
    data,
    include: { contact: { select: CONTACT_SELECT }, program: { select: PROGRAM_SELECT } },
  });

  const ops: Promise<any>[] = [];
  if (statusChanged) {
    ops.push(
      prisma.activity.create({
        data: {
          tenantId,
          contactId: existing.contactId,
          userId,
          type: 'NOTE',
          subject: `Application status changed to ${input.status}`,
        },
      }),
    );
  }

  ops.push(
    prisma.auditLog.create({
      data: { tenantId, userId, action: AUDIT_ACTIONS.UPDATE, resource: 'applications', resourceId: id, before: existing as any, after: updated as any },
    }),
  );

  await Promise.all(ops);

  return updated;
};

export const remove = async (tenantId: string, userId: string, id: string) => {
  const existing = await prisma.application.findFirst({ where: { id, tenantId } });
  if (!existing) throw new AppError(404, 'NOT_FOUND', 'Application not found');

  await prisma.application.delete({ where: { id } });

  await prisma.auditLog.create({
    data: { tenantId, userId, action: AUDIT_ACTIONS.DELETE, resource: 'applications', resourceId: id, before: existing as any },
  });
};
