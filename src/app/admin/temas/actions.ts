'use server'

import { revalidatePath } from 'next/cache'
import { isValidSlug, slugify } from '@/core/shared/slug'
import { createClient } from '@/lib/supabase/server'

export interface ThemeFormState {
  error: string | null
  ok: boolean
  /**
   * Incrementa a cada criação bem-sucedida. O formulário usa este número como
   * `key` para se remontar limpo — em vez de zerar campos dentro de um efeito,
   * que o React 19 (com razão) trata como erro.
   */
  nonce: number
}

/**
 * Tema é dado, nunca código (D-04). Estas quatro ações são a razão pela qual a
 * plataforma continua funcionando com 5 ou com 50 temas.
 *
 * Nenhuma delas confere permissão: quem faz isso é a RLS. Se um aluno chamar
 * `criarTema`, o Postgres devolve erro e a ação relata — em vez de a gente
 * escrever a mesma checagem em dois lugares que podem divergir.
 */
export async function criarTema(prev: ThemeFormState, formData: FormData): Promise<ThemeFormState> {
  const name = String(formData.get('name') ?? '').trim()
  const description = String(formData.get('description') ?? '').trim()
  const slugRaw = String(formData.get('slug') ?? '').trim()

  if (name.length < 2) return { ...prev, error: 'O tema precisa de um nome.', ok: false }

  const slug = slugRaw ? slugify(slugRaw) : slugify(name)
  if (!isValidSlug(slug)) {
    return { ...prev, error: 'Não consegui gerar um endereço a partir desse nome.', ok: false }
  }

  const supabase = await createClient()

  // Novo tema entra no fim da ordem. Reordenar é escolha, não efeito colateral.
  const { data: last } = await supabase
    .from('themes')
    .select('position')
    .order('position', { ascending: false })
    .limit(1)
    .maybeSingle()

  const { error } = await supabase.from('themes').insert({
    name,
    slug,
    description: description || null,
    position: (last?.position ?? 0) + 1,
    status: 'draft',
  })

  if (error) {
    return {
      ...prev,
      error:
        error.code === '23505'
          ? `Já existe um tema em /tema/${slug}. Escolha outro endereço.`
          : 'Não consegui criar o tema. Verifique se você tem permissão para isso.',
      ok: false,
    }
  }

  revalidatePath('/admin/temas')
  return { error: null, ok: true, nonce: prev.nonce + 1 }
}

export async function renomearTema(formData: FormData) {
  const id = String(formData.get('id') ?? '')
  const name = String(formData.get('name') ?? '').trim()
  const description = String(formData.get('description') ?? '').trim()
  if (!id || name.length < 2) return

  const supabase = await createClient()
  await supabase
    .from('themes')
    .update({ name, description: description || null })
    .eq('id', id)
  revalidatePath('/admin/temas')
}

/**
 * Publicar / arquivar. Não existe "apagar tema" nesta tela: arquivar tira o
 * tema da vista do aluno sem destruir o vínculo com os cursos. Apagar de
 * verdade é decisão de admin e passa pelo banco.
 */
export async function alternarPublicacao(formData: FormData) {
  const id = String(formData.get('id') ?? '')
  const current = String(formData.get('status') ?? '')
  if (!id) return

  const supabase = await createClient()
  await supabase
    .from('themes')
    .update({ status: current === 'published' ? 'archived' : 'published' })
    .eq('id', id)
  revalidatePath('/admin/temas')
}

/** Troca a posição com o vizinho. Reordenar é o gesto mais usado desta tela. */
export async function moverTema(formData: FormData) {
  const id = String(formData.get('id') ?? '')
  const direction = String(formData.get('direction') ?? '')
  if (!id || (direction !== 'up' && direction !== 'down')) return

  const supabase = await createClient()
  const { data: themes } = await supabase.from('themes').select('id, position').order('position')
  if (!themes) return

  const index = themes.findIndex((t) => t.id === id)
  const current = themes[index]
  const target = themes[direction === 'up' ? index - 1 : index + 1]
  if (!current || !target) return

  await Promise.all([
    supabase.from('themes').update({ position: target.position }).eq('id', current.id),
    supabase.from('themes').update({ position: current.position }).eq('id', target.id),
  ])

  revalidatePath('/admin/temas')
}

/**
 * Escolhe o símbolo da constelação no Mapa.
 *
 * Guarda a CHAVE, não o desenho. Chave vazia limpa: constelação sem símbolo é
 * um estado legítimo, e é o padrão de todo tema novo.
 *
 * Não valida contra a lista de chaves de propósito — um ícone renomeado no
 * código degrada para "sem símbolo" em vez de derrubar a tela do aluno.
 */
export async function definirIcone(formData: FormData) {
  const id = String(formData.get('id') ?? '')
  const icon = String(formData.get('icon') ?? '').trim()
  if (!id) return

  const supabase = await createClient()
  await supabase
    .from('themes')
    .update({ icon: icon || null })
    .eq('id', id)

  revalidatePath('/admin/temas')
  revalidatePath('/mapa')
}
