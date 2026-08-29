import type { ElementType, ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * A superfície onde 95% do conteúdo vive.
 *
 * REVISÃO DE D-15. A regra era "opaca, nunca vidro, porque não há nada se
 * movendo por trás". A premissa mudou: o `AmbienteAllen` respira atrás de toda
 * a área do aluno, então agora há o que filtrar.
 *
 * Usa o vidro LEVE (12px), não o pesado. Esta superfície aparece em grade —
 * `backdrop-filter` de 26px repetido doze vezes derruba o scroll em máquina
 * modesta, e ninguém percebe a diferença entre 12 e 26 num cartão de 300px.
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
        'glass-card rounded-[var(--radius-card)]',
        interactive &&
          'transition-[border-color,box-shadow,transform] duration-200 ease-[var(--ease-allen)] ' +
            'hover:glass-card-hover hover:-translate-y-0.5',
        className,
      )}
    >
      {children}
    </Tag>
  )
}
