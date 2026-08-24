import { Chip } from '@/components/primitives/chip'
import { ProgressMeter } from '@/components/primitives/progress-meter'
import { Surface } from '@/components/surfaces/surface'
import { ROTULO_ESTAGIO, type SkillResolvida } from '@/core/skills/resolve-skills'

/**
 * O QUE VOCÊ ESTÁ DESENVOLVENDO.
 *
 * Primeira leitura da camada que grava desde a migration 0005.
 *
 * Duas escolhas que vêm do briefing:
 *
 * · Nada de gráfico de radar. O aluno não precisa de um painel; precisa saber
 *   onde está e o que fazer em seguida. Uma barra, um rótulo e um número.
 * · Quem só assistiu vê a barra parada no teto E o motivo, escrito. Esconder o
 *   teto seria mentir por omissão; mostrá-lo sem explicar seria punir sem
 *   dizer por quê.
 *
 * Habilidade sem nenhum sinal não aparece: lista de zeros não é diagnóstico,
 * é constrangimento.
 */
export function Habilidades({ skills }: { skills: SkillResolvida[] }) {
  const comSinal = skills.filter((s) => s.aulas > 0 || s.aplicacoes > 0)
  if (comSinal.length === 0) return null

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-caption font-medium uppercase tracking-[0.16em] text-ink-3">
          O que você está desenvolvendo
        </h2>
        <p className="text-caption text-ink-4">
          Sai do que você fez, não do que você escolheu. Aplicar pesa quatro vezes mais que
          assistir.
        </p>
      </div>

      <Surface className="flex flex-col divide-y divide-[var(--color-line)]">
        {comSinal.map((s) => (
          <div key={s.skill.id} className="flex flex-col gap-2.5 px-5 py-4">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-body text-ink">{s.skill.name}</span>
                <Chip tone={s.estagio === 'consistente' ? 'positive' : 'neutral'}>
                  {ROTULO_ESTAGIO[s.estagio]}
                </Chip>
              </div>
              <span data-numeric className="text-caption text-ink-4">
                {s.aulas} {s.aulas === 1 ? 'aula' : 'aulas'} · {s.aplicacoes}{' '}
                {s.aplicacoes === 1 ? 'aplicação' : 'aplicações'}
              </span>
            </div>

            <ProgressMeter
              value={s.nivel}
              showValue
              label={`Nível em ${s.skill.name}`}
            />

            {/* O teto explicado. Sem esta linha, a barra parada vira bug. */}
            {s.travadoSemPratica && (
              <p className="text-caption text-caution">
                Assistir parou de contar aqui. A primeira aplicação destrava o resto.
              </p>
            )}

            {/* A confiança é dita em palavras, não em outro número: dois
                números na mesma linha viram um painel, e ninguém pediu painel. */}
            {!s.travadoSemPratica && s.confianca < 0.5 && (
              <p className="text-caption text-ink-4">
                Ainda com pouca evidência — mais aulas de origens diferentes deixam esta leitura
                mais firme.
              </p>
            )}
          </div>
        ))}
      </Surface>
    </section>
  )
}
