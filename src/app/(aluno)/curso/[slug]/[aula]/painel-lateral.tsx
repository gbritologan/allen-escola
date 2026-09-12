'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'
import { formatDuration } from '@/core/shared/format'
import { cn } from '@/lib/utils'
import { salvarAnotacao } from './actions'

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
  anotacao,
  caminho,
}: {
  aulas: AulaNaLista[]
  materiais: MaterialNaLista[]
  aulaAtualId: string
  cursoSlug: string
  moduloTitulo: string
  anotacao: string
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
          <span className="px-4 pb-2 pt-4 text-caption uppercase tracking-[0.14em] text-ink-4">
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
                      'flex items-center gap-3 px-3 py-2.5 transition-colors duration-150',
                      atual
                        ? 'bg-[rgba(76,65,255,0.14)]'
                        : 'hover:bg-[rgba(243,245,252,0.04)]',
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
        <form action={salvarAnotacao} className="flex flex-col gap-3 p-4">
          <input type="hidden" name="lesson_id" value={aulaAtualId} />
          <input type="hidden" name="caminho" value={caminho} />
          <textarea
            name="body"
            defaultValue={anotacao}
            rows={12}
            placeholder="O que você não quer esquecer desta aula."
            className="w-full resize-none rounded-[var(--radius-control)] border border-line bg-navy-deep p-3 text-body text-ink placeholder:text-ink-4 outline-none focus:border-[rgba(76,65,255,0.7)]"
          />
          <div className="flex items-center justify-between gap-3">
            <button
              type="submit"
              className="rounded-[var(--radius-control)] border border-line px-3 py-1.5 text-caption text-ink-2 transition-colors hover:border-line-strong hover:text-ink"
            >
              Salvar
            </button>
            {/* A promessa, dita onde ela importa: na hora de escrever. */}
            <span className="text-caption text-ink-4">Só você lê isto.</span>
          </div>
        </form>
      )}

      {aba === 'materiais' && (
        <div className="flex flex-col p-1">
          {materiais.length === 0 ? (
            <p className="px-3 py-6 text-caption text-ink-4">
              Esta aula não tem material para baixar.
            </p>
          ) : (
            materiais.map((m) => (
              <a
                key={m.id}
                href={m.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between gap-3 rounded-[var(--radius-control)] px-3 py-2.5 transition-colors hover:bg-[rgba(243,245,252,0.04)]"
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
        'flex-1 border-b-2 px-2 py-3 text-caption uppercase tracking-[0.12em] transition-colors duration-150',
        ativa
          ? 'border-b-blue-light text-ink'
          : 'border-b-transparent text-ink-4 hover:text-ink-2',
      )}
    >
      {children}
    </button>
  )
}
