'use server'

import { revalidatePath } from 'next/cache'
import { pontosDoTexto } from '@/core/catalog/aprendizado'
import { type EstadoImagem, IMAGEM_PARADA } from '@/core/shared/imagem'
import { redirect } from 'next/navigation'
import { slugify } from '@/core/shared/slug'
import { apagarImagem, recusaDaUrl } from '@/lib/imagens'
import { getVideoProvider } from '@/lib/video'
import { can } from '@/core/identity/permissions'
import { getSession } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'

/**
 * Revalidar os DOIS lados.
 *
 * Antes só limpava o Studio. O aluno continuava vendo a versão em cache —
 * então trocar a capa "funcionava" no Admin e não mudava nada no curso, que é
 * exatamente o lugar onde a capa existe para ser vista.
 *
 * As rotas do aluno entram pela FORMA da rota (`/curso/[slug]`), não pelo
 * caminho concreto: assim um curso que mudou de slug, ou uma capa que aparece
 * em três listagens, não depende de alguém lembrar de listar cada uma.
 */
function revalidar(courseId: string) {
  revalidatePath(`/admin/cursos/${courseId}`)
  revalidatePath('/admin/cursos')
  revalidatePath('/admin')

  revalidatePath('/curso/[slug]', 'page')
  revalidatePath('/cursos')
  revalidatePath('/capacitacoes')
  revalidatePath('/mapa')
  revalidatePath('/')
}

// --- Curso -------------------------------------------------------------------

export async function atualizarCurso(formData: FormData) {
  const id = String(formData.get('id') ?? '')
  const title = String(formData.get('title') ?? '').trim()
  if (!id || title.length < 2) return

  const summary = String(formData.get('summary') ?? '').trim()
  const description = String(formData.get('description') ?? '').trim()
  const slug = slugify(String(formData.get('slug') ?? '') || title)
  const instructorId = String(formData.get('instructor_id') ?? '')
  const format = String(formData.get('format') ?? 'course')

  /*
   * "EM BREVE" É UMA DATA, NÃO UM ESTADO.
   *
   * Em branco = disponível assim que publicado. Data no futuro = aparece no
   * catálogo com o selo e não deixa entrar, e vira disponível SOZINHO no dia —
   * ninguém precisa lembrar de voltar aqui.
   *
   * O -03 é obrigatório: `<input type="date">` manda "2026-10-15" sem fuso, e
   * o Postgres leria como UTC, abrindo o curso às 21h do dia anterior.
   */
  const disponivelEm = String(formData.get('available_at') ?? '').trim()

  /*
   * A blindagem dos 7 dias. Vazio = abre junto com o acesso.
   *
   * É prazo POR ALUNO, contado da entrada dele — diferente de `available_at`,
   * que é data de calendário igual para todos. A trava de verdade está na RLS
   * (0024); este campo só grava o número.
   */
  const liberarApos = String(formData.get('release_after_days') ?? '').trim()

  /*
   * O teaser. Uma promessa por linha, e vazio é um estado legítimo — curso
   * publicado não espera copy. Sem pontos, a seção some da página do aluno em
   * vez de virar moldura vazia.
   */
  const pontos = pontosDoTexto(String(formData.get('learning_points') ?? ''))

  const supabase = await createClient()
  await supabase
    .from('courses')
    .update({
      title,
      slug,
      summary: summary || null,
      description: description || null,
      instructor_id: instructorId || null,
      format: format === 'masterclass' ? 'masterclass' : 'course',
      available_at: disponivelEm ? `${disponivelEm} 00:00:00-03` : null,
      release_after_days: liberarApos === '' ? null : Math.max(0, Number(liberarApos) || 0),
      learning_points: pontos,
    })
    .eq('id', id)

  revalidar(id)
}

/**
 * A capa do curso.
 *
 * `cover_url` existia desde 0003 e era lida em quatro telas; nunca houve como
 * preencher. Toda capa era nula, e todo cartão saía cinza.
 *
 * A antiga é apagada depois que a nova entrou — nessa ordem. O contrário
 * deixaria o curso sem capa nenhuma se o envio falhasse no meio.
 */
