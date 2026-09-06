import prisma from '@/db/client';
import { AppError } from '@/middleware/errorHandler';
import { AUDIT_ACTIONS } from '@/config/constants';
import { parse } from 'csv-parse/sync';
import * as XLSX from 'xlsx';
import { CreateContactSchema } from '@/modules/contacts/contacts.types';

const isExcel = (filename: string, mimetype: string) =>
  /\.(xlsx|xls)$/i.test(filename) || mimetype.includes('spreadsheetml') || mimetype === 'application/vnd.ms-excel';

const parseRows = (buffer: Buffer, filename: string, mimetype: string): Record<string, string>[] => {
  if (isExcel(filename, mimetype)) {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    return XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false }) as Record<string, string>[];
  }
  return parse(buffer, { columns: true, skip_empty_lines: true, trim: true });
};

export const listLists = async (tenantId: string) => {
  const lists = await prisma.leadList.findMany({
    where: { tenantId },
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { members: true } } },
  });

  return Promise.all(
    lists.map(async (list) => {
      const memberIds = await prisma.leadListMember.findMany({
        where: { listId: list.id },
        select: { contactId: true },
      });
      const contactIds = memberIds.map((m) => m.contactId);

      const [callsMade, qualified] = contactIds.length
        ? await Promise.all([
            prisma.call.count({ where: { tenantId, contactId: { in: contactIds }, isAiInitiated: true } }),
            prisma.call.count({ where: { tenantId, contactId: { in: contactIds }, aiSuccessEvaluation: true } }),
          ])
        : [0, 0];

      return {
        id: list.id,
        name: list.name,
        sourceFileName: list.sourceFileName,
        createdAt: list.createdAt,
        totalLeads: list._count.members,
        callsMade,
        qualified,
      };
    }),
  );
};

export const importFile = async (
  tenantId: string,
  userId: string,
  fileBuffer: Buffer,
  originalFilename: string,
  mimetype: string,
  mapping: Record<string, string>,
) => {
  const rows = parseRows(fileBuffer, originalFilename, mimetype);

  const listName = originalFilename.replace(/\.[^.]+$/, '') || `Lead List ${new Date().toISOString().slice(0, 10)}`;
  const list = await prisma.leadList.create({
    data: { tenantId, name: listName, sourceFileName: originalFilename },
  });

  const imported: string[] = [];
  const errors: { row: number; error: string }[] = [];

  for (let i = 0; i < rows.length; i++) {
    const raw = rows[i];
    const mapped: Record<string, string> = {};
    for (const [col, contactField] of Object.entries(mapping)) {
      if (contactField && raw[col] !== undefined) {
        mapped[contactField] = raw[col];
      }
    }

    const result = CreateContactSchema.safeParse(mapped);
    if (!result.success) {
      errors.push({ row: i + 2, error: result.error.errors[0]?.message ?? 'Invalid row' });
      continue;
    }

    try {
      let contact = await prisma.contact.findFirst({
        where: {
          tenantId,
          OR: [
            { phone: result.data.phone },
            ...(result.data.email ? [{ email: result.data.email }] : []),
          ],
        },
      });

      if (!contact) {
        contact = await prisma.contact.create({
          data: { tenantId, ...result.data, tags: result.data.tags || [] } as any,
        });
      }

      await prisma.leadListMember.create({
        data: { listId: list.id, contactId: contact.id },
      });

      imported.push((i + 2).toString());
    } catch (err: any) {
      errors.push({ row: i + 2, error: err?.code === 'P2002' ? 'Already in list' : 'Failed to add' });
    }
  }

  if (imported.length > 0) {
    await prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        action: AUDIT_ACTIONS.CREATE,
        resource: 'lead-lists',
        resourceId: list.id,
        after: { count: imported.length, listId: list.id } as any,
      },
    });
  }

  return { listId: list.id, listName: list.name, imported: imported.length, failed: errors.length, errors };
};

export const deleteList = async (tenantId: string, id: string) => {
  const list = await prisma.leadList.findFirst({ where: { id, tenantId } });
  if (!list) throw new AppError(404, 'NOT_FOUND', 'Lead list not found');
  await prisma.leadList.delete({ where: { id } });
};
