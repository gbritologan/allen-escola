import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { requireSession } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import { Passos, type CursoParaComecar } from './passos'

export const metadata: Metadata = { title: 'Bem-vindo' }

/**
 * AS BOAS-VINDAS.
 *
 * Aparecem UMA vez, no primeiro acesso. Quem já passou por aqui e voltar pela
 * URL é mandado para a Home — a tela não tem nada a dizer para quem já sabe, e
 * um onboarding que reaparece é um onboarding que ninguém respeita.
 */
export default async function BemVindoPage() {
  const session = await requireSession()
  if (session.profile?.onboardedAt) redirect('/')

  const supabase = await createClient()

  /*
   * Só três cursos, e os primeiros da ordem editorial.
   *
   * Uma lista longa aqui vira parede de escolha no exato momento em que a
   * pessoa menos sabe escolher — é o oposto do que o passo pede (briefing §35:
   * sem parede de escolha na entrada).
   */
  const { data: cursos } = await supabase
    .from('courses')
    .select('slug, title, summary, id')
    .eq('status', 'published')
    .order('published_at', { ascending: false, nullsFirst: false })
    .limit(3)

  const ids = (cursos ?? []).map((c) => c.id)
  const [{ data: vinculos }, { data: temas }] = await Promise.all([
    ids.length
      ? supabase.from('course_themes').select('course_id, theme_id').in('course_id', ids)
      : Promise.resolve({ data: [] as Array<{ course_id: string; theme_id: string }> }),
    supabase.from('themes').select('id, name'),
  ])

  const nomeDoTema = new Map((temas ?? []).map((t) => [t.id, t.name as string]))
  const temaDoCurso = new Map<string, string>()
  for (const v of vinculos ?? []) {
    if (!temaDoCurso.has(v.course_id)) temaDoCurso.set(v.course_id, v.theme_id)
  }

  const lista: CursoParaComecar[] = (cursos ?? []).map((c) => ({
    slug: c.slug as string,
    title: c.title as string,
    summary: c.summary as string | null,
    temaNome: nomeDoTema.get(temaDoCurso.get(c.id) ?? '') ?? null,
  }))

  return (
    <Passos nome={session.profile?.fullName ?? session.email ?? ''} cursos={lista} />
  )
}
