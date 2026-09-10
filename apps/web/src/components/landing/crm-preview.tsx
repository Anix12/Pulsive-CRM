'use client'

import { CountUp } from '@/components/landing/count-up'
import { Reveal } from '@/components/landing/reveal'
import { SectionHeading } from '@/components/landing/section-heading'
import { cn } from '@/lib/utils'
import {
  Bell,
  ChevronRight,
  Contact2,
  LayoutDashboard,
  Search,
  Settings,
  SlidersHorizontal,
  Sparkles,
  Target,
  TrendingUp,
  Users,
} from 'lucide-react'
import { useState } from 'react'

const NAV = [
  { label: 'Dashboard', icon: LayoutDashboard },
  { label: 'Leads', icon: Target },
  { label: 'Contacts', icon: Contact2 },
  { label: 'Customers', icon: Users },
  { label: 'Analytics', icon: TrendingUp },
  { label: 'Settings', icon: Settings },
]

const STAGES = ['New', 'Qualified', 'Proposal', 'Won'] as const
type Stage = (typeof STAGES)[number]

type Deal = {
  id: number
  name: string
  company: string
  value: number
  stage: Stage
  hue: string
}

const INITIAL_DEALS: Deal[] = [
  { id: 1, name: 'Ava Chen', company: 'Northwind', value: 24000, stage: 'New', hue: 'var(--blue)' },
  { id: 2, name: 'Marco Diaz', company: 'Lumen Labs', value: 41000, stage: 'Qualified', hue: 'var(--cyan)' },
  { id: 3, name: 'Priya Rao', company: 'Vertex', value: 68000, stage: 'Proposal', hue: 'var(--purple)' },
  { id: 4, name: 'Sam Okafor', company: 'Bright AI', value: 15500, stage: 'New', hue: 'var(--blue)' },
  { id: 5, name: 'Lena Fischer', company: 'Orbit', value: 92000, stage: 'Won', hue: 'var(--cyan)' },
]

function initials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
}