export async function enviarCapa(
  _prev: EstadoImagem,
  formData: FormData,
): Promise<EstadoImagem> {
  const id = String(formData.get('id') ?? '')
  const url = String(formData.get('url') ?? '')
  if (!id) return { erro: 'Curso não identificado.', url: null }

  const recusa = recusaDaUrl(url, 'capas')
  if (recusa) return { erro: recusa, url: null }

  const supabase = await createClient()
  const { data: antes } = await supabase
    .from('courses')
    .select('cover_url')
    .eq('id', id)
    .maybeSingle()

  const { error } = await supabase.from('courses').update({ cover_url: url }).eq('id', id)
  if (error) {
    // A imagem já está no bucket; dizer "deu certo" aqui seria mentira.
    await apagarImagem(url)
    return { erro: 'A imagem subiu, mas não consegui gravá-la no curso.', url: null }
  }

  await apagarImagem(antes?.cover_url)

  revalidar(id)
  return { erro: null, url }
}

/** Tirar a capa. Volta ao cartão sem imagem, que é um estado legítimo. */
export async function removerCapa(
  _prev: EstadoImagem,
  formData: FormData,
): Promise<EstadoImagem> {
  const id = String(formData.get('id') ?? '')
  if (!id) return { erro: 'Curso não identificado.', url: null }

  const supabase = await createClient()
  const { data: antes } = await supabase
    .from('courses')
    .select('cover_url')
    .eq('id', id)
    .maybeSingle()

  await supabase.from('courses').update({ cover_url: null }).eq('id', id)
  await apagarImagem(antes?.cover_url)

  revalidar(id)
  return IMAGEM_PARADA
}

/**
 * O BANNER DA PÁGINA DO CURSO.
 *
 * Arte larga no topo, separada da capa de propósito: a capa é 4:5 e vende o
 * curso de fora, no catálogo; o banner é 4:1 e recebe quem já entrou. São
 * peças diferentes, feitas em momentos diferentes, e amarrar as duas num
 * campo só obrigaria a arte de uma a servir para a outra.
 *
 * Opcional. Sem banner, a página abre pelo título — que é como ela abre hoje
 * e não parece falta.
 */
export async function enviarBannerCurso(
  _prev: EstadoImagem,
  formData: FormData,
): Promise<EstadoImagem> {
  const id = String(formData.get('id') ?? '')
  const url = String(formData.get('url') ?? '')
  if (!id) return { erro: 'Curso não identificado.', url: null }

  const recusa = recusaDaUrl(url, 'capas')
  if (recusa) return { erro: recusa, url: null }

  const supabase = await createClient()
  const { data: antes } = await supabase
    .from('courses')
    .select('banner_url')
    .eq('id', id)
    .maybeSingle()

  const { error } = await supabase.from('courses').update({ banner_url: url }).eq('id', id)
  if (error) {
    await apagarImagem(url)
    return { erro: 'A imagem subiu, mas não consegui gravá-la no curso.', url: null }
  }

  await apagarImagem(antes?.banner_url)

  revalidar(id)
  return { erro: null, url }
}

export async function removerBannerCurso(
  _prev: EstadoImagem,
  formData: FormData,
): Promise<EstadoImagem> {
  const id = String(formData.get('id') ?? '')
  if (!id) return { erro: 'Curso não identificado.', url: null }

  const supabase = await createClient()
  const { data: antes } = await supabase
    .from('courses')
    .select('banner_url')
    .eq('id', id)
    .maybeSingle()

  await supabase.from('courses').update({ banner_url: null }).eq('id', id)
  await apagarImagem(antes?.banner_url)

  revalidar(id)
  return IMAGEM_PARADA
}

/** Liga/desliga um tema no curso. N:N, então é toggle e não seleção única. */
export async function alternarTema(formData: FormData) {
  const courseId = String(formData.get('course_id') ?? '')
  const themeId = String(formData.get('theme_id') ?? '')
  const linked = String(formData.get('linked') ?? '') === 'true'
  if (!courseId || !themeId) return

  const supabase = await createClient()
  if (linked) {
    await supabase.from('course_themes').delete().eq('course_id', courseId).eq('theme_id', themeId)
  } else {
    await supabase.from('course_themes').insert({ course_id: courseId, theme_id: themeId })
  }
  revalidar(courseId)
}

/**
 * Publicar em cascata, e explícito.
 *
 * Publicar só o curso, deixando módulos e aulas em rascunho, produz uma página
 * vazia para o aluno — o pior resultado possível. Então publicar o curso
 * publica junto o que está pronto (aula com vídeo). O que não está, fica.
 */
