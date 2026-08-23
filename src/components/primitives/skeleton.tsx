import type { CSSProperties } from 'react'
import { cn } from '@/lib/utils'

/**
 * Loading da Allen: nunca tela branca, nunca spinner.
 *
 * O skeleton tem a **forma real** do conteúdo que vem, para o layout não pular
 * quando os dados chegam. A luz azul (`sheen`) atravessa a superfície e
 * comunica "o produto está funcionando" — não "o navegador travou".
 */
export function Skeleton({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <div
      aria-hidden
      style={style}
      className={cn(
        'relative overflow-hidden rounded-[var(--radius-control)] bg-[rgba(243,245,252,0.05)]',
        'after:absolute after:inset-0 after:surface-sheen after:content-[""]',
        className,
      )}
    />
  )
}

/** Linhas com larguras irregulares — bloco uniforme parece tabela, não texto. */
const TEXT_WIDTHS = ['100%', '92%', '78%', '86%', '64%'] as const

export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} className="h-3" style={{ width: TEXT_WIDTHS[i % TEXT_WIDTHS.length] }} />
      ))}
      <span className="sr-only">Carregando</span>
    </div>
  )
}
