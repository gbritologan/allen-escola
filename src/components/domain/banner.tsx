import Image from 'next/image'
import Link from 'next/link'

export interface BannerHome {
  id: string
  eyebrow: string | null
  title: string | null
  subtitle: string | null
  ctaLabel: string | null
  ctaHref: string | null
  imageUrl: string | null
}

/**
 * O BANNER DA HOME.
 *
 * 4:1 — 1920×480. A medida está escrita aqui e no Studio porque é a única
 * imagem do produto cuja arte é feita FORA. Medida que só existe na cabeça de
 * quem programou volta errada.
 *
 * Era 1440×360 e subiu quando o catálogo ficou wide: a moldura passa de
 * 1500px em monitor grande, e arte de 1440 entra ampliada. Arte já no ar em
 * 1440 continua servindo — a diferença é de 8%, não de qualidade percebida.
 *
 * SEM IMAGEM ele não aparece. Um retângulo vazio com "banner aqui" no lugar
 * mais nobre da Home é pior do que não ter banner — o aluno não sabe que é um
 * espaço reservado, ele vê um defeito.
 *
 * O texto é opcional inteiro: um banner pode ser só a arte. Quando existe, ele
 * fica sobre um degradê da esquerda, não sobre a imagem crua — texto branco
 * direto na foto some no primeiro trecho claro.
 */
export function Banner({ banner }: { banner: BannerHome }) {
  if (!banner.imageUrl) return null

  const temTexto = banner.eyebrow || banner.title || banner.subtitle
  const conteudo = (
    <>
      <Image
        src={banner.imageUrl}
        alt={banner.title ?? ''}
        fill
        /*
         * ISTO É O QUE DECIDE A NITIDEZ, e é fácil de esquecer ao mexer no
         * layout: o `sizes` diz ao Next QUAL largura baixar. Ele ficou em
         * 72rem (1152px) quando o catálogo era estreito; com a moldura em
         * 1552px, o navegador recebia uma imagem de 1152 e esticava — a arte
         * era reduzida e depois ampliada, e o resultado é o serrilhado.
         *
         * Os cortes seguem a casca: acima de 1840px de janela a moldura trava
         * em 1552px; abaixo disso ela é a janela menos a sidebar (240px) e o
         * respiro lateral (48px).
         */
        sizes="(min-width: 1840px) 1552px, (min-width: 768px) calc(100vw - 288px), calc(100vw - 48px)"
        priority
        className="object-cover"
      />

      {temTexto && (
        <>
          <div
            aria-hidden
            className="absolute inset-0 bg-[linear-gradient(90deg,rgba(5,7,20,0.92)_0%,rgba(5,7,20,0.72)_38%,rgba(5,7,20,0)_78%)]"
          />
          <div className="relative flex h-full max-w-[34rem] flex-col justify-center gap-2 p-6 sm:p-9">
            {banner.eyebrow && (
              <span className="text-caption uppercase tracking-[0.18em] text-ink-3">
                {banner.eyebrow}
              </span>
            )}
            {banner.title && (
              <h2 className="text-title font-light text-ink">{banner.title}</h2>
            )}
            {banner.subtitle && (
              <p className="max-w-[42ch] text-body text-ink-2">{banner.subtitle}</p>
            )}
            {banner.ctaLabel && (
              <span className="pt-1 text-label text-blue-light">{banner.ctaLabel} →</span>
            )}
          </div>
        </>
      )}
    </>
  )

  const classe =
    'relative block aspect-[4/1] w-full overflow-hidden rounded-[var(--radius-card)] border border-line'

  // Sem destino, não é link. Um <a> que não vai a lugar nenhum quebra teclado
  // e leitor de tela para ganhar nada.
  return banner.ctaHref ? (
    <Link href={banner.ctaHref} className={`${classe} group`}>
      {conteudo}
    </Link>
  ) : (
    <div className={classe}>{conteudo}</div>
  )
}
