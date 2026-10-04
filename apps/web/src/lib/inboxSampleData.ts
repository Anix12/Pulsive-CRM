// Static sample data for the Messages inbox. Replace with API data later:
//   conversations -> GET /api/v1/contacts + GET /api/v1/messages (+ calls)
//   thread items  -> GET /api/v1/messages?contactId=...

export type InboxChannel = 'WHATSAPP' | 'SMS' | 'EMAIL' | 'CALL';

export interface ThreadItem {
  id: string;
  channel: InboxChannel;
  direction: 'INBOUND' | 'OUTBOUND';
  time: string;
  body: string;
  /** Calls only */
  callTitle?: string;
  aiSummary?: string;
  /** Emails only */
  subject?: string;
}

export interface Conversation {
  id: string;
  name: string;
  initials: string;
  phone: string;
  email: string;
  company: string;
  source: string;
  status: string;
  temperature: 'Hot' | 'Warm' | 'Cold';
  online: boolean;
  unread: boolean;
  preview: string;
  lastAt: string;
  deal: { requirement: string; budget: string; nextFollowUp: string };
  thread: ThreadItem[];
}

export const sampleConversations: Conversation[] = [
  {
    id: 'c1',
    name: 'Rahul Sharma',
    initials: 'RS',
    phone: '+91 98765 43210',
    email: 'rahul.sharma@abcent.in',
    company: 'ABC Enterprises',
    source: 'Website',
    status: 'qualified',
    temperature: 'Hot',
    online: true,
    unread: true,
    preview: 'WhatsApp: Sharing pricing now.',
    lastAt: '2m',
    deal: { requirement: '2BHK, Sector 45', budget: '₹80L', nextFollowUp: 'Tomorrow, 11:00 AM' },
    thread: [
      { id: 't1', channel: 'WHATSAPP', direction: 'OUTBOUND', time: 'Today, 10:42 AM', body: 'Sharing the pricing details now, let me know if you have questions.' },
      {
        id: 't2', channel: 'CALL', direction: 'OUTBOUND', time: 'Today, 10:20 AM', body: '',
        callTitle: 'Outbound call · 4m 21s · Connected',
        aiSummary: 'Interested in 2BHK, budget ₹80L. Requested pricing on WhatsApp. Follow up tomorrow.',
      },
      { id: 't3', channel: 'EMAIL', direction: 'INBOUND', time: 'Yesterday, 4:15 PM', subject: 'Re: 2BHK Availability — Gurgaon Sector 45', body: 'Thank you for sharing the brochure. Could you also send the floor plan for the corner units?' },
      { id: 't4', channel: 'SMS', direction: 'OUTBOUND', time: 'Yesterday, 11:05 AM', body: 'Hi Rahul, this is Pulsive. Are you free for a quick call today?' },
    ],
  },
  {
    id: 'c2',
    name: 'Neha Gupta',
    initials: 'NG',
    phone: '+91 91234 56780',
    email: 'neha.gupta@brightmart.in',
    company: 'BrightMart Retail',
    source: 'IndiaMART',
    status: 'contacted',
    temperature: 'Warm',
    online: true,
    unread: true,
    preview: 'Call: 4m 21s · Interested',
    lastAt: '18m',
    deal: { requirement: 'Bulk order, 500 units', budget: '₹3.5L', nextFollowUp: 'Today, 5:00 PM' },
    thread: [
      { id: 't1', channel: 'CALL', direction: 'OUTBOUND', time: 'Today, 9:48 AM', body: '', callTitle: 'Outbound call · 4m 21s · Connected', aiSummary: 'Interested in bulk pricing for 500 units. Wants a quotation by evening.' },
      { id: 't2', channel: 'WHATSAPP', direction: 'INBOUND', time: 'Today, 9:30 AM', body: 'Please call me, I saw your listing on IndiaMART.' },
    ],
  },
  {
    id: 'c3',
    name: 'Aman Verma',
    initials: 'AV',
    phone: '+91 99887 76655',
    email: 'aman.verma@vermatraders.in',
    company: 'Verma Traders',
    source: 'JustDial',
    status: 'new',
    temperature: 'Cold',
    online: false,
    unread: false,
    preview: 'Email: Re: Product Brochure',
    lastAt: '1h',
    deal: { requirement: 'Product catalogue', budget: '₹1.2L', nextFollowUp: 'Friday, 3:00 PM' },
    thread: [
      { id: 't1', channel: 'EMAIL', direction: 'INBOUND', time: 'Today, 9:10 AM', subject: 'Re: Product Brochure', body: 'Received the brochure. I will review it with my partner and revert.' },
      { id: 't2', channel: 'EMAIL', direction: 'OUTBOUND', time: 'Yesterday, 6:40 PM', subject: 'Product Brochure', body: 'Hi Aman, please find our latest product brochure attached.' },
    ],
  },
  {
    id: 'c4',
    name: 'Priya Singh',
    initials: 'PS',
    phone: '+91 90000 11223',
    email: 'priya.singh@singhdesigns.in',
    company: 'Singh Designs',
    source: 'Facebook',
    status: 'contacted',
    temperature: 'Warm',
    online: false,
    unread: false,
    preview: 'SMS: Thanks, will check.',
    lastAt: '3h',
    deal: { requirement: 'Interior design package', budget: '₹6L', nextFollowUp: 'Monday, 12:00 PM' },
    thread: [
      { id: 't1', channel: 'SMS', direction: 'INBOUND', time: 'Today, 8:05 AM', body: 'Thanks, will check.' },
      { id: 't2', channel: 'SMS', direction: 'OUTBOUND', time: 'Today, 7:50 AM', body: 'Hi Priya, sharing the package details on your email.' },
    ],
  },
  {
    id: 'c5',
    name: 'Arjun Mehta',
    initials: 'AM',
    phone: '+91 98111 22334',
    email: 'arjun.mehta@mehtagroup.in',
    company: 'Mehta Group',
    source: 'TradeIndia',
    status: 'qualified',
    temperature: 'Hot',
    online: false,
    unread: false,
    preview: 'AI Call: Follow-up scheduled',
    lastAt: 'Yesterday',
    deal: { requirement: 'Warehouse automation', budget: '₹18L', nextFollowUp: 'Wednesday, 10:30 AM' },
    thread: [
      { id: 't1', channel: 'CALL', direction: 'OUTBOUND', time: 'Yesterday, 3:20 PM', body: '', callTitle: 'AI call · 6m 02s · Connected', aiSummary: 'Evaluating warehouse automation. Follow-up scheduled for Wednesday with the technical team.' },
    ],
  },
];
