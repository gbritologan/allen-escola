import 'server-only'
import { createClient } from '@/lib/supabase/server'

/**
 * ENVIO DE IMAGEM PARA O BUCKET `imagens`.
 *
 * Um lugar só, porque três telas precisam da mesma coisa (capa de curso,
 * retrato de instrutor, banner da Home) e três cópias divergem no dia em que
 * uma delas ganha uma validação a mais.
 *
 * A RLS do bucket é o portão de verdade (`equipe envia imagens`, 0019). As
 * checagens aqui existem para dar MENSAGEM: um erro de política do Postgres
 * chega como "new row violates row-level security policy", que não ajuda
 * ninguém a entender que o arquivo tinha 12MB.
 */

const TIPOS = ['image/jpeg', 'image/png', 'image/webp', 'image/avif']
const LIMITE = 8 * 1024 * 1024

export interface ResultadoUpload {
  url: string | null
  error: string | null
}

/**
 * @param pasta  prefixo dentro do bucket: 'capas', 'retratos', 'banners'.
 * @param nomeBase  vira o começo do nome do arquivo — normalmente o slug.
 */
export async function enviarImagem(
  arquivo: File,
  pasta: string,
  nomeBase: string,
): Promise<ResultadoUpload> {
  if (!arquivo || arquivo.size === 0) {
    return { url: null, error: 'Nenhum arquivo escolhido.' }
  }
  if (!TIPOS.includes(arquivo.type)) {
    return { url: null, error: 'Formato não aceito. Use JPG, PNG, WebP ou AVIF.' }
  }
  if (arquivo.size > LIMITE) {
    const mb = (arquivo.size / 1024 / 1024).toFixed(1)
    return { url: null, error: `A imagem tem ${mb}MB. O limite é 8MB.` }
  }

  const extensao = arquivo.type.split('/')[1]!.replace('jpeg', 'jpg')

  /*
   * O nome carrega um sufixo do relógio.
   *
   * Sem ele, trocar a capa gravaria por cima do mesmo caminho e a URL não
   * mudaria — e o CDN continuaria servindo a imagem velha por horas. Quem
   * trocou juraria que o upload falhou.
   */
  const caminho = `${pasta}/${nomeBase}-${Date.now()}.${extensao}`

  const supabase = await createClient()
  const { error } = await supabase.storage
    .from('imagens')
    .upload(caminho, arquivo, { contentType: arquivo.type, upsert: false })

  if (error) {
    return {
      url: null,
      error: 'Não consegui enviar a imagem. Confirme que você é da equipe e tente de novo.',
    }
  }

  const { data } = supabase.storage.from('imagens').getPublicUrl(caminho)
  return { url: data.publicUrl, error: null }
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
