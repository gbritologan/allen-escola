'use client'

import { useOptimistic, useTransition } from 'react'
import { Button } from '@/components/primitives/button'
import { alternarAplicacao } from './actions'
import { cn } from '@/lib/utils'

/**
 * MARCAR COMO APLICADA — o gesto que define a Allen.
 *
 * Três decisões:
 *
 * 1. OTIMISTA. O estado vira na hora, sem esperar o servidor. Este é o momento
 *    de maior significado do produto; um botão que trava meio segundo depois
 *    de "eu fiz" transforma conquista em espera.
 * 2. `bloom` UMA VEZ. É a única animação celebratória da plataforma, e dura
 *    560ms. Gamificação infantil é o que o briefing manda evitar; um glow que
 *    expande e some é o oposto disso.
 * 3. DESMARCÁVEL. Quem clicou sem querer precisa poder voltar. Aplicação não é
 *    armadilha.
 */
export function Aplicacao({
  lessonId,
  caminho,
  aplicada,
}: {
  lessonId: string
  caminho: string
  aplicada: boolean
}) {
  const [otimista, setOtimista] = useOptimistic(aplicada)
  const [, startTransition] = useTransition()

  return (
    <form
      action={(formData) => {
        startTransition(() => {
          setOtimista(!otimista)
          void alternarAplicacao(formData)
        })
      }}
      className="flex flex-wrap items-center gap-4"
    >
      <input type="hidden" name="lesson_id" value={lessonId} />
      <input type="hidden" name="caminho" value={caminho} />
      <input type="hidden" name="aplicada" value={String(otimista)} />

      {otimista ? (
        <>
          <span
            key="feito"
            className={cn(
              'inline-flex items-center gap-2 rounded-[var(--radius-control)] px-4 py-3',
              'border border-[rgba(72,214,168,0.4)] bg-[rgba(72,214,168,0.1)] text-body text-positive',
              'animate-[var(--animate-bloom)]',
            )}
          >
            Aplicada
          </span>
          <button
            type="submit"
            className="text-caption text-ink-4 underline-offset-4 transition-colors hover:text-ink-2 hover:underline"
          >
            desmarcar
          </button>
        </>
      ) : (
        <Button type="submit" size="lg">
          Marcar como aplicada
        </Button>
      )}
    </form>
  )
}