export async function publicarCurso(formData: FormData) {
  const id = String(formData.get('id') ?? '')
  const current = String(formData.get('status') ?? '')
  if (!id) return

  const supabase = await createClient()

  if (current === 'published') {
    await supabase.from('courses').update({ status: 'draft', published_at: null }).eq('id', id)
    revalidar(id)
    return
  }

  await supabase
    .from('courses')
    .update({ status: 'published', published_at: new Date().toISOString() })
    .eq('id', id)

  await supabase.from('modules').update({ status: 'published' }).eq('course_id', id)

  // Só aula com vídeo entra no ar. Aula sem vídeo publicada é uma tela preta.
  await supabase
    .from('lessons')
    .update({ status: 'published' })
    .eq('course_id', id)
    .not('video_asset_id', 'is', null)

  revalidar(id)
}

// --- Módulos -----------------------------------------------------------------

export async function criarModulo(formData: FormData) {
  const courseId = String(formData.get('course_id') ?? '')
  const title = String(formData.get('title') ?? '').trim()
  if (!courseId || title.length < 2) return

  const supabase = await createClient()
  const { data: last } = await supabase
    .from('modules')
    .select('position')
    .eq('course_id', courseId)
    .order('position', { ascending: false })
    .limit(1)
    .maybeSingle()

  await supabase
    .from('modules')
    .insert({ course_id: courseId, title, position: (last?.position ?? 0) + 1, status: 'draft' })

  revalidar(courseId)
}

export async function renomearModulo(formData: FormData) {
  const id = String(formData.get('id') ?? '')
  const courseId = String(formData.get('course_id') ?? '')
  const title = String(formData.get('title') ?? '').trim()
  if (!id || title.length < 2) return

  const supabase = await createClient()
  await supabase.from('modules').update({ title }).eq('id', id)
  revalidar(courseId)
}

export async function apagarModulo(formData: FormData) {
  const id = String(formData.get('id') ?? '')
  const courseId = String(formData.get('course_id') ?? '')
  if (!id) return

  const supabase = await createClient()
  // Só apaga módulo vazio. Módulo com aula some com o trabalho junto.
  const { count } = await supabase
    .from('lessons')
    .select('id', { count: 'exact', head: true })
    .eq('module_id', id)

  if ((count ?? 0) === 0) await supabase.from('modules').delete().eq('id', id)
  revalidar(courseId)
}

// --- Aulas -------------------------------------------------------------------

export async function criarAula(formData: FormData) {
  const courseId = String(formData.get('course_id') ?? '')
  const moduleId = String(formData.get('module_id') ?? '')
  const title = String(formData.get('title') ?? '').trim()
  if (!courseId || !moduleId || title.length < 2) return

  const supabase = await createClient()
  const { data: last } = await supabase
    .from('lessons')
    .select('position')
    .eq('module_id', moduleId)
    .order('position', { ascending: false })
    .limit(1)
    .maybeSingle()

  const base = slugify(title)
  const { data: clash } = await supabase
    .from('lessons')
    .select('id')
    .eq('course_id', courseId)
    .eq('slug', base)
    .maybeSingle()

  const { data: lesson } = await supabase
    .from('lessons')
    .insert({
      module_id: moduleId,
      course_id: courseId,
      title,
      // O slug é único por curso. Duas aulas com o mesmo nome não podem
      // travar quem está escrevendo — desempata sozinho.
      slug: clash ? `${base}-${(last?.position ?? 0) + 1}` : base,
      position: (last?.position ?? 0) + 1,
      status: 'draft',
    })
    .select('id')
    .single()

  revalidar(courseId)
  if (lesson) redirect(`/admin/cursos/${courseId}/aula/${lesson.id}`)
}

export async function moverAula(formData: FormData) {
  const id = String(formData.get('id') ?? '')
  const moduleId = String(formData.get('module_id') ?? '')
  const courseId = String(formData.get('course_id') ?? '')
  const direction = String(formData.get('direction') ?? '')
  if (!id || !moduleId) return

  const supabase = await createClient()
  const { data: lessons } = await supabase
    .from('lessons')
    .select('id, position')
    .eq('module_id', moduleId)
    .order('position')
  if (!lessons) return

  const index = lessons.findIndex((l) => l.id === id)
  const current = lessons[index]
  const target = lessons[direction === 'up' ? index - 1 : index + 1]
  if (!current || !target) return

  await Promise.all([
    supabase.from('lessons').update({ position: target.position }).eq('id', current.id),
    supabase.from('lessons').update({ position: current.position }).eq('id', target.id),
  ])
  revalidar(courseId)
}

/**
 * Cria uma aula e DEVOLVE o id, sem redirecionar.
 *
 * `criarAula` termina com `redirect()` — ótimo para quem clicou em "Criar
 * aula" e quer escrever agora. Péssimo para soltar oito vídeos de uma vez: o
 * primeiro redirecionaria e os outros sete morreriam no caminho.
 *
 * O título vem do NOME DO ARQUIVO, limpo. "03 - Abertura da call.mp4" vira
 * "Abertura da call": quem exporta vídeo numera para ordenar na pasta, e esse
 * número é do sistema de arquivos, não do curso — a ordem aqui é a posição.
 */
