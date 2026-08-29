'use server'

import { revalidatePath } from 'next/cache'
import { apagarImagem, enviarImagem } from '@/lib/imagens'
import { createClient } from '@/lib/supabase/server'

function revalidar() {
  revalidatePath('/admin/banner')
  revalidatePath('/')
}

/**
 * As ações do banner da Home.
 *
 * Nenhuma confere permissão: quem faz isso é a RLS (`equipe gere banners`,
 * 0020). Escrever a mesma checagem aqui criaria dois lugares que podem
 * divergir — e o que diverge sempre é o que ninguém lembra que existe.
 */
export async function criarBanner(formData: FormData) {
  const title = String(formData.get('title') ?? '').trim()

  const supabase = await createClient()
  const { data: ultimo } = await supabase
    .from('home_banners')
    .select('position')
    .order('position', { ascending: false })
    .limit(1)
    .maybeSingle()

  await supabase.from('home_banners').insert({
    title: title || null,
    position: (ultimo?.position ?? 0) + 1,
    status: 'draft',
  })

  revalidar()
}

export async function salvarBanner(formData: FormData) {
  const id = String(formData.get('id') ?? '')
  if (!id) return

  const texto = (campo: string) => String(formData.get(campo) ?? '').trim() || null

  const supabase = await createClient()
  await supabase
    .from('home_banners')
    .update({
      eyebrow: texto('eyebrow'),
      title: texto('title'),
      subtitle: texto('subtitle'),
      cta_label: texto('cta_label'),
      cta_href: texto('cta_href'),
    })
    .eq('id', id)

  revalidar()
}

/** Sobe a arte. A antiga sai só depois que a nova entrou. */
export async function enviarArte(formData: FormData) {
  const id = String(formData.get('id') ?? '')
  const arquivo = formData.get('arquivo')
  if (!id || !(arquivo instanceof File)) return

  const { url } = await enviarImagem(arquivo, 'banners', id)
  if (!url) return

  const supabase = await createClient()
  const { data: antes } = await supabase
    .from('home_banners')
    .select('image_url')
    .eq('id', id)
    .maybeSingle()

  await supabase.from('home_banners').update({ image_url: url }).eq('id', id)
  await apagarImagem(antes?.image_url)

  revalidar()
}

/**
 * Publicar / arquivar.
 *
 * Publicar um arquiva os outros: a Home mostra UM banner, e dois publicados
 * fariam o segundo sumir sem explicação — quem publicou juraria que não
 * funcionou.
 */
export async function alternarPublicacao(formData: FormData) {
  const id = String(formData.get('id') ?? '')
  const atual = String(formData.get('status') ?? '')
  if (!id) return

  const supabase = await createClient()

  if (atual === 'published') {
    await supabase.from('home_banners').update({ status: 'draft' }).eq('id', id)
  } else {
    await supabase.from('home_banners').update({ status: 'archived' }).eq('status', 'published')
    await supabase.from('home_banners').update({ status: 'published' }).eq('id', id)
  }

  revalidar()
}

export async function apagarBanner(formData: FormData) {
  const id = String(formData.get('id') ?? '')
  if (!id) return

  const supabase = await createClient()
  const { data: antes } = await supabase
    .from('home_banners')
    .select('image_url')
    .eq('id', id)
    .maybeSingle()

  await supabase.from('home_banners').delete().eq('id', id)
  await apagarImagem(antes?.image_url)

  revalidar()
}
