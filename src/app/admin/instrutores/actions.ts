'use server'

import { revalidatePath } from 'next/cache'
import { isValidSlug, slugify } from '@/core/shared/slug'
import { createClient } from '@/lib/supabase/server'

export interface InstructorFormState {
  error: string | null
  ok: boolean
  /** Mesmo truque de `criarTema`: o formulário se remonta pela `key`. */
  nonce: number
}

/**
 * INSTRUTORES.
 *
 * O briefing é explícito: "você aprende com quem já aplica isso todos os dias
 * com clientes reais". Quem ensina é parte da promessa, não um crédito no
 * rodapé — por isso instrutor é uma entidade, com bio e foto, e não um texto
 * solto dentro do curso.
 *
 * Nenhuma ação aqui confere permissão. Quem nega é a RLS: `is_staff()` para
 * criar e editar, `is_admin()` para apagar (0006). Repetir a regra aqui criaria
 * um segundo lugar para ela divergir.
 */
export async function criarInstrutor(
  prev: InstructorFormState,
  formData: FormData,
): Promise<InstructorFormState> {
  const name = String(formData.get('name') ?? '').trim()
  const headline = String(formData.get('headline') ?? '').trim()
  const slugRaw = String(formData.get('slug') ?? '').trim()

  if (name.length < 2) return { ...prev, error: 'O instrutor precisa de um nome.', ok: false }

  const slug = slugRaw ? slugify(slugRaw) : slugify(name)
  if (!isValidSlug(slug)) {
    return { ...prev, error: 'Não consegui gerar um endereço a partir desse nome.', ok: false }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('instructors')
    .insert({ name, slug, headline: headline || null })

  if (error) {
    return {
      ...prev,
      error:
        error.code === '23505'
          ? `Já existe um instrutor com o endereço ${slug}. Escolha outro.`
          : 'Não consegui criar o instrutor. Verifique se você tem permissão para isso.',
      ok: false,
    }
  }

  revalidatePath('/admin/instrutores')
  return { error: null, ok: true, nonce: prev.nonce + 1 }
}

/**
 * Salva o instrutor inteiro de uma vez.
 *
 * A bio é o campo que mais importa e o que mais é reescrito — quem edita quer
 * ver os quatro campos juntos, não um acordeão por campo.
 */
export async function salvarInstrutor(formData: FormData) {
  const id = String(formData.get('id') ?? '')
  const name = String(formData.get('name') ?? '').trim()
  const headline = String(formData.get('headline') ?? '').trim()
  const bio = String(formData.get('bio') ?? '').trim()
  const photoUrl = String(formData.get('photo_url') ?? '').trim()
  if (!id || name.length < 2) return

  const supabase = await createClient()
  await supabase
    .from('instructors')
    .update({
      name,
      headline: headline || null,
      bio: bio || null,
      photo_url: photoUrl || null,
    })
    .eq('id', id)

  revalidatePath('/admin/instrutores')
  revalidatePath('/explorar')
}

/**
 * Apagar só quando ninguém depende.
 *
 * O banco já resolve o caso ruim — `on delete set null` em `courses` — mas um
 * curso que perde o instrutor sem aviso é uma página que muda sozinha. Então a
 * tela conta quantos cursos estão ligados e a ação recusa se houver algum. Quem
 * quiser mesmo apagar, desliga os cursos primeiro. É uma decisão, não um
 * acidente.
 */
export async function apagarInstrutor(formData: FormData) {
  const id = String(formData.get('id') ?? '')
  if (!id) return

  const supabase = await createClient()
  const { count } = await supabase
    .from('courses')
    .select('id', { count: 'exact', head: true })
    .eq('instructor_id', id)

  if ((count ?? 0) > 0) return

  await supabase.from('instructors').delete().eq('id', id)
  revalidatePath('/admin/instrutores')
}
