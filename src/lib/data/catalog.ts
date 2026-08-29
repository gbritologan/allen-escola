import 'server-only'
import { cache } from 'react'
import type { CourseSummary, Theme } from '@/core/catalog/types'
import { createClient } from '@/lib/supabase/server'

/**
 * Leitura do catálogo para a área do aluno.
 *
 * Nenhuma função aqui filtra por "publicado" ou por permissão. Não é
 * esquecimento: quem filtra é a RLS. Se um aluno chamar `listThemes()`, o
 * Postgres devolve só os temas publicados; se um conteudista chamar, vêm os
 * rascunhos também. Repetir a regra aqui criaria dois lugares para ela
 * divergir — e o do meio seria o errado.
 *
 * `cache()` colapsa chamadas repetidas dentro da mesma requisição: a Home pede
 * temas, o rodapé pede temas, o banco é consultado uma vez.
 */

export const listThemes = cache(async (): Promise<Theme[]> => {
  const supabase = await createClient()
  const { data } = await supabase
    .from('themes')
    .select('id, slug, name, description, accent, position, status')
    .order('position')

  return (data ?? []).map((t) => ({
    id: t.id,
    slug: t.slug,
    name: t.name,
    description: t.description,
    accent: t.accent,
    position: t.position,
    status: t.status,
  }))
})

interface CourseFilters {
  format?: 'course' | 'masterclass'
  /** Só cursos ligados a este tema. */
  themeId?: string
  limit?: number
}

/**
 * Cursos em formato de card.
 *
 * Três consultas em vez de um embed: sem os tipos gerados do banco, o
 * supabase-js infere todo embed como array e o código vira uma sequência de
 * casts. Três consultas indexadas custam menos que isso — e voltam a ser uma
 * quando os tipos existirem.
 */
export const listCourses = cache(async (filters: CourseFilters = {}): Promise<CourseSummary[]> => {
  const supabase = await createClient()

  let ids: string[] | null = null
  if (filters.themeId) {
    const { data: links } = await supabase
      .from('course_themes')
      .select('course_id')
      .eq('theme_id', filters.themeId)
      .order('position')
    ids = (links ?? []).map((l) => l.course_id)
    if (ids.length === 0) return []
  }

  let query = supabase
    .from('courses')
    .select(
      'id, slug, title, summary, cover_url, format, duration_seconds, lesson_count, instructor_id, published_at, available_at',
    )
    .order('published_at', { ascending: false, nullsFirst: false })

  if (filters.format) query = query.eq('format', filters.format)
  if (ids) query = query.in('id', ids)
  if (filters.limit) query = query.limit(filters.limit)

  const { data: courses } = await query
  if (!courses || courses.length === 0) return []

  const courseIds = courses.map((c) => c.id)
  const instructorIds = [...new Set(courses.map((c) => c.instructor_id).filter(Boolean))] as string[]

  const [{ data: instructors }, { data: links }, allThemes] = await Promise.all([
    instructorIds.length
      ? supabase.from('instructors').select('id, name').in('id', instructorIds)
      : Promise.resolve({ data: [] as Array<{ id: string; name: string }> }),
    supabase.from('course_themes').select('course_id, theme_id').in('course_id', courseIds),
    listThemes(),
  ])

  const instructorName = new Map((instructors ?? []).map((i) => [i.id, i.name]))
  const themeName = new Map(allThemes.map((t) => [t.id, t.name]))

  const themesByCourse = new Map<string, string[]>()
  for (const link of links ?? []) {
    const name = themeName.get(link.theme_id)
    if (!name) continue
    themesByCourse.set(link.course_id, [...(themesByCourse.get(link.course_id) ?? []), name])
  }

  return courses.map((c) => ({
    id: c.id,
    slug: c.slug,
    title: c.title,
    summary: c.summary,
    coverUrl: c.cover_url,
    availableAt: c.available_at ?? null,
    format: c.format,
    durationSeconds: c.duration_seconds,
    lessonCount: c.lesson_count,
    instructorName: c.instructor_id ? (instructorName.get(c.instructor_id) ?? null) : null,
    themeNames: themesByCourse.get(c.id) ?? [],
  }))
})

export const getThemeBySlug = cache(async (slug: string): Promise<Theme | null> => {
  const supabase = await createClient()
  const { data } = await supabase
    .from('themes')
    .select('id, slug, name, description, accent, position, status')
    .eq('slug', slug)
    .maybeSingle()

  return data
    ? {
        id: data.id,
        slug: data.slug,
        name: data.name,
        description: data.description,
        accent: data.accent,
        position: data.position,
        status: data.status,
      }
    : null
})
