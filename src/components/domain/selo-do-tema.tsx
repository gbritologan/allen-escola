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
 * ─── O VIDRO É REDONDO, E ISSO MUDA A LUZ ────────────────────────────────
 *
 * Começou como `liquid-glass`, que é vidro de PAINEL: degradê linear de cima
 * para baixo. Num retângulo isso lê como luz vinda de cima; num círculo vira
 * uma faixa horizontal, e o disco parece achatado.
 *
 * A diferença é geométrica. Superfície curva reflete a luz num PONTO, não
 * numa linha — daí `glass-orb`, com o realce numa elipse pequena no alto e um
 * segundo brilho contornando a base. É o de baixo que fecha a forma como
 * volume; sem ele, o disco vira um botão com um reflexo colado em cima.
 *
 * Por cima, um véu da cor do tema: é o que dá identidade sem transformar oito
 * discos em oito cores chapadas. O vidro continua vidro; a cor o atravessa.
 *
 * ─── O QUE ACONTECE NO HOVER ─────────────────────────────────────────────
 *
 * Três coisas ao mesmo tempo, e as três dizem "isto responde":
 *
 *   · um reflexo atravessa o disco, uma vez só
 *   · a cor fica mais viva — o véu sobe de 14% para 26%, e o emblema ganha
 *     saturação
 *   · o disco cresce um pouco
 *
 * O reflexo atravessa e sai em vez de ficar repetindo: efeito em laço vira
 * ruído na periferia da visão, e numa grade de oito seriam oito ruídos.
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
        className="glass-orb flex size-16 items-center justify-center overflow-hidden rounded-full transition-[transform,background-color] duration-300 ease-[var(--ease-allen)] group-hover:scale-110 group-focus-visible:scale-110"
        style={{
          // O véu da cor por cima do vidro, que sobe no hover. Sem ele, os
          // oito discos seriam iguais; chapado, o vidro deixaria de existir.
          backgroundColor: `color-mix(in srgb, ${tom} var(--veu-do-tema, 14%), transparent)`,
        }}
      >
        <span aria-hidden className="reflexo">
          <span className="reflexo-faixa" />
        </span>

        {arquivo ? (
          <span
            aria-hidden
            className="relative size-9 transition-[filter] duration-300 ease-[var(--ease-allen)] group-hover:[filter:saturate(1.35)_brightness(1.18)] group-focus-visible:[filter:saturate(1.35)_brightness(1.18)]"
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
