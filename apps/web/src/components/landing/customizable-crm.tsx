'use client'

import { Reveal } from '@/components/landing/reveal'
import { SectionHeading } from '@/components/landing/section-heading'
import { cn } from '@/lib/utils'
import { GripVertical, Plus, X } from 'lucide-react'
import { useState } from 'react'

type Field = { id: string; label: string; sample: string; hue: string }

const PALETTE: Field[] = [
  { id: 'status', label: 'Lead Status', sample: 'Qualified', hue: 'var(--blue)' },
  { id: 'score', label: 'AI Score', sample: '92 / 100', hue: 'var(--cyan)' },
  { id: 'value', label: 'Deal Value', sample: '$68,000', hue: 'var(--purple)' },
  { id: 'owner', label: 'Owner', sample: 'Marco Diaz', hue: 'var(--blue)' },
  { id: 'source', label: 'Source', sample: 'Inbound', hue: 'var(--cyan)' },
  { id: 'next', label: 'Next Step', sample: 'Send proposal', hue: 'var(--purple)' },
  { id: 'tags', label: 'Tags', sample: 'Enterprise', hue: 'var(--blue)' },
  { id: 'region', label: 'Region', sample: 'EMEA', hue: 'var(--cyan)' },
]

export function CustomizableCrm() {
  const [added, setAdded] = useState<Field[]>([
    PALETTE[0],
    PALETTE[2],
  ])
  const [dragId, setDragId] = useState<string | null>(null)
  const [over, setOver] = useState(false)

  const available = PALETTE.filter((f) => !added.some((a) => a.id === f.id))

  function addField(id: string) {
    const field = PALETTE.find((f) => f.id === id)
    if (field && !added.some((a) => a.id === id)) {
      setAdded((prev) => [...prev, field])
    }
  }

  function removeField(id: string) {
    setAdded((prev) => prev.filter((f) => f.id !== id))
  }

  return (
    <section className="relative mx-auto max-w-6xl px-4 py-24 sm:py-32">
      <SectionHeading
        eyebrow="Make it yours"
        title="Build the CRM your workflow deserves"
        description="Drag fields onto a record to shape it. Every object, view, and automation in Pulsive is yours to customize — no code required."
      />

      <div className="mt-14 grid gap-4 lg:grid-cols-[1fr_1.1fr]">
        {/* palette */}
        <Reveal>
          <div className="h-full rounded-3xl border border-border bg-card/60 p-5">
            <p className="mb-1 text-sm font-medium">Field library</p>
            <p className="mb-4 text-xs text-muted-foreground">
              Drag a field into the record, or tap to add.
            </p>
            <div className="flex flex-wrap gap-2">
              {available.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  draggable
                  onDragStart={() => setDragId(f.id)}
                  onDragEnd={() => setDragId(null)}
                  onClick={() => addField(f.id)}
                  className={cn(
                    'group inline-flex cursor-grab items-center gap-2 rounded-xl border border-border bg-background/60 px-3 py-2 text-xs font-medium transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 active:cursor-grabbing',
                    dragId === f.id && 'opacity-40',
                  )}
                >
                  <GripVertical className="size-3.5 text-muted-foreground" />
                  <span
                    className="size-2 rounded-full"
                    style={{ background: f.hue }}
                  />
                  {f.label}
                  <Plus className="size-3 text-muted-foreground transition-colors group-hover:text-cyan" />
                </button>
              ))}
              {available.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  All fields added — remove one to bring it back.
                </p>
              )}
            </div>

            <div className="mt-6 space-y-2 rounded-2xl border border-dashed border-border p-4">
              <p className="text-xs font-medium text-muted-foreground">
                Also customizable
              </p>
              <div className="flex flex-wrap gap-1.5">
                {[
                  'Dashboards',
                  'Pipeline stages',
                  'Tables',
                  'Automations',
                  'Views',
                  'Workflows',
                ].map((t) => (
                  <span
                    key={t}
                    className="rounded-lg bg-secondary px-2 py-1 text-[11px] text-muted-foreground"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </Reveal>

        {/* drop target: record card */}
        <Reveal delay={100}>
          <div
            onDragOver={(e) => {
              e.preventDefault()
              setOver(true)
            }}
            onDragLeave={() => setOver(false)}
            onDrop={(e) => {
              e.preventDefault()
              setOver(false)
              if (dragId) addField(dragId)
              setDragId(null)
            }}
            className={cn(
              'h-full rounded-3xl border bg-background/50 p-5 transition-all duration-300',
              over
                ? 'border-primary bg-primary/5 ring-2 ring-primary/30'
                : 'border-border',
            )}
          >
            <div className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-center gap-3">
                <span className="grid size-11 place-items-center rounded-full bg-gradient-to-br from-blue to-purple text-sm font-semibold text-primary-foreground">
                  PR
                </span>
                <div>
                  <p className="text-sm font-semibold">Priya Rao</p>
                  <p className="text-xs text-muted-foreground">
                    Vertex · Customer
                  </p>
                </div>
                <span className="ml-auto rounded-lg bg-cyan/15 px-2 py-1 text-[10px] font-medium text-cyan">
                  Live record
                </span>
              </div>

              <div className="mt-4 space-y-2">
                {added.map((f) => (
                  <div
                    key={f.id}
                    className="flex animate-in items-center justify-between rounded-xl border border-border bg-background/60 px-3 py-2.5 fade-in slide-in-from-top-1 duration-300"
                  >
                    <span className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span
                        className="size-2 rounded-full"
                        style={{ background: f.hue }}
                      />
                      {f.label}
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="text-xs font-medium text-foreground">
                        {f.sample}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeField(f.id)}
                        aria-label={`Remove ${f.label}`}
                        className="grid size-5 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-destructive"
                      >
                        <X className="size-3" />
                      </button>
                    </span>
                  </div>
                ))}

                <div
                  className={cn(
                    'grid place-items-center rounded-xl border border-dashed py-6 text-center text-xs transition-colors',
                    over
                      ? 'border-primary text-cyan'
                      : 'border-border text-muted-foreground',
                  )}
                >
                  {over ? 'Release to add field' : 'Drop a field here'}
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
