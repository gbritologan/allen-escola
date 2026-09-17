'use client'

import Image from 'next/image'
import { useState } from 'react'
import { cn } from '@/lib/utils'

/**
 * A MINIATURA DE UMA AULA, QUE NUNCA QUEBRA NA TELA.
 *
 * A thumbnail do provedor pode não existir: o vídeo ainda está processando, o
 * ticket assinado expirou, o frame automático falhou. Quando isso acontece com
 * um `<img>` cru, o navegador desenha aquele ícone de imagem partida — e o
 * aluno lê "quebrado", não "ainda processando".
 *
 * Aqui o erro de carregamento vira um estado desenhado: o número da aula, no
 * mesmo lugar, com a mesma moldura. Ninguém percebe que faltou imagem, porque
 * o que aparece no lugar parece intencional.
 *
 * É a mesma regra da capa de curso: ausência de imagem é um estado legítimo,
 * e estado legítimo merece desenho — não o desenho de erro do navegador.
 */
export function MiniaturaAula({
  src,
  posicao,
  concluida,
  className,
}: {
  src: string | null
  posicao: string
  concluida?: boolean
  className?: string
}) {
  const [falhou, setFalhou] = useState(false)
  const mostrar = src && !falhou

  return (
    <span
      className={cn(
        'relative block aspect-video w-24 shrink-0 overflow-hidden rounded-[var(--radius-control)] bg-navy-deep',
        className,
      )}
    >
      {mostrar ? (
        <Image
          src={src}
          alt=""
          fill
          sizes="96px"
          onError={() => setFalhou(true)}
          className={cn(
            'object-cover transition-transform duration-300 group-hover:scale-105',
            concluida && 'opacity-45',
          )}
        />
      ) : (
        <span
          data-numeric
          className="flex h-full items-center justify-center text-caption text-ink-4"
        >
          {posicao}
        </span>
      )}
    </span>
  )
}
