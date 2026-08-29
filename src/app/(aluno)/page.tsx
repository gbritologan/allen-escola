import Link from 'next/link'
import { ContinueCard } from '@/components/domain/continue-card'
import { CourseCard } from '@/components/domain/course-card'
import { ButtonLink } from '@/components/primitives/button'
import { Banner } from '@/components/domain/banner'
import { getBanner, getEmBreve, getHomeBlocks } from '@/lib/data/home'
import { requireSession } from '@/lib/auth/session'

/**
 * A HOME DA JORNADA.
 *
 * Não é "meus cursos". Ela responde, nesta ordem: onde eu estava, o que devo
 * fazer agora, o que posso aprender, o que estou desenvolvendo.
 *
 * A ordem dos blocos não está escrita aqui — vem de `resolveHome()`, no
 * domínio (D-18). Esta página só sabe desenhar cada tipo de bloco. Quando a
 * recomendação inteligente chegar, ela muda a ordem e a página não muda.
 */
export default async function HomePage() {
  const session = await requireSession()
  const [blocks, banner, emBreve] = await Promise.all([
    getHomeBlocks(session.userId),
    getBanner(),
    getEmBreve(),
  ])

  const primeiroNome = (session.profile?.fullName ?? '').trim().split(' ')[0]

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-14 px-6 pt-10 sm:pt-14">
      <header className="flex flex-col gap-1">
        <h1 className="text-title font-light text-ink-2">
          {primeiroNome ? `Olá, ${primeiroNome}.` : 'Olá.'}
        </h1>
      </header>

      {/* O destaque. Sem arte publicada ele não ocupa espaço nenhum — a Home
          fecha em volta como se ele não existisse. */}
      {banner && <Banner banner={banner} />}

      {blocks.map((block) => {
        switch (block.kind) {
          case 'continue':
            return (
              <section key="continue" className="flex flex-col gap-4">
                <SectionLabel>Continue de onde parou</SectionLabel>
                <ContinueCard target={block.target} />
              </section>
            )

          case 'start':
            return (
              <section key="start" className="flex flex-col gap-4">
                <SectionLabel>Comece por aqui</SectionLabel>
                <p className="max-w-[52ch] text-body text-ink-3">
                  Você ainda não começou nenhum curso. Escolha um e a Home passa a abrir por
                  ele.
                </p>
                <Grade>
                  {block.courses.map((c) => (
                    <CourseCard key={c.id} course={c} />
                  ))}
                </Grade>
              </section>
            )

          case 'masterclass':
            return (
              <section key="masterclass" className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <SectionLabel>Masterclass</SectionLabel>
                  <p className="text-body text-ink-3">
                    Um expert. Um assunto. Um mergulho profundo.
                  </p>
                </div>
                <Grade>
                  {block.courses.map((c) => (
                    <CourseCard key={c.id} course={c} />
                  ))}
                </Grade>
              </section>
            )

          case 'recommended':
            return (
              <section key="recommended" className="flex flex-col gap-4">
                <div className="flex items-end justify-between gap-4">
                  <SectionLabel>{block.title}</SectionLabel>
                  <Link href="/explorar" className="text-label text-ink-3 hover:text-ink">
                    Ver tudo
                  </Link>
                </div>
                {/* `reason` é o gancho da recomendação explicada. Nulo enquanto
                    não houver Skill Engine — silêncio é melhor que motivo
                    inventado. */}
                {block.reason && <p className="text-body text-ink-2">{block.reason}</p>}
                <Grade>
                  {block.courses.map((c) => (
                    <CourseCard key={c.id} course={c} />
                  ))}
                </Grade>
              </section>
            )

          case 'themes':
            return (
              <section key="themes" className="flex flex-col gap-4">
                <SectionLabel>Explorar por tema</SectionLabel>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {block.themes.map((t) => (
                    <Link
                      key={t.id}
                      href={`/tema/${t.slug}`}
                      className="group flex flex-col gap-1 rounded-[var(--radius-card)] border border-line bg-navy px-5 py-4 transition-[border-color,background-color] duration-200 hover:border-line-strong hover:bg-navy-soft/60"
                    >
                      <span className="text-lead font-light text-ink">{t.name}</span>
                      {t.description && (
                        <span className="line-clamp-2 text-label text-ink-4">{t.description}</span>
                      )}
                    </Link>
                  ))}
                </div>
              </section>
            )

          case 'journey':
            return (
              <section
                key="journey"
                className="flex flex-wrap items-center justify-between gap-6 rounded-[var(--radius-card)] border border-line px-6 py-5"
              >
                <div className="flex gap-8">
                  <Metrica valor={block.inProgress} rotulo="em andamento" />
                  <Metrica valor={block.completed} rotulo="concluídos" />
                  <Metrica valor={block.applications} rotulo="aplicações" />
                </div>
                <ButtonLink href="/jornada" variant="secondary" size="sm">
                  Minha jornada
                </ButtonLink>
              </section>
            )
        }
      })}

      {/* EM BREVE vem depois de tudo que já dá para fazer. É promessa, e
          promessa antes de entrega inverte a ordem do produto. */}
      {emBreve.length > 0 && (
        <section className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <SectionLabel>Em breve</SectionLabel>
            <p className="text-body text-ink-3">
              Já está no seu catálogo. Abre sozinho na data.
            </p>
          </div>
          <Grade>
            {emBreve.map((c) => (
              <CourseCard key={c.id} course={c} />
            ))}
          </Grade>
        </section>
      )}
    </main>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-caption font-medium uppercase tracking-[0.16em] text-ink-3">{children}</h2>
  )
}

function Grade({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
}

function Metrica({ valor, rotulo }: { valor: number; rotulo: string }) {
  return (
    <div className="flex flex-col">
      <span data-numeric className="text-title font-light text-ink">
        {valor}
      </span>
      <span className="text-caption text-ink-4">{rotulo}</span>
    </div>
  )
}
