'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Chip } from '@/components/primitives/chip'
import { formatDuration } from '@/core/shared/format'
import { cn } from '@/lib/utils'
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
  moverPara,
}: {
  aula: AulaDoStudio
  courseId: string
  indice: number
  total: number
  moverPara: (direcao: 'up' | 'down') => React.ReactNode
}) {
  const [aberta, setAberta] = useState(false)

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-3 px-4 py-2.5">
        <div className="flex flex-col gap-0.5">{moverPara('up')}{moverPara('down')}</div>

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
