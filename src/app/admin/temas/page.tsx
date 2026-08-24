import type { Metadata } from 'next'
import { Chip } from '@/components/primitives/chip'
import { IconeMover } from '@/components/icons'
import { Surface } from '@/components/surfaces/surface'
import { CONTENT_STATUS_LABEL, type ContentStatus } from '@/core/shared/types'
import { createClient } from '@/lib/supabase/server'
import { alternarPublicacao, moverTema } from './actions'
import { NovoTema } from './novo-tema'

export const metadata: Metadata = { title: 'Temas' }

const iconButton =
  'flex size-7 items-center justify-center rounded-md border border-line text-ink-3 ' +
  'transition-colors duration-150 hover:border-line-strong hover:text-ink ' +
  'disabled:pointer-events-none disabled:opacity-30'

export default async function TemasPage() {
  const supabase = await createClient()

  // A contagem de cursos por tema vem junto: sem ela, arquivar um tema é um
  // salto no escuro. `count` no embed evita uma segunda ida ao banco.
  const { data: themes } = await supabase
    .from('themes')
    .select('id, name, slug, description, position, status, course_themes(count)')
    .order('position')

  const list = themes ?? []

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-10 px-6 py-10 lg:px-10">
      <header className="flex flex-col gap-2">
        <span className="text-caption uppercase tracking-[0.16em] text-ink-3">Content Studio</span>
        <h1 className="text-display font-light">Temas</h1>
        <p className="max-w-[62ch] text-body text-ink-3">
          O eixo pelo qual o aluno descobre conteúdo. A ordem daqui é a ordem que ele vê em
          Explorar.
        </p>
      </header>

      <section className="flex flex-col gap-4">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="text-title font-light">
            {list.length} {list.length === 1 ? 'tema' : 'temas'}
          </h2>
        </div>

        <Surface className="flex flex-col divide-y divide-[var(--color-line)]">
          {list.map((theme, index) => {
            const courseCount = theme.course_themes?.[0]?.count ?? 0
            const published = theme.status === 'published'

            return (
              <div key={theme.id} className="flex items-center gap-4 px-4 py-3.5">
                <div className="flex flex-col gap-0.5">
                  <form action={moverTema}>
                    <input type="hidden" name="id" value={theme.id} />
                    <input type="hidden" name="direction" value="up" />
                    <button
                      type="submit"
                      className={iconButton}
                      disabled={index === 0}
                      aria-label={`Mover ${theme.name} para cima`}
                    >
                      <IconeMover direcao="cima" className="size-3.5" />
                    </button>
                  </form>
                  <form action={moverTema}>
                    <input type="hidden" name="id" value={theme.id} />
                    <input type="hidden" name="direction" value="down" />
                    <button
                      type="submit"
                      className={iconButton}
                      disabled={index === list.length - 1}
                      aria-label={`Mover ${theme.name} para baixo`}
                    >
                      <IconeMover direcao="baixo" className="size-3.5" />
                    </button>
                  </form>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-body font-medium text-ink">{theme.name}</span>
                    <Chip tone={published ? 'positive' : 'neutral'}>
                      {CONTENT_STATUS_LABEL[theme.status as ContentStatus]}
                    </Chip>
                  </div>
                  <p className="truncate text-caption text-ink-4">
                    /tema/{theme.slug}
                    {' · '}
                    <span data-numeric>
                      {courseCount} {courseCount === 1 ? 'curso' : 'cursos'}
                    </span>
                  </p>
                </div>

                <form action={alternarPublicacao}>
                  <input type="hidden" name="id" value={theme.id} />
                  <input type="hidden" name="status" value={theme.status} />
                  <button
                    type="submit"
                    className="rounded-[var(--radius-control)] border border-line px-3 py-1.5 text-caption text-ink-2 transition-colors duration-150 hover:border-line-strong hover:text-ink"
                  >
                    {published ? 'Arquivar' : 'Publicar'}
                  </button>
                </form>
              </div>
            )
          })}

          {list.length === 0 && (
            <p className="px-4 py-8 text-center text-label text-ink-4">
              Nenhum tema ainda. Crie o primeiro abaixo.
            </p>
          )}
        </Surface>

        <p className="text-caption text-ink-4">
          Arquivar tira o tema da vista do aluno sem desfazer o vínculo com os cursos.
        </p>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-title font-light">Novo tema</h2>
        <Surface className="p-5">
          <NovoTema />
        </Surface>
      </section>
    </div>
  )
}
