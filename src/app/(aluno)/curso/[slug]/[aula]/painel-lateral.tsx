'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'
import { formatDuration } from '@/core/shared/format'
import { cn } from '@/lib/utils'
import { apagarAnotacao } from './actions'
import { FormAnotacao, type Anotacao } from './form-anotacao'

export interface AulaNaLista {
  id: string
  slug: string
  title: string
  durationSeconds: number
  posterUrl: string | null
  concluida: boolean
  aplicada: boolean
}

export interface MaterialNaLista {
  id: string
  title: string
  url: string
  kind: string
}

type Aba = 'aulas' | 'anotacoes' | 'materiais'

/**
 * A COLUNA DA DIREITA.
 *
 * Vinha do vídeo do Arkom que o Gabriel mandou: três abas no mesmo painel, com
 * a lista de aulas como padrão.
 *
 * POR QUE ABAS E NÃO TRÊS BLOCOS EMPILHADOS: a coluna tem 320px e a lista de
 * aulas de um curso longo já enche a altura inteira. Empilhados, materiais e
 * anotações ficariam abaixo da dobra — presentes e invisíveis, que é o pior
 * dos dois mundos.
 *
 * "Aulas" abre primeiro porque é o que responde "o que vem agora", a pergunta
 * que se faz assistindo. Anotação é gesto deliberado: quem vai escrever,
 * procura.
 */
