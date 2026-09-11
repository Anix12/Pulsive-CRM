'use client'

import { CountUp } from '@/components/landing/count-up'
import { Reveal } from '@/components/landing/reveal'
import { SectionHeading } from '@/components/landing/section-heading'
import { cn } from '@/lib/utils'
import { Sparkles, TrendingUp } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

function useInView<T extends HTMLElement>(threshold = 0.35) {
  const ref = useRef<T | null>(null)
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setInView(true)
            io.disconnect()
          }
        }
      },
      { threshold },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [threshold])
  return { ref, inView }
}

export function Analytics() {
  return (
    <section id="analytics" className="relative mx-auto max-w-6xl px-4 py-24 sm:py-32">
      <SectionHeading
        eyebrow="Analytics"
        title="Numbers that explain themselves"
        description="Premium dashboards with real-time revenue, conversion, and funnel metrics — each paired with an AI-generated insight."
      />

      <div className="mt-14 grid gap-4 lg:grid-cols-3">
        <Reveal className="lg:col-span-2">
          <RevenueChart />
        </Reveal>
        <Reveal delay={100}>
          <ConversionRing />
        </Reveal>
        <Reveal delay={80}>
          <LeadSources />
        </Reveal>
        <Reveal delay={160} className="lg:col-span-2">
          <Funnel />
        </Reveal>
      </div>
    </section>
  )
}

function Card({
  title,
  children,
  className,
}: {
  title: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex h-full flex-col rounded-3xl border border-border bg-card/60 p-5',
        className,
      )}
    >
      <p className="mb-4 text-sm font-medium">{title}</p>
      {children}
    </div>
  )
}

function RevenueChart() {
  const { ref, inView } = useInView<HTMLDivElement>(0.4)
  const points = [22, 30, 26, 40, 36, 52, 48, 64, 60, 78, 88, 96]
  const w = 520
  const h = 180
  const max = 100
  const step = w / (points.length - 1)
  const coords = points.map((p, i) => [i * step, h - (p / max) * h])
  const line = coords.map((c, i) => `${i === 0 ? 'M' : 'L'}${c[0]},${c[1]}`).join(' ')
  const area = `${line} L${w},${h} L0,${h} Z`

  return (
    <div ref={ref}>
      <Card title="Revenue">
        <div className="mb-4 flex items-end justify-between">
          <div>
            <p className="text-3xl font-semibold tracking-tight">
              <CountUp end={284} prefix="$" suffix="k" />
            </p>
            <p className="mt-1 inline-flex items-center gap-1 text-xs text-chart-4">
              <TrendingUp className="size-3.5" /> +23.6% vs last quarter
            </p>
          </div>
        </div>
        <div className="relative w-full">
          <svg
            viewBox={`0 0 ${w} ${h}`}
            className="h-40 w-full"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="rev-area" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--cyan)" stopOpacity="0.35" />
                <stop offset="100%" stopColor="var(--cyan)" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="rev-line" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="var(--blue)" />
                <stop offset="100%" stopColor="var(--purple)" />
              </linearGradient>
            </defs>
            <path
              d={area}
              fill="url(#rev-area)"
              style={{
                opacity: inView ? 1 : 0,
                transition: 'opacity 1s ease 0.5s',
              }}
            />
            <path
              d={line}
              fill="none"
              stroke="url(#rev-line)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              pathLength={1}
              style={{
                strokeDasharray: 1,
                strokeDashoffset: inView ? 0 : 1,
                transition: 'stroke-dashoffset 1.4s cubic-bezier(0.16,1,0.3,1)',
              }}
            />
          </svg>
        </div>
        <div className="mt-2 flex justify-between font-mono text-[10px] text-muted-foreground">
          {['Jan', 'Mar', 'May', 'Jul', 'Sep', 'Nov'].map((m) => (
            <span key={m}>{m}</span>
          ))}
        </div>
      </Card>
    </div>
  )
}

