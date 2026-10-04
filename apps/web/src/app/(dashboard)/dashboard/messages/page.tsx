'use client';

import { useMemo, useState } from 'react';
import { Search, Send, Phone, Briefcase } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  sampleConversations,
  type Conversation,
  type InboxChannel,
  type ThreadItem,
} from '@/lib/inboxSampleData';

type Tab = 'ALL' | 'UNREAD' | 'RECENT';
type SendChannel = Exclude<InboxChannel, 'CALL'>;

const channelLabel: Record<InboxChannel, string> = {
  WHATSAPP: 'WhatsApp',
  SMS: 'SMS',
  EMAIL: 'Email',
  CALL: 'AI Call',
};

const channelTag: Record<InboxChannel, string> = {
  WHATSAPP: 'bg-green-50 text-green-700',
  SMS: 'bg-purple-50 text-purple-700',
  EMAIL: 'bg-amber-50 text-amber-700',
  CALL: 'bg-blue-50 text-blue-700',
};

const tempBadge: Record<Conversation['temperature'], string> = {
  Hot: 'bg-red-50 text-red-700',
  Warm: 'bg-amber-50 text-amber-700',
  Cold: 'bg-blue-50 text-blue-700',
};

export default function MessagesPage() {
  const [conversations, setConversations] = useState<Conversation[]>(sampleConversations);
  const [selectedId, setSelectedId] = useState(sampleConversations[0].id);
  const [tab, setTab] = useState<Tab>('ALL');
  const [search, setSearch] = useState('');
  const [channel, setChannel] = useState<SendChannel>('WHATSAPP');
  const [draft, setDraft] = useState('');

  const selected = conversations.find((c) => c.id === selectedId) ?? conversations[0];

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return conversations
      .filter((c) => (tab === 'UNREAD' ? c.unread : true))
      .filter((c) => (tab === 'RECENT' ? ['m', 'h'].some((u) => c.lastAt.endsWith(u)) : true))
      .filter((c) => !q || `${c.name} ${c.phone} ${c.preview}`.toLowerCase().includes(q));
  }, [conversations, tab, search]);

  const select = (id: string) => {
    setSelectedId(id);
    setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, unread: false } : c)));
  };

  const send = () => {
    const body = draft.trim();
    if (!body) return;
    const item: ThreadItem = {
      id: `local-${selected.thread.length + 1}`,
      channel,
      direction: 'OUTBOUND',
      time: 'Just now',
      body,
    };
    setConversations((prev) =>
      prev.map((c) =>
        c.id === selected.id
          ? { ...c, thread: [item, ...c.thread], preview: `${channelLabel[channel]}: ${body}`, lastAt: 'now' }
          : c,
      ),
    );
    setDraft('');
  };

  return (
    <div
      className="flex gap-4"
      style={{ height: 'calc(100vh - 8rem)' }}
    >
      {/* Conversation list */}
      <aside className="flex w-80 flex-shrink-0 flex-col overflow-hidden rounded-2xl bg-card shadow-sm ring-1 ring-border">
        <div className="space-y-3 p-4">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-bold text-foreground">Inbox</h1>
            <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
              Example
            </span>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search conversations..."
              className="w-full rounded-lg border border-border bg-background py-2 pl-8 pr-3 text-sm text-foreground focus:border-primary focus:outline-none"
            />
          </div>
          <div className="flex gap-1.5">
            {([['ALL', 'All'], ['UNREAD', 'Unread'], ['RECENT', 'Recent']] as const).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={cn(
                  'rounded-full px-3 py-1 text-xs font-medium transition-colors',
                  tab === key ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted',
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 space-y-1 overflow-y-auto px-2 pb-2">
          {visible.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">No conversations found.</p>
          ) : (
            visible.map((c) => (
              <button
                key={c.id}
                onClick={() => select(c.id)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left hover:bg-muted/60',
                  c.id === selected.id && 'bg-muted',
                )}
              >
                <div className="relative flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-secondary-foreground">
                  {c.initials}
                  {c.online && (
                    <span className="absolute -left-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-card bg-green-500" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className={cn('truncate text-sm text-foreground', c.unread ? 'font-bold' : 'font-semibold')}>
                      {c.name}
                    </p>
                    <span className="flex-shrink-0 text-[11px] text-muted-foreground">{c.lastAt}</span>
                  </div>
                  <p className="truncate text-xs text-muted-foreground">{c.preview}</p>
                </div>
              </button>
            ))
          )}
        </div>
      </aside>

      {/* Thread */}
      <section className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-2xl bg-card shadow-sm ring-1 ring-border">
        <header className="flex items-center justify-between border-b border-border px-5 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-foreground text-xs font-semibold text-background">
              {selected.initials}
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">{selected.name}</p>
              <p className="text-xs text-muted-foreground">
                {selected.phone} · {selected.company}
              </p>
            </div>
          </div>
          <button
            aria-label={`Call ${selected.name}`}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground hover:opacity-90"
          >
            <Phone className="h-4 w-4" />
          </button>
        </header>

        <div className="flex-1 space-y-4 overflow-y-auto bg-background/60 p-5">
          {selected.thread.map((item) => (
            <ThreadCard key={item.id} item={item} />
          ))}
        </div>

        <footer className="flex items-center gap-3 border-t border-border px-5 py-3">
          <select
            value={channel}
            onChange={(e) => setChannel(e.target.value as SendChannel)}
            className={cn(
              'rounded-full border border-border px-3 py-2 text-xs font-medium focus:outline-none',
              channelTag[channel],
            )}
          >
            <option value="WHATSAPP">WhatsApp</option>
            <option value="SMS">SMS</option>
            <option value="EMAIL">Email</option>
          </select>
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && send()}
            placeholder="Write a message..."
            className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
          />
          <button
            onClick={send}
            disabled={!draft.trim()}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
            Send
          </button>
        </footer>
      </section>

      {/* Contact panel */}
      <aside className="hidden w-72 flex-shrink-0 overflow-y-auto rounded-2xl bg-card shadow-sm ring-1 ring-border xl:block">
        <Panel title="Contact">
          <Field label="Phone" value={selected.phone} />
          <Field label="Email" value={selected.email} />
          <Field label="Company" value={selected.company} />
          <Field label="Source" value={selected.source} />
        </Panel>
        <Panel title="Status">
          <div className="flex gap-2">
            <span className="rounded-full bg-green-50 px-2.5 py-0.5 text-[11px] font-medium text-green-700">
              {selected.status}
            </span>
            <span className={cn('rounded-full px-2.5 py-0.5 text-[11px] font-medium', tempBadge[selected.temperature])}>
              {selected.temperature}
            </span>
          </div>
        </Panel>
        <Panel title="Deal">
          <Field label="Requirement" value={selected.deal.requirement} />
          <Field label="Budget" value={selected.deal.budget} />
          <Field label="Next follow-up" value={selected.deal.nextFollowUp} />
        </Panel>
        <div className="p-4">
          <button className="flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-muted/50 px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted">
            <Briefcase className="h-3.5 w-3.5" />
            Handoff to Sales
          </button>
        </div>
      </aside>
    </div>
  );
}

function ThreadCard({ item }: { item: ThreadItem }) {
  return (
    <div
      className={cn(
        'rounded-xl border bg-card p-4',
        item.channel === 'CALL' ? 'border-primary ring-1 ring-primary/30' : 'border-border',
      )}
    >
      <span className={cn('inline-block rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide', channelTag[item.channel])}>
        {channelLabel[item.channel]}
      </span>

      {item.channel === 'CALL' ? (
        <>
          <p className="mt-2 text-sm font-medium text-foreground">{item.callTitle}</p>
          {item.aiSummary && (
            <div className="mt-2 rounded-lg border border-dashed border-primary/50 bg-primary/5 px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">AI Summary</p>
              <p className="mt-0.5 text-xs text-foreground">{item.aiSummary}</p>
            </div>
          )}
          <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
            <span>{item.time}</span>
            <span className="space-x-2">
              <button className="font-medium text-primary hover:underline">Play recording</button>
              <span>·</span>
              <button className="font-medium text-primary hover:underline">View transcript</button>
            </span>
          </div>
        </>
      ) : (
        <>
          {item.subject && <p className="mt-2 text-sm font-semibold text-foreground">{item.subject}</p>}
          <p className={cn('text-sm text-foreground', item.subject ? 'mt-1' : 'mt-2')}>
            {item.direction === 'OUTBOUND' && <span className="font-semibold">You: </span>}
            {item.body}
          </p>
          <p className="mt-2 text-[11px] text-muted-foreground">{item.time}</p>
        </>
      )}
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3 border-b border-border p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{title}</p>
      {children}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="truncate text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}
