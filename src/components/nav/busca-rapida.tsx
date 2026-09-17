'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { IconeBuscar } from '@/components/icons'

/**
 * A BUSCA, ONDE ELA DEVERIA ESTAR.
 *
 * Ela era um DESTINO na sidebar, com cadeira própria. Busca não é um lugar —
 * é uma ação. Ninguém acorda querendo "ir até a busca": a pessoa quer achar
 * uma coisa, e a busca é o atalho. Como destino, ela cobrava dois gestos (ir
 * na aba, depois digitar) pelo que deveria custar um, e ficava invisível
 * exatamente onde serve mais: dentro de um curso, no meio de uma aula.
 *
 * Agora é um campo, acima dos destinos, presente em toda tela.
 *
 * `⌘K` / `Ctrl+K` foca de qualquer lugar. O atalho é conveniência, nunca o
 * único caminho — o campo está visível, e isso é o que importa (D-21: nada
 * essencial atrás de atalho).
 *
 * A tela `/buscar` continua existindo e fazendo o trabalho pesado. O que mudou
 * foi a PORTA de entrada, não o destino.
 */
export function BuscaRapida() {
  const router = useRouter()
  const campo = useRef<HTMLInputElement>(null)
  const [valor, setValor] = useState('')

  useEffect(() => {
    function aoTeclar(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        campo.current?.focus()
        campo.current?.select()
      }
    }
    window.addEventListener('keydown', aoTeclar)
    return () => window.removeEventListener('keydown', aoTeclar)
  }, [])

  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault()
        const q = valor.trim()
        if (q.length < 2) return
        router.push(`/buscar?q=${encodeURIComponent(q)}`)
      }}
      className="px-2 pb-3"
    >
      <label className="relative flex items-center">
        <span className="sr-only">Buscar na Allen</span>
        <IconeBuscar
          aria-hidden
          className="pointer-events-none absolute left-2.5 size-4 text-ink-4"
        />
        <input
          ref={campo}
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          placeholder="Buscar"
          className="h-9 w-full rounded-[var(--radius-control)] border border-line bg-[var(--color-fundo)] pl-8 pr-10 text-caption text-ink placeholder:text-ink-4 outline-none transition-colors focus:border-[rgba(76,65,255,0.7)]"
        />
        {/* O atalho fica escrito. Atalho que ninguém descobre é atalho que não
            existe — e escrever custa doze pixels. */}
        <kbd
          aria-hidden
          className="pointer-events-none absolute right-2 rounded border border-line px-1.5 py-0.5 text-[0.625rem] text-ink-4"
        >
          ⌘K
        </kbd>
      </label>
    </form>
  )
}
