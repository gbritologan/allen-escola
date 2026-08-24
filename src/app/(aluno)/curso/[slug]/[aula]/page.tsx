import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Chip } from '@/components/primitives/chip'
import { Surface } from '@/components/surfaces/surface'
import { formatDuration, formatPosition } from '@/core/shared/format'
import { requireSession } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import { concluirAula, registrarAbertura } from './actions'
import { Aplicacao } from './aplicacao'
import { Player } from './player'
import { getVideoProvider, videoConfigurado } from '@/lib/video'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; aula: string }>
}): Promise<Metadata> {
  const { slug, aula } = await params
  const supabase = await createClient()
  const { data: course } = await supabase
    .from('courses')
    .select('id')
    .eq('slug', slug)
    .maybeSingle()
  if (!course) return { title: 'Aula' }
  const { data } = await supabase
    .from('lessons')
    .select('title')
    .eq('course_id', course.id)
    .eq('slug', aula)
    .maybeSingle()
  return { title: data?.title ?? 'Aula' }
}

/**
 * A EXPERIÊNCIA DA AULA.
 *
 * O centro do produto, e o lugar onde ele para de parecer um LMS.
 *
 * A ordem da página é a tese: primeiro o que a pessoa precisa SABER, depois o
 * que ela precisa FAZER — e o Para Fazer não é um apêndice no rodapé, é um
 * bloco com peso visual próprio, borda azul e o único botão primário da tela.
 *
 * O player tem controles próprios, não o embed do provedor: um player com a
 * marca de outra empresa no canto derruba a tese de produto proprietário na
 * tela mais importante que existe.
 *
 * E a aula continua funcionando sem vídeo — o conhecimento e a aplicação são
 * o produto; vídeo é veículo.
 */
