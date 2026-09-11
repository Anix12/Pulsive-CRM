import Link from 'next/link'
import { Reveal } from '@/components/landing/reveal'
import { ArrowRight } from 'lucide-react'

export function Cta() {
  return (
    <section className="relative mx-auto max-w-6xl px-4 py-16 sm:py-24">
      <Reveal>
        <div className="relative overflow-hidden rounded-[2rem] border border-border bg-gradient-to-br from-card to-background p-8 text-center sm:p-16">
          <div className="grid-bg pointer-events-none absolute inset-0 opacity-40 [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]" />
          <div className="animate-pulse-glow pointer-events-none absolute left-1/2 top-0 size-[24rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/25 blur-[120px]" />

          <div className="relative">
            <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-5xl">
              Let AI run your{' '}
              <span className="text-gradient">customer engine</span>
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-pretty text-base text-muted-foreground sm:text-lg">
              Join 40,000+ teams using Pulsive to manage relationships, automate
              the busywork, and grow faster.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/register"
                className="group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-xl bg-primary px-7 py-3.5 text-sm font-semibold text-primary-foreground shadow-[0_10px_40px_-12px_oklch(0.65_0.19_255/0.7)] transition-transform duration-300 hover:scale-[1.03]"
              >
                <span className="relative z-10">Get started free</span>
                <ArrowRight className="relative z-10 size-4 transition-transform duration-300 group-hover:translate-x-1" />
                <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
              </Link>
              <a
                href="#pricing"
                className="inline-flex items-center justify-center rounded-xl border border-border bg-secondary/40 px-7 py-3.5 text-sm font-semibold text-foreground transition-colors hover:bg-secondary"
              >
                View pricing
              </a>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              No credit card required · Free forever plan
            </p>
          </div>
        </div>
      </Reveal>
    </section>
  )
}
