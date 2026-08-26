'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { caixaDoSuporte, enviarEmail } from '@/lib/email/enviar'
import { getSession } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'

export interface ChamadoState {
  error: string | null
  nonce: number
}

/**
 * ABRIR CHAMADO.
 *
 * O contexto vai junto sem a pessoa digitar: de onde ela clicou, qual aula,
 * qual curso. É a diferença entre "não está funcionando" — que obriga três
 * mensagens de ida e volta antes de alguém entender o problema — e um chamado
 * que já chega com a resposta a metade das perguntas.
 */
export async function abrirChamado(
  prev: ChamadoState,
  formData: FormData,
): Promise<ChamadoState> {
  const session = await getSession()
  if (!session) return { ...prev, error: 'Sua sessão expirou. Entre de novo.' }

  const assunto = String(formData.get('subject') ?? '').trim()
  const corpo = String(formData.get('body') ?? '').trim()
  const caminho = String(formData.get('context_path') ?? '').trim() || null
  const lessonId = String(formData.get('lesson_id') ?? '').trim() || null
  const courseId = String(formData.get('course_id') ?? '').trim() || null

  if (assunto.length < 3) return { ...prev, error: 'Resuma em poucas palavras o que houve.' }
  if (corpo.length < 10) return { ...prev, error: 'Conte um pouco mais — o que você tentou fazer?' }

  const supabase = await createClient()

  const { data: thread, error } = await supabase
    .from('support_threads')
    .insert({
      user_id: session.userId,
      subject: assunto,
      context_path: caminho,
      lesson_id: lessonId,
      course_id: courseId,
    })
    .select('id')
    .single()

  if (error || !thread) {
    return { ...prev, error: 'Não consegui abrir o chamado. Tente de novo em instantes.' }
  }

  const { error: erroMsg } = await supabase.from('support_messages').insert({
    thread_id: thread.id,
    author_id: session.userId,
    from_staff: false,
    body: corpo,
  })

  if (erroMsg) {
    return { ...prev, error: 'O chamado abriu, mas a mensagem não gravou. Tente reenviar.' }
  }

  // O aviso é o último passo, e o `void` é proposital: o chamado já está
  // gravado, e um Resend fora do ar não pode segurar a resposta da tela.
  void enviarEmail({
    para: caixaDoSuporte(),
    assunto: `[Allen] ${assunto}`,
    responderPara: session.email ?? undefined,
    texto: [
      `De: ${session.profile?.fullName ?? ''} <${session.email ?? '—'}>`,
      caminho ? `Estava em: ${caminho}` : null,
      '',
      corpo,
      '',
      '—',
      `Responder em ${process.env.NEXT_PUBLIC_SITE_URL}/admin/suporte/${thread.id}`,
    ]
      .filter(Boolean)
      .join('\n'),
  })

  revalidatePath('/suporte')
  redirect(`/suporte/${thread.id}`)
}

/** Responder no próprio chamado. Reabre sozinho, pelo trigger no banco. */
export async function responder(formData: FormData) {
  const session = await getSession()
  if (!session) return

  const threadId = String(formData.get('thread_id') ?? '')
  const corpo = String(formData.get('body') ?? '').trim()
  if (!threadId || corpo.length < 2) return

  const supabase = await createClient()
  await supabase.from('support_messages').insert({
    thread_id: threadId,
    author_id: session.userId,
    from_staff: false,
    body: corpo,
  })

  void enviarEmail({
    para: caixaDoSuporte(),
    assunto: `[Allen] resposta de ${session.email ?? 'aluno'}`,
    responderPara: session.email ?? undefined,
    texto: `${corpo}\n\n—\n${process.env.NEXT_PUBLIC_SITE_URL}/admin/suporte/${threadId}`,
  })

  revalidatePath(`/suporte/${threadId}`)
}

/**
 * Conta que a resposta foi aberta.
 *
 * O número não serve para relatório: serve para descobrir o que o produto
 * está explicando mal. Resposta muito lida é tela que precisa ser reescrita.
 */
export async function contarLeitura(slug: string) {
  const supabase = await createClient()
  await supabase.rpc('contar_leitura', { p_slug: slug })
}
