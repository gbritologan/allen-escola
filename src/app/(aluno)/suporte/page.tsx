import type { Metadata } from 'next'
import Link from 'next/link'
import { Chip } from '@/components/primitives/chip'
import { Surface } from '@/components/surfaces/surface'
import { formatSince } from '@/core/shared/format'
import { requireSession } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import { NovoChamado } from './novo-chamado'

export const metadata: Metadata = { title: 'Suporte' }

const ROTULO_STATUS: Record<string, string> = {
  open: 'aguardando a Allen',
  waiting: 'aguardando você',
  resolved: 'resolvido',
}

/**
 * SUPORTE.
 *
 * Chamava-se "Ajuda", e o nome prometia menos do que a página entrega: aqui
 * tem artigo pronto E chamado com histórico e resposta da equipe. Suporte é o
 * que isso é.
 *
 * A ordem da página é a tese do suporte: primeiro a resposta pronta, depois o
 * humano. Não porque falar com gente seja caro, mas porque esperar é ruim —
 * quem está travado às onze da noite quer a resposta às onze da noite.
 *
 * As respostas abrem e fecham na própria página, sem navegar: quem procura
 * "o vídeo não abre" costuma ler duas ou três antes de achar a certa, e cada
 * ida e volta é uma chance de desistir.
 *
 * O formulário fica no fim, sempre visível, sem exigir clique para aparecer.
 * "Fale conosco" atrás de um botão é o padrão de quem não quer ser procurado.
 */
export default async function SuportePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; de?: string; aula?: string; curso?: string }>
}) {
  const { q, de, aula, curso } = await searchParams
  const termo = (q ?? '').trim()
  const session = await requireSession()
  const supabase = await createClient()

  // Mesma normalização do índice: sem isto, "assinatura" não acha "assinatura"
  // digitado sem acento, e vice-versa.
  const consulta = termo
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()

  const buscaArtigos = supabase
    .from('help_articles')
    .select('id, slug, question, answer, category')
    .eq('status', 'published')

  const [{ data: artigos }, { data: chamados }, { data: aulaCtx }] = await Promise.all([
    termo.length >= 2
      ? buscaArtigos.textSearch('search_doc', consulta, { type: 'websearch', config: 'portuguese' })
      : buscaArtigos.order('position'),
    supabase
      .from('support_threads')
      .select('id, subject, status, last_message_at')
      .eq('user_id', session.userId)
      .order('last_message_at', { ascending: false })
      .limit(5),
    aula
      ? supabase.from('lessons').select('title').eq('id', aula).maybeSingle()
      : Promise.resolve({ data: null }),
  ])

  const lista = artigos ?? []
  const porCategoria = new Map<string, typeof lista>()
  for (const a of lista) {
    const cat = a.category ?? 'Geral'
    porCategoria.set(cat, [...(porCategoria.get(cat) ?? []), a])
  }

  const agora = new Date()
  const contexto = aulaCtx?.title ? `a aula “${aulaCtx.title}”` : de ? `a página ${de}` : null

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-10 px-6 pt-10 sm:pt-14">
      <header className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <h1 className="text-display font-light">Suporte</h1>
          <p className="max-w-[56ch] text-lead font-light text-ink-2">
            Procure sua dúvida abaixo. Se não estiver aqui, fale com a gente no fim da página.
          </p>
        </div>

        <form action="/suporte" method="get" className="flex gap-2">
          {de && <input type="hidden" name="de" value={de} />}
          {aula && <input type="hidden" name="aula" value={aula} />}
          {curso && <input type="hidden" name="curso" value={curso} />}
          <input
            name="q"
            defaultValue={termo}
            placeholder="cancelar, vídeo, cartão, código…"
            aria-label="Procure sua dúvida"
            className="h-12 flex-1 rounded-[var(--radius-control)] border border-line bg-navy px-4 text-body text-ink placeholder:text-ink-4 outline-none transition-colors focus:border-[rgba(76,65,255,0.7)]"
          />
          <button
            type="submit"
            className="rounded-[var(--radius-control)] bg-blue px-5 text-label font-strong text-off-white transition-colors hover:bg-blue-light"
          >
            Procurar
          </button>
        </form>
      </header>

      {/* --- Chamados em aberto -------------------------------------------- */}
      {(chamados ?? []).length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-caption font-medium uppercase tracking-[0.16em] text-ink-3">
            Suas conversas
          </h2>
          <Surface className="flex flex-col divide-y divide-[var(--color-line)]">
            {(chamados ?? []).map((c) => (
              <Link
                key={c.id}
                href={`/suporte/${c.id}`}
                className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 transition-colors hover:bg-[rgba(243,245,252,0.03)]"
              >
                <span className="min-w-0 flex-1 truncate text-body text-ink-2">{c.subject}</span>
                <div className="flex items-center gap-3">
                  <Chip
                    tone={
                      c.status === 'resolved'
                        ? 'positive'
                        : c.status === 'waiting'
                          ? 'accent'
                          : 'caution'
                    }
                  >
                    {ROTULO_STATUS[c.status] ?? c.status}
                  </Chip>
                  <span data-numeric className="text-caption text-ink-4">
                    {formatSince(c.last_message_at, agora)}
                  </span>
                </div>
              </Link>
            ))}
          </Surface>
        </section>
      )}

      {/* --- Respostas ------------------------------------------------------ */}
      {termo.length >= 2 && lista.length === 0 ? (
        <section className="flex flex-col gap-2">
          <p className="text-lead font-light text-ink-2">Nada para “{termo}”.</p>
          <p className="text-body text-ink-4">
            Escreva sua pergunta no formulário abaixo — e ela provavelmente vira uma resposta pronta
            para a próxima pessoa.
          </p>
        </section>
      ) : (
        [...porCategoria.entries()].map(([categoria, itens]) => (
          <section key={categoria} className="flex flex-col gap-3">
            <h2 className="text-caption font-medium uppercase tracking-[0.16em] text-ink-3">
              {categoria}
            </h2>
            <Surface className="flex flex-col divide-y divide-[var(--color-line)]">
              {itens.map((a) => (
                <details key={a.id} className="group">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-3.5 text-body text-ink-2 transition-colors hover:text-ink [&::-webkit-details-marker]:hidden">
                    {a.question}
                    <span
                      aria-hidden
                      className="shrink-0 text-ink-4 transition-transform duration-200 group-open:rotate-45"
                    >
                      +
                    </span>
                  </summary>
                  <p className="px-5 pb-5 text-body whitespace-pre-line text-ink-3">{a.answer}</p>
                </details>
              ))}
            </Surface>
          </section>
        ))
      )}

      {/* --- Falar com a Allen ---------------------------------------------- */}
      <section className="flex flex-col gap-4 border-t border-line pt-8 pb-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-title font-light">Não achou? Fale com a gente.</h2>
          <p className="text-caption text-ink-4">
            Uma pessoa lê e responde. Não há robô e não há número de protocolo.
          </p>
        </div>
        <Surface className="p-5">
          <NovoChamado
            contextPath={de ?? null}
            lessonId={aula ?? null}
            courseId={curso ?? null}
            contexto={contexto}
          />
        </Surface>
      </section>
    </main>
  )
}
