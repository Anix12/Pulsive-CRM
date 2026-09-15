import { cn } from '@/lib/utils'

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn('flex items-center gap-2.5', className)}>
      <span className="relative grid size-8 place-items-center rounded-lg bg-gradient-to-br from-blue via-cyan to-purple shadow-[0_0_18px_rgba(34,211,238,0.22)]">
        <svg
          width="19"
          height="19"
          viewBox="0 0 32 32"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M10 24V8h8.5a6.5 6.5 0 0 1 0 13H10m0-7h8a2.5 2.5 0 0 0 0-5h-8"
            stroke="#0b0b12"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <span className="text-lg font-semibold tracking-tight">Pulsive</span>
    </span>
  )
}
