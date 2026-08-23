import { clampPercent } from '@/core/shared/format'
import { cn } from '@/lib/utils'

/**
 * Progresso — motion `settle`: alcança o valor e para. Sem elástico.
 *
 * Acessibilidade: o valor é anunciado por `aria-valuenow`, e a porcentagem
 * aparece em texto ao lado quando `showValue`. Progresso nunca depende só de cor.
 */
export function ProgressMeter({
  value,
  showValue = false,
  label,
  className,
}: {
  value: number
  showValue?: boolean
  /** Contexto para leitor de tela. Ex.: "Progresso em Negociação". */
  label: string
  className?: string
}) {
  const percent = clampPercent(value)

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        className="h-1 flex-1 overflow-hidden rounded-full bg-[rgba(243,245,252,0.08)]"
      >
        <div
          className="settle-transition h-full rounded-full bg-blue-light"
          style={{ width: `${percent}%` }}
        />
      </div>
      {showValue && (
        <span data-numeric className="text-caption font-medium text-ink-2">
          {percent}%
        </span>
      )}
    </div>
  )
}
