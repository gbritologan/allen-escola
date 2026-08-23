import Image from 'next/image'
import { cn } from '@/lib/utils'

/**
 * A marca da Allen — o "a" alado.
 *
 * Duas variantes do mesmo desenho, geradas do mesmo canal alpha:
 *
 *   azul   o azul da marca. Só onde há luz por trás (a aurora da entrada),
 *          senão #000DFF sobre navy fica escuro demais para ler.
 *   clara  off-white. Para superfícies chapadas — o rail do Admin, cabeçalhos.
 *
 * Escolher errado aqui é o jeito mais rápido de a marca sumir na tela.
 */
export function Marca({
  variant = 'clara',
  size = 24,
  glow = false,
  className,
}: {
  variant?: 'azul' | 'clara'
  size?: number
  /** Só na entrada, onde a marca precisa se destacar do fundo animado. */
  glow?: boolean
  className?: string
}) {
  return (
    <Image
      src={variant === 'azul' ? '/brand/marca-allen.png' : '/brand/marca-allen-clara.png'}
      alt="Allen"
      width={Math.round((size * 301) / 269)}
      height={size}
      priority
      className={cn(
        'select-none',
        glow && '[filter:drop-shadow(0_0_16px_rgba(0,13,255,0.55))]',
        className,
      )}
    />
  )
}

/** Marca + palavra, do jeito que aparece no topo das telas. */
export function Assinatura({
  variant = 'clara',
  size = 24,
  glow = false,
  suffix,
}: {
  variant?: 'azul' | 'clara'
  size?: number
  glow?: boolean
  /** "ADMIN", "ESCOLA" — o contexto ao lado da marca. */
  suffix?: string
}) {
  return (
    <span className="flex items-center gap-2.5">
      <Marca variant={variant} size={size} glow={glow} />
      <span className="text-label font-heavy tracking-[0.22em] text-ink">ALLEN</span>
      {suffix && (
        <span className="text-caption font-light tracking-[0.16em] text-ink-4">{suffix}</span>
      )}
    </span>
  )
}
