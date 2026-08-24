'use server'

import { revalidatePath } from 'next/cache'
import { isValidSlug, slugify } from '@/core/shared/slug'
import { createClient } from '@/lib/supabase/server'

export interface SkillFormState {
  error: string | null
  ok: boolean
  nonce: number
}

/**
 * HABILIDADES.
 *
 * Habilidade é dado, nunca código — mesma razão de tema (D-04). A lista cresce
 * conforme a Allen descobre o que realmente ensina, e ninguém precisa de deploy
 * para isso.
 *
 * A diferença para tema: habilidade é o eixo do HISTÓRICO, não da navegação. O
 * aluno nunca escolhe uma; ela é inferida do que ele fez.
 */
export async function criarHabilidade(
  prev: SkillFormState,
  formData: FormData,
): Promise<SkillFormState> {
  const name = String(formData.get('name') ?? '').trim()
  const description = String(formData.get('description') ?? '').trim()
  const slugRaw = String(formData.get('slug') ?? '').trim()

  if (name.length < 2) return { ...prev, error: 'A habilidade precisa de um nome.', ok: false }

  const slug = slugRaw ? slugify(slugRaw) : slugify(name)
  if (!isValidSlug(slug)) {
    return { ...prev, error: 'Não consegui gerar um identificador a partir desse nome.', ok: false }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('skills')
    .insert({ name, slug, description: description || null })

  if (error) {
    return {
      ...prev,
      error:
        error.code === '23505'
          ? `Já existe uma habilidade com o identificador ${slug}.`
          : 'Não consegui criar a habilidade. Verifique se você tem permissão para isso.',
      ok: false,
    }
  }

  revalidatePath('/admin/habilidades')
  return { error: null, ok: true, nonce: prev.nonce + 1 }
}

export async function renomearHabilidade(formData: FormData) {
  const id = String(formData.get('id') ?? '')
  const name = String(formData.get('name') ?? '').trim()
  const description = String(formData.get('description') ?? '').trim()
  if (!id || name.length < 2) return

  const supabase = await createClient()
  await supabase
    .from('skills')
    .update({ name, description: description || null })
    .eq('id', id)

  revalidatePath('/admin/habilidades')
}

/**
 * Apagar habilidade apaga histórico.
 *
 * `skill_signals` tem `on delete cascade` — sumir com a habilidade sumiria com
 * todos os sinais já gravados dela, e sinal apagado não volta. Por isso a ação
 * recusa quando existe qualquer aula mapeada ou qualquer sinal registrado, e a
 * tela diz exatamente o que está segurando.
 */
export async function apagarHabilidade(formData: FormData) {
  const id = String(formData.get('id') ?? '')
  if (!id) return

  const supabase = await createClient()

  const [{ count: aulas }, { count: sinais }] = await Promise.all([
    supabase.from('lesson_skills').select('skill_id', { count: 'exact', head: true }).eq('skill_id', id),
    supabase.from('skill_signals').select('id', { count: 'exact', head: true }).eq('skill_id', id),
  ])

  if ((aulas ?? 0) > 0 || (sinais ?? 0) > 0) return

  await supabase.from('skills').delete().eq('id', id)
  revalidatePath('/admin/habilidades')
}