export default async function AulaPage({
  params,
}: {
  params: Promise<{ slug: string; aula: string }>
}) {
  const { slug, aula } = await params
  const session = await requireSession()
  const supabase = await createClient()

  const { data: course } = await supabase
    .from('courses')
    .select('id, slug, title')
    .eq('slug', slug)
    .maybeSingle()
  if (!course) notFound()

  const { data: lesson } = await supabase
    .from('lessons')
    .select(
      'id, slug, title, description, position, duration_seconds, video_asset_id, para_saber, para_fazer, module_id',
    )
    .eq('course_id', course.id)
    .eq('slug', aula)
    .maybeSingle()
  if (!lesson) notFound()

  // Sem isto, a Home não tem para onde apontar em "Continue de onde parou".
  await registrarAbertura(lesson.id)

  const [{ data: mod }, { data: irmas }, { data: progresso }, { data: aplicacao }, { data: materiais }] =
    await Promise.all([
      supabase.from('modules').select('title, position').eq('id', lesson.module_id).maybeSingle(),
      supabase
        .from('lessons')
        .select('id, slug, title, position, module_id, duration_seconds')
        .eq('course_id', course.id)
        .order('position'),
      supabase
        .from('lesson_progress')
        .select('state, position_seconds')
        .eq('user_id', session.userId)
        .eq('lesson_id', lesson.id)
        .maybeSingle(),
      supabase
        .from('applications')
        .select('lesson_id')
        .eq('user_id', session.userId)
        .eq('lesson_id', lesson.id)
        .maybeSingle(),
      supabase
        .from('materials')
        .select('id, title, url, kind')
        .eq('lesson_id', lesson.id)
        .order('position'),
    ])

  const doModulo = (irmas ?? []).filter((l) => l.module_id === lesson.module_id)
  const todas = irmas ?? []
  const indice = todas.findIndex((l) => l.id === lesson.id)
  const proxima = todas[indice + 1]

  /**
   * O ticket de reprodução é criado a cada visita e expira em 90 minutos.
   * Link copiado do inspetor para de funcionar sozinho — e o RLS acima já
   * garantiu que só quem pode ver a aula chegou até esta linha.
   */
  let video: { url: string; poster: string | null } | null = null
  if (lesson.video_asset_id && videoConfigurado()) {
    try {
      const ticket = await getVideoProvider().createPlaybackTicket({
        assetId: lesson.video_asset_id,
        viewerId: session.userId,
      })
      video = { url: ticket.url, poster: ticket.posterUrl }
    } catch {
      video = null
    }
  }

  const temParaFazer = Boolean(lesson.para_fazer?.trim())
  const aplicada = Boolean(aplicacao)
  const concluida = progresso?.state === 'completed'
  const caminho = `/curso/${course.slug}/${lesson.slug}`

  return (
    <main className="mx-auto grid max-w-6xl gap-10 px-6 pt-10 sm:pt-14 lg:grid-cols-[minmax(0,1fr)_260px]">
      <article className="flex flex-col gap-8">
        <header className="flex flex-col gap-3">
          <Link
            href={`/curso/${course.slug}`}
            className="text-caption text-ink-3 transition-colors hover:text-ink"
          >
            ← {course.title}
          </Link>
          <span data-numeric className="text-caption uppercase tracking-[0.16em] text-ink-4">
            Módulo {formatPosition(mod?.position ?? 1)} · Aula {formatPosition(lesson.position)}
          </span>
          <h1 className="max-w-[20ch] text-display font-light">{lesson.title}</h1>
          {lesson.description && (
            <p className="max-w-[58ch] text-lead font-light text-ink-2">{lesson.description}</p>
          )}
        </header>

        {/* --- Vídeo ------------------------------------------------------- */}
        {video ? (
          <Player
            src={video.url}
            poster={video.poster}
            lessonId={lesson.id}
            posicaoInicial={progresso?.position_seconds ?? 0}
          />
        ) : (
          <div className="flex aspect-video items-center justify-center rounded-[var(--radius-card)] border border-dashed border-line bg-[linear-gradient(140deg,rgba(18,23,61,0.8),rgba(5,7,20,1))]">
            <span className="px-6 text-center text-label text-ink-4">
              Esta aula ainda não tem vídeo. O que está escrito abaixo já vale.
            </span>
          </div>
        )}

        {/* --- Para saber -------------------------------------------------- */}
        {lesson.para_saber?.trim() && (
          <section className="flex flex-col gap-3 border-l-2 border-l-line-strong pl-5">
            <h2 className="text-caption font-medium uppercase tracking-[0.16em] text-ink-3">
              Para saber
            </h2>
            <p className="max-w-[64ch] text-body whitespace-pre-line text-ink-2">
              {lesson.para_saber}
            </p>
          </section>
        )}

        {/* --- Para fazer ---------------------------------------------------
            Peso visual próprio, de propósito. É a unidade de valor. */}
        {temParaFazer && (
          <section className="flex flex-col gap-5 rounded-[var(--radius-card)] border-l-2 border-l-blue-light bg-[rgba(0,13,255,0.06)] p-6">
            <div className="flex flex-col gap-3">
              <h2 className="text-caption font-medium uppercase tracking-[0.16em] text-blue-light">
                Para fazer
              </h2>
              <p className="max-w-[58ch] text-lead font-light whitespace-pre-line text-ink">
                {lesson.para_fazer}
              </p>
            </div>
            <Aplicacao lessonId={lesson.id} caminho={caminho} aplicada={aplicada} />
          </section>
        )}

        {/* Aula sem Para Fazer é a exceção. Aí concluir é um ato explícito. */}
        {!temParaFazer && (
          <form action={concluirAula} className="flex items-center gap-4">
            <input type="hidden" name="lesson_id" value={lesson.id} />
            <input type="hidden" name="caminho" value={caminho} />
            <input type="hidden" name="concluida" value={String(concluida)} />
            <button
              type="submit"
              className="rounded-[var(--radius-control)] border border-line px-4 py-2.5 text-label text-ink-2 transition-colors hover:border-line-strong hover:text-ink"
            >
              {concluida ? 'Marcada como vista' : 'Marcar como vista'}
            </button>
          </form>
        )}

        {(materiais ?? []).length > 0 && (
          <section className="flex flex-col gap-3">
            <h2 className="text-caption font-medium uppercase tracking-[0.16em] text-ink-3">
              Materiais
            </h2>
            <Surface className="flex flex-col divide-y divide-[var(--color-line)]">
              {(materiais ?? []).map((m) => (
                <a
                  key={m.id}
                  href={m.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-5 py-3.5 text-body text-ink-2 transition-colors hover:bg-[rgba(243,245,252,0.03)] hover:text-ink"
                >
                  {m.title}
                </a>
              ))}
            </Surface>
          </section>
        )}

        {proxima && (
          <Link
            href={`/curso/${course.slug}/${proxima.slug}`}
            className="group flex items-center justify-between gap-4 rounded-[var(--radius-card)] border border-line px-5 py-4 transition-colors hover:border-line-strong hover:bg-[rgba(243,245,252,0.03)]"
          >
            <div className="flex min-w-0 flex-col">
              <span className="text-caption text-ink-4">Próxima aula</span>
              <span className="truncate text-body text-ink-2 group-hover:text-ink">
                {proxima.title}
              </span>
            </div>
            <span aria-hidden className="text-ink-4">
              →
            </span>
          </Link>
        )}
      </article>

      {/* --- Neste módulo -------------------------------------------------- */}
      <aside className="flex h-fit flex-col gap-3 lg:sticky lg:top-20">
        <h2 className="text-caption font-medium uppercase tracking-[0.16em] text-ink-3">
          {mod?.title ?? 'Neste módulo'}
        </h2>
        <Surface className="flex flex-col divide-y divide-[var(--color-line)]">
          {doModulo.map((l) => {
            const atual = l.id === lesson.id
            return (
              <Link
                key={l.id}
                href={`/curso/${course.slug}/${l.slug}`}
                aria-current={atual ? 'page' : undefined}
                className={
                  atual
                    ? 'flex items-baseline gap-3 bg-[rgba(76,65,255,0.1)] px-4 py-3'
                    : 'flex items-baseline gap-3 px-4 py-3 transition-colors hover:bg-[rgba(243,245,252,0.03)]'
                }
              >
                <span data-numeric className="text-caption text-ink-4">
                  {formatPosition(l.position)}
                </span>
                <span className={atual ? 'flex-1 text-label text-ink' : 'flex-1 text-label text-ink-3'}>
                  {l.title}
                </span>
              </Link>
            )
          })}
        </Surface>
        <span data-numeric className="text-caption text-ink-4">
          {formatDuration(lesson.duration_seconds)}
          {aplicada && ' · aplicada'}
        </span>
        {aplicada && <Chip tone="positive">Você aplicou esta aula</Chip>}
      </aside>
    </main>
  )
}
