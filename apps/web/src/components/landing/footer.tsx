import { Phone } from 'lucide-react'
import { Logo } from '@/components/landing/logo'

const COLUMNS = [
  {
    title: 'Product',
    links: ['CRM', 'AI Agent', 'Automation', 'Analytics', 'Integrations'],
  },
  {
    title: 'Company',
    links: ['About', 'Careers', 'Blog', 'Customers', 'Contact'],
  },
  {
    title: 'Resources',
    links: ['Docs', 'API', 'Community', 'Changelog', 'Status'],
  },
  {
    title: 'Legal',
    links: ['Privacy', 'Terms', 'Security', 'DPA', 'Cookies'],
  },
]

export function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto max-w-6xl px-4 py-14">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_2fr]">
          <div>
            <Logo />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
              The AI-powered, fully customizable CRM. Your CRM, your AI, your
              workflow.
            </p>
            <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-border bg-secondary/40 px-3 py-1.5 text-xs text-muted-foreground">
              <span className="size-1.5 rounded-full bg-chart-4" />
              All systems operational
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            {COLUMNS.map((col) => (
              <div key={col.title}>
                <p className="mb-3 text-sm font-medium">{col.title}</p>
                <ul className="space-y-2.5">
                  {col.links.map((link) => (
                    <li key={link}>
                      <a
                        href="#top"
                        className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                      >
                        {link}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-border pt-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-5">
            <a href="mailto:Info@pulsive.ai" className="transition-colors hover:text-foreground">Info@pulsive.ai</a>
            <a href="tel:+918600669633" className="inline-flex items-center gap-2 transition-colors hover:text-foreground">
              <Phone className="size-3.5" aria-hidden="true" />
              8600669633
            </a>
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            <a href="#terms" className="transition-colors hover:text-foreground">Terms and Conditions</a>
            <a href="#privacy" className="transition-colors hover:text-foreground">Privacy Policy</a>
          </div>
        </div>

        <div className="mt-5 flex flex-col items-center justify-between gap-4 border-t border-border pt-6 sm:flex-row">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Pulsive. All rights reserved.
          </p>
          <p className="font-mono text-xs text-muted-foreground">
            Built for teams that move fast.
          </p>
        </div>
      </div>
    </footer>
  )
}
