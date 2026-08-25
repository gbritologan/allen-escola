'use server'

import { revalidatePath } from 'next/cache'
import { can } from '@/core/identity/permissions'
import { ASSIGNABLE_ROLES, type Role } from '@/core/identity/roles'
import { getSession } from '@/lib/auth/session'
import { createAnonClient, createClient } from '@/lib/supabase/server'

export interface ConviteState {
  error: string | null
  ok: string | null
  nonce: number
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

/**
 * CONVIDAR ALUNO — a porta de entrada da escola.
 *
 * Fechar o cadastro aberto (854d193) tirou a porta aberta e não colocou porta
 * nenhuma no lugar: só entrava quem já existisse em `auth.users`, e ninguém
 * tinha como passar a existir. Esta ação é a porta.
 *
 * ─── A EXCEÇÃO À REGRA DA CASA ───────────────────────────────────────────
 *
 * Em todo o resto do produto, quem nega é o Postgres (D-11) e o código não
 * repete a checagem. Aqui é o contrário, e de propósito:
 *
 * `signInWithOtp({ shouldCreateUser: true })` é uma chamada ao GoTrue, não ao
 * Postgres. Nenhuma política de RLS é consultada, porque nenhuma tabela é
 * lida. Se esta função não conferir o papel de quem chama, ela vira
 * exatamente o buraco que 854d193 fechou — com a diferença de estar escondida
 * dentro do Admin.
 *
 * Por isso a verificação está logo na primeira linha, antes de qualquer outra
 * coisa, e é `people.manage` (só admin), não `canOpenAdmin` (que inclui
 * conteudista). Quem edita conteúdo não decide quem entra na escola.
 */
export async function convidarPessoa(
  prev: ConviteState,
  formData: FormData,
): Promise<ConviteState> {
  const session = await getSession()
  if (!session || !can(session.role, 'people.manage')) {
    return { ...prev, error: 'Só um admin pode convidar alguém.', ok: null }
  }

  const email = String(formData.get('email') ?? '')
    .trim()
    .toLowerCase()
  const nome = String(formData.get('full_name') ?? '').trim()

  if (!EMAIL.test(email)) {
    return { ...prev, error: 'Esse e-mail não parece completo. Confere?', ok: null }
  }

  const supabase = createAnonClient()
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
      // Vira `raw_user_meta_data`, e `handle_new_user` o transforma no nome do
      // perfil. Sem isto a lista de pessoas nasce como uma coluna de e-mails.
      data: nome ? { full_name: nome } : undefined,
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
    },
  })

  if (error) {
    return {
      ...prev,
      error:
        error.status === 429
          ? 'Muitos convites seguidos. Espere um minuto e tente de novo.'
          : 'Não consegui enviar o convite. Confira o e-mail e tente de novo.',
      ok: null,
    }
  }

  revalidatePath('/admin/pessoas')
  return {
    error: null,
    ok: `Convite enviado para ${email}. O código vale 1 hora.`,
    nonce: prev.nonce + 1,
  }
}

/**
 * Reenviar o convite.
 *
 * Mesma chamada, sem `shouldCreateUser` — a pessoa já existe. Serve para o
 * caso mais comum de todos: o código expirou antes de ela abrir o e-mail.
 */
export async function reenviarConvite(formData: FormData) {
  const session = await getSession()
  if (!session || !can(session.role, 'people.manage')) return

  const email = String(formData.get('email') ?? '')
    .trim()
    .toLowerCase()
  if (!EMAIL.test(email)) return

  const supabase = createAnonClient()
  await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: false,
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
    },
  })

  revalidatePath('/admin/pessoas')
}

/**
 * Ligar e desligar o acesso.
 *
 * Não apaga ninguém: suspender zera o acesso ao catálogo e preserva progresso,
 * aplicações e histórico de habilidades. Quem voltar, volta de onde parou.
 *
 * Aqui a RLS É o portão (`admin gere assinaturas`, 0006). A checagem abaixo
 * só evita uma ida ao banco fadada a falhar.
 */
export async function alternarAcesso(formData: FormData) {
  const session = await getSession()
  if (!session || !can(session.role, 'people.manage')) return

  const userId = String(formData.get('user_id') ?? '')
  const ativo = String(formData.get('ativo') ?? '') === 'true'
  if (!userId) return

  const supabase = await createClient()
  await supabase
    .from('subscriptions')
    .update({ status: ativo ? 'canceled' : 'active' })
    .eq('user_id', userId)

  revalidatePath('/admin/pessoas')
}

/**
 * Trocar o papel.
 *
 * Duas travas que o banco sozinho não daria:
 *
 * 1. Ninguém rebaixa a si mesmo. Um admin sozinho que se tornasse aluno
 *    trancaria a escola inteira por fora, e a única saída seria o SQL.
 * 2. `org_manager` não é atribuível (está em `ASSIGNABLE_ROLES`, e não está).
 *    Ele existe no enum reservando espaço para o B2B; entregar hoje um papel
 *    cujas telas não existem é prometer o que não há.
 */
export async function trocarPapel(formData: FormData) {
  const session = await getSession()
  if (!session || !can(session.role, 'people.manage')) return

  const userId = String(formData.get('user_id') ?? '')
  const papel = String(formData.get('role') ?? '') as Role
  if (!userId) return
  if (!ASSIGNABLE_ROLES.includes(papel as (typeof ASSIGNABLE_ROLES)[number])) return
  if (userId === session.userId) return

  const supabase = await createClient()
  await supabase.from('profiles').update({ role: papel }).eq('id', userId)

  revalidatePath('/admin/pessoas')
}
