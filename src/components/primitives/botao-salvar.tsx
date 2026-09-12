'use client'

import { useEffect, useRef, useState } from 'react'
import { useFormStatus } from 'react-dom'
import { Button } from '@/components/primitives/button'
import { cn } from '@/lib/utils'

/**
 * "SALVAR" QUE DIZ QUE SALVOU.
 *
 * O Studio tinha cinco telas com botão de salvar que não davam retorno nenhum:
 * você clicava, a página revalidava, e nada na tela mudava. Quem escreve
 * conteúdo fica sem saber se o texto foi — e o reflexo é clicar de novo, ou
 * copiar tudo antes por medo de perder.
 *
 * São dois sinais, e eles respondem perguntas diferentes:
 *
 *   "Salvando…"  → o clique pegou. Enquanto a ação está em voo.
 *   "Salvo"      → deu certo. Por dois segundos, depois some.
 *
 * O segundo some sozinho de propósito: confirmação que fica na tela para
 * sempre vira ruído, e na visita seguinte a pessoa lê "Salvo" sem ter salvado
 * nada.
 *
 * `useFormStatus` só funciona DENTRO do form — por isso isto é um componente
 * separado, e não um estado na página.
 */
export function BotaoSalvar({
  children = 'Salvar',
  size = 'sm',
}: {
  children?: React.ReactNode
  size?: 'sm' | 'md'
}) {
  const { pending } = useFormStatus()
  const estavaEnviando = useRef(false)
  const [salvou, setSalvou] = useState(false)

  useEffect(() => {
    if (pending) {
      estavaEnviando.current = true
      return
    }
    // A transição enviando → parado é o único momento em que dá para afirmar
    // que algo acabou de ser gravado.
    if (!estavaEnviando.current) return
    estavaEnviando.current = false
    setSalvou(true)
    const t = setTimeout(() => setSalvou(false), 2000)
    return () => clearTimeout(t)
  }, [pending])

  return (
    <div className="flex items-center gap-3">
      <Button type="submit" size={size} disabled={pending}>
        {pending ? 'Salvando…' : children}
      </Button>
      <span
        aria-live="polite"
        className={cn(
          'text-caption transition-opacity duration-200',
          salvou ? 'text-[#5ed99b] opacity-100' : 'opacity-0',
        )}
      >
        Salvo
      </span>
    </div>
  )
}
