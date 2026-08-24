import type { Metadata } from 'next'
import { Button } from '@/components/primitives/button'
import { Chip } from '@/components/primitives/chip'
import { IconeApagar } from '@/components/icons'
import { Field, Input } from '@/components/primitives/field'
import { Surface } from '@/components/surfaces/surface'
import { createClient } from '@/lib/supabase/server'
import { apagarHabilidade, renomearHabilidade } from './actions'
import { NovaHabilidade } from './nova-habilidade'

export const metadata: Metadata = { title: 'Habilidades' }

/**
 * HABILIDADES.
 *
 * A camada que grava desde o dia um (D-08) — e a que mais silenciosamente
 * deixa de funcionar, porque nada quebra quando ela está vazia.
 *
 * Por isso esta tela mostra, para cada habilidade, quantas aulas a
 * desenvolvem e quantos sinais já foram registrados. Uma habilidade com
 * 0 aulas é uma habilidade que nunca vai registrar nada, e é melhor descobrir
 * isso aqui do que seis meses depois.
 */
export default async function HabilidadesPage() {
  const supabase = await createClient()

  const [{ data: skills }, { data: mapeamentos }] = await Promise.all([
    supabase.from('skills').select('id, name, slug, description').order('name'),
    supabase.from('lesson_skills').select('skill_id, lesson_id'),
  ])

  const lista = skills ?? []
  const aulasPorSkill = new Map<string, number>()
  for (const m of mapeamentos ?? []) {
    aulasPorSkill.set(m.skill_id, (aulasPorSkill.get(m.skill_id) ?? 0) + 1)
  }

  // Uma consulta por habilidade seria N+1; uma só, agrupada em memória, é
  // barata porque a lista de habilidades é curta por natureza.
  const { data: sinais } = await supabase.from('skill_signals').select('skill_id')
  const sinaisPorSkill = new Map<string, number>()
  for (const s of sinais ?? []) {
    sinaisPorSkill.set(s.skill_id, (sinaisPorSkill.get(s.skill_id) ?? 0) + 1)
  }

  const semAula = lista.filter((s) => !aulasPorSkill.has(s.id)).length

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-10 px-6 py-10 lg:px-10">
      <header className="flex flex-col gap-2">
        <h1 className="text-display font-light">Habilidades</h1>
        <p className="max-w-[62ch] text-body text-ink-3">
          O eixo do histórico do aluno. Ele nunca escolhe uma — elas são deduzidas do que ele
          concluiu e, com peso dobrado, do que ele aplicou.
        </p>
      </header>

      <section className="flex flex-col gap-4">
        <h2 className="text-title font-light">Nova habilidade</h2>
        <Surface className="p-5">
          <NovaHabilidade />
        </Surface>
      </section>

      {/* ------------------------------------------------------------------ */}
      <section className="flex flex-col gap-4">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="text-title font-light">
            {lista.length === 0
              ? 'Nenhuma habilidade'
              : `${lista.length} ${lista.length === 1 ? 'habilidade' : 'habilidades'}`}
          </h2>
          {semAula > 0 && (
            <span className="text-caption text-caution">
              {semAula} sem nenhuma aula ligada
            </span>
          )}
        </div>

        {lista.length === 0 ? (
          <Surface className="p-5">
            <p className="text-body text-ink-3">
              Enquanto não houver nenhuma, cada aula concluída dispara o gatilho e grava zero
              linhas. O histórico começa aqui.
            </p>
          </Surface>
        ) : (
          <div className="flex flex-col gap-3">
            {lista.map((skill) => {
              const aulas = aulasPorSkill.get(skill.id) ?? 0
              const registros = sinaisPorSkill.get(skill.id) ?? 0
              const podeApagar = aulas === 0 && registros === 0

              return (
                <Surface key={skill.id} className="flex flex-col gap-4 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-lead font-light text-ink">{skill.name}</span>
                      <Chip tone={aulas > 0 ? 'accent' : 'caution'}>
                        {aulas === 0 ? 'sem aulas' : `${aulas} ${aulas === 1 ? 'aula' : 'aulas'}`}
                      </Chip>
                      {registros > 0 && (
                        <Chip tone="positive">
                          {registros} {registros === 1 ? 'registro' : 'registros'}
                        </Chip>
                      )}
                    </div>

                    {podeApagar ? (
                      <form action={apagarHabilidade}>
                        <input type="hidden" name="id" value={skill.id} />
                        <button
                          type="submit"
                          className="flex items-center gap-1.5 text-caption text-ink-4 transition-colors hover:text-critical"
                        >
                          <IconeApagar className="size-3.5" />
                          Apagar
                        </button>
                      </form>
                    ) : (
                      /* Apagar aqui apagaria sinais em cascata, e sinal apagado
                         não volta. A tela diz o que está segurando. */
                      <span className="text-caption text-ink-4">
                        {registros > 0
                          ? 'Tem histórico gravado — apagar destruiria os registros.'
                          : 'Ligada a aulas.'}
                      </span>
                    )}
                  </div>

                  <form action={renomearHabilidade} className="flex flex-col gap-3">
                    <input type="hidden" name="id" value={skill.id} />
                    <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_2fr]">
                      <Field label="Nome" htmlFor={`name-${skill.id}`}>
                        <Input
                          id={`name-${skill.id}`}
                          name="name"
                          defaultValue={skill.name}
                          required
                        />
                      </Field>
                      <Field label="O que é, na prática" htmlFor={`desc-${skill.id}`}>
                        <Input
                          id={`desc-${skill.id}`}
                          name="description"
                          defaultValue={skill.description ?? ''}
                        />
                      </Field>
                    </div>
                    <Button type="submit" variant="secondary" size="sm" className="self-start">
                      Salvar
                    </Button>
                  </form>
                </Surface>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
