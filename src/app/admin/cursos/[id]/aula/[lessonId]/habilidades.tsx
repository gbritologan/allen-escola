import Link from 'next/link'
import { ajustarPesoHabilidade, alternarHabilidade } from './actions'

export interface SkillDisponivel {
  id: string
  name: string
  description: string | null
}

/** Três degraus, e cada um diz o que significa. */
const DEGRAUS = [
  { valor: 1, rotulo: 'toca', hint: 'A aula passa pelo assunto.' },
  { valor: 2, rotulo: 'trabalha', hint: 'A aula desenvolve o assunto.' },
  { valor: 3, rotulo: 'é o assunto', hint: 'A aula existe por causa dele.' },
] as const

/**
 * HABILIDADES DA AULA.
 *
 * A única entrada humana da camada de skills — e a mais fácil de esquecer,
 * porque nada quebra quando ela fica vazia. A aula publica, o aluno assiste, o
 * gatilho dispara e insere zero linhas. Só meses depois alguém descobre que o
 * histórico não existe.
 *
 * Por isso o aviso de aula sem habilidade fica ao lado do de aula sem vídeo,
 * na mesma altura visual: o custo de esquecer aqui só aparece tarde demais.
 */
export function Habilidades({
  lessonId,
  courseId,
  skills,
  mapeadas,
}: {
  lessonId: string
  courseId: string
  skills: SkillDisponivel[]
  mapeadas: Map<string, number>
}) {
  if (skills.length === 0) {
    return (
      <p className="text-caption text-caution">
        Nenhuma habilidade cadastrada ainda —{' '}
        <Link href="/admin/habilidades" className="underline hover:text-ink">
          cadastre as primeiras
        </Link>
        . Enquanto não houver nenhuma, as aulas concluídas não geram histórico.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        {skills.map((skill) => {
          const peso = mapeadas.get(skill.id)
          const ligada = peso !== undefined
          return (
            <form key={skill.id} action={alternarHabilidade}>
              <input type="hidden" name="lesson_id" value={lessonId} />
              <input type="hidden" name="course_id" value={courseId} />
              <input type="hidden" name="skill_id" value={skill.id} />
              <input type="hidden" name="ligada" value={String(ligada)} />
              <button
                type="submit"
                title={skill.description ?? undefined}
                className={`rounded-full border px-3 py-1.5 text-caption transition-colors duration-150 ${
                  ligada
                    ? 'border-[rgba(76,65,255,0.5)] bg-[rgba(76,65,255,0.12)] text-blue-light'
                    : 'border-line text-ink-3 hover:border-line-strong hover:text-ink'
                }`}
              >
                {ligada ? '✓ ' : '+ '}
                {skill.name}
              </button>
            </form>
          )
        })}
      </div>

      {mapeadas.size > 0 && (
        <div className="flex flex-col gap-2 border-t border-line pt-4">
          <span className="text-caption text-ink-4">
            Quanto esta aula desenvolve cada uma
          </span>
          {skills
            .filter((s) => mapeadas.has(s.id))
            .map((skill) => {
              const atual = mapeadas.get(skill.id) ?? 1
              return (
                <div key={skill.id} className="flex flex-wrap items-center gap-3">
                  <span className="min-w-32 text-label text-ink-2">{skill.name}</span>
                  <div className="flex gap-1">
                    {DEGRAUS.map((degrau) => {
                      const ativo = Math.round(atual) === degrau.valor
                      return (
                        <form key={degrau.valor} action={ajustarPesoHabilidade}>
                          <input type="hidden" name="lesson_id" value={lessonId} />
                          <input type="hidden" name="course_id" value={courseId} />
                          <input type="hidden" name="skill_id" value={skill.id} />
                          <input type="hidden" name="weight" value={degrau.valor} />
                          <button
                            type="submit"
                            title={degrau.hint}
                            aria-pressed={ativo}
                            className={`rounded-[var(--radius-control)] border px-2.5 py-1 text-caption transition-colors duration-150 ${
                              ativo
                                ? 'border-line-strong bg-navy-soft text-ink'
                                : 'border-line text-ink-4 hover:text-ink-2'
                            }`}
                          >
                            {degrau.rotulo}
                          </button>
                        </form>
                      )
                    })}
                  </div>
                </div>
              )
            })}
        </div>
      )}
    </div>
  )
}
