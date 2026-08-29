import type { Metadata } from 'next'
import { Chip } from '@/components/primitives/chip'
import { Surface } from '@/components/surfaces/surface'
import { avaliarAcesso, porExtenso } from '@/core/identity/acesso'
import { createClient } from '@/lib/supabase/server'
import { apagarCondicao } from './actions'
import { NovaCondicao } from './nova-condicao'

export const metadata: Metadata = { title: 'Acessos' }

const ROTULO = {
  ativo: 'ativo',
  aguardando: 'aguardando início',
  encerrado: 'encerrado',
  suspenso: 'suspenso',
} as const

/**
 * AS CONDIÇÕES DE ACESSO.
 *
 * Quem tem o quê, até quando, e se já entrou. É a tela que responde "o ano da
 * turma fundadora vence quando?" sem ninguém abrir o banco.
 *
 * Separada de Pessoas de propósito: Pessoas é quem JÁ ESTÁ dentro. Aqui é a
 * combinação — que pode existir meses antes de a pessoa aparecer, e cuja
 * ausência é o motivo de um convite virar acesso perpétuo por engano.
 */
export default async function AcessosPage() {
  const supabase = await createClient()

  const [{ data: grants }, { data: perfis }] = await Promise.all([
    supabase
      .from('access_grants')
      .select('email, full_name, phone, plan, starts_at, ends_at, note')
      .order('ends_at', { nullsFirst: false }),
    supabase.from('profiles').select('email, last_sign_in_at'),
  ])

  const entrou = new Map((perfis ?? []).map((p) => [p.email, p.last_sign_in_at]))
  const lista = grants ?? []

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-10 px-6 py-10 lg:px-10">
      <header className="flex flex-col gap-2">
        <span className="text-caption uppercase tracking-[0.16em] text-ink-3">Pessoas</span>
        <h1 className="text-display font-light">Acessos</h1>
        <p className="max-w-[64ch] text-body text-ink-3">
          A condição combinada com cada pessoa, guardada pelo e-mail. Ela vale a partir do
          momento em que a pessoa entra pela primeira vez — então registre a condição{' '}
          <strong className="font-medium text-ink-2">antes</strong> de mandar o convite.
        </p>
      </header>

      <Surface className="p-6">
        <NovaCondicao />
      </Surface>

      <section className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="text-caption font-medium uppercase tracking-[0.16em] text-ink-3">
            Registradas
          </h2>
          <span data-numeric className="text-caption text-ink-4">
            {lista.length}
          </span>
        </div>

        <Surface className="flex flex-col divide-y divide-[var(--color-line)]">
          {lista.map((g) => {
            const acesso = avaliarAcesso({
              status: 'active',
              startedAt: g.starts_at,
              endsAt: g.ends_at,
            })
            const jaEntrou = entrou.has(g.email)

            return (
              <div key={g.email} className="flex flex-wrap items-center gap-3 px-4 py-3.5">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-body text-ink">{g.full_name ?? g.email}</span>
                    <Chip
                      tone={
                        acesso.estado === 'ativo'
                          ? 'positive'
                          : acesso.estado === 'encerrado'
                            ? 'caution'
                            : 'neutral'
                      }
                    >
                      {ROTULO[acesso.estado]}
                    </Chip>
                    {/* Quem ainda não entrou é o grupo que precisa de convite —
                        e a informação some numa tabela sem selo. */}
                    {!jaEntrou && <Chip tone="neutral">não entrou ainda</Chip>}
                  </div>
                  <p className="truncate text-caption text-ink-4">
                    {g.email}
                    {g.phone ? ` · ${g.phone}` : ''}
                  </p>
                </div>

                <div className="flex flex-col items-end text-caption text-ink-3">
                  <span data-numeric>
                    {porExtenso(acesso.inicio)}
                    {acesso.fim ? ` → ${porExtenso(acesso.fim)}` : ' → sem prazo'}
                  </span>
                  <span className="text-ink-4">
                    {g.plan}
                    {g.note ? ` · ${g.note}` : ''}
                  </span>
                </div>

                <form action={apagarCondicao}>
                  <input type="hidden" name="email" value={g.email} />
                  <button
                    type="submit"
                    title="Apagar a condição. Não tira acesso de quem já entrou."
                    className="rounded-[var(--radius-control)] border border-line px-2.5 py-1 text-caption text-ink-4 transition-colors duration-150 hover:border-line-strong hover:text-ink"
                  >
                    Apagar
                  </button>
                </form>
              </div>
            )
          })}

          {lista.length === 0 && (
            <p className="px-4 py-6 text-body text-ink-4">
              Nenhuma condição registrada. Quem for convidado sem uma entra com acesso ativo e
              sem prazo.
            </p>
          )}
        </Surface>
      </section>
    </div>
  )
}
