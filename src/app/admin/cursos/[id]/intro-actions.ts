'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getVideoProvider } from '@/lib/video'
import type { TicketUpload } from './aula/[lessonId]/video-actions'

/**
 * O TEASER DO CURSO — mesmo mecanismo da aula, alvo diferente.
 *
 * O arquivo vai do navegador direto para o Bunny; o servidor só assina a
 * permissão e guarda o id. A chave da biblioteca nunca sai daqui.
 *
 * Existe separado de `prepararUpload` porque o alvo é outra tabela e outra
 * coluna. Generalizar as duas numa função com um parâmetro "tipo" economizaria
 * vinte linhas e custaria a clareza de saber, lendo o nome, o que cada uma
 * escreve.
 */
export async function prepararIntro(courseId: string, titulo: string): Promise<TicketUpload> {
  const supabase = await createClient()

  // A RLS decide. Se esta pessoa não pode escrever no curso, o update abaixo
  // não afetaria linha nenhuma e o vídeo ficaria órfão no Bunny — por isso a
  // conferência vem ANTES de criar qualquer coisa lá.
  const { data: curso } = await supabase
    .from('courses')
    .select('id')
    .eq('id', courseId)
    .maybeSingle()
  if (!curso) return { ok: false, erro: 'Curso não encontrado, ou sem permissão.', tus: null }

  try {
    const provider = getVideoProvider()
    const ticket = (await provider.createUploadTicket({ title: `Teaser · ${titulo}` })) as Awaited<
      ReturnType<typeof provider.createUploadTicket>
    > & { tus: { libraryId: string; videoId: string; expires: number; signature: string } }

    const { error } = await supabase
      .from('courses')
      .update({ intro_video_provider: provider.name, intro_video_asset_id: ticket.assetId })
      .eq('id', courseId)

    if (error) {
      await provider.deleteAsset(ticket.assetId)
      return { ok: false, erro: 'Não consegui vincular o vídeo ao curso.', tus: null }
    }

    revalidatePath(`/admin/cursos/${courseId}`)
    revalidatePath('/curso/[slug]', 'page')

    return {
      ok: true,
      erro: null,
      tus: {
        endpoint: ticket.uploadUrl,
        libraryId: ticket.tus.libraryId,
        videoId: ticket.tus.videoId,
        expires: ticket.tus.expires,
        signature: ticket.tus.signature,
      },
    }
  } catch (e) {
    return {
      ok: false,
      erro: e instanceof Error ? e.message : 'Não consegui falar com o provedor de vídeo.',
      tus: null,
    }
  }
}

/** Tira o teaser. O herói do curso volta para a arte de capa, que é um estado legítimo. */
export async function removerIntro(formData: FormData) {
  const courseId = String(formData.get('id') ?? '')
  if (!courseId) return

  const supabase = await createClient()
  const { data: curso } = await supabase
    .from('courses')
    .select('intro_video_asset_id')
    .eq('id', courseId)
    .maybeSingle()

  await supabase
    .from('courses')
    .update({ intro_video_asset_id: null, intro_video_provider: null })
    .eq('id', courseId)

  // O asset sai do Bunny depois do banco: falhar aqui deixa um vídeo órfão,
  // que custa centavos; falhar antes deixaria o curso apontando para um vídeo
  // que não existe mais, e isso o aluno vê.
  if (curso?.intro_video_asset_id) {
    try {
      await getVideoProvider().deleteAsset(curso.intro_video_asset_id)
    } catch {
      // Silencioso de propósito: a remoção principal já aconteceu.
    }
  }

  revalidatePath(`/admin/cursos/${courseId}`)
  revalidatePath('/curso/[slug]', 'page')
}
