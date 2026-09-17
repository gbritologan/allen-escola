'use client'

import Link from 'next/link'
import { useState } from 'react'
import { IconeApagar } from '@/components/icons'
import { Button } from '@/components/primitives/button'
import { Chip } from '@/components/primitives/chip'
import { Input } from '@/components/primitives/field'
import { formatDuration } from '@/core/shared/format'
import { cn } from '@/lib/utils'
import { apagarAulaDoCurso, renomearAula } from './actions'
import { EnviarVideo } from './aula/[lessonId]/enviar-video'
import { Materiais, type Material } from './aula/[lessonId]/materiais'

export interface AulaDoStudio {
  id: string
  title: string
  durationSeconds: number
  videoAssetId: string | null
  temParaFazer: boolean
  publicada: boolean
  materiais: Material[]
}

/**
 * A AULA, ABERTA NO LUGAR.
 *
 * O Gabriel disse que subir aula estava confuso e pediu algo parecido com a
 * Hotmart. O diagnóstico: a estrutura módulo → aula já existia, mas CRIAR a
 * aula e SUBIR O VÍDEO eram telas diferentes. Você criava a aula aqui, clicava,
 * ia para outra página, subia, e voltava. Para um curso de doze aulas isso é
 * vinte e quatro navegações.
 *
 * Agora a linha abre no lugar e traz as duas coisas que se faz logo depois de
 * criar uma aula: o vídeo e os arquivos.
 *
 * O CONTEÚDO SÓ MONTA QUANDO ABRE. `EnviarVideo` observa processamento e
 * `Materiais` tem formulário próprio — montar isso para doze aulas fechadas
 * seria doze relógios rodando para ninguém ver.
 *
 * A página inteira da aula continua existindo, e o link para ela fica aqui:
 * é onde moram o Para Saber, o Para Fazer e as habilidades. Esta gaveta é para
 * o trabalho de subir, não para o de escrever.
 */
export function AulaExpansivel({
  aula,
  courseId,
  indice,
  total,
  mover,
}: {
  aula: AulaDoStudio
  courseId: string
  indice: number
  total: number
  /**
   * Os botões de subir e descer, JÁ RENDERIZADOS pelo servidor.
   *
   * Antes isto era `(direcao) => ReactNode` — uma função. E função não
   * atravessa a fronteira servidor→cliente: o React precisa SERIALIZAR o que
   * passa, e ele não tem como serializar código.
   *
   * O resultado era um 500 na página inteira do curso, mas só quando algum
   * módulo tinha aula — sem aula, o componente nunca era montado e a
   * fronteira nunca era cruzada. O Studio funcionou até o primeiro curso de
   * verdade, e quebrou exatamente quando começou a ser usado.
   *
   * Nó pronto atravessa. Função, não.
   */
  mover: React.ReactNode
}) {
  const [aberta, setAberta] = useState(false)

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-3 px-4 py-2.5">
        <div className="flex flex-col gap-0.5">{mover}</div>

        <button
          type="button"
          onClick={() => setAberta((v) => !v)}
          aria-expanded={aberta}
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
        >
          <span
            aria-hidden
            className={cn(
              'shrink-0 text-caption text-ink-4 transition-transform duration-150',
              aberta && 'rotate-90',
            )}
          >
            ›
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-body text-ink-2 hover:text-ink">
              {aula.title}
            </span>
            <span data-numeric className="text-caption text-ink-4">
              Aula {indice + 1} de {total}
              {aula.durationSeconds > 0 && ` · ${formatDuration(aula.durationSeconds)}`}
            </span>
          </span>
        </button>

        <div className="flex shrink-0 items-center gap-1.5">
          {!aula.videoAssetId && <Chip tone="caution">sem vídeo</Chip>}
          {!aula.temParaFazer && <Chip>sem Para Fazer</Chip>}
          {aula.publicada && <Chip tone="positive">no ar</Chip>}
        </div>
      </div>

      {aberta && (
        <div className="flex flex-col gap-6 border-t border-line bg-[rgba(5,7,20,0.35)] px-4 py-5">
          <EnviarVideo
            lessonId={aula.id}
            courseId={courseId}
            tituloAula={aula.title}
            assetIdAtual={aula.videoAssetId}
            duracaoAtual={aula.durationSeconds}
          />

          <Materiais lessonId={aula.id} courseId={courseId} materiais={aula.materiais} />

          {/*
            RENOMEAR E APAGAR, AQUI MESMO.

            Antes, trocar o título de uma aula exigia abrir a página dela,
            editar, salvar e voltar — quatro passos para corrigir um typo que
            se vê na lista. Quem sobe doze vídeos de uma vez corrige doze
            títulos, e o nome vem do nome do arquivo: errar é o caso comum,
            não a exceção.

            O campo salva no Enter ou ao sair, como todo campo de nome deve.
          */}
          <div className="flex flex-wrap items-end gap-3 border-t border-line pt-5">
            <form action={renomearAula} className="flex flex-1 items-end gap-2">
              <input type="hidden" name="id" value={aula.id} />
              <input type="hidden" name="course_id" value={courseId} />
              <label className="flex flex-1 flex-col gap-1.5">
                <span className="text-caption text-ink-4">Título da aula</span>
                <Input name="title" defaultValue={aula.title} className="h-9" required />
              </label>
              <Button type="submit" size="sm" variant="secondary">
                Renomear
              </Button>
            </form>

            <form action={apagarAulaDoCurso}>
              <input type="hidden" name="id" value={aula.id} />
              <input type="hidden" name="course_id" value={courseId} />
              <button
                type="submit"
                className="flex h-9 items-center gap-1.5 rounded-[var(--radius-control)] border border-line px-3 text-caption text-ink-4 transition-colors hover:border-[rgba(255,107,107,0.45)] hover:text-critical"
              >
                <IconeApagar className="size-3.5" />
                Apagar aula
              </button>
            </form>
          </div>

          {/* O texto da aula continua na página dela: Para Saber, Para Fazer e
              habilidades são trabalho de escrita, não de upload. */}
          <Link
            href={`/admin/cursos/${courseId}/aula/${aula.id}`}
            className="self-start text-caption text-blue-light hover:underline"
          >
            Escrever o Para Saber e o Para Fazer →
          </Link>
        </div>
      )}
    </div>
  )
}
