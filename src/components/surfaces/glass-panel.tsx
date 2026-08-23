import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * VIDRO — com regra escrita (D-15).
 *
 * Só onde há algo por baixo que importa: a aurora da entrada, controles do
 * player sobre o vídeo, modais, menu de comando, dock mobile, overlay de busca.
 * Vidro sobre cor chapada não é vidro — é ruído com custo de GPU.
 *
 * O material em si (`liquid-glass`) vem do Allen Hub: reflexo especular no topo
 * com `mix-blend-mode: screen`, fio de luz na aresta superior, inset claro em
 * cima e escuro embaixo. Definido uma vez em globals.css e usado só por aqui.
 */
export function GlassPanel({
  className,
  children,
}: {
  className?: string
  children: ReactNode
}) {
  return (
    <div className={cn('liquid-glass rounded-[var(--radius-panel)]', className)}>{children}</div>
  )
}
