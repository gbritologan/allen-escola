import Image from 'next/image'
import { Button } from '@/components/primitives/button'
import { enviarCapa, removerCapa } from './actions'

/**
 * A CAPA DO CURSO.
 *
 * Mostra a imagem no formato em que ela aparece para o aluno (16:9), não num
 * quadradinho de miniatura. Capa cortada é o defeito mais comum desse tipo de
 * campo, e ele só aparece quando já está no ar.
 *
 * A medida está escrita na tela porque a arte é feita fora — e arte feita fora
 * sem medida escrita volta na proporção errada.
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
          16:9, pelo menos 1280×720. JPG, PNG, WebP ou AVIF, até 8MB. Sem capa, o cartão do
          curso aparece só com o texto — o que é um estado legítimo, não um erro.
        </p>
      </div>

      <div className="relative aspect-video w-full max-w-xl overflow-hidden rounded-[var(--radius-card)] border border-line bg-navy">
        {coverUrl ? (
          <Image src={coverUrl} alt="" fill sizes="576px" className="object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center">
            <span className="text-caption text-ink-4">Sem capa</span>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <form action={enviarCapa} className="flex items-center gap-3">
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="slug" value={slug} />
          <input
            type="file"
            name="arquivo"
            accept="image/jpeg,image/png,image/webp,image/avif"
            required
            className="max-w-[16rem] text-caption text-ink-3 file:mr-3 file:rounded-[var(--radius-control)] file:border file:border-line file:bg-transparent file:px-3 file:py-1.5 file:text-caption file:text-ink-2"
          />
          <Button type="submit" size="sm" variant="secondary">
            Enviar
          </Button>
        </form>

        {coverUrl && (
          <form action={removerCapa}>
            <input type="hidden" name="id" value={id} />
            <Button type="submit" size="sm" variant="ghost">
              Remover
            </Button>
          </form>
        )}
      </div>
    </section>
  )
}
