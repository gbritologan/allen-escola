import { ButtonLink } from '@/components/primitives/button'
import { Chip } from '@/components/primitives/chip'
import { Surface } from '@/components/surfaces/surface'
import { COURSE_FORMAT_LABEL, type CourseFormat } from '@/core/catalog/types'
import { ROLE_LABEL } from '@/core/identity/roles'
import { formatDuration } from '@/core/shared/format'
import { requireSession } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'

const PHASES = [
  ['01', 'Arquitetura de produto', 'done'],
  ['02', 'Design system', 'done'],
  ['03', 'Arquitetura técnica', 'done'],
  ['04', 'Banco de dados', 'done'],
  ['05', 'Autenticação e permissões', 'done'],
  ['06', 'Admin e Content Studio', 'next'],
  ['07', 'Área do aluno', 'todo'],
  ['08', 'Player e experiência da aula', 'todo'],
  ['09', 'Progresso e aplicações', 'todo'],
  ['10', 'Masterclass', 'todo'],
  ['11', 'Busca', 'todo'],
  ['12', 'PWA e mobile', 'todo'],
  ['13', 'Camada de Skills', 'todo'],
] as const

/**
 * Provisório. Esta rota vira a Home da jornada do aluno na Fase 7.
 *
 * Por enquanto ela serve de prova de vida da fundação: sessão real, papel vindo
 * do JWT e catálogo lido através da RLS — nada de dado falso.
 */
export default async function Page() {
  const session = await requireSession()
  const supabase = await createClient()

  const { data: courses } = await supabase
    .from('courses')
    .select('id, slug, title, summary, format, duration_seconds, lesson_count')
    .order('title')

  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col justify-center gap-10 px-6 py-20">
      <div className="flex flex-col gap-4">
        <span className="text-caption uppercase tracking-[0.16em] text-ink-3">
          Escola de habilidades corporativas
        </span>
        <h1 className="text-display">Allen Escola</h1>
        <p className="max-w-[58ch] text-lead">
          Fundação em construção. Esta rota vira a Home do aluno na Fase 7.
        </p>
      </div>

      <Surface className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
        <div className="flex flex-col">
          <span className="text-label text-ink">
            {session.profile?.fullName ?? session.email}
          </span>
          <span className="text-caption text-ink-3">{ROLE_LABEL[session.role]}</span>
        </div>
        <form action="/sair" method="post">
          <button
            type="submit"
            className="rounded-[var(--radius-control)] px-3 py-1.5 text-caption text-ink-3 transition-colors hover:bg-[rgba(243,245,252,0.06)] hover:text-ink"
          >
            Sair
          </button>
        </form>
      </Surface>

      <div className="flex flex-col gap-3">
        <span className="text-caption uppercase tracking-[0.16em] text-ink-3">
          Catálogo visível para você
        </span>
        {courses?.map((course) => (
          <Surface key={course.id} className="flex flex-col gap-2 px-5 py-4">
            <div className="flex items-center gap-2">
              <span className="text-label font-strong text-ink">{course.title}</span>
              {course.format === 'masterclass' && <Chip tone="accent">Masterclass</Chip>}
            </div>
            <p className="text-caption text-ink-3">{course.summary}</p>
            <span data-numeric className="text-caption text-ink-4">
              {course.lesson_count} {course.lesson_count === 1 ? 'aula' : 'aulas'} ·{' '}
              {formatDuration(course.duration_seconds)} ·{' '}
              {COURSE_FORMAT_LABEL[course.format as CourseFormat]}
            </span>
          </Surface>
        ))}
      </div>

      <Surface className="flex flex-col divide-y divide-[var(--color-line)]">
        {PHASES.map(([number, name, state]) => (
          <div key={number} className="flex items-center gap-4 px-5 py-3">
            <span data-numeric className="w-6 text-caption text-ink-4">
              {number}
            </span>
            <span
              className={
                state === 'todo' ? 'flex-1 text-label text-ink-4' : 'flex-1 text-label text-ink-2'
              }
            >
              {name}
            </span>
            {state === 'done' && <Chip tone="positive">pronta</Chip>}
            {state === 'next' && <Chip tone="accent">a seguir</Chip>}
          </div>
        ))}
      </Surface>

      <ButtonLink href="/design" variant="secondary" className="self-start">
        Ver o design system
      </ButtonLink>
    </main>
  )
}