export async function criarAulaParaUpload(
  courseId: string,
  moduleId: string,
  nomeDoArquivo: string,
): Promise<{ id: string; title: string } | null> {
  const session = await getSession()
  if (!session || !can(session.role, 'content.write')) return null

  const title =
    nomeDoArquivo
      .replace(/\.[^.]+$/, '')
      .replace(/^[\s\d]*[-_.)]\s*/, '')
      .replace(/[_-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim() || 'Aula sem título'

  const supabase = await createClient()
  const { data: last } = await supabase
    .from('lessons')
    .select('position')
    .eq('module_id', moduleId)
    .order('position', { ascending: false })
    .limit(1)
    .maybeSingle()

  const base = slugify(title)
  const { data: clash } = await supabase
    .from('lessons')
    .select('id')
    .eq('course_id', courseId)
    .eq('slug', base)
    .maybeSingle()

  const posicao = (last?.position ?? 0) + 1
  const { data: lesson } = await supabase
    .from('lessons')
    .insert({
      module_id: moduleId,
      course_id: courseId,
      title,
      slug: clash ? `${base}-${posicao}` : base,
      position: posicao,
      status: 'draft',
    })
    .select('id, title')
    .single()

  return lesson ? { id: lesson.id as string, title: lesson.title as string } : null
}

export interface EstadoExclusao {
  erro: string | null
}

/**
 * APAGAR O CURSO — e por que isto não é um botão.
 *
 * O `on delete cascade` do banco é generoso: some o curso, os módulos, as
 * aulas, os materiais, as habilidades mapeadas — e também o PROGRESSO, as
 * ANOTAÇÕES e as AULAS SALVAS de todo aluno que passou por ali. A anotação que
 * alguém escreveu há seis meses vai junto, e não há desfazer.
 *
 * Um clique é gesto barato demais para uma consequência desse tamanho. Por
 * isso a ação exige que o título do curso seja DIGITADO. Não é burocracia: é
 * o único jeito de garantir que a pessoa leu qual curso está apagando. Quem
 * digita "Branding - Marca Inconfundível" inteiro não está apagando por
 * engano.
 *
 * `orders` é RESTRICT no banco, então curso vendido não apaga de jeito nenhum
 * — e isso é decisão do schema, não desta função. Aqui a mensagem só traduz o
 * erro do Postgres para português.
 *
 * OS VÍDEOS SAEM DO PROVEDOR ANTES. Se o banco apagar primeiro, os ids se
 * perdem e os vídeos ficam no Bunny para sempre, cobrados, apontados por
 * ninguém. Falhar ao apagar um vídeo não impede o resto: órfão custa centavos,
 * e travar a exclusão por causa dele deixaria o curso pela metade.
 */
export async function apagarCurso(
  _prev: EstadoExclusao,
  formData: FormData,
): Promise<EstadoExclusao> {
  const id = String(formData.get('id') ?? '')
  const tituloDigitado = String(formData.get('confirmacao') ?? '').trim()
  if (!id) return { erro: 'Curso não identificado.' }

  const supabase = await createClient()
  const { data: curso } = await supabase
    .from('courses')
    .select('title, intro_video_asset_id')
    .eq('id', id)
    .maybeSingle()

  if (!curso) return { erro: 'Curso não encontrado, ou você não tem permissão.' }

  if (tituloDigitado !== curso.title) {
    return { erro: 'O título não confere. Digite exatamente como está escrito acima.' }
  }

  const { data: aulas } = await supabase
    .from('lessons')
    .select('video_asset_id')
    .eq('course_id', id)

  const assets = [
    ...(aulas ?? []).map((a) => a.video_asset_id),
    curso.intro_video_asset_id,
  ].filter((v): v is string => Boolean(v))

  for (const asset of assets) {
    try {
      await getVideoProvider().deleteAsset(asset)
    } catch {
      // Ver o comentário acima: órfão no provedor não trava a exclusão.
    }
  }

  const { error } = await supabase.from('courses').delete().eq('id', id)

  if (error) {
    return {
      erro: error.message.includes('orders')
        ? 'Este curso tem venda registrada e não pode ser apagado. Tire do ar em vez de apagar.'
        : 'Não consegui apagar o curso.',
    }
  }

  revalidar(id)
  redirect('/admin/cursos')
}
