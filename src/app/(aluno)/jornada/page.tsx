import type { Metadata } from 'next'
import Link from 'next/link'
import { ButtonLink } from '@/components/primitives/button'
import { ProgressMeter } from '@/components/primitives/progress-meter'
import { Surface } from '@/components/surfaces/surface'
import { resolverSkills, type SinalCru } from '@/core/skills/resolve-skills'
import { createClient } from '@/lib/supabase/server'
import { requireSession } from '@/lib/auth/session'
import { Habilidades } from './habilidades'

export const metadata: Metadata = { title: 'Minha jornada' }

/**
 * MINHA JORNADA.
 *
 * O briefing pede clareza, não um painel cheio de gráficos. Então: o que está
 * em andamento, o que foi concluído, e quantas aplicações foram feitas.
 *
 * A contagem de aplicações fica ao lado do progresso de propósito — são duas
 * medidas diferentes, e a segunda é a que importa. Aula assistida é consumo;
 * aplicação feita é a unidade de valor da Allen.
 */
export default async function JornadaPage() {
  const session = await requireSession()
  const supabase = await createClient()

  const [{ data: enrollments }, { count: aplicacoes }] = await Promise.all([
    supabase
      .from('enrollments')
      .select('course_id, progress_percent, completed_lessons, total_lessons, completed_at')
      .eq('user_id', session.userId)
      .order('last_seen_at', { ascending: false }),
    supabase
      .from('applications')
      .select('lesson_id', { count: 'exact', head: true })
      .eq('user_id', session.userId)
      .then((r) => ({ count: r.count ?? 0 })),
  ])

  const lista = enrollments ?? []
  const courseIds = lista.map((e) => e.course_id)

  const { data: cursos } = courseIds.length
    ? await supabase.from('courses').select('id, slug, title').in('id', courseIds)
    : { data: [] as Array<{ id: string; slug: string; title: string }> }
  const cursoPorId = new Map((cursos ?? []).map((c) => [c.id, c]))

  const emAndamento = lista.filter((e) => !e.completed_at)
  const concluidos = lista.filter((e) => e.completed_at)

  /**
   * A camada de skills, lida pela primeira vez.
   *
   * Os sinais são append-only e crescem por aluno, não por catálogo — mesmo
   * quem terminar tudo terá algumas centenas de linhas. Ler tudo e reduzir em
   * memória é mais simples e mais rápido que agregar no banco, e mantém a
   * regra num módulo puro, testado, fora do React.
   */
  const [{ data: skills }, { data: sinais }] = await Promise.all([
    supabase.from('skills').select('id, slug, name, description'),
    supabase
      .from('skill_signals')
      .select('skill_id, kind, value, source_id')
      .eq('user_id', session.userId),
  ])

  const habilidades = resolverSkills(
    skills ?? [],
    (sinais ?? []).map(
      (s): SinalCru => ({
        skillId: s.skill_id,
        kind: s.kind,
        value: Number(s.value),
        sourceId: s.source_id,
      }),
    ),
  )

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-12 px-6 pt-10 sm:pt-14">
      <header className="flex flex-col gap-3">
        <h1 className="text-display font-light">Minha jornada</h1>
      </header>

      <section className="flex flex-wrap gap-10 border-b border-line pb-8">
        <Numero valor={emAndamento.length} rotulo="em andamento" />
        <Numero valor={concluidos.length} rotulo="concluídos" />
        <Numero valor={aplicacoes ?? 0} rotulo="aplicações feitas" destaque />
      </section>

      <Habilidades skills={habilidades} />

      {lista.length === 0 ? (
        <section className="flex flex-col items-start gap-4">
          <p className="max-w-[52ch] text-lead font-light text-ink-2">
            Sua jornada começa na primeira aula.
          </p>
          <ButtonLink href="/explorar">Explorar cursos</ButtonLink>
        </section>
      ) : (
        <>
          {emAndamento.length > 0 && (
            <Secao titulo="Em andamento">
              {emAndamento.map((e) => {
                const curso = cursoPorId.get(e.course_id)
                if (!curso) return null
                return (
                  <Link
                    key={e.course_id}
                    href={`/curso/${curso.slug}`}
                    className="flex flex-col gap-3 px-5 py-4 transition-colors hover:bg-[rgba(243,245,252,0.03)]"
                  >
                    <div className="flex items-baseline justify-between gap-4">
                      <span className="text-body text-ink">{curso.title}</span>
                      <span data-numeric className="text-caption text-ink-4">
                        {e.completed_lessons}/{e.total_lessons}
                      </span>
                    </div>
                    <ProgressMeter
                      value={e.progress_percent}
                      label={`Progresso em ${curso.title}`}
                    />
                  </Link>
                )
              })}
            </Secao>
          )}

          {concluidos.length > 0 && (
            <Secao titulo="Concluídos">
              {concluidos.map((e) => {
                const curso = cursoPorId.get(e.course_id)
                if (!curso) return null
                return (
                  <Link
                    key={e.course_id}
                    href={`/curso/${curso.slug}`}
                    className="flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-[rgba(243,245,252,0.03)]"
                  >
                    <span className="text-body text-ink-2">{curso.title}</span>
                    <span data-numeric className="text-caption text-positive">100%</span>
                  </Link>
                )
              })}
            </Secao>
          )}
        </>
      )}
    </main>
  )
}

function Numero({
  valor,
  rotulo,
  destaque = false,
}: {
  valor: number
  rotulo: string
  destaque?: boolean
}) {
  return (
    <div className="flex flex-col">
      <span
        data-numeric
        className={destaque ? 'text-hero font-hair text-blue-light' : 'text-hero font-hair text-ink'}
      >
        {valor}
      </span>
      <span className="text-caption text-ink-4">{rotulo}</span>
    </div>
  )
}

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-caption font-medium uppercase tracking-[0.16em] text-ink-3">{titulo}</h2>
      <Surface className="flex flex-col divide-y divide-[var(--color-line)]">{children}</Surface>
    </section>
  )
}
