import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { requireSession } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = { title: 'Apps' }

/**
 * APPS — o catálogo.
 *
 * O Gabriel definiu a tela: a pessoa vê a LOGO do app, o teaser que explica o
 * que ele é, e um link dedicado que leva até ele.
 *
 * A ORDEM DENTRO DO CARTÃO segue essa frase, e não é arbitrária. Num catálogo
 * de ferramentas, a marca é o que a pessoa reconhece antes de ler — logo
 * primeiro. O teaser responde "serve pra quê". O link fecha.
 *
 * DUAS AÇÕES, NÃO UMA. "Abrir o app" leva para fora, e é o que a maioria quer.
 * "Como usar" leva para a página interna com a demonstração em vídeo e o passo
 * a passo — e só aparece quando existe esse conteúdo. Um cartão que promete
 * "como usar" e abre uma página vazia é pior que um cartão sem essa opção.
 */
export default async function AppsPage() {
  await requireSession()
  const supabase = await createClient()

  const { data: apps } = await supabase
    .from('apps')
    .select('id, slug, name, tagline, logo_url, access_url, video_asset_id, como_usar')
    .eq('status', 'published')
    .order('position')

  const lista = apps ?? []

  return (
    <main className="largura-catalogo flex flex-col gap-10 px-6 pt-10 sm:pt-14">
      <header className="flex flex-col gap-3">
        <h1 className="text-display font-light">Apps</h1>
        <p className="max-w-[56ch] text-lead font-light text-ink-2">
          As ferramentas da Allen. Cada uma resolve uma parte da operação.
        </p>
      </header>

      {lista.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          {lista.map((app) => {
            const temGuia = Boolean(app.video_asset_id || app.como_usar?.trim())

            return (
              <article
                key={app.id}
                className="glass-card flex flex-col gap-4 rounded-[var(--radius-card)] p-5"
              >
                {/*
                 * A LOGO NUM QUADRADO COM FOLGA.
                 *
                 * `object-contain` e não `cover`: marca não se corta. E o
                 * quadrado tem fundo próprio porque logo com fundo
                 * transparente sobre vidro escuro some quando é escura.
                 */}
                <div className="flex size-14 items-center justify-center overflow-hidden rounded-[var(--radius-control)] bg-[rgba(243,245,252,0.06)] p-2">
                  {app.logo_url ? (
                    <Image
                      src={app.logo_url}
                      alt=""
                      width={44}
                      height={44}
                      className="size-full object-contain"
                    />
                  ) : (
                    <span aria-hidden className="text-title font-light text-ink-3">
                      {app.name.charAt(0)}
                    </span>
                  )}
                </div>

                <div className="flex flex-1 flex-col gap-1.5">
                  <h2 className="text-lead font-light text-ink">{app.name}</h2>
                  {app.tagline && (
                    <p className="line-clamp-3 text-label text-ink-3">{app.tagline}</p>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 border-t border-line pt-4">
                  {app.access_url ? (
                    <a
                      href={app.access_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex h-9 items-center rounded-[var(--radius-control)] bg-blue px-4 text-caption font-strong text-off-white transition-colors hover:bg-blue-light"
                    >
                      Abrir o app ↗
                    </a>
                  ) : (
                    /* Sem endereço, o app está anunciado e ainda não abriu. A
                       etiqueta diz isso em vez de oferecer um botão morto. */
                    <span className="flex h-9 items-center rounded-[var(--radius-control)] border border-line px-4 text-caption text-ink-4">
                      Em breve
                    </span>
                  )}

                  {temGuia && (
                    <Link
                      href={`/apps/${app.slug}`}
                      className="flex h-9 items-center rounded-[var(--radius-control)] border border-line px-4 text-caption text-ink-2 transition-colors hover:border-line-strong hover:text-ink"
                    >
                      Como usar
                    </Link>
                  )}
                </div>
              </article>
            )
          })}
        </div>
      ) : (
        <div className="rounded-[var(--radius-card)] border border-line px-6 py-8">
          <p className="max-w-[52ch] text-body text-ink-3">
            Nenhum app publicado ainda. Quando o primeiro sair, ele aparece aqui com a marca, o
            que faz e o link para abrir.
          </p>
        </div>
      )}
    </main>
  )
}
