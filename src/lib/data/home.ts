import 'server-only'
import type { ContinueTarget } from '@/core/progress/types'
import { resolveHome, type HomeBlock } from '@/core/home/resolve-home'
import { createClient } from '@/lib/supabase/server'
import { listCourses, listThemes } from './catalog'

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

  const [emAndamento, concluidos, aplicacoes] = await Promise.all([
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
  ])

  return {
    inProgress: emAndamento.count ?? 0,
    completed: concluidos.count ?? 0,
    applications: aplicacoes.count ?? 0,
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
    .select('id, eyebrow, title, subtitle, cta_label, cta_href, image_url')
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
  }))
}
