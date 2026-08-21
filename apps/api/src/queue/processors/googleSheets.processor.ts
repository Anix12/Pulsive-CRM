import prisma from '@/db/client';
import { logger } from '@/utils/logger';
import { parse } from 'csv-parse/sync';

interface GoogleSheetsConfig {
  sheetUrl?: string;
  sheetName?: string;
}

// Uses the public CSV export endpoint for a Sheet shared as "anyone with the link
// can view" — no OAuth needed. sheetUrl is the full Google Sheets edit URL; we
// extract the spreadsheet ID and rebuild the CSV export link ourselves.
const toCsvExportUrl = (sheetUrl: string, sheetName?: string): string | null => {
  const match = sheetUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (!match) return null;
  const id = match[1];
  const base = `https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:csv`;
  return sheetName ? `${base}&sheet=${encodeURIComponent(sheetName)}` : base;
};

const pick = (row: Record<string, string>, keys: string[]) => {
  for (const k of keys) {
    const found = Object.keys(row).find((rk) => rk.toLowerCase().trim() === k);
    if (found && row[found]) return row[found].trim();
  }
  return undefined;
};

// Polls every active GOOGLE_SHEETS integration and imports new rows as Leads.
export const syncGoogleSheets = async (): Promise<void> => {
  const integrations = await prisma.integration.findMany({ where: { type: 'GOOGLE_SHEETS', isActive: true } });

  for (const integration of integrations) {
    const config = integration.config as GoogleSheetsConfig;
    if (!config.sheetUrl) continue;

    const csvUrl = toCsvExportUrl(config.sheetUrl, config.sheetName);
    if (!csvUrl) {
      logger.warn(`Google Sheets integration ${integration.id}: could not parse sheet URL`);
      continue;
    }

    try {
      const res = await fetch(csvUrl);
      if (!res.ok) {
        logger.warn(`Google Sheets integration ${integration.id}: fetch failed with ${res.status}`);
        continue;
      }
      const csvText = await res.text();
      const rows: Record<string, string>[] = parse(csvText, { columns: true, skip_empty_lines: true, trim: true });

      let imported = 0;
      for (const row of rows) {
        const phone = pick(row, ['phone', 'mobile', 'contact number', 'contact']);
        if (!phone) continue;

        const existing = await prisma.contact.findFirst({ where: { tenantId: integration.tenantId, phone } });
        if (existing) continue;

        const fullName = pick(row, ['name', 'full name']) || '';

        await prisma.contact.create({
          data: {
            tenantId: integration.tenantId,
            name: fullName.trim() || 'Unknown',
            phone,
            email: pick(row, ['email', 'email address']),
            company: pick(row, ['company', 'organisation', 'organization']),
            source: 'Google Sheets',
            status: 'LEAD',
          },
        });
        imported++;
      }

      if (imported > 0) {
        logger.info(`Google Sheets integration ${integration.id}: imported ${imported} new leads`);
      }
    } catch (err) {
      logger.error(`Google Sheets integration ${integration.id}: sync failed`, { err });
    }
  }
};
