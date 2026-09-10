'use client'

import { FormEvent, useState } from 'react'
import { ArrowRight, Mail } from 'lucide-react'
import { Reveal } from '@/components/landing/reveal'

export function Enquiry() {
  const [submitted, setSubmitted] = useState(false)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const subject = encodeURIComponent(`Pulsive enquiry from ${form.get('name')}`)
    const body = encodeURIComponent(
      `Name: ${form.get('name')}\nWork email: ${form.get('email')}\nCompany: ${form.get('company')}\n\n${form.get('message')}`,
    )
    window.location.href = `mailto:Info@pulsive.ai?subject=${subject}&body=${body}`
    setSubmitted(true)
  }

  return (
    <section id="enquiry" className="relative mx-auto max-w-6xl scroll-mt-28 px-4 py-16 sm:py-24">
      <Reveal>
        <div className="grid overflow-hidden rounded-[2rem] border border-border bg-card shadow-[0_24px_80px_-40px_rgba(30,64,175,0.35)] lg:grid-cols-[0.9fr_1.1fr]">
          <div className="relative overflow-hidden bg-gradient-to-br from-primary to-cyan p-8 text-primary-foreground sm:p-12">
            <div className="grid-bg pointer-events-none absolute inset-0 opacity-25" />
            <div className="relative">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3 py-1.5 text-xs font-medium">
                <Mail className="size-3.5" />
                Talk to Pulsive
              </span>
              <h2 className="mt-6 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
                See what your customer engine can do.
              </h2>
              <p className="mt-4 max-w-md text-sm leading-relaxed text-primary-foreground/80 sm:text-base">
                Tell us a little about your team and we&apos;ll show you how Pulsive can fit your workflow.
              </p>
              <a href="mailto:Info@pulsive.ai" className="mt-8 inline-flex items-center gap-2 text-sm font-semibold underline-offset-4 hover:underline">
                Info@pulsive.ai <ArrowRight className="size-4" />
              </a>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5 p-8 sm:p-12">
            <div className="grid gap-5 sm:grid-cols-2">
              <label className="space-y-2 text-sm font-medium">
                Name
                <input required name="name" className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20" placeholder="Your name" />
              </label>
              <label className="space-y-2 text-sm font-medium">
                Work email
                <input required type="email" name="email" className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20" placeholder="you@company.com" />
              </label>
            </div>
            <label className="block space-y-2 text-sm font-medium">
              Company
              <input name="company" className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20" placeholder="Your company" />
            </label>
            <label className="block space-y-2 text-sm font-medium">
              How can we help?
              <textarea required name="message" rows={4} className="w-full resize-none rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20" placeholder="Tell us what you want to improve..." />
            </label>
            <button type="submit" className="group inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.01]">
              {submitted ? 'Enquiry ready to send' : 'Request a demo'}
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
            </button>
          </form>
        </div>
      </Reveal>
    </section>
  )
}
