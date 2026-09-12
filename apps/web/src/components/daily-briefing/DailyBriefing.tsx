'use client'

import { AnimatePresence, animate, motion, useMotionValue, useTransform } from 'framer-motion'
import { ArrowRight, ChevronLeft, X } from 'lucide-react'
import type { MouseEvent } from 'react'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import styles from './DailyBriefing.module.css'

// TODO: replace with real data from the API (today's/yesterday's leads,
// conversations, top campaign, open priorities) — this is placeholder data
// ported from the v0 sample so the visual shell can ship first.
const briefingData = {
  leads: { total: 128, contacted: 94, qualified: 41, converted: 12, change: '+18%' },
  conversations: { total: 246, replied: 198, awaiting: 31, intent: 17 },
  campaign: { name: 'JSPM B.Tech', leads: 184, response: '34%', conversions: 12 },
  priorities: [
    "8 hot leads haven't been contacted.",
    '17 WhatsApp conversations are waiting for replies.',
    '1 campaign is showing unusually high engagement.',
  ],
}

function AIAgentPresenter({ scene }: { scene: number }) {
  return (
    <motion.div
      className={styles.agentWrap}
      animate={{ x: scene * 3, scale: scene === 5 ? 1.06 : 1, rotate: scene % 2 ? 0.25 : 0 }}
      transition={{ duration: 0.8, ease: 'easeInOut' }}
    >
      <div className={styles.agentGlow} />
      <motion.img
        className={styles.agentImage}
        src="/daily-briefing-agent.png"
        alt="Pulsive AI briefing presenter"
        animate={{ y: [0, -8, 0], rotate: [0, 0.35, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      />
    </motion.div>
  )
}

function CountUp({ value }: { value: number }) {
  const count = useMotionValue(0)
  const rounded = useTransform(count, (latest) => Math.round(latest))
  useEffect(() => {
    count.set(0)
    const controls = animate(count, value, { duration: 1.1, ease: 'easeOut' })
    return () => controls.stop()
  }, [count, value])
  return (
    <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      {rounded}
    </motion.span>
  )
}

function SceneOne() {
  return (
    <div className={cn(styles.sceneCopy, styles.sceneOne)}>
      <motion.p
        className={styles.briefingKicker}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, duration: 0.65 }}
      >
        Yesterday <span>•</span> CRM Activity Summary
      </motion.p>
      <motion.h1
        initial={{ opacity: 0, y: 25 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      >
        Good morning,
        <br />
        <span>Aniket.</span>
      </motion.h1>
      <motion.p
        className={styles.briefingSubtitle}
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.7, ease: 'easeOut' }}
      >
        Here&apos;s what happened in Pulsive yesterday.
      </motion.p>
      <motion.div
        className={styles.briefingMeta}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7, duration: 0.7 }}
      >
        <span className={styles.metaDot} /> Your daily briefing is ready <span className={styles.metaLine} />
      </motion.div>
    </div>
  )
}

function SceneContent({ scene }: { scene: number }) {
  if (scene === 0) return <SceneOne />
  if (scene === 1) {
    return (
      <div className={cn(styles.sceneCopy, styles.sceneDetail)}>
        <p className={styles.sceneLabel}>Lead activity <span>Yesterday</span></p>
        <h1>Yesterday brought in <em><CountUp value={briefingData.leads.total} /> leads.</em></h1>
        <div className={styles.leadFlow}>
          {[['128', 'Leads'], ['94', 'Contacted'], ['41', 'Qualified'], ['12', 'Converted']].map(([value, label], index) => (
            <div className={styles.flowStep} key={label}>
              <strong>{value}</strong>
              <span>{label}</span>
              {index < 3 && <i />}
            </div>
          ))}
        </div>
        <p className={styles.scenePositive}>{briefingData.leads.change} <span>vs previous day</span></p>
      </div>
    )
  }
  if (scene === 2) {
    return (
      <div className={cn(styles.sceneCopy, styles.sceneDetail)}>
        <p className={styles.sceneLabel}>Conversation pulse <span>Yesterday</span></p>
        <h1>Your conversations <em>stayed active.</em></h1>
        <div className={styles.conversationHero}>
          <strong>246</strong>
          <span>Conversations</span>
          <div className={styles.typing}><i /><i /><i /></div>
        </div>
        <div className={styles.metricRow}>
          <span><b>198</b> Replied</span>
          <span><b>31</b> Awaiting response</span>
          <span><b>17</b> High intent</span>
        </div>
        <p className={styles.attentionNote}><span className={styles.pulseDot} /> 17 high-intent conversations need your attention.</p>
      </div>
    )
  }
  if (scene === 3) {
    return (
      <div className={cn(styles.sceneCopy, styles.sceneDetail)}>
        <p className={styles.sceneLabel}>Campaign performance <span>Yesterday</span></p>
        <h1>One campaign <em>stood out yesterday.</em></h1>
        <div className={styles.campaignFeature}>
          <div>
            <span>Top campaign</span>
            <strong>{briefingData.campaign.name}</strong>
            <small>Best performing campaign yesterday.</small>
          </div>
          <div className={styles.campaignBars}>
            <i style={{ height: '62%' }} />
            <i style={{ height: '88%' }} />
            <i style={{ height: '46%' }} />
            <i style={{ height: '100%' }} />
          </div>
        </div>
        <div className={styles.metricRow}>
          <span><b>184</b> Leads</span>
          <span><b>34%</b> Response rate</span>
          <span><b>12</b> Conversions</span>
        </div>
      </div>
    )
  }
  if (scene === 4) {
    return (
      <div className={cn(styles.sceneCopy, styles.sceneDetail)}>
        <p className={styles.sceneLabel}>Today&apos;s priorities <span>Action needed</span></p>
        <h1>I found <em>3 things</em> that need your attention today.</h1>
        <div className={styles.priorityList}>
          {briefingData.priorities.map((priority, index) => (
            <motion.div
              className={cn(styles.priorityItem, index < 2 && styles[`priority${index + 1}` as 'priority1' | 'priority2'])}
              key={priority}
              initial={{ opacity: 0, x: -18 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.22, duration: 0.55 }}
            >
              <span>0{index + 1}</span>
              <strong>{priority}</strong>
            </motion.div>
          ))}
        </div>
      </div>
    )
  }
  return (
    <div className={cn(styles.sceneCopy, styles.sceneDetail)}>
      <p className={styles.sceneLabel}>Daily briefing complete</p>
      <h1>You&apos;re <em>caught up.</em></h1>
      <p className={styles.handoffText}>I&apos;ve prioritized the important activity for today.</p>
    </div>
  )
}

