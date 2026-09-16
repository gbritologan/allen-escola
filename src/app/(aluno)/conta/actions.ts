'use server'

import { revalidatePath } from 'next/cache'
import { requireSession } from '@/lib/auth/session'
import { type EstadoImagem, IMAGEM_PARADA } from '@/core/shared/imagem'
import { apagarImagem, recusaDaUrl } from '@/lib/imagens'
import { createClient } from '@/lib/supabase/server'

/**
 * As ações do perfil.
 *
 * O que a pessoa pode mudar sobre si: nome, foto, se é empresária e o site da
 * empresa. O que ela NÃO pode: papel, janela de acesso e o selo de pioneiro —
 * esses são fatos, não preferências, e a RLS os protege independente do que
 * esta tela envie.
 */

export async function salvarPerfil(formData: FormData) {
  const session = await requireSession()

  const nome = String(formData.get('full_name') ?? '').trim()
  const empresario = String(formData.get('is_business') ?? '')
  const site = String(formData.get('company_url') ?? '').trim()

  /*
   * O site ganha `https://` quando a pessoa digita só o domínio.
   *
   * "allenescola.com" num href vira link relativo e leva para uma página que
   * não existe dentro do próprio app. É o erro mais comum de campo de URL, e
   * consertar aqui custa três linhas.
   */
  const url = site && !/^https?:\/\//i.test(site) ? `https://${site}` : site

  const supabase = await createClient()
  await supabase
    .from('profiles')
    .update({
      full_name: nome || null,
      // Vazio = não respondeu, que é diferente de ter respondido "não".
      is_business: empresario === 'sim' ? true : empresario === 'nao' ? false : null,
      company_url: empresario === 'sim' ? url || null : null,
    })
    .eq('id', session.userId)

  revalidatePath('/conta')
}

/**
 * A foto.
 *
 * Vai para `avatares/`, a única pasta do bucket em que aluno pode escrever
 * (0023). O nome carrega o id de quem enviou: mantém a pasta navegável e
 * impede que um envio sobrescreva o de outra pessoa.
 */
export async function enviarFoto(
  _prev: EstadoImagem,
  formData: FormData,
): Promise<EstadoImagem> {
  const session = await requireSession()
  const url = String(formData.get('url') ?? '')

  /*
   * Aqui a conferência pesa mais que nas outras: esta ação é a única do grupo
   * que QUALQUER aluno pode chamar. Sem ela, a foto de perfil aceitaria
   * qualquer endereço da internet — e a RLS do bucket, que só guarda a pasta
   * `avatares`, não teria como opinar sobre um link que nunca passou por ela.
   */
  const recusa = recusaDaUrl(url, 'avatares')
  if (recusa) return { erro: recusa, url: null }

  const supabase = await createClient()
  const { data: antes } = await supabase
    .from('profiles')
    .select('avatar_url')
    .eq('id', session.userId)
    .maybeSingle()

  await supabase.from('profiles').update({ avatar_url: url }).eq('id', session.userId)
  await apagarImagem(antes?.avatar_url)

  revalidatePath('/conta')
  return { erro: null, url }
}

export async function removerFoto(): Promise<EstadoImagem> {
  const session = await requireSession()
  const supabase = await createClient()

  const { data: antes } = await supabase
    .from('profiles')
    .select('avatar_url')
    .eq('id', session.userId)
    .maybeSingle()

  await supabase.from('profiles').update({ avatar_url: null }).eq('id', session.userId)
  await apagarImagem(antes?.avatar_url)

  revalidatePath('/conta')
  return IMAGEM_PARADA
}
