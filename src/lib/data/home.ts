import 'server-only'
import type { ContinueTarget } from '@/core/progress/types'
import { resolveHome, type HomeBlock } from '@/core/home/resolve-home'
import { createClient } from '@/lib/supabase/server'
import { listCourses, listThemes } from './catalog'
import { getVideoProvider, videoConfigurado } from '@/lib/video'

/**
 * Monta a Home.
 *
 * A composição em si é decisão de domínio e vive em `resolveHome` (D-18).
 * Este arquivo só busca os ingredientes. Quando a recomendação inteligente
 * chegar, ela troca a função de domínio — este arquivo continua igual.
 */
export async function getHomeBlocks(userId: string): Promise<HomeBlock[]> {
  const [continueTarget, masterclasses, recommended, themes, journey] = await Promise.all([
    getContinueTarget(userId),
    listCourses({ format: 'masterclass', limit: 4 }),
    listCourses({ format: 'course', limit: 6 }),
    listThemes(),
    getJourneySummary(userId),
  ])

  return resolveHome({ continueTarget, masterclasses, recommended, themes, journey })
}

/**
 * O card mais importante do produto.
 *
 * É UMA leitura no índice parcial `enrollments (user_id, last_seen_at desc)
 * where completed_at is null` — a razão de `enrollments` existir como tabela
 * derivada (D-06). Só depois de saber QUAL aula é que buscamos os detalhes
 * dela; sem a matrícula, isso seria um agregado sobre todo o histórico.
 */
