import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { Chip } from '@/components/primitives/chip'
import { Surface } from '@/components/surfaces/surface'
import { can } from '@/core/identity/permissions'
import { ASSIGNABLE_ROLES, ROLE_LABEL, roleFromClaim } from '@/core/identity/roles'
import { formatSince } from '@/core/shared/format'
import { getSession } from '@/lib/auth/session'
import { avaliarAcesso, porExtenso } from '@/core/identity/acesso'
import { createClient } from '@/lib/supabase/server'
import { alternarAcesso, reenviarConvite, trocarPapel } from './actions'
import { Convidar } from './convidar'

export const metadata: Metadata = { title: 'Pessoas' }

/**
 * PESSOAS.
 *
 * A tela que faltava para a escola ter alunos.
 *
 * Três informações por pessoa, e nenhuma decorativa:
 *
 * · **entrou ou não** — separa quem está usando de quem recebeu um convite e
 *   nunca abriu. São dois problemas diferentes e a ação é diferente.
 * · **acesso** — ligado ou desligado. É o que a assinatura controla hoje, e é
 *   onde a cobrança vai se plugar quando existir.
 * · **papel** — quem administra, quem publica, quem estuda.
 *
 * Não existe "apagar pessoa" aqui. Apagar destruiria progresso, aplicações e
 * sinais de habilidade em cascata, e isso não volta. Desligar o acesso resolve
 * o caso real (parou de pagar, saiu da empresa) e preserva o histórico de quem
 * um dia voltar.
 */
