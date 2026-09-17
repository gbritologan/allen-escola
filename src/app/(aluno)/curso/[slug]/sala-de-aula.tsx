'use client'

import { useRef, useState } from 'react'
import { Player } from '@/components/domain/player'
import { MiniaturaAula } from '@/components/domain/miniatura-aula'
import { formatDuration, formatPosition } from '@/core/shared/format'
import { cn } from '@/lib/utils'
import { abrirAula, type AulaAberta } from './aula-actions'

export interface AulaNaLista {
  id: string
  slug: string
  title: string
  durationSeconds: number
  moduleId: string
  posterUrl: string | null
  concluida: boolean
  paraFazer: boolean
}

export interface ModuloNaLista {
  id: string
  title: string
  position: number
}

/**
 * A SALA DE AULA — um curso, uma página.
 *
 * ─── O QUE MUDOU E POR QUÊ ───────────────────────────────────────────────
 *
 * Cada aula tinha a própria URL, e clicar numa aula era sair da página. Para
 * quem está estudando, isso é um corte: o player some, a página recarrega, a
 * rolagem volta ao topo, e a sensação é de recomeçar a cada aula.
 *
 * Agora o curso é uma página só. Trocar de aula troca o conteúdo — o player
 * fica, a lista fica, a posição de leitura fica.
 *
 * ─── O ENDEREÇO NÃO SOME, ELE SÓ PARA DE NAVEGAR ─────────────────────────
 *
 * O caderno de anotações depende de poder voltar a um MINUTO de uma AULA. Se
 * a aula deixasse de ser endereçável, cada nota viraria uma frase órfã.
 *
 * Então a aula continua no endereço, como consulta (`?aula=slug`), e escrita
 * com `replaceState`: o navegador aprende onde você está sem carregar nada.
 * Recarregar a página abre a mesma aula; compartilhar o link também.
 *
 * `replaceState` e não `pushState` de propósito: se cada troca empilhasse
 * histórico, o botão Voltar percorreria as doze aulas antes de sair do curso —
 * e quem clica em Voltar quer sair do curso, não desfazer a última escolha.
 */
export function SalaDeAula({
  cursoSlug,
  modulos,
  aulas,
  inicial,
}: {
  cursoSlug: string
  modulos: ModuloNaLista[]
  aulas: AulaNaLista[]
  inicial: AulaAberta | null
}) {
  const [atual, setAtual] = useState<AulaAberta | null>(inicial)
  const [carregando, setCarregando] = useState<string | null>(null)
  const palco = useRef<HTMLDivElement>(null)

  async function trocar(id: string) {
    if (atual?.id === id || carregando) return
    setCarregando(id)

    const nova = await abrirAula(id)
    setCarregando(null)
    if (!nova) return

    setAtual(nova)

    // O endereço acompanha sem navegar: recarregar abre a mesma aula, e o
    // link continua servindo para o caderno.
    window.history.replaceState(null, '', `/curso/${cursoSlug}?aula=${nova.slug}`)

    // Rolar até o palco, e só se ele não estiver visível. Rolar quando já se
    // está olhando o player é movimento sem motivo.
    const caixa = palco.current?.getBoundingClientRect()
    if (caixa && caixa.top < -40) {
      palco.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  const concluidas = new Set(aulas.filter((a) => a.concluida).map((a) => a.id))

  return (
    <div ref={palco} className="grid items-start gap-8 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
      <div className="flex flex-col gap-6">
        {atual?.video ? (
          <div className="glass-card overflow-hidden rounded-[var(--radius-card)]">
            {/* `key` força o player a renascer ao trocar de aula: sem isso ele
                manteria a posição da aula anterior, e o aluno cairia no meio
                de um vídeo que nunca assistiu. */}
            <Player
              key={atual.id}
              src={atual.video.url}
              poster={atual.video.poster}
              lessonId={atual.id}
              posicaoInicial={atual.posicaoInicial}
            />
          </div>
        ) : (
          <div className="flex aspect-video items-center justify-center rounded-[var(--radius-card)] border border-dashed border-line">
            <span className="px-6 text-center text-label text-ink-4">
              {atual
                ? 'Esta aula ainda não tem vídeo. O que está escrito abaixo já vale.'
                : 'Escolha uma aula na lista ao lado.'}
            </span>
          </div>
        )}

        {atual && (
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              {atual.moduloTitulo && (
                <span className="text-caption uppercase tracking-[0.16em] text-ink-4">
                  {atual.moduloTitulo}
                </span>
              )}
              <h2 className="text-title font-light">{atual.title}</h2>
            </div>

            {atual.paraSaber && (
              <section className="flex flex-col gap-2">
                <h3 className="text-caption font-medium uppercase tracking-[0.16em] text-ink-3">
                  Para saber
                </h3>
                <p className="max-w-[66ch] whitespace-pre-line text-body text-ink-2">
                  {atual.paraSaber}
                </p>
              </section>
            )}

            {atual.paraFazer && (
              <section className="flex flex-col gap-2 rounded-[var(--radius-card)] border border-[rgba(76,65,255,0.35)] bg-[rgba(76,65,255,0.06)] p-5">
                <h3 className="text-caption font-medium uppercase tracking-[0.16em] text-blue-light">
                  Para fazer
                </h3>
                <p className="max-w-[66ch] whitespace-pre-line text-body text-ink-2">
                  {atual.paraFazer}
                </p>
              </section>
            )}
          </div>
        )}
      </div>

      {/* A LISTA. Fica montada entre as trocas — é o que faz a página parecer
          uma sala, e não uma sequência de páginas. */}
      <aside className="glass-card flex h-fit flex-col overflow-hidden rounded-[var(--radius-card)] lg:sticky lg:top-6">
        {modulos.map((mod) => {
          const doModulo = aulas.filter((a) => a.moduleId === mod.id)
          if (doModulo.length === 0) return null

          return (
            <div key={mod.id} className="flex flex-col">
              <span className="border-b border-line px-5 py-3.5 text-caption uppercase tracking-[0.1em] text-ink-4">
                {formatPosition(mod.position)} · {mod.title}
              </span>

              <ol className="flex flex-col">
                {doModulo.map((a) => {
                  const ativa = atual?.id === a.id
                  return (
                    <li key={a.id}>
                      <button
                        type="button"
                        onClick={() => void trocar(a.id)}
                        aria-current={ativa}
                        className={cn(
                          'group flex w-full items-center gap-3 border-b border-line px-4 py-3 text-left transition-colors duration-150',
                          ativa
                            ? 'bg-[rgba(76,65,255,0.12)]'
                            : 'hover:bg-[var(--color-realce-2)]',
                          carregando === a.id && 'cursor-progress opacity-60',
                        )}
                      >
                        <MiniaturaAula
                          src={a.posterUrl}
                          posicao={formatPosition(doModulo.indexOf(a) + 1)}
                          concluida={concluidas.has(a.id)}
                          className="w-16"
                        />
                        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                          <span
                            className={cn(
                              'truncate text-label',
                              ativa ? 'text-ink' : 'text-ink-2 group-hover:text-ink',
                            )}
                          >
                            {a.title}
                          </span>
                          <span className="flex items-center gap-1.5 text-caption text-ink-4">
                            <span data-numeric>{formatDuration(a.durationSeconds)}</span>
                            {a.paraFazer && (
                              <>
                                <span aria-hidden>·</span>
                                <span className="text-blue-light">Para fazer</span>
                              </>
                            )}
                          </span>
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ol>
            </div>
          )
        })}
      </aside>
    </div>
  )
}
