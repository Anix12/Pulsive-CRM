'use client'

import { cn } from '@/lib/utils'
import {
  useEffect,
  useRef,
  useState,
  type ElementType,
  type ReactNode,
  type ComponentPropsWithoutRef,
} from 'react'

type RevealProps<T extends ElementType = 'div'> = {
  children: ReactNode
  className?: string
  delay?: number
  as?: T
} & Omit<ComponentPropsWithoutRef<T>, 'children' | 'className'>

export function Reveal<T extends ElementType = 'div'>({
  children,
  className,
  delay = 0,
  as,
  ...props
}: RevealProps<T>) {
  const Tag = (as ?? 'div') as any
  const ref = useRef<HTMLElement | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true)
            io.disconnect()
          }
        }
      },
      {
        threshold: 0.15,
        rootMargin: '0px 0px -70px 0px',
      },
    )

    io.observe(el)

    return () => io.disconnect()
  }, [])

  return (
    <Tag
      ref={ref}
      data-visible={visible}
      style={{ transitionDelay: `${delay}ms` }}
      className={cn('reveal', className)}
      {...props}
    >
      {children}
    </Tag>
  )
}
