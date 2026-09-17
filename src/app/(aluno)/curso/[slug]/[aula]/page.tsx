import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { formatDuration, formatPosition } from '@/core/shared/format'
import { requireSession } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import { concluirAula, registrarAbertura } from './actions'
import Image from 'next/image'
import { Aplicacao } from './aplicacao'
import { Avaliar } from './avaliar'
import { PainelLateral } from './painel-lateral'
import { Player } from '@/components/domain/player'
import { cn } from '@/lib/utils'
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
    .select('id, slug, title, format, instructor_id')
    .eq('slug', slug)
    .maybeSingle()
  if (!course) notFound()

  /*
   * O EXPERT SÓ É BUSCADO NA MASTERCLASS.
   *
   * "Um expert. Um assunto. Um mergulho profundo." — na Masterclass quem
   * ensina é parte do que se compra, e some da tela hoje. Em curso comum o
   * instrutor já aparece na página do curso, e repetir em toda aula é ruído
   * mais uma consulta por navegação.
   */
  const masterclass = course.format === 'masterclass'
  const { data: expert } = masterclass && course.instructor_id
    ? await supabase
        .from('instructors')
        .select('name, headline, photo_url')
        .eq('id', course.instructor_id)
        .maybeSingle()
    : { data: null }

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
        // `video_asset_id` entra por causa da miniatura na coluna da direita:
        // ela é derivada do próprio provedor, sem campo de capa por aula e sem
        // ida à rede (a assinatura é HMAC local).
        .select('id, slug, title, position, module_id, duration_seconds, video_asset_id')
        .eq('course_id', course.id)
        .eq('status', 'published')
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

  // O que a coluna da direita precisa, em paralelo com o resto.
  const [{ data: anotacao }, { data: nota }, { data: progressoDoCurso }, { data: aplicadasNoCurso }] =
    await Promise.all([
      supabase
        .from('lesson_notes')
        .select('body')
        .eq('user_id', session.userId)
        .eq('lesson_id', lesson.id)
        .maybeSingle(),
      supabase
        .from('lesson_ratings')
        .select('stars')
        .eq('user_id', session.userId)
        .eq('lesson_id', lesson.id)
        .maybeSingle(),
      supabase
        .from('lesson_progress')
        .select('lesson_id, state')
        .eq('user_id', session.userId),
      supabase.from('applications').select('lesson_id').eq('user_id', session.userId),
    ])

  const vistas = new Set(
    (progressoDoCurso ?? []).filter((p) => p.state === 'completed').map((p) => p.lesson_id),
  )
  const aplicadas = new Set((aplicadasNoCurso ?? []).map((a) => a.lesson_id))

  const doModulo = (irmas ?? []).filter((l) => l.module_id === lesson.module_id)


  const todas = irmas ?? []
  const indice = todas.findIndex((l) => l.id === lesson.id)
  const proxima = todas[indice + 1]

  /*
   * A LISTA DA COLUNA DA DIREITA.
   *
   * A miniatura sai do mesmo ticket que serve o vídeo. `createPlaybackTicket`
   * não faz requisição — é só HMAC —, então gerar uma por aula é barato. Sem
   * chave de token configurada o Bunny devolve a thumbnail aberta, e a lista
   * continua funcionando.
   */
  const podeVideo = videoConfigurado()
  const aulasDoModulo = doModulo.map((l) => {
    let poster: string | null = null
    if (l.video_asset_id && podeVideo) {
      try {
        poster = getVideoProvider().posterUrl(l.video_asset_id)
      } catch {
        poster = null
      }
    }
    return {
      id: l.id as string,
      slug: l.slug as string,
      title: l.title as string,
      durationSeconds: l.duration_seconds as number,
      posterUrl: poster,
      concluida: vistas.has(l.id),
      aplicada: aplicadas.has(l.id),
    }
  })

  const anterior = todas[indice - 1]

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

  /**
   * Modelo antes de arquivo, arquivo antes de link.
   *
   * Não é estética: o modelo é o que a pessoa abre para EXECUTAR o Para Fazer.
   * Ele ficar em terceiro lugar porque foi cadastrado depois seria a ordem do
   * cadastro vencendo a ordem do uso.
   */
  const PESO: Record<string, number> = { template: 0, file: 1, link: 2 }
  const materiaisOrdenados = [...(materiais ?? [])].sort(
    (a, b) => (PESO[a.kind] ?? 9) - (PESO[b.kind] ?? 9),
  )

  const temParaFazer = Boolean(lesson.para_fazer?.trim())
  const aplicada = Boolean(aplicacao)
  const concluida = progresso?.state === 'completed'
  const caminho = `/curso/${course.slug}/${lesson.slug}`

  const semVideo = (
    <div className="flex aspect-video items-center justify-center rounded-[var(--radius-card)] border border-dashed border-line bg-[linear-gradient(140deg,rgba(18,23,61,0.8),rgba(5,7,20,1))]">
      <span className="px-6 text-center text-label text-ink-4">
        Esta aula ainda não tem vídeo. O que está escrito abaixo já vale.
      </span>
    </div>
  )

  const player = video ? (
    <Player
      src={video.url}
      poster={video.poster}
      lessonId={lesson.id}
      posicaoInicial={progresso?.position_seconds ?? 0}
    />
  ) : (
    semVideo
  )
  /*
   * O CORPO E A LATERAL SÃO OS MESMOS NOS DOIS FORMATOS.
   *
   * O que muda entre aula comum e Masterclass é a ORDEM e a MOLDURA, nunca o
   * conteúdo: Para Saber, Para Fazer, materiais e o índice do módulo valem
   * igual nos dois. Duplicar isso em dois returns seria garantir que uma
   * correção futura entrasse só em um deles.
   */
  const corpo = (
    <>
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

        {/* AJUDA COM CONTEXTO.
            Discreto, no fim, e carregando de onde a pessoa veio: aula, curso e
            caminho. Quem clica aqui não precisa explicar onde estava — e do
            outro lado ninguém precisa perguntar. */}
        <Link
          href={`/suporte?de=${encodeURIComponent(caminho)}&aula=${lesson.id}&curso=${course.id}`}
          className="self-start text-caption text-ink-4 transition-colors hover:text-ink-2"
        >
          Algum problema nesta aula?
        </Link>

        {proxima && (
          <Link
            href={`/curso/${course.slug}/${proxima.slug}`}
            className="group flex items-center justify-between gap-4 rounded-[var(--radius-card)] border border-line px-5 py-4 transition-colors hover:border-line-strong hover:bg-[var(--color-realce-1)]"
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
    </>
  )

  const lateral = (
    <PainelLateral
      aulas={aulasDoModulo}
      materiais={materiaisOrdenados.map((m) => ({
        id: m.id as string,
        title: m.title as string,
        url: m.url as string,
        kind: m.kind as string,
      }))}
      aulaAtualId={lesson.id}
      cursoSlug={course.slug}
      moduloTitulo={mod?.title ?? 'Este módulo'}
      anotacao={anotacao?.body ?? ''}
      caminho={caminho}
    />
  )

  /**
   * O CAMINHO, no topo.
   *
   * Era só "← Curso". Numa aula, a pessoa precisa saber onde está em quatro
   * níveis — e o vídeo do Arkom mostra isso resolvido com o caminho completo.
   * Sem ele, "Abertura" não diz de que módulo nem de que curso veio.
   */
  const caminhoDeVolta = (
    <nav aria-label="Onde você está" className="flex flex-wrap items-center gap-2 text-caption">
      <Link href="/cursos" className="text-ink-4 transition-colors hover:text-ink">
        Cursos
      </Link>
      <span aria-hidden className="text-ink-4">
        ›
      </span>
      <Link
        href={`/curso/${course.slug}`}
        className="text-ink-4 transition-colors hover:text-ink"
      >
        {course.title}
      </Link>
      {mod?.title && (
        <>
          <span aria-hidden className="text-ink-4">
            ›
          </span>
          <span className="text-ink-4">{mod.title}</span>
        </>
      )}
      <span aria-hidden className="text-ink-4">
        ›
      </span>
      <span className="text-ink-2">{lesson.title}</span>
    </nav>
  )

  /**
   * A BARRA DE AÇÕES, debaixo do vídeo.
   *
   * Concluir, avaliar e avançar ficam juntos porque são o mesmo momento: o
   * vídeo acabou. Espalhados pela página, cada um vira uma decisão isolada.
   */
  const acoes = (
    <div className="flex flex-col gap-5 border-y border-line py-5">
      <div className="flex flex-wrap items-center gap-3">
        {!temParaFazer && (
          <form action={concluirAula}>
            <input type="hidden" name="lesson_id" value={lesson.id} />
            <input type="hidden" name="caminho" value={caminho} />
            <input type="hidden" name="concluida" value={String(concluida)} />
            <button
              type="submit"
              className={cn(
                'flex h-9 items-center gap-2 rounded-full border px-4 text-caption transition-colors',
                concluida
                  ? 'border-[rgba(60,200,130,0.45)] text-[#5ed99b]'
                  : 'border-line text-ink-2 hover:border-line-strong hover:text-ink',
              )}
            >
              {concluida ? '✓ Aula concluída' : 'Concluir aula'}
            </button>
          </form>
        )}

        <div className="ml-auto flex items-center gap-2">
          {anterior && (
            <Link
              href={`/curso/${course.slug}/${anterior.slug}`}
              aria-label="Aula anterior"
              className="flex size-9 items-center justify-center rounded-full border border-line text-ink-3 transition-colors hover:border-line-strong hover:text-ink"
            >
              ‹
            </Link>
          )}
          {proxima && (
            <Link
              href={`/curso/${course.slug}/${proxima.slug}`}
              aria-label="Próxima aula"
              className="flex size-9 items-center justify-center rounded-full border border-line text-ink-3 transition-colors hover:border-line-strong hover:text-ink"
            >
              ›
            </Link>
          )}
        </div>
      </div>

      <Avaliar lessonId={lesson.id} caminho={caminho} atual={nota?.stars ?? 0} />
    </div>
  )
  /*
   * ================== MASTERCLASS ==================
   *
   * A diferença não é enfeite a mais — é uma ordem de leitura diferente,
   * porque as duas coisas são consumidas de formas diferentes.
   *
   * Aula comum é FERRAMENTA: você chega sabendo o que quer, lê o título,
   * assiste, aplica. Título primeiro, vídeo dentro da coluna.
   *
   * Masterclass é SESSÃO: você reserva o tempo e mergulha. O vídeo vem
   * primeiro, rompendo a coluna, com moldura escura em volta. O título vem
   * depois — como a legenda de um filme, não como a etiqueta de um item. E o
   * expert aparece, porque na Masterclass quem ensina é parte do que se compra.
   */
  if (masterclass) {
    return (
      <main className="flex flex-col">
        {/* Sem margem negativa: este <main> não tem respiro no topo para
            comer, e puxar para cima meteria o vídeo embaixo da barra do
            celular. A moldura escura já é o que separa a sessão do resto. */}
        <section className="relative bg-[rgba(3,4,14,0.86)] py-8 sm:py-12">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[linear-gradient(to_bottom,rgba(76,65,255,0.14),transparent)]"
          />
          <div className="relative mx-auto w-full max-w-5xl px-4 sm:px-6">
            <div className="mb-5">{caminhoDeVolta}</div>
            {player}
          </div>
        </section>

        <div className="mx-auto grid w-full max-w-6xl gap-10 px-6 py-10 lg:grid-cols-[minmax(0,1fr)_320px]">
          <article className="flex flex-col gap-8">
            <header className="flex flex-col gap-4">
              <span className="text-caption uppercase tracking-[0.22em] text-blue-light">
                Capacitação
              </span>
              {/* `font-hair` é o peso editorial da casa, o mesmo do título do
                  curso. A aula comum usa `font-light`, que é o de trabalho. */}
              <h1 className="max-w-[16ch] text-display font-hair leading-[1.05]">{lesson.title}</h1>
              {lesson.description && (
                <p className="max-w-[54ch] text-lead font-light text-ink-2">
                  {lesson.description}
                </p>
              )}
              <span data-numeric className="text-caption uppercase tracking-[0.16em] text-ink-4">
                Módulo {formatPosition(mod?.position ?? 1)} · Aula {formatPosition(lesson.position)}
                {lesson.duration_seconds > 0 && ` · ${formatDuration(lesson.duration_seconds)}`}
              </span>
            </header>

            {expert && (
              <div className="flex items-center gap-4 border-y border-line py-5">
                {expert.photo_url ? (
                  <Image
                    src={expert.photo_url}
                    alt=""
                    width={52}
                    height={52}
                    className="size-[52px] shrink-0 rounded-full object-cover"
                  />
                ) : (
                  <span
                    aria-hidden
                    className="flex size-[52px] shrink-0 items-center justify-center rounded-full border border-line text-lead font-light text-ink-3"
                  >
                    {expert.name.charAt(0)}
                  </span>
                )}
                <div className="flex min-w-0 flex-col">
                  <span className="text-body text-ink">{expert.name}</span>
                  {expert.headline && (
                    <span className="text-caption text-ink-4">{expert.headline}</span>
                  )}
                </div>
              </div>
            )}

            {acoes}
            {corpo}
          </article>

          {lateral}
        </div>
      </main>
    )
  }

  // ================== AULA COMUM ==================
  return (
    <main className="mx-auto grid max-w-6xl gap-10 px-6 pt-10 sm:pt-14 lg:grid-cols-[minmax(0,1fr)_320px]">
      <article className="flex flex-col gap-8">
        <header className="flex flex-col gap-3">
          {caminhoDeVolta}
          <span data-numeric className="text-caption uppercase tracking-[0.16em] text-ink-4">
            Módulo {formatPosition(mod?.position ?? 1)} · Aula {formatPosition(lesson.position)}
          </span>
          <h1 className="max-w-[20ch] text-display font-light">{lesson.title}</h1>
          {lesson.description && (
            <p className="max-w-[58ch] text-lead font-light text-ink-2">{lesson.description}</p>
          )}
        </header>

        {player}

        {acoes}

        {corpo}
      </article>

      {lateral}
    </main>
  )
}
