/**
 * ÍCONES DE TEMA — repertório clássico
 *
 * A primeira versão disto era megafone, engrenagem, gráfico de barras. Genérico
 * de SaaS. O Gabriel mandou olhar a pasta `ICONOGRAFIA ALLEN` antes de
 * inventar, e ele estava certo: a identidade da Allen é GREGA. Coluna,
 * pergaminho, tocha, louros, pódio, o filósofo de toga, a ágora. Tem
 * `athena.webp` e `arena.webp` na pasta de marca. O produto se chama Método
 * Allen e o mapa é um céu de constelações — o vocabulário já estava lá.
 *
 * Então estes são derivados da referência da marca, não de um conjunto pronto.
 *
 * DUAS DIFERENÇAS DELIBERADAS em relação a `icons/index.tsx`:
 *
 * 1. SILHUETA CHEIA, não traço. Os originais da pasta são chapados, e no Mapa
 *    o ícone é desenhado a ~22px sobre fundo escuro: traço de 1.75 vira um
 *    borrão cinza nesse tamanho, silhueta continua legível.
 * 2. SEM O CANTO CHANFRADO. O chanfro é a assinatura dos ícones de INTERFACE.
 *    Uma coluna dórica com o capitel cortado em 45° não é estilo, é erro.
 *
 * DOIS QUE NÃO ENTRARAM: louros e elmo. Tentei duas vezes cada um. A 22px o
 * louros vira escudo e o elmo vira cadeado — a silhueta perde exatamente o
 * detalhe que a identifica. Catorze ícones que funcionam valem mais que
 * dezesseis com dois que mentem sobre o que são. "Maestria" fica com o pódio,
 * "estratégia" com o estandarte.
 *
 * Tema é DADO (D-04): o Gabriel cria "Jurídico" às onze da noite sem abrir o
 * editor. Por isso a escolha do ícone mora em `themes.icon`, não num
 * `if (nome === 'Vendas')`.
 *
 * FUROS: um `<path>` separado SOMA, não recorta. Olho de máscara e fenda de
 * elmo precisam estar no MESMO `d` do rosto, e o desenho é preenchido com
 * `fill-rule: evenodd` — que é o que transforma o subcaminho de dentro em
 * buraco. Foi o que quebrou os dois na primeira tentativa: viraram manchas.
 *
 * Por que caminhos em texto e não JSX: o Mapa é <canvas>. Componente React não
 * se desenha em canvas, mas string de caminho vira `new Path2D(d)` e acompanha
 * zoom e arrasto de graça. O Studio renderiza as MESMAS strings num <svg>.
 * Uma fonte, dois destinos.
 */

export interface IconeTema {
  /** Nome no seletor do Studio. */
  rotulo: string
  /** De onde ele vem, para quem mexer nisso depois entender a escolha. */
  origem: string
  /** Caminhos SVG no viewBox 24×24, para PREENCHER (não traçar). */
  d: string[]
}

