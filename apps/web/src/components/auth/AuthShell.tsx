'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { ShieldCheck, CheckCircle2 } from 'lucide-react';

const badges = ['AI-powered by default', 'Live in minutes', 'Built for Indian SMEs'];

export function AuthShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const mode: 'login' | 'register' = pathname?.startsWith('/register') ? 'register' : 'login';

  return (
    <div className="app-glow-bg flex min-h-screen flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-5 sm:px-10">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-400 to-blue-600 shadow-[0_0_16px_-4px_rgba(59,130,246,0.6)]">
            <span className="text-[13px] font-bold tracking-tight text-white">P</span>
          </div>
          <span className="text-[15px] font-semibold tracking-tight text-gray-900">
            <span className="text-gradient-brand">Pulsive</span>
          </span>
        </Link>
        <div className="hidden items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-gray-400 sm:flex">
          <ShieldCheck className="h-3.5 w-3.5 text-blue-500" /> Secure access
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-1 items-center justify-center px-6 py-10">
        <div className="grid w-full max-w-5xl items-center gap-14 lg:grid-cols-[1.1fr_1fr]">
          {/* Headline column */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="hidden lg:block"
          >
            <span className="mb-5 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-600">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
              Your CRM, run on autopilot
            </span>
            <h1 className="text-6xl font-semibold leading-[1.05] tracking-tight text-gray-900">
              Make room
              <br />
              for what
              <br />
              <span className="text-gradient-brand">closes deals.</span>
            </h1>
            <p className="mt-6 max-w-md text-[15px] leading-relaxed text-gray-500">
              Leads, calls, WhatsApp and follow-ups — all in one calm workspace,
              with AI agents handling the busywork for you.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2">
              {badges.map((b) => (
                <span key={b} className="flex items-center gap-1.5 text-sm text-gray-600">
                  <CheckCircle2 className="h-4 w-4 text-blue-500" /> {b}
                </span>
              ))}
            </div>
          </motion.div>

          {/* Card column */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
            className="relative mx-auto w-full max-w-[420px]"
          >
            <div className="absolute inset-0 translate-x-3 translate-y-3 rounded-3xl bg-blue-500/10 blur-md" />
            <div className="glass-panel relative rounded-3xl p-3">
              {/* Tab switcher */}
              <div className="relative grid grid-cols-2 gap-1 rounded-2xl bg-gray-100/80 p-1">
                {(['login', 'register'] as const).map((tab) => (
                  <Link
                    key={tab}
                    href={tab === 'login' ? '/login' : '/register'}
                    className="relative z-10 rounded-xl py-2.5 text-center text-sm font-semibold transition-colors"
                  >
                    {mode === tab && (
                      <motion.span
                        layoutId="auth-tab-pill"
                        className="absolute inset-0 rounded-xl bg-white shadow-sm"
                        transition={{ type: 'spring', stiffness: 500, damping: 34 }}
                      />
                    )}
                    <span className={mode === tab ? 'relative text-gray-900' : 'relative text-gray-500'}>
                      {tab === 'login' ? 'Log in' : 'Sign up'}
                    </span>
                  </Link>
                ))}
              </div>

              <div className="p-6 pt-7">{children}</div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-6 py-5 text-xs text-gray-400 sm:px-10">
        <span>© 2026 Pulsive</span>
        <span className="italic">Built for how Indian teams actually sell</span>
      </div>
    </div>
  );
}
