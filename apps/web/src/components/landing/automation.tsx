'use client'

import { SectionHeading } from '@/components/landing/section-heading'
import { cn } from '@/lib/utils'
import {
  ArrowRight,
  CheckCircle2,
  MailPlus,
  Sparkles,
  UserPlus,
  Zap,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

const NODES = [
  { icon: Zap, title: 'New lead', sub: 'Trigger', hue: 'var(--blue)' },
  { icon: Sparkles, title: 'AI analyzes lead', sub: 'Score & enrich', hue: 'var(--cyan)' },
  { icon: UserPlus, title: 'Assign salesperson', sub: 'Round-robin', hue: 'var(--purple)' },
  { icon: MailPlus, title: 'Send message', sub: 'Personalized by AI', hue: 'var(--blue)' },
  { icon: CheckCircle2, title: 'Create follow-up', sub: 'Task + reminder', hue: 'var(--cyan)' },
]

export function Automation() {
  const [active, setActive] = useState(false)
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActive(true)
            io.disconnect()
          }
        }
      },
      { threshold: 0.35 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <section id="automation" className="relative mx-auto max-w-6xl px-4 py-24 sm:py-32">
      <SectionHeading
        eyebrow="Automation"
        title="Design workflows that run themselves"
        description="Chain triggers, AI steps, and actions into visual automations. Build once, and let Pulsive handle every lead the same way — instantly."
      />

      <div
        ref={ref}
        className="relative mt-14 rounded-3xl border border-border bg-card/50 p-6 sm:p-10"
      >
        <div className="grid-bg pointer-events-none absolute inset-0 rounded-3xl opacity-40 [mask-image:radial-gradient(ellipse_at_center,black,transparent_80%)]" />

        {/* flow */}
        <div className="relative flex flex-col items-stretch gap-0 lg:flex-row lg:items-center lg:justify-between">
          {NODES.map((node, i) => (
            <div
              key={node.title}
              className="flex flex-col items-center lg:flex-1 lg:flex-row"
            >
              <div
                className={cn(
                  'reveal w-full max-w-[220px] rounded-2xl border border-border bg-background/80 p-4 backdrop-blur transition-all duration-700 lg:w-auto',
                )}
                data-visible={active}
                style={{ transitionDelay: `${i * 180}ms` }}
              >
                <div className="flex items-center gap-3">
                  <span
                    className="grid size-10 shrink-0 place-items-center rounded-xl"
                    style={{
                      background: `color-mix(in oklch, ${node.hue} 22%, transparent)`,
                      boxShadow: `0 0 24px -8px ${node.hue}`,
                    }}
                  >
                    <node.icon
                      className="size-5"
                      style={{ color: node.hue }}
                    />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">
                      {node.title}
                    </p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {node.sub}
                    </p>
                  </div>
                </div>
              </div>

              {i < NODES.length - 1 && (
                <div className="flex items-center justify-center py-2 lg:flex-1 lg:py-0">
                  {/* vertical connector on mobile, horizontal on desktop */}
                  <span
                    className="block h-6 w-px origin-top bg-gradient-to-b from-cyan to-purple transition-transform duration-500 lg:hidden"
                    style={{
                      transform: active ? 'scaleY(1)' : 'scaleY(0)',
                      transitionDelay: `${i * 180 + 120}ms`,
                    }}
                  />
                  <span className="relative hidden h-px flex-1 lg:block">
                    <span
                      className="absolute inset-0 origin-left bg-gradient-to-r from-cyan to-purple transition-transform duration-500"
                      style={{
                        transform: active ? 'scaleX(1)' : 'scaleX(0)',
                        transitionDelay: `${i * 180 + 120}ms`,
                      }}
                    />
                    <ArrowRight
                      className="absolute -right-1 top-1/2 size-4 -translate-y-1/2 text-purple transition-opacity duration-300"
                      style={{
                        opacity: active ? 1 : 0,
                        transitionDelay: `${i * 180 + 380}ms`,
                      }}
                    />
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>

        <div
          className="reveal mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground"
          data-visible={active}
          style={{ transitionDelay: '1000ms' }}
        >
          <span className="inline-flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-chart-4" /> Runs in ~2s
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-cyan" /> 0 manual steps
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-purple" /> Fully editable
          </span>
        </div>
      </div>
    </section>
  )
}
