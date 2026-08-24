import type { Metadata } from 'next'
import Link from 'next/link'
import { CourseCard } from '@/components/domain/course-card'
import { listCourses, listThemes } from '@/lib/data/catalog'

export const metadata: Metadata = { title: 'Explorar' }

/**
 * EXPLORAR.
 *
 * Sem parede de escolha na entrada (briefing §35): a página não pergunta nada
 * antes de mostrar conteúdo. Os temas são navegação, não porteiro.
 *
 * A faixa de Masterclass fica no topo porque Masterclass é formato editorial
 * em destaque, não um quinto destino de navegação (D-12).
 */
export default async function ExplorarPage() {
  const [themes, masterclasses, cursos] = await Promise.all([
    listThemes(),
    listCourses({ format: 'masterclass' }),
    listCourses({ format: 'course' }),
  ])

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-14 px-6 pt-10 sm:pt-14">
      <header className="flex flex-col gap-3">
        <h1 className="text-display font-light">Explorar</h1>
        <p className="max-w-[56ch] text-lead font-light text-ink-2">
          {cursos.length + masterclasses.length}{' '}
          {cursos.length + masterclasses.length === 1 ? 'curso' : 'cursos'} em {themes.length}{' '}
          {themes.length === 1 ? 'tema' : 'temas'}.
        </p>
      </header>

      {themes.length > 0 && (
        <section className="flex flex-wrap gap-2">
          {themes.map((t) => (
            <Link
              key={t.id}
              href={`/tema/${t.slug}`}
              className="rounded-full border border-line px-4 py-2 text-label text-ink-2 transition-colors duration-150 hover:border-line-strong hover:bg-[rgba(243,245,252,0.05)] hover:text-ink"
            >
              {t.name}
            </Link>
          ))}
        </section>
      )}

      {masterclasses.length > 0 && (
        <section className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <h2 className="text-caption font-medium uppercase tracking-[0.16em] text-ink-3">
              Masterclass
            </h2>
            <p className="text-body text-ink-3">Um expert. Um assunto. Um mergulho profundo.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {masterclasses.map((c) => (
              <CourseCard key={c.id} course={c} />
            ))}
          </div>
        </section>
      )}

      <section className="flex flex-col gap-4">
        <h2 className="text-caption font-medium uppercase tracking-[0.16em] text-ink-3">Cursos</h2>
        {cursos.length === 0 ? (
          <p className="text-body text-ink-4">Nenhum curso publicado ainda.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {cursos.map((c) => (
              <CourseCard key={c.id} course={c} />
            ))}
          </div>
        )}
      </section>
    </main>
  )
}
