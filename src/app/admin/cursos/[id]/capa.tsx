import { CampoImagem } from '@/components/domain/campo-imagem'
import { enviarCapa, removerCapa } from './actions'

/**
 * A CAPA DO CURSO.
 *
 * Mostra a imagem no formato em que ela aparece para o aluno (16:9), não num
 * quadradinho de miniatura. Capa cortada é o defeito mais comum desse tipo de
 * campo, e ele só aparece quando já está no ar.
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
          16:9, pelo menos 1280×720. JPG, PNG, WebP ou AVIF, até 8MB. Escolher o arquivo já
          envia. Sem capa, o cartão do curso aparece só com o texto — o que é um estado
          legítimo, não um erro.
        </p>
      </div>

      <CampoImagem
        atual={coverUrl}
        pasta="capas"
        nomeBase={slug}
        acaoSalvar={enviarCapa}
        acaoRemover={removerCapa}
        ocultos={{ id }}
        rotuloVazio="Sem capa"
      />
    </section>
  )
}
