/**
 * REGRAS DE IMAGEM — as mesmas nos dois lados.
 *
 * Elas rodam no navegador (para recusar antes de gastar upload) e no servidor
 * (porque o navegador é do usuário e não decide nada sozinho). Ficam aqui,
 * puras, para não existirem duas versões que divergem no dia em que uma ganha
 * um formato a mais.
 */
export const TIPOS_IMAGEM = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'] as const

export const LIMITE_IMAGEM = 8 * 1024 * 1024

/** Devolve o motivo da recusa, ou `null` se a imagem serve. */
export function recusaDaImagem(tipo: string, bytes: number): string | null {
  if (bytes === 0) return 'Nenhum arquivo escolhido.'
  if (!(TIPOS_IMAGEM as readonly string[]).includes(tipo)) {
    return 'Formato não aceito. Use JPG, PNG, WebP ou AVIF.'
  }
  if (bytes > LIMITE_IMAGEM) {
    const mb = (bytes / 1024 / 1024).toFixed(1)
    return `A imagem tem ${mb}MB. O limite é 8MB — exporte menor e tente de novo.`
  }
  return null
}

/** `image/jpeg` → `jpg`. O resto vira a própria extensão. */
export function extensaoDaImagem(tipo: string): string {
  return (tipo.split('/')[1] ?? 'jpg').replace('jpeg', 'jpg')
}

/**
 * O caminho dentro do bucket.
 *
 * O sufixo do relógio não é enfeite: sem ele, trocar a capa gravaria por cima
 * do mesmo caminho, a URL não mudaria, e o CDN serviria a imagem velha por
 * horas. Quem trocou juraria que o envio falhou.
 */
export function caminhoDaImagem(pasta: string, nomeBase: string, tipo: string): string {
  return `${pasta}/${nomeBase}-${Date.now()}.${extensaoDaImagem(tipo)}`
}

/**
 * A URL veio MESMO do nosso bucket, na pasta esperada?
 *
 * Desde que o envio passou a acontecer no navegador (D-78), quem chama a ação
 * manda uma URL, não um arquivo. Uma URL é texto, e texto o cliente escolhe —
 * então o servidor confere antes de gravar. Sem isto, a foto de perfil
 * aceitaria qualquer endereço da internet, e `next/image` quebraria na
 * primeira tela que tentasse desenhá-la.
 */
export function urlDoBucket(
  url: string,
  supabaseUrl: string,
  pasta: string,
): boolean {
  const prefixo = `${supabaseUrl.replace(/\/+$/, '')}/storage/v1/object/public/imagens/${pasta}/`
  return url.startsWith(prefixo) && !url.slice(prefixo.length).includes('/')
}

/**
 * O que as ações de imagem devolvem.
 *
 * Mora aqui, e não junto do componente, porque arquivo `'use server'` só pode
 * exportar função assíncrona — declarar o estado ao lado da ação quebra o
 * build da rota inteira, com uma mensagem que não aponta para a linha culpada.
 */
export interface EstadoImagem {
  erro: string | null
  url: string | null
}

export const IMAGEM_PARADA: EstadoImagem = { erro: null, url: null }
