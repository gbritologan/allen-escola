import type { ElementType, ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * Superfície opaca. É onde 95% do conteúdo vive.
 *
 * Card de curso não é vidro. Página não é vidro (D-15).
 */
export function Surface({
  as: Tag = 'div',
  interactive = false,
  className,
  children,
}: {
  as?: ElementType
  /** Só quando a superfície inteira é clicável. */
  interactive?: boolean
  className?: string
  children: ReactNode
}) {
  return (
    <Tag
      className={cn(
        'bg-navy border border-line rounded-[var(--radius-card)]',
        interactive &&
          'transition-[border-color,background-color,transform] duration-200 ease-[var(--ease-allen)] ' +
            'hover:border-line-strong hover:bg-navy-soft/60 hover:-translate-y-0.5',
        className,
      )}
    >
      {children}
    </Tag>
  )
}
