import Link from 'next/link'
import { Chip } from '@/components/primitives/chip'
import type { CourseSummary } from '@/core/catalog/types'
import { formatDuration } from '@/core/shared/format'
import { cn } from '@/lib/utils'

/**
 * O card de curso. Superfície opaca, nunca vidro (D-15) — não há nada se
 * movendo por trás dele.
 *
 * Sem capa ainda: em vez de um retângulo cinza esperando imagem, o card usa
 * a inicial do curso em corpo grande sobre um degradê do navy. Placeholder
 * que parece decisão, não ausência.
 */
export function CourseCard({
  course,
  className,
}: {
  course: CourseSummary
  className?: string
}) {
  const masterclass = course.format === 'masterclass'

  return (
    <Link
      href={`/curso/${course.slug}`}
      className={cn(
        'group flex flex-col overflow-hidden rounded-[var(--radius-card)] border border-line bg-navy',
        'transition-[border-color,transform] duration-200 ease-[var(--ease-allen)]',
        'hover:-translate-y-0.5 hover:border-line-strong',
        className,
      )}
    >
      <div
        className={cn(
          'relative flex aspect-[16/10] items-end overflow-hidden p-4',
          masterclass
            ? 'bg-[linear-gradient(145deg,rgba(0,13,255,0.28),rgba(10,15,46,1)_62%)]'
            : 'bg-[linear-gradient(145deg,rgba(18,23,61,1),rgba(10,15,46,1)_70%)]',
        )}
      >
        <span
          aria-hidden
          className="pointer-events-none absolute -top-6 right-2 font-hair text-[7rem] leading-none text-[rgba(243,245,252,0.06)]"
        >
          {course.title.charAt(0)}
        </span>
        {masterclass && <Chip tone="accent">Masterclass</Chip>}
      </div>

      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <h3 className="text-lead font-light text-ink transition-colors group-hover:text-off-white">
          {course.title}
        </h3>
        {course.summary && (
          <p className="line-clamp-2 text-label text-ink-3">{course.summary}</p>
        )}
        <span data-numeric className="mt-auto pt-2 text-caption text-ink-4">
          {course.lessonCount} {course.lessonCount === 1 ? 'aula' : 'aulas'}
          {course.durationSeconds > 0 && ` · ${formatDuration(course.durationSeconds)}`}
          {course.instructorName && ` · ${course.instructorName}`}
        </span>
      </div>
    </Link>
  )
}
