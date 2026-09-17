'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { type EstadoImagem, IMAGEM_PARADA } from '@/core/shared/imagem'
import { apagarImagem, recusaDaUrl } from '@/lib/imagens'
import { createClient } from '@/lib/supabase/server'

/**
 * Salvamento automático dos dois campos longos.
 *
 * Perder vinte minutos de Para Saber escrito porque a pessoa esqueceu de clicar
 * em Salvar é o tipo de coisa que faz uma equipe abandonar a ferramenta. Então:
 * texto longo salva sozinho ao sair do campo; título, duração e publicação
 * salvam de forma explícita, porque mudam estrutura e a pessoa precisa
 * confirmar o que está fazendo.
 */
const CAMPOS_LONGOS = ['para_saber', 'para_fazer', 'description'] as const
type CampoLongo = (typeof CAMPOS_LONGOS)[number]

export async function salvarTexto(lessonId: string, field: string, value: string) {
  // Whitelist: o nome do campo vem do cliente e nunca entra numa query sem
  // passar por aqui.
  if (!CAMPOS_LONGOS.includes(field as CampoLongo)) {
    return { ok: false, error: 'Campo inválido.' }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('lessons')
    .update({ [field]: value.trim() || null })
    .eq('id', lessonId)

  if (error) return { ok: false, error: 'Não consegui salvar.' }
  return { ok: true, error: null }
}

export async function atualizarAula(formData: FormData) {
  const id = String(formData.get('id') ?? '')
  const courseId = String(formData.get('course_id') ?? '')
  const title = String(formData.get('title') ?? '').trim()
  if (!id || title.length < 2) return

  const minutes = Number(formData.get('duration_minutes') ?? 0)
  const durationSeconds = Number.isFinite(minutes) && minutes > 0 ? Math.round(minutes * 60) : 0

  const supabase = await createClient()
  await supabase.from('lessons').update({ title, duration_seconds: durationSeconds }).eq('id', id)

  revalidatePath(`/admin/cursos/${courseId}/aula/${id}`)
  revalidatePath(`/admin/cursos/${courseId}`)
}

/**
 * A MINIATURA DA AULA.
 *
 * O catálogo usa a thumbnail que o Bunny gera sozinho, e ela falha de dois
 * jeitos: vídeo ainda processando (não existe imagem) ou frame automático num
 * quadro preto. Nos dois casos o aluno vê ícone de imagem quebrada.
 *
 * Esta é a saída manual. Quando existe, vence a automática.
 */
export async function enviarThumb(
  _prev: EstadoImagem,
  formData: FormData,
): Promise<EstadoImagem> {
  const id = String(formData.get('id') ?? '')
  const courseId = String(formData.get('course_id') ?? '')
  const url = String(formData.get('url') ?? '')
  if (!id) return { erro: 'Aula não identificada.', url: null }

  const recusa = recusaDaUrl(url, 'capas')
  if (recusa) return { erro: recusa, url: null }

  const supabase = await createClient()
  const { data: antes } = await supabase
    .from('lessons')
    .select('thumbnail_url')
    .eq('id', id)
    .maybeSingle()

  const { error } = await supabase.from('lessons').update({ thumbnail_url: url }).eq('id', id)
  if (error) {
    await apagarImagem(url)
    return { erro: 'A imagem subiu, mas não consegui gravá-la na aula.', url: null }
  }

  await apagarImagem(antes?.thumbnail_url)
  revalidatePath(`/admin/cursos/${courseId}/aula/${id}`)
  revalidatePath(`/admin/cursos/${courseId}`)
  revalidatePath('/curso/[slug]', 'page')
  return { erro: null, url }
}

export async function removerThumb(
  _prev: EstadoImagem,
  formData: FormData,
): Promise<EstadoImagem> {
  const id = String(formData.get('id') ?? '')
  const courseId = String(formData.get('course_id') ?? '')
  if (!id) return { erro: 'Aula não identificada.', url: null }

  const supabase = await createClient()
  const { data: antes } = await supabase
    .from('lessons')
    .select('thumbnail_url')
    .eq('id', id)
    .maybeSingle()

  await supabase.from('lessons').update({ thumbnail_url: null }).eq('id', id)
  await apagarImagem(antes?.thumbnail_url)

  revalidatePath(`/admin/cursos/${courseId}/aula/${id}`)
  revalidatePath(`/admin/cursos/${courseId}`)
  revalidatePath('/curso/[slug]', 'page')
  return IMAGEM_PARADA
}

export async function publicarAula(formData: FormData) {
  const id = String(formData.get('id') ?? '')
  const courseId = String(formData.get('course_id') ?? '')
  const current = String(formData.get('status') ?? '')
  if (!id) return

  const supabase = await createClient()
  await supabase
    .from('lessons')
    .update({ status: current === 'published' ? 'draft' : 'published' })
    .eq('id', id)

  revalidatePath(`/admin/cursos/${courseId}/aula/${id}`)
  revalidatePath(`/admin/cursos/${courseId}`)
  revalidatePath('/admin')
}

export async function apagarAula(formData: FormData) {
  const id = String(formData.get('id') ?? '')
  const courseId = String(formData.get('course_id') ?? '')
  if (!id) return

  const supabase = await createClient()
  await supabase.from('lessons').delete().eq('id', id)

  revalidatePath(`/admin/cursos/${courseId}`)
  redirect(`/admin/cursos/${courseId}`)
}

/* --- Materiais ------------------------------------------------------------
 *
 * Material é o que sobra depois da aula: o modelo de proposta, a planilha, o
 * checklist. Na Allen isso pesa mais que em uma escola comum — o Para Fazer
 * pede uma ação concreta, e o material costuma ser a ferramenta dessa ação.
 *
 * Três tipos, e a diferença é honesta: `template` é o que o aluno vai usar
 * para EXECUTAR o Para Fazer, `file` é anexo, `link` é referência externa.
 * Por isso o modelo aparece primeiro na lista do aluno.
 */

const TIPOS = ['template', 'file', 'link'] as const
type TipoMaterial = (typeof TIPOS)[number]

export async function adicionarMaterial(formData: FormData) {
  const lessonId = String(formData.get('lesson_id') ?? '')
  const courseId = String(formData.get('course_id') ?? '')
  const title = String(formData.get('title') ?? '').trim()
  const url = String(formData.get('url') ?? '').trim()
  const kindRaw = String(formData.get('kind') ?? 'file')
  if (!lessonId || title.length < 2 || !url) return

  // O tipo vem de um <select>, mas chega como texto do cliente como qualquer
  // outro campo. A whitelist é o que impede um valor inventado de chegar ao enum.
  const kind: TipoMaterial = TIPOS.includes(kindRaw as TipoMaterial)
    ? (kindRaw as TipoMaterial)
    : 'file'

  // Só http(s). Sem isto, um `javascript:` colado aqui viraria link clicável
  // na tela do aluno.
  let href: URL
  try {
    href = new URL(url)
  } catch {
    return
  }
  if (href.protocol !== 'https:' && href.protocol !== 'http:') return

  const supabase = await createClient()

  const { data: ultimo } = await supabase
    .from('materials')
    .select('position')
    .eq('lesson_id', lessonId)
    .order('position', { ascending: false })
    .limit(1)
    .maybeSingle()

  await supabase.from('materials').insert({
    lesson_id: lessonId,
    course_id: null,
    kind,
    title,
    url: href.toString(),
    position: (ultimo?.position ?? 0) + 1,
  })

  revalidatePath(`/admin/cursos/${courseId}/aula/${lessonId}`)
}

export async function removerMaterial(formData: FormData) {
  const id = String(formData.get('id') ?? '')
  const lessonId = String(formData.get('lesson_id') ?? '')
  const courseId = String(formData.get('course_id') ?? '')
  if (!id) return

  const supabase = await createClient()
  await supabase.from('materials').delete().eq('id', id)

  revalidatePath(`/admin/cursos/${courseId}/aula/${lessonId}`)
}

/* --- Habilidades ----------------------------------------------------------
 *
 * A única entrada humana da camada de skills (D-08).
 *
 * O banco grava sinal a cada aula concluída e a cada aplicação marcada desde
 * a migration 0005 — mas o gatilho lê `lesson_skills`. Aula sem habilidade
 * mapeada gera zero sinais: a camada roda, e grava nada. Este par de ações é
 * o que faz o histórico existir de verdade.
 */

export async function alternarHabilidade(formData: FormData) {
  const lessonId = String(formData.get('lesson_id') ?? '')
  const courseId = String(formData.get('course_id') ?? '')
  const skillId = String(formData.get('skill_id') ?? '')
  const ligada = String(formData.get('ligada') ?? '') === 'true'
  if (!lessonId || !skillId) return

  const supabase = await createClient()

  if (ligada) {
    await supabase
      .from('lesson_skills')
      .delete()
      .eq('lesson_id', lessonId)
      .eq('skill_id', skillId)
  } else {
    await supabase
      .from('lesson_skills')
      .insert({ lesson_id: lessonId, skill_id: skillId, weight: 1 })
  }

  revalidatePath(`/admin/cursos/${courseId}/aula/${lessonId}`)
}

/**
 * Peso: quanto ESTA aula desenvolve ESTA habilidade.
 *
 * O banco aceita de 0.01 a 10, mas a tela oferece três degraus. Um campo livre
 * faria alguém escolher entre 2.4 e 2.6 numa medida que nunca teve essa
 * precisão — e a diferença entre "toca no assunto" e "é o assunto" é toda a
 * informação que existe aqui.
 */
export async function ajustarPesoHabilidade(formData: FormData) {
  const lessonId = String(formData.get('lesson_id') ?? '')
  const courseId = String(formData.get('course_id') ?? '')
  const skillId = String(formData.get('skill_id') ?? '')
  const peso = Number(formData.get('weight') ?? 1)
  if (!lessonId || !skillId) return
  if (!Number.isFinite(peso) || peso <= 0 || peso > 10) return

  const supabase = await createClient()
  await supabase
    .from('lesson_skills')
    .update({ weight: peso })
    .eq('lesson_id', lessonId)
    .eq('skill_id', skillId)

  revalidatePath(`/admin/cursos/${courseId}/aula/${lessonId}`)
}
