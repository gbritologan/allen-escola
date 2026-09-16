import type { Metadata } from 'next'
import { CourseCard } from '@/components/domain/course-card'
import { emBreve } from '@/core/catalog/types'
import { listCourses } from '@/lib/data/catalog'

export const metadata: Metadata = { title: 'Capacitações' }

/**
 * CAPACITAÇÕES — o formato de mergulho.
 *
 * Chamava-se "Masterclass" e o Gabriel pediu o nome novo, com a referência do
 * Arkom na mão.
 *
 * Eu cheguei a fazer esta aba listar o catálogo INTEIRO, porque no Arkom
 * "Capacitações" são os cursos todos. Ele corrigiu: quer as duas prateleiras
 * separadas — `/cursos` para o catálogo geral e esta para o formato de
 * mergulho. Faz sentido: são coisas que a pessoa procura em momentos
 * diferentes, e juntá-las obrigaria a filtrar o que já vinha separado no
 * banco (`courses.format`).
 *
 * A ORDEM é a tese: primeiro o que já dá para fazer, "Em breve" por último.
 * Promessa antes de entrega inverte o produto.
 */
export default async function CapacitacoesPage() {
  const capacitacoes = await listCourses({ format: 'masterclass' })

  const disponiveis = capacitacoes.filter((c) => !emBreve(c))
  const chegando = capacitacoes.filter((c) => emBreve(c))
  const total = disponiveis.length

  return (
    <main className="largura-catalogo flex flex-col gap-12 px-6 pt-10 sm:pt-14">
      <header className="flex flex-col gap-3">
        <h1 className="text-display font-light">Capacitações</h1>
        <p className="max-w-[58ch] text-lead font-light text-ink-2">
          Um expert. Um assunto. Um mergulho profundo.
        </p>
        {total > 0 && (
          <span data-numeric className="text-label text-ink-4">
            {total} {total === 1 ? 'capacitação disponível' : 'capacitações disponíveis'}
          </span>
        )}
      </header>

      {disponiveis.length > 0 && (
        <Secao
          titulo="Disponíveis agora"
          apoio="Cada uma é um assunto inteiro, do começo ao fim."
          cursos={disponiveis}
        />
      )}

      {chegando.length > 0 && (
        <Secao
          titulo="Em breve"
          apoio="Já está no seu catálogo. Abre sozinho na data."
          cursos={chegando}
        />
      )}

      {total === 0 && chegando.length === 0 && (
        <div className="rounded-[var(--radius-card)] border border-line px-6 py-8">
          <p className="max-w-[52ch] text-body text-ink-3">
            Nenhuma capacitação publicada ainda. Enquanto isso, o catálogo de cursos está
            inteiro em <a className="text-blue-light hover:underline" href="/cursos">Cursos</a>.
          </p>
        </div>
      )}
    </main>
  )
}

function Secao({
  titulo,
  apoio,
  cursos,
}: {
  titulo: string
  apoio: string
  cursos: Awaited<ReturnType<typeof listCourses>>
}) {
  return (
    <section className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <h2 className="text-title font-light text-ink">{titulo}</h2>
        <p className="text-body text-ink-3">{apoio}</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
        {cursos.map((c) => (
          <CourseCard key={c.id} course={c} />
        ))}
      </div>
    </section>
  )
}
