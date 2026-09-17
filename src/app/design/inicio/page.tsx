import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { AmbienteAllen } from '@/components/backgrounds/ambiente'
import { BlocosDaHome } from '@/components/domain/blocos-da-home'
import { StudentChrome } from '@/components/nav/chrome'
import type { CourseSummary, Theme } from '@/core/catalog/types'
import { resolveHome } from '@/core/home/resolve-home'
import { saudacao } from '@/core/home/saudacao'
import { canOpenAdmin } from '@/core/identity/permissions'
import type { ContinueTarget } from '@/core/progress/types'
import { getSession } from '@/lib/auth/session'

export const metadata: Metadata = { title: 'A Home · exemplo' }

function curso(id: string, title: string, summary: string, extra: Partial<CourseSummary> = {}) {
  return {
    id,
    slug: id,
    title,
    summary,
    coverUrl: null,
    format: 'course',
    durationSeconds: 2520,
    lessonCount: 3,
    instructorName: 'Equipe Allen',
    themeNames: [],
    availableAt: null,
    ...extra,
  } as CourseSummary
}

const CONTINUAR: ContinueTarget = {
  courseId: 'c1',
  courseSlug: 'negociar',
  courseTitle: 'Negociação',
  moduleTitle: 'Antes da conversa',
  modulePosition: 1,
  lessonId: 'l1',
  lessonSlug: 'abertura',
  lessonTitle: 'A abertura decide o resto',
  lessonPosition: 2,
  positionSeconds: 312,
  durationSeconds: 840,
  progressPercent: 37,
}

/**
 * A HOME COM DADOS DE MENTIRA.
 *
 * Existe porque a Home de verdade mora atrás do login E depende de progresso
 * real: para ver o "Continue de onde parou" eu precisaria ter assistido meia
 * aula de verdade.
 *
 * Os números vêm cheios de propósito — um painel zerado não mostra se o
 * desenho aguenta dois dígitos.
 */
export default async function InicioExemploPage() {
  if (process.env.NODE_ENV === 'production') {
    const session = await getSession()
    if (!session || !canOpenAdmin(session.role)) redirect('/')
  }

  const blocks = resolveHome({
    continueTarget: CONTINUAR,
    masterclasses: [
      curso('ia-diaria', 'IA no trabalho diário', 'Um mergulho em como usar IA no que você já faz.', {
        format: 'masterclass',
        lessonCount: 1,
        durationSeconds: 1680,
      }),
    ],
    recommended: [
      curso('negociar', 'Negociação', 'Conduzir uma negociação sem depender de sorte.'),
      curso('prospectar', 'Prospecção fria', 'Falar com quem não pediu para falar com você.'),
      curso('dados', 'Ler um número', 'Decidir com planilha, não com opinião.'),
    ],
    themes: [
      { id: 't1', slug: 'negociacao', name: 'Negociação', description: 'Acordo, troca, o sim' },
      { id: 't2', slug: 'vendas', name: 'Vendas', description: 'Prospecção, pipeline, fechamento' },
      { id: 't3', slug: 'ia', name: 'Inteligência Artificial', description: 'IA no que você já faz' },
    ] as Theme[],
    journey: { inProgress: 2, completed: 1, applications: 14, lessonsCompleted: 23 },
  })

  return (
    <>
      <AmbienteAllen />
      <StudentChrome nome="Gabriel" email="gabriel@allenescola.com" ehEquipe />
      <div className="pb-28 md:pb-10 md:pl-60">
        <BlocosDaHome
          saudacao={saudacao('Gabriel Logan')}
          banner={{
            id: 'b1',
            eyebrow: 'Soluções em destaque',
            title: 'Fundamentos de IA',
            subtitle: 'Programe com palavras — do primeiro prompt ao que roda sozinho.',
            ctaLabel: 'Ver a masterclass',
            ctaHref: '/capacitacoes',
            // Sem arte de verdade ainda: a prévia usa a Athena da marca só
            // para o bloco existir e dar para julgar proporção.
            imageUrl: '/brand/athena.webp',
    imageUrlLight: null,
          }}
          blocks={blocks}
          emBreve={[
            curso('shopify', 'Capacitação em Shopify', 'Montar e operar a loja.', {
              availableAt: '2027-01-15T00:00:00-03:00',
            }),
          ]}
        />
      </div>
    </>
  )
}
