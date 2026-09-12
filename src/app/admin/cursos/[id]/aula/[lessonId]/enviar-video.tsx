'use client'

import { useRef, useState } from 'react'
import { Button } from '@/components/primitives/button'
import { cn } from '@/lib/utils'
import { IconeApagar } from '@/components/icons'
import { formatDuration } from '@/core/shared/format'
import { prepararUpload, removerVideo, verificarProcessamento } from './video-actions'

type Etapa =
  | { nome: 'parado' }
  | { nome: 'preparando' }
  | { nome: 'enviando'; progresso: number }
  | { nome: 'processando' }
  | { nome: 'pronto'; duracao: number | null }
  | { nome: 'erro'; mensagem: string }

/**
 * ENVIO DE VÍDEO — direto do navegador para o Bunny.
 *
 * Três decisões que vêm do briefing:
 *
 * 1. O ENVIO NÃO PRENDE A TELA. Você continua escrevendo o Para Saber
 *    enquanto o arquivo sobe. Por isso o progresso é um número visível e não
 *    um modal bloqueante.
 * 2. RETOMÁVEL. Usa TUS: internet caiu no meio de um arquivo de 800MB, volta
 *    de onde parou em vez de recomeçar. Quem produz conteúdo em rede
 *    brasileira sabe por que isso importa.
 * 3. `tus-js-client` entra por import dinâmico — só é baixado por quem
 *    realmente vai enviar um vídeo, e nunca pelo aluno.
 */
/**
 * Área de soltar arquivo.
 *
 * O envio já era bom — barra de progresso, retomável, sem prender a tela. O
 * que faltava para parecer com o que o Gabriel conhece era o GESTO: na
 * Hotmart você arrasta o arquivo para dentro. Botão de "escolher arquivo"
 * funciona e obriga a passar por uma caixa de diálogo do sistema para achar
 * algo que já está visível na mesa.
 */
