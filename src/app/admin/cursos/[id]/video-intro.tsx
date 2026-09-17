'use client'

import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'
import { Button } from '@/components/primitives/button'
import { cn } from '@/lib/utils'
import { prepararIntro, removerIntro } from './intro-actions'

type Etapa =
  | { nome: 'parado' }
  | { nome: 'preparando' }
  | { nome: 'enviando'; progresso: number }
  | { nome: 'pronto' }
  | { nome: 'erro'; mensagem: string }

/**
 * O TEASER DO CURSO.
 *
 * Um arquivo, um gesto. Escolher já envia — a mesma regra da capa (D-76),
 * porque o segundo clique que ninguém vê é o que faz upload nenhum acontecer.
 *
 * O arquivo vai do navegador direto para o Bunny, via TUS: retomável, e sem
 * passar pelo nosso servidor, que tem teto de poucos megabytes.
 */
export function VideoIntro({
  courseId,
  titulo,
  temIntro,
}: {
  courseId: string
  titulo: string
  temIntro: boolean
}) {
  const router = useRouter()
  const [etapa, setEtapa] = useState<Etapa>(temIntro ? { nome: 'pronto' } : { nome: 'parado' })
  const [arrastando, setArrastando] = useState(false)
  const input = useRef<HTMLInputElement>(null)

  async function enviar(arquivo: File | undefined) {
    if (!arquivo) return
    if (!arquivo.type.startsWith('video/')) {
      setEtapa({ nome: 'erro', mensagem: 'Isso não é um arquivo de vídeo.' })
      return
    }

    setEtapa({ nome: 'preparando' })
    const ticket = await prepararIntro(courseId, titulo)
    if (!ticket.ok || !ticket.tus) {
      setEtapa({ nome: 'erro', mensagem: ticket.erro ?? 'Não consegui preparar o envio.' })
      return
    }

    const { Upload } = await import('tus-js-client')
    const t = ticket.tus
    setEtapa({ nome: 'enviando', progresso: 0 })

    const envio = new Upload(arquivo, {
      endpoint: t.endpoint,
      retryDelays: [0, 3000, 10000, 30000],
      headers: {
        AuthorizationSignature: t.signature,
        AuthorizationExpire: String(t.expires),
        VideoId: t.videoId,
        LibraryId: t.libraryId,
      },
      metadata: { filetype: arquivo.type, title: `Teaser · ${titulo}` },
      onProgress: (enviado, total) =>
        setEtapa({ nome: 'enviando', progresso: Math.round((enviado / total) * 100) }),
      onSuccess: () => {
        setEtapa({ nome: 'pronto' })
        router.refresh()
      },
      onError: (e) => setEtapa({ nome: 'erro', mensagem: e.message }),
    })
    envio.start()
  }

  const ocupado = etapa.nome === 'preparando' || etapa.nome === 'enviando'

  return (
    <div className="flex flex-col gap-3">
      <input
        ref={input}
        type="file"
        accept="video/*"
        className="sr-only"
        onChange={(e) => void enviar(e.target.files?.[0])}
      />

      {etapa.nome === 'pronto' ? (
        <div className="flex flex-wrap items-center gap-3 rounded-[var(--radius-control)] border border-line px-4 py-3">
          <span className="flex-1 text-caption text-ink-2">
            Teaser no ar. Ele abre a página do curso para o aluno.
          </span>
          <Button size="sm" variant="secondary" onClick={() => input.current?.click()}>
            Trocar
          </Button>
          <form action={removerIntro}>
            <input type="hidden" name="id" value={courseId} />
            <Button type="submit" size="sm" variant="ghost">
              Remover
            </Button>
          </form>
        </div>
      ) : (
        <div
          onDragOver={(e) => {
            e.preventDefault()
            setArrastando(true)
          }}
          onDragLeave={() => setArrastando(false)}
          onDrop={(e) => {
            e.preventDefault()
            setArrastando(false)
            void enviar(e.dataTransfer.files[0])
          }}
          className={cn(
            'flex flex-col items-center gap-2 rounded-[var(--radius-control)] border border-dashed px-4 py-7 text-center transition-colors duration-150',
            arrastando ? 'border-[rgba(76,65,255,0.7)] bg-[rgba(76,65,255,0.08)]' : 'border-line',
          )}
        >
          {ocupado ? (
            <>
              <span className="text-body text-ink-2">
                {etapa.nome === 'preparando'
                  ? 'Preparando…'
                  : `Enviando… ${etapa.progresso}%`}
              </span>
              {etapa.nome === 'enviando' && (
                <span className="h-1 w-48 overflow-hidden rounded-full bg-[var(--color-realce-3)]">
                  <span
                    className="block h-full rounded-full bg-blue-light transition-[width] duration-200"
                    style={{ width: `${etapa.progresso}%` }}
                  />
                </span>
              )}
            </>
          ) : (
            <>
              <span className="text-body text-ink-2">
                {arrastando ? 'Solte aqui' : 'Arraste o vídeo de introdução'}
              </span>
              <button
                type="button"
                onClick={() => input.current?.click()}
                className="text-caption text-blue-light hover:underline"
              >
                ou escolher do computador
              </button>
              <span className="text-caption text-ink-4">
                Escolher já envia. Sem teaser, a página abre com a capa e um botão de play.
              </span>
            </>
          )}
        </div>
      )}

      {etapa.nome === 'erro' && (
        <p role="alert" className="text-caption text-critical">
          {etapa.mensagem}
        </p>
      )}
    </div>
  )
}
