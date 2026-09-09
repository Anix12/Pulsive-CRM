import prisma from '@/db/client';
import { AppError } from '@/middleware/errorHandler';
import { getPagination } from '@/utils/pagination';
import { paginationMeta } from '@/utils/response';
import { AUDIT_ACTIONS } from '@/config/constants';
import { Request } from 'express';
import { CreateBookingInput, UpdateBookingInput } from './real-estate.types';
import * as stageService from './real-estate-stage.service';

const includeRelations = {
  contact: { select: { id: true, name: true, phone: true } },
  project: { select: { id: true, name: true } },
  unit: { select: { id: true, unitNumber: true, price: true } },
  agent: { select: { id: true, firstName: true, lastName: true } },
};

export const list = async (tenantId: string, req: Request) => {
  const { page, limit, skip } = getPagination(req);
  const { status, projectId, agentId, contactId } = req.query as Record<string, string>;

  const where: any = { tenantId };
  if (status) where.status = status;
  if (projectId) where.projectId = projectId;
  if (agentId) where.agentId = agentId;
  if (contactId) where.contactId = contactId;

  const [bookings, total] = await Promise.all([
    prisma.booking.findMany({ where, skip, take: limit, orderBy: { bookingDate: 'desc' }, include: includeRelations }),
    prisma.booking.count({ where }),
  ]);

  return { bookings, meta: paginationMeta(total, page, limit) };
};

export const stats = async (tenantId: string) => {
  const bookings = await prisma.booking.findMany({
    where: { tenantId, status: { not: 'CANCELLED' } },
    select: { status: true, totalAmount: true, brokerageAmount: true, brokerageReceived: true },
  });

  const num = (d: any) => Number(d ?? 0);
  const countByStage = (stage: string) => bookings.filter((b) => b.status === stage).length;

  const totalDealValue = bookings.reduce((s, b) => s + num(b.totalAmount), 0);
  const totalBrokerage = bookings.reduce((s, b) => s + num(b.brokerageAmount), 0);
  const brokerageReceived = bookings.reduce((s, b) => s + num(b.brokerageReceived), 0);

  return {
    tokenReceived: countByStage('TOKEN_RECEIVED'),
    booked: countByStage('BOOKED'),
    agreementDone: countByStage('AGREEMENT_DONE'),
    registered: countByStage('REGISTERED'),
    totalDealValue,
    totalBrokerage,
    brokeragePending: Math.max(0, totalBrokerage - brokerageReceived),
  };
};

export const getById = async (tenantId: string, id: string) => {
  const booking = await prisma.booking.findFirst({ where: { id, tenantId }, include: includeRelations });
  if (!booking) throw new AppError(404, 'NOT_FOUND', 'Booking not found');
  return booking;
};

const computeBrokerage = (totalAmount?: number, brokeragePercent?: number, brokerageAmount?: number) => {
  if (brokerageAmount != null) return brokerageAmount;
  if (totalAmount != null && brokeragePercent != null) return Math.round((totalAmount * brokeragePercent) / 100);
  return undefined;
};

export const create = async (tenantId: string, userId: string, input: CreateBookingInput) => {
  const unit = await prisma.unit.findFirst({ where: { id: input.unitId, tenantId } });
  if (!unit) throw new AppError(404, 'NOT_FOUND', 'Unit not found');

  const [booking] = await prisma.$transaction([
    prisma.booking.create({
      data: {
        tenantId,
        contactId: input.contactId,
        projectId: input.projectId,
        unitId: input.unitId,
        agentId: input.agentId || undefined,
        bookingAmount: input.bookingAmount,
        totalAmount: input.totalAmount,
        status: input.status,
        brokeragePercent: input.brokeragePercent,
        brokerageAmount: computeBrokerage(input.totalAmount, input.brokeragePercent, input.brokerageAmount),
        brokerageReceived: input.brokerageReceived,
        bookingDate: input.bookingDate ? new Date(input.bookingDate) : undefined,
      },
      include: includeRelations,
    }),
    prisma.unit.update({ where: { id: input.unitId }, data: { status: 'BOOKED' } }),
  ]);

  await prisma.auditLog.create({
    data: { tenantId, userId, action: AUDIT_ACTIONS.CREATE, resource: 're_bookings', resourceId: booking.id, after: booking as any },
  });

  await stageService.advanceStage(tenantId, booking.contactId, 'BOOKING', 'BOOKING_CREATED');

  return booking;
};

export const update = async (tenantId: string, userId: string, id: string, input: UpdateBookingInput) => {
  const existing = await prisma.booking.findFirst({ where: { id, tenantId } });
  if (!existing) throw new AppError(404, 'NOT_FOUND', 'Booking not found');

  const data: any = { ...input };
  if (input.bookingDate) data.bookingDate = new Date(input.bookingDate);
  if ('agentId' in data && !data.agentId) data.agentId = null;

  const totalAmount = input.totalAmount ?? Number(existing.totalAmount ?? 0);
  const brokeragePercent = input.brokeragePercent ?? (existing.brokeragePercent != null ? Number(existing.brokeragePercent) : undefined);
  if (input.brokeragePercent != null || input.totalAmount != null) {
    const computed = computeBrokerage(totalAmount, brokeragePercent, input.brokerageAmount);
    if (computed != null) data.brokerageAmount = computed;
  }

  const updated = await prisma.booking.update({ where: { id }, data, include: includeRelations });

  if (input.status === 'CANCELLED' && existing.status !== 'CANCELLED') {
    await prisma.unit.update({ where: { id: existing.unitId }, data: { status: 'AVAILABLE' } });
    // Intentionally no stage change here — a cancelled booking doesn't always mean a
    // lost lead (e.g. they may rebook a different unit), so a human decides that call.
  } else if (input.status === 'REGISTERED' && existing.status !== 'REGISTERED') {
    await prisma.unit.update({ where: { id: existing.unitId }, data: { status: 'SOLD' } });
    await stageService.advanceStage(tenantId, existing.contactId, 'CLOSED_WON', 'BOOKING_REGISTERED');
  }

  await prisma.auditLog.create({
    data: { tenantId, userId, action: AUDIT_ACTIONS.UPDATE, resource: 're_bookings', resourceId: id, before: existing as any, after: updated as any },
  });

  return updated;
};

export const remove = async (tenantId: string, userId: string, id: string) => {
  const existing = await prisma.booking.findFirst({ where: { id, tenantId } });
  if (!existing) throw new AppError(404, 'NOT_FOUND', 'Booking not found');

  await prisma.booking.delete({ where: { id } });

  await prisma.auditLog.create({
    data: { tenantId, userId, action: AUDIT_ACTIONS.DELETE, resource: 're_bookings', resourceId: id, before: existing as any },
  });
};
