'use client'

import { CountUp } from '@/components/landing/count-up'
import {
  ArrowRight,
  Sparkles,
  TrendingUp,
  Users,
  Zap,
} from 'lucide-react'
import { useEffect, useRef } from 'react'

export function Hero() {
  const glowRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const el = glowRef.current
    if (!el) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce) return
    let frame = 0
    const onMove = (e: PointerEvent) => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const x = (e.clientX / window.innerWidth) * 100
        const y = (e.clientY / window.innerHeight) * 100
        el.style.setProperty('--mx', `${x}%`)
        el.style.setProperty('--my', `${y}%`)
      })
    }
    window.addEventListener('pointermove', onMove)
    return () => {
      window.removeEventListener('pointermove', onMove)
      cancelAnimationFrame(frame)
    }
  }, [])

  return (
    <section
      id="top"
      className="relative flex min-h-screen items-center overflow-hidden pt-28 pb-16"
    >
      {/* backgrounds */}
      <div className="grid-bg pointer-events-none absolute inset-0 opacity-60 [mask-image:radial-gradient(ellipse_at_center,black_10%,transparent_75%)]" />
      <div
        ref={glowRef}
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(600px circle at var(--mx,50%) var(--my,28%), oklch(0.65 0.19 255 / 0.14), transparent 60%)',
        }}
      />
      <div className="animate-float-slow pointer-events-none absolute -left-24 top-24 size-[26rem] rounded-full bg-blue/20 blur-[120px]" />
      <div className="animate-float pointer-events-none absolute -right-16 top-40 size-[24rem] rounded-full bg-purple/20 blur-[130px]" />
      <div className="pointer-events-none absolute bottom-0 left-1/3 size-[22rem] rounded-full bg-cyan/10 blur-[120px]" />

      <div className="relative mx-auto grid w-full max-w-6xl items-center gap-14 px-4 lg:grid-cols-[1.05fr_1fr]">
        <div className="flex flex-col items-start">
          <div className="reveal mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-secondary/50 px-3.5 py-1.5 text-xs font-medium text-muted-foreground" data-visible="true">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-cyan opacity-70" />
              <span className="relative inline-flex size-2 rounded-full bg-cyan" />
            </span>
            Now with autonomous AI agents
          </div>

          <h1 className="text-balance text-5xl font-semibold leading-[1.02] tracking-tight sm:text-6xl lg:text-7xl">
            Your CRM.
            <br />
            Your <span className="text-gradient">AI.</span>
            <br />
            Your Workflow.
          </h1>

          <p className="mt-6 max-w-xl text-pretty text-lg leading-relaxed text-muted-foreground">
            Manage your entire customer journey in one place while autonomous AI
            agents handle the repetitive work — qualifying leads, drafting
            follow-ups, and keeping every record up to date.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a
              href="#crm"
              className="group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-xl bg-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground shadow-[0_10px_40px_-12px_oklch(0.65_0.19_255/0.7)] transition-transform duration-300 hover:scale-[1.03]"
            >
              <span className="relative z-10">Start Building</span>
              <ArrowRight className="relative z-10 size-4 transition-transform duration-300 group-hover:translate-x-1" />
              <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
            </a>
            <a
              href="#product"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-secondary/40 px-6 py-3.5 text-sm font-semibold text-foreground transition-colors duration-300 hover:bg-secondary"
            >
              Explore CRM
            </a>
          </div>

          <dl className="mt-12 grid w-full max-w-md grid-cols-3 gap-6">
            {[
              { v: 40, suffix: 'k+', label: 'Teams', icon: Users },
              { v: 3.2, suffix: 'M', label: 'AI actions/day', dec: 1, icon: Zap },
              { v: 98, suffix: '%', label: 'Retention', icon: TrendingUp },
            ].map((s) => (
              <div key={s.label}>
                <dt className="mb-1 flex items-center gap-1.5 text-muted-foreground">
                  <s.icon className="size-3.5 text-cyan" />
                </dt>
                <dd>
                  <span className="block text-2xl font-semibold tracking-tight">
                    <CountUp
                      end={s.v}
                      decimals={s.dec ?? 0}
                      suffix={s.suffix}
                    />
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {s.label}
                  </span>
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <HeroPreview />
      </div>
    </section>
  )
}

function HeroPreview() {
  return (
    <div className="reveal relative" data-visible="true">
      {/* floating AI orb */}
      <div className="animate-float absolute -left-6 top-10 z-20 hidden sm:block">
        <div className="glass flex items-center gap-3 rounded-2xl border border-border p-3 pr-4 shadow-2xl">
          <span className="relative grid size-9 place-items-center rounded-xl bg-gradient-to-br from-blue to-purple">
            <span className="absolute inset-0 animate-pulse-glow rounded-xl bg-gradient-to-br from-blue to-purple blur-md" />
            <Sparkles className="relative size-4 text-primary-foreground" />
          </span>
          <div className="text-left">
            <p className="text-xs font-medium">AI drafted 3 replies</p>
            <p className="text-[10px] text-muted-foreground">
              just now · saved 14 min
            </p>
          </div>
        </div>
      </div>

      <div className="animate-float-slow absolute -right-4 bottom-16 z-20 hidden md:block">
        <div className="glass rounded-2xl border border-border p-3 shadow-2xl">
          <p className="mb-1.5 text-[10px] text-muted-foreground">
            Conversion rate
          </p>
          <p className="text-lg font-semibold text-cyan">+18.4%</p>
          <div className="mt-1.5 flex h-8 items-end gap-1">
            {[40, 55, 45, 70, 60, 85, 100].map((h, i) => (
              <span
                key={i}
                className="w-1.5 rounded-full bg-gradient-to-t from-blue/40 to-cyan"
                style={{ height: `${h}%` }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* main dashboard card */}
      <div className="relative rounded-3xl border border-border bg-card/80 p-3 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.8)] backdrop-blur">
        <div className="rounded-2xl border border-border bg-background/70 p-4">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="size-2.5 rounded-full bg-destructive/70" />
              <span className="size-2.5 rounded-full bg-chart-5/70" />
              <span className="size-2.5 rounded-full bg-chart-4/70" />
            </div>
            <span className="rounded-md bg-secondary px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
              app.pulsive.crm
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {[
              { l: 'Revenue', v: '$284k', c: 'text-foreground' },
              { l: 'Open deals', v: '132', c: 'text-cyan' },
              { l: 'Win rate', v: '61%', c: 'text-purple' },
            ].map((k) => (
              <div
                key={k.l}
                className="rounded-xl border border-border bg-card p-3"
              >
                <p className="text-[10px] text-muted-foreground">{k.l}</p>
                <p className={`mt-1 text-lg font-semibold ${k.c}`}>{k.v}</p>
              </div>
            ))}
          </div>

          <div className="mt-3 rounded-xl border border-border bg-card p-3">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs font-medium">Pipeline</p>
              <span className="text-[10px] text-muted-foreground">
                Q3 · updated live
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {['Lead', 'Proposal', 'Closing'].map((stage, si) => (
                <div key={stage} className="space-y-2">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    {stage}
                  </p>
                  {Array.from({ length: 3 - si === 0 ? 1 : 3 - si }).map(
                    (_, ci) => (
                      <div
                        key={ci}
                        className="rounded-lg border border-border bg-background/80 p-2"
                      >
                        <div className="mb-1.5 h-1.5 w-2/3 rounded-full bg-muted-foreground/30" />
                        <div className="flex items-center gap-1.5">
                          <span
                            className="size-4 rounded-full"
                            style={{
                              background:
                                si === 0
                                  ? 'var(--blue)'
                                  : si === 1
                                    ? 'var(--cyan)'
                                    : 'var(--purple)',
                            }}
                          />
                          <div className="h-1.5 w-8 rounded-full bg-muted-foreground/20" />
                        </div>
                      </div>
                    ),
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
