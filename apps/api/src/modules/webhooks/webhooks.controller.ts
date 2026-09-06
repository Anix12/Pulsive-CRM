import { Request, Response } from 'express';
import crypto from 'crypto';
import prisma from '@/db/client';
import { sendSuccess } from '@/utils/response';

interface LeadData {
  name: string;
  phone: string;
  email?: string;
  company?: string;
  source: string;
  note?: string;
}

async function createContactFromLead(tenantId: string, lead: LeadData, campaignId?: string) {
  const existing = await prisma.contact.findFirst({
    where: { tenantId, phone: lead.phone },
  });
  // Existing contact wins as-is — a resubmitted form shouldn't silently move an
  // already-tracked lead into a different campaign.
  if (existing) return existing;

  return prisma.contact.create({
    data: {
      tenantId,
      name: lead.name,
      phone: lead.phone,
      email: lead.email,
      company: lead.company,
      source: lead.source,
      status: 'LEAD',
      campaignId,
      customFields: lead.note ? { note: lead.note } : undefined,
    },
  });
}

function cleanName(full: string): string {
  return (full || '').trim() || 'Unknown';
}

// IndiaMART: POST /webhooks/indiamart/:tenantId
export const indiamart = async (req: Request, res: Response) => {
  const { tenantId } = req.params;
  const b = req.body;
  const lead: LeadData = {
    name: cleanName(b.SENDER_NAME || b.name || ''),
    phone: b.SENDER_MOBILE || b.mobile || '',
    email: b.SENDER_EMAIL || b.email,
    company: b.SENDER_COMPANY || b.company,
    source: 'IndiaMART',
    note: b.QUERY_MESSAGE || b.message,
  };
  if (!lead.phone) return res.status(400).json({ error: 'Missing phone' });
  await createContactFromLead(tenantId, lead);
  sendSuccess(res, { received: true });
};

// Campaign lead-capture link: POST /webhooks/integrate/:token/leads
// The URL token alone identifies which tenant + campaign this lead belongs to —
// the form never needs to send a campaign/source field of its own.
export const campaignIntegrate = async (req: Request, res: Response) => {
  const { token } = req.params;
  const campaign = await prisma.campaign.findUnique({ where: { leadWebhookToken: token } });
  if (!campaign) return res.status(404).json({ error: 'Invalid or unknown webhook token' });

  const b = req.body || {};
  const nameField = b.name || b.fullName || b.full_name || `${b.firstName || ''} ${b.lastName || ''}`;
  const lead: LeadData = {
    name: cleanName(nameField),
    phone: b.phone || b.mobile || b.phoneNumber || b.contact || '',
    email: b.email || b.emailAddress,
    company: b.company || b.organization,
    source: campaign.name,
    note: b.message || b.note || b.notes,
  };
  if (!lead.phone) return res.status(400).json({ error: 'Missing phone' });
  await createContactFromLead(campaign.tenantId, lead, campaign.id);
  sendSuccess(res, { received: true });
};

// Custom Integration: POST /webhooks/custom/:tenantId
// A generic catch-all for landing pages, other CRMs, or custom apps — accepts
// common field-name variants rather than requiring an exact schema.
export const custom = async (req: Request, res: Response) => {
  const { tenantId } = req.params;
  const b = req.body || {};
  const nameField = b.name || b.fullName || b.full_name || `${b.firstName || ''} ${b.lastName || ''}`;
  const lead: LeadData = {
    name: cleanName(nameField),
    phone: b.phone || b.mobile || b.phoneNumber || b.contact || '',
    email: b.email || b.emailAddress,
    company: b.company || b.organization,
    source: b.source || 'Custom Integration',
    note: b.message || b.note || b.notes,
  };
  if (!lead.phone) return res.status(400).json({ error: 'Missing phone' });
  await createContactFromLead(tenantId, lead);
  sendSuccess(res, { received: true });
};

// JustDial: POST /webhooks/justdial/:tenantId
export const justdial = async (req: Request, res: Response) => {
  const { tenantId } = req.params;
  const b = req.body;
  const lead: LeadData = {
    name: cleanName(b.name || b.NAME || ''),
    phone: b.mobile || b.phone || b.MOBILE || '',
    email: b.email || b.EMAIL,
    company: b.company || b.COMPANY,
    source: 'JustDial',
    note: b.category || b.CATEGORY,
  };
  if (!lead.phone) return res.status(400).json({ error: 'Missing phone' });
  await createContactFromLead(tenantId, lead);
  sendSuccess(res, { received: true });
};

