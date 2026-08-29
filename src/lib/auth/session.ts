import 'server-only'
import { cache } from 'react'
import { redirect } from 'next/navigation'
import { avaliarAcesso, type Acesso } from '@/core/identity/acesso'
import type { Profile, Role } from '@/core/identity/roles'
import { roleFromClaim } from '@/core/identity/roles'
import { createClient } from '@/lib/supabase/server'

export interface Session {
  userId: string
  email: string | null
  role: Role
  profile: Profile | null
  /**
   * O estado do acesso — ativo, aguardando o início, encerrado, suspenso.
   *
   * Vem junto com a sessão porque três telas precisam dele (a casca do aluno,
   * a Conta e o Suporte) e buscá-lo três vezes seria três idas ao banco por
   * navegação. Nulo só se não houver assinatura nenhuma, o que hoje não
   * acontece: o gatilho de cadastro sempre cria uma.
   */
  acesso: Acesso | null
}

/**
 * Sessão do usuário para Server Components.
 *
 * `cache()` garante uma única ida ao Supabase por requisição, mesmo que dez
 * componentes perguntem quem está logado.
 *
 * O papel vem do JWT (D-09), não de um SELECT — a mesma claim que a RLS lê.
 * Se o hook de token não estiver ligado no painel, todo mundo cai em 'student',
 * que é o menor privilégio possível. Falha fechada, não aberta.
 */
export const getSession = cache(async (): Promise<Session | null> => {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const [{ data }, { data: assinatura }] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, full_name, avatar_url, role, onboarded_at, created_at')
      .eq('id', user.id)
      .maybeSingle(),
    supabase
      .from('subscriptions')
      .select('status, started_at, ends_at')
      .eq('user_id', user.id)
      .maybeSingle(),
  ])

  /**
   * O papel vem do JWT quando o hook está ligado; de `profiles` quando não.
   *
   * O banco já resolvia isso desde 0008 — `auth_role()` cai para `profiles`
   * se a claim não existir. O app não caía, e a diferença era invisível até o
   * pior momento possível: o admin entra, a RLS o reconhece, o Postgres
   * libera tudo, e a interface o manda para a área do aluno porque a claim
   * não estava lá. Painel vazio, sem erro, sem pista.
   *
   * Ler `profiles` aqui não afrouxa nada: é exatamente a mesma fonte que a
   * RLS consulta no fallback. A interface passa a dizer a mesma coisa que o
   * banco — e continua fechando em 'student' se as duas faltarem.
   */
  const claim = user.app_metadata?.['allen_role']
  const role = claim ? roleFromClaim(claim) : roleFromClaim(data?.role)

  return {
    userId: user.id,
    email: user.email ?? null,
    role,
    acesso: assinatura
      ? avaliarAcesso({
          status: assinatura.status,
          startedAt: assinatura.started_at,
          endsAt: assinatura.ends_at,
        })
      : null,
    profile: data
      ? {
          id: data.id,
          fullName: data.full_name,
          avatarUrl: data.avatar_url,
          role: roleFromClaim(data.role),
          onboardedAt: data.onboarded_at,
          createdAt: data.created_at,
        }
      : null,
  }
})

/** Para páginas que não fazem sentido sem alguém logado. */
export async function requireSession(): Promise<Session> {
  const session = await getSession()
  if (!session) redirect('/entrar')
  return session
}
