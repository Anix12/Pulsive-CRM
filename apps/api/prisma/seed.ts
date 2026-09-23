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

  // ── Default Pipeline ─────────────────────────────────────────────────────────
  let pipeline = await prisma.pipeline.findFirst({ where: { tenantId: tenant.id, isDefault: true } });
  if (!pipeline) {
    pipeline = await prisma.pipeline.create({ data: { tenantId: tenant.id, name: 'Sales Pipeline', isDefault: true } });
  }

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
      where: { tenantId_pipelineId_order: { tenantId: tenant.id, pipelineId: pipeline.id, order: s.order } },
      update: {},
      create: { tenantId: tenant.id, pipelineId: pipeline.id, ...s },
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
    { email: 'user@gmail.com',   password: '12345678',     firstName: 'Demo',    lastName: 'User',      role: 'AGENT'   as const },
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

  // Assign a handful of warm/hot leads to the demo AGENT user so the AGENT-role
  // user dashboard (and its AI Sales Coach) has real leads to work with.
  const demoAgentLeadIdx = [0, 1, 2, 5, 8];
  for (const idx of demoAgentLeadIdx) {
    if (!contactIds[idx]) continue;
    await prisma.contact.update({
      where: { id: contactIds[idx] },
      data: { assignedToId: userMap['Demo'], score: Math.min(96, 40 + idx * 11) },
    });
  }
  console.log(`Assigned ${demoAgentLeadIdx.length} leads to the demo AGENT user`);

  // ── Campaigns ────────────────────────────────────────────────────────────────
  const campaignDefs = [
    { name: 'Diwali Festive Offer',      category: 'Seasonal',   source: 'Facebook Ads',  status: 'ACTIVE' as const, priority: 'HIGH'   as const, duplicateCheck: 'MOBILE_ONLY' as const, assignmentRule: 'ROUND_ROBIN' as const },
    { name: 'New Year Membership Drive', category: 'Membership', source: 'Instagram Ads', status: 'ACTIVE' as const, priority: 'MEDIUM' as const, duplicateCheck: 'BOTH'        as const, assignmentRule: 'MANUAL'      as const },
  ];

  const campaignMap: Record<string, string> = {};
  for (const c of campaignDefs) {
    let campaign = await prisma.campaign.findFirst({ where: { tenantId: tenant.id, name: c.name } });
    if (!campaign) {
      campaign = await prisma.campaign.create({ data: { tenantId: tenant.id, ...c } });
    }
    campaignMap[c.name] = campaign.id;
  }
  console.log('Campaigns seeded:', Object.keys(campaignMap).join(', '));

  // ── Campaign Leads ───────────────────────────────────────────────────────────
  const campaignLeadDefs = [
    { firstName: 'Ankit',  lastName: 'Verma',     phone: '+919826511001', email: 'ankit.verma@example.com',   company: 'Verma Textiles',       source: 'Mumbai',     temperature: 'HOT'  as const, campaign: 'Diwali Festive Offer' },
    { firstName: 'Priya',  lastName: 'Nair',      phone: '+919826511002', email: 'priya.nair@example.com',    company: 'Nair Traders',         source: 'Chennai',    temperature: 'WARM' as const, campaign: 'Diwali Festive Offer' },
    { firstName: 'Rohit',  lastName: 'Malhotra',  phone: '+919826511003', email: 'rohit.malhotra@example.com',company: 'Malhotra Retail',      source: 'Delhi',      temperature: 'HOT'  as const, campaign: 'Diwali Festive Offer' },
    { firstName: 'Sneha',  lastName: 'Kulkarni',  phone: '+919826511004', email: 'sneha.kulkarni@example.com',company: 'Kulkarni Fitness',     source: 'Pune',       temperature: 'WARM' as const, campaign: 'New Year Membership Drive' },
    { firstName: 'Farhan', lastName: 'Sheikh',    phone: '+919826511005', email: 'farhan.sheikh@example.com', company: 'Sheikh Enterprises',   source: 'Hyderabad',  temperature: 'COLD' as const, campaign: 'New Year Membership Drive' },
    { firstName: 'Divya',  lastName: 'Reddy',     phone: '+919826511006', email: 'divya.r@example.com',       company: 'Reddy Consultants',    source: 'Bengaluru',  temperature: 'HOT'  as const, campaign: 'New Year Membership Drive' },
  ];

  let campaignLeadsCreated = 0;
  for (const l of campaignLeadDefs) {
    const existing = await prisma.contact.findFirst({ where: { tenantId: tenant.id, phone: l.phone } });
    if (!existing) {
      await prisma.contact.create({
        data: {
          tenantId: tenant.id,
          name: `${l.firstName} ${l.lastName}`.trim(),
          phone: l.phone,
          email: l.email,
          company: l.company,
          status: 'LEAD',
          temperature: l.temperature,
          source: l.source,
          campaignId: campaignMap[l.campaign],
        } as any,
      });
      campaignLeadsCreated++;
    }
  }
  console.log(`Seeded ${campaignLeadsCreated} campaign leads`);

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
  console.log('  Demo user (agent dashboard): user@gmail.com / 12345678');
  console.log('────────────────────────────────────────────');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
