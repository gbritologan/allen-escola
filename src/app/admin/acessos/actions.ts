'use server'

import { revalidatePath } from 'next/cache'
import { can } from '@/core/identity/permissions'
import { getSession } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export interface CondicaoState {
  error: string | null
  ok: string | null
  nonce: number
}

/**
 * Registrar a condição de acesso de alguém que ainda não entrou.
 *
 * A ordem certa é esta: primeiro a condição, depois o convite. Convidar antes
 * cria a conta com o padrão (ativo, sem prazo) e o prazo combinado se perde —
 * o gatilho só consulta a condição UMA vez, no nascimento da conta.
 *
 * Se a pessoa já entrou, a condição é aplicada na assinatura existente aqui
 * mesmo, senão salvar não faria nada visível e pareceria um bug.
 */
export async function salvarCondicao(
  prev: CondicaoState,
  formData: FormData,
): Promise<CondicaoState> {
  const session = await getSession()
  if (!session || !can(session.role, 'people.manage')) {
    return { ...prev, error: 'Só um admin mexe em condição de acesso.', ok: null }
  }

  const email = String(formData.get('email') ?? '')
    .trim()
    .toLowerCase()
  const fullName = String(formData.get('full_name') ?? '').trim()
  const phone = String(formData.get('phone') ?? '').trim()
  const plan = String(formData.get('plan') ?? 'fundador').trim() || 'fundador'
  const note = String(formData.get('note') ?? '').trim()
  const startsAt = String(formData.get('starts_at') ?? '').trim()
  const endsAt = String(formData.get('ends_at') ?? '').trim()

  if (!EMAIL.test(email)) {
    return { ...prev, error: 'Esse e-mail não parece completo. Confere?', ok: null }
  }
  if (!startsAt) {
    return { ...prev, error: 'Falta a data de início.', ok: null }
  }

  // O input date entrega "2026-09-01" sem fuso. Sem o -03 o Postgres lê como
  // UTC e o acesso abre às 21h do dia anterior no Brasil.
  const inicio = `${startsAt} 00:00:00-03`
  const fim = endsAt ? `${endsAt} 00:00:00-03` : null

  if (fim && new Date(fim) <= new Date(inicio)) {
    return { ...prev, error: 'O fim precisa vir depois do início.', ok: null }
  }

  const supabase = await createClient()

  const { error } = await supabase.from('access_grants').upsert(
    {
      email,
      full_name: fullName || null,
      phone: phone || null,
      plan,
      starts_at: inicio,
      ends_at: fim,
      note: note || null,
    },
    { onConflict: 'email' },
  )

  if (error) {
    return { ...prev, error: 'Não consegui salvar. Verifique se você é admin.', ok: null }
  }

  // Já entrou? Então a condição vale agora, não no próximo cadastro.
  const { data: perfil } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', email)
    .maybeSingle()

  if (perfil) {
    await supabase
      .from('subscriptions')
      .update({ plan, started_at: inicio, ends_at: fim, status: 'active' })
      .eq('user_id', perfil.id)
  }

  revalidatePath('/admin/acessos')
  revalidatePath('/admin/pessoas')

  return {
    error: null,
    ok: perfil
      ? `Condição salva e já aplicada — ${email} já tem conta.`
      : `Condição salva. Ela vale quando ${email} entrar pela primeira vez.`,
    nonce: prev.nonce + 1,
  }
}

/**
 * Apagar a condição.
 *
 * Não mexe em quem já entrou: a assinatura dessa pessoa continua como está.
 * Apagar aqui só desfaz a combinação que ainda não foi usada — tirar acesso de
 * quem já tem é outro gesto, e ele mora em Pessoas.
 */
export async function apagarCondicao(formData: FormData) {
  const session = await getSession()
  if (!session || !can(session.role, 'people.manage')) return

  const email = String(formData.get('email') ?? '')
  if (!email) return

  const supabase = await createClient()
  await supabase.from('access_grants').delete().eq('email', email)

  revalidatePath('/admin/acessos')
}
