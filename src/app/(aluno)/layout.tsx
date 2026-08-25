import { StudentChrome } from '@/components/nav/chrome'
import { canOpenAdmin } from '@/core/identity/permissions'
import { requireSession } from '@/lib/auth/session'

/**
 * A casca da área do aluno.
 *
 * No desktop, a sidebar ocupa 240px fixos à esquerda e o conteúdo mora ao lado
 * dela. No celular não existe sidebar: barra em cima, dock embaixo, e o
 * conteúdo respira entre os dois.
 */
export default async function AlunoLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession()

  return (
    <>
      <StudentChrome
        nome={session.profile?.fullName ?? session.email ?? 'Aluno'}
        email={session.email}
        ehEquipe={canOpenAdmin(session.role)}
      />
      {/* pb-28 no celular reserva o dock; md:pl-60 reserva a sidebar. */}
      <div className="pb-28 md:pb-10 md:pl-60">{children}</div>
    </>
  )
}