export function PainelLateral({
  aulas,
  materiais,
  aulaAtualId,
  cursoSlug,
  moduloTitulo,
  anotacoes,
  caminho,
}: {
  aulas: AulaNaLista[]
  materiais: MaterialNaLista[]
  aulaAtualId: string
  cursoSlug: string
  moduloTitulo: string
  anotacoes: Anotacao[]
  caminho: string
}) {
  const [aba, setAba] = useState<Aba>('aulas')

  return (
    <aside className="glass-card flex h-fit flex-col overflow-hidden rounded-[var(--radius-card)] lg:sticky lg:top-6">
      <div className="flex border-b border-line">
        <Botao ativa={aba === 'anotacoes'} onClick={() => setAba('anotacoes')}>
          Anotações
        </Botao>
        <Botao ativa={aba === 'aulas'} onClick={() => setAba('aulas')}>
          Aulas
        </Botao>
        <Botao ativa={aba === 'materiais'} onClick={() => setAba('materiais')}>
          Materiais
        </Botao>
      </div>

      {aba === 'aulas' && (
        <div className="flex flex-col">
          <span className="px-5 pb-3 pt-5 text-caption uppercase tracking-[0.1em] text-ink-4">
            A seguir · {moduloTitulo}
          </span>
          <ul className="flex max-h-[32rem] flex-col overflow-y-auto">
            {aulas.map((a) => {
              const atual = a.id === aulaAtualId
              return (
                <li key={a.id}>
                  <Link
                    href={`/curso/${cursoSlug}/${a.slug}`}
                    aria-current={atual ? 'true' : undefined}
                    className={cn(
                      'flex items-center gap-3 px-5 py-3 transition-colors duration-150',
                      atual
                        ? 'bg-[rgba(76,65,255,0.14)]'
                        : 'hover:bg-[var(--color-realce-2)]',
                    )}
                  >
                    {/* A miniatura vem do próprio provedor de vídeo — não há
                        campo de capa por aula, e não precisa haver. */}
                    <span className="relative aspect-video w-20 shrink-0 overflow-hidden rounded-[var(--radius-control)] bg-navy-deep">
                      {a.posterUrl ? (
                        <Image src={a.posterUrl} alt="" fill sizes="80px" className="object-cover" />
                      ) : null}
                    </span>
                    <span className="flex min-w-0 flex-col gap-0.5">
                      <span
                        className={cn(
                          'line-clamp-2 text-caption',
                          atual ? 'text-blue-light' : 'text-ink-2',
                        )}
                      >
                        {a.title}
                      </span>
                      <span data-numeric className="text-caption text-ink-4">
                        {a.durationSeconds > 0 ? formatDuration(a.durationSeconds) : '—'}
                        {a.aplicada ? ' · aplicada' : a.concluida ? ' · vista' : ''}
                      </span>
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {aba === 'anotacoes' && (
        <div className="flex flex-col gap-5 p-5">
          <FormAnotacao aulaId={aulaAtualId} caminho={caminho} />

          {anotacoes.length > 0 && (
            <ul className="flex flex-col gap-2 border-t border-line pt-4">
              {anotacoes.map((n) => (
                <li
                  key={n.id}
                  className="group flex flex-col gap-1.5 rounded-[var(--radius-control)] border border-line px-4 py-3"
                >
                  <div className="flex items-baseline justify-between gap-2">
                    {/* O minuto é o valor da nota: ele é o caminho de volta.
                        Por isso vem primeiro, e em azul. */}
                    {n.at_seconds !== null ? (
                      <a
                        href={`${caminho}?t=${n.at_seconds}`}
                        data-numeric
                        className="text-caption text-blue-light hover:underline"
                      >
                        {formatDuration(n.at_seconds)}
                      </a>
                    ) : (
                      <span className="text-caption text-ink-4">a aula toda</span>
                    )}
                    <form action={apagarAnotacao}>
                      <input type="hidden" name="note_id" value={n.id} />
                      <input type="hidden" name="caminho" value={caminho} />
                      <button
                        type="submit"
                        aria-label="Apagar anotação"
                        className="text-caption text-ink-4 opacity-0 transition-opacity hover:text-critical focus-visible:opacity-100 group-hover:opacity-100"
                      >
                        apagar
                      </button>
                    </form>
                  </div>
                  <p className="whitespace-pre-line text-label text-ink-2">{n.body}</p>
                </li>
              ))}
            </ul>
          )}

          <span className="text-caption text-ink-4">
            Só você lê isto. Elas ficam reunidas no seu caderno, na Jornada.
          </span>
        </div>
      )}

      {aba === 'materiais' && (
        <div className="flex flex-col p-1">
          {materiais.length === 0 ? (
            <p className="px-5 py-7 text-caption text-ink-4">
              Esta aula não tem material para baixar.
            </p>
          ) : (
            materiais.map((m) => (
              <a
                key={m.id}
                href={m.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between gap-3 rounded-[var(--radius-control)] px-4 py-3 transition-colors hover:bg-[var(--color-realce-2)]"
              >
                <span className="min-w-0 truncate text-caption text-ink-2">{m.title}</span>
                <span className="shrink-0 text-caption text-ink-4">
                  {m.kind === 'template' ? 'modelo' : 'abrir'}
                </span>
              </a>
            ))
          )}
        </div>
      )}
    </aside>
  )
}

function Botao({
  ativa,
  onClick,
  children,
}: {
  ativa: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={ativa}
      className={cn(
        /*
         * O ESPAÇAMENTO DAS ABAS.
         *
         * Eram três rótulos em caixa alta com 0.12em de entreletra, dividindo
         * o painel em `flex-1` e com 8px de respiro lateral. Caixa alta já é
         * larga; entreletra larga a mais; e três nomes de tamanhos diferentes
         * ("Aulas" tem metade de "Anotações") faziam o terceiro encostar na
         * borda e cortar.
         *
         * A entreletra caiu para 0.06em, o respiro vertical subiu, e o
         * horizontal virou 0: `flex-1` já reparte o espaço, e o padding lateral
         * só roubava o que o texto precisava. Refinamento aqui é aritmética,
         * não gosto — o rótulo mais longo tem que caber na terça parte.
         */
        'flex-1 border-b-2 px-0 py-3.5 text-caption uppercase tracking-[0.06em] transition-colors duration-150',
        ativa
          ? 'border-b-blue-light text-ink'
          : 'border-b-transparent text-ink-4 hover:text-ink-2',
      )}
    >
      {children}
    </button>
  )
}
