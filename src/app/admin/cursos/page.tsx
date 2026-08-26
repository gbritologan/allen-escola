import type { Metadata } from 'next'
import Link from 'next/link'
import { Chip } from '@/components/primitives/chip'
import { Surface } from '@/components/surfaces/surface'
import { formatDuration } from '@/core/shared/format'
import { CONTENT_STATUS_LABEL, type ContentStatus } from '@/core/shared/types'
import { createClient } from '@/lib/supabase/server'
import { NovoCurso } from './novo-curso'

export const metadata: Metadata = { title: 'Cursos' }

export default async function CursosPage() {
  const supabase = await createClient()

  const [{ data: courses }, { data: instructors }, { data: links }, { data: themes }] =
    await Promise.all([
      supabase
        .from('courses')
        .select('id, title, slug, format, status, lesson_count, duration_seconds, instructor_id, updated_at')
        .order('updated_at', { ascending: false }),
      supabase.from('instructors').select('id, name'),
      supabase.from('course_themes').select('course_id, theme_id'),
      supabase.from('themes').select('id, name'),
    ])

  const instructorName = new Map((instructors ?? []).map((i) => [i.id, i.name]))
  const themeName = new Map((themes ?? []).map((t) => [t.id, t.name]))
  const themesByCourse = new Map<string, string[]>()
  for (const link of links ?? []) {
    const name = themeName.get(link.theme_id)
    if (!name) continue
    themesByCourse.set(link.course_id, [...(themesByCourse.get(link.course_id) ?? []), name])
  }

  const list = courses ?? []

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-10 px-6 py-10 lg:px-10">
      <header className="flex flex-col gap-2">
        <span className="text-caption uppercase tracking-[0.16em] text-ink-3">Content Studio</span>
        <h1 className="text-display font-light">Cursos</h1>
        <p className="max-w-[62ch] text-body text-ink-3">
          Rascunho é o estado natural. Publicar é um ato deliberado — e o Studio avisa o que
          falta antes de deixar.
        </p>
      </header>

      <section className="flex flex-col gap-4">
        <Surface className="flex flex-col divide-y divide-[var(--color-line)]">
          {list.map((course) => {
            const courseThemes = (themesByCourse.get(course.id) ?? []).join(' · ')
            // Curso publicado sem tema não tem onde ser pendurado no Mapa: ele
            // simplesmente não aparece, sem erro e sem aviso. Antes isso era um
            // "· sem tema" cinza no fim de uma linha de metadados — informação
            // verdadeira que ninguém lê, sobre uma consequência que ninguém
            // adivinha.
            const foraDoMapa = course.status === 'published' && !themesByCourse.has(course.id)

            return (
              <Link
                key={course.id}
                href={`/admin/cursos/${course.id}`}
                className="flex items-center gap-4 px-4 py-4 transition-colors duration-150 hover:bg-[rgba(243,245,252,0.03)]"
              >
                <div className="min-w-0 flex-1 flex flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-body font-medium text-ink">{course.title}</span>
                    {course.format === 'masterclass' && <Chip tone="accent">Masterclass</Chip>}
                    <Chip tone={course.status === 'published' ? 'positive' : 'neutral'}>
                      {CONTENT_STATUS_LABEL[course.status as ContentStatus]}
                    </Chip>
                    {foraDoMapa && <Chip tone="caution">fora do Mapa — sem tema</Chip>}
                  </div>
                  <span data-numeric className="truncate text-caption text-ink-4">
                    {course.lesson_count} {course.lesson_count === 1 ? 'aula' : 'aulas'} ·{' '}
                    {formatDuration(course.duration_seconds)}
                    {course.instructor_id ? ` · ${instructorName.get(course.instructor_id) ?? ''}` : ''}
                    {courseThemes ? ` · ${courseThemes}` : ' · sem tema'}
                  </span>
                </div>
                <span aria-hidden className="text-ink-4">
                  →
                </span>
              </Link>
            )
          })}

          {list.length === 0 && (
            <p className="px-4 py-8 text-center text-label text-ink-4">
              Nenhum curso ainda. Crie o primeiro abaixo.
            </p>
          )}
        </Surface>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-title font-light">Novo curso</h2>
        <Surface className="p-5">
          <NovoCurso />
        </Surface>
      </section>
    </div>
  )
}