export const ICONES_TEMA: Record<string, IconeTema> = {
  coluna: {
    rotulo: 'Coluna — fundamentos',
    origem: 'A coluna dórica da pasta da marca.',
    d: [
      'M6.5 3h11v2.2h-11z',
      'M8 5.6h8l-1 1.7H9z',
      'M9.2 7.7h5.6l.7 11.4H8.5z',
      'M6 19.6h12V21.5H6z',
    ],
  },
  tocha: {
    rotulo: 'Tocha — início',
    origem: 'A tocha da pasta da marca.',
    d: [
      'M12 2.2c2.4 2.3 3.6 4 3.6 5.8a3.6 3.6 0 0 1-7.2 0c0-1.3.6-2.4 1.6-3.5.1 1.2.6 2 1.4 2.3-.3-1.6-.1-3 .6-4.6z',
      'M9.4 12h5.2l-.5 1.6H9.9z',
      'M10.4 13.9h3.2l.7 7.9h-4.6z',
    ],
  },
  pergaminho: {
    rotulo: 'Pergaminho — conteúdo',
    origem: 'O pergaminho da pasta da marca, simplificado para dois cilindros.',
    d: [
      'M6.2 6.8h11.6v10.4H6.2z',
      'M3.4 4.4h17.2c1.1 0 2 .8 2 1.8s-.9 1.8-2 1.8H3.4c-1.1 0-2-.8-2-1.8s.9-1.8 2-1.8z',
      'M3.4 16.2h17.2c1.1 0 2 .8 2 1.8s-.9 1.8-2 1.8H3.4c-1.1 0-2-.8-2-1.8s.9-1.8 2-1.8z',
      'M8.6 9.4h6.8v1.5H8.6zM8.6 12.6h4.6v1.5H8.6z',
    ],
  },
  olho: {
    rotulo: 'Olho — visão e dados',
    origem: 'O olho da pasta da marca.',
    d: [
      'M12 5.2c4.3 0 7.8 2.8 9.4 6.8-1.6 4-5.1 6.8-9.4 6.8S4.2 16 2.6 12C4.2 8 7.7 5.2 12 5.2zm0 2.4A4.4 4.4 0 1 0 12 16.4 4.4 4.4 0 0 0 12 7.6z',
      'M12 9.2a2.8 2.8 0 1 1 0 5.6 2.8 2.8 0 0 1 0-5.6z',
    ],
  },
  podio: {
    rotulo: 'Pódio — resultado',
    origem: 'O pódio da pasta da marca.',
    d: [
      'M9 7.4h6v11.2H9z',
      'M2.8 11.4h5.4v7.2H2.8z',
      'M15.8 13.4h5.4v5.2h-5.4z',
      'M2 19.4h20v2.1H2z',
    ],
  },
  agora: {
    rotulo: 'Ágora — comunicação',
    origem: 'O balão de fala da pasta da marca.',
    d: [
      'M12 4.4c5 0 8.6 3 8.6 6.9s-3.6 6.9-8.6 6.9c-.7 0-1.4-.1-2-.2l-4.4 2.5 1.3-3.6C4.7 15.7 3.4 13.6 3.4 11.3 3.4 7.4 7 4.4 12 4.4z',
      'M8.4 10a1.4 1.4 0 1 1 0 2.8 1.4 1.4 0 0 1 0-2.8zM12 10a1.4 1.4 0 1 1 0 2.8 1.4 1.4 0 0 1 0-2.8zM15.6 10a1.4 1.4 0 1 1 0 2.8 1.4 1.4 0 0 1 0-2.8z',
    ],
  },
  mestre: {
    rotulo: 'Mestre — liderança',
    origem: 'O filósofo da pasta da marca, virado busto: a figura inteira vira boneco a 22px.',
    d: [
      'M12 2.4c2.6 0 4.4 2 4.4 5 0 1.2-.3 2.4-.9 3.4l1.5.7c2.2 1 3.4 2.6 3.4 4.7v1.4H3.6v-1.4c0-2.1 1.2-3.7 3.4-4.7l1.5-.7c-.6-1-.9-2.2-.9-3.4 0-3 1.8-5 4.4-5z',
      'M6.6 19h10.8v2.6H6.6z',
      'M4.4 21.6h15.2v1.2H4.4z',
    ],
  },
  anfora: {
    rotulo: 'Ânfora — acúmulo',
    origem: 'Nova, na linguagem chapada da pasta.',
    d: [
      'M9.6 2.6h4.8v1.8H9.6z',
      'M10 4.4h4c0 1.5 3.4 2.6 3.4 7.2 0 4.2-2.4 7.2-5.4 7.2s-5.4-3-5.4-7.2c0-4.6 3.4-5.7 3.4-7.2z',
      'M7.2 6.2c-1.6.6-2.4 1.8-2.4 3.4h1.7c0-1 .3-1.7 1.1-2.1zM16.8 6.2c1.6.6 2.4 1.8 2.4 3.4h-1.7c0-1-.3-1.7-1.1-2.1z',
      'M9 19.4h6v2H9z',
    ],
  },
  templo: {
    rotulo: 'Templo — estrutura',
    origem: 'Nova, composta a partir da coluna da pasta.',
    d: [
      'M12 2.4 22 7.4H2z',
      'M3.6 9h2.6l.5 8.4H3.1zM9.4 9H12l.5 8.4H8.9zM15.2 9h2.6l.5 8.4h-3.6z',
      'M2 18.8h20v2.4H2z',
    ],
  },
  balanca: {
    rotulo: 'Balança — jurídico',
    origem: 'Nova, do mesmo repertório clássico.',
    d: [
      'M11.1 3.4h1.8v17.2h-1.8z',
      'M6 19.4h12v2.1H6z',
      'M3.4 7.6h17.2v1.7H3.4z',
      'M3.4 8.4 1 14.2h4.8zM20.6 8.4 23 14.2h-4.8z',
      'M12 2.2a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3z',
    ],
  },
  moeda: {
    rotulo: 'Moeda — finanças',
    origem: 'Nova, do dracma grego.',
    d: [
      'M12 2.8a9.2 9.2 0 1 1 0 18.4 9.2 9.2 0 0 1 0-18.4zm0 2.2a7 7 0 1 0 0 14 7 7 0 0 0 0-14z',
      'M12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10zm0 1.8a3.2 3.2 0 1 0 0 6.4 3.2 3.2 0 0 0 0-6.4z',
    ],
  },
  estandarte: {
    rotulo: 'Estandarte — avanço',
    origem: 'Nova, do lábaro romano. Para vendas e prospecção — o arco virava um risco.',
    d: [
      'M11.1 2h1.8v20h-1.8z',
      'M13.4 3.6h7.2l-2.2 2.9 2.2 2.9h-7.2z',
      'M6.4 11h11.2v2.2H6.4z',
      'M7.6 14.2h8.8l-1.4 2.6H9z',
      'M7 21h10v1.6H7z',
    ],
  },
  mascara: {
    rotulo: 'Máscara — criação',
    origem: 'Nova, da máscara do teatro grego. Olhos e boca são FUROS, num caminho só.',
    d: [
      'M12 2.4c4.5 0 7.8 2.5 7.8 6.6 0 5.8-3.5 12.6-7.8 12.6S4.2 14.8 4.2 9c0-4.1 3.3-6.6 7.8-6.6z' +
        'M8.7 7.8a2.3 2 0 1 0 0 4 2.3 2 0 0 0 0-4z' +
        'M15.3 7.8a2.3 2 0 1 0 0 4 2.3 2 0 0 0 0-4z' +
        'M8.8 15.2h6.4c0 1.8-1.4 3-3.2 3s-3.2-1.2-3.2-3z',
    ],
  },
  ampulheta: {
    rotulo: 'Ampulheta — processo',
    origem: 'Nova, do mesmo repertório.',
    d: [
      'M5 2.6h14v2H5zM5 19.4h14v2H5z',
      'M6.8 4.6h10.4c0 3-2.2 5.4-3.8 7.4 1.6 2 3.8 4.4 3.8 7.4H6.8c0-3 2.2-5.4 3.8-7.4-1.6-2-3.8-4.4-3.8-7.4z',
    ],
  },
}

/** As chaves, para o seletor do Studio e para validar o que vem do banco. */
export const CHAVES_ICONE_TEMA = Object.keys(ICONES_TEMA)

export function iconeDoTema(chave: string | null | undefined): IconeTema | null {
  if (!chave) return null
  return ICONES_TEMA[chave] ?? null
}
