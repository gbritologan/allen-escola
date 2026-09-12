'use client'

import { useFormStatus } from 'react-dom'
import { cn } from '@/lib/utils'

/**
 * O SELETOR DE PAPEL — três botões, um deles ligado.
 *
 * Diferente do `BotaoAcao`: aqui o retorno não é "feito e sumiu", é o estado
 * ficar aceso no botão certo. Trocar alguém de Aluno para Admin é a ação mais
 * pesada do Admin, e ela acontecia sem nenhum sinal de que estava em curso —
 * a página só reaparecia com o outro botão marcado, um segundo depois.
 *
 * `aria-pressed` continua dizendo qual está ligado para quem usa leitor de
 * tela; `aria-busy` diz que a troca está em voo.
 */
export function BotaoPapel({
  children,
  selecionado,
}: {
  children: React.ReactNode
  selecionado: boolean
}) {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      aria-pressed={selecionado}
      aria-busy={pending}
      disabled={pending || selecionado}
      className={cn(
        'rounded-[var(--radius-control)] border px-2.5 py-1 text-caption transition-colors duration-150',
        pending && 'cursor-progress border-line text-ink-4',
        !pending && selecionado && 'border-line-strong bg-navy-soft text-ink',
        !pending && !selecionado && 'border-line text-ink-4 hover:text-ink-2',
      )}
    >
      {pending ? 'Trocando…' : children}
    </button>
  )
}
