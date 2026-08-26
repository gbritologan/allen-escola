'use client'

import { useState } from 'react'
import { ICONES_TEMA } from '@/components/icons/temas'
import { definirIcone } from './actions'

/**
 * O SÍMBOLO DA CONSTELAÇÃO.
 *
 * Um <select> com nomes ("Ânfora", "Pergaminho") seria adivinhação: ninguém
 * escolhe um desenho lendo o nome dele. Aqui o botão mostra o símbolo atual e
 * a gaveta mostra todos, no tamanho em que aparecem no Mapa.
 *
 * Salva no clique, sem botão de confirmar. É uma escolha de uma coisa só, e
 * reversível em outro clique — pedir "Salvar" seria cerimônia.
 */
export function SeletorDeIcone({ id, atual }: { id: string; atual: string }) {
  const [aberto, setAberto] = useState(false)
  const escolhido = ICONES_TEMA[atual]

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-expanded={aberto}
        title={escolhido ? escolhido.rotulo : 'Escolher símbolo'}
        className="flex size-9 items-center justify-center rounded-[var(--radius-control)] border border-line text-ink-3 transition-colors duration-150 hover:border-line-strong hover:text-ink"
      >
        {escolhido ? (
          <svg viewBox="0 0 24 24" className="size-5 fill-current" aria-hidden>
            {escolhido.d.map((d, i) => (
              <path key={i} d={d} fillRule="evenodd" />
            ))}
          </svg>
        ) : (
          <span className="text-caption text-ink-4">—</span>
        )}
      </button>

      {aberto && (
        <>
          {/* Clicar fora fecha. Sem isso a gaveta fica presa aberta em quem
              desistiu da escolha. */}
          <button
            type="button"
            aria-label="Fechar"
            onClick={() => setAberto(false)}
            className="fixed inset-0 z-40 cursor-default"
          />

          <div className="absolute right-0 top-11 z-50 w-64 rounded-[var(--radius-panel)] border border-line bg-navy-soft p-2 shadow-[var(--shadow-panel)]">
            <div className="grid grid-cols-5 gap-1">
              <form action={definirIcone}>
                <input type="hidden" name="id" value={id} />
                <input type="hidden" name="icon" value="" />
                <button
                  type="submit"
                  title="Sem símbolo"
                  onClick={() => setAberto(false)}
                  className={`flex size-10 w-full items-center justify-center rounded-[var(--radius-control)] text-caption transition-colors duration-150 ${
                    atual ? 'text-ink-4 hover:bg-[rgba(243,245,252,0.06)]' : 'bg-[rgba(76,65,255,0.16)] text-ink'
                  }`}
                >
                  —
                </button>
              </form>

              {Object.entries(ICONES_TEMA).map(([chave, icone]) => (
                <form key={chave} action={definirIcone}>
                  <input type="hidden" name="id" value={id} />
                  <input type="hidden" name="icon" value={chave} />
                  <button
                    type="submit"
                    title={icone.rotulo}
                    onClick={() => setAberto(false)}
                    className={`flex size-10 w-full items-center justify-center rounded-[var(--radius-control)] transition-colors duration-150 ${
                      chave === atual
                        ? 'bg-[rgba(76,65,255,0.16)] text-blue-light'
                        : 'text-ink-3 hover:bg-[rgba(243,245,252,0.06)] hover:text-ink'
                    }`}
                  >
                    <svg viewBox="0 0 24 24" className="size-5 fill-current" aria-hidden>
                      {icone.d.map((d, i) => (
                        <path key={i} d={d} fillRule="evenodd" />
                      ))}
                    </svg>
                  </button>
                </form>
              ))}
            </div>

            <p className="px-2 pb-1 pt-2 text-caption text-ink-4">
              {escolhido ? escolhido.rotulo : 'Aparece no centro da constelação, no Mapa.'}
            </p>
          </div>
        </>
      )}
    </div>
  )
}
