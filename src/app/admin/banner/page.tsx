import type { Metadata } from 'next'
import Image from 'next/image'
import { Button } from '@/components/primitives/button'
import { Chip } from '@/components/primitives/chip'
import { Field, Input } from '@/components/primitives/field'
import { Surface } from '@/components/surfaces/surface'
import { CONTENT_STATUS_LABEL, type ContentStatus } from '@/core/shared/types'
import { createClient } from '@/lib/supabase/server'
import {
  alternarPublicacao,
  apagarBanner,
  criarBanner,
  enviarArte,
  salvarBanner,
} from './actions'

export const metadata: Metadata = { title: 'Banner' }

/**
 * O BANNER DA HOME.
 *
 * A medida (1440×360) está escrita em três lugares — aqui, no componente e na
 * migration — porque é a única arte do produto feita FORA do produto. Medida
 * que mora só na cabeça de quem programou volta errada do designer.
 *
 * Um banner por vez no ar: publicar arquiva os outros. Dois publicados fariam
 * o segundo sumir sem explicação.
 */
export default async function AdminBannerPage() {
  const supabase = await createClient()
  const { data: banners } = await supabase
    .from('home_banners')
    .select('id, eyebrow, title, subtitle, cta_label, cta_href, image_url, status, position')
    .order('position')

  const lista = banners ?? []

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-10 px-6 py-10 lg:px-10">
      <header className="flex flex-col gap-2">
        <span className="text-caption uppercase tracking-[0.16em] text-ink-3">Content Studio</span>
        <h1 className="text-display font-light">Banner da Home</h1>
        <p className="max-w-[64ch] text-body text-ink-3">
          A faixa do topo da Home.{' '}
          <strong className="font-medium text-ink-2">1440×360 (4:1)</strong>, JPG, PNG, WebP ou
          AVIF, até 8MB. Sem arte enviada o banner não aparece para o aluno — a Home fecha em
          volta como se ele não existisse.
        </p>
      </header>

      <form action={criarBanner} className="flex items-end gap-3">
        <div className="flex-1">
          <Field label="Novo banner" htmlFor="title">
            <Input id="title" name="title" placeholder="Nome interno ou título que aparece" />
          </Field>
        </div>
        <Button type="submit" variant="secondary">
          Criar
        </Button>
      </form>

      <section className="flex flex-col gap-6">
        {lista.map((b) => (
          <Surface key={b.id} className="flex flex-col gap-5 p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-body font-medium text-ink">
                  {b.title ?? 'Sem título'}
                </span>
                <Chip tone={b.status === 'published' ? 'positive' : 'neutral'}>
                  {CONTENT_STATUS_LABEL[b.status as ContentStatus]}
                </Chip>
                {!b.image_url && <Chip tone="caution">sem arte</Chip>}
              </div>

              <div className="flex items-center gap-2">
                <form action={alternarPublicacao}>
                  <input type="hidden" name="id" value={b.id} />
                  <input type="hidden" name="status" value={b.status} />
                  <Button
                    type="submit"
                    variant="secondary"
                    size="sm"
                    disabled={!b.image_url && b.status !== 'published'}
                  >
                    {b.status === 'published' ? 'Tirar do ar' : 'Publicar'}
                  </Button>
                </form>
                <form action={apagarBanner}>
                  <input type="hidden" name="id" value={b.id} />
                  <Button type="submit" variant="ghost" size="sm">
                    Apagar
                  </Button>
                </form>
              </div>
            </div>

            {/* A prévia tem a proporção real. Julgar 4:1 num quadrado é como
                aprovar capa olhando miniatura. */}
            <div className="relative aspect-[4/1] w-full overflow-hidden rounded-[var(--radius-card)] border border-line bg-navy">
              {b.image_url ? (
                <Image src={b.image_url} alt="" fill sizes="42rem" className="object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <span className="text-caption text-ink-4">1440 × 360</span>
                </div>
              )}
            </div>

            <form action={enviarArte} className="flex flex-wrap items-center gap-3">
              <input type="hidden" name="id" value={b.id} />
              <input
                type="file"
                name="arquivo"
                accept="image/jpeg,image/png,image/webp,image/avif"
                required
                className="max-w-[16rem] text-caption text-ink-3 file:mr-3 file:rounded-[var(--radius-control)] file:border file:border-line file:bg-transparent file:px-3 file:py-1.5 file:text-caption file:text-ink-2"
              />
              <Button type="submit" size="sm" variant="secondary">
                {b.image_url ? 'Trocar arte' : 'Enviar arte'}
              </Button>
            </form>

            <form action={salvarBanner} className="flex flex-col gap-4">
              <input type="hidden" name="id" value={b.id} />

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Chapéu" htmlFor={`eyebrow-${b.id}`} hint="A linha pequena em cima.">
                  <Input id={`eyebrow-${b.id}`} name="eyebrow" defaultValue={b.eyebrow ?? ''} />
                </Field>
                <Field label="Título" htmlFor={`title-${b.id}`}>
                  <Input id={`title-${b.id}`} name="title" defaultValue={b.title ?? ''} />
                </Field>
              </div>

              <Field label="Subtítulo" htmlFor={`subtitle-${b.id}`}>
                <Input id={`subtitle-${b.id}`} name="subtitle" defaultValue={b.subtitle ?? ''} />
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Texto do link" htmlFor={`cta-${b.id}`}>
                  <Input id={`cta-${b.id}`} name="cta_label" defaultValue={b.cta_label ?? ''} />
                </Field>
                <Field
                  label="Destino"
                  htmlFor={`href-${b.id}`}
                  hint="Caminho interno, ex.: /masterclass. Em branco, o banner não é clicável."
                >
                  <Input id={`href-${b.id}`} name="cta_href" defaultValue={b.cta_href ?? ''} />
                </Field>
              </div>

              <div>
                <Button type="submit" size="sm">
                  Salvar textos
                </Button>
              </div>
            </form>
          </Surface>
        ))}

        {lista.length === 0 && (
          <p className="text-body text-ink-4">
            Nenhum banner ainda. Crie um acima, envie a arte e publique.
          </p>
        )}
      </section>
    </div>
  )
}
