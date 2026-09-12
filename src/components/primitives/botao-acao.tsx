'use client'

import { useEffect, useRef, useState } from 'react'
import { useFormStatus } from 'react-dom'
import { cn } from '@/lib/utils'

/**
 * BOTÃO DE AÇÃO QUE ADMITE ESTAR TRABALHANDO.
 *
 * Os botões do Admin (reenviar convite, religar acesso, trocar papel) eram
 * `<button type="submit">` puros dentro de um form de Server Action. Entre o
 * clique e a página revalidar passa quase um segundo — e durante esse segundo
 * nada na tela muda. Nenhuma pista de que o clique pegou.
 *
 * O reflexo humano diante de um botão que não responde é clicar de novo. E
 * aqui isso não é só feio: o Gabriel clicou três vezes em "Reenviar convite"
 * em onze segundos, e o Supabase bloqueou as duas últimas por limite de envio
 * (429). O resultado foi o pior possível — MENOS e-mails enviados por causa
 * de mais cliques, e o limite gasto à toa.
 *
 * Ou seja: a falta de retorno visual não era um detalhe estético. Ela estava
 * causando o erro que ela escondia.
 *
 * `useFormStatus` só enxerga o form se estiver DENTRO dele — por isso isto é
 * um componente próprio, e não um estado na página.
 *
 * Irmão do `BotaoSalvar`, que é a mesma ideia para formulários de escrita.
 * Este é para ação avulsa: some com o "feito" sozinho, e desabilita enquanto
 * roda para o segundo clique não existir.
 */
export function BotaoAcao({
  children,
  feito = 'Feito',
  trabalhando,
  className,
}: {
  children: React.ReactNode
  /** O que dizer depois que terminou. Some em 2 segundos. */
  feito?: string
  /** O que dizer enquanto roda. */
  trabalhando?: string
  className?: string
}) {
  const { pending } = useFormStatus()
  const estavaEnviando = useRef(false)
  const [concluiu, setConcluiu] = useState(false)

  useEffect(() => {
    if (pending) {
      estavaEnviando.current = true
      return
    }
    if (!estavaEnviando.current) return
    estavaEnviando.current = false
    setConcluiu(true)
    const t = setTimeout(() => setConcluiu(false), 2000)
    return () => clearTimeout(t)
  }, [pending])

  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className={cn(
        'rounded-[var(--radius-control)] border px-3 py-1.5 text-caption transition-colors duration-150',
        pending && 'cursor-progress border-line text-ink-4',
        !pending && concluiu && 'border-[rgba(94,217,155,0.4)] text-[#5ed99b]',
        !pending && !concluiu && 'border-line text-ink-3 hover:border-line-strong hover:text-ink',
        className,
      )}
    >
      {pending ? (trabalhando ?? 'Aguarde…') : concluiu ? feito : children}
    </button>
  )
}
