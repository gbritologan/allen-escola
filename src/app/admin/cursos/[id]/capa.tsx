import { CampoImagem } from '@/components/domain/campo-imagem'
import { enviarCapa, removerCapa } from './actions'

/**
 * A CAPA DO CURSO.
 *
 * Mostra a imagem no formato exato em que ela aparece no card do aluno (4:5),
 * não num quadradinho de miniatura. Capa cortada é o defeito mais comum desse
 * tipo de campo, e ele só aparece quando já está no ar — foi o que aconteceu
 * com a primeira arte de verdade, num card que ainda era 16:10.
 *
 * A mecânica toda — prévia, envio direto para o Storage, erro em português —
 * mora no `CampoImagem`, porque este era o quinto lugar do produto a subir
 * imagem e os cinco quebravam pelo mesmo motivo (D-78).
 */
export function Capa({
  id,
  slug,
  coverUrl,
}: {
  id: string
  slug: string
  coverUrl: string | null
}) {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-title font-light">Capa</h2>
        <p className="text-caption text-ink-4">
          4:5 em pé — 1080×1350 é a medida da arte da Allen. JPG, PNG, WebP ou AVIF, até 8MB.
          Escolher o arquivo já envia. Sem capa, o cartão do curso aparece só com o texto — o
          que é um estado legítimo, não um erro.
        </p>
      </div>

      <CampoImagem
        atual={coverUrl}
        pasta="capas"
        nomeBase={slug}
        acaoSalvar={enviarCapa}
        acaoRemover={removerCapa}
        ocultos={{ id }}
        moldura="aspect-[4/5] w-full max-w-[18rem]"
        rotuloVazio="Sem capa"
        tamanhos="288px"
      />
    </section>
  )
}
