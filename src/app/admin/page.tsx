import Link from 'next/link'
import { Chip } from '@/components/primitives/chip'
import { Surface } from '@/components/surfaces/surface'
import { formatDuration } from '@/core/shared/format'
import { createClient } from '@/lib/supabase/server'

/**
 * O painel não é um dashboard de métricas — é uma lista do que está travando a
 * escola de existir. "O que precisa de você", não "como vão os números".
 */
export default async function AdminPage() {
  const supabase = await createClient()

  const [themes, courses, lessons] = await Promise.all([
    supabase.from('themes').select('id, status'),
    supabase.from('courses').select('id, title, slug, status, lesson_count, duration_seconds'),
    supabase.from('lessons').select('id, title, status, video_asset_id, para_fazer, course_id'),
  ])

  const allThemes = themes.data ?? []
  const allCourses = courses.data ?? []
  const allLessons = lessons.data ?? []

  const draftThemes = allThemes.filter((t) => t.status === 'draft').length
  const draftCourses = allCourses.filter((c) => c.status === 'draft')
  const semVideo = allLessons.filter((l) => !l.video_asset_id)
  const semParaFazer = allLessons.filter((l) => !l.para_fazer?.trim())

  const pendencias = [
    draftThemes > 0 && {
      label: `${draftThemes} ${draftThemes === 1 ? 'tema' : 'temas'} em rascunho`,
      detail: 'Tema em rascunho não aparece em Explorar.',
      href: '/admin/temas',
      tone: 'caution' as const,
    },
    draftCourses.length > 0 && {
      label: `${draftCourses.length} ${draftCourses.length === 1 ? 'curso' : 'cursos'} sem publicar`,
      detail: draftCourses.map((c) => c.title).join(' · '),
      href: '/admin/cursos',
      tone: 'caution' as const,
    },
    semVideo.length > 0 && {
      label: `${semVideo.length} ${semVideo.length === 1 ? 'aula' : 'aulas'} sem vídeo`,
      detail: 'A aula existe, mas não tem o que assistir.',
      href: '/admin/cursos',
      tone: 'caution' as const,
    },
    semParaFazer.length > 0 && {
      label: `${semParaFazer.length} ${semParaFazer.length === 1 ? 'aula' : 'aulas'} sem Para Fazer`,
      detail: 'Aula sem aplicação é videoaula. É a exceção, não a regra.',
      href: '/admin/cursos',
      tone: 'accent' as const,
    },
  ].filter(Boolean) as Array<{
    label: string
    detail: string
    href: string
    tone: 'caution' | 'accent'
  }>

  const totalSeconds = allCourses.reduce((sum, c) => sum + (c.duration_seconds ?? 0), 0)

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-10 px-6 py-10 lg:px-10">
      <header className="flex flex-col gap-2">
        <span className="text-caption uppercase tracking-[0.16em] text-ink-3">Allen Admin</span>
        <h1 className="text-display font-light">Painel</h1>
      </header>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ['Temas', allThemes.length],
          ['Cursos', allCourses.length],
          ['Aulas', allLessons.length],
          ['Catálogo', formatDuration(totalSeconds)],
        ].map(([label, value]) => (
          <Surface key={String(label)} className="flex flex-col gap-1 p-4">
            <span className="text-caption text-ink-4">{label}</span>
            <span data-numeric className="text-title font-light text-ink">
              {value}
            </span>
          </Surface>
        ))}
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-title font-light">O que precisa de você</h2>

        {pendencias.length === 0 ? (
          <Surface className="flex flex-col gap-1 p-5">
            <span className="text-body text-ink">Nada travado.</span>
            <span className="text-caption text-ink-4">
              Todo tema publicado, toda aula com vídeo e com Para Fazer.
            </span>
          </Surface>
        ) : (
          <Surface className="flex flex-col divide-y divide-[var(--color-line)]">
            {pendencias.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="flex items-center gap-4 px-4 py-3.5 transition-colors duration-150 hover:bg-[rgba(243,245,252,0.03)]"
              >
                <div className="min-w-0 flex-1">
                  <span className="text-body text-ink">{item.label}</span>
                  <p className="truncate text-caption text-ink-4">{item.detail}</p>
                </div>
                <Chip tone={item.tone}>resolver</Chip>
              </Link>
            ))}
          </Surface>
        )}
      </section>
    </div>
  )
}
