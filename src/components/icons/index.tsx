import type { SVGProps } from 'react'

/**
 * ICONOGRAFIA ALLEN
 *
 * Desenhados à mão a partir do conjunto de referência da marca
 * (`ICONOGRAFIA ALLEN`), não vetorizados dele: os originais são JPEG de
 * 1408×768 com espessuras de traço diferentes entre si, e traçar isso
 * produziria caminhos sujos e peso desigual a 20px.
 *
 * O que foi extraído da referência é a LINGUAGEM, e ela tem duas marcas:
 *
 *   1. CANTO CHANFRADO — todo retângulo (documento, painel, card) tem o
 *      canto superior direito cortado em 45°. É a assinatura da Allen, e é
 *      o que separa isto de qualquer conjunto pronto.
 *   2. FACETA INTERNA — formas maiores ganham linhas internas paralelas à
 *      silhueta, como pedra lapidada. Aparece no filtro e no expandir.
 *
 * Regras técnicas: viewBox 24, traço 1.75, `currentColor`, junções em
 * meia-esquadria. Preenchimento nenhum — o conjunto inteiro é vazado, o que
 * dá consistência que a referência original não tinha.
 *
 * ONDE USAR: no Admin, que é ferramenta densa e ganha com símbolo. Na área do
 * aluno os destinos continuam em TEXTO por decisão (D-21) — ícone ali seria
 * forçar a barra.
 */

type Props = SVGProps<SVGSVGElement>

function Base({ children, ...rest }: Props) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="square"
      strokeLinejoin="miter"
      aria-hidden
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  )
}

/** Adicionar — círculo e cruz, como na referência. */
export function IconeAdicionar(props: Props) {
  return (
    <Base {...props}>
      <circle cx="12" cy="12" r="8.25" />
      <path d="M12 8v8M8 12h8" />
    </Base>
  )
}

/** Editar — documento chanfrado e lápis. */
export function IconeEditar(props: Props) {
  return (
    <Base {...props}>
      <path d="M13.5 3.5H5v17h14V9l-5.5-5.5Z" />
      <path d="M13.5 3.5V9H19" />
      <path d="m14.8 12.2-4.3 4.3-2.2.6.6-2.2 4.3-4.3 1.6 1.6Z" />
    </Base>
  )
}

/** Apagar — lixeira. */
export function IconeApagar(props: Props) {
  return (
    <Base {...props}>
      <path d="M4.5 6.5h15M9.5 6.5V4h5v2.5" />
      <path d="M6.5 6.5 7.5 20.5h9l1-14" />
      <path d="M10.5 10v7M13.5 10v7" />
    </Base>
  )
}

/** Filtro — funil facetado. A peça mais característica do conjunto. */
export function IconeFiltro(props: Props) {
  return (
    <Base {...props}>
      <path d="M3 4.5h18l-7 8.5v7.5l-4-2.5V13L3 4.5Z" />
      <path d="M6.4 8h11.2M9 11.2h6" />
    </Base>
  )
}

/** Ordenar — barras escalonadas. */
export function IconeOrdenar(props: Props) {
  return (
    <Base {...props}>
      <path d="M4 6.5h2.5M9.5 6.5H20M4 12h2.5M9.5 12h7.5M4 17.5h2.5M9.5 17.5h4.5" />
    </Base>
  )
}

/** Copiar — dois documentos chanfrados. */
export function IconeCopiar(props: Props) {
  return (
    <Base {...props}>
      <path d="M14 7.5 11 4.5H5.5v13H14v-10Z" />
      <path d="M11 4.5v3h3" />
      <path d="M9 20h9.5V9.5L15.5 6.5H14" />
    </Base>
  )
}

/** Expandir — quatro cantos facetados. */
export function IconeExpandir(props: Props) {
  return (
    <Base {...props}>
      <path d="M9 4H4v5M15 4h5v5M15 20h5v-5M9 20H4v-5" />
    </Base>
  )
}

/** Mover na ordem. É o gesto mais usado do Content Studio. */
export function IconeMover({ direcao = 'cima', ...props }: Props & { direcao?: 'cima' | 'baixo' }) {
  return (
    <Base {...props}>
      {direcao === 'cima' ? (
        <path d="M12 19V5M6 11l6-6 6 6" />
      ) : (
        <path d="M12 5v14M6 13l6 6 6-6" />
      )}
    </Base>
  )
}

/** Perfil. */
export function IconePerfil(props: Props) {
  return (
    <Base {...props}>
      <circle cx="12" cy="8.5" r="3.75" />
      <path d="M4.5 20.5c0-3.6 3.4-6 7.5-6s7.5 2.4 7.5 6" />
    </Base>
  )
}
