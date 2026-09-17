'use server'

import { requireSession } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import { getVideoProvider, videoConfigurado } from '@/lib/video'

export interface MaterialDaAula {
  id: string
  title: string
  url: string
  kind: string
}

export interface AnotacaoDaAula {
  id: string
  body: string
  at_seconds: number | null
}

export interface AulaAberta {
  id: string
  slug: string
  title: string
  description: string | null
  paraSaber: string | null
  paraFazer: string | null
  durationSeconds: number
  moduloTitulo: string | null
  video: { url: string; poster: string | null } | null
  posicaoInicial: number
  concluida: boolean
  aplicada: boolean
  salva: boolean
  materiais: MaterialDaAula[]
  anotacoes: AnotacaoDaAula[]
}

/**
 * TUDO O QUE UMA AULA PRECISA PARA ABRIR, NUMA CHAMADA.
 *
 * A sala de aula troca de aula sem trocar de página, então esta é a função
 * que substitui o que antes era uma navegação inteira. Ela busca de uma vez o
 * que a página buscava: o texto, o progresso, a aplicação, os materiais e as
 * anotações — e assina o ticket de reprodução.
 *
 * ─── A SEGURANÇA NÃO MUDOU DE LUGAR ──────────────────────────────────────
 *
 * Quem decide se esta pessoa pode ver esta aula continua sendo a RLS. Se ela
 * não puder, o `select` volta vazio e a função devolve `null` — não há
 * checagem de permissão escrita aqui, porque escrever uma seria criar um
 * segundo lugar para a regra divergir (D-11).
 *
 * Isso importa mais agora do que antes: numa navegação, uma rota protegida
 * barrava a entrada. Aqui o cliente pede qualquer id de aula que quiser — e a
 * resposta certa continua vindo do Postgres, não da nossa educação.
 *
 * O ticket é assinado a cada abertura e expira. Trocar de aula dez vezes gera
 * dez tickets curtos, o que é mais seguro que um longo.
 */
export async function abrirAula(lessonId: string): Promise<AulaAberta | null> {
  const session = await requireSession()
  const supabase = await createClient()

  const { data: lesson } = await supabase
    .from('lessons')
    .select(
      'id, slug, title, description, duration_seconds, video_asset_id, para_saber, para_fazer, module_id',
    )
    .eq('id', lessonId)
    .maybeSingle()

  if (!lesson) return null

  const [
    { data: mod },
    { data: progresso },
    { data: aplicacao },
    { data: salvo },
    { data: materiais },
    { data: anotacoes },
  ] = await Promise.all([
    supabase.from('modules').select('title').eq('id', lesson.module_id).maybeSingle(),
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
      .from('saved_lessons')
      .select('lesson_id')
      .eq('user_id', session.userId)
      .eq('lesson_id', lesson.id)
      .maybeSingle(),
    supabase
      .from('materials')
      .select('id, title, url, kind')
      .eq('lesson_id', lesson.id),
    supabase
      .from('lesson_notes')
      .select('id, body, at_seconds')
      .eq('user_id', session.userId)
      .eq('lesson_id', lesson.id)
      .order('at_seconds', { ascending: true, nullsFirst: false }),
  ])

  let video: { url: string; poster: string | null } | null = null
  if (lesson.video_asset_id && videoConfigurado()) {
    try {
      const ticket = await getVideoProvider().createPlaybackTicket({
        assetId: lesson.video_asset_id,
        viewerId: session.userId,
      })
      video = { url: ticket.url, poster: ticket.posterUrl }
    } catch {
      // Provedor fora do ar não pode impedir a leitura do Para Saber e do
      // Para Fazer — que é onde mora metade do valor da aula.
      video = null
    }
  }

  /*
   * Abrir a aula já conta como começar.
   *
   * Sem isto, quem abre e assiste sem chegar aos 92% ficaria sem registro
   * nenhum — e "continue de onde parou" não teria onde parar.
   */
  if (!progresso) {
    await supabase.from('lesson_progress').upsert(
      { user_id: session.userId, lesson_id: lesson.id, state: 'in_progress' },
      { onConflict: 'user_id,lesson_id' },
    )
  }

  return {
    id: lesson.id,
    slug: lesson.slug,
    title: lesson.title,
    description: lesson.description,
    paraSaber: lesson.para_saber,
    paraFazer: lesson.para_fazer,
    durationSeconds: lesson.duration_seconds,
    moduloTitulo: mod?.title ?? null,
    video,
    posicaoInicial: progresso?.position_seconds ?? 0,
    concluida: progresso?.state === 'completed',
    aplicada: Boolean(aplicacao),
    salva: Boolean(salvo),
    materiais: (materiais ?? []) as MaterialDaAula[],
    anotacoes: (anotacoes ?? []) as AnotacaoDaAula[],
  }
}
