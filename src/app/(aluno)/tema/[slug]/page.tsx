import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { CourseCard } from '@/components/domain/course-card'
import { getThemeBySlug, listCourses, listThemes } from '@/lib/data/catalog'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const theme = await getThemeBySlug(slug)
  return { title: theme?.name ?? 'Tema' }
}

export default async function TemaPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const theme = await getThemeBySlug(slug)
  if (!theme) notFound()

  const [cursos, todos] = await Promise.all([listCourses({ themeId: theme.id }), listThemes()])
  const outros = todos.filter((t) => t.id !== theme.id)

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-12 px-6 pt-10 sm:pt-14">
      <header className="flex flex-col gap-4">
        <Link href="/explorar" className="text-caption text-ink-3 hover:text-ink">
          ← Explorar
        </Link>
        <h1 className="max-w-[16ch] text-display font-hair">{theme.name}</h1>
        {theme.description && (
          <p className="max-w-[54ch] text-lead font-light text-ink-2">{theme.description}</p>
        )}
      </header>

      {cursos.length === 0 ? (
        <p className="text-body text-ink-4">
          Ainda não há cursos publicados neste tema.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cursos.map((c) => (
            <CourseCard key={c.id} course={c} />
          ))}
        </div>
      )}

      {outros.length > 0 && (
        <section className="flex flex-col gap-3 border-t border-line pt-8">
          <h2 className="text-caption font-medium uppercase tracking-[0.16em] text-ink-3">
            Outros temas
          </h2>
          <div className="flex flex-wrap gap-2">
            {outros.map((t) => (
              <Link
                key={t.id}
                href={`/tema/${t.slug}`}
                className="rounded-full border border-line px-4 py-2 text-label text-ink-3 transition-colors duration-150 hover:border-line-strong hover:text-ink"
              >
                {t.name}
              </Link>
            ))}
          </div>
        </section>
      )}
    </main>
  )
}
