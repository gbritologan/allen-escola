'use client'

import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { criarAulaParaUpload } from './actions'
import { prepararUpload } from './aula/[lessonId]/video-actions'

interface NaFila {
  arquivo: File
  titulo: string
  progresso: number
  estado: 'esperando' | 'criando' | 'enviando' | 'pronto' | 'erro'
  erro?: string
}

/**
 * SOLTAR VÁRIOS VÍDEOS E CADA UM VIRAR UMA AULA.
 *
 * Esta é a parte que faltava para o Studio parecer com o que o Gabriel
 * conhece. O envio individual já era bom — barra de progresso, retomável, sem
 * prender a tela. Mas o TRABALHO REAL de quem sobe um curso não é enviar um
 * vídeo: é enviar doze. Um por um, isso são doze criações de aula, doze
 * cliques de escolher arquivo e doze esperas.
 *
 * Aqui a pessoa arrasta a pasta inteira. Cada arquivo vira uma aula com o
 * título tirado do nome do arquivo, e os envios acontecem EM SÉRIE.
 *
 * POR QUE EM SÉRIE E NÃO EM PARALELO: doze uploads simultâneos dividem a
 * banda de subida entre si, e em rede brasileira isso significa doze barras
 * andando devagar e nenhuma terminando. Uma de cada vez termina a primeira
 * aula em minutos — e aula pronta é aula que já pode ser revisada.
 *
 * A ordem da fila é a ordem dos arquivos, e por isso eles são ordenados por
 * nome antes: quem exporta vídeo numera para ordenar na pasta, e essa
 * numeração é a ordem do curso.
 */
export function SoltarAulas({
  courseId,
  moduleId,
}: {
  courseId: string
  moduleId: string
}) {
  const router = useRouter()
  const input = useRef<HTMLInputElement>(null)
  const [arrastando, setArrastando] = useState(false)
  const [fila, setFila] = useState<NaFila[]>([])
  const [rodando, setRodando] = useState(false)

  async function processar(arquivos: File[]) {
    const videos = arquivos
      .filter((f) => f.type.startsWith('video/'))
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR', { numeric: true }))

    if (videos.length === 0) return

    const inicial: NaFila[] = videos.map((arquivo) => ({
      arquivo,
      titulo: arquivo.name,
      progresso: 0,
      estado: 'esperando',
    }))
    setFila(inicial)
    setRodando(true)

    const { Upload } = await import('tus-js-client')

    for (let i = 0; i < videos.length; i++) {
      const arquivo = videos[i]!
      const marcar = (troca: Partial<NaFila>) =>
        setFila((f) => f.map((item, j) => (j === i ? { ...item, ...troca } : item)))

      try {
        marcar({ estado: 'criando' })
        const aula = await criarAulaParaUpload(courseId, moduleId, arquivo.name)
        if (!aula) throw new Error('Não consegui criar a aula.')
        marcar({ titulo: aula.title })

        const ticket = await prepararUpload(aula.id, aula.title)
        if (!ticket.ok || !ticket.tus) {
          throw new Error(ticket.erro ?? 'Não consegui preparar o envio.')
        }
        const t = ticket.tus
        marcar({ estado: 'enviando' })

        await new Promise<void>((resolve, reject) => {
          const envio = new Upload(arquivo, {
            endpoint: t.endpoint,
            headers: {
              AuthorizationSignature: t.signature,
              AuthorizationExpire: String(t.expires),
              VideoId: t.videoId,
              LibraryId: t.libraryId,
            },
            metadata: { filetype: arquivo.type, title: aula.title },
            retryDelays: [0, 3000, 10000, 30000],
            onProgress: (enviado, total) =>
              marcar({ progresso: Math.round((enviado / total) * 100) }),
            onSuccess: () => resolve(),
            onError: (e) => reject(e),
          })
          envio.start()
        })

        marcar({ estado: 'pronto', progresso: 100 })
      } catch (e) {
        marcar({
          estado: 'erro',
          erro: e instanceof Error ? e.message : 'Falhou no meio do caminho.',
        })
        // Segue para o próximo: um arquivo corrompido não pode derrubar a fila
        // inteira depois de a pessoa ter esperado dez minutos.
      }
    }

    setRodando(false)
    router.refresh()
  }

  return (
    <div className="px-4 py-3">
      <input
        ref={input}
        type="file"
        accept="video/*"
        multiple
        className="sr-only"
        onChange={(e) => void processar(Array.from(e.target.files ?? []))}
      />

      {fila.length === 0 ? (
        <div
          onDragOver={(e) => {
            e.preventDefault()
            setArrastando(true)
          }}
          onDragLeave={() => setArrastando(false)}
          onDrop={(e) => {
            e.preventDefault()
            setArrastando(false)
            void processar(Array.from(e.dataTransfer.files))
          }}
          className={cn(
            'flex flex-col items-center gap-1.5 rounded-[var(--radius-control)] border border-dashed px-4 py-5 text-center transition-colors duration-150',
            arrastando ? 'border-[rgba(76,65,255,0.7)] bg-[rgba(76,65,255,0.08)]' : 'border-line',
          )}
        >
          <span className="text-body text-ink-2">
            {arrastando ? 'Solte aqui' : 'Arraste os vídeos das aulas para cá'}
          </span>
          <button
            type="button"
            onClick={() => input.current?.click()}
            className="text-caption text-blue-light hover:underline"
          >
            ou escolher do computador
          </button>
          <span className="text-caption text-ink-4">
            Cada vídeo vira uma aula, na ordem dos nomes dos arquivos. O título e a duração
            saem prontos — é só conferir depois.
          </span>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {fila.map((item, i) => (
            <div key={i} className="flex flex-col gap-1">
              <div className="flex items-baseline justify-between gap-3">
                <span className="min-w-0 truncate text-caption text-ink-2">{item.titulo}</span>
                <span data-numeric className="shrink-0 text-caption text-ink-4">
                  {item.estado === 'esperando' && 'na fila'}
                  {item.estado === 'criando' && 'criando…'}
                  {item.estado === 'enviando' && `${item.progresso}%`}
                  {item.estado === 'pronto' && 'pronto'}
                  {item.estado === 'erro' && 'falhou'}
                </span>
              </div>
              <div className="h-1 overflow-hidden rounded-full bg-[rgba(243,245,252,0.08)]">
                <div
                  className={cn(
                    'h-full rounded-full transition-[width] duration-200',
                    item.estado === 'erro' ? 'bg-critical' : 'bg-blue-light',
                  )}
                  style={{ width: `${item.estado === 'pronto' ? 100 : item.progresso}%` }}
                />
              </div>
              {item.erro && <span className="text-caption text-critical">{item.erro}</span>}
            </div>
          ))}

          {!rodando && (
            <button
              type="button"
              onClick={() => setFila([])}
              className="self-start pt-1 text-caption text-ink-4 transition-colors hover:text-ink"
            >
              Enviar mais
            </button>
          )}
        </div>
      )}
    </div>
  )
}
