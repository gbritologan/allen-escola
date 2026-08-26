import type { Metadata } from 'next'
import { CourseCard } from '@/components/domain/course-card'
import { ButtonLink } from '@/components/primitives/button'
import { listCourses } from '@/lib/data/catalog'

export const metadata: Metadata = { title: 'Masterclass' }

/**
 * MASTERCLASS.
 *
 * O formato já existia — `courses.format = 'masterclass'` — mas só aparecia
 * como uma faixa dentro de Explorar e uma seção da Home. O formato mais caro
 * de produzir era o mais difícil de achar.
 *
 * Ganhar cadeira própria na sidebar é o reconhecimento disso. D-12 dizia que
 * Masterclass é "formato editorial em destaque, não destino de navegação"; o
 * argumento valia quando havia quatro destinos e o produto era pequeno.
 */
export default async function MasterclassPage() {
  const masterclasses = await listCourses({ format: 'masterclass' })

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-10 px-6 pt-10 sm:pt-14">
      <header className="flex flex-col gap-3">
        <h1 className="text-display font-light">Masterclass</h1>
        <p className="max-w-[54ch] text-lead font-light text-ink-2">
          Um expert. Um assunto. Um mergulho profundo.
        </p>
      </header>

      {masterclasses.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {masterclasses.map((c) => (
            <CourseCard key={c.id} course={c} />
          ))}
        </div>
      ) : (
        /* Vazio que diz o que é e para onde ir. Uma tela em branco com
           "nenhum resultado" faz a pessoa achar que quebrou. */
        <div className="flex flex-col items-start gap-4 rounded-[var(--radius-card)] border border-line px-6 py-8">
          <p className="max-w-[52ch] text-body text-ink-3">
            Nenhuma Masterclass publicada ainda. Quando a primeira sair, ela aparece aqui — e
            enquanto isso o catálogo de cursos continua inteiro.
          </p>
          <ButtonLink href="/explorar" variant="secondary" size="sm">
            Ver os cursos
          </ButtonLink>
        </div>
      )}
    </main>
  )
}
