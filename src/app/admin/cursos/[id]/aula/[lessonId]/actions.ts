'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
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
