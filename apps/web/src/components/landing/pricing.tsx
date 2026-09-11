'use client'

import Link from 'next/link'
import { Reveal } from '@/components/landing/reveal'
import { SectionHeading } from '@/components/landing/section-heading'
import { cn } from '@/lib/utils'
import { Check } from 'lucide-react'
import { useState } from 'react'

const PLANS = [
  {
    name: 'Starter',
    monthly: 0,
    tagline: 'For individuals getting organized.',
    features: [
      'Up to 3 users',
      'Contacts & deals',
      'Custom pipeline',
      '100 AI actions / mo',
      'Basic analytics',
    ],
    cta: 'Start free',
    featured: false,
  },
  {
    name: 'Growth',
    monthly: 39,
    tagline: 'For teams that want AI doing the work.',
    features: [
      'Unlimited users',
      'Autonomous AI agents',
      'Visual automations',
      '10,000 AI actions / mo',
      'Advanced analytics',
      'Custom objects & fields',
    ],
    cta: 'Start 14-day trial',
    featured: true,
  },
  {
    name: 'Enterprise',
    monthly: 89,
    tagline: 'For organizations operating at scale.',
    features: [
      'Everything in Growth',
      'Unlimited AI actions',
      'SSO & audit logs',
      'Dedicated success manager',
      'Custom AI training',
      'SLA & priority support',
    ],
    cta: 'Contact sales',
    featured: false,
  },
]

export function Pricing() {
  const [annual, setAnnual] = useState(true)

  return (
    <section id="pricing" className="relative mx-auto max-w-6xl px-4 py-24 sm:py-32">
      <SectionHeading
        eyebrow="Pricing"
        title="Simple pricing that scales with you"
        description="Start free. Upgrade when your team is ready to let AI take over the busywork."
      />

      <Reveal className="mt-8 flex items-center justify-center gap-3">
        <span
          className={cn(
            'text-sm',
            !annual ? 'text-foreground' : 'text-muted-foreground',
          )}
        >
          Monthly
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={annual}
          onClick={() => setAnnual((v) => !v)}
          className={cn(
            'relative h-6 w-11 rounded-full border border-border transition-colors',
            annual ? 'bg-primary' : 'bg-secondary',
          )}
        >
          <span
            className={cn(
              'absolute top-0.5 size-4 rounded-full bg-background transition-transform',
              annual ? 'translate-x-5.5' : 'translate-x-0.5',
            )}
            style={{ transform: annual ? 'translateX(22px)' : 'translateX(2px)' }}
          />
        </button>
        <span
          className={cn(
            'text-sm',
            annual ? 'text-foreground' : 'text-muted-foreground',
          )}
        >
          Annual
          <span className="ml-1.5 rounded-full bg-cyan/15 px-2 py-0.5 text-[10px] font-medium text-cyan">
            2 months free
          </span>
        </span>
      </Reveal>

      <div className="mt-12 grid items-stretch gap-4 lg:grid-cols-3">
        {PLANS.map((plan, i) => {
          return (
            <Reveal key={plan.name} delay={i * 90}>
              <div
                className={cn(
                  'relative flex h-full flex-col rounded-3xl border p-6 transition-all duration-300',
                  plan.featured
                    ? 'border-primary/50 bg-gradient-to-b from-primary/10 to-card shadow-[0_30px_80px_-30px_oklch(0.65_0.19_255/0.5)]'
                    : 'border-border bg-card/60 hover:border-primary/30',
                )}
              >
                {plan.featured && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-blue via-cyan to-purple px-3 py-1 text-[11px] font-semibold text-primary-foreground">
                    Most popular
                  </span>
                )}
                <p className="text-sm font-medium text-muted-foreground">
                  {plan.name}
                </p>
                <div className="mt-3 flex items-end gap-1">
                  <span className="text-4xl font-semibold tracking-tight">
                    ${annual ? Math.round(plan.monthly * 0.833) : plan.monthly}
                  </span>
                  <span className="mb-1 text-sm text-muted-foreground">
                    / user / mo
                  </span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {plan.tagline}
                </p>

                <Link
                  href="/register"
                  className={cn(
                    'mt-6 inline-flex items-center justify-center rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-300',
                    plan.featured
                      ? 'bg-primary text-primary-foreground hover:scale-[1.02]'
                      : 'border border-border bg-secondary/40 text-foreground hover:bg-secondary',
                  )}
                >
                  {plan.cta}
                </Link>

                <ul className="mt-6 space-y-3 border-t border-border pt-6">
                  {plan.features.map((f) => (
                    <li
                      key={f}
                      className="flex items-start gap-2.5 text-sm text-muted-foreground"
                    >
                      <span
                        className={cn(
                          'mt-0.5 grid size-4 shrink-0 place-items-center rounded-full',
                          plan.featured ? 'bg-cyan/20' : 'bg-secondary',
                        )}
                      >
                        <Check className="size-3 text-cyan" />
                      </span>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          )
        })}
      </div>
    </section>
  )
}
