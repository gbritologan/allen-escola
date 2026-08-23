'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { isValidSlug, slugify } from '@/core/shared/slug'
import { createClient } from '@/lib/supabase/server'

export interface CourseFormState {
  error: string | null
  nonce: number
}

/**
 * Criar curso leva o mínimo: título e formato. Todo o resto — capa, instrutor,
 * temas, descrição — é preenchido no Content Studio, com o curso já existindo.
 *
 * Pedir dez campos antes de deixar a pessoa começar é o jeito mais rápido de
 * fazer ninguém começar.
 */
export async function criarCurso(
  prev: CourseFormState,
  formData: FormData,
): Promise<CourseFormState> {
  const title = String(formData.get('title') ?? '').trim()
  const format = String(formData.get('format') ?? 'course')

  if (title.length < 2) return { ...prev, error: 'O curso precisa de um título.' }
  if (format !== 'course' && format !== 'masterclass') {
    return { ...prev, error: 'Formato inválido.' }
  }

  const slug = slugify(title)
  if (!isValidSlug(slug)) {
    return { ...prev, error: 'Não consegui gerar um endereço a partir desse título.' }
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('courses')
    .insert({ title, slug, format, status: 'draft' })
    .select('id')
    .single()

  if (error) {
    return {
      ...prev,
      error:
        error.code === '23505'
          ? `Já existe um curso em /curso/${slug}.`
          : 'Não consegui criar o curso. Verifique se você tem permissão para isso.',
    }
  }

  revalidatePath('/admin/cursos')
  // Criar e cair direto no Studio: ninguém cria um curso para olhar a lista.
  redirect(`/admin/cursos/${data.id}`)
}
