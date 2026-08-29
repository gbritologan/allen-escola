import type { MetadataRoute } from 'next'

/**
 * NADA DESTE DOMÍNIO ENTRA EM BUSCADOR.
 *
 * `app.allenescola.com` é a plataforma: tudo atrás de login, e o pouco que
 * responde sem sessão é a tela de entrada. Indexar isso não traz ninguém — traz
 * o formulário de login da escola aparecendo no Google, e um fluxo constante de
 * robô batendo em rota autenticada.
 *
 * A landing pública é outro domínio, com outro robots. Este aqui é o do
 * produto, e o produto não é conteúdo de busca.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', disallow: '/' }],
  }
}
