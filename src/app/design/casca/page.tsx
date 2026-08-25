import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { StudentChrome } from '@/components/nav/chrome'
import { canOpenAdmin } from '@/core/identity/permissions'
import { getSession } from '@/lib/auth/session'

export const metadata: Metadata = { title: 'A casca · exemplo' }

/**
 * A CASCA DO ALUNO, SEM PRECISAR ESTAR LOGADO.
 *
 * A sidebar só existe dentro da área do aluno, que exige sessão — então quem
 * está construindo não consegue vê-la sem entrar. Isso já custou caro uma vez:
 * mudança grande de layout enviada sem ninguém ter olhado.
 */
export default async function CascaExemploPage() {
  if (process.env.NODE_ENV === 'production') {
    const session = await getSession()
    if (!session || !canOpenAdmin(session.role)) redirect('/')
  }

  return (
    <>
      <StudentChrome nome="Gabriel" email="gabriel@allenescola.com" ehEquipe />
      <div className="pb-28 md:pb-10 md:pl-60">
        <main className="mx-auto flex max-w-4xl flex-col gap-8 px-6 pt-10 sm:pt-14">
          <header className="flex flex-col gap-2">
            <h1 className="text-display font-light">Exemplo da casca</h1>
            <p className="max-w-[60ch] text-body text-ink-3">
              Conteúdo de mentira, só para ver a sidebar com algo ao lado. No celular a sidebar
              some e viram barra em cima e dock embaixo.
            </p>
          </header>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {['Negociação', 'Vendas', 'IA no trabalho', 'Comunicação', 'Liderança', 'Dados'].map(
              (t) => (
                <div
                  key={t}
                  className="flex flex-col gap-2 rounded-[var(--radius-card)] border border-line bg-navy p-5"
                >
                  <span className="text-body text-ink">{t}</span>
                  <span className="text-caption text-ink-4">3 aulas · 42min</span>
                </div>
              ),
            )}
          </div>
        </main>
      </div>
    </>
  )
}
