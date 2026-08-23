import Image from 'next/image'
import { cn } from '@/lib/utils'

/**
 * ATHENA — a figura do brandbook, no fundo da zona de entrada.
 *
 * Sabedoria, estratégia e guerra: a guerra que é preparação e execução, não
 * força bruta. Coruja, escudo e lança na mesma composição.
 *
 * Três decisões que fazem ela funcionar como fundo em vez de ilustração:
 *
 * 1. O desenho original é traço escuro sobre papel branco. Foi convertido em
 *    traço claro com transparência real — em fundo escuro, o papel viraria um
 *    bloco branco.
 * 2. Sem `mix-blend-mode`. A tentação era usar `screen` para o traço somar luz
 *    à aurora — mas blend sobre um canvas WebGL tira a composição da GPU e
 *    trava o renderizador (travou o meu). Como o traço já é claro e o fundo é
 *    escuro, opacidade normal chega ao mesmo resultado de graça.
 * 3. Máscara nas bordas: ela emerge e se dissolve. Figura recortada com aresta
 *    dura vira adesivo.
 *
 * Fica atrás do cartão de vidro de propósito — é o que o vidro tem para
 * difundir (D-15).
 */
export function Athena({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn('pointer-events-none absolute select-none', className)}
      style={{ maskImage: FADE, WebkitMaskImage: FADE }}
    >
      <div className="vigil-breathe relative size-full">
        <Image
          src="/brand/athena.webp"
          alt=""
          fill
          priority={false}
          fetchPriority="low"
          sizes="(max-width: 1024px) 90vw, 55vw"
          className="object-contain object-bottom"
        />
      </div>
    </div>
  )
}

/** Some para os quatro lados: nenhuma aresta do arquivo aparece. */
const FADE =
  'radial-gradient(76% 68% at 52% 46%, #000 32%, rgba(0,0,0,0.55) 62%, transparent 88%)'
