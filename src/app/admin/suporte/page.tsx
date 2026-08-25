import type { Metadata } from 'next'
import Link from 'next/link'
import { Chip } from '@/components/primitives/chip'
import { Surface } from '@/components/surfaces/surface'
import { formatSince } from '@/core/shared/format'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = { title: 'Suporte' }

/**
 * CAIXA DE ENTRADA DO SUPORTE.
 *
 * Ordenada por QUEM ESPERA HÁ MAIS TEMPO, não pelo mais recente. É a única
 * ordenação honesta numa fila de atendimento: o mais novo no topo faz o
 * chamado difícil afundar até virar cliente perdido.
 *
 * A seção do fim é o que justifica ter construído isto em vez de alugar um
 * widget: chamados agrupados por AULA. Três pessoas perguntando na mesma aula
 * não é volume de suporte — é uma aula mal escrita, e aqui isso fica visível.
 */
interface Chamado {
  id: string
  subject: string
  status: string
  user_id: string
  lesson_id: string | null
  last_message_at: string
  created_at: string
}

/**
 * Uma fila. Fora do render de propósito: componente declarado dentro de outro
 * é recriado a cada renderização, e o React trata isso como componente novo.
 */
function Fila({
  titulo,
  itens,
  vazio,
  quem,
  nomeAula,
  agora,
}: {
  titulo: string
  itens: Chamado[]
  vazio: string
  quem: Map<string, string>
  nomeAula: Map<string, string>
  agora: Date
}) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="text-title font-light">{titulo}</h2>
        <span data-numeric className="text-caption text-ink-4">
          {itens.length}
        </span>
      </div>
      {itens.length === 0 ? (
        <p className="text-caption text-ink-4">{vazio}</p>
      ) : (
        <Surface className="flex flex-col divide-y divide-[var(--color-line)]">
          {itens.map((t) => (
            <Link
              key={t.id}
              href={`/admin/suporte/${t.id}`}
              className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3.5 transition-colors hover:bg-[rgba(243,245,252,0.03)]"
            >
              <span className="min-w-0 flex-1 truncate text-body text-ink">{t.subject}</span>
              <span className="text-caption text-ink-3">{quem.get(t.user_id)}</span>
              {t.lesson_id && <Chip>{nomeAula.get(t.lesson_id) ?? 'aula'}</Chip>}
              <span data-numeric className="text-caption text-ink-4">
                {formatSince(t.last_message_at, agora)}
              </span>
            </Link>
          ))}
        </Surface>
      )}
    </section>
  )
}

export default async function SuportePage() {
  const supabase = await createClient()

  const [{ data: threads }, { data: artigos }] = await Promise.all([
    supabase
      .from('support_threads')
      .select('id, subject, status, user_id, lesson_id, last_message_at, created_at')
      .order('last_message_at', { ascending: true })
      .limit(200),
    supabase
      .from('help_articles')
      .select('question, views, status')
      .eq('status', 'published')
      .order('views', { ascending: false })
      .limit(5),
  ])

  const lista = threads ?? []
  const abertos = lista.filter((t) => t.status === 'open')
  const esperando = lista.filter((t) => t.status === 'waiting')
  const resolvidos = lista.filter((t) => t.status === 'resolved')

  const userIds = [...new Set(lista.map((t) => t.user_id))]
  const lessonIds = [...new Set(lista.map((t) => t.lesson_id).filter(Boolean))] as string[]

  const [{ data: pessoas }, { data: aulas }] = await Promise.all([
    userIds.length
      ? supabase.from('profiles').select('id, full_name, email').in('id', userIds)
      : Promise.resolve({ data: [] as Array<{ id: string; full_name: string | null; email: string | null }> }),
    lessonIds.length
      ? supabase.from('lessons').select('id, title').in('id', lessonIds)
      : Promise.resolve({ data: [] as Array<{ id: string; title: string }> }),
  ])

  const quem = new Map((pessoas ?? []).map((p) => [p.id, p.full_name || p.email || '—']))
  const nomeAula = new Map((aulas ?? []).map((l) => [l.id, l.title]))

  // Quantos chamados por aula. Só interessa quando passa de um.
  const porAula = new Map<string, number>()
  for (const t of lista) {
    if (!t.lesson_id) continue
    porAula.set(t.lesson_id, (porAula.get(t.lesson_id) ?? 0) + 1)
  }
  const aulasQueConfundem = [...porAula.entries()]
    .filter(([, n]) => n > 1)
    .sort((a, b) => b[1] - a[1])

  const agora = new Date()

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-10 px-6 py-10 lg:px-10">
      <header className="flex flex-col gap-2">
        <h1 className="text-display font-light">Suporte</h1>
        <p className="max-w-[62ch] text-body text-ink-3">
          Em ordem de quem espera há mais tempo. O mais recente no topo faria o chamado difícil
          afundar até virar cliente perdido.
        </p>
      </header>

      <Fila
        titulo="Esperando você"
        itens={abertos}
        vazio="Nenhum chamado aberto. A fila está limpa."
        quem={quem}
        nomeAula={nomeAula}
        agora={agora}
      />

      {esperando.length > 0 && (
        <Fila
          titulo="Esperando o aluno"
          itens={esperando}
          vazio=""
          quem={quem}
          nomeAula={nomeAula}
          agora={agora}
        />
      )}

      {/* ------------------------------------------------------------------ */}
      {aulasQueConfundem.length > 0 && (
        <section className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <h2 className="text-title font-light">Aulas que geram dúvida</h2>
            <p className="text-caption text-ink-4">
              Mais de um chamado na mesma aula. Isso raramente é problema de suporte — costuma ser
              um Para Saber que não explica, ou um Para Fazer ambíguo.
            </p>
          </div>
          <Surface className="flex flex-col divide-y divide-[var(--color-line)]">
            {aulasQueConfundem.map(([lessonId, n]) => (
              <div key={lessonId} className="flex items-center justify-between gap-4 px-5 py-3">
                <span className="min-w-0 flex-1 truncate text-body text-ink-2">
                  {nomeAula.get(lessonId) ?? lessonId}
                </span>
                <Chip tone="caution">
                  {n} {n === 1 ? 'dúvida' : 'dúvidas'}
                </Chip>
              </div>
            ))}
          </Surface>
        </section>
      )}

      {/* ------------------------------------------------------------------ */}
      {(artigos ?? []).length > 0 && (
        <section className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <h2 className="text-title font-light">Respostas mais procuradas</h2>
            <p className="text-caption text-ink-4">
              O que a plataforma está explicando mal sozinha.
            </p>
          </div>
          <Surface className="flex flex-col divide-y divide-[var(--color-line)]">
            {(artigos ?? []).map((a) => (
              <div key={a.question} className="flex items-center justify-between gap-4 px-5 py-3">
                <span className="min-w-0 flex-1 truncate text-body text-ink-2">{a.question}</span>
                <span data-numeric className="text-caption text-ink-4">
                  {a.views}
                </span>
              </div>
            ))}
          </Surface>
        </section>
      )}

      {resolvidos.length > 0 && (
        <p className="text-caption text-ink-4">
          {resolvidos.length} {resolvidos.length === 1 ? 'chamado resolvido' : 'chamados resolvidos'}.
        </p>
      )}
    </div>
  )
}
