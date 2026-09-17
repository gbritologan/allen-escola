import type { Metadata } from 'next'
import Link from 'next/link'
import { IconeMover } from '@/components/icons'
import { Chip } from '@/components/primitives/chip'
import { Surface } from '@/components/surfaces/surface'
import { formatDuration } from '@/core/shared/format'
import { CONTENT_STATUS_LABEL, type ContentStatus } from '@/core/shared/types'
import { createClient } from '@/lib/supabase/server'
import { moverCurso } from './actions'
import { NovoCurso } from './novo-curso'

export const metadata: Metadata = { title: 'Cursos' }

export default async function CursosPage() {
  const supabase = await createClient()

  const [{ data: courses }, { data: instructors }, { data: links }, { data: themes }] =
    await Promise.all([
      supabase
        .from('courses')
        .select('id, title, slug, format, status, lesson_count, duration_seconds, instructor_id, updated_at, position')
                /* A MESMA ORDEM QUE O ALUNO VÊ.
           Antes era `updated_at desc` — a ordem de quem edita. Arrumar uma
           lista ordenada por outro critério é arrumar no escuro: você sobe um
           curso e ele não sobe no lugar onde importa. */
        .order('position')
        .order('published_at', { ascending: false, nullsFirst: false }),
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
          {list.map((course, i) => {
            const courseThemes = (themesByCourse.get(course.id) ?? []).join(' · ')
            // Curso publicado sem tema não tem onde ser pendurado no Mapa: ele
            // simplesmente não aparece, sem erro e sem aviso. Antes isso era um
            // "· sem tema" cinza no fim de uma linha de metadados — informação
            // verdadeira que ninguém lê, sobre uma consequência que ninguém
            // adivinha.
            const foraDoMapa = course.status === 'published' && !themesByCourse.has(course.id)

            return (
              <div
                key={course.id}
                className="group flex items-center gap-3 px-4 py-4 transition-colors duration-150 hover:bg-[var(--color-realce-1)]"
              >
                {/* AS SETAS, À ESQUERDA DO NOME.
                    Setas e não arrastar: arrastar é bonito e péssimo de
                    teclado, e uma lista de oito itens não ganha nada com ele.
                    Ficam antes do título porque a ordem é sobre a lista, não
                    sobre o curso — e o olho lê a posição antes do nome. */}
                <div className="flex shrink-0 flex-col gap-0.5">
                  {(['up', 'down'] as const).map((direcao) => (
                    <form key={direcao} action={moverCurso}>
                      <input type="hidden" name="id" value={course.id} />
                      <input type="hidden" name="direction" value={direcao} />
                      <button
                        type="submit"
                        disabled={direcao === 'up' ? i === 0 : i === list.length - 1}
                        aria-label={`Mover ${course.title} para ${direcao === 'up' ? 'cima' : 'baixo'}`}
                        className="flex size-6 items-center justify-center rounded-[var(--radius-control)] border border-line text-caption text-ink-4 transition-colors hover:border-line-strong hover:text-ink disabled:opacity-30 disabled:hover:border-line disabled:hover:text-ink-4"
                      >
                        <IconeMover direcao={direcao === 'up' ? 'cima' : 'baixo'} className="size-3" />
                      </button>
                    </form>
                  ))}
                </div>

                <Link
                  href={`/admin/cursos/${course.id}`}
                  className="flex min-w-0 flex-1 items-center gap-4"
                >
                <div className="min-w-0 flex-1 flex flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-body font-medium text-ink">{course.title}</span>
                    {course.format === 'masterclass' && <Chip tone="accent">Capacitação</Chip>}
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
              </div>
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
