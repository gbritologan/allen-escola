import type { Metadata } from 'next'
import Link from 'next/link'
import { CourseCard } from '@/components/domain/course-card'
import { Surface } from '@/components/surfaces/surface'
import { formatDuration } from '@/core/shared/format'
import { listCourses } from '@/lib/data/catalog'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = { title: 'Buscar' }

/**
 * BUSCA.
 *
 * Usa o índice `search_doc` (tsvector em português, com acentos normalizados)
 * que já existe em `courses` e `lessons` desde a migration 0003. O termo
 * digitado passa pela mesma normalização de acentos que o índice usou —
 * senão "negociacao" não acha "negociação".
 *
 * Sem JavaScript: é um formulário GET. A busca instantânea com ⌘K entra na
 * Fase 11; esta versão já responde à pergunta e funciona com o teclado.
 */
export default async function BuscarPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const { q } = await searchParams
  const termo = (q ?? '').trim()

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-10 px-6 pt-10 sm:pt-14">
      <header className="flex flex-col gap-5">
        <h1 className="text-display font-light">Buscar</h1>
        <form action="/buscar" method="get" className="flex gap-2">
          <input
            name="q"
            defaultValue={termo}
            autoFocus
            placeholder="negociação, IA, prospecção…"
            aria-label="O que você procura"
            className="h-12 flex-1 rounded-[var(--radius-control)] border border-line bg-navy px-4 text-body text-ink placeholder:text-ink-4 outline-none transition-colors focus:border-[rgba(76,65,255,0.7)]"
          />
          <button
            type="submit"
            className="rounded-[var(--radius-control)] bg-blue px-5 text-label font-strong text-off-white transition-colors hover:bg-blue-light"
          >
            Buscar
          </button>
        </form>
      </header>

      {termo.length >= 2 ? <Resultados termo={termo} /> : <Sugestoes />}
    </main>
  )
}

async function Resultados({ termo }: { termo: string }) {
  const supabase = await createClient()

  // Mesma normalização do índice: sem isto, "negociacao" não acha "negociação".
  const consulta = termo
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()

  const [{ data: cursos }, { data: aulas }, { data: apps }] = await Promise.all([
    supabase
      .from('courses')
      .select('id, slug, title, summary, cover_url, format, duration_seconds, lesson_count, available_at')
      .textSearch('search_doc', consulta, { type: 'websearch', config: 'portuguese' })
      .limit(12),
    supabase
      .from('lessons')
      .select('id, title, description, duration_seconds, course_id')
      .textSearch('search_doc', consulta, { type: 'websearch', config: 'portuguese' })
      .limit(12),
    // Os Apps ganharam `search_doc` na 0015 justamente para isto — e a busca
    // ficou sem consultá-los. Índice que ninguém lê é trabalho jogado fora, e
    // pior: quem procurasse pelo nome de uma ferramenta da Allen não a acharia.
    supabase
      .from('apps')
      .select('id, slug, name, tagline')
      .eq('status', 'published')
      .textSearch('search_doc', consulta, { type: 'websearch', config: 'portuguese' })
      .limit(8),
  ])

  const encontrouCursos = cursos ?? []
  const encontrouAulas = aulas ?? []
  const encontrouApps = apps ?? []

  if (encontrouCursos.length === 0 && encontrouAulas.length === 0 && encontrouApps.length === 0) {
    return (
      <section className="flex flex-col gap-2">
        <p className="text-lead font-light text-ink-2">Nada para “{termo}”.</p>
        <p className="text-body text-ink-4">
          Tente uma palavra mais curta, ou{' '}
          <Link href="/explorar" className="text-blue-light hover:underline">
            explore por tema
          </Link>
          .
        </p>
      </section>
    )
  }

  const courseIds = [...new Set(encontrouAulas.map((a) => a.course_id))]
  const { data: cursosDasAulas } = courseIds.length
    ? await supabase.from('courses').select('id, slug, title').in('id', courseIds)
    : { data: [] as Array<{ id: string; slug: string; title: string }> }
  const cursoPorId = new Map((cursosDasAulas ?? []).map((c) => [c.id, c]))

  return (
    <div className="flex flex-col gap-10">
      {encontrouCursos.length > 0 && (
        <section className="flex flex-col gap-4">
          <h2 className="text-caption font-medium uppercase tracking-[0.16em] text-ink-3">
            Cursos
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {encontrouCursos.map((c) => (
              <CourseCard
                key={c.id}
                course={{
                  id: c.id,
                  slug: c.slug,
                  title: c.title,
                  summary: c.summary,
                  coverUrl: c.cover_url,
                  availableAt: c.available_at ?? null,
                  format: c.format,
                  durationSeconds: c.duration_seconds,
                  lessonCount: c.lesson_count,
                  instructorName: null,
                  themeNames: [],
                }}
              />
            ))}
          </div>
        </section>
      )}

      {/* Apps antes de Aulas: quem digita o nome de uma ferramenta quer a
          ferramenta, não a aula que fala dela. */}
      {encontrouApps.length > 0 && (
        <section className="flex flex-col gap-4">
          <h2 className="text-caption font-medium uppercase tracking-[0.16em] text-ink-3">Apps</h2>
          <Surface className="flex flex-col divide-y divide-[var(--color-line)]">
            {encontrouApps.map((app) => (
              <Link
                key={app.id}
                href={`/apps/${app.slug}`}
                className="group flex flex-col gap-0.5 px-5 py-3.5 transition-colors hover:bg-[rgba(243,245,252,0.03)]"
              >
                <span className="text-body text-ink-2 group-hover:text-ink">{app.name}</span>
                {app.tagline && (
                  <span className="line-clamp-1 text-caption text-ink-4">{app.tagline}</span>
                )}
              </Link>
            ))}
          </Surface>
        </section>
      )}

      {encontrouAulas.length > 0 && (
        <section className="flex flex-col gap-4">
          <h2 className="text-caption font-medium uppercase tracking-[0.16em] text-ink-3">Aulas</h2>
          <Surface className="flex flex-col divide-y divide-[var(--color-line)]">
            {encontrouAulas.map((a) => {
              const curso = cursoPorId.get(a.course_id)
              return (
                <Link
                  key={a.id}
                  href={curso ? `/curso/${curso.slug}` : '/explorar'}
                  className="flex flex-col gap-0.5 px-5 py-3.5 transition-colors hover:bg-[rgba(243,245,252,0.03)]"
                >
                  <span className="text-body text-ink">{a.title}</span>
                  <span data-numeric className="text-caption text-ink-4">
                    {curso?.title}
                    {a.duration_seconds > 0 && ` · ${formatDuration(a.duration_seconds)}`}
                  </span>
                </Link>
              )
            })}
          </Surface>
        </section>
      )}
    </div>
  )
}

async function Sugestoes() {
  const cursos = await listCourses({ limit: 4 })
  if (cursos.length === 0) return null

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-caption font-medium uppercase tracking-[0.16em] text-ink-3">
        Enquanto isso
      </h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {cursos.map((c) => (
          <CourseCard key={c.id} course={c} />
        ))}
      </div>
    </section>
  )
}
