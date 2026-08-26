import type { Metadata } from 'next'
import { Button } from '@/components/primitives/button'
import { Chip } from '@/components/primitives/chip'
import { Field, Input, Textarea } from '@/components/primitives/field'
import { Surface } from '@/components/surfaces/surface'
import { CONTENT_STATUS_LABEL, type ContentStatus } from '@/core/shared/types'
import { createClient } from '@/lib/supabase/server'
import { alternarPublicacao, moverApp, salvarApp } from './actions'
import { NovoApp } from './novo-app'

export const metadata: Metadata = { title: 'Apps' }

/**
 * OS APPS, NO STUDIO.
 *
 * Tudo aberto na mesma tela, sem página de edição separada. São poucos apps e
 * cada um tem cinco campos: abrir uma rota por app para editar cinco campos
 * seria burocracia sem ganho.
 */
export default async function AdminAppsPage() {
  const supabase = await createClient()
  const { data: apps } = await supabase
    .from('apps')
    .select('id, slug, name, tagline, description, como_usar, access_url, video_asset_id, status, position')
    .order('position')

  const lista = apps ?? []

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-10 px-6 py-10 lg:px-10">
      <header className="flex flex-col gap-2">
        <span className="text-caption uppercase tracking-[0.16em] text-ink-3">Content Studio</span>
        <h1 className="text-display font-light">Apps</h1>
        <p className="max-w-[62ch] text-body text-ink-3">
          As ferramentas da Allen, com demonstração e como usar. A ordem daqui é a ordem que o
          aluno vê.
        </p>
      </header>

      <Surface className="p-6">
        <NovoApp />
      </Surface>

      <section className="flex flex-col gap-6">
        {lista.map((app, i) => (
          <Surface key={app.id} className="flex flex-col gap-5 p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-body font-medium text-ink">{app.name}</span>
                <Chip tone={app.status === 'published' ? 'positive' : 'neutral'}>
                  {CONTENT_STATUS_LABEL[app.status as ContentStatus]}
                </Chip>
                <span data-numeric className="text-caption text-ink-4">
                  /apps/{app.slug}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <form action={moverApp}>
                  <input type="hidden" name="id" value={app.id} />
                  <input type="hidden" name="direction" value="up" />
                  <Button type="submit" variant="ghost" size="sm" disabled={i === 0}>
                    ↑
                  </Button>
                </form>
                <form action={moverApp}>
                  <input type="hidden" name="id" value={app.id} />
                  <input type="hidden" name="direction" value="down" />
                  <Button type="submit" variant="ghost" size="sm" disabled={i === lista.length - 1}>
                    ↓
                  </Button>
                </form>
                <form action={alternarPublicacao}>
                  <input type="hidden" name="id" value={app.id} />
                  <input type="hidden" name="status" value={app.status} />
                  <Button type="submit" variant="secondary" size="sm">
                    {app.status === 'published' ? 'Arquivar' : 'Publicar'}
                  </Button>
                </form>
              </div>
            </div>

            <form action={salvarApp} className="flex flex-col gap-4">
              <input type="hidden" name="id" value={app.id} />

              <Field label="Nome" htmlFor={`name-${app.id}`}>
                <Input id={`name-${app.id}`} name="name" defaultValue={app.name} required />
              </Field>

              <Field label="Uma linha" htmlFor={`tagline-${app.id}`} hint="Aparece no cartão.">
                <Input id={`tagline-${app.id}`} name="tagline" defaultValue={app.tagline ?? ''} />
              </Field>

              <Field
                label="Descrição"
                htmlFor={`description-${app.id}`}
                hint="O que o app resolve. Aparece embaixo do vídeo."
              >
                <Textarea
                  id={`description-${app.id}`}
                  name="description"
                  defaultValue={app.description ?? ''}
                  rows={4}
                />
              </Field>

              <Field
                label="Como usar"
                htmlFor={`como-${app.id}`}
                hint="O passo a passo. Uma linha por passo."
              >
                <Textarea
                  id={`como-${app.id}`}
                  name="como_usar"
                  defaultValue={app.como_usar ?? ''}
                  rows={6}
                />
              </Field>

              <Field
                label="Link de acesso"
                htmlFor={`url-${app.id}`}
                hint="Onde o app abre. Em branco, a página mostra só a demonstração."
              >
                <Input
                  id={`url-${app.id}`}
                  name="access_url"
                  defaultValue={app.access_url ?? ''}
                  placeholder="https://"
                />
              </Field>

              <Field
                label="ID do vídeo de demonstração"
                htmlFor={`video-${app.id}`}
                hint="O identificador no Bunny. O envio pela própria tela ainda não está ligado aqui."
              >
                <Input
                  id={`video-${app.id}`}
                  name="video_asset_id"
                  defaultValue={app.video_asset_id ?? ''}
                />
              </Field>

              <div>
                <Button type="submit" size="sm">
                  Salvar
                </Button>
              </div>
            </form>
          </Surface>
        ))}

        {lista.length === 0 && (
          <p className="text-body text-ink-4">Nenhum app ainda. Crie o primeiro acima.</p>
        )}
      </section>
    </div>
  )
}
