'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

/**
 * Salvamento automático dos dois campos longos.
 *
 * Perder vinte minutos de Para Saber escrito porque a pessoa esqueceu de clicar
 * em Salvar é o tipo de coisa que faz uma equipe abandonar a ferramenta. Então:
 * texto longo salva sozinho ao sair do campo; título, duração e publicação
 * salvam de forma explícita, porque mudam estrutura e a pessoa precisa
 * confirmar o que está fazendo.
 */
const CAMPOS_LONGOS = ['para_saber', 'para_fazer', 'description'] as const
type CampoLongo = (typeof CAMPOS_LONGOS)[number]

export async function salvarTexto(lessonId: string, field: string, value: string) {
  // Whitelist: o nome do campo vem do cliente e nunca entra numa query sem
  // passar por aqui.
  if (!CAMPOS_LONGOS.includes(field as CampoLongo)) {
    return { ok: false, error: 'Campo inválido.' }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('lessons')
    .update({ [field]: value.trim() || null })
    .eq('id', lessonId)

  if (error) return { ok: false, error: 'Não consegui salvar.' }
  return { ok: true, error: null }
}

export async function atualizarAula(formData: FormData) {
  const id = String(formData.get('id') ?? '')
  const courseId = String(formData.get('course_id') ?? '')
  const title = String(formData.get('title') ?? '').trim()
  if (!id || title.length < 2) return

  const minutes = Number(formData.get('duration_minutes') ?? 0)
  const durationSeconds = Number.isFinite(minutes) && minutes > 0 ? Math.round(minutes * 60) : 0

  const supabase = await createClient()
  await supabase.from('lessons').update({ title, duration_seconds: durationSeconds }).eq('id', id)

  revalidatePath(`/admin/cursos/${courseId}/aula/${id}`)
  revalidatePath(`/admin/cursos/${courseId}`)
}

export async function publicarAula(formData: FormData) {
  const id = String(formData.get('id') ?? '')
  const courseId = String(formData.get('course_id') ?? '')
  const current = String(formData.get('status') ?? '')
  if (!id) return

  const supabase = await createClient()
  await supabase
    .from('lessons')
    .update({ status: current === 'published' ? 'draft' : 'published' })
    .eq('id', id)

  revalidatePath(`/admin/cursos/${courseId}/aula/${id}`)
  revalidatePath(`/admin/cursos/${courseId}`)
  revalidatePath('/admin')
}

export async function apagarAula(formData: FormData) {
  const id = String(formData.get('id') ?? '')
  const courseId = String(formData.get('course_id') ?? '')
  if (!id) return

  const supabase = await createClient()
  await supabase.from('lessons').delete().eq('id', id)

  revalidatePath(`/admin/cursos/${courseId}`)
  redirect(`/admin/cursos/${courseId}`)
}
