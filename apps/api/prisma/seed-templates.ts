import prisma from '@/db/client';

/**
 * Standalone seed helper for pre-populated admissions-outreach message templates.
 * NOT wired into the real `prisma/seed.ts` — call `seedAdmissionsTemplates(tenantId)`
 * from the main seed script (or a one-off script) to use it.
 */
export async function seedAdmissionsTemplates(tenantId: string) {
  const templates = [
    // ── SMS (Normal) ──────────────────────────────────────────────────────
    {
      name: 'MBA Admissions Open — Apply Now',
      channel: 'SMS' as const,
      body:
        'Hi {{firstName}}, admissions for the {{program}} batch at {{university}} are now OPEN! ' +
        'Limited seats available. Apply before {{deadline}}. Reply CALL for a free counselling session.',
      variables: ['firstName', 'program', 'university', 'deadline'],
      isDlt: false,
    },
    {
      name: 'Application Deadline Reminder',
      channel: 'SMS' as const,
      body:
        'Reminder: The application deadline for {{program}} at {{university}} is {{deadline}}. ' +
        "Don't miss out, {{firstName}} — complete your application today. Need help? Call us at {{counsellorPhone}}.",
      variables: ['firstName', 'program', 'university', 'deadline', 'counsellorPhone'],
      isDlt: false,
    },
    {
      name: "Congratulations — You're Shortlisted!",
      channel: 'SMS' as const,
      body:
        'Great news {{firstName}}! You have been shortlisted for {{program}} at {{university}}. ' +
        'Next step: {{nextStep}}. Our counsellor will call you shortly.',
      variables: ['firstName', 'program', 'university', 'nextStep'],
      isDlt: false,
    },
    {
      name: 'Free Career Counselling Session',
      channel: 'SMS' as const,
      body:
        'Hi {{firstName}}, unsure which course is right for you? Book a FREE 1-on-1 career ' +
        'counselling session with our experts. Reply YES to schedule your slot.',
      variables: ['firstName'],
      isDlt: false,
    },
    // ── SMS (DLT-registered) ─────────────────────────────────────────────
    {
      name: 'Document Verification Required (DLT)',
      channel: 'SMS' as const,
      body:
        'Dear {{firstName}}, your admission to {{program}} at {{university}} is pending document ' +
        'verification. Please submit {{documentName}} by {{deadline}} to confirm your seat. -{{companyShortName}}',
      variables: ['firstName', 'program', 'university', 'documentName', 'deadline', 'companyShortName'],
      isDlt: true,
      dltTemplateId: '1707162400000000001',
      dltSenderId: 'ADMSNZ',
    },
    {
      name: 'Fee Payment Reminder (DLT)',
      channel: 'SMS' as const,
      body:
        'Dear {{firstName}}, your seat at {{university}} for {{program}} is reserved. Please pay ' +
        'the admission fee of {{amount}} by {{deadline}} to confirm enrollment. -{{companyShortName}}',
      variables: ['firstName', 'university', 'program', 'amount', 'deadline', 'companyShortName'],
      isDlt: true,
      dltTemplateId: '1707162400000000002',
      dltSenderId: 'ADMSNZ',
    },
    // ── WhatsApp ──────────────────────────────────────────────────────────
    {
      name: 'WhatsApp — New Program Announcement',
      channel: 'WHATSAPP' as const,
      body:
        'Hi {{firstName}} 👋\n\nExciting news! {{university}} has just launched a new ' +
        '*{{program}}* program. Would you like us to send you the full brochure and fee structure?',
      variables: ['firstName', 'university', 'program'],
    },
    {
      name: 'WhatsApp — Application Status Update',
      channel: 'WHATSAPP' as const,
      body:
        'Hello {{firstName}}, here is an update on your application to {{university}}:\n\n' +
        'Status: *{{status}}*\n\nIf you have any questions, just reply to this message and our ' +
        'counsellor {{counsellorName}} will assist you.',
      variables: ['firstName', 'university', 'status', 'counsellorName'],
    },
    {
      name: 'WhatsApp — Webinar Invitation',
      channel: 'WHATSAPP' as const,
      body:
        "Hi {{firstName}}! 🎓 Join our free live webinar on '{{webinarTopic}}' with admissions " +
        'experts from {{university}} on {{date}} at {{time}}. Reply JOIN to reserve your spot.',
      variables: ['firstName', 'webinarTopic', 'university', 'date', 'time'],
    },
    // ── Email ─────────────────────────────────────────────────────────────
    {
      name: 'Email — Welcome & Program Brochure',
      channel: 'EMAIL' as const,
      subject: 'Your {{program}} Journey at {{university}} Starts Here, {{firstName}}!',
      body:
        'Dear {{firstName}},\n\n' +
        'Thank you for your interest in the {{program}} program at {{university}}. We are excited ' +
        'to help you take the next step in your academic journey.\n\n' +
        "Attached is the detailed program brochure covering the curriculum, faculty, fee structure, " +
        'and scholarship opportunities.\n\n' +
        'Our admissions counsellor, {{counsellorName}}, will reach out within 24 hours to answer ' +
        'any questions and guide you through the application process.\n\n' +
        'Warm regards,\n{{companyName}} Admissions Team',
      variables: ['firstName', 'program', 'university', 'counsellorName', 'companyName'],
    },
    {
      name: 'Email — Application Deadline Approaching',
      channel: 'EMAIL' as const,
      subject: 'Last Chance: {{program}} Applications Close {{deadline}}',
      body:
        'Dear {{firstName}},\n\n' +
        'This is a friendly reminder that the application window for {{program}} at {{university}} ' +
        'closes on {{deadline}}. Seats are limited and filling up fast.\n\n' +
        'To secure your spot:\n' +
        '1. Complete your online application\n' +
        '2. Upload the required documents\n' +
        '3. Pay the application fee\n\n' +
        "If you need any assistance completing your application, reply to this email or call us at " +
        '{{counsellorPhone}} — we are happy to help.\n\n' +
        'Best regards,\n{{companyName}} Admissions Team',
      variables: ['firstName', 'program', 'university', 'deadline', 'counsellorPhone', 'companyName'],
    },
  ];

  for (const t of templates) {
    await prisma.messageTemplate.create({
      data: {
        tenantId,
        name: t.name,
        channel: t.channel,
        subject: 'subject' in t ? t.subject : undefined,
        body: t.body,
        variables: t.variables,
        isDlt: 'isDlt' in t ? t.isDlt : false,
        dltTemplateId: 'dltTemplateId' in t ? t.dltTemplateId : undefined,
        dltSenderId: 'dltSenderId' in t ? t.dltSenderId : undefined,
        isAiGenerated: false,
      },
    });
  }

  console.log(`Seeded ${templates.length} admissions templates for tenant ${tenantId}`);
}
