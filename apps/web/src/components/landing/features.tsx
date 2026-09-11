import { Reveal } from '@/components/landing/reveal'
import { SectionHeading } from '@/components/landing/section-heading'
import {
  Building2,
  CalendarClock,
  Contact,
  GitBranch,
  LineChart,
  ListChecks,
  MessagesSquare,
  Target,
} from 'lucide-react'

const FEATURES = [
  {
    icon: Target,
    title: 'Leads & Deals',
    body: 'Capture, score, and route every lead automatically, then track deals through a pipeline that updates itself.',
    accent: 'from-blue/25 to-blue/5',
  },
  {
    icon: Contact,
    title: 'Contacts & Companies',
    body: 'A unified record for every person and account, enriched and deduplicated the moment data arrives.',
    accent: 'from-cyan/25 to-cyan/5',
  },
  {
    icon: GitBranch,
    title: 'Custom Pipelines',
    body: 'Design pipelines and stages that match how your team actually sells — no rigid templates.',
    accent: 'from-purple/25 to-purple/5',
  },
  {
    icon: ListChecks,
    title: 'Tasks & Follow-ups',
    body: 'Never drop a thread. AI surfaces what needs attention and schedules the next best action.',
    accent: 'from-blue/25 to-blue/5',
  },
  {
    icon: MessagesSquare,
    title: 'Unified Inbox',
    body: 'Email, calls, and chat threaded onto each record with AI summaries of every conversation.',
    accent: 'from-cyan/25 to-cyan/5',
  },
  {
    icon: LineChart,
    title: 'Live Analytics',
    body: 'Revenue, conversion, and forecasts computed in real time with AI-generated insights on top.',
    accent: 'from-purple/25 to-purple/5',
  },
  {
    icon: CalendarClock,
    title: 'Smart Reminders',
    body: 'Follow-up nudges timed to the moment a customer is most likely to respond.',
    accent: 'from-blue/25 to-blue/5',
  },
  {
    icon: Building2,
    title: 'Modular Workspace',
    body: 'Build your own dashboards, views, and objects. The CRM adapts to your workflow, not the reverse.',
    accent: 'from-cyan/25 to-cyan/5',
  },
]

export function Features() {
  return (
    <section id="product" className="relative mx-auto max-w-6xl px-4 py-24 sm:py-32">
      <SectionHeading
        eyebrow="One platform"
        title={
          <>
            Everything your team needs,
            <br className="hidden sm:block" /> nothing it doesn&apos;t.
          </>
        }
        description="Pulsive brings your whole customer journey into a single, modular workspace — then layers autonomous AI on top of it."
      />

      <div className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {FEATURES.map((f, i) => (
          <Reveal key={f.title} delay={(i % 4) * 80}>
            <article className="group relative h-full overflow-hidden rounded-2xl border border-border bg-card/60 p-5 transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:bg-card">
              <div
                className={`mb-4 grid size-11 place-items-center rounded-xl bg-gradient-to-br ${f.accent} ring-1 ring-inset ring-border`}
              >
                <f.icon className="size-5 text-foreground" />
              </div>
              <h3 className="text-base font-semibold">{f.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                {f.body}
              </p>
              <div className="pointer-events-none absolute -right-8 -top-8 size-24 rounded-full bg-primary/10 opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100" />
            </article>
          </Reveal>
        ))}
      </div>
    </section>
  )
}
