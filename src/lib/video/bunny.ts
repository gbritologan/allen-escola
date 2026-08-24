import 'server-only'
import { createHash } from 'node:crypto'
import type {
  AssetStatus,
  PlaybackTicket,
  UploadTicket,
  VideoProvider,
} from '@/core/video/provider'
import { DEFAULT_PLAYBACK_TTL_SECONDS } from '@/core/video/provider'

/**
 * BUNNY STREAM — implementação do contrato `VideoProvider` (D-17).
 *
 * Duas regras que este arquivo existe para garantir:
 *
 * 1. A CHAVE DA BIBLIOTECA NUNCA VAI PARA O NAVEGADOR. O upload é direto do
 *    navegador para o Bunny, mas quem assina a permissão é o servidor. Se a
 *    chave vazasse, qualquer pessoa poderia apagar o catálogo inteiro.
 * 2. TODA URL DE REPRODUÇÃO É ASSINADA E EXPIRA. Link copiado do inspetor
 *    para de funcionar em 90 minutos, e não vira link público.
 *
 * O resto da aplicação nunca importa este arquivo direto — fala com
 * `getVideoProvider()`, que devolve a implementação configurada.
 */

const API = 'https://video.bunnycdn.com'

function config() {
  const libraryId = process.env.BUNNY_STREAM_LIBRARY_ID
  const apiKey = process.env.BUNNY_STREAM_API_KEY
  const host = process.env.BUNNY_STREAM_CDN_HOSTNAME
  const tokenKey = process.env.BUNNY_STREAM_TOKEN_KEY

  if (!libraryId || !apiKey || !host) {
    throw new Error(
      'Bunny Stream sem configuração. Faltam BUNNY_STREAM_LIBRARY_ID, ' +
        'BUNNY_STREAM_API_KEY ou BUNNY_STREAM_CDN_HOSTNAME.',
    )
  }
  return { libraryId, apiKey, host, tokenKey }
}

/**
 * Assinatura do upload TUS.
 *
 * É o que permite o navegador enviar direto para o Bunny sem conhecer a chave:
 * o servidor assina `libraryId + apiKey + expiração + videoId`, e o Bunny
 * aceita só aquele vídeo, só até aquela hora.
 */
function assinarUpload(libraryId: string, apiKey: string, expires: number, videoId: string) {
  return createHash('sha256').update(libraryId + apiKey + expires + videoId).digest('hex')
}

/**
 * Token de reprodução da CDN do Bunny.
 *
 * Assina o DIRETÓRIO do vídeo, não o arquivo: um HLS é um manifesto mais
 * dezenas de segmentos, e assinar só o manifesto deixaria os segmentos
 * abertos — o vídeo continuaria acessível para quem soubesse o caminho.
 */
function assinarReproducao(tokenKey: string, videoId: string, expires: number) {
  const caminho = `/${videoId}/`
  const bruto = createHash('sha256').update(tokenKey + caminho + expires).digest('base64')
  const token = bruto.replace(/\n/g, '').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
  return { token, caminho }
}

export const bunnyProvider: VideoProvider = {
  name: 'bunny',

  async createUploadTicket({ title }) {
    const { libraryId, apiKey } = config()

    const resposta = await fetch(`${API}/library/${libraryId}/videos`, {
      method: 'POST',
      headers: { AccessKey: apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    })

    if (!resposta.ok) {
      throw new Error(`Bunny recusou a criação do vídeo (HTTP ${resposta.status}).`)
    }

    const { guid } = (await resposta.json()) as { guid: string }
    const expires = Math.floor(Date.now() / 1000) + 60 * 60 // 1h para começar o envio

    return {
      uploadUrl: `${API}/tusupload`,
      assetId: guid,
      // Campos extras que o cliente TUS precisa. Não estão no contrato do
      // domínio porque são específicos do Bunny — vão como metadados.
      ...({
        tus: {
          libraryId,
          videoId: guid,
          expires,
          signature: assinarUpload(libraryId, apiKey, expires, guid),
        },
      } as object),
    } as UploadTicket & { tus: Record<string, unknown> }
  },

  async getAssetStatus(assetId): Promise<AssetStatus> {
    const { libraryId, apiKey } = config()

    const resposta = await fetch(`${API}/library/${libraryId}/videos/${assetId}`, {
      headers: { AccessKey: apiKey },
      cache: 'no-store',
    })

    if (!resposta.ok) {
      return { state: 'errored', durationSeconds: null, errorMessage: 'Vídeo não encontrado.' }
    }

    const v = (await resposta.json()) as { status: number; length: number }

    // Códigos do Bunny: 0-2 processando, 3 encodando, 4 pronto, 5 falhou.
    const state: AssetStatus['state'] =
      v.status === 4 ? 'ready' : v.status === 5 ? 'errored' : v.status === 0 ? 'uploading' : 'processing'

    return {
      state,
      durationSeconds: v.length > 0 ? v.length : null,
      errorMessage: state === 'errored' ? 'O Bunny não conseguiu processar este arquivo.' : null,
    }
  },

  async createPlaybackTicket({ assetId, ttlSeconds = DEFAULT_PLAYBACK_TTL_SECONDS }): Promise<PlaybackTicket> {
    const { host, tokenKey } = config()
    const expires = Math.floor(Date.now() / 1000) + ttlSeconds
    const base = `https://${host}/${assetId}`

    // Sem chave de token configurada a biblioteca ainda está aberta. Serve
    // para desenvolver, mas não para alunos — quem tiver a URL assiste.
    if (!tokenKey) {
      return {
        url: `${base}/playlist.m3u8`,
        posterUrl: `${base}/thumbnail.jpg`,
        expiresAt: new Date(expires * 1000).toISOString(),
      }
    }

    const { token, caminho } = assinarReproducao(tokenKey, assetId, expires)
    const query = `token=${token}&expires=${expires}&token_path=${encodeURIComponent(caminho)}`

    return {
      url: `${base}/playlist.m3u8?${query}`,
      posterUrl: `${base}/thumbnail.jpg?${query}`,
      expiresAt: new Date(expires * 1000).toISOString(),
    }
  },

  async deleteAsset(assetId) {
    const { libraryId, apiKey } = config()
    await fetch(`${API}/library/${libraryId}/videos/${assetId}`, {
      method: 'DELETE',
      headers: { AccessKey: apiKey },
    })
  },
}
