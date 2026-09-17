import type { Metadata } from 'next'
import Link from 'next/link'
import { CourseCard } from '@/components/domain/course-card'
import { listCourses, listThemes } from '@/lib/data/catalog'

export const metadata: Metadata = { title: 'Cursos' }

/**
 * CURSOS — o catálogo geral.
 *
 * Era `/cursos`, e perdeu a cadeira na sidebar em D-42 por ter nome vago.
 * O Gabriel pediu duas prateleiras separadas: esta, do catálogo, e
 * `/capacitacoes`, do formato de mergulho. "Cursos" é o nome que "Explorar"
 * deveria ter tido desde o início — diz o que tem dentro.
 *
 * AS CAPACITAÇÕES SAÍRAM DAQUI. Antes havia uma faixa delas no topo desta
 * página; agora elas têm destino próprio, e repetir aqui faria a mesma coisa
 * aparecer em dois lugares sem que ninguém soubesse qual é o certo.
 *
 * Sem parede de escolha na entrada (briefing §35): a página não pergunta nada
 * antes de mostrar conteúdo. Os temas são navegação, não porteiro.
 */
export default async function CursosPage() {
  const [themes, cursos] = await Promise.all([listThemes(), listCourses({ format: 'course' })])

  return (
    <main className="largura-catalogo flex flex-col gap-14 px-6 pt-10 sm:pt-14">
      <header className="flex flex-col gap-3">
        <h1 className="text-display font-light">Cursos</h1>
        <p className="max-w-[56ch] text-lead font-light text-ink-2">
          {cursos.length} {cursos.length === 1 ? 'curso' : 'cursos'} em {themes.length}{' '}
          {themes.length === 1 ? 'tema' : 'temas'}.
        </p>
      </header>

      {themes.length > 0 && (
        <section className="flex flex-wrap gap-2">
          {themes.map((t) => (
            <Link
              key={t.id}
              href={`/tema/${t.slug}`}
              className="rounded-full border border-line px-4 py-2 text-label text-ink-2 transition-colors duration-150 hover:border-line-strong hover:bg-[var(--color-realce-2)] hover:text-ink"
            >
              {t.name}
            </Link>
          ))}
        </section>
      )}

      <section className="flex flex-col gap-4">
        <h2 className="text-caption font-medium uppercase tracking-[0.16em] text-ink-3">
          Todos os cursos
        </h2>
        {cursos.length === 0 ? (
          <p className="text-body text-ink-4">Nenhum curso publicado ainda.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
            {cursos.map((c) => (
              <CourseCard key={c.id} course={c} />
            ))}
          </div>
        )}
      </section>
    </main>
  )
}
