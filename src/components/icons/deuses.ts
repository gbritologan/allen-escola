/**
 * OS OITO — um personagem grego por tema.
 *
 * ─── POR QUE ISTO EXISTE ─────────────────────────────────────────────────
 *
 * Os ícones anteriores eram objetos: uma coluna, uma balança, um estandarte.
 * O Gabriel disse que estavam "genéricos e nada originais", e estava certo —
 * uma balança é a balança de qualquer produto jurídico do mundo. Objeto é
 * vocabulário compartilhado; ninguém é dono de uma balança.
 *
 * Personagem é outra coisa. O elmo de Atena em Dados, o raio de Zeus em
 * Liderança, a chama roubada de Prometeu em IA — isso ninguém mais tem,
 * porque a associação é uma decisão editorial nossa, não um pictograma.
 *
 * ─── E POR QUE SÓLIDOS ───────────────────────────────────────────────────
 *
 * Fui olhar a pasta ICONOGRAFIA ALLEN antes de desenhar — coisa que eu não
 * tinha feito da primeira vez, e foi por isso que inventei um ícone que o
 * Gabriel chamou de sem sentido.
 *
 * A iconografia da marca é CHEIA e CHAPADA: a coluna dórica de lá é um bloco
 * de azul, sem contorno. Eu vinha renderizando os ícones como traço de 1.4px.
 * Metade do "genérico" não era o desenho — era a espessura errada aplicada ao
 * desenho certo.
 *
 * Então estes nascem para `fill`, não para `stroke`. Silhueta, não contorno.
 *
 * ─── COMO FORAM DESENHADOS ───────────────────────────────────────────────
 *
 * Caixa de 24×24, formas simétricas, sem detalhe abaixo de meio pixel em
 * 32px — que é o tamanho em que eles aparecem na Home. Ícone que só funciona
 * grande é ilustração, não ícone.
 */

export interface Deus {
  /** O personagem, para o Studio mostrar de quem é o emblema. */
  personagem: string
  /** Por que ele representa este tema. Aparece como dica no seletor. */
  porque: string
  /** Caminhos para preencher. Desenhados para `fill`, nunca `stroke`. */
  d: string[]
}