// TradeIndia: POST /webhooks/tradeindia/:tenantId
export const tradeindia = async (req: Request, res: Response) => {
  const { tenantId } = req.params;
  const b = req.body;
  const lead: LeadData = {
    name: cleanName(b.name || b.buyer_name || ''),
    phone: b.mobile || b.phone || b.buyer_mobile || '',
    email: b.email || b.buyer_email,
    company: b.company || b.buyer_company,
    source: 'TradeIndia',
    note: b.message || b.product,
  };
  if (!lead.phone) return res.status(400).json({ error: 'Missing phone' });
  await createContactFromLead(tenantId, lead);
  sendSuccess(res, { received: true });
};

// Sulekha: POST /webhooks/sulekha/:tenantId
export const sulekha = async (req: Request, res: Response) => {
  const { tenantId } = req.params;
  const b = req.body;
  const lead: LeadData = {
    name: cleanName(b.name || b.customer_name || ''),
    phone: b.mobile || b.phone || b.customer_phone || '',
    email: b.email || b.customer_email,
    company: b.company,
    source: 'Sulekha',
    note: b.requirement || b.category,
  };
  if (!lead.phone) return res.status(400).json({ error: 'Missing phone' });
  await createContactFromLead(tenantId, lead);
  sendSuccess(res, { received: true });
};

// 99acres: POST /webhooks/acres-99/:tenantId
export const acres99 = async (req: Request, res: Response) => {
  const { tenantId } = req.params;
  const b = req.body;
  const lead: LeadData = {
    name: cleanName(b.name || b.buyer_name || ''),
    phone: b.phone || b.mobile || b.buyer_phone || '',
    email: b.email || b.buyer_email,
    company: b.company,
    source: '99acres',
    note: b.message || b.property_type,
  };
  if (!lead.phone) return res.status(400).json({ error: 'Missing phone' });
  await createContactFromLead(tenantId, lead);
  sendSuccess(res, { received: true });
};

// MagicBricks: POST /webhooks/magicbricks/:tenantId
export const magicbricks = async (req: Request, res: Response) => {
  const { tenantId } = req.params;
  const b = req.body;
  const lead: LeadData = {
    name: cleanName(b.name || b.buyerName || ''),
    phone: b.phone || b.mobile || b.buyerPhone || '',
    email: b.email || b.buyerEmail,
    company: b.company,
    source: 'MagicBricks',
    note: b.message || b.propertyType,
  };
  if (!lead.phone) return res.status(400).json({ error: 'Missing phone' });
  await createContactFromLead(tenantId, lead);
  sendSuccess(res, { received: true });
};

// Housing.com: POST /webhooks/housing/:tenantId
export const housing = async (req: Request, res: Response) => {
  const { tenantId } = req.params;
  const b = req.body;
  const lead: LeadData = {
    name: cleanName(b.name || b.lead_name || ''),
    phone: b.phone || b.mobile || b.lead_phone || '',
    email: b.email || b.lead_email,
    company: b.company,
    source: 'Housing.com',
    note: b.message || b.project_name,
  };
  if (!lead.phone) return res.status(400).json({ error: 'Missing phone' });
  await createContactFromLead(tenantId, lead);
  sendSuccess(res, { received: true });
};

// Google Ads Lead Form: POST /webhooks/google-ads/:tenantId
export const googleAds = async (req: Request, res: Response) => {
  const { tenantId } = req.params;
  const b = req.body;

  // Google sends field_data as array or user_column_data
  const fields: Record<string, string> = {};
  const columns: any[] = b.user_column_data || b.field_data || [];
  columns.forEach((col: any) => {
    const key = (col.column_name || col.name || '').toLowerCase();
    const val = col.string_value || (col.values && col.values[0]) || '';
    fields[key] = val;
  });

  const lead: LeadData = {
    name: cleanName(fields['full_name'] || fields['name'] || `${fields['first_name'] || ''} ${fields['last_name'] || ''}`),
    phone: fields['phone_number'] || fields['phone'] || b.phone || '',
    email: fields['email'] || b.email,
    source: 'Google Ads',
  };
  if (!lead.phone) return res.status(400).json({ error: 'Missing phone' });
  await createContactFromLead(tenantId, lead);
  sendSuccess(res, { received: true });
};

