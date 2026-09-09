import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard, Users, Briefcase, Phone, MessageSquare,
  Zap, TrendingUp, Plug, Settings, GraduationCap, FileText,
  Megaphone, Send, CheckSquare, LineChart, Brain,
  MessageCircle, Workflow, BarChart3, Wallet, Settings2,
  Building2, MapPin, Sparkles, CalendarCheck, Radar,
  ListChecks, PhoneCall, Package, Truck, UsersRound, Shield,
} from 'lucide-react';

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  description: string;
  comingSoon?: boolean;
}

export interface NavSection {
  key: string;
  label: string;
  icon: LucideIcon;
  href: string;
  description: string;
  items: NavItem[];
}

/** Standalone links that don't need a hub page — they're a single destination already. */
export const singleLinks: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, description: 'Your daily overview' },
  { href: '/dashboard/applications', label: 'Applications', icon: GraduationCap, description: 'Admissions applications' },
  { href: '/admin', label: 'Platform Admin', icon: Shield, description: 'Super-admin panel' },
];

/** Grouped sections — one button in the sidebar, sub-features shown as cards inside. */
export const navSections: NavSection[] = [
  {
    key: 'sales',
    label: 'Sales',
    icon: Briefcase,
    href: '/dashboard/sales',
    description: 'Everything for finding and closing deals.',
    items: [
      { href: '/dashboard/contacts', label: 'Leads', icon: Users, description: 'Track and manage every lead in one place.' },
      { href: '/dashboard/deals', label: 'Pipeline', icon: Briefcase, description: 'Visualize deals moving through your sales stages.' },
      { href: '/dashboard/campaigns', label: 'Campaigns', icon: Megaphone, description: 'Organize outreach campaigns and lead sources.' },
      { href: '/dashboard/tasks', label: 'Tasks', icon: CheckSquare, description: 'Stay on top of follow-ups and to-dos.' },
    ],
  },
  {
    key: 'engage',
    label: 'Engage',
    icon: MessageSquare,
    href: '/dashboard/engage',
    description: 'Talk to your leads and customers.',
    items: [
      { href: '/dashboard/calls', label: 'Calls', icon: Phone, description: 'Make and track calls with your leads and customers.' },
      { href: '/dashboard/messages', label: 'Messages', icon: MessageSquare, description: 'Two-way SMS and chat conversations.' },
      { href: '/dashboard/templates', label: 'Templates', icon: FileText, description: 'Reusable message templates for faster replies.' },
      { href: '/dashboard/marketing', label: 'Marketing', icon: Send, description: 'Build contact lists and marketing campaigns.' },
    ],
  },
  {
    key: 'automate',
    label: 'Automate',
    icon: Zap,
    href: '/dashboard/automate',
    description: 'Automation, reporting, and forecasting.',
    items: [
      { href: '/dashboard/workflows', label: 'Workflows', icon: Zap, description: 'Automate repetitive sales and follow-up steps.' },
      { href: '/dashboard/reports', label: 'Reports', icon: TrendingUp, description: 'Scheduled and on-demand performance reports.' },
      { href: '/dashboard/forecast', label: 'Sales Forecast', icon: LineChart, description: 'Projected leads and pipeline over time.' },
      { href: '/dashboard/campaign-intelligence', label: 'Campaign Intelligence', icon: Brain, description: 'KPIs and insights across your campaigns.' },
    ],
  },
  {
    key: 'whatsapp',
    label: 'WhatsApp',
    icon: MessageCircle,
    href: '/dashboard/whatsapp',
    description: 'Run your business on WhatsApp.',
    items: [
      { href: '/dashboard/whatsapp/inbox', label: 'Inbox', icon: MessageCircle, description: 'Unified two-way WhatsApp conversations, synced in real time.' },
      { href: '/dashboard/whatsapp/templates', label: 'Templates', icon: FileText, description: 'Manage Meta-approved WhatsApp message templates.', comingSoon: true },
      { href: '/dashboard/whatsapp/broadcast', label: 'Broadcast', icon: Send, description: 'Send bulk WhatsApp campaigns with delivery tracking.' },
      { href: '/dashboard/whatsapp/automation', label: 'Automation', icon: Workflow, description: 'Automated WhatsApp flows triggered by events.', comingSoon: true },
      { href: '/dashboard/whatsapp/analytics', label: 'Analytics', icon: BarChart3, description: 'Delivery, read, and reply rates.', comingSoon: true },
      { href: '/dashboard/whatsapp/wallet', label: 'WA Wallet', icon: Wallet, description: 'Track your messaging credit balance and top-ups.', comingSoon: true },
      { href: '/dashboard/whatsapp/settings', label: 'WA Settings', icon: Settings2, description: 'Configure your WhatsApp Business API connection.' },
    ],
  },
  {
    key: 'real-estate',
    label: 'Real Estate',
    icon: Building2,
    href: '/dashboard/real-estate',
    description: 'Manage projects, visits, and bookings.',
    items: [
      { href: '/dashboard/real-estate/projects', label: 'Projects', icon: Building2, description: 'Manage real estate projects and unit inventory.' },
      { href: '/dashboard/real-estate/site-visits', label: 'Site Visits', icon: MapPin, description: 'Schedule and track prospect site visits.' },
      { href: '/dashboard/real-estate/property-match', label: 'Property Match', icon: Sparkles, description: 'Match leads to available inventory based on their preferences.' },
      { href: '/dashboard/real-estate/bookings', label: 'Bookings', icon: CalendarCheck, description: 'Track unit bookings and payment milestones.' },
      { href: '/dashboard/real-estate/agent-tracker', label: 'Agent Tracker', icon: Radar, description: 'Monitor field agent activity and performance.' },
      { href: '/dashboard/real-estate/partners', label: 'Partners', icon: UsersRound, description: 'External brokers and channel partners who source or co-sell leads.' },
    ],
  },
  {
    key: 'ai-calling',
    label: 'AI Calling',
    icon: PhoneCall,
    href: '/dashboard/ai-calling',
    description: 'Outbound calling and call intelligence.',
    items: [
      { href: '/dashboard/ai-calling/lead-lists', label: 'Lead Lists', icon: ListChecks, description: 'Organize leads into dialing lists.', comingSoon: true },
      { href: '/dashboard/ai-calling/call-logs', label: 'Call Report', icon: PhoneCall, description: 'Filterable report of AI call history, outcomes, and cost.' },
      { href: '/dashboard/ai-calling/analytics', label: 'Analytics', icon: BarChart3, description: 'Call volume, connect rate, and performance.', comingSoon: true },
      { href: '/dashboard/ai-calling/call-report', label: 'AI Call Report', icon: Sparkles, description: 'AI-generated transcripts and sentiment.', comingSoon: true },
    ],
  },
  {
    key: 'shipping',
    label: 'Shipping',
    icon: Truck,
    href: '/dashboard/shipping',
    description: 'Fulfillment and delivery tracking.',
    items: [
      { href: '/dashboard/shipping/orders', label: 'Orders', icon: Package, description: 'Track customer orders ready for fulfillment.', comingSoon: true },
      { href: '/dashboard/shipping/shipments', label: 'Shipments', icon: Truck, description: 'Monitor shipment status and delivery updates.', comingSoon: true },
      { href: '/dashboard/shipping/delhivery-config', label: 'Delhivery Config', icon: Settings2, description: 'Configure your Delhivery courier credentials.', comingSoon: true },
    ],
  },
  {
    key: 'manage',
    label: 'Manage',
    icon: Settings,
    href: '/dashboard/manage',
    description: 'Workspace, team, and configuration.',
    items: [
      { href: '/dashboard/integrations', label: 'Integrations', icon: Plug, description: 'Connect lead sources and third-party tools.' },
      { href: '/dashboard/team', label: 'Team', icon: UsersRound, description: 'Invite teammates and manage roles.' },
      { href: '/dashboard/settings', label: 'Settings', icon: Settings, description: 'Workspace preferences and configuration.' },
      { href: '/dashboard/manage/ai', label: 'AI', icon: Sparkles, description: 'Configure AI-assisted features workspace-wide.', comingSoon: true },
    ],
  },
];

export const allNavItems: NavItem[] = [
  ...singleLinks,
  ...navSections.flatMap((s) => [{ href: s.href, label: s.label, icon: s.icon, description: s.description }, ...s.items]),
];
