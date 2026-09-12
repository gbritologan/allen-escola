import Link from 'next/link'
import { Banner, type BannerHome } from '@/components/domain/banner'
import { ContinueCard } from '@/components/domain/continue-card'
import { CourseCard } from '@/components/domain/course-card'
import type { CourseSummary } from '@/core/catalog/types'
import type { HomeBlock } from '@/core/home/resolve-home'
import { cn } from '@/lib/utils'

/**
 * O DESENHO DA HOME.
 *
 * Separado da página por um motivo prático: a Home mora atrás do login e
 * precisa de dados reais para existir na tela, então eu não conseguia VER o
 * que estava construindo. Com o desenho aqui, `/design/inicio` monta a mesma
 * coisa com dados de mentira — e as duas telas desenham o MESMO código, em vez
 * de duas cópias que divergem na primeira correção.
 *
 * A ORDEM não é decidida aqui. Vem de `resolveHome()`, no domínio (D-18).
 * Este arquivo só sabe desenhar cada tipo de bloco.
 */
export function BlocosDaHome({
  saudacao,
  banner,
  blocks,
  emBreve,
}: {
  saudacao: string
  banner: BannerHome | null
  blocks: HomeBlock[]
  emBreve: CourseSummary[]
}) {
  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-14 px-6 pt-10 sm:pt-14">
      {/* A saudação muda com a hora, no fuso de Brasília — o servidor roda em
          UTC, e "Bom dia" às nove da noite é o tipo de descuido que custa
          credibilidade em silêncio. */}
      <header className="flex flex-col gap-1">
        <h1 className="text-title font-light text-ink-2">{saudacao}</h1>
      </header>

      {/* O destaque. Sem arte publicada ele não ocupa espaço nenhum — a Home
          fecha em volta como se ele não existisse. */}
      {banner && <Banner banner={banner} />}

      {blocks.map((block) => {
        switch (block.kind) {
          case 'journey':
            return (
              /*
               * O PAINEL. Quatro números, quatro cartões, no topo.
               *
               * Era uma faixa no rodapé com três números soltos. Virou a
               * primeira coisa depois da saudação porque responde "onde eu
               * estou" — a pergunta com que se abre a plataforma.
               *
               * APLICAÇÕES tem tratamento próprio, em azul. É a única das
               * quatro que a Allen mede e as outras escolas não; igual às
               * demais, o painel viraria só mais um placar de consumo.
               */
              <section key="journey" className="flex flex-col gap-3">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <Metrica valor={block.inProgress} rotulo="Cursos em andamento" />
                  <Metrica valor={block.lessonsCompleted} rotulo="Aulas concluídas" />
                  <Metrica valor={block.applications} rotulo="Aplicações feitas" destaque />
                  <Metrica valor={block.completed} rotulo="Cursos concluídos" />
                </div>
                <div className="flex justify-end">
                  <Link
                    href="/jornada"
                    className="text-label text-ink-3 transition-colors hover:text-ink"
                  >
                    Ver minha jornada →
                  </Link>
                </div>
              </section>
            )

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
                  Você ainda não começou nenhum curso. Escolha um e a Home passa a abrir por ele.
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
                  <SectionLabel>Capacitações</SectionLabel>
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
                  <Link href="/cursos" className="text-label text-ink-3 hover:text-ink">
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
                      className="glass-card group flex flex-col gap-1 rounded-[var(--radius-card)] px-5 py-4 transition-[border-color,box-shadow] duration-200 hover:glass-card-hover"
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
        }
      })}

      {/* EM BREVE vem depois de tudo que já dá para fazer. É promessa, e
          promessa antes de entrega inverte a ordem do produto. */}
      {emBreve.length > 0 && (
        <section className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <SectionLabel>Em breve</SectionLabel>
            <p className="text-body text-ink-3">Já está no seu catálogo. Abre sozinho na data.</p>
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

function Metrica({
  valor,
  rotulo,
  destaque = false,
}: {
  valor: number
  rotulo: string
  destaque?: boolean
}) {
  return (
    <div
      className={cn(
        'glass-card flex flex-col gap-1 rounded-[var(--radius-card)] px-5 py-4',
        destaque && 'border-[rgba(76,65,255,0.45)]',
      )}
    >
      <span className="text-caption uppercase tracking-[0.14em] text-ink-4">{rotulo}</span>
      <span
        data-numeric
        className={cn(
          'text-display font-light leading-none',
          destaque ? 'text-blue-light' : 'text-ink',
        )}
      >
        {valor}
      </span>
    </div>
  )
}
