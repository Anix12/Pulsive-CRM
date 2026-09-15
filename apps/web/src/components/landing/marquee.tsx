const COMPANIES = [
  'IndiaMART',
  'Tradeindia',
  'Sulekha',
  '99acres',
  'Justdial',
  'Housing.com',
  'Magicbricks'
]

export function Marquee() {
  return (
    <section className="border-y border-border py-8">
      <p className="mb-6 text-center font-mono text-xs uppercase tracking-widest text-muted-foreground">
        Trusted by fast-growing teams worldwide
      </p>
      <div className="relative overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)]">
        <div className="animate-marquee flex w-max items-center gap-14 pr-14">
          {[...COMPANIES, ...COMPANIES].map((name, i) => (
            <span
              key={`${name}-${i}`}
              className="whitespace-nowrap text-lg font-semibold tracking-tight text-muted-foreground/70 transition-colors hover:text-foreground"
            >
              {name}
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}
