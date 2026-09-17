'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getVideoProvider } from '@/lib/video'
import type { TicketUpload } from '../cursos/[id]/aula/[lessonId]/video-actions'

/**
 * O VÍDEO DE BOAS-VINDAS DA HOME.
 *
 * Mesmo mecanismo do teaser de curso: o arquivo vai do navegador direto ao
 * provedor, e o servidor só assina a permissão e guarda o id.
 *
 * Mora junto do Banner e não junto dos Cursos porque o que se edita aqui é a
 * HOME — quem vai trocar a mensagem de boas-vindas está pensando na tela de
 * entrada, não num curso.
 */
export async function prepararBoasVindas(): Promise<TicketUpload> {
  const supabase = await createClient()

  try {
    const provider = getVideoProvider()
    const ticket = (await provider.createUploadTicket({
      title: 'Boas-vindas · Allen Escola',
    })) as Awaited<ReturnType<typeof provider.createUploadTicket>> & {
      tus: { libraryId: string; videoId: string; expires: number; signature: string }
    }

    const { error } = await supabase
      .from('home_intro')
      .update({ video_provider: provider.name, video_asset_id: ticket.assetId })
      .eq('id', 1)

    if (error) {
      // Sem isto, um vídeo criado no provedor ficaria órfão quando a RLS
      // recusasse a escrita — cobrado para sempre, apontado por ninguém.
      await provider.deleteAsset(ticket.assetId)
      return { ok: false, erro: 'Não consegui vincular o vídeo à Home.', tus: null }
    }

    revalidatePath('/admin/banner')
    revalidatePath('/')

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

/** Tira o vídeo. Sem ele, o bloco de boas-vindas some da Home. */
export async function removerBoasVindas() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('home_intro')
    .select('video_asset_id')
    .eq('id', 1)
    .maybeSingle()

  await supabase
    .from('home_intro')
    .update({ video_asset_id: null, video_provider: null })
    .eq('id', 1)

  if (data?.video_asset_id) {
    try {
      await getVideoProvider().deleteAsset(data.video_asset_id)
    } catch {
      // Órfão no provedor custa centavos; apontar para vídeo inexistente o
      // aluno vê. A ordem importa mais que o resultado desta linha.
    }
  }

  revalidatePath('/admin/banner')
  revalidatePath('/')
}

/** O texto ao lado do vídeo. Todo opcional: um vídeo pode falar sozinho. */
export async function salvarTextoBoasVindas(formData: FormData) {
  const texto = (campo: string) => {
    const v = String(formData.get(campo) ?? '').trim()
    return v === '' ? null : v
  }

  const supabase = await createClient()
  await supabase
    .from('home_intro')
    .update({ eyebrow: texto('eyebrow'), title: texto('title'), subtitle: texto('subtitle') })
    .eq('id', 1)

  revalidatePath('/admin/banner')
  revalidatePath('/')
}
