'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

/**
 * As duas ações da aula.
 *
 * Nenhuma delas confere de quem é o progresso: a RLS já garante que ninguém
 * escreve no lugar de outro (testado, 13/13). Repetir a checagem aqui criaria
 * um segundo lugar para a regra divergir.
 */

/**
 * Marcar a aplicação — a unidade de valor da Allen (D-07).
 *
 * Marcar a aplicação também conclui a aula. Quem fez a coisa não precisa
 * declarar duas vezes que assistiu ao vídeo sobre ela.
 */
export async function alternarAplicacao(formData: FormData) {
  const lessonId = String(formData.get('lesson_id') ?? '')
  const aplicada = String(formData.get('aplicada') ?? '') === 'true'
  const caminho = String(formData.get('caminho') ?? '/')
  if (!lessonId) return

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  if (aplicada) {
    await supabase
      .from('applications')
      .delete()
      .eq('user_id', user.id)
      .eq('lesson_id', lessonId)
  } else {
    await supabase.from('applications').insert({ user_id: user.id, lesson_id: lessonId })
    await concluir(lessonId, user.id)
  }

  revalidatePath(caminho)
  revalidatePath('/')
  revalidatePath('/jornada')
}

/** Concluir a aula sem aplicação — para as poucas que não têm Para Fazer. */
export async function concluirAula(formData: FormData) {
  const lessonId = String(formData.get('lesson_id') ?? '')
  const concluida = String(formData.get('concluida') ?? '') === 'true'
  const caminho = String(formData.get('caminho') ?? '/')
  if (!lessonId) return

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  if (concluida) {
    await supabase
      .from('lesson_progress')
      .update({ state: 'in_progress' })
      .eq('user_id', user.id)
      .eq('lesson_id', lessonId)
  } else {
    await concluir(lessonId, user.id)
  }

  revalidatePath(caminho)
  revalidatePath('/')
  revalidatePath('/jornada')
}

/**
 * Escreve o progresso. O resto acontece sozinho no banco: o trigger
 * `sync_enrollment` recalcula a matrícula e `emit_lesson_signals` grava os
 * sinais de skill (D-06, D-08). Esta função não sabe nada disso, e é bom
 * que não saiba.
 */
async function concluir(lessonId: string, userId: string) {
  const supabase = await createClient()
  await supabase.from('lesson_progress').upsert(
    { user_id: userId, lesson_id: lessonId, state: 'completed' },
    { onConflict: 'user_id,lesson_id' },
  )
}

/**
 * Registra que o aluno abriu a aula.
 *
 * É isto que alimenta o "Continue de onde parou": sem esta linha, a Home não
 * tem para onde apontar. Chamada uma vez na abertura, e só se ainda não havia
 * progresso — reabrir uma aula concluída não a devolve para "em andamento".
 */
export async function registrarAbertura(lessonId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  const { data: existente } = await supabase
    .from('lesson_progress')
    .select('state')
    .eq('user_id', user.id)
    .eq('lesson_id', lessonId)
    .maybeSingle()

  if (existente) return

  await supabase
    .from('lesson_progress')
    .insert({ user_id: user.id, lesson_id: lessonId, state: 'in_progress' })
}
