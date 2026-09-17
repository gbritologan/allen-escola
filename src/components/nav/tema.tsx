'use client'

import { useSyncExternalStore } from 'react'
import { cn } from '@/lib/utils'

type Tema = 'escuro' | 'claro'

/**
 * SOL E LUA — e por que isto é acessibilidade, não enfeite.
 *
 * Texto claro sobre fundo escuro ESPALHA na retina de quem tem astigmatismo. O
 * efeito chama halation: as letras ganham um halo, os contornos borram, e ler
 * por meia hora vira esforço. Numa escola, isso é gente aprendendo menos por
 * causa de uma escolha estética nossa.
 *
 * O escuro continua sendo o padrão — é o mundo visual da marca. O que mudou é
 * que ele deixou de ser obrigatório.
 *
 * ─── DECISÕES QUE NÃO SÃO ÓBVIAS ─────────────────────────────────────────
 *
 * O BOTÃO NÃO TEM RÓTULO, mas tem `aria-label` que DIZ O DESTINO ("Mudar para
 * o tema claro"), não o estado atual. Botão que anuncia onde está deixa quem
 * usa leitor de tela adivinhando o que o clique faz.
 *
 * A ESCOLHA VIVE NO `localStorage` e é aplicada por um script que roda ANTES
 * da primeira pintura (ver `layout.tsx`). Sem ele, quem escolheu claro veria
 * um flash escuro a cada navegação — e flash de tela inteira é pior que o
 * tema errado, principalmente para quem escolheu o claro por causa dos olhos.
 *
 * SEM ESCOLHA, seguimos o sistema. Quem já configurou o computador para claro
 * está dizendo algo, e ignorar isso para impor a marca seria arrogância cara.
 */
/**
 * O TEMA VIVE NO `<html>`, NÃO NO REACT.
 *
 * Quem escreve o atributo primeiro é o script do `<head>`, antes de qualquer
 * componente existir. Então o React não é a fonte da verdade aqui — ele é um
 * leitor.
 *
 * `useSyncExternalStore` é exatamente a ferramenta para isso: ler algo que
 * mora fora do React e que difere entre servidor e cliente. A alternativa —
 * `useEffect` chamando `setState` — renderiza uma vez errado e corrige depois,
 * que é o piscar que o script do `<head>` existe para evitar.
 *
 * O snapshot do servidor é sempre 'escuro': é o padrão da casa, e o HTML sai
 * assim. Se a pessoa escolheu claro, o script já trocou o atributo antes da
 * pintura, e o primeiro snapshot do cliente já lê 'claro'.
 */
const ouvintes = new Set<() => void>()

function assinar(aoMudar: () => void) {
  ouvintes.add(aoMudar)
  return () => ouvintes.delete(aoMudar)
}

function lerCliente(): Tema {
  return document.documentElement.dataset['tema'] === 'claro' ? 'claro' : 'escuro'
}

const lerServidor = (): Tema => 'escuro'

export function BotaoTema({ className }: { className?: string }) {
  const tema = useSyncExternalStore(assinar, lerCliente, lerServidor)

  function trocar() {
    const proximo: Tema = tema === 'claro' ? 'escuro' : 'claro'
    document.documentElement.dataset['tema'] = proximo
    try {
      localStorage.setItem('allen-tema', proximo)
    } catch {
      // Navegador com armazenamento bloqueado: o tema vale para esta visita.
      // Melhor isso do que não deixar trocar.
    }
    ouvintes.forEach((f) => f())
  }

  const claro = tema === 'claro'

  return (
    <button
      type="button"
      onClick={trocar}
      aria-label={claro ? 'Mudar para o tema escuro' : 'Mudar para o tema claro'}
      title={claro ? 'Tema escuro' : 'Tema claro'}
      className={cn(
        'liquid-glass flex size-9 shrink-0 items-center justify-center rounded-full',
        'text-ink-3 transition-colors duration-200 hover:text-ink',
        className,
      )}
    >
      {claro ? <Lua /> : <Sol />}
    </button>
  )
}

/** Mostra o DESTINO, não o estado: no escuro aparece o sol que você vai ligar. */
function Sol() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className="size-4">
      <circle cx="12" cy="12" r="4.2" stroke="currentColor" strokeWidth="1.6" />
      <g stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
        <path d="M12 2.6v2.2M12 19.2v2.2M21.4 12h-2.2M4.8 12H2.6" />
        <path d="M18.6 5.4l-1.6 1.6M7 17l-1.6 1.6M18.6 18.6L17 17M7 7L5.4 5.4" />
      </g>
    </svg>
  )
}

function Lua() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className="size-4">
      <path
        d="M20 13.4A8.2 8.2 0 0 1 10.6 4a8.4 8.4 0 1 0 9.4 9.4Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  )
}
