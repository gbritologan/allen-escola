import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Button } from '@/components/primitives/button'
import { Chip } from '@/components/primitives/chip'
import { Textarea } from '@/components/primitives/field'
import { formatSince } from '@/core/shared/format'
import { requireSession } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import { responder } from '../actions'

export const metadata: Metadata = { title: 'Sua conversa' }

const ROTULO: Record<string, string> = {
  open: 'aguardando a Allen',
  waiting: 'aguardando você',
  resolved: 'resolvido',
}

/**
 * A CONVERSA.
 *
 * Uma lista de mensagens e um campo de resposta. Sem número de protocolo, sem
 * "prezado cliente", sem pesquisa de satisfação — parece uma conversa porque é
 * uma conversa.
 *
 * Um chamado resolvido continua aceitando resposta. Fechar a porta na cara de
 * quem voltou para dizer "não funcionou" é o defeito mais comum de sistema de
 * chamado, e o banco já reabre sozinho quando o aluno escreve.
 */
export default async function ConversaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await requireSession()
  const supabase = await createClient()

  const { data: thread } = await supabase
    .from('support_threads')
    .select('id, subject, status, context_path, created_at, lesson_id')
    .eq('id', id)
    .maybeSingle()

  // A RLS já esconde chamado de outra pessoa — chegar aqui sem thread significa
  // que ela não existe ou não é sua, e as duas coisas são um 404.
  if (!thread) notFound()

  const [{ data: mensagens }, { data: aula }] = await Promise.all([
    supabase
      .from('support_messages')
      .select('id, body, from_staff, created_at')
      .eq('thread_id', id)
      .order('created_at'),
    thread.lesson_id
      ? supabase.from('lessons').select('title, slug, course_id').eq('id', thread.lesson_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ])

  const agora = new Date()

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-8 px-6 pt-10 sm:pt-14">
      <header className="flex flex-col gap-3">
        <Link href="/suporte" className="text-caption text-ink-3 transition-colors hover:text-ink">
          ← Suporte
        </Link>
        <h1 className="text-title font-light">{thread.subject}</h1>
        <div className="flex flex-wrap items-center gap-2">
          <Chip
            tone={
              thread.status === 'resolved'
                ? 'positive'
                : thread.status === 'waiting'
                  ? 'accent'
                  : 'caution'
            }
          >
            {ROTULO[thread.status] ?? thread.status}
          </Chip>
          <span data-numeric className="text-caption text-ink-4">
            aberto {formatSince(thread.created_at, agora)}
          </span>
        </div>

        {aula?.title && (
          <p className="text-caption text-ink-4">
            Sobre a aula <span className="text-ink-3">{aula.title}</span>
          </p>
        )}
      </header>

      <section className="flex flex-col gap-3">
        {(mensagens ?? []).map((m) => (
          <div
            key={m.id}
            className={
              m.from_staff
                ? 'flex flex-col gap-1.5 rounded-[var(--radius-card)] border-l-2 border-l-blue-light bg-[rgba(0,13,255,0.06)] p-4'
                : 'flex flex-col gap-1.5 rounded-[var(--radius-card)] border border-line p-4'
            }
          >
            <span className="text-caption font-medium text-ink-4">
              {m.from_staff ? 'Allen' : 'Você'} ·{' '}
              <span data-numeric>{formatSince(m.created_at, agora)}</span>
            </span>
            <p className="text-body whitespace-pre-line text-ink-2">{m.body}</p>
          </div>
        ))}
      </section>

      <form action={responder} className="flex flex-col gap-3 border-t border-line pt-6 pb-4">
        <input type="hidden" name="thread_id" value={thread.id} />
        <Textarea
          name="body"
          rows={4}
          placeholder="Escreva sua resposta…"
          aria-label="Sua resposta"
          required
        />
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" variant="secondary" className="self-start">
            Responder
          </Button>
          {thread.status === 'resolved' && (
            <span className="text-caption text-ink-4">
              Este chamado está resolvido — responder reabre.
            </span>
          )}
        </div>
      </form>

      {/* `session` é usada pela RLS acima; esta linha existe só para o
          leitor entender de quem é a conversa. */}
      <span className="sr-only">Conversa de {session.email}</span>
    </main>
  )
}
