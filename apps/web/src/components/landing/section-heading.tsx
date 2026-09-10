import { Reveal } from '@/components/landing/reveal'
import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = 'center',
  className,
}: {
  eyebrow?: string
  title: ReactNode
  description?: ReactNode
  align?: 'center' | 'left'
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex max-w-2xl flex-col',
        align === 'center' ? 'mx-auto items-center text-center' : 'items-start',
        className,
      )}
    >
      {eyebrow && (
        <Reveal
          as="span"
          className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-secondary/50 px-3 py-1 font-mono text-xs uppercase tracking-widest text-cyan"
        >
          {eyebrow}
        </Reveal>
      )}
      <Reveal as="h2" delay={60} className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">
        {title}
      </Reveal>
      {description && (
        <Reveal
          as="p"
          delay={120}
          className={cn(
            'mt-4 text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg',
            align === 'center' ? 'max-w-xl' : 'max-w-xl',
          )}
        >
          {description}
        </Reveal>
      )}
    </div>
  )
}