export default async function PessoasPage() {
  const session = await getSession()
  if (!session) redirect('/entrar?destino=/admin/pessoas')

  // Conteudista administra conteúdo, não pessoas. O menu já esconde este item;
  // esta linha é o que impede chegar aqui digitando o endereço.
  if (!can(session.role, 'people.manage')) redirect('/admin')

  const supabase = await createClient()
  const [{ data: perfis }, { data: assinaturas }, { data: aplicacoes }] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, full_name, email, role, last_sign_in_at, created_at')
      .order('created_at', { ascending: false }),
    supabase.from('subscriptions').select('user_id, status, plan, started_at, ends_at'),
    supabase.from('applications').select('user_id'),
  ])

  const lista = perfis ?? []
  const acessoPorPessoa = new Map((assinaturas ?? []).map((s) => [s.user_id, s.status]))

  /*
   * A JANELA DE ACESSO DE CADA UM.
   *
   * "com acesso / sem acesso" respondia se a chave está girada. Não respondia
   * a pergunta que aparece quando existe gente com prazo: ATÉ QUANDO. Com a
   * turma fundadora, essa é a pergunta comercial da tela.
   */
  const janelaPorPessoa = new Map(
    (assinaturas ?? []).map((s) => [
      s.user_id,
      {
        plano: s.plan as string,
        acesso: avaliarAcesso({
          status: s.status as string,
          startedAt: s.started_at as string,
          endsAt: (s.ends_at as string | null) ?? null,
        }),
      },
    ]),
  )

  const aplicacoesPorPessoa = new Map<string, number>()
  for (const a of aplicacoes ?? []) {
    aplicacoesPorPessoa.set(a.user_id, (aplicacoesPorPessoa.get(a.user_id) ?? 0) + 1)
  }

  const agora = new Date()
  const nuncaEntraram = lista.filter((p) => !p.last_sign_in_at).length
  const ativos = lista.filter((p) => acessoPorPessoa.get(p.id) === 'active').length

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-10 px-6 py-10 lg:px-10">
      <header className="flex flex-col gap-2">
        <h1 className="text-display font-light">Pessoas</h1>
        <p className="max-w-[64ch] text-body text-ink-3">
          A entrada da escola é por convite. Ninguém se cadastra sozinho — o que também significa
          que ninguém entra sem você.
        </p>
      </header>

      <section className="flex flex-col gap-4">
        <h2 className="text-title font-light">Convidar</h2>
        <Surface className="p-5">
          <Convidar />
        </Surface>
      </section>

      {/* ------------------------------------------------------------------ */}
      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-baseline justify-between gap-4">
          <h2 className="text-title font-light">
            {lista.length} {lista.length === 1 ? 'pessoa' : 'pessoas'}
          </h2>
          <span data-numeric className="text-caption text-ink-4">
            {ativos} com acesso
            {nuncaEntraram > 0 && ` · ${nuncaEntraram} nunca entrou`}
          </span>
        </div>

        <div className="flex flex-col gap-3">
          {lista.map((pessoa) => {
            const papel = roleFromClaim(pessoa.role)
            const ativo = acessoPorPessoa.get(pessoa.id) === 'active'
            const janela = janelaPorPessoa.get(pessoa.id)
            const entrou = Boolean(pessoa.last_sign_in_at)
            const feitas = aplicacoesPorPessoa.get(pessoa.id) ?? 0
            const euMesmo = pessoa.id === session.userId

            return (
              <Surface key={pessoa.id} className="flex flex-col gap-4 p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex min-w-0 flex-col gap-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-lead font-light text-ink">
                        {pessoa.full_name || pessoa.email || 'Sem nome'}
                      </span>
                      {euMesmo && <Chip>você</Chip>}
                    </div>
                    <span className="truncate text-caption text-ink-4">{pessoa.email}</span>

                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <Chip tone={papel === 'student' ? 'neutral' : 'accent'}>
                        {ROLE_LABEL[papel]}
                      </Chip>
                      <Chip tone={ativo ? 'positive' : 'caution'}>
                        {ativo ? 'com acesso' : 'sem acesso'}
                      </Chip>
                      {janela?.acesso.estado === 'aguardando' && (
                        <Chip tone="neutral">começa {porExtenso(janela.acesso.inicio)}</Chip>
                      )}
                      {janela?.acesso.estado === 'encerrado' && <Chip tone="caution">vencido</Chip>}
                      {!entrou && <Chip tone="caution">nunca entrou</Chip>}
                      {feitas > 0 && (
                        <Chip tone="accent">
                          {feitas} {feitas === 1 ? 'aplicação' : 'aplicações'}
                        </Chip>
                      )}
                    </div>
                  </div>

                  <span className="flex shrink-0 flex-col items-end text-caption text-ink-4">
                    <span data-numeric>
                      {entrou
                        ? `último acesso ${formatSince(pessoa.last_sign_in_at, agora)}`
                        : `convidada ${formatSince(pessoa.created_at, agora)}`}
                    </span>
                    {janela && (
                      <span data-numeric title={`Plano ${janela.plano}`}>
                        {janela.acesso.fim
                          ? `vence ${porExtenso(janela.acesso.fim)}`
                          : 'sem prazo'}
                      </span>
                    )}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2 border-t border-line pt-4">
                  {/* Reenviar só aparece para quem nunca entrou. Para quem já
                      usa, mandar um código do nada só assusta. */}
                  {!entrou && pessoa.email && (
                    <form action={reenviarConvite}>
                      <input type="hidden" name="email" value={pessoa.email} />
                      <button
                        type="submit"
                        className="rounded-[var(--radius-control)] border border-line px-3 py-1.5 text-caption text-ink-3 transition-colors hover:border-line-strong hover:text-ink"
                      >
                        Reenviar convite
                      </button>
                    </form>
                  )}

                  {/* Desligar a si mesmo trancaria a escola por fora. */}
                  {!euMesmo && (
                    <form action={alternarAcesso}>
                      <input type="hidden" name="user_id" value={pessoa.id} />
                      <input type="hidden" name="ativo" value={String(ativo)} />
                      <button
                        type="submit"
                        className="rounded-[var(--radius-control)] border border-line px-3 py-1.5 text-caption text-ink-3 transition-colors hover:border-line-strong hover:text-ink"
                      >
                        {ativo ? 'Desligar acesso' : 'Religar acesso'}
                      </button>
                    </form>
                  )}

                  {!euMesmo && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-caption text-ink-4">Papel</span>
                      {ASSIGNABLE_ROLES.map((r) => (
                        <form key={r} action={trocarPapel}>
                          <input type="hidden" name="user_id" value={pessoa.id} />
                          <input type="hidden" name="role" value={r} />
                          <button
                            type="submit"
                            aria-pressed={papel === r}
                            className={`rounded-[var(--radius-control)] border px-2.5 py-1 text-caption transition-colors duration-150 ${
                              papel === r
                                ? 'border-line-strong bg-navy-soft text-ink'
                                : 'border-line text-ink-4 hover:text-ink-2'
                            }`}
                          >
                            {ROLE_LABEL[r]}
                          </button>
                        </form>
                      ))}
                    </div>
                  )}
                </div>
              </Surface>
            )
          })}
        </div>
      </section>
    </div>
  )
}
