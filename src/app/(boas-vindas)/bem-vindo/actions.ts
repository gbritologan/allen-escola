'use server'

import { redirect } from 'next/navigation'
import { requireSession } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'

/**
 * Fecha as boas-vindas e leva a pessoa para onde ela escolheu começar.
 *
 * `onboarded_at` existia no schema desde 0002 e NINGUÉM escrevia nela — ficou
 * semanas prometendo um comportamento que não existia. É ela que decide se
 * esta tela aparece, e escrever aqui é o que impede a pessoa de ver as
 * boas-vindas de novo no segundo login.
 *
 * As respostas sobre a empresa vão junto: perguntar aqui é natural (é uma
 * apresentação), e perguntar depois, na Conta, é formulário.
 */
export async function concluirBoasVindas(formData: FormData) {
  const session = await requireSession()

  const empresario = String(formData.get('is_business') ?? '')
  const site = String(formData.get('company_url') ?? '').trim()
  const destino = String(formData.get('destino') ?? '/')

  const url = site && !/^https?:\/\//i.test(site) ? `https://${site}` : site

  const supabase = await createClient()
  await supabase
    .from('profiles')
    .update({
      onboarded_at: new Date().toISOString(),
      is_business: empresario === 'sim' ? true : empresario === 'nao' ? false : null,
      company_url: empresario === 'sim' ? url || null : null,
    })
    .eq('id', session.userId)

  // Só caminho interno. `?destino=` apontando para fora viraria
  // redirecionamento aberto — a mesma regra de D-39.
  redirect(destino.startsWith('/') && !destino.startsWith('//') ? destino : '/')
}
