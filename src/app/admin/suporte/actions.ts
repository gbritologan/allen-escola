'use server'

import { revalidatePath } from 'next/cache'
import { enviarEmail } from '@/lib/email/enviar'
import { getSession } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'

/**
 * RESPONDER.
 *
 * A resposta vai para a conversa E para o e-mail da pessoa. As duas, sempre:
 * quem abriu um chamado às onze da noite não volta ao site todo dia para
 * conferir se alguém respondeu — mas abre o e-mail.
 *
 * `from_staff` é conferido pela própria RLS contra o papel de quem escreve
 * (0014). Não há como marcar uma mensagem como "resposta da Allen" sem ser.
 */
export async function responderChamado(formData: FormData) {
  const session = await getSession()
  if (!session) return

  const threadId = String(formData.get('thread_id') ?? '')
  const corpo = String(formData.get('body') ?? '').trim()
  const resolver = String(formData.get('resolver') ?? '') === 'true'
  if (!threadId || corpo.length < 2) return

  const supabase = await createClient()

  const { error } = await supabase.from('support_messages').insert({
    thread_id: threadId,
    author_id: session.userId,
    from_staff: true,
    body: corpo,
  })
  if (error) return

  // O trigger acabou de marcar como 'waiting'. Resolver é decisão explícita de
  // quem respondeu, e vem depois — na ordem inversa a resposta reabriria.
  if (resolver) {
    await supabase
      .from('support_threads')
      .update({ status: 'resolved', resolved_at: new Date().toISOString() })
      .eq('id', threadId)
  }

  const { data: thread } = await supabase
    .from('support_threads')
    .select('subject, user_id')
    .eq('id', threadId)
    .maybeSingle()

  if (thread) {
    const { data: pessoa } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', thread.user_id)
      .maybeSingle()

    if (pessoa?.email) {
      void enviarEmail({
        para: pessoa.email,
        assunto: `Re: ${thread.subject}`,
        texto: [
          corpo,
          '',
          '—',
          'Responda por aqui ou continue a conversa em',
          `${process.env.NEXT_PUBLIC_SITE_URL}/ajuda/${threadId}`,
        ].join('\n'),
      })
    }
  }

  revalidatePath('/admin/suporte')
  revalidatePath(`/admin/suporte/${threadId}`)
}

/** Marcar como resolvido sem escrever nada — para o que se resolveu sozinho. */
export async function alternarResolvido(formData: FormData) {
  const session = await getSession()
  if (!session) return

  const threadId = String(formData.get('thread_id') ?? '')
  const resolvido = String(formData.get('resolvido') ?? '') === 'true'
  if (!threadId) return

  const supabase = await createClient()
  await supabase
    .from('support_threads')
    .update(
      resolvido
        ? { status: 'open', resolved_at: null }
        : { status: 'resolved', resolved_at: new Date().toISOString() },
    )
    .eq('id', threadId)

  revalidatePath('/admin/suporte')
  revalidatePath(`/admin/suporte/${threadId}`)
}
