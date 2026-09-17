import Link from 'next/link'

/**
 * O SELO DO TEMA — vidro, cor própria, emblema grego.
 *
 * ─── A IMAGEM É ESTÊNCIL, NÃO FIGURA ─────────────────────────────────────
 *
 * O PNG do emblema entra como MÁSCARA de CSS, não como `<img>`. A forma vem do
 * arquivo; a cor vem do banco (`themes.accent`, 0031).
 *
 * Isso importa porque a alternativa era guardar oito arquivos por cor. Trocar
 * o tom de um tema viraria trabalho de edição de imagem, e o tema claro
 * precisaria de um conjunto inteiro só dele. Com máscara, um arquivo serve
 * para qualquer cor, hoje e depois.
 *
 * ─── O VIDRO ─────────────────────────────────────────────────────────────
 *
 * O disco é o mesmo `liquid-glass` do botão de tema — que é o único vidro do
 * produto que o Gabriel apontou espontaneamente como bonito. Repetir um acerto
 * é mais honesto do que inventar uma variação para parecer novo.
 *
 * Por cima dele, um véu da cor do tema a 14%: é o que dá identidade sem
 * transformar oito discos em oito cores chapadas. O vidro continua vidro; a
 * cor o atravessa.
 *
 * ─── SEM ARQUIVO ─────────────────────────────────────────────────────────
 *
 * Tema sem emblema mostra a inicial, na cor dele. Continua identificando, com
 * menos personalidade — e é melhor que um disco vazio, que lê como falha.
 */
export function SeloDoTema({
  href,
  nome,
  icone,
  cor,
}: {
  href: string
  nome: string
  /** Chave do emblema. Vira `/temas/<chave>.png`. */
  icone: string | null
  cor: string | null
}) {
  const tom = cor ?? '#4C41FF'
  const arquivo = icone ? `/temas/${icone}.png` : null

  return (
    <Link
      href={href}
      className="group flex flex-col items-center gap-3 text-center outline-none"
    >
      <span
        className="liquid-glass relative flex size-16 items-center justify-center rounded-full transition-transform duration-200 ease-[var(--ease-allen)] group-hover:scale-110 group-focus-visible:scale-110"
        style={{
          // O véu da cor por cima do vidro. Sem ele, os oito discos seriam
          // iguais; com ele chapado, o vidro deixaria de existir.
          backgroundColor: `color-mix(in srgb, ${tom} 14%, transparent)`,
        }}
      >
        {arquivo ? (
          <span
            aria-hidden
            className="size-9"
            style={{
              backgroundColor: tom,
              maskImage: `url(${arquivo})`,
              WebkitMaskImage: `url(${arquivo})`,
              maskSize: 'contain',
              WebkitMaskSize: 'contain',
              maskRepeat: 'no-repeat',
              WebkitMaskRepeat: 'no-repeat',
              maskPosition: 'center',
              WebkitMaskPosition: 'center',
            }}
          />
        ) : (
          <span aria-hidden className="text-title font-light" style={{ color: tom }}>
            {nome.charAt(0)}
          </span>
        )}
      </span>

      <span className="text-label text-ink-2 transition-colors group-hover:text-ink">
        {nome}
      </span>
    </Link>
  )
}
