'use server'

import { revalidatePath } from 'next/cache'
import { getVideoProvider } from '@/lib/video'
import { createClient } from '@/lib/supabase/server'

export interface TicketUpload {
  ok: boolean
  erro: string | null
  /** Dados que o cliente TUS precisa. A chave da biblioteca nunca vem aqui. */
  tus: {
    endpoint: string
    libraryId: string
    videoId: string
    expires: number
    signature: string
  } | null
}

/**
 * Prepara o envio de um vídeo.
 *
 * O arquivo vai do navegador direto para o Bunny — nunca passa pelo nosso
 * servidor. Dois motivos: a Vercel limita o corpo de uma função serverless a
 * poucos megabytes (um vídeo não caberia), e trafegar o arquivo duas vezes
 * seria desperdício puro.
 *
 * O que o servidor faz é assinar a permissão. A chave da biblioteca fica aqui.
 */
export async function prepararUpload(lessonId: string, titulo: string): Promise<TicketUpload> {
  const supabase = await createClient()

  // A RLS decide se esta pessoa pode escrever nesta aula. Se não puder, o
  // update abaixo não afeta linha nenhuma e o vídeo criado fica órfão — por
  // isso conferimos ANTES de criar qualquer coisa no Bunny.
  const { data: aula } = await supabase.from('lessons').select('id').eq('id', lessonId).maybeSingle()
  if (!aula) return { ok: false, erro: 'Aula não encontrada, ou você não tem permissão.', tus: null }

  try {
    const provider = getVideoProvider()
    const ticket = (await provider.createUploadTicket({ title: titulo })) as Awaited<
      ReturnType<typeof provider.createUploadTicket>
    > & { tus: { libraryId: string; videoId: string; expires: number; signature: string } }

    const { error } = await supabase
      .from('lessons')
      .update({ video_provider: provider.name, video_asset_id: ticket.assetId })
      .eq('id', lessonId)

    if (error) {
      // Não deixa lixo no Bunny se o banco recusou.
      await provider.deleteAsset(ticket.assetId)
      return { ok: false, erro: 'Não consegui vincular o vídeo à aula.', tus: null }
    }

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

/**
 * Consulta o processamento e, quando pronto, grava a duração real.
 *
 * A duração deixa de ser um campo que alguém digita errado: vem do arquivo.
 */
export async function verificarProcessamento(lessonId: string, courseId: string) {
  const supabase = await createClient()
  const { data: aula } = await supabase
    .from('lessons')
    .select('video_asset_id, duration_seconds')
    .eq('id', lessonId)
    .maybeSingle()

  if (!aula?.video_asset_id) return { estado: 'sem-video' as const, duracao: null }

  try {
    const status = await getVideoProvider().getAssetStatus(aula.video_asset_id)

    if (status.state === 'ready' && status.durationSeconds && !aula.duration_seconds) {
      await supabase
        .from('lessons')
        .update({ duration_seconds: Math.round(status.durationSeconds) })
        .eq('id', lessonId)
      revalidatePath(`/admin/cursos/${courseId}/aula/${lessonId}`)
      revalidatePath(`/admin/cursos/${courseId}`)
    }

    return { estado: status.state, duracao: status.durationSeconds }
  } catch {
    return { estado: 'errored' as const, duracao: null }
  }
}

export async function removerVideo(lessonId: string, courseId: string) {
  const supabase = await createClient()
  const { data: aula } = await supabase
    .from('lessons')
    .select('video_asset_id')
    .eq('id', lessonId)
    .maybeSingle()

  // Despublica junto: aula publicada sem vídeo é tela preta para o aluno.
  const { error } = await supabase
    .from('lessons')
    .update({ video_asset_id: null, video_provider: null, duration_seconds: 0, status: 'draft' })
    .eq('id', lessonId)

  if (!error && aula?.video_asset_id) {
    try {
      await getVideoProvider().deleteAsset(aula.video_asset_id)
    } catch {
      // O vínculo já caiu. Um arquivo órfão no Bunny custa centavos e some
      // na próxima limpeza — não vale travar a ação da pessoa por isso.
    }
  }

  revalidatePath(`/admin/cursos/${courseId}/aula/${lessonId}`)
  revalidatePath(`/admin/cursos/${courseId}`)
}
