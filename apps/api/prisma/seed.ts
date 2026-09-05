import { PrismaClient } from '../src/db/generated';
import bcrypt from 'bcryptjs';
import { seedAdmissionsTemplates } from './seed-templates';

const prisma = new PrismaClient();

async function main() {
  // ── Super Admin ──────────────────────────────────────────────────────────────
  const superAdmin = await prisma.superAdmin.upsert({
    where: { email: 'admin@crm-saas.com' },
    update: {},
    create: {
      email: 'admin@crm-saas.com',
      passwordHash: await bcrypt.hash('SuperAdmin@123', 12),
      name: 'Super Admin',
    },
  });
  console.log('Super admin seeded:', superAdmin.email);

  // ── Demo Tenant ─────────────────────────────────────────────────────────────
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'demo' },
    update: {},
    create: {
      name: 'Apex Solutions',
      slug: 'demo',
      plan: 'STARTER',
      companyName: 'Apex Solutions Pvt Ltd',
    },
  });

  // ── Deal Stages ─────────────────────────────────────────────────────────────
  const stageDefs = [
    { name: 'New Lead',      order: 1, probability: 10,  color: '#94A3B8' },
    { name: 'Contacted',     order: 2, probability: 25,  color: '#60A5FA' },
    { name: 'Qualified',     order: 3, probability: 50,  color: '#A78BFA' },
    { name: 'Proposal Sent', order: 4, probability: 70,  color: '#F59E0B' },
    { name: 'Won',           order: 5, probability: 100, color: '#34D399', isWon: true  },
    { name: 'Lost',          order: 6, probability: 0,   color: '#F87171', isLost: true },
  ];

  const stageMap: Record<string, string> = {};
  for (const s of stageDefs) {
    const stage = await prisma.dealStage.upsert({
      where: { tenantId_order: { tenantId: tenant.id, order: s.order } },
      update: {},
      create: { tenantId: tenant.id, ...s },
    });
    stageMap[s.name] = stage.id;
  }

  // ── Team Members ─────────────────────────────────────────────────────────────
  const teamDefs = [
    { email: 'owner@demo.com',   password: 'Demo@123',    firstName: 'Rahul',   lastName: 'Sharma',    role: 'OWNER'   as const },
    { email: 'admin@demo.com',   password: 'Demo@123',    firstName: 'Priya',   lastName: 'Mehta',     role: 'ADMIN'   as const },
    { email: 'manager@demo.com', password: 'Demo@123',    firstName: 'Vikram',  lastName: 'Nair',      role: 'MANAGER' as const },
    { email: 'agent1@demo.com',  password: 'Demo@123',    firstName: 'Anjali',  lastName: 'Patel',     role: 'AGENT'   as const },
    { email: 'agent2@demo.com',  password: 'Demo@123',    firstName: 'Suresh',  lastName: 'Kumar',     role: 'AGENT'   as const },
  ];

  const userMap: Record<string, string> = {};
  for (const u of teamDefs) {
    const user = await prisma.user.upsert({
      where: { tenantId_email: { tenantId: tenant.id, email: u.email } },
      update: {},
      create: {
        tenantId: tenant.id,
        email: u.email,
        passwordHash: await bcrypt.hash(u.password, 12),
        firstName: u.firstName,
        lastName: u.lastName,
        role: u.role,
      },
    });
    userMap[u.firstName] = user.id;
  }

  // ── Onboarding ───────────────────────────────────────────────────────────────
  await prisma.onboardingProgress.upsert({
    where: { tenantId: tenant.id },
    update: {},
    create: { tenantId: tenant.id },
  });

  console.log('Team seeded:', Object.keys(userMap).join(', '));

  // ── Contacts ─────────────────────────────────────────────────────────────────
  const contactDefs = [
    // Leads
    { firstName: 'Karan',    lastName: 'Malhotra',  phone: '+919876543210', email: 'karan.malhotra@techcorp.in',    company: 'TechCorp India',        jobTitle: 'CTO',                status: 'LEAD'     as const, temperature: 'HOT'  as const, source: 'IndiaMART',    tags: ['b2b', 'tech'] },
    { firstName: 'Divya',    lastName: 'Reddy',     phone: '+919876543211', email: 'divya@brightmfg.com',           company: 'Bright Manufacturing',   jobTitle: 'Procurement Head',   status: 'LEAD'     as const, temperature: 'WARM' as const, source: 'JustDial',     tags: ['manufacturing'] },
    { firstName: 'Arjun',    lastName: 'Kapoor',    phone: '+919876543212', email: 'arjun.kapoor@globalimport.in',  company: 'Global Imports Ltd',     jobTitle: 'Director',           status: 'LEAD'     as const, temperature: 'COLD' as const, source: 'TradeIndia',   tags: ['import-export'] },
    { firstName: 'Sonia',    lastName: 'Gupta',     phone: '+919876543213', email: 'sonia@mediasolutions.in',       company: 'Media Solutions Pvt',    jobTitle: 'Marketing Manager',  status: 'LEAD'     as const, temperature: null,            source: 'Facebook Ads', tags: ['media', 'smb'] },
    { firstName: 'Rajesh',   lastName: 'Pillai',    phone: '+919876543214', email: 'rajesh.pillai@constructco.in',  company: 'ConstructCo',            jobTitle: 'MD',                 status: 'LEAD'     as const, temperature: 'WARM' as const, source: 'Google Ads',   tags: ['construction'] },
    // Prospects
    { firstName: 'Neha',     lastName: 'Singh',     phone: '+919876543215', email: 'neha.singh@finwise.in',         company: 'FinWise Advisory',       jobTitle: 'CEO',                status: 'PROSPECT' as const, temperature: 'HOT'  as const, source: 'IndiaMART',    tags: ['fintech', 'b2b'] },
    { firstName: 'Aditya',   lastName: 'Joshi',     phone: '+919876543216', email: 'aditya@logisticspro.com',       company: 'LogisticsPro Pvt Ltd',   jobTitle: 'Operations Head',    status: 'PROSPECT' as const, temperature: 'WARM' as const, source: 'Website',      tags: ['logistics'] },
    { firstName: 'Meera',    lastName: 'Iyer',      phone: '+919876543217', email: 'meera.iyer@retailhub.in',       company: 'RetailHub',              jobTitle: 'COO',                status: 'PROSPECT' as const, temperature: 'COLD' as const, source: 'JustDial',     tags: ['retail', 'smb'] },
    { firstName: 'Sunil',    lastName: 'Verma',     phone: '+919876543218', email: 'sunil@agrocorp.in',             company: 'AgroCorp India',         jobTitle: 'GM Sales',           status: 'PROSPECT' as const, temperature: 'HOT'  as const, source: 'TradeIndia',   tags: ['agriculture'] },
    { firstName: 'Pooja',    lastName: 'Desai',     phone: '+919876543219', email: 'pooja.desai@cloudnine.in',      company: 'CloudNine Tech',         jobTitle: 'VP Engineering',     status: 'PROSPECT' as const, temperature: 'WARM' as const, source: 'LinkedIn',     tags: ['tech', 'saas'] },
    // Customers
    { firstName: 'Manish',   lastName: 'Batra',     phone: '+919876543220', email: 'manish@omegagroup.in',          company: 'Omega Group',            jobTitle: 'Chairman',           status: 'CUSTOMER' as const, temperature: 'HOT'  as const, source: 'Referral',     tags: ['enterprise', 'vip'] },
    { firstName: 'Shreya',   lastName: 'Chopra',    phone: '+919876543221', email: 'shreya@nexgenhr.com',           company: 'NexGen HR Solutions',    jobTitle: 'Founder',            status: 'CUSTOMER' as const, temperature: 'WARM' as const, source: 'Referral',     tags: ['hr-tech'] },
    { firstName: 'Ankur',    lastName: 'Saxena',    phone: '+919876543222', email: 'ankur.saxena@buildfast.in',     company: 'BuildFast Infrastructure', jobTitle: 'Director',         status: 'CUSTOMER' as const, temperature: 'HOT'  as const, source: 'IndiaMART',    tags: ['infrastructure', 'enterprise'] },
    { firstName: 'Tamanna',  lastName: 'Khanna',    phone: '+919876543223', email: 'tamanna@ecobrand.in',           company: 'EcoBrand Packaging',     jobTitle: 'CEO',                status: 'CUSTOMER' as const, temperature: 'WARM' as const, source: 'Google Ads',   tags: ['packaging', 'smb'] },
    { firstName: 'Rohit',    lastName: 'Agarwal',   phone: '+919876543224', email: 'rohit.agarwal@swiftpay.in',     company: 'SwiftPay Fintech',       jobTitle: 'CTO',                status: 'CUSTOMER' as const, temperature: 'HOT'  as const, source: 'LinkedIn',     tags: ['fintech', 'vip'] },
    // Churned
    { firstName: 'Kavita',   lastName: 'Nambiar',   phone: '+919876543225', email: 'kavita@oldtech.in',             company: 'OldTech Systems',        jobTitle: 'IT Manager',         status: 'CHURNED'  as const, temperature: 'COLD' as const, source: 'Cold Call',    tags: ['legacy'] },
    { firstName: 'Deepak',   lastName: 'Rao',       phone: '+919876543226', email: 'deepak.rao@microventures.in',   company: 'Micro Ventures',         jobTitle: 'Co-founder',         status: 'CHURNED'  as const, temperature: 'COLD' as const, source: 'Website',      tags: ['startup'] },
    // More leads for volume
    { firstName: 'Ishaan',   lastName: 'Chaudhary', phone: '+919876543227', email: 'ishaan@nextwave.in',            company: 'NextWave Digital',       jobTitle: 'Product Manager',    status: 'LEAD'     as const, temperature: 'WARM' as const, source: 'Facebook Ads', tags: ['digital'] },
    { firstName: 'Pallavi',  lastName: 'Kulkarni',  phone: '+919876543228', email: 'pallavi@greenearth.in',         company: 'GreenEarth Solutions',   jobTitle: 'Sustainability Head',status: 'PROSPECT' as const, temperature: 'COLD' as const, source: 'Website',      tags: ['sustainability'] },
    { firstName: 'Vikash',   lastName: 'Tiwari',    phone: '+919876543229', email: 'vikash@steelcraft.in',          company: 'SteelCraft Industries',  jobTitle: 'VP Operations',      status: 'CUSTOMER' as const, temperature: 'HOT'  as const, source: 'IndiaMART',    tags: ['manufacturing', 'enterprise'] },
  ];

  const contactIds: string[] = [];
  for (const c of contactDefs) {
    let contact = await prisma.contact.findFirst({
      where: { tenantId: tenant.id, phone: c.phone },
    });
    if (!contact) {
      contact = await prisma.contact.create({
        data: {
          tenantId: tenant.id,
          name: `${c.firstName} ${c.lastName}`.trim(),
          phone: c.phone,
          email: c.email,
          company: c.company,
          jobTitle: c.jobTitle,
          status: c.status,
          temperature: c.temperature ?? null,
          source: c.source,
          tags: c.tags,
        } as any,
      });
    }
    contactIds.push(contact.id);
  }

  console.log(`Seeded ${contactIds.length} contacts`);

  // ── Deals ────────────────────────────────────────────────────────────────────
  const now = new Date();
  const daysFromNow = (d: number) => new Date(now.getTime() + d * 86400000);
  const daysAgo     = (d: number) => new Date(now.getTime() - d * 86400000);

  const dealDefs = [
    // New Lead stage
    { title: 'ERP Implementation',           contactIdx: 0,  stage: 'New Lead',      value: 450000,  close: daysFromNow(45) },
    { title: 'Procurement Software',         contactIdx: 1,  stage: 'New Lead',      value: 180000,  close: daysFromNow(60) },
    { title: 'CRM Setup – Global Imports',   contactIdx: 2,  stage: 'New Lead',      value: 90000,   close: daysFromNow(30) },
    // Contacted stage
    { title: 'Brand Campaign Q3',            contactIdx: 3,  stage: 'Contacted',     value: 220000,  close: daysFromNow(40) },
    { title: 'Site Management Software',     contactIdx: 4,  stage: 'Contacted',     value: 310000,  close: daysFromNow(35) },
    { title: 'FinWise CRM License',          contactIdx: 5,  stage: 'Contacted',     value: 540000,  close: daysFromNow(50) },
    // Qualified stage
    { title: 'Fleet Tracking Module',        contactIdx: 6,  stage: 'Qualified',     value: 670000,  close: daysFromNow(25) },
    { title: 'Inventory & POS Integration', contactIdx: 7,  stage: 'Qualified',     value: 195000,  close: daysFromNow(20) },
    { title: 'Agri Export Analytics',       contactIdx: 8,  stage: 'Qualified',     value: 280000,  close: daysFromNow(28) },
    // Proposal Sent stage
    { title: 'CloudNine SaaS Platform Deal', contactIdx: 9,  stage: 'Proposal Sent', value: 1200000, close: daysFromNow(15) },
    { title: 'Omega Group – Enterprise',     contactIdx: 10, stage: 'Proposal Sent', value: 2500000, close: daysFromNow(10) },
    { title: 'HR Automation Suite',          contactIdx: 11, stage: 'Proposal Sent', value: 480000,  close: daysFromNow(18) },
    // Won stage
    { title: 'BuildFast – Full Platform',    contactIdx: 12, stage: 'Won',           value: 1800000, close: daysAgo(5) },
    { title: 'EcoBrand CRM Annual',          contactIdx: 13, stage: 'Won',           value: 360000,  close: daysAgo(12) },
    { title: 'SwiftPay Integration Pack',    contactIdx: 14, stage: 'Won',           value: 950000,  close: daysAgo(3) },
    { title: 'SteelCraft Enterprise License',contactIdx: 19, stage: 'Won',           value: 1600000, close: daysAgo(20) },
    // Lost stage
    { title: 'OldTech CRM Migration',        contactIdx: 15, stage: 'Lost',          value: 120000,  close: daysAgo(30) },
    { title: 'Micro Ventures Starter Plan',  contactIdx: 16, stage: 'Lost',          value: 45000,   close: daysAgo(15) },
  ];

  let dealsCreated = 0;
  for (const d of dealDefs) {
    const contactId = contactIds[d.contactIdx];
    if (!contactId) continue;
    const stageId = stageMap[d.stage];
    if (!stageId) continue;

    const existing = await prisma.deal.findFirst({
      where: { tenantId: tenant.id, title: d.title },
    });
    if (!existing) {
      await prisma.deal.create({
        data: {
          tenantId: tenant.id,
          contactId,
          stageId,
          title: d.title,
          value: d.value,
          expectedCloseDate: d.close,
          isWon:  d.stage === 'Won'  ? true  : d.stage === 'Lost' ? false : null,
          closedAt: ['Won', 'Lost'].includes(d.stage) ? d.close : null,
        },
      });
      dealsCreated++;
    }
  }

  console.log(`Seeded ${dealsCreated} deals`);

  // ── Message Templates ────────────────────────────────────────────────────────
  await seedAdmissionsTemplates(tenant.id);
  console.log('Seeded admissions outreach templates');

  console.log('');
  console.log('────────────────────────────────────────────');
  console.log('  Login credentials');
  console.log('────────────────────────────────────────────');
  console.log('  Owner:   owner@demo.com   / Demo@123');
  console.log('  Admin:   admin@demo.com   / Demo@123');
  console.log('  Manager: manager@demo.com / Demo@123');
  console.log('  Agent 1: agent1@demo.com  / Demo@123');
  console.log('  Agent 2: agent2@demo.com  / Demo@123');
  console.log('────────────────────────────────────────────');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
