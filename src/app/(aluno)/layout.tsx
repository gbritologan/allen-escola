import { AmbienteAllen } from '@/components/backgrounds/ambiente'
import { StudentChrome } from '@/components/nav/chrome'
import { canOpenAdmin } from '@/core/identity/permissions'
import { requireSession } from '@/lib/auth/session'
import { SalaDeEspera } from './sala-de-espera'

/**
 * A casca da área do aluno.
 *
 * No desktop, a sidebar ocupa 240px fixos à esquerda e o conteúdo mora ao lado
 * dela. No celular não existe sidebar: barra em cima, dock embaixo, e o
 * conteúdo respira entre os dois.
 *
 * E aqui também mora o único lugar que decide se a pessoa vê o produto ou a
 * sala de espera. Um lugar só, na casca — espalhar essa checagem por dez
 * páginas é como nove delas acabam esquecendo.
 */
export default async function AlunoLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession()
  const nome = session.profile?.fullName ?? session.email ?? 'Aluno'

  /*
   * A equipe passa direto. `has_access()` no banco já abre para `is_staff()`, e
   * se a interface travasse aqui o admin veria a sala de espera enquanto o
   * Postgres o deixa ver tudo — a interface mentindo sobre o banco.
   */
  const bloqueado = !canOpenAdmin(session.role) && session.acesso && session.acesso.estado !== 'ativo'

  if (bloqueado && session.acesso) {
    return <SalaDeEspera acesso={session.acesso} nome={nome} />
  }

  return (
    <>
      {/* Atrás de tudo, e é o que dá sentido ao vidro (D-51). */}
      <AmbienteAllen />

      <StudentChrome
        nome={nome}
        email={session.email}
        ehEquipe={canOpenAdmin(session.role)}
      />
      {/* pb-28 no celular reserva o dock; md:pl-60 reserva a sidebar. */}
      <div className="pb-28 md:pb-10 md:pl-60">{children}</div>
    </>
  )
}
