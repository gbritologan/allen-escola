import type { VideoProviderName } from '../catalog/types'

/**
 * Contrato de vídeo (D-17).
 *
 * Toda a plataforma fala com esta interface. Bunny Stream é a recomendação
 * para o lançamento — custo marginal de entrega e CDN forte no Brasil — e Mux
 * continua sendo uma troca de implementação, não uma refatoração.
 *
 * Regra inegociável: a URL de reprodução é **sempre** assinada, de curta
 * duração, e gerada no servidor. Chave de biblioteca nunca chega ao cliente.
 */

export interface PlaybackTicket {
  /** Manifesto HLS assinado. */
  url: string
  /** Poster, quando o provedor oferece. */
  posterUrl: string | null
  /** Momento em que a assinatura expira. O cliente renova antes disso. */
  expiresAt: string
}

export interface UploadTicket {
  /** Endereço para o navegador enviar o arquivo direto ao provedor. */
  uploadUrl: string
  /** Identificador a gravar em `lessons.video_asset_id`. */
  assetId: string
}

export type AssetState = 'uploading' | 'processing' | 'ready' | 'errored'

export interface AssetStatus {
  state: AssetState
  durationSeconds: number | null
  errorMessage: string | null
}

export interface VideoProvider {
  readonly name: VideoProviderName

  /** Upload direto do navegador: a tela nunca fica presa esperando o arquivo. */
  createUploadTicket(input: { title: string }): Promise<UploadTicket>

  /** Chamado enquanto o vídeo processa, para o Studio mostrar progresso real. */
  getAssetStatus(assetId: string): Promise<AssetStatus>

  /** Gera a URL assinada de reprodução para um aluno específico. */
  createPlaybackTicket(input: {
    assetId: string
    /** Amarra o ticket ao usuário — link vazado não vira link público. */
    viewerId: string
    ttlSeconds?: number
  }): Promise<PlaybackTicket>

  deleteAsset(assetId: string): Promise<void>
}

/** TTL padrão: longo o bastante para uma aula, curto o bastante para não circular. */
export const DEFAULT_PLAYBACK_TTL_SECONDS = 60 * 90
