import type { Metadata } from 'next'
import Link from 'next/link'
import { Surface } from '@/components/surfaces/surface'
import { canOpenAdmin } from '@/core/identity/permissions'
import { ROLE_DESCRIPTION, ROLE_LABEL } from '@/core/identity/roles'
import { requireSession } from '@/lib/auth/session'

export const metadata: Metadata = { title: 'Sua conta' }

/**
 * A conta.
 *
 * Ninguém navega até aqui por curiosidade — vem por um motivo específico:
 * sair, conferir o e-mail, ou entrar no Admin. Então a página é exatamente
 * isso, sem seções decorativas.
 */
export default async function ContaPage() {
  const session = await requireSession()

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-10 px-6 pt-10 sm:pt-14">
      <header className="flex flex-col gap-2">
        <h1 className="text-display font-light">
          {session.profile?.fullName ?? 'Sua conta'}
        </h1>
        <p className="text-label text-ink-3">{session.email}</p>
      </header>

      <Surface className="flex flex-col divide-y divide-[var(--color-line)]">
        <Linha rotulo="Papel" valor={ROLE_LABEL[session.role]} nota={ROLE_DESCRIPTION[session.role]} />
        <Linha
          rotulo="Acesso"
          valor="Ativo"
          nota="A cobrança entra em um ciclo futuro. Hoje o acesso é liberado por conta."
        />
      </Surface>

      {canOpenAdmin(session.role) && (
        <Link
          href="/admin"
          className="flex items-center justify-between rounded-[var(--radius-card)] border border-line px-5 py-4 transition-colors hover:border-line-strong hover:bg-[rgba(243,245,252,0.03)]"
        >
          <div className="flex flex-col">
            <span className="text-body text-ink">Allen Admin</span>
            <span className="text-caption text-ink-4">Criar e publicar conteúdo</span>
          </div>
          <span aria-hidden className="text-ink-4">
            →
          </span>
        </Link>
      )}

      <form action="/sair" method="post" className="border-t border-line pt-8">
        <button
          type="submit"
          className="text-label text-ink-3 transition-colors hover:text-critical"
        >
          Sair desta conta
        </button>
      </form>
    </main>
  )
}

function Linha({ rotulo, valor, nota }: { rotulo: string; valor: string; nota?: string }) {
  return (
    <div className="flex flex-col gap-0.5 px-5 py-4">
      <span className="text-caption uppercase tracking-[0.14em] text-ink-4">{rotulo}</span>
      <span className="text-body text-ink">{valor}</span>
      {nota && <span className="text-caption text-ink-4">{nota}</span>}
    </div>
  )
}
