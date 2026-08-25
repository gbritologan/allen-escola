import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Button } from '@/components/primitives/button'
import { Chip } from '@/components/primitives/chip'
import { Textarea } from '@/components/primitives/field'
import { Surface } from '@/components/surfaces/surface'
import { formatSince } from '@/core/shared/format'
import { createClient } from '@/lib/supabase/server'
import { alternarResolvido, responderChamado } from '../actions'

export const metadata: Metadata = { title: 'Chamado' }

const ROTULO: Record<string, string> = {
  open: 'esperando você',
  waiting: 'esperando o aluno',
  resolved: 'resolvido',
}

/**
 * UM CHAMADO.
 *
 * O cabeçalho mostra quem é a pessoa e onde ela estava antes de tudo — é o que
 * evita a primeira mensagem ser "em qual aula foi?".
 *
 * "Responder e resolver" é um botão separado de "Responder", e não uma caixa
 * de seleção: são duas intenções diferentes, e marcar sem querer uma caixa que
 * encerra a conversa é o erro que faz o aluno ficar sem resposta.
 */
export default async function ChamadoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: thread } = await supabase
    .from('support_threads')
    .select('id, subject, status, user_id, context_path, lesson_id, course_id, created_at')
    .eq('id', id)
    .maybeSingle()

  if (!thread) notFound()

  const [{ data: mensagens }, { data: pessoa }, { data: aula }] = await Promise.all([
    supabase
      .from('support_messages')
      .select('id, body, from_staff, created_at')
      .eq('thread_id', id)
      .order('created_at'),
    supabase
      .from('profiles')
      .select('full_name, email, role, last_sign_in_at')
      .eq('id', thread.user_id)
      .maybeSingle(),
    thread.lesson_id
      ? supabase.from('lessons').select('title').eq('id', thread.lesson_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ])

  // Contexto que evita perguntas óbvias: a pessoa tem acesso? já entrou algum dia?
  const { data: assinatura } = await supabase
    .from('subscriptions')
    .select('status, plan')
    .eq('user_id', thread.user_id)
    .maybeSingle()

  const agora = new Date()
  const resolvido = thread.status === 'resolved'

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8 px-6 py-10 lg:px-10">
      <header className="flex flex-col gap-4">
        <Link href="/admin/suporte" className="text-caption text-ink-3 hover:text-ink">
          ← Suporte
        </Link>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex flex-col gap-2">
            <h1 className="text-title font-light">{thread.subject}</h1>
            <div className="flex flex-wrap items-center gap-1.5">
              <Chip tone={resolvido ? 'positive' : thread.status === 'open' ? 'caution' : 'accent'}>
                {ROTULO[thread.status] ?? thread.status}
              </Chip>
              <Chip tone={assinatura?.status === 'active' ? 'neutral' : 'caution'}>
                {assinatura?.status === 'active' ? `plano ${assinatura.plan}` : 'sem acesso'}
              </Chip>
              {!pessoa?.last_sign_in_at && <Chip tone="caution">nunca entrou</Chip>}
            </div>
          </div>

          <form action={alternarResolvido}>
            <input type="hidden" name="thread_id" value={thread.id} />
            <input type="hidden" name="resolvido" value={String(resolvido)} />
            <Button type="submit" variant="secondary" size="sm">
              {resolvido ? 'Reabrir' : 'Marcar resolvido'}
            </Button>
          </form>
        </div>

        {/* O contexto que veio junto. Sem isto, a primeira resposta é sempre
            uma pergunta. */}
        <Surface className="flex flex-col gap-1 p-4">
          <span className="text-label text-ink-2">
            {pessoa?.full_name || 'Sem nome'}{' '}
            <span className="text-ink-4">&lt;{pessoa?.email}&gt;</span>
          </span>
          {aula?.title && (
            <span className="text-caption text-ink-3">Estava na aula “{aula.title}”</span>
          )}
          {thread.context_path && (
            <span data-numeric className="text-caption text-ink-4">
              {thread.context_path}
            </span>
          )}
          <span data-numeric className="text-caption text-ink-4">
            abriu {formatSince(thread.created_at, agora)}
            {pessoa?.last_sign_in_at &&
              ` · último acesso ${formatSince(pessoa.last_sign_in_at, agora)}`}
          </span>
        </Surface>
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
              {m.from_staff ? 'Allen' : (pessoa?.full_name ?? 'Aluno')} ·{' '}
              <span data-numeric>{formatSince(m.created_at, agora)}</span>
            </span>
            <p className="text-body whitespace-pre-line text-ink-2">{m.body}</p>
          </div>
        ))}
      </section>

      <form action={responderChamado} className="flex flex-col gap-3 border-t border-line pt-6">
        <input type="hidden" name="thread_id" value={thread.id} />
        <Textarea
          name="body"
          rows={5}
          placeholder="Escreva a resposta. Ela vai para a conversa e para o e-mail da pessoa."
          aria-label="Sua resposta"
          required
        />
        <div className="flex flex-wrap items-center gap-2">
          <Button type="submit" variant="secondary">
            Responder
          </Button>
          <Button type="submit" name="resolver" value="true">
            Responder e resolver
          </Button>
        </div>
      </form>
    </div>
  )
}
