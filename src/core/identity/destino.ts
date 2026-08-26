/**
 * PARA ONDE A PESSOA VAI DEPOIS DE ENTRAR.
 *
 * A regra base é "volta para onde queria ir": quem clicou no link de uma aula
 * e foi barrado pelo login deve cair naquela aula, não numa home genérica.
 * Isso é o que faz um link compartilhado valer alguma coisa.
 *
 * Mas ela só vale quando o destino GUARDA ALGO ESPECÍFICO. E aí está a
 * exceção que o Gabriel encontrou usando: ele foi barrado no Mapa, entrou, e
 * foi despejado direto no Mapa — tela cheia, céu estrelado, sem contexto
 * nenhum. Não havia nada a recuperar: o Mapa não tem posição salva, não tem
 * progresso, não é conteúdo. É uma VISTA, e você chega nela escolhendo ir.
 *
 * Então: destinos que são vista, não conteúdo, não valem a volta.
 */

/**
 * Telas que são modo de olhar, não coisa a recuperar. Voltar para elas depois
 * do login não devolve nada — só desorienta.
 */
const VISTAS = ['/mapa']

/**
 * Devolve um destino seguro e útil, ou '/'.
 *
 * Recusa destino externo (`//outro.site` vira redirecionamento aberto, que é
 * uma porta de phishing) e recusa as vistas.
 */
export function destinoDepoisDoLogin(bruto: string | null | undefined): string {
  if (!bruto) return '/'
  if (!bruto.startsWith('/') || bruto.startsWith('//')) return '/'

  const caminho = bruto.split('?')[0]!.split('#')[0]!
  if (VISTAS.some((v) => caminho === v || caminho.startsWith(v + '/'))) return '/'

  return bruto
}
