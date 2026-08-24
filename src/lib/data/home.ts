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