// Facebook Lead Ads: GET for webhook verification challenge
export const facebookVerify = async (req: Request, res: Response) => {
  const { tenantId } = req.params;
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  const integration = await prisma.integration.findUnique({
    where: { tenantId_type: { tenantId, type: 'FACEBOOK_LEADS' } },
  });
  const cfg = (integration?.config as any) || {};
  if (mode === 'subscribe' && token === cfg.verifyToken) {
    res.status(200).send(challenge);
  } else {
    res.status(403).send('Forbidden');
  }
};

// Facebook Lead Ads: POST — Meta sends leadgen_id only; we fetch field_data via Graph API
export const facebookLeads = async (req: Request, res: Response) => {
  const { tenantId } = req.params;

  const integration = await prisma.integration.findUnique({
    where: { tenantId_type: { tenantId, type: 'FACEBOOK_LEADS' } },
  });
  const cfg = (integration?.config as any) || {};

  // Verify X-Hub-Signature-256 when app secret is configured
  if (cfg.appSecret) {
    const sig = (req.headers['x-hub-signature-256'] as string) || '';
    const rawBody = (req as any).rawBody as Buffer;
    const expected = 'sha256=' + crypto.createHmac('sha256', cfg.appSecret).update(rawBody).digest('hex');
    if (sig !== expected) return res.status(403).json({ error: 'Invalid signature' });
  }

  const entries = req.body?.entry || [];

  for (const entry of entries) {
    for (const change of entry.changes || []) {
      if (change.field !== 'leadgen') continue;
      const leadgenId = change.value?.leadgen_id;
      if (!leadgenId) continue;

      // Meta webhook only sends metadata — fetch actual field data from Graph API
      const fields: Record<string, string> = {};
      if (cfg.pageAccessToken) {
        try {
          const resp = await fetch(
            `https://graph.facebook.com/v22.0/${leadgenId}?fields=field_data&access_token=${cfg.pageAccessToken}`
          );
          if (resp.ok) {
            const data = await resp.json() as any;
            (data.field_data || []).forEach((f: any) => {
              fields[f.name] = f.values?.[0] || '';
            });
          }
        } catch (_) { /* skip lead if Graph API unreachable */ }
      }

      const name = cleanName(fields['full_name'] || `${fields['first_name'] || ''} ${fields['last_name'] || ''}`);
      const phone = fields['phone_number'] || fields['phone'] || '';
      const email = fields['email'] || '';
      if (!phone && !email) continue;

      await createContactFromLead(tenantId, {
        name,
        phone,
        email,
        source: 'Facebook Leads',
      });
    }
  }

  sendSuccess(res, { received: true });
};

// Google Forms: POST /webhooks/google-forms/:tenantId
// Payload sent by a Google Apps Script trigger on form submit.
// Body: { name, phone, email, company, message } OR { responses: [{question, answer}] }
export const googleForms = async (req: Request, res: Response) => {
  const { tenantId } = req.params;

  // Verify shared secret if configured
  const integration = await prisma.integration.findUnique({
    where: { tenantId_type: { tenantId, type: 'GOOGLE_FORMS' } },
  });
  const cfg = (integration?.config as any) || {};
  if (cfg.webhookSecret) {
    const incoming = req.headers['x-webhook-secret'];
    if (incoming !== cfg.webhookSecret) {
      return res.status(403).json({ error: 'Forbidden' });
    }
  }

  const b = req.body;

  // Support { responses: [{question, answer}] } from the Apps Script template
  const fields: Record<string, string> = {};
  if (Array.isArray(b.responses)) {
    (b.responses as { question: string; answer: string }[]).forEach(({ question, answer }) => {
      fields[question.toLowerCase().replace(/\s+/g, '_')] = answer || '';
    });
  }

  const name = cleanName(
    b.name || b.full_name ||
    fields['name'] || fields['full_name'] ||
    `${fields['first_name'] || ''} ${fields['last_name'] || ''}`,
  );
  const phone =
    b.phone || b.mobile || b.phone_number ||
    fields['phone'] || fields['mobile'] || fields['phone_number'] || '';
  const email = b.email || b.email_address || fields['email'] || fields['email_address'];
  const company = b.company || b.organization || fields['company'] || fields['organization'];
  const note =
    b.message || b.comments || b.notes ||
    fields['message'] || fields['comments'] || fields['notes'];

  if (!phone && !email) {
    return res.status(400).json({ error: 'Missing phone or email' });
  }

  await createContactFromLead(tenantId, {
    name,
    phone,
    email,
    company,
    source: 'Google Forms',
    note,
  });

  sendSuccess(res, { received: true });
};
