import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * Cliente para Server Components, Server Actions e Route Handlers.
 * Respeita RLS — é o caminho normal de tudo.
 */
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options)
            }
          } catch {
            // Server Component não pode escrever cookie. O proxy já renovou a
            // sessão nesta requisição, então ignorar aqui é seguro.
          }
        },
      },
    },
  )
}

/**
 * Cliente SEM sessão — nenhum cookie lido, nenhum cookie escrito.
 *
 * Existe por causa de um caso só: o convite de aluno. Convidar dispara
 * `signInWithOtp({ shouldCreateUser: true })`, que é uma operação de
 * autenticação de OUTRA pessoa. Feita pelo cliente normal, ela compartilha o
 * armazenamento de cookies com a sessão de quem está convidando — e mexer no
 * cookie de sessão do admin enquanto se cria a conta de um terceiro é o tipo
 * de acoplamento que um dia desloga a pessoa errada.
 *
 * Aqui não há de onde vazar: o cliente nasce anônimo e morre anônimo.
 *
 * ATENÇÃO: este cliente não carrega identidade, então a RLS o vê como `anon`.
 * Quem chamá-lo precisa ter conferido a permissão ANTES, em código.
 */
export function createAnonClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => [],
        setAll: () => {},
      },
    },
  )
}
