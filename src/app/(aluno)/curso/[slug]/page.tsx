import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { MiniaturaAula } from '@/components/domain/miniatura-aula'
import { OQueAprende } from '@/components/domain/o-que-aprende'
import { Player } from '@/components/domain/player'
import { Chip } from '@/components/primitives/chip'
import { emBreve } from '@/core/catalog/types'
import { porExtenso } from '@/core/identity/acesso'
import { formatDuration, formatPosition } from '@/core/shared/format'
import { requireSession } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import { getVideoProvider, videoConfigurado } from '@/lib/video'
import { cn } from '@/lib/utils'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const supabase = await createClient()
  const { data } = await supabase.from('courses').select('title').eq('slug', slug).maybeSingle()
  return { title: data?.title ?? 'Curso' }
}

/**
 * A PÁGINA DO CURSO — refeita.
 *
 * ─── O QUE ELA ERA ───────────────────────────────────────────────────────
 *
 * Uma parede de texto. Título, resumo, dezesseis promessas em duas colunas,
 * oito parágrafos de descrição — e só depois de rolar tudo isso, a lista de
 * aulas. O Gabriel abriu como aluno e a palavra dele foi "decepção".
 *
 * Ele estava certo, e o diagnóstico é simples: quem abre um curso quer VER a
 * cara da coisa, não ler sobre ela. A página respondia "sobre o que é isto?"
 * quando a pergunta era "como isto é?".
 *
 * ─── O QUE ELA É AGORA ───────────────────────────────────────────────────
 *
 * 1. O VÍDEO OCUPA A DOBRA. Se o curso tem teaser, ele toca ali. Se não tem,
 *    a arte de capa vira pôster com um play enorme por cima, e o clique leva
 *    à primeira aula. Nos dois casos, a primeira coisa que a pessoa vê é
 *    algo para assistir.
 *
 * 2. O TEXTO FICA AO LADO, E CURTO. Tema, título, uma linha de resumo,
 *    números e um botão. Nada mais compete com o vídeo na dobra.
 *
 * 3. AS AULAS VÊM LOGO DEPOIS, com miniatura, duração e estado — catálogo,
 *    não sumário. Aula assistida tem marca; a próxima tem destaque.
 *
 * 4. A LEITURA LONGA FOI PARA O FIM. "O que você vai aprender" e a descrição
 *    continuam inteiras, mas embaixo, onde quem quer ler vai buscar.
 *
 * O fundo é a própria arte do curso, borrada e escurecida — é dela que vem o
 * contraste que o vidro precisa para parecer vidro (D-51). Vidro sobre preto
 * chapado é plástico fosco.
 */
