import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Button } from '@/components/primitives/button'
import { Chip } from '@/components/primitives/chip'
import { IconeApagar, IconeMover } from '@/components/icons'
import { Field, Input, Textarea } from '@/components/primitives/field'
import { Surface } from '@/components/surfaces/surface'
import { formatDuration, formatPosition } from '@/core/shared/format'
import { createClient } from '@/lib/supabase/server'
import {
  alternarTema,
  apagarModulo,
  atualizarCurso,
  criarAula,
  criarModulo,
  moverAula,
  publicarCurso,
} from './actions'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()
  const { data } = await supabase.from('courses').select('title').eq('id', id).maybeSingle()
  return { title: data?.title ?? 'Curso' }
}

const iconButton =
  'flex size-6 items-center justify-center rounded border border-line text-caption text-ink-3 ' +
  'transition-colors duration-150 hover:border-line-strong hover:text-ink ' +
  'disabled:pointer-events-none disabled:opacity-25'

export default async function CursoStudioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: course }, { data: instructors }, { data: themes }, { data: modules }] =
    await Promise.all([
      supabase
        .from('courses')
        .select(
          'id, title, slug, summary, description, format, status, instructor_id, lesson_count, duration_seconds',
        )
        .eq('id', id)
        .maybeSingle(),
      supabase.from('instructors').select('id, name').order('name'),
      supabase.from('themes').select('id, name, status').order('position'),
      supabase.from('modules').select('id, title, position, status').eq('course_id', id).order('position'),
    ])

  if (!course) notFound()

  const { data: links } = await supabase
    .from('course_themes')
    .select('theme_id')
    .eq('course_id', id)
  const linkedThemes = new Set((links ?? []).map((l) => l.theme_id))
  const { data: lessons } = await supabase
    .from('lessons')
    .select('id, title, position, status, duration_seconds, video_asset_id, para_fazer, module_id')
    .eq('course_id', id)
    .order('position')

  const moduleList = (modules ?? []).map((m) => ({
    ...m,
    lessons: (lessons ?? []).filter((l) => l.module_id === m.id),
  }))
  const allLessons = moduleList.flatMap((m) => m.lessons)

  // A checagem antes de publicar. O Studio não impede — ele avisa.
  const pendencias = [
    linkedThemes.size === 0 && 'Sem tema: o curso não vai aparecer em Explorar.',
    !course.summary && 'Sem resumo: o card do curso fica vazio.',
    allLessons.length === 0 && 'Sem aulas.',
    allLessons.some((l) => !l.video_asset_id) &&
      `${allLessons.filter((l) => !l.video_asset_id).length} aula(s) sem vídeo — essas não vão ao ar.`,
    allLessons.some((l) => !l.para_fazer?.trim()) &&
      `${allLessons.filter((l) => !l.para_fazer?.trim()).length} aula(s) sem Para Fazer.`,
  ].filter(Boolean) as string[]

  const published = course.status === 'published'

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-10 px-6 py-10 lg:px-10">
      <header className="flex flex-col gap-4">
        <Link href="/admin/cursos" className="text-caption text-ink-3 hover:text-ink">
          ← Cursos
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-col gap-2">
            <h1 className="text-display font-light">{course.title}</h1>
            <div className="flex flex-wrap items-center gap-2">
              <Chip tone={published ? 'positive' : 'neutral'}>
                {published ? 'Publicado' : 'Rascunho'}
              </Chip>
              {course.format === 'masterclass' && <Chip tone="accent">Masterclass</Chip>}
              <span data-numeric className="text-caption text-ink-4">
                {course.lesson_count} {course.lesson_count === 1 ? 'aula' : 'aulas'} ·{' '}
                {formatDuration(course.duration_seconds)}
              </span>
            </div>
          </div>

          <form action={publicarCurso}>
            <input type="hidden" name="id" value={course.id} />
            <input type="hidden" name="status" value={course.status} />
            <Button type="submit" variant={published ? 'secondary' : 'primary'}>
              {published ? 'Voltar para rascunho' : 'Publicar curso'}
            </Button>
          </form>
        </div>

        {!published && pendencias.length > 0 && (
          <Surface className="flex flex-col gap-2 p-4">
            <span className="text-label font-medium text-caution">Antes de publicar</span>
            <ul className="flex flex-col gap-1">
              {pendencias.map((p) => (
                <li key={p} className="text-caption text-ink-3">
                  · {p}
                </li>
              ))}
            </ul>
            <span className="text-caption text-ink-4">
              Publicar mesmo assim é permitido — só as aulas com vídeo vão ao ar.
            </span>
          </Surface>
        )}
      </header>

      {/* ---------------------------------------------------------------- */}
      <section className="flex flex-col gap-4">
        <h2 className="text-title font-light">Informações gerais</h2>
        <Surface className="p-5">
          <form action={atualizarCurso} className="flex flex-col gap-4">
            <input type="hidden" name="id" value={course.id} />

            <Field label="Título" htmlFor="title">
              <Input id="title" name="title" defaultValue={course.title} required />
            </Field>

            <Field label="Endereço" htmlFor="slug" hint={`O aluno verá /curso/${course.slug}`}>
              <Input id="slug" name="slug" defaultValue={course.slug} />
            </Field>

            <Field label="Resumo" htmlFor="summary" hint="Uma linha. É o que aparece no card.">
              <Input
                id="summary"
                name="summary"
                defaultValue={course.summary ?? ''}
                placeholder="Conduzir uma negociação sem depender de sorte."
              />
            </Field>

            <Field label="Descrição" htmlFor="description" hint="Texto da página do curso.">
              <Textarea id="description" name="description" defaultValue={course.description ?? ''} />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Instrutor" htmlFor="instructor_id">
                <select
                  id="instructor_id"
                  name="instructor_id"
                  defaultValue={course.instructor_id ?? ''}
                  className="h-10 w-full rounded-[var(--radius-control)] border border-line bg-navy-deep px-3 text-body text-ink outline-none focus:border-[rgba(76,65,255,0.7)]"
                >
                  <option value="">Sem instrutor</option>
                  {(instructors ?? []).map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Formato" htmlFor="format">
                <select
                  id="format"
                  name="format"
                  defaultValue={course.format}
                  className="h-10 w-full rounded-[var(--radius-control)] border border-line bg-navy-deep px-3 text-body text-ink outline-none focus:border-[rgba(76,65,255,0.7)]"
                >
                  <option value="course">Curso</option>
                  <option value="masterclass">Masterclass</option>
                </select>
              </Field>
            </div>

            <Button type="submit" variant="secondary" className="self-start">
              Salvar
            </Button>
          </form>
        </Surface>
      </section>

      {/* ---------------------------------------------------------------- */}
      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-title font-light">Temas</h2>
          <p className="text-caption text-ink-4">
            Um curso pode estar em vários. É por aqui que o aluno chega nele.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(themes ?? []).map((theme) => {
            const linked = linkedThemes.has(theme.id)
            return (
              <form key={theme.id} action={alternarTema}>
                <input type="hidden" name="course_id" value={course.id} />
                <input type="hidden" name="theme_id" value={theme.id} />
                <input type="hidden" name="linked" value={String(linked)} />
                <button
                  type="submit"
                  className={`rounded-full border px-3 py-1.5 text-caption transition-colors duration-150 ${
                    linked
                      ? 'border-[rgba(76,65,255,0.5)] bg-[rgba(76,65,255,0.12)] text-blue-light'
                      : 'border-line text-ink-3 hover:border-line-strong hover:text-ink'
                  }`}
                >
                  {linked ? '✓ ' : '+ '}
                  {theme.name}
                  {theme.status !== 'published' && (
                    <span className="text-ink-4"> · rascunho</span>
                  )}
                </button>
              </form>
            )
          })}
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      <section className="flex flex-col gap-4">
        <h2 className="text-title font-light">Currículo</h2>

        <div className="flex flex-col gap-4">
          {moduleList.map((mod) => (
            <Surface key={mod.id} className="flex flex-col">
              <div className="flex items-center gap-3 border-b border-line px-4 py-3">
                <span data-numeric className="text-caption text-ink-4">
                  {formatPosition(mod.position)}
                </span>
                <span className="flex-1 text-body font-medium text-ink">{mod.title}</span>
                {mod.lessons.length === 0 && (
                  <form action={apagarModulo}>
                    <input type="hidden" name="id" value={mod.id} />
                    <input type="hidden" name="course_id" value={course.id} />
                    <button
                      type="submit"
                      aria-label={`Apagar módulo ${mod.title}`}
                      className="flex items-center gap-1.5 text-caption text-ink-4 transition-colors hover:text-critical"
                    >
                      <IconeApagar className="size-3.5" />
                      Apagar
                    </button>
                  </form>
                )}
              </div>

              <div className="flex flex-col divide-y divide-[var(--color-line)]">
                {mod.lessons.map((lesson, index) => (
                  <div key={lesson.id} className="flex items-center gap-3 px-4 py-2.5">
                    <div className="flex flex-col gap-0.5">
                      {(['up', 'down'] as const).map((dir) => (
                        <form key={dir} action={moverAula}>
                          <input type="hidden" name="id" value={lesson.id} />
                          <input type="hidden" name="module_id" value={mod.id} />
                          <input type="hidden" name="course_id" value={course.id} />
                          <input type="hidden" name="direction" value={dir} />
                          <button
                            type="submit"
                            className={iconButton}
                            disabled={dir === 'up' ? index === 0 : index === mod.lessons.length - 1}
                            aria-label={`Mover ${lesson.title} para ${dir === 'up' ? 'cima' : 'baixo'}`}
                          >
                            <IconeMover
                              direcao={dir === 'up' ? 'cima' : 'baixo'}
                              className="size-3"
                            />
                          </button>
                        </form>
                      ))}
                    </div>

                    <Link
                      href={`/admin/cursos/${course.id}/aula/${lesson.id}`}
                      className="min-w-0 flex-1"
                    >
                      <span className="block truncate text-body text-ink-2 hover:text-ink">
                        {lesson.title}
                      </span>
                      <span data-numeric className="text-caption text-ink-4">
                        {formatDuration(lesson.duration_seconds)}
                      </span>
                    </Link>

                    <div className="flex items-center gap-1.5">
                      {!lesson.video_asset_id && <Chip tone="caution">sem vídeo</Chip>}
                      {!lesson.para_fazer?.trim() && <Chip>sem Para Fazer</Chip>}
                      {lesson.status === 'published' && <Chip tone="positive">no ar</Chip>}
                    </div>
                  </div>
                ))}

                <form action={criarAula} className="flex items-center gap-2 px-4 py-3">
                  <input type="hidden" name="course_id" value={course.id} />
                  <input type="hidden" name="module_id" value={mod.id} />
                  <Input name="title" placeholder="Título da nova aula" className="h-9" required />
                  <Button type="submit" size="sm" variant="secondary">
                    Criar aula
                  </Button>
                </form>
              </div>
            </Surface>
          ))}
        </div>

        <Surface className="p-4">
          <form action={criarModulo} className="flex items-center gap-2">
            <input type="hidden" name="course_id" value={course.id} />
            <Input name="title" placeholder="Título do novo módulo" className="h-9" required />
            <Button type="submit" size="sm" variant="secondary">
              Adicionar módulo
            </Button>
          </form>
        </Surface>
      </section>
    </div>
  )
}
