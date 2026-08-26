import type { Metadata } from 'next'
import Link from 'next/link'
import { requireSession } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = { title: 'Apps' }

/**
 * APPS.
 *
 * As ferramentas que a Allen construiu, com demonstração em vídeo e o passo a
 * passo de como usar.
 *
 * Ocupou o lugar de "Explorar" na sidebar a pedido do Gabriel, e a troca faz
 * sentido além da preferência: Explorar era catálogo genérico, e o Mapa, a
 * Busca e a Home já respondem "o que existe" melhor do que uma lista. Isto
 * aqui responde uma pergunta que nada mais respondia.
 *
 * A página é deliberadamente pobre em cromo. Quem chega aqui quer ver a
 * ferramenta funcionando, não ler sobre ela.
 */
export default async function AppsPage() {
  await requireSession()
  const supabase = await createClient()

  const { data: apps } = await supabase
    .from('apps')
    .select('id, slug, name, tagline, status')
    .eq('status', 'published')
    .order('position')

  const lista = apps ?? []

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-10 px-6 pt-10 sm:pt-14">
      <header className="flex flex-col gap-3">
        <h1 className="text-display font-light">Apps</h1>
        <p className="max-w-[56ch] text-lead font-light text-ink-2">
          As ferramentas da Allen, com demonstração e o passo a passo de uso.
        </p>
      </header>

      {lista.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {lista.map((app) => (
            <Link
              key={app.id}
              href={`/apps/${app.slug}`}
              className="group flex flex-col gap-2 rounded-[var(--radius-card)] border border-line bg-navy px-5 py-5 transition-[border-color,background-color] duration-200 hover:border-line-strong hover:bg-navy-soft/60"
            >
              <span className="text-lead font-light text-ink">{app.name}</span>
              {app.tagline && (
                <span className="line-clamp-2 text-label text-ink-4">{app.tagline}</span>
              )}
            </Link>
          ))}
        </div>
      ) : (
        <div className="rounded-[var(--radius-card)] border border-line px-6 py-8">
          <p className="max-w-[52ch] text-body text-ink-3">
            Nenhum app publicado ainda. Quando o primeiro sair, ele aparece aqui com o vídeo de
            demonstração e o como usar.
          </p>
        </div>
      )}
    </main>
  )
}
