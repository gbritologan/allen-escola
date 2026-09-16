import 'server-only'
import { urlDoBucket } from '@/core/shared/imagem'
import { createClient } from '@/lib/supabase/server'

/**
 * O LADO SERVIDOR DAS IMAGENS.
 *
 * O ENVIO não mora mais aqui. Desde D-78 o arquivo vai do navegador direto
 * para o Storage, porque o corpo de uma Server Action é limitado a 1MB no
 * Next e a 4,5MB na Vercel — tetos abaixo dos 8MB que as telas prometem, e
 * que estouravam com 413 antes de qualquer código nosso rodar.
 *
 * O que sobrou aqui é o que o servidor tem MESMO que fazer: conferir que a
 * URL recebida é do nosso bucket, e apagar o que sai de cena.
 */

/**
 * A URL veio do nosso bucket, na pasta certa?
 *
 * Quem chama a ação agora manda texto, e texto do cliente é pedido, não fato.
 * Sem esta conferência, `enviarFoto` — que qualquer aluno pode chamar —
 * aceitaria qualquer endereço da internet como foto de perfil.
 *
 * Devolve o motivo da recusa, ou `null` se a URL serve.
 */
export function recusaDaUrl(url: string, pasta: string): string | null {
  if (!url) return 'Nenhuma imagem enviada.'
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!base) return 'Armazenamento não configurado.'
  if (!urlDoBucket(url, base, pasta)) return 'Essa imagem não veio do nosso armazenamento.'
  return null
}

/**
 * Apaga uma imagem a partir da URL pública.
 *
 * Silencioso de propósito: falhar aqui não pode derrubar a ação principal.
 * Trocar a capa de um curso tem que funcionar mesmo que a imagem antiga já
 * tenha sumido do bucket.
 */
export async function apagarImagem(url: string | null | undefined): Promise<void> {
  if (!url) return
  const marca = '/imagens/'
  const i = url.indexOf(marca)
  if (i === -1) return

  const caminho = url.slice(i + marca.length)
  const supabase = await createClient()
  await supabase.storage.from('imagens').remove([caminho])
}