export function EnviarVideo({
  lessonId,
  courseId,
  tituloAula,
  assetIdAtual,
  duracaoAtual,
}: {
  lessonId: string
  courseId: string
  tituloAula: string
  assetIdAtual: string | null
  duracaoAtual: number
}) {
  const [etapa, setEtapa] = useState<Etapa>(
    assetIdAtual ? { nome: 'pronto', duracao: duracaoAtual || null } : { nome: 'parado' },
  )
  const inputRef = useRef<HTMLInputElement>(null)
  const [arrastando, setArrastando] = useState(false)

  async function aoEscolher(arquivo: File) {
    setEtapa({ nome: 'preparando' })

    const ticket = await prepararUpload(lessonId, tituloAula)
    if (!ticket.ok || !ticket.tus) {
      setEtapa({ nome: 'erro', mensagem: ticket.erro ?? 'Não consegui preparar o envio.' })
      return
    }

    const { Upload } = await import('tus-js-client')
    const t = ticket.tus

    const upload = new Upload(arquivo, {
      endpoint: t.endpoint,
      retryDelays: [0, 3000, 5000, 10000, 20000],
      headers: {
        AuthorizationSignature: t.signature,
        AuthorizationExpire: String(t.expires),
        VideoId: t.videoId,
        LibraryId: t.libraryId,
      },
      metadata: { filetype: arquivo.type, title: tituloAula },
      onProgress: (enviado, total) => {
        setEtapa({ nome: 'enviando', progresso: Math.round((enviado / total) * 100) })
      },
      onError: (erro) => {
        setEtapa({ nome: 'erro', mensagem: erro.message || 'O envio falhou.' })
      },
      onSuccess: () => {
        setEtapa({ nome: 'processando' })
        void acompanharProcessamento()
      },
    })

    upload.start()
  }

  async function acompanharProcessamento() {
    // O Bunny leva de segundos a alguns minutos. Consulta a cada 5s, e desiste
    // depois de 10 minutos para não ficar perguntando para sempre.
    for (let i = 0; i < 120; i++) {
      await new Promise((r) => setTimeout(r, 5000))
      const r = await verificarProcessamento(lessonId, courseId)
      if (r.estado === 'ready') {
        setEtapa({ nome: 'pronto', duracao: r.duracao })
        return
      }
      if (r.estado === 'errored') {
        setEtapa({ nome: 'erro', mensagem: 'O provedor não conseguiu processar este arquivo.' })
        return
      }
    }
    setEtapa({ nome: 'erro', mensagem: 'O processamento demorou demais. Recarregue para conferir.' })
  }

  return (
    <div className="flex flex-col gap-4">
      <input
        ref={inputRef}
        type="file"
        accept="video/*"
        className="sr-only"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) void aoEscolher(f)
        }}
      />

      {etapa.nome === 'parado' && (
        <div
          onDragOver={(e) => {
            e.preventDefault()
            setArrastando(true)
          }}
          onDragLeave={() => setArrastando(false)}
          onDrop={(e) => {
            e.preventDefault()
            setArrastando(false)
            const f = Array.from(e.dataTransfer.files).find((x) => x.type.startsWith('video/'))
            if (f) void aoEscolher(f)
          }}
          className={cn(
            'flex flex-col items-center gap-2 rounded-[var(--radius-card)] border border-dashed px-6 py-8 text-center transition-colors duration-150',
            arrastando
              ? 'border-[rgba(76,65,255,0.7)] bg-[rgba(76,65,255,0.08)]'
              : 'border-line',
          )}
        >
          <span className="text-body text-ink-2">
            {arrastando ? 'Solte o arquivo' : 'Arraste o vídeo para cá'}
          </span>
          <Button type="button" variant="secondary" size="sm" onClick={() => inputRef.current?.click()}>
            ou escolher do computador
          </Button>
          <span className="text-caption text-ink-4">
            Sobe direto para o Bunny, e o envio continua se a internet cair. Você pode escrever
            o resto enquanto ele sobe.
          </span>
        </div>
      )}

      {etapa.nome === 'preparando' && <Estado texto="Preparando o envio…" />}

      {etapa.nome === 'enviando' && (
        <div className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between">
            <span className="text-label text-ink-2">Enviando</span>
            <span data-numeric className="text-label text-ink">
              {etapa.progresso}%
            </span>
          </div>
          <div className="h-1 overflow-hidden rounded-full bg-[rgba(243,245,252,0.08)]">
            <div
              className="settle-transition h-full rounded-full bg-blue-light"
              style={{ width: `${etapa.progresso}%` }}
            />
          </div>
          <span className="text-caption text-ink-4">
            Se a internet cair, o envio continua de onde parou.
          </span>
        </div>
      )}

      {etapa.nome === 'processando' && (
        <Estado texto="Enviado. O provedor está preparando as versões de qualidade…" />
      )}

      {etapa.nome === 'pronto' && (
        <div className="flex flex-wrap items-center gap-4">
          <span className="inline-flex items-center gap-2 rounded-[var(--radius-control)] border border-[rgba(72,214,168,0.34)] bg-[rgba(72,214,168,0.09)] px-3 py-2 text-label text-positive">
            Vídeo pronto
          </span>
          {etapa.duracao ? (
            <span data-numeric className="text-caption text-ink-4">
              {formatDuration(etapa.duracao)}
            </span>
          ) : null}
          <button
            type="button"
            onClick={async () => {
              await removerVideo(lessonId, courseId)
              setEtapa({ nome: 'parado' })
            }}
            className="flex items-center gap-1.5 text-caption text-ink-4 transition-colors hover:text-critical"
          >
            <IconeApagar className="size-3.5" />
            Remover vídeo
          </button>
        </div>
      )}

      {etapa.nome === 'erro' && (
        <div className="flex flex-col items-start gap-2">
          <p role="alert" className="text-label text-critical">
            {etapa.mensagem}
          </p>
          <Button type="button" variant="secondary" size="sm" onClick={() => setEtapa({ nome: 'parado' })}>
            Tentar de novo
          </Button>
        </div>
      )}
    </div>
  )
}

function Estado({ texto }: { texto: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="surface-sheen h-1 w-24 rounded-full bg-[rgba(243,245,252,0.08)]" />
      <span className="text-label text-ink-3">{texto}</span>
    </div>
  )
}
