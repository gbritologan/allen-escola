'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'

/**
 * "O QUE VOCÊ VAI APRENDER" — uma promessa por vez.
 *
 * ─── O PROBLEMA ──────────────────────────────────────────────────────────
 *
 * Eram dezesseis frases numa lista, ao lado de oito parágrafos de descrição,
 * nos dois com o mesmo peso visual. O Gabriel chamou de "página documental", e
 * a palavra é exata: dezesseis itens com a mesma aparência não são uma lista,
 * são um bloco cinza. O olho não escolhe por onde entrar, então não entra.
 *
 * ─── A IDEIA ─────────────────────────────────────────────────────────────
 *
 * Só uma promessa fica aberta por vez, grande e legível. As outras viram
 * números numa régua — clicáveis, mas quietas. A pessoa navega pelas
 * habilidades do curso como quem folheia, e cada parada tem uma frase só para
 * ler.
 *
 * Isso muda o que a seção comunica. Dezesseis frases empilhadas dizem "tem
 * muito conteúdo aqui" — informação sobre volume. Uma frase por vez, com
 * quinze números esperando ao lado, diz "tem dezesseis coisas e você está na
 * terceira" — que é volume E posição, e dá vontade de ver a próxima.
 *
 * ─── O QUE ISTO NÃO FAZ ──────────────────────────────────────────────────
 *
 * Não esconde conteúdo atrás de interação obrigatória. Com três promessas ou
 * menos, a régua não aparece e as três ficam visíveis: uma interface que pede
 * cliques para mostrar o que caberia na tela é enfeite, não navegação.
 *
 * As setas do teclado funcionam, e a régua é uma lista de botões de verdade —
 * quem usa leitor de tela percorre os dezesseis sem depender do carrossel.
 */
export function OQueAprende({ pontos }: { pontos: string[] }) {
  const [atual, setAtual] = useState(0)

  if (pontos.length === 0) return null

  // Poucas promessas não precisam de navegação: mostrar todas custa menos
  // atenção do que ensinar um mecanismo para ver três frases.
  if (pontos.length <= 3) {
    return (
      <ul className="flex flex-col gap-4">
        {pontos.map((p) => (
          <li key={p} className="flex gap-3">
            <span aria-hidden className="mt-[0.7em] h-px w-5 shrink-0 bg-blue-light" />
            <span className="text-lead font-light text-ink-2">{p}</span>
          </li>
        ))}
      </ul>
    )
  }

  function mover(delta: number) {
    setAtual((i) => (i + delta + pontos.length) % pontos.length)
  }

  return (
    <div
      className="flex flex-col gap-6"
      onKeyDown={(e) => {
        if (e.key === 'ArrowRight') mover(1)
        if (e.key === 'ArrowLeft') mover(-1)
      }}
    >
      {/* A promessa aberta. Altura mínima para a régua não pular quando a
          frase seguinte tem uma linha a menos — layout que salta a cada
          clique faz a pessoa perder o lugar. */}
      <div className="flex min-h-[7.5rem] items-start gap-4">
        <span
          data-numeric
          aria-hidden
          className="pt-1 text-display font-hair leading-none text-[rgba(76,65,255,0.35)]"
        >
          {String(atual + 1).padStart(2, '0')}
        </span>
        <p
          key={atual}
          className="max-w-[42ch] text-lead font-light text-ink [animation:surgir_320ms_var(--ease-allen)_both]"
        >
          {pontos[atual]}
        </p>
      </div>

      {/* A régua. Cada número é um botão de verdade: quem navega por teclado
          ou leitor de tela chega em todos sem depender do carrossel. */}
      <div className="flex flex-wrap items-center gap-1.5">
        {pontos.map((ponto, i) => (
          <button
            key={ponto}
            type="button"
            onClick={() => setAtual(i)}
            aria-current={i === atual}
            aria-label={`Promessa ${i + 1} de ${pontos.length}: ${ponto}`}
            className={cn(
              'h-9 min-w-9 rounded-[var(--radius-control)] border px-2 text-caption transition-all duration-200',
              i === atual
                ? 'border-[rgba(76,65,255,0.6)] bg-[rgba(76,65,255,0.14)] text-ink'
                : 'border-line text-ink-4 hover:border-line-strong hover:text-ink-2',
            )}
          >
            <span data-numeric>{String(i + 1).padStart(2, '0')}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
