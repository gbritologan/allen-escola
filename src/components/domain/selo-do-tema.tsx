import Link from 'next/link'
import { ICONES_TEMA } from '@/components/icons/temas'

/**
 * O SELO DO TEMA — ícone grande, cor própria, nome embaixo.
 *
 * ─── POR QUE A CAIXA SAIU ────────────────────────────────────────────────
 *
 * Os temas eram oito retângulos de vidro idênticos. O Gabriel disse que aquilo
 * não criava identificação nenhuma com tema nenhum, e o motivo é geométrico:
 * oito formas iguais, do mesmo tamanho e da mesma cor, não são oito coisas —
 * são uma textura. O olho não distingue, então não escolhe, então não clica.
 *
 * O que identifica um tema não é a moldura em volta dele. É a FORMA e a COR.
 * Então a moldura saiu e sobraram as duas.
 *
 * ─── O DISCO ─────────────────────────────────────────────────────────────
 *
 * O ícone mora num disco da cor do tema, a 12% de opacidade, com o traço na
 * cor cheia. O disco não é caixa — é o que dá massa suficiente para a cor ser
 * lida de longe. Um traço fino colorido some; um disco de cor identifica a
 * três metros da tela.
 *
 * A mesma cor vem do banco (`themes.accent`, 0031) e é a MESMA usada no Mapa.
 * Isso é o ponto inteiro: o aluno que aprendeu que Vendas é dourado no Mapa
 * reconhece Vendas na Home sem ler.
 *
 * ─── SEM ÍCONE ───────────────────────────────────────────────────────────
 *
 * Tema recém-criado pode não ter ícone escolhido ainda. Nesse caso o disco
 * mostra a inicial do nome, na mesma cor — que continua identificando, só que
 * com menos personalidade. Melhor que um buraco.
 */
export function SeloDoTema({
  href,
  nome,
  icone,
  cor,
}: {
  href: string
  nome: string
  icone: string | null
  cor: string | null
}) {
  const desenho = icone ? ICONES_TEMA[icone] : undefined
  const tom = cor ?? '#4C41FF'

  return (
    <Link
      href={href}
      className="group flex flex-col items-center gap-3 text-center outline-none"
    >
      <span
        className="flex size-16 items-center justify-center rounded-full transition-transform duration-200 ease-[var(--ease-allen)] group-hover:scale-110 group-focus-visible:scale-110"
        style={{
          backgroundColor: `color-mix(in srgb, ${tom} 14%, transparent)`,
          // A borda só aparece no hover, e na cor do tema: é o retorno de
          // "isto é clicável" sem gastar uma moldura permanente.
          boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${tom} 22%, transparent)`,
        }}
      >
        {/* Estes são os ícones do repertório atual, desenhados para traço.
            A pasta ICONOGRAFIA ALLEN mostra que a marca é CHAPADA (a coluna
            dórica de lá é um bloco de azul sem contorno) — mas converter
            contorno em silhueta não é trocar um atributo, é redesenhar. Fica
            para quando a arte dos oito personagens existir. */}
        {desenho ? (
          <svg viewBox="0 0 24 24" aria-hidden className="size-8" style={{ color: tom }}>
            {desenho.d.map((d) => (
              <path
                key={d}
                d={d}
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ))}
          </svg>
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
