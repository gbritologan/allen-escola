import { StudentChrome } from '@/components/nav/chrome'
import { requireSession } from '@/lib/auth/session'

/**
 * A casca da área do aluno.
 *
 * Conteúdo full-bleed: nenhuma largura é reservada para chrome. A barra
 * superior flutua sobre a página e o dock mobile também — é isso que permite
 * a uma tela de curso ocupar a tela inteira quando ela precisar (D-21).
 */
export default async function AlunoLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession()

  return (
    <>
      <StudentChrome nome={session.profile?.fullName ?? session.email ?? 'Aluno'} />
      {/* Espaço para a barra (56px) e para o dock, que no mobile flutua sobre
          o rodapé da página. */}
      <div className="pb-28 md:pt-14 md:pb-16">{children}</div>
    </>
  )
}
