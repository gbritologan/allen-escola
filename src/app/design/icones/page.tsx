import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { ICONES_TEMA } from '@/components/icons/temas'
import { canOpenAdmin } from '@/core/identity/permissions'
import { getSession } from '@/lib/auth/session'

export const metadata: Metadata = { title: 'Ícones de tema · exemplo' }

/**
 * Os ícones de tema, grandes e pequenos ao mesmo tempo.
 *
 * O tamanho grande é para julgar o desenho; o de 22px é o tamanho REAL no
 * Mapa, e é o único que decide se o ícone presta.
 */
export default async function IconesTemaPage() {
  if (process.env.NODE_ENV === 'production') {
    const session = await getSession()
    if (!session || !canOpenAdmin(session.role)) redirect('/')
  }

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-10 px-6 py-12">
      <header className="flex flex-col gap-2">
        <h1 className="text-display font-light">Ícones de tema</h1>
        <p className="max-w-[60ch] text-body text-ink-3">
          Repertório clássico, derivado da pasta ICONOGRAFIA ALLEN. Silhueta cheia, não traço —
          no Mapa eles aparecem a 22px sobre fundo escuro.
        </p>
      </header>

      <div className="grid grid-cols-4 gap-3 sm:grid-cols-6 lg:grid-cols-8">
        {Object.entries(ICONES_TEMA).map(([chave, icone]) => (
          <div
            key={chave}
            className="flex flex-col items-center gap-1.5 rounded-[var(--radius-card)] border border-line bg-navy p-2.5"
          >
            <svg viewBox="0 0 24 24" className="size-10 fill-blue-light" aria-hidden>
              {icone.d.map((d, i) => (
                <path key={i} d={d} fillRule="evenodd" />
              ))}
            </svg>

            {/* O tamanho de verdade. */}
            <svg viewBox="0 0 24 24" className="size-[22px] fill-ink-2" aria-hidden>
              {icone.d.map((d, i) => (
                <path key={i} d={d} fillRule="evenodd" />
              ))}
            </svg>

            <code className="text-center text-caption text-ink-4">{chave}</code>
          </div>
        ))}
      </div>
    </main>
  )
}
