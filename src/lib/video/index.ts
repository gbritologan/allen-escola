import 'server-only'
import type { VideoProvider } from '@/core/video/provider'
import { bunnyProvider } from './bunny'

/**
 * O único lugar que decide qual provedor de vídeo está no ar (D-17).
 *
 * Trocar Bunny por Mux é escrever `mux.ts` e adicionar uma linha aqui — o
 * resto da aplicação fala com a interface, não com o fornecedor. Foi por isso
 * que o contrato veio antes da implementação.
 */
export function getVideoProvider(): VideoProvider {
  const escolhido = process.env.VIDEO_PROVIDER ?? 'bunny'

  switch (escolhido) {
    case 'bunny':
      return bunnyProvider
    default:
      throw new Error(
        `VIDEO_PROVIDER="${escolhido}" não tem implementação. Hoje existe: bunny.`,
      )
  }
}

export function videoConfigurado(): boolean {
  return Boolean(
    process.env.BUNNY_STREAM_LIBRARY_ID &&
      process.env.BUNNY_STREAM_API_KEY &&
      process.env.BUNNY_STREAM_CDN_HOSTNAME,
  )
}
