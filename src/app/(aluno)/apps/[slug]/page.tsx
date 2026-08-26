import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Player } from '@/components/domain/player'
import { ButtonLink } from '@/components/primitives/button'
import { requireSession } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import { getVideoProvider, videoConfigurado } from '@/lib/video'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const supabase = await createClient()
  const { data } = await supabase.from('apps').select('name').eq('slug', slug).maybeSingle()
  return { title: data?.name ?? 'App' }
}

/**
 * A PÁGINA DE UM APP.
 *
 * A ordem é a tese: demonstração primeiro, como usar depois, acesso por
 * último. Quem chega aqui ainda não sabe se a ferramenta serve — pedir para
 * ler um passo a passo antes de ver a coisa funcionando é a ordem invertida.
 *
 * O botão de acesso é opcional de propósito. Um app pode ser anunciado antes
 * de estar liberado, e nesse caso a página mostra a demonstração sem prometer
 * uma porta que ainda não abre.
 */
export default async function AppPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const session = await requireSession()
  const supabase = await createClient()

  // O RLS já esconde rascunho de quem não é da equipe — não é preciso filtrar
  // por status aqui, e filtrar esconderia o rascunho da própria equipe.
  const { data: app } = await supabase
    .from('apps')
    .select('id, slug, name, tagline, description, como_usar, access_url, video_asset_id, status')
    .eq('slug', slug)
    .maybeSingle()

  if (!app) notFound()

  let video: { url: string; poster: string | null } | null = null
  if (app.video_asset_id && videoConfigurado()) {
    try {
      const ticket = await getVideoProvider().createPlaybackTicket({
        assetId: app.video_asset_id,
        viewerId: session.userId,
      })
      video = { url: ticket.url, poster: ticket.posterUrl }
    } catch {
      video = null
    }
  }

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-8 px-6 pt-10 sm:pt-14">
      <Link href="/apps" className="text-caption text-ink-3 transition-colors hover:text-ink">
        ← Apps
      </Link>

      <header className="flex flex-col gap-3">
        <h1 className="text-display font-light">{app.name}</h1>
        {app.tagline && (
          <p className="max-w-[54ch] text-lead font-light text-ink-2">{app.tagline}</p>
        )}
      </header>

      {video && (
        <Player src={video.url} poster={video.poster} lessonId={null} posicaoInicial={0} />
      )}

      {app.description && (
        <p className="max-w-[62ch] whitespace-pre-line text-body text-ink-2">{app.description}</p>
      )}

      {app.como_usar && (
        <section className="flex flex-col gap-3 rounded-[var(--radius-card)] border border-line px-6 py-5">
          <h2 className="text-caption font-medium uppercase tracking-[0.16em] text-ink-3">
            Como usar
          </h2>
          <p className="max-w-[62ch] whitespace-pre-line text-body text-ink-2">{app.como_usar}</p>
        </section>
      )}

      {app.access_url && (
        <div>
          <ButtonLink href={app.access_url} target="_blank" rel="noopener noreferrer">
            Abrir o app
          </ButtonLink>
        </div>
      )}
    </main>
  )
}