export default async function CursoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const session = await requireSession()
  const supabase = await createClient()

  const { data: course } = await supabase
    .from('courses')
    .select(
      'id, slug, title, summary, description, format, duration_seconds, lesson_count, instructor_id, cover_url, banner_url, learning_points, available_at, intro_video_asset_id',
    )
    .eq('slug', slug)
    .maybeSingle()

  if (!course) notFound()

  const [{ data: instructor }, { data: modules }, { data: lessons }, { data: links }] =
    await Promise.all([
      course.instructor_id
        ? supabase
            .from('instructors')
            .select('name, headline, bio, photo_url')
            .eq('id', course.instructor_id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      supabase
        .from('modules')
        .select('id, title, summary, position')
        .eq('course_id', course.id)
        .order('position'),
      supabase
        .from('lessons')
        .select('id, slug, title, position, duration_seconds, module_id, para_fazer, video_asset_id, thumbnail_url')
        .eq('course_id', course.id)
        .order('position'),
      supabase.from('course_themes').select('theme_id').eq('course_id', course.id),
    ])

  const themeIds = (links ?? []).map((l) => l.theme_id)
  const [{ data: themes }, { data: progresso }] = await Promise.all([
    themeIds.length
      ? supabase.from('themes').select('slug, name').in('id', themeIds)
      : Promise.resolve({ data: [] as Array<{ slug: string; name: string }> }),
    supabase
      .from('lesson_progress')
      .select('lesson_id, state')
      .eq('user_id', session.userId),
  ])

  const concluidas = new Set(
    (progresso ?? []).filter((p) => p.state === 'completed').map((p) => p.lesson_id),
  )

  const masterclass = course.format === 'masterclass'
  const aguardando = emBreve({ availableAt: course.available_at ?? null })
  const pontos: string[] = course.learning_points ?? []
  const todas = lessons ?? []
  const podeVideo = videoConfigurado()

  /*
   * "COMEÇAR" OU "CONTINUAR" — a diferença é o que a pessoa já fez.
   *
   * A primeira aula não assistida é o destino certo em qualquer dos casos:
   * para quem nunca entrou, ela é a primeira; para quem parou no meio, é onde
   * parou. Uma regra só cobre as duas situações, e nenhuma delas exige que a
   * pessoa procure na lista.
   */
  const proxima = todas.find((l) => !concluidas.has(l.id)) ?? todas[0]
  const comecou = concluidas.size > 0

  /** O pôster do teaser, ou a arte de capa. Assinado no servidor, sempre. */
  let teaser: { url: string; poster: string | null } | null = null
  if (course.intro_video_asset_id && podeVideo) {
    try {
      const ticket = await getVideoProvider().createPlaybackTicket({
        assetId: course.intro_video_asset_id,
        viewerId: session.userId,
      })
      teaser = { url: ticket.url, poster: ticket.posterUrl }
    } catch {
      teaser = null
    }
  }

  const arte = course.banner_url ?? course.cover_url
  const minutos = course.duration_seconds > 0 ? formatDuration(course.duration_seconds) : null

  return (
    <main className="relative flex flex-col gap-16 pb-16">
      {/* ═══ O FUNDO ═══════════════════════════════════════════════════════
          A arte do curso, borrada e escurecida. Não é decoração: é o que dá
          ao vidro dos cartões algo para filtrar. */}
      {arte && (
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[70vh] overflow-hidden">
          <Image
            src={arte}
            alt=""
            fill
            sizes="100vw"
            priority
            className="scale-110 object-cover opacity-[0.28] blur-2xl"
          />
          <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(5,7,20,0.55),rgba(5,7,20,0.92)_62%,var(--color-navy-deep)_100%)]" />
        </div>
      )}

      {/* ═══ A DOBRA ═══════════════════════════════════════════════════════ */}
      <section className="largura-catalogo relative px-6 pt-8 sm:pt-12">
        <Link
          href="/cursos"
          className="mb-6 inline-flex text-caption text-ink-3 transition-colors hover:text-ink"
        >
          ← Cursos
        </Link>

        <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
          {/* O vídeo. É por isto que a pessoa veio. */}
          <div className="glass-card overflow-hidden rounded-[var(--radius-card)]">
            {teaser ? (
              <Player src={teaser.url} poster={teaser.poster} lessonId={null} posicaoInicial={0} />
            ) : (
              <CapaComPlay
                arte={course.cover_url ?? course.banner_url}
                destino={proxima && !aguardando ? `/curso/${course.slug}/${proxima.slug}` : null}
                titulo={course.title}
              />
            )}
          </div>

          {/* O texto, do lado, curto. */}
          <div className="flex flex-col gap-5">
            <div className="flex flex-wrap items-center gap-2">
              {aguardando && <Chip tone="caution">Em breve</Chip>}
              {masterclass && <Chip tone="accent">Capacitação</Chip>}
              {(themes ?? []).map((t) => (
                <Link
                  key={t.slug}
                  href={`/tema/${t.slug}`}
                  className="rounded-full border border-line px-3 py-1 text-caption text-ink-3 transition-colors hover:border-line-strong hover:text-ink"
                >
                  {t.name}
                </Link>
              ))}
            </div>

            <h1 className="text-display font-hair leading-[1.05]">{course.title}</h1>

            {course.summary && (
              <p className="text-lead font-light text-ink-2">{course.summary}</p>
            )}

            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-label text-ink-4">
              <span data-numeric>
                {course.lesson_count} {course.lesson_count === 1 ? 'aula' : 'aulas'}
              </span>
              {minutos && (
                <>
                  <span aria-hidden>·</span>
                  <span data-numeric>{minutos}</span>
                </>
              )}
              {instructor?.name && (
                <>
                  <span aria-hidden>·</span>
                  <span>{instructor.name}</span>
                </>
              )}
            </div>

            {aguardando ? (
              <p className="rounded-[var(--radius-card)] border border-line px-5 py-4 text-body text-ink-2">
                Abre em {porExtenso(new Date(course.available_at as string))}. Já está no seu
                catálogo — no dia, as aulas aparecem aqui sozinhas.
              </p>
            ) : proxima ? (
              <Link
                href={`/curso/${course.slug}/${proxima.slug}`}
                className="group flex h-14 items-center justify-center gap-3 rounded-[var(--radius-control)] bg-blue text-label font-strong text-off-white transition-all duration-200 hover:bg-blue-light hover:shadow-[0_0_40px_-12px_rgba(76,65,255,0.9)]"
              >
                <SetaPlay />
                {comecou ? 'Continuar de onde parou' : 'Começar o curso'}
              </Link>
            ) : (
              <p className="rounded-[var(--radius-card)] border border-dashed border-line px-5 py-4 text-body text-ink-3">
                As aulas deste curso estão sendo publicadas.
              </p>
            )}
          </div>
        </div>
      </section>

      {/* ═══ AS AULAS ══════════════════════════════════════════════════════ */}
      {!aguardando && (modules ?? []).length > 0 && (
        <section className="largura-catalogo relative flex flex-col gap-6 px-6">
          <h2 className="text-title font-light">Conteúdo</h2>

          <div className="flex flex-col gap-4">
            {(modules ?? []).map((mod) => {
              const aulas = todas.filter((l) => l.module_id === mod.id)
              const feitas = aulas.filter((l) => concluidas.has(l.id)).length

              return (
                <div
                  key={mod.id}
                  className="glass-card overflow-hidden rounded-[var(--radius-card)]"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-[rgba(255,255,255,0.08)] px-5 py-4">
                    <div className="flex items-baseline gap-3">
                      <span data-numeric className="text-caption text-ink-4">
                        {formatPosition(mod.position)}
                      </span>
                      <div className="flex flex-col">
                        <span className="text-lead font-light text-ink">{mod.title}</span>
                        {mod.summary && (
                          <span className="text-label text-ink-4">{mod.summary}</span>
                        )}
                      </div>
                    </div>
                    {aulas.length > 0 && (
                      <span data-numeric className="text-caption text-ink-4">
                        {feitas}/{aulas.length}
                      </span>
                    )}
                  </div>

                  <ol className="flex flex-col">
                    {aulas.map((aula) => {
                      const concluida = concluidas.has(aula.id)
                      const ehProxima = proxima?.id === aula.id
                      /* A miniatura enviada à mão vence a do provedor: ela só
                         existe porque a automática falhou em algum caso real. */
                      let poster: string | null = aula.thumbnail_url ?? null
                      if (!poster && aula.video_asset_id && podeVideo) {
                        try {
                          poster = getVideoProvider().posterUrl(aula.video_asset_id)
                        } catch {
                          poster = null
                        }
                      }

                      return (
                        <li key={aula.id}>
                          <Link
                            href={`/curso/${course.slug}/${aula.slug}`}
                            className={cn(
                              'group flex items-center gap-4 border-t border-[rgba(255,255,255,0.05)] px-5 py-3 transition-colors duration-150',
                              'hover:bg-[var(--color-realce-2)]',
                              ehProxima && 'bg-[rgba(76,65,255,0.1)]',
                            )}
                          >
                            {/* A miniatura faz a lista parecer catálogo em vez
                                de sumário — e ela é gratuita: já existe no
                                provedor. Quando falha, vira o número da aula
                                em vez do ícone de imagem partida. */}
                            <MiniaturaAula
                              src={poster}
                              posicao={formatPosition(aula.position)}
                              concluida={concluida}
                            />

                            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                              <span
                                className={cn(
                                  'truncate text-body transition-colors',
                                  concluida ? 'text-ink-4' : 'text-ink-2 group-hover:text-ink',
                                )}
                              >
                                {aula.title}
                              </span>
                              <span className="flex items-center gap-2 text-caption text-ink-4">
                                <span data-numeric>{formatDuration(aula.duration_seconds)}</span>
                                {aula.para_fazer?.trim() && (
                                  <>
                                    <span aria-hidden>·</span>
                                    <span className="text-blue-light">Para fazer</span>
                                  </>
                                )}
                              </span>
                            </span>

                            {concluida && <Visto />}
                            {ehProxima && !concluida && (
                              <span className="shrink-0 text-caption text-blue-light">
                                continuar
                              </span>
                            )}
                          </Link>
                        </li>
                      )
                    })}
                    {aulas.length === 0 && (
                      <li className="border-t border-[rgba(255,255,255,0.05)] px-5 py-3 text-caption text-ink-4">
                        Sem aulas publicadas.
                      </li>
                    )}
                  </ol>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* ═══ A PROMESSA, EM DESTAQUE ══════════════════════════════════════
          Antes isto e a descrição eram duas colunas gêmeas de texto — o
          Gabriel chamou de "página documental", e estava certo: dois blocos
          do mesmo tamanho e do mesmo tom não têm hierarquia, e sem hierarquia
          o olho não escolhe por onde entrar. Então não entra.

          Agora a promessa é uma seção com peso próprio e interação, e a
          descrição virou o que ela sempre foi: texto de apoio, discreto,
          para quem quiser. */}
      {pontos.length > 0 && (
        <section className="largura-catalogo relative flex flex-col gap-7 px-6">
          <h2 className="text-caption font-medium uppercase tracking-[0.16em] text-ink-3">
            O que você vai aprender
          </h2>
          <OQueAprende pontos={pontos} />
        </section>
      )}

      {/* A descrição, recuada e estreita: largura de leitura, tom mais baixo,
          e um título que diz que é contexto — não a atração principal. */}
      {course.description && (
        <section className="largura-catalogo relative px-6">
          <details className="group max-w-[68ch]">
            <summary className="flex cursor-pointer list-none items-center gap-2 text-caption font-medium uppercase tracking-[0.16em] text-ink-4 transition-colors hover:text-ink-3">
              Sobre o curso
              <span
                aria-hidden
                className="text-caption transition-transform duration-200 group-open:rotate-90"
              >
                ▸
              </span>
            </summary>
            <p className="whitespace-pre-line pt-5 text-body text-ink-3">
              {course.description}
            </p>
          </details>
        </section>
      )}

      {instructor && (
        <section className="largura-catalogo relative flex flex-col gap-4 px-6">
          <h2 className="text-caption font-medium uppercase tracking-[0.16em] text-ink-3">
            Quem ensina
          </h2>
          <div className="glass-card flex flex-wrap items-start gap-5 rounded-[var(--radius-card)] p-6">
            {instructor.photo_url && (
              <span className="relative size-16 shrink-0 overflow-hidden rounded-full">
                <Image src={instructor.photo_url} alt="" fill sizes="64px" className="object-cover" />
              </span>
            )}
            <div className="flex min-w-0 flex-col gap-1">
              <span className="text-lead font-light text-ink">{instructor.name}</span>
              {instructor.headline && (
                <span className="text-label text-ink-3">{instructor.headline}</span>
              )}
              {instructor.bio && (
                <p className="max-w-[60ch] pt-2 text-body text-ink-3">{instructor.bio}</p>
              )}
            </div>
          </div>
        </section>
      )}
    </main>
  )
}

/**
 * Sem teaser, a capa vira pôster com um play por cima.
 *
 * É melhor que um retângulo vazio e melhor que texto: a pessoa entende em um
 * olhar que ali se clica para assistir, mesmo que o clique leve à primeira
 * aula em vez de tocar um vídeo ali mesmo.
 */
function CapaComPlay({
  arte,
  destino,
  titulo,
}: {
  arte: string | null
  destino: string | null
  titulo: string
}) {
  const conteudo = (
    <>
      {arte ? (
        <Image
          src={arte}
          alt=""
          fill
          sizes="(min-width: 1024px) 60rem, 100vw"
          priority
          className="object-cover transition-transform duration-500 ease-[var(--ease-allen)] group-hover:scale-[1.02]"
        />
      ) : (
        <span
          aria-hidden
          className="absolute inset-0 flex items-center justify-center font-hair text-[9rem] leading-none text-[var(--color-realce-2)]"
        >
          {titulo.charAt(0)}
        </span>
      )}
      <span className="absolute inset-0 bg-[linear-gradient(to_top,rgba(5,7,20,0.75),rgba(5,7,20,0.1)_60%)]" />
      {destino && (
        <span className="absolute inset-0 flex items-center justify-center">
          <span className="flex size-20 items-center justify-center rounded-full border border-[rgba(255,255,255,0.28)] bg-[rgba(5,7,20,0.55)] backdrop-blur-md transition-all duration-200 group-hover:scale-110 group-hover:border-[rgba(255,255,255,0.5)] group-hover:bg-[rgba(76,65,255,0.55)]">
            <SetaPlay grande />
          </span>
        </span>
      )}
    </>
  )

  const classe = 'group relative block aspect-video w-full overflow-hidden bg-navy'

  return destino ? (
    <Link href={destino} className={classe} aria-label={`Começar ${titulo}`}>
      {conteudo}
    </Link>
  ) : (
    <div className={classe}>{conteudo}</div>
  )
}

function SetaPlay({ grande, pequena }: { grande?: boolean; pequena?: boolean }) {
  const tamanho = grande ? 'size-7' : pequena ? 'size-3' : 'size-4'
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={cn(tamanho, 'translate-x-px')}>
      <path d="M8 5.5a1 1 0 0 1 1.52-.85l9 6.5a1 1 0 0 1 0 1.7l-9 6.5A1 1 0 0 1 8 18.5v-13Z" />
    </svg>
  )
}

function Visto() {
  return (
    <span
      aria-label="Aula concluída"
      className="flex size-5 shrink-0 items-center justify-center rounded-full border border-[rgba(94,217,155,0.45)]"
    >
      <svg viewBox="0 0 24 24" fill="none" aria-hidden className="size-3">
        <path
          d="M5 12.5l4.5 4.5L19 7.5"
          stroke="#5ed99b"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  )
}
