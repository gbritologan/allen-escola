import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Chip } from '@/components/primitives/chip'
import { Surface } from '@/components/surfaces/surface'
import { formatDuration, formatPosition } from '@/core/shared/format'
import { createClient } from '@/lib/supabase/server'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const supabase = await createClient()
  const { data } = await supabase.from('courses').select('title').eq('slug', slug).maybeSingle()
  return { title: data?.title ?? 'Curso' }
}

/**
 * A PÁGINA DO CURSO.
 *
 * Sumário e currículo. É a última tela antes da aula — e por isso ela precisa
 * responder "vale meu tempo?" em uma olhada: quantas aulas, quanto tempo, quem
 * ensina, sobre o quê.
 *
 * Daqui a pessoa entra na aula. O player ainda não existe (depende do Bunny),
 * mas a aula já funciona sem ele: o Para Saber e o Para Fazer estão no ar, e
 * é isso que faz a Allen ser uma escola de aplicação em vez de uma videoteca.
 */
export default async function CursoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: course } = await supabase
    .from('courses')
    .select(
      'id, slug, title, summary, description, format, duration_seconds, lesson_count, instructor_id',
    )
    .eq('slug', slug)
    .maybeSingle()

  if (!course) notFound()

  const [{ data: instructor }, { data: modules }, { data: lessons }, { data: links }] =
    await Promise.all([
      course.instructor_id
        ? supabase
            .from('instructors')
            .select('name, headline, bio')
            .eq('id', course.instructor_id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      supabase
        .from('modules')
        .select('id, title, summary, position')
        .eq('course_id', course.id)
        .order('position'),
      supabase
        .from('lessons')
        .select('id, slug, title, position, duration_seconds, module_id, para_fazer')
        .eq('course_id', course.id)
        .order('position'),
      supabase.from('course_themes').select('theme_id').eq('course_id', course.id),
    ])

  const themeIds = (links ?? []).map((l) => l.theme_id)
  const { data: themes } = themeIds.length
    ? await supabase.from('themes').select('slug, name').in('id', themeIds)
    : { data: [] as Array<{ slug: string; name: string }> }

  const masterclass = course.format === 'masterclass'

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-12 px-6 pt-10 sm:pt-14">
      <header className="flex flex-col gap-5">
        <Link href="/explorar" className="text-caption text-ink-3 hover:text-ink">
          ← Explorar
        </Link>

        <div className="flex flex-wrap items-center gap-2">
          {masterclass && <Chip tone="accent">Masterclass</Chip>}
          {(themes ?? []).map((t) => (
            <Link
              key={t.slug}
              href={`/tema/${t.slug}`}
              className="rounded-full border border-line px-3 py-1 text-caption text-ink-3 transition-colors hover:border-line-strong hover:text-ink"
            >
              {t.name}
            </Link>
          ))}
        </div>

        <h1 className="max-w-[18ch] text-display font-hair">{course.title}</h1>

        {course.summary && (
          <p className="max-w-[58ch] text-lead font-light text-ink-2">{course.summary}</p>
        )}

        <span data-numeric className="text-label text-ink-4">
          {course.lesson_count} {course.lesson_count === 1 ? 'aula' : 'aulas'}
          {course.duration_seconds > 0 && ` · ${formatDuration(course.duration_seconds)}`}
          {instructor?.name && ` · ${instructor.name}`}
        </span>
      </header>

      {course.description && (
        <section className="max-w-[64ch] text-body whitespace-pre-line text-ink-2">
          {course.description}
        </section>
      )}

      <section className="flex flex-col gap-4">
        <h2 className="text-caption font-medium uppercase tracking-[0.16em] text-ink-3">
          Currículo
        </h2>

        <div className="flex flex-col gap-3">
          {(modules ?? []).map((mod) => {
            const aulas = (lessons ?? []).filter((l) => l.module_id === mod.id)
            return (
              <Surface key={mod.id} className="flex flex-col">
                <div className="flex items-baseline gap-3 border-b border-line px-5 py-4">
                  <span data-numeric className="text-caption text-ink-4">
                    {formatPosition(mod.position)}
                  </span>
                  <div className="flex flex-col">
                    <span className="text-lead font-light text-ink">{mod.title}</span>
                    {mod.summary && <span className="text-label text-ink-4">{mod.summary}</span>}
                  </div>
                </div>

                <ol className="flex flex-col divide-y divide-[var(--color-line)]">
                  {aulas.map((aula) => (
                    <li key={aula.id}>
                      <Link
                        href={`/curso/${course.slug}/${aula.slug}`}
                        className="flex items-center gap-3 px-5 py-3 transition-colors duration-150 hover:bg-[rgba(243,245,252,0.03)]"
                      >
                        <span data-numeric className="w-6 text-caption text-ink-4">
                          {formatPosition(aula.position)}
                        </span>
                        <span className="flex-1 text-body text-ink-2">{aula.title}</span>
                        {aula.para_fazer?.trim() && <Chip tone="accent">Para fazer</Chip>}
                        <span data-numeric className="text-caption text-ink-4">
                          {formatDuration(aula.duration_seconds)}
                        </span>
                      </Link>
                    </li>
                  ))}
                  {aulas.length === 0 && (
                    <li className="px-5 py-3 text-caption text-ink-4">Sem aulas publicadas.</li>
                  )}
                </ol>
              </Surface>
            )
          })}
        </div>

        <p className="text-caption text-ink-4">
          O player entra na próxima fase. O Para Saber e o Para Fazer de cada aula já estão no ar.
        </p>
      </section>

      {instructor && (
        <section className="flex flex-col gap-3 border-t border-line pt-8">
          <h2 className="text-caption font-medium uppercase tracking-[0.16em] text-ink-3">
            Quem ensina
          </h2>
          <div className="flex flex-col gap-1">
            <span className="text-lead font-light text-ink">{instructor.name}</span>
            {instructor.headline && (
              <span className="text-label text-ink-3">{instructor.headline}</span>
            )}
            {instructor.bio && (
              <p className="max-w-[60ch] pt-2 text-body text-ink-2">{instructor.bio}</p>
            )}
          </div>
        </section>
      )}
    </main>
  )
}
