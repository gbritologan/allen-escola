import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { canOpenAdmin } from '@/core/identity/permissions'
import { ROLE_LABEL } from '@/core/identity/roles'
import { getSession } from '@/lib/auth/session'

export const metadata: Metadata = {
  title: { default: 'Allen Admin', template: '%s · Allen Admin' },
}

/**
 * ALLEN ADMIN — outro mundo, de propósito (briefing §19).
 *
 * O aluno tem chrome editorial e conteúdo full-bleed. Aqui é ferramenta: rail
 * persistente, densidade alta, zero vidro. Quem passa quatro horas publicando
 * aula quer estrutura fixa, não cinema (D-21).
 *
 * A guarda abaixo é conveniência. Quem nega de verdade é a RLS.
 */
// Só entra aqui o que existe. Link de menu que leva a 404 é pior que menu curto.
// Instrutores, Mídia e Pessoas entram conforme forem construídos.
const NAV = [
  { href: '/admin', label: 'Painel' },
  { href: '/admin/temas', label: 'Temas' },
  { href: '/admin/cursos', label: 'Cursos' },
]

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session) redirect('/entrar?destino=/admin')
  if (!canOpenAdmin(session.role)) redirect('/')

  return (
    <div className="flex min-h-dvh bg-navy-deep">
      <aside className="sticky top-0 hidden h-dvh w-56 shrink-0 flex-col gap-6 border-r border-line px-4 py-6 md:flex">
        <Link href="/admin" className="flex items-center gap-2.5 px-2">
          <div className="size-5 rounded-md bg-gradient-to-br from-blue-light to-blue" />
          <span className="text-caption font-heavy tracking-[0.2em] text-ink">ALLEN</span>
          <span className="text-caption font-light tracking-[0.14em] text-ink-4">ADMIN</span>
        </Link>

        <nav className="flex flex-1 flex-col gap-0.5">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-[var(--radius-control)] px-3 py-2 text-label text-ink-3 transition-colors duration-150 hover:bg-[rgba(243,245,252,0.05)] hover:text-ink"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex flex-col gap-2 border-t border-line px-3 pt-4">
          <span className="truncate text-caption text-ink-2">
            {session.profile?.fullName ?? session.email}
          </span>
          <span className="text-caption text-ink-4">{ROLE_LABEL[session.role]}</span>
          <div className="flex items-center gap-3 pt-1">
            <Link href="/" className="text-caption text-ink-3 transition-colors hover:text-ink">
              Ver como aluno
            </Link>
            <form action="/sair" method="post">
              <button
                type="submit"
                className="text-caption text-ink-3 transition-colors hover:text-ink"
              >
                Sair
              </button>
            </form>
          </div>
        </div>
      </aside>

      <main className="min-w-0 flex-1">{children}</main>
    </div>
  )
}
