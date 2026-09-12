'use server'

import { revalidatePath } from 'next/cache'
import { isValidSlug, slugify } from '@/core/shared/slug'
import { apagarImagem, enviarImagem } from '@/lib/imagens'
import { createClient } from '@/lib/supabase/server'

/** Os dois lugares que mudam quando um app muda. */
function revalidar() {
  revalidatePath('/admin/apps')
  revalidatePath('/apps')
}

export interface AppFormState {
  error: string | null
  ok: boolean
  /** Vira `key` do formulário: cada app criado remonta os campos limpos. */
  nonce: number
}

/**
 * App é dado, nunca código — mesma regra dos temas (D-04).
 *
 * Nenhuma ação confere permissão: quem faz isso é a RLS. Se um aluno chamar
 * `criarApp`, o Postgres recusa e a ação relata, em vez de existir a mesma
 * checagem em dois lugares que podem divergir.
 */
export async function criarApp(prev: AppFormState, formData: FormData): Promise<AppFormState> {
  const name = String(formData.get('name') ?? '').trim()
  const tagline = String(formData.get('tagline') ?? '').trim()
  const slugRaw = String(formData.get('slug') ?? '').trim()

  if (name.length < 2) return { ...prev, error: 'O app precisa de um nome.', ok: false }

  const slug = slugRaw ? slugify(slugRaw) : slugify(name)
  if (!isValidSlug(slug)) {
    return { ...prev, error: 'Não consegui gerar um endereço a partir desse nome.', ok: false }
  }

  const supabase = await createClient()

  const { data: last } = await supabase
    .from('apps')
    .select('position')
    .order('position', { ascending: false })
    .limit(1)
    .maybeSingle()

  const { error } = await supabase.from('apps').insert({
    name,
    slug,
    tagline: tagline || null,
    position: (last?.position ?? 0) + 1,
    status: 'draft',
  })

  if (error) {
    return {
      ...prev,
      error:
        error.code === '23505'
          ? `Já existe um app em /apps/${slug}. Escolha outro endereço.`
          : 'Não consegui criar o app. Verifique se você tem permissão para isso.',
      ok: false,
    }
  }

  revalidatePath('/admin/apps')
  return { error: null, ok: true, nonce: prev.nonce + 1 }
}

/** Salva o conteúdo inteiro de um app. */
export async function salvarApp(formData: FormData) {
  const id = String(formData.get('id') ?? '')
  const name = String(formData.get('name') ?? '').trim()
  if (!id || name.length < 2) return

  const texto = (campo: string) => String(formData.get(campo) ?? '').trim() || null

  const supabase = await createClient()
  await supabase
    .from('apps')
    .update({
      name,
      tagline: texto('tagline'),
      description: texto('description'),
      como_usar: texto('como_usar'),
      access_url: texto('access_url'),
      video_asset_id: texto('video_asset_id'),
    })
    .eq('id', id)

  revalidatePath('/admin/apps')
  revalidatePath('/apps')
}

/**
 * Publicar / arquivar. Não existe "apagar app" aqui: arquivar tira da vista do
 * aluno sem destruir o endereço, e endereço que já circulou não deve virar 404
 * por um clique.
 */
export async function alternarPublicacao(formData: FormData) {
  const id = String(formData.get('id') ?? '')
  const current = String(formData.get('status') ?? '')
  if (!id) return

  const supabase = await createClient()
  await supabase
    .from('apps')
    .update({ status: current === 'published' ? 'archived' : 'published' })
    .eq('id', id)

  revalidatePath('/admin/apps')
  revalidatePath('/apps')
}

/** Troca a posição com o vizinho — a ordem da lista é editorial. */
export async function moverApp(formData: FormData) {
  const id = String(formData.get('id') ?? '')
  const direction = String(formData.get('direction') ?? '')
  if (!id || (direction !== 'up' && direction !== 'down')) return

  const supabase = await createClient()
  const { data: apps } = await supabase.from('apps').select('id, position').order('position')
  if (!apps) return

  const index = apps.findIndex((a) => a.id === id)
  const current = apps[index]
  const target = apps[direction === 'up' ? index - 1 : index + 1]
  if (!current || !target) return

  await Promise.all([
    supabase.from('apps').update({ position: target.position }).eq('id', current.id),
    supabase.from('apps').update({ position: current.position }).eq('id', target.id),
  ])

  revalidatePath('/admin/apps')
  revalidatePath('/apps')
}

/**
 * A logo do app.
 *
 * Mesmo mecanismo da capa de curso (0019), pasta própria. A antiga sai só
 * depois que a nova entrou — o contrário deixaria o app sem marca nenhuma se
 * o envio falhasse no meio.
 */
export async function enviarLogo(formData: FormData) {
  const id = String(formData.get('id') ?? '')
  const slug = String(formData.get('slug') ?? 'app')
  const arquivo = formData.get('arquivo')
  if (!id || !(arquivo instanceof File)) return

  const { url } = await enviarImagem(arquivo, 'logos', slug)
  if (!url) return

  const supabase = await createClient()
  const { data: antes } = await supabase.from('apps').select('logo_url').eq('id', id).maybeSingle()

  await supabase.from('apps').update({ logo_url: url }).eq('id', id)
  await apagarImagem(antes?.logo_url)

  revalidar()
}

export async function removerLogo(formData: FormData) {
  const id = String(formData.get('id') ?? '')
  if (!id) return

  const supabase = await createClient()
  const { data: antes } = await supabase.from('apps').select('logo_url').eq('id', id).maybeSingle()

  await supabase.from('apps').update({ logo_url: null }).eq('id', id)
  await apagarImagem(antes?.logo_url)

  revalidar()
}
