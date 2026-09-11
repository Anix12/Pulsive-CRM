'use client'

import { Reveal } from '@/components/landing/reveal'
import { SectionHeading } from '@/components/landing/section-heading'
import { cn } from '@/lib/utils'
import {
  BellRing,
  FileText,
  MessageSquareText,
  Search,
  Sparkles,
  UserSearch,
  Wand2,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

const CAPABILITIES = [
  { icon: UserSearch, label: 'Find high-value leads' },
  { icon: MessageSquareText, label: 'Summarize conversations' },
  { icon: Wand2, label: 'Draft follow-ups' },
  { icon: FileText, label: 'Generate reports' },
  { icon: BellRing, label: 'Remind on follow-ups' },
  { icon: Search, label: 'Answer data questions' },
]

const RESPONSE =
  'I found 24 customers with no contact in the last 7 days. 8 are high-priority based on deal size and engagement. Want me to draft personalized re-engagement emails?'

export function AiAgent() {
  const [phase, setPhase] = useState<'idle' | 'thinking' | 'streaming' | 'done'>(
    'idle',
  )
  const [typed, setTyped] = useState('')
  const ref = useRef<HTMLDivElement | null>(null)
  const started = useRef(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && !started.current) {
            started.current = true
            if (reduce) {
              setTyped(RESPONSE)
              setPhase('done')
              io.disconnect()
              return
            }
            setPhase('thinking')
            window.setTimeout(() => setPhase('streaming'), 1400)
            io.disconnect()
          }
        }
      },
      { threshold: 0.5 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  useEffect(() => {
    if (phase !== 'streaming') return
    let i = 0
    const timer = window.setInterval(() => {
      i += 2
      setTyped(RESPONSE.slice(0, i))
      if (i >= RESPONSE.length) {
        window.clearInterval(timer)
        setPhase('done')
      }
    }, 22)
    return () => window.clearInterval(timer)
  }, [phase])

  return (
    <section id="ai-agent" className="relative overflow-hidden py-24 sm:py-32">
      <div className="pointer-events-none absolute left-1/2 top-1/3 size-[36rem] -translate-x-1/2 rounded-full bg-purple/10 blur-[140px]" />
      <div className="relative mx-auto max-w-6xl px-4">
        <SectionHeading
          eyebrow="Meet your agent"
          title={
            <>
              An AI teammate that
              <br className="hidden sm:block" /> works while you sleep
            </>
          }
          description="Ask in plain language. Pulsive reasons over your CRM, takes action, and reports back — like a tireless sales operations analyst."
        />

        <div ref={ref} className="mt-14 grid items-center gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          {/* orb */}
          <Reveal className="flex flex-col items-center">
            <div className="relative grid size-56 place-items-center sm:size-64">
              <div className="animate-spin-slow absolute inset-0 rounded-full border border-dashed border-border" />
              <div className="absolute inset-6 rounded-full border border-border/60" />
              <div
                className={cn(
                  'absolute inset-10 rounded-full bg-gradient-to-br from-blue via-cyan to-purple blur-2xl transition-opacity duration-700',
                  phase === 'thinking' || phase === 'streaming'
                    ? 'opacity-90 animate-pulse-glow'
                    : 'opacity-60',
                )}
              />
              <div className="relative grid size-28 place-items-center rounded-full bg-gradient-to-br from-blue via-cyan to-purple shadow-[0_0_60px_-10px_oklch(0.65_0.19_255/0.8)] sm:size-32">
                <Sparkles className="size-10 text-primary-foreground" />
              </div>
              {/* waveform */}
              <div className="absolute bottom-2 flex h-8 items-end gap-1">
                {Array.from({ length: 9 }).map((_, i) => (
                  <span
                    key={i}
                    className="w-1 rounded-full bg-cyan"
                    style={{
                      height:
                        phase === 'thinking' || phase === 'streaming'
                          ? '100%'
                          : '20%',
                      animation:
                        phase === 'thinking' || phase === 'streaming'
                          ? `wave 900ms ease-in-out ${i * 90}ms infinite alternate`
                          : 'none',
                      opacity: 0.85,
                    }}
                  />
                ))}
              </div>
            </div>

            <div className="mt-6 flex flex-wrap justify-center gap-2">
              {CAPABILITIES.map((c) => (
                <span
                  key={c.label}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card/60 px-3 py-1.5 text-xs text-muted-foreground"
                >
                  <c.icon className="size-3.5 text-cyan" />
                  {c.label}
                </span>
              ))}
            </div>
          </Reveal>

          {/* chat */}
          <Reveal delay={120}>
            <div className="rounded-3xl border border-border bg-card/70 p-4 shadow-2xl backdrop-blur sm:p-5">
              <div className="mb-4 flex items-center gap-2 border-b border-border pb-3">
                <span className="grid size-7 place-items-center rounded-lg bg-gradient-to-br from-blue to-purple">
                  <Sparkles className="size-4 text-primary-foreground" />
                </span>
                <p className="text-sm font-medium">Pulsive Agent</p>
                <span className="ml-auto inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <span className="size-1.5 rounded-full bg-chart-4" />
                  online
                </span>
              </div>

              {/* user msg */}
              <div className="mb-3 flex justify-end">
                <p className="max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-3.5 py-2.5 text-sm text-primary-foreground">
                  Show me customers that haven&apos;t been contacted in the last
                  7 days.
                </p>
              </div>

              {/* ai msg */}
              <div className="flex justify-start">
                <div className="max-w-[90%] rounded-2xl rounded-bl-sm border border-border bg-background/60 px-3.5 py-2.5 text-sm">
                  {phase === 'thinking' ? (
                    <span className="flex items-center gap-1 py-1">
                      {[0, 1, 2].map((i) => (
                        <span
                          key={i}
                          className="size-1.5 rounded-full bg-muted-foreground"
                          style={{
                            animation: `wave 800ms ease-in-out ${i * 160}ms infinite alternate`,
                          }}
                        />
                      ))}
                    </span>
                  ) : phase === 'idle' ? (
                    <span className="text-muted-foreground">
                      Scroll to watch the agent work…
                    </span>
                  ) : (
                    <span className="leading-relaxed text-foreground">
                      {typed}
                      {phase === 'streaming' && (
                        <span className="animate-blink ml-0.5 inline-block h-4 w-0.5 translate-y-0.5 bg-cyan" />
                      )}
                    </span>
                  )}
                </div>
              </div>

              {/* results */}
              {phase === 'done' && (
                <div className="mt-3 grid grid-cols-2 gap-2 animate-in fade-in slide-in-from-bottom-2 duration-500">
                  <div className="rounded-xl border border-border bg-background/60 p-3">
                    <p className="text-2xl font-semibold text-cyan">24</p>
                    <p className="text-[11px] text-muted-foreground">
                      Customers gone quiet
                    </p>
                  </div>
                  <div className="rounded-xl border border-border bg-background/60 p-3">
                    <p className="text-2xl font-semibold text-purple">8</p>
                    <p className="text-[11px] text-muted-foreground">
                      Flagged high-priority
                    </p>
                  </div>
                </div>
              )}

              {/* input */}
              <div className="mt-4 flex items-center gap-2 rounded-xl border border-border bg-background/60 px-3 py-2">
                <input
                  disabled
                  placeholder="Ask your CRM anything…"
                  className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                />
                <span className="grid size-7 place-items-center rounded-lg bg-primary text-primary-foreground">
                  <Sparkles className="size-3.5" />
                </span>
              </div>
            </div>
          </Reveal>
        </div>
      </div>

      <style>{`
        @keyframes wave {
          from { transform: scaleY(0.3); }
          to { transform: scaleY(1); }
        }
      `}</style>
    </section>
  )
}
