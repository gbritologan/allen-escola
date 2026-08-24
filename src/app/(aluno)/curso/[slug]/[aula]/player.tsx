'use client'

import { useEffect, useRef, useState } from 'react'
import { GlassPanel } from '@/components/surfaces/glass-panel'
import { formatDuration } from '@/core/shared/format'
import { salvarPosicao } from './actions'
import { cn } from '@/lib/utils'

/**
 * O PLAYER DA AULA.
 *
 * Controles próprios, não o embed do provedor. O briefing pede um produto que
 * só poderia ser da Allen; um player com a marca de outra empresa no canto
 * derruba isso na tela mais importante do produto.
 *
 * Decisões:
 *
 * · `hls.js` entra por import dinâmico e SÓ onde falta HLS nativo. Safari e
 *   iOS tocam direto, sem baixar nada. É o que mantém a rota da aula dentro
 *   do orçamento de JS.
 * · Os controles são a única superfície de VIDRO do aluno — e aqui o vidro é
 *   legítimo: tem vídeo se movendo por trás (D-15).
 * · A posição é salva a cada 15s e ao sair. É o que faz "continue de onde
 *   parou" retomar no segundo exato, e não no começo.
 */
export function Player({
  src,
  poster,
  lessonId,
  posicaoInicial,
}: {
  src: string
  poster: string | null
  lessonId: string
  posicaoInicial: number
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [tocando, setTocando] = useState(false)
  const [atual, setAtual] = useState(posicaoInicial)
  const [total, setTotal] = useState(0)
  const [pronto, setPronto] = useState(false)
  const [falhou, setFalhou] = useState(false)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    let destruir: (() => void) | undefined

    const nativo = video.canPlayType('application/vnd.apple.mpegurl')
    if (nativo) {
      video.src = src
      setPronto(true)
    } else {
      // Só aqui o hls.js é baixado. Quem está no Safari nunca paga por ele.
      void import('hls.js').then(({ default: Hls }) => {
        if (!Hls.isSupported()) {
          setFalhou(true)
          return
        }
        const hls = new Hls({ maxBufferLength: 30 })
        hls.loadSource(src)
        hls.attachMedia(video)
        hls.on(Hls.Events.ERROR, (_e, dados) => {
          if (dados.fatal) setFalhou(true)
        })
        setPronto(true)
        destruir = () => hls.destroy()
      })
    }

    return () => destruir?.()
  }, [src])

  // Retoma no segundo exato, uma vez, quando o vídeo souber sua duração.
  useEffect(() => {
    const video = videoRef.current
    if (!video || !pronto || posicaoInicial <= 0) return
    const aoCarregar = () => {
      if (video.duration && posicaoInicial < video.duration - 5) {
        video.currentTime = posicaoInicial
      }
    }
    video.addEventListener('loadedmetadata', aoCarregar, { once: true })
    return () => video.removeEventListener('loadedmetadata', aoCarregar)
  }, [pronto, posicaoInicial])

  // Salva a cada 15s e ao sair da página. Sem isso, a Home aponta para o começo.
  useEffect(() => {
    const gravar = () => {
      const video = videoRef.current
      if (!video || !video.currentTime) return
      void salvarPosicao(lessonId, Math.floor(video.currentTime), Math.floor(video.duration || 0))
    }
    const timer = setInterval(gravar, 15000)
    window.addEventListener('pagehide', gravar)
    return () => {
      clearInterval(timer)
      window.removeEventListener('pagehide', gravar)
      gravar()
    }
  }, [lessonId])

  function alternar() {
    const video = videoRef.current
    if (!video) return
    if (video.paused) void video.play()
    else video.pause()
  }

  const progresso = total > 0 ? (atual / total) * 100 : 0

  if (falhou) {
    return (
      <div className="flex aspect-video items-center justify-center rounded-[var(--radius-card)] border border-line bg-navy">
        <p className="max-w-[36ch] px-6 text-center text-label text-ink-3">
          Não consegui carregar este vídeo. Recarregue a página — o link de reprodução expira
          depois de um tempo e é renovado a cada visita.
        </p>
      </div>
    )
  }

  return (
    <div className="group relative overflow-hidden rounded-[var(--radius-card)] bg-black">
      <video
        ref={videoRef}
        poster={poster ?? undefined}
        playsInline
        preload="metadata"
        onClick={alternar}
        onPlay={() => setTocando(true)}
        onPause={() => setTocando(false)}
        onTimeUpdate={(e) => setAtual(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setTotal(e.currentTarget.duration)}
        className="aspect-video w-full cursor-pointer"
      />

      {/* Controles em vidro — aqui há vídeo por trás, então é vidro de verdade. */}
      <GlassPanel
        className={cn(
          'absolute inset-x-3 bottom-3 flex items-center gap-4 px-4 py-3',
          'transition-opacity duration-200',
          tocando ? 'opacity-0 group-hover:opacity-100 focus-within:opacity-100' : 'opacity-100',
        )}
      >
        <button
          type="button"
          onClick={alternar}
          aria-label={tocando ? 'Pausar' : 'Reproduzir'}
          className="text-body text-ink transition-opacity hover:opacity-80"
        >
          {tocando ? '❙❙' : '▶'}
        </button>

        <input
          type="range"
          min={0}
          max={total || 0}
          value={atual}
          step={1}
          aria-label="Posição do vídeo"
          onChange={(e) => {
            const v = videoRef.current
            if (v) v.currentTime = Number(e.target.value)
          }}
          className="h-1 flex-1 cursor-pointer appearance-none rounded-full bg-[rgba(243,245,252,0.16)] accent-[var(--color-blue-light)]"
          style={{
            background: `linear-gradient(90deg, var(--color-blue-light) ${progresso}%, rgba(243,245,252,0.16) ${progresso}%)`,
          }}
        />

        <span data-numeric className="text-caption text-ink-2">
          {formatDuration(Math.floor(atual))} / {formatDuration(Math.floor(total))}
        </span>
      </GlassPanel>
    </div>
  )
}
