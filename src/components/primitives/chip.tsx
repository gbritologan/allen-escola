import type { ReactNode } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

const chipBase =
  'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-caption font-medium whitespace-nowrap'

/** Rótulo estático: formato, status, contagem. */
export function Chip({
  tone = 'neutral',
  className,
  children,
}: {
  tone?: 'neutral' | 'accent' | 'positive' | 'caution'
  className?: string
  children: ReactNode
}) {
  const tones = {
    neutral: 'border-line text-ink-3',
    accent: 'border-[rgba(76,65,255,0.42)] bg-[rgba(76,65,255,0.11)] text-blue-light',
    positive: 'border-[rgba(72,214,168,0.34)] bg-[rgba(72,214,168,0.09)] text-positive',
    caution: 'border-[rgba(232,177,76,0.34)] bg-[rgba(232,177,76,0.09)] text-caution',
  } as const

  return <span className={cn(chipBase, tones[tone], className)}>{children}</span>
}

/** Tema navegável. O eixo principal de descoberta do catálogo. */
export function ThemeChip({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className={cn(
        chipBase,
        'border-line text-ink-2 transition-colors duration-150 ease-[var(--ease-allen)]',
        'hover:border-line-strong hover:text-ink hover:bg-[rgba(243,245,252,0.05)]',
      )}
    >
      {children}
    </Link>
  )
}
