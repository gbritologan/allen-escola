import 'server-only'
import { cache } from 'react'
import { redirect } from 'next/navigation'
import type { Profile, Role } from '@/core/identity/roles'
import { roleFromClaim } from '@/core/identity/roles'
import { createClient } from '@/lib/supabase/server'

export interface Session {
  userId: string
  email: string | null
  role: Role
  profile: Profile | null
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

  const { data } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url, role, onboarded_at, created_at')
    .eq('id', user.id)
    .maybeSingle()

  return {
    userId: user.id,
    email: user.email ?? null,
    role: roleFromClaim(user.app_metadata?.['allen_role']),
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
