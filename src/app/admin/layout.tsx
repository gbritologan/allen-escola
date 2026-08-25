import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Assinatura } from '@/components/brand/marca'
import { can, canOpenAdmin } from '@/core/identity/permissions'
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
//
// `Pessoas` é o único item com dono: conteudista administra conteúdo, não quem
// entra na escola. Esconder aqui é conveniência — quem barra de verdade é o
// redirect dentro da página, e a RLS embaixo dele.
const NAV = [
  { href: '/admin', label: 'Painel' },
  { href: '/admin/temas', label: 'Temas' },
  { href: '/admin/cursos', label: 'Cursos' },
  { href: '/admin/instrutores', label: 'Instrutores' },
  { href: '/admin/habilidades', label: 'Habilidades' },
  { href: '/admin/pessoas', label: 'Pessoas', requer: 'people.manage' as const },
  { href: '/admin/suporte', label: 'Suporte' },
]

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session) redirect('/entrar?destino=/admin')
  if (!canOpenAdmin(session.role)) redirect('/')

  return (
    <div className="flex min-h-dvh bg-navy-deep">
      <aside className="sticky top-0 hidden h-dvh w-56 shrink-0 flex-col gap-6 border-r border-line px-4 py-6 md:flex">
        <Link href="/admin" className="px-2">
          {/* Rail é superfície chapada: aqui a marca vai na variante clara. */}
          <Assinatura size={20} suffix="ADMIN" />
        </Link>

        <nav className="flex flex-1 flex-col gap-0.5">
          {NAV.filter((item) => !item.requer || can(session.role, item.requer)).map((item) => (
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
