import type { Metadata } from 'next'
import { montarMapa } from '@/core/mapa/layout'
import { requireSession } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import { Ceu } from './ceu'

export const metadata: Metadata = { title: 'O Mapa' }

/**
 * O MAPA.
 *
 * Um catálogo em lista responde "o que existe". O mapa responde "onde eu
 * estou" — e é essa a pergunta que faz alguém abrir a plataforma, não saber
 * por onde continuar, e fechar.
 *
 * Cada tema é uma constelação, cada curso uma estrela, cada aula um ponto em
 * volta dela. E a estrela acende com APLICAÇÃO, nunca com visualização: o céu
 * é o retrato do que a pessoa fez.
 *
 * Todo o cálculo de posição está em `core/mapa/layout.ts`, puro e testado.
 * Esta página só busca os dados e entrega. Quem desenha não decide nada.
 */
export default async function MapaPage() {
  const session = await requireSession()
  const supabase = await createClient()

  const [{ data: temas }, { data: cursos }, { data: vinculos }] = await Promise.all([
    supabase
      .from('themes')
      .select('id, slug, name, description, icon')
      .eq('status', 'published')
      .order('position'),
    supabase
      .from('courses')
      .select('id, slug, title, lesson_count, duration_seconds')
      .eq('status', 'published'),
    supabase.from('course_themes').select('course_id, theme_id'),
  ])

  const idsCursos = (cursos ?? []).map((c) => c.id)

  const [{ data: aulas }, { data: progresso }, { data: aplicacoes }] = await Promise.all([
    idsCursos.length
      ? supabase
          .from('lessons')
          .select('id, title, course_id')
          .in('course_id', idsCursos)
          .eq('status', 'published')
      : Promise.resolve({ data: [] as Array<{ id: string; title: string; course_id: string }> }),
    supabase
      .from('lesson_progress')
      .select('lesson_id, state')
      .eq('user_id', session.userId),
    supabase.from('applications').select('lesson_id').eq('user_id', session.userId),
  ])

  const concluidas = new Set(
    (progresso ?? []).filter((p) => p.state === 'completed').map((p) => p.lesson_id),
  )
  const aplicadas = new Set((aplicacoes ?? []).map((a) => a.lesson_id))

  // Um curso pode estar em vários temas; no céu ele aparece no primeiro, senão
  // a mesma estrela existiria duas vezes e o mapa mentiria sobre o tamanho do
  // catálogo.
  const temaDoCurso = new Map<string, string>()
  for (const v of vinculos ?? []) {
    if (!temaDoCurso.has(v.course_id)) temaDoCurso.set(v.course_id, v.theme_id)
  }

  const mapa = montarMapa(
    temas ?? [],
    (cursos ?? []).map((c) => ({
      id: c.id,
      slug: c.slug,
      title: c.title,
      temaId: temaDoCurso.get(c.id) ?? null,
      lessonCount: c.lesson_count,
      durationSeconds: c.duration_seconds,
    })),
    (aulas ?? []).map((a) => ({
      id: a.id,
      courseId: a.course_id,
      title: a.title,
      vista: concluidas.has(a.id),
      aplicada: aplicadas.has(a.id),
    })),
    (session.profile?.fullName ?? session.email ?? 'Você').split(' ')[0] ?? 'Você',
  )

  const constelacoes = mapa.astros.filter((a) => a.tipo === 'tema')

  return (
    <>
      <Ceu mapa={mapa} temas={constelacoes} />

      {/* A legenda existe porque a regra do produto precisa estar escrita na
          tela onde ela é aplicada, não só na Ajuda.

          Ela usa CINZA de propósito. Desde que o matiz passou a identificar a
          constelação, uma bolinha azul ao lado de "aplicada" passaria a
          informação errada — o que separa os três estados é o BRILHO, e é o
          brilho que a legenda mostra. */}
      <div className="pointer-events-none absolute bottom-24 left-4 flex flex-col gap-1.5 md:bottom-8">
        <Legenda cor="bg-[hsl(244_82%_64%)]" texto="aplicada" />
        <Legenda cor="bg-[hsl(244_22%_60%)]" texto="assistida" />
        <Legenda cor="bg-[hsl(244_14%_34%)]" texto="não começou" />
      </div>
    </>
  )
}

function Legenda({ cor, texto }: { cor: string; texto: string }) {
  return (
    <span className="flex items-center gap-2 text-caption text-ink-4">
      <span aria-hidden className={`size-1.5 rounded-full ${cor}`} />
      {texto}
    </span>
  )
}