async function getContinueTarget(userId: string): Promise<ContinueTarget | null> {
  const supabase = await createClient()

  const { data: enrollment } = await supabase
    .from('enrollments')
    .select('course_id, last_lesson_id, progress_percent')
    .eq('user_id', userId)
    .is('completed_at', null)
    .order('last_seen_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!enrollment?.last_lesson_id) return null

  const [{ data: lesson }, { data: course }] = await Promise.all([
    supabase
      .from('lessons')
      .select('id, slug, title, position, duration_seconds, module_id')
      .eq('id', enrollment.last_lesson_id)
      .maybeSingle(),
    supabase
      .from('courses')
      .select('id, slug, title')
      .eq('id', enrollment.course_id)
      .maybeSingle(),
  ])

  if (!lesson || !course) return null

  const [{ data: mod }, { data: progress }] = await Promise.all([
    supabase.from('modules').select('title, position').eq('id', lesson.module_id).maybeSingle(),
    supabase
      .from('lesson_progress')
      .select('position_seconds')
      .eq('user_id', userId)
      .eq('lesson_id', lesson.id)
      .maybeSingle(),
  ])

  return {
    courseId: course.id,
    courseSlug: course.slug,
    courseTitle: course.title,
    moduleTitle: mod?.title ?? '',
    modulePosition: mod?.position ?? 1,
    lessonId: lesson.id,
    lessonSlug: lesson.slug,
    lessonTitle: lesson.title,
    lessonPosition: lesson.position,
    positionSeconds: progress?.position_seconds ?? 0,
    durationSeconds: lesson.duration_seconds,
    progressPercent: enrollment.progress_percent,
  }
}

async function getJourneySummary(userId: string) {
  const supabase = await createClient()

  const [emAndamento, concluidos, aplicacoes, aulasVistas] = await Promise.all([
    supabase
      .from('enrollments')
      .select('course_id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .is('completed_at', null),
    supabase
      .from('enrollments')
      .select('course_id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .not('completed_at', 'is', null),
    supabase
      .from('applications')
      .select('lesson_id', { count: 'exact', head: true })
      .eq('user_id', userId),
    // A quarta métrica do painel. Entra no mesmo Promise.all: é uma consulta a
    // mais, não uma ida a mais — as quatro viajam juntas.
    supabase
      .from('lesson_progress')
      .select('lesson_id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('state', 'completed'),
  ])

  return {
    inProgress: emAndamento.count ?? 0,
    completed: concluidos.count ?? 0,
    applications: aplicacoes.count ?? 0,
    lessonsCompleted: aulasVistas.count ?? 0,
  }
}

/**
 * O banner do topo da Home.
 *
 * Publicado, o de menor `position`. Um só: dois banners empilhados no lugar
 * mais nobre da tela é o começo de um carrossel, e carrossel é onde destaque
 * vai para não ser visto.
 */
export async function getBanner() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('home_banners')
    .select('id, eyebrow, title, subtitle, cta_label, cta_href, image_url, image_url_light')
    .eq('status', 'published')
    .order('position')
    .limit(1)
    .maybeSingle()

  if (!data) return null

  return {
    id: data.id as string,
    eyebrow: data.eyebrow as string | null,
    title: data.title as string | null,
    subtitle: data.subtitle as string | null,
    ctaLabel: data.cta_label as string | null,
    ctaHref: data.cta_href as string | null,
    imageUrlLight: data.image_url_light ?? null,
    imageUrl: data.image_url as string | null,
  }
}

/**
 * Os cursos anunciados e ainda fechados.
 *
 * Publicados com `available_at` no futuro. Ficam FORA das outras faixas — ver
 * "Em breve" misturado ao que já dá para assistir transforma cada clique numa
 * aposta.
 */
export async function getEmBreve() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('courses')
    .select(
      'id, slug, title, summary, cover_url, format, duration_seconds, lesson_count, available_at',
    )
    .eq('status', 'published')
    .gt('available_at', new Date().toISOString())
    .order('available_at')
    .limit(6)

  return (data ?? []).map((c) => ({
    id: c.id as string,
    slug: c.slug as string,
    title: c.title as string,
    summary: c.summary as string | null,
    coverUrl: c.cover_url as string | null,
    format: c.format as 'course' | 'masterclass',
    durationSeconds: c.duration_seconds as number,
    lessonCount: c.lesson_count as number,
    instructorName: null,
    themeNames: [] as string[],
    availableAt: c.available_at as string | null,
    // E ela busca só o que tem data futura: é a definição de em breve.
    comingSoon: true,
  }))
}

export interface BoasVindas {
  url: string
  poster: string | null
  eyebrow: string | null
  title: string | null
  subtitle: string | null
}

/**
 * O VÍDEO DE BOAS-VINDAS DA HOME.
 *
 * Devolve nulo quando não há vídeo, e a Home some com o bloco inteiro. Não é
 * o mesmo que devolver um objeto vazio: um bloco que aparece sem conteúdo é
 * defeito na tela mais vista do produto.
 *
 * O ticket é assinado a cada visita e expira. Vale a mesma regra de sempre
 * (D-17): id de asset não abre nada sozinho, e link copiado do inspetor morre
 * em pouco tempo.
 */
export async function getBoasVindas(viewerId: string): Promise<BoasVindas | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('home_intro')
    .select('video_asset_id, eyebrow, title, subtitle')
    .eq('id', 1)
    .maybeSingle()

  if (!data?.video_asset_id || !videoConfigurado()) return null

  try {
    const ticket = await getVideoProvider().createPlaybackTicket({
      assetId: data.video_asset_id,
      viewerId,
    })
    return {
      url: ticket.url,
      poster: ticket.posterUrl,
      eyebrow: data.eyebrow,
      title: data.title,
      subtitle: data.subtitle,
    }
  } catch {
    // Provedor fora do ar não pode derrubar a Home inteira. Sem vídeo, a
    // página continua sendo a página.
    return null
  }
}

/**
 * O CADERNO: as anotações e as aulas salvas de uma pessoa.
 *
 * Três consultas em vez de um join: o Supabase não faz join arbitrário pelo
 * cliente, e montar o caminho da aula (`/curso/<slug>/<aula>`) exige o slug do
 * curso, que mora duas tabelas acima. Buscar em lotes e casar em memória é
 * mais previsível que embed aninhado — e a RLS já filtrou tudo para a pessoa
 * certa antes de qualquer linha chegar aqui.
 */
export async function getCaderno(userId: string) {
  const supabase = await createClient()

  const [{ data: notas }, { data: salvas }] = await Promise.all([
    supabase
      .from('lesson_notes')
      .select('id, body, at_seconds, created_at, lesson_id')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(60),
    supabase
      .from('saved_lessons')
      .select('lesson_id, saved_at')
      .eq('user_id', userId)
      .order('saved_at', { ascending: false })
      .limit(40),
  ])

  const ids = [
    ...new Set([
      ...(notas ?? []).map((n) => n.lesson_id as string),
      ...(salvas ?? []).map((s) => s.lesson_id as string),
    ]),
  ]

  if (ids.length === 0) return { notas: [], salvas: [] }

  const { data: aulas } = await supabase
    .from('lessons')
    .select('id, slug, title, duration_seconds, course_id')
    .in('id', ids)

  const cursoIds = [...new Set((aulas ?? []).map((a) => a.course_id as string))]
  const { data: cursos } = cursoIds.length
    ? await supabase.from('courses').select('id, slug, title').in('id', cursoIds)
    : { data: [] as Array<{ id: string; slug: string; title: string }> }

  const porCurso = new Map((cursos ?? []).map((c) => [c.id as string, c]))
  const porAula = new Map(
    (aulas ?? []).map((a) => {
      const curso = porCurso.get(a.course_id as string)
      return [
        a.id as string,
        {
          titulo: a.title as string,
          duracao: a.duration_seconds as number,
          cursoTitulo: curso?.title ?? '',
          // O endereço novo: a aula é consulta dentro do curso, não rota.
          caminho: curso ? `/curso/${curso.slug}?aula=${a.slug}` : '#',
        },
      ]
    }),
  )

  return {
    notas: (notas ?? []).flatMap((n) => {
      const aula = porAula.get(n.lesson_id as string)
      // Aula apagada depois da anotação: a linha some por cascade, mas se
      // chegar aqui sem par, some da lista em vez de virar item sem destino.
      if (!aula) return []
      return [
        {
          id: n.id as string,
          body: n.body as string,
          atSeconds: n.at_seconds as number | null,
          createdAt: n.created_at as string,
          aulaTitulo: aula.titulo,
          cursoTitulo: aula.cursoTitulo,
          caminho: aula.caminho,
        },
      ]
    }),
    salvas: (salvas ?? []).flatMap((s) => {
      const aula = porAula.get(s.lesson_id as string)
      if (!aula) return []
      return [
        {
          id: s.lesson_id as string,
          titulo: aula.titulo,
          cursoTitulo: aula.cursoTitulo,
          caminho: aula.caminho,
          duracao: aula.duracao,
        },
      ]
    }),
  }
}
