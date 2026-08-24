import { ButtonLink } from '@/components/primitives/button'
import { ProgressMeter } from '@/components/primitives/progress-meter'
import type { ContinueTarget } from '@/core/progress/types'
import { formatPosition, formatRemaining } from '@/core/shared/format'

/**
 * "Continue de onde parou" — o card mais importante do produto.
 *
 * É a primeira coisa que o aluno vê e a resposta à primeira pergunta que ele
 * tem. Por isso ele é grande, ocupa a largura inteira e tem o único botão
 * primário da tela: qualquer ambiguidade aqui vira hesitação.
 */
export function ContinueCard({ target }: { target: ContinueTarget }) {
  return (
    <article className="flex flex-col gap-5 rounded-[var(--radius-card)] border border-line bg-[linear-gradient(120deg,rgba(18,23,61,0.9),rgba(10,15,46,1)_58%)] p-6 sm:p-8">
      <div className="flex flex-col gap-2">
        <span data-numeric className="text-caption uppercase tracking-[0.16em] text-ink-3">
          {target.courseTitle} · Módulo {formatPosition(target.modulePosition)} · Aula{' '}
          {formatPosition(target.lessonPosition)}
        </span>
        <h2 className="max-w-[22ch] text-display font-light">{target.lessonTitle}</h2>
      </div>

      <div className="flex flex-col gap-2 sm:max-w-md">
        <ProgressMeter
          value={target.progressPercent}
          showValue
          label={`Progresso em ${target.courseTitle}`}
        />
        <span className="text-caption text-ink-3">
          {formatRemaining(target.durationSeconds, target.positionSeconds)}
        </span>
      </div>

      <ButtonLink
        href={`/curso/${target.courseSlug}/${target.lessonSlug}`}
        size="lg"
        className="self-start"
      >
        Continuar
      </ButtonLink>
    </article>
  )
}