function BriefingNavigation({
  scene,
  total,
  onPrevious,
  onNext,
  onSkip,
  onStart,
}: {
  scene: number
  total: number
  onPrevious: () => void
  onNext: () => void
  onSkip: () => void
  onStart: () => void
}) {
  const stop = (handler: () => void) => (event: MouseEvent) => {
    event.stopPropagation()
    handler()
  }
  const isFinal = scene === total - 1
  return (
    <motion.footer
      className={styles.briefingNav}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.45, duration: 0.7, ease: 'easeOut' }}
      onClick={(e) => e.stopPropagation()}
    >
      <button className={styles.navControl} disabled={scene === 0} onClick={stop(onPrevious)} aria-label="Previous briefing scene">
        <ChevronLeft size={17} /> Previous
      </button>
      <div className={styles.progressWrap}>
        <span>{String(scene + 1).padStart(2, '0')}</span>
        <div className={styles.progressTrack}>
          <motion.i animate={{ width: `${((scene + 1) / total) * 100}%` }} transition={{ duration: 0.6 }} />
        </div>
        <span>{String(total).padStart(2, '0')}</span>
      </div>
      <div className={styles.navRight}>
        <button className={styles.skipControl} onClick={stop(onSkip)}>
          Skip Briefing <X size={15} />
        </button>
        <button className={styles.nextControl} onClick={stop(isFinal ? onStart : onNext)}>
          {isFinal ? 'Start My Day' : 'Next'} <ArrowRight size={17} />
        </button>
      </div>
    </motion.footer>
  )
}

/**
 * Full-viewport overlay shown on top of the real dashboard (already mounted
 * behind it) — backdropFilter blurs the actual dashboard, not a mock. The
 * caller (DailyBriefingGate) decides whether to mount this at all and
 * receives onDismiss once the user skips or finishes.
 */
export function DailyBriefing({ onDismiss }: { onDismiss: () => void }) {
  const [currentScene, setCurrentScene] = useState(0)
  const [direction, setDirection] = useState(1)
  const [isOpen, setIsOpen] = useState(true)
  const totalScenes = 6

  const move = (next: number) => {
    setDirection(next > currentScene ? 1 : -1)
    setCurrentScene(Math.max(0, Math.min(totalScenes - 1, next)))
  }
  const goNext = () => currentScene < totalScenes - 1 && move(currentScene + 1)
  const goPrevious = () => currentScene > 0 && move(currentScene - 1)
  const closeBriefing = () => {
    setIsOpen(false)
    window.setTimeout(onDismiss, 650)
  }

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight') goNext()
      if (event.key === 'ArrowLeft') goPrevious()
      if (event.key === 'Escape') closeBriefing()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  })

  return (
    <main className={cn(styles.briefingShell, !isOpen && styles.briefingClosed)} onClick={isOpen ? goNext : undefined}>
      <motion.div
        className={styles.briefingBackdrop}
        animate={{ opacity: isOpen ? 1 : 0, backdropFilter: isOpen ? 'blur(7px)' : 'blur(0px)' }}
        transition={{ duration: 0.8 }}
      />
      <motion.div className={cn(styles.ambient, styles.ambientOne)} animate={{ opacity: isOpen ? 1 : 0 }} />
      <motion.div className={cn(styles.ambient, styles.ambientTwo)} animate={{ opacity: isOpen ? 1 : 0 }} />
      <section className={styles.briefingContent}>
        <AnimatePresence mode="wait" custom={direction} initial={false}>
          {isOpen && (
            <motion.div
              key={currentScene}
              className={styles.sceneLayer}
              custom={direction}
              initial={{ opacity: 0, x: direction * 34, filter: 'blur(8px)' }}
              animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, x: direction * -34, filter: 'blur(8px)' }}
              transition={{ duration: 0.62, ease: [0.16, 1, 0.3, 1] }}
            >
              <SceneContent scene={currentScene} />
            </motion.div>
          )}
        </AnimatePresence>
        <AIAgentPresenter scene={currentScene} />
      </section>
      {isOpen && (
        <BriefingNavigation
          scene={currentScene}
          total={totalScenes}
          onPrevious={goPrevious}
          onNext={goNext}
          onSkip={closeBriefing}
          onStart={closeBriefing}
        />
      )}
    </main>
  )
}

export default DailyBriefing
