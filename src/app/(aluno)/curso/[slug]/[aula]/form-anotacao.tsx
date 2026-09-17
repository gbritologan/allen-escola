'use client'

import { useRef, useState } from 'react'
import { formatDuration } from '@/core/shared/format'
import { salvarAnotacao } from './actions'

export interface Anotacao {
  id: string
  body: string
  at_seconds: number | null
  created_at: string
}

/**
 * ANOTAR SEM SAIR DO VÍDEO.
 *
 * ─── O SEGUNDO VEM DO PLAYER, NÃO DO RELÓGIO ─────────────────────────────
 *
 * Quando a pessoa começa a escrever, lemos o `currentTime` do <video> que está
 * na tela e guardamos junto. É esse número que depois transforma "achei minha
 * nota" em "voltei ao momento exato".
 *
 * O segundo é capturado no PRIMEIRO caractere digitado, não no envio. A
 * diferença importa: quem escreve três linhas leva meio minuto, e o vídeo
 * continua correndo. Marcar no envio registraria onde o vídeo estava quando a
 * pessoa terminou de escrever — não onde estava o que a fez escrever.
 *
 * ─── POR QUE LER O DOM EM VEZ DE RECEBER POR PROP ────────────────────────
 *
 * O player guarda o tempo em estado interno e não o publica. Para passá-lo
 * daqui, ele teria que elevar esse estado ao pai e re-renderizar a árvore a
 * cada segundo de vídeo — muito custo para um dado que só interessa no
 * instante em que alguém digita.
 *
 * Ler `document.querySelector('video')` é acoplamento, e eu não gosto dele.
 * Mas é acoplamento a um elemento HTML padrão que só existe uma vez nesta
 * tela, e o custo da alternativa recai sobre quem só está assistindo.
 *
 * Sem vídeo na tela, `at_seconds` fica nulo e a nota vale para a aula inteira
 * — que é um estado legítimo, não uma falha.
 */
export function FormAnotacao({ aulaId, caminho }: { aulaId: string; caminho: string }) {
  const [segundos, setSegundos] = useState<number | null>(null)
  const campo = useRef<HTMLTextAreaElement>(null)

  function aoDigitar() {
    if (segundos !== null) return
    const video = document.querySelector('video')
    if (video && Number.isFinite(video.currentTime)) {
      setSegundos(Math.floor(video.currentTime))
    }
  }

  return (
    <form
      action={async (dados) => {
        await salvarAnotacao(dados)
        if (campo.current) campo.current.value = ''
        setSegundos(null)
      }}
      className="flex flex-col gap-2"
    >
      <input type="hidden" name="lesson_id" value={aulaId} />
      <input type="hidden" name="caminho" value={caminho} />
      <input type="hidden" name="at_seconds" value={segundos ?? ''} />

      <textarea
        ref={campo}
        name="body"
        rows={4}
        onChange={aoDigitar}
        placeholder="O que você não quer esquecer deste ponto."
        className="w-full resize-none rounded-[var(--radius-control)] border border-line bg-[var(--color-fundo)] p-3 text-body text-ink placeholder:text-ink-4 outline-none focus:border-[rgba(76,65,255,0.7)]"
      />

      <div className="flex items-center justify-between gap-3">
        <button
          type="submit"
          className="rounded-[var(--radius-control)] border border-line px-3 py-1.5 text-caption text-ink-2 transition-colors hover:border-line-strong hover:text-ink"
        >
          Anotar
        </button>
        {/* O minuto capturado fica VISÍVEL antes de salvar. Sem isso, a marca
            de tempo seria mágica — e mágica que a pessoa não vê acontecer é
            mágica em que ela não confia. */}
        {segundos !== null && (
          <span data-numeric className="text-caption text-blue-light">
            em {formatDuration(segundos)}
          </span>
        )}
      </div>
    </form>
  )
}