export const DEUSES: Record<string, Deus> = {
  atena: {
    personagem: 'Atena · o elmo',
    porque: 'Estratégia nascida de informação. O elmo coríntio, não a deusa.',
    d: [
      'M12 2.2c4.3 0 7.3 3.1 7.3 7.5v9.6c0 .8-.8 1.4-1.6 1.1l-2.7-1c-.5-.2-.8-.6-.8-1.1v-2.9h-4.4v2.9c0 .5-.3 1-.8 1.1l-2.7 1c-.8.3-1.6-.3-1.6-1.1V9.7c0-4.4 3-7.5 7.3-7.5Zm-3.1 5.3c-.7 0-1.2.6-1.2 1.3v1.6c0 .7.5 1.3 1.2 1.3h1.3V7.5H8.9Zm4.9 0v4.2h1.3c.7 0 1.2-.6 1.2-1.3V8.8c0-.7-.5-1.3-1.2-1.3h-1.3Z',
    ],
  },

  hefesto: {
    personagem: 'Hefesto · o martelo',
    porque: 'O ferreiro dos deuses. Quem faz a ferramenta que os outros usam.',
    d: [
      'M4.6 4.4h10.9c.6 0 1.1.5 1.1 1.1v3.1c0 .6-.5 1.1-1.1 1.1h-3.4v10.8c0 .6-.5 1.1-1.1 1.1H9.8c-.6 0-1.1-.5-1.1-1.1V9.7H4.6c-.6 0-1.1-.5-1.1-1.1V5.5c0-.6.5-1.1 1.1-1.1Z',
      'M18.1 4.4h1.8c.6 0 1.1.5 1.1 1.1v3.1c0 .6-.5 1.1-1.1 1.1h-1.8V4.4Z',
    ],
  },

  socrates: {
    personagem: 'Sócrates · o busto',
    porque: 'A pergunta antes da resposta. O único que sabia que não sabia.',
    d: [
      'M12 1.9c3.3 0 5.6 2.4 5.6 5.7 0 1.3-.3 2.4-.8 3.4l1 1.4c.3.4.1 1-.4 1.2l-1 .3v1.7c0 1-.8 1.8-1.8 1.8h-1.2v1.4l4.9 1.7c.9.3 1.5 1.2 1.5 2.2v.4H4.2v-.4c0-1 .6-1.9 1.5-2.2l4.9-1.7v-2.9C8.1 15 6.4 12.4 6.4 9.2c0-4 2.3-7.3 5.6-7.3Z',
    ],
  },

  prometeu: {
    personagem: 'Prometeu · a chama roubada',
    porque: 'Deu aos humanos um poder que era só dos deuses. É a IA, literal.',
    d: [
      'M12.6 1.6c.2 2.5 1.4 3.6 2.7 5 1.6 1.7 3.2 3.5 3.2 6.8 0 4.2-3 7.3-6.5 7.3S5.5 17.6 5.5 13.4c0-2 .7-3.4 1.6-4.4.2 1 .8 1.8 1.7 2.1.3-3.5 1.4-6.7 3.8-9.5Z',
      'M12 13.1c1.2 1.1 2 2 2 3.2 0 1.3-.9 2.3-2 2.3s-2-1-2-2.3c0-1.2.8-2.1 2-3.2Z',
    ],
  },

  zeus: {
    personagem: 'Zeus · o raio',
    porque: 'A decisão que vem de cima e não se discute. Comando.',
    d: [
      'M14.9 1.7c.5 0 .9.5.7 1l-2.2 6.4h4.3c.7 0 1 .8.5 1.3L8.4 22.2c-.5.5-1.3 0-1-.7l2.7-7.4H5.7c-.6 0-1-.6-.7-1.1L13.9 2c.2-.2.5-.3.8-.3h.2Z',
    ],
  },

  hermes: {
    personagem: 'Hermes · o elmo alado',
    porque: 'O mensageiro. A mensagem que viaja mais rápido que o produto.',
    d: [
      'M12 3.4c2.7 0 4.9 2.2 4.9 4.9v6.1c0 .5-.4.9-.9.9H8c-.5 0-.9-.4-.9-.9V8.3c0-2.7 2.2-4.9 4.9-4.9Z',
      'M6.7 7.1 1.9 5.4c-.5-.2-.9.4-.5.8l3.6 3.3c.4.4 1.1.2 1.3-.3l.4-2.1Z',
      'M17.3 7.1l4.8-1.7c.5-.2.9.4.5.8l-3.6 3.3c-.4.4-1.1.2-1.3-.3l-.4-2.1Z',
      'M9.6 17.1h4.8c.5 0 .9.4.9.9v3.5c0 .5-.4.9-.9.9H9.6c-.5 0-.9-.4-.9-.9V18c0-.5.4-.9.9-.9Z',
    ],
  },

  apolo: {
    personagem: 'Apolo · a lira',
    porque: 'Harmonia entre vozes diferentes. É o que softskill faz.',
    d: [
      'M7.1 2c1.4 0 2.6 1.1 2.8 2.6l1.3 12.7c.1.6-.4 1.1-1 1.1H8.8c-.6 0-1.1-.5-1-1.1L9 4.9c0-.4-.3-.7-.7-.7s-.7.3-.7.7v.9c0 .5-.4.9-.9.9H5c-.5 0-.9-.4-.9-.9v-.9C4.1 3.2 5.4 2 7.1 2Z',
      'M16.9 2c1.7 0 3 1.2 3 2.9v.9c0 .5-.4.9-.9.9h-1.7c-.5 0-.9-.4-.9-.9v-.9c0-.4-.3-.7-.7-.7s-.7.3-.7.7l1.2 12.4c.1.6-.4 1.1-1 1.1h-1.4c-.6 0-1.1-.5-1-1.1l1.3-12.7C14.3 3.1 15.5 2 16.9 2Z',
      'M6.4 20.1h11.2c.6 0 1.1.5 1.1 1.1s-.5 1.1-1.1 1.1H6.4c-.6 0-1.1-.5-1.1-1.1s.5-1.1 1.1-1.1Z',
    ],
  },

  nike: {
    personagem: 'Nike · a vitória alada',
    porque: 'O fechamento. Vender não é falar, é ganhar.',
    d: [
      'M21.3 2.3c.6-.3 1.2.3 1 .9l-2.6 8.1c-.2.5-.7.8-1.2.6l-3.4-1.1-6.6 6.7c-.4.4-1.1.2-1.3-.4L5.1 9.5c-.2-.5.1-1.1.7-1.2l15.5-6Z',
      'M4.5 18.1l2.4.8c.6.2.8.9.4 1.4l-1.8 2.1c-.4.5-1.2.3-1.4-.3l-.6-2.9c-.1-.6.4-1.2 1-1.1Z',
    ],
  },
}

export const CHAVES_DEUS = Object.keys(DEUSES)