function ConversionRing() {
  const { ref, inView } = useInView<HTMLDivElement>(0.5)
  const pct = 68
  const r = 52
  const circ = 2 * Math.PI * r
  return (
    <div ref={ref} className="h-full">
      <Card title="Conversion rate">
        <div className="flex flex-1 flex-col items-center justify-center">
          <div className="relative grid place-items-center">
            <svg width="140" height="140" viewBox="0 0 140 140" aria-hidden="true">
              <defs>
                <linearGradient id="ring-line" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="var(--blue)" />
                  <stop offset="100%" stopColor="var(--purple)" />
                </linearGradient>
              </defs>
              <circle
                cx="70"
                cy="70"
                r={r}
                fill="none"
                stroke="var(--secondary)"
                strokeWidth="12"
              />
              <circle
                cx="70"
                cy="70"
                r={r}
                fill="none"
                stroke="url(#ring-line)"
                strokeWidth="12"
                strokeLinecap="round"
                transform="rotate(-90 70 70)"
                style={{
                  strokeDasharray: circ,
                  strokeDashoffset: inView ? circ * (1 - pct / 100) : circ,
                  transition: 'stroke-dashoffset 1.4s cubic-bezier(0.16,1,0.3,1)',
                }}
              />
            </svg>
            <div className="absolute text-center">
              <p className="text-2xl font-semibold">
                <CountUp end={pct} suffix="%" />
              </p>
              <p className="text-[10px] text-muted-foreground">converted</p>
            </div>
          </div>
          <p className="mt-3 text-center text-xs text-chart-4">
            +18% this month
          </p>
        </div>
      </Card>
    </div>
  )
}

function LeadSources() {
  const { ref, inView } = useInView<HTMLDivElement>(0.4)
  const sources = [
    { label: 'Inbound', pct: 42, hue: 'var(--blue)' },
    { label: 'Referral', pct: 27, hue: 'var(--cyan)' },
    { label: 'Outbound', pct: 19, hue: 'var(--purple)' },
    { label: 'Events', pct: 12, hue: 'var(--chart-4)' },
  ]
  return (
    <div ref={ref} className="h-full">
      <Card title="Lead sources">
        <div className="flex flex-1 flex-col justify-center gap-3.5">
          {sources.map((s, i) => (
            <div key={s.label}>
              <div className="mb-1 flex justify-between text-xs">
                <span className="text-muted-foreground">{s.label}</span>
                <span className="font-medium">{s.pct}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: inView ? `${s.pct}%` : '0%',
                    background: s.hue,
                    transition: `width 1.1s cubic-bezier(0.16,1,0.3,1) ${i * 120}ms`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

function Funnel() {
  const { ref, inView } = useInView<HTMLDivElement>(0.4)
  const stages = [
    { label: 'Visitors', v: 100, count: '48,200' },
    { label: 'Leads', v: 64, count: '30,850' },
    { label: 'Qualified', v: 38, count: '18,320' },
    { label: 'Proposals', v: 21, count: '10,120' },
    { label: 'Won', v: 11, count: '5,310' },
  ]
  return (
    <div ref={ref} className="h-full">
      <Card title="Sales funnel">
        <div className="flex flex-1 items-end gap-2 sm:gap-3">
          {stages.map((s, i) => (
            <div key={s.label} className="flex flex-1 flex-col items-center gap-2">
              <span className="text-xs font-medium">{s.count}</span>
              <div className="flex h-40 w-full items-end">
                <div
                  className="w-full rounded-t-lg bg-gradient-to-t from-blue/30 to-cyan"
                  style={{
                    height: inView ? `${s.v}%` : '0%',
                    transition: `height 1.1s cubic-bezier(0.16,1,0.3,1) ${i * 120}ms`,
                  }}
                />
              </div>
              <span className="text-center text-[10px] text-muted-foreground">
                {s.label}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-5 flex items-start gap-2 rounded-2xl border border-border bg-gradient-to-br from-purple/10 to-blue/5 p-3">
          <span className="grid size-6 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-blue to-purple">
            <Sparkles className="size-3.5 text-primary-foreground" />
          </span>
          <p className="text-xs leading-relaxed text-muted-foreground">
            <span className="font-medium text-foreground">AI insight:</span>{' '}
            Conversion rate increased by 18% this month, driven mostly by faster
            first-response times on inbound leads.
          </p>
        </div>
      </Card>
    </div>
  )
}
