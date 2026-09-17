import Image from 'next/image'
import Link from 'next/link'
import { Chip } from '@/components/primitives/chip'
import { emBreve, type CourseSummary } from '@/core/catalog/types'
import { formatDuration } from '@/core/shared/format'
import { cn } from '@/lib/utils'

/**
 * O card de curso. Superfície opaca, nunca vidro (D-15) — não há nada se
 * movendo por trás dele.
 *
 * A moldura é 4:5, de pôster, e isso não é escolha estética: é a proporção em
 * que a arte da Allen é feita. Enquanto o card era 16:10, toda capa entrava
 * cortada — no primeiro curso com arte de verdade, o corte comeu metade do
 * rosto e o título inteiro. Moldura que não bate com a arte transforma
 * trabalho de design em recorte aleatório.
 *
 * COM CAPA, a imagem manda. SEM CAPA, a inicial do curso em corpo grande
 * sobre um degradê do navy — placeholder que parece decisão, não ausência.
 * Os dois estados são legítimos e vão conviver por muito tempo: capa é
 * trabalho de design, e curso publicado não espera design.
 *
 * EM BREVE é o terceiro estado. O cartão continua inteiro e continua clicável
 * — a página do curso é que explica a data. Cartão morto que não responde ao
 * clique é indistinguível de cartão quebrado.
 */
export function CourseCard({
  course,
  className,
}: {
  course: CourseSummary
  className?: string
}) {
  const masterclass = course.format === 'masterclass'
  const aguardando = emBreve(course)

  return (
    <Link
      href={`/curso/${course.slug}`}
      className={cn(
        'group glass-card flex flex-col overflow-hidden rounded-[var(--radius-card)]',
        'transition-[border-color,box-shadow,transform] duration-200 ease-[var(--ease-allen)]',
        'hover:glass-card-hover hover:-translate-y-0.5',
        className,
      )}
    >
      <div
        className={cn(
          'relative flex aspect-[4/5] items-start overflow-hidden p-4',
          !course.coverUrl &&
            (masterclass
              ? 'bg-[linear-gradient(145deg,rgba(0,13,255,0.28),rgba(10,15,46,1)_62%)]'
              : 'bg-[linear-gradient(145deg,rgba(18,23,61,1),rgba(10,15,46,1)_70%)]'),
        )}
      >
        {course.coverUrl ? (
          <>
            <Image
              src={course.coverUrl}
              alt=""
              fill
              /* Acompanha as colunas: 5 no 2xl, 4 no xl, 3 no lg. Sem isto o
                 Next serve imagem de 22rem para um card de 19rem — peso a
                 mais em cima da rede de quem está assistindo. */
              sizes="(min-width: 1536px) 19rem, (min-width: 1280px) 22rem, (min-width: 1024px) 24rem, (min-width: 640px) 45vw, 90vw"
              className={cn(
                'object-cover transition-transform duration-500 ease-[var(--ease-allen)] group-hover:scale-[1.03]',
                // Em breve fica dessaturado: a capa continua vendendo, e o
                // olho registra "ainda não" antes de ler o selo.
                aguardando && 'opacity-70 saturate-50',
              )}
            />
            {/* O degradê desce do TOPO, e o selo mora lá em cima.
                Arte de pôster carrega o título na parte de baixo — era ali
                que o selo pousava antes, em cima do nome do curso. */}
            <div
              aria-hidden
              className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(5,7,20,0.8),rgba(5,7,20,0)_42%)]"
            />
          </>
        ) : (
          <span
            aria-hidden
            className="pointer-events-none absolute bottom-2 right-3 font-hair text-[9rem] leading-none text-[var(--color-realce-2)]"
          >
            {course.title.charAt(0)}
          </span>
        )}

        <div className="relative flex flex-wrap items-center gap-2">
          {aguardando && <Chip tone="caution">Em breve</Chip>}
          {masterclass && <Chip tone="accent">Capacitação</Chip>}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <h3 className="text-lead font-light text-ink-2 transition-colors group-hover:text-ink">
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