export function CrmPreview() {
  const [active, setActive] = useState('Dashboard')
  const [deals, setDeals] = useState(INITIAL_DEALS)
  const [moved, setMoved] = useState<number | null>(null)

  function advance(id: number) {
    setDeals((prev) =>
      prev.map((d) => {
        if (d.id !== id) return d
        const idx = STAGES.indexOf(d.stage)
        const next = STAGES[Math.min(idx + 1, STAGES.length - 1)]
        return { ...d, stage: next }
      }),
    )
    setMoved(id)
    window.setTimeout(() => setMoved(null), 650)
  }

  const totalValue = deals.reduce((sum, d) => sum + d.value, 0)

  return (
    <section id="crm" className="relative mx-auto max-w-6xl px-4 py-24 sm:py-32">
      <SectionHeading
        eyebrow="Live workspace"
        title="A CRM you can actually feel"
        description="This is a real, interactive preview. Move deals across the pipeline, hover the records, and watch the numbers respond."
      />

      <Reveal className="mt-14">
        <div className="overflow-hidden rounded-3xl border border-border bg-card/70 shadow-[0_40px_120px_-40px_rgba(0,0,0,0.9)] backdrop-blur">
          <div className="grid grid-cols-1 md:grid-cols-[220px_1fr]">
            {/* sidebar */}
            <aside className="hidden flex-col gap-1 border-r border-border bg-background/40 p-4 md:flex">
              <div className="mb-4 flex items-center gap-2 px-2">
                <span className="grid size-7 place-items-center rounded-lg bg-gradient-to-br from-blue via-cyan to-purple text-[10px] font-bold text-primary-foreground">
                  N
                </span>
                <span className="text-sm font-semibold">Workspace</span>
              </div>
              {NAV.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => setActive(item.label)}
                  className={cn(
                    'flex items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors',
                    active === item.label
                      ? 'bg-primary/15 text-foreground ring-1 ring-inset ring-primary/30'
                      : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
                  )}
                >
                  <item.icon
                    className={cn(
                      'size-4',
                      active === item.label ? 'text-cyan' : '',
                    )}
                  />
                  {item.label}
                </button>
              ))}
              <div className="mt-auto rounded-xl border border-border bg-gradient-to-br from-purple/15 to-blue/10 p-3">
                <p className="text-xs font-medium">AI credits</p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  8,240 remaining
                </p>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-secondary">
                  <div className="h-full w-3/4 rounded-full bg-gradient-to-r from-blue to-cyan" />
                </div>
              </div>
            </aside>

            {/* main */}
            <div className="min-w-0 p-4 sm:p-5">
              {/* top bar */}
              <div className="mb-5 flex items-center gap-3">
                <div className="flex flex-1 items-center gap-2 rounded-xl border border-border bg-background/60 px-3 py-2 text-sm text-muted-foreground">
                  <Search className="size-4" />
                  <span className="truncate">Search deals, people, companies…</span>
                  <kbd className="ml-auto hidden rounded bg-secondary px-1.5 py-0.5 font-mono text-[10px] sm:inline">
                    ⌘K
                  </kbd>
                </div>
                <button
                  type="button"
                  className="grid size-9 shrink-0 place-items-center rounded-xl border border-border bg-background/60 text-muted-foreground transition-colors hover:text-foreground"
                  aria-label="Filters"
                >
                  <SlidersHorizontal className="size-4" />
                </button>
                <button
                  type="button"
                  className="relative grid size-9 shrink-0 place-items-center rounded-xl border border-border bg-background/60 text-muted-foreground transition-colors hover:text-foreground"
                  aria-label="Notifications"
                >
                  <Bell className="size-4" />
                  <span className="absolute right-2 top-2 size-1.5 rounded-full bg-cyan" />
                </button>
              </div>

              {/* stats */}
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {[
                  { l: 'Pipeline value', v: totalValue, prefix: '$', icon: TrendingUp, c: 'text-foreground' },
                  { l: 'Active deals', v: deals.length, icon: Target, c: 'text-cyan' },
                  { l: 'Win rate', v: 61, suffix: '%', icon: Sparkles, c: 'text-purple' },
                  { l: 'New leads', v: 128, icon: Users, c: 'text-blue' },
                ].map((s) => (
                  <div
                    key={s.l}
                    className="rounded-2xl border border-border bg-background/50 p-4 transition-colors hover:border-primary/30"
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-[11px] text-muted-foreground">
                        {s.l}
                      </span>
                      <s.icon className="size-3.5 text-muted-foreground" />
                    </div>
                    <p className={cn('text-xl font-semibold tracking-tight', s.c)}>
                      <CountUp
                        end={s.v}
                        prefix={s.prefix ?? ''}
                        suffix={s.suffix ?? ''}
                      />
                    </p>
                  </div>
                ))}
              </div>

              {/* pipeline + side */}
              <div className="mt-4 grid gap-4 lg:grid-cols-[1.7fr_1fr]">
                {/* pipeline */}
                <div className="rounded-2xl border border-border bg-background/40 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-sm font-medium">Sales pipeline</p>
                    <span className="text-[11px] text-muted-foreground">
                      Tap a card to advance →
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {STAGES.map((stage) => (
                      <div key={stage} className="min-w-0">
                        <div className="mb-2 flex items-center justify-between">
                          <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                            {stage}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {deals.filter((d) => d.stage === stage).length}
                          </span>
                        </div>
                        <div className="space-y-2">
                          {deals
                            .filter((d) => d.stage === stage)
                            .map((d) => (
                              <button
                                key={d.id}
                                type="button"
                                onClick={() => advance(d.id)}
                                disabled={d.stage === 'Won'}
                                className={cn(
                                  'group w-full rounded-xl border border-border bg-card p-2.5 text-left transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40 disabled:cursor-default',
                                  moved === d.id &&
                                    'ring-2 ring-cyan ring-offset-2 ring-offset-background',
                                )}
                              >
                                <div className="flex items-center gap-2">
                                  <span
                                    className="grid size-6 shrink-0 place-items-center rounded-full text-[9px] font-semibold text-primary-foreground"
                                    style={{ background: d.hue }}
                                  >
                                    {initials(d.name)}
                                  </span>
                                  <span className="truncate text-xs font-medium">
                                    {d.name}
                                  </span>
                                </div>
                                <div className="mt-1.5 flex items-center justify-between">
                                  <span className="truncate text-[10px] text-muted-foreground">
                                    {d.company}
                                  </span>
                                  <span className="text-[10px] font-semibold text-cyan">
                                    ${(d.value / 1000).toFixed(0)}k
                                  </span>
                                </div>
                                {d.stage !== 'Won' && (
                                  <span className="mt-1.5 flex items-center gap-0.5 text-[9px] text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
                                    Advance <ChevronRight className="size-3" />
                                  </span>
                                )}
                              </button>
                            ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* right column: AI recs + timeline */}
                <div className="flex flex-col gap-4">
                  <div className="rounded-2xl border border-border bg-gradient-to-br from-purple/10 to-blue/5 p-4">
                    <div className="mb-2 flex items-center gap-2">
                      <span className="grid size-6 place-items-center rounded-lg bg-gradient-to-br from-blue to-purple">
                        <Sparkles className="size-3.5 text-primary-foreground" />
                      </span>
                      <p className="text-sm font-medium">AI recommendations</p>
                    </div>
                    <ul className="space-y-2 text-xs text-muted-foreground">
                      <li className="rounded-lg border border-border bg-background/50 p-2.5">
                        <span className="text-foreground">Priya Rao</span> is
                        likely to close — send a proposal today.
                      </li>
                      <li className="rounded-lg border border-border bg-background/50 p-2.5">
                        24 customers went quiet.{' '}
                        <span className="text-cyan">Draft follow-ups</span>
                      </li>
                    </ul>
                  </div>

                  <div className="rounded-2xl border border-border bg-background/40 p-4">
                    <p className="mb-3 text-sm font-medium">Activity</p>
                    <ol className="space-y-3">
                      {[
                        { c: 'var(--cyan)', t: 'AI qualified 6 new leads', s: '2m' },
                        { c: 'var(--blue)', t: 'Deal moved to Proposal', s: '18m' },
                        { c: 'var(--purple)', t: 'Follow-up sent to Orbit', s: '1h' },
                      ].map((a, i) => (
                        <li key={i} className="flex items-start gap-2.5">
                          <span
                            className="mt-1 size-2 shrink-0 rounded-full"
                            style={{ background: a.c }}
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-xs text-foreground">{a.t}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {a.s} ago
                            </p>
                          </div>
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  )
}
