import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { montarMapa, type AulaEntrada, type CursoEntrada } from '@/core/mapa/layout'
import { canOpenAdmin } from '@/core/identity/permissions'
import { getSession } from '@/lib/auth/session'
import { Ceu } from '@/app/(aluno)/mapa/ceu'

export const metadata: Metadata = { title: 'O Mapa · exemplo' }

/**
 * O MAPA COM UM CATÁLOGO DE VERDADE.
 *
 * A Allen tem dois cursos hoje, e um céu de duas estrelas não deixa ninguém
 * julgar a ideia. Esta página monta o mesmo componente com o tamanho de
 * catálogo que a escola vai ter — seis temas, dezoito cursos — para a decisão
 * de design ser tomada sobre o produto cheio, não sobre o produto vazio.
 *
 * Fica em `/design` de propósito: é a vitrine do sistema, é pública, e não
 * mente para ninguém dizendo que este conteúdo existe.
 */

const TEMAS = [
  { id: 't1', slug: 'negociacao', name: 'Negociação', icon: 'balanca', description: 'Acordo, troca, o sim' },
  { id: 't2', slug: 'vendas', name: 'Vendas', icon: 'estandarte', description: 'Prospecção, pipeline, fechamento' },
  { id: 't3', slug: 'ia', name: 'Inteligência Artificial', icon: 'olho', description: 'IA aplicada ao que você já faz' },
  { id: 't4', slug: 'comunicacao', name: 'Comunicação', icon: 'agora', description: 'Falar, escrever, convencer' },
  { id: 't5', slug: 'lideranca', name: 'Liderança', icon: 'mestre', description: 'Time, decisão, delegação' },
  { id: 't6', slug: 'dados', name: 'Dados', icon: 'podio', description: 'Medir para decidir' },
]

const CURSOS_POR_TEMA: Record<string, string[]> = {
  t1: ['Conduzir uma negociação', 'Preço sem desconto', 'Quando levantar da mesa'],
  t2: ['Prospecção fria que responde', 'A primeira reunião', 'Fechar sem empurrar'],
  t3: ['IA no trabalho diário', 'Prompt que resolve', 'Automatizar o repetitivo'],
  t4: ['Ser entendido na primeira vez', 'Apresentar para decisor'],
  t5: ['Delegar sem largar', 'A conversa difícil', 'Primeiro time'],
  t6: ['Sair do achismo', 'A planilha que decide'],
}

const CURSOS: CursoEntrada[] = Object.entries(CURSOS_POR_TEMA).flatMap(([temaId, titulos]) =>
  titulos.map((title, i) => ({
    id: `${temaId}-c${i}`,
    slug: `${temaId}-c${i}`,
    title,
    temaId,
    lessonCount: 3 + (i % 3),
    durationSeconds: 2400,
  })),
)

/**
 * Estados espalhados de propósito: alguns cursos aplicados, alguns só
 * assistidos, a maioria intocada. Um mapa todo aceso não mostraria a diferença
 * entre acender e não acender, que é justamente o que se quer ver.
 */
const AULAS: AulaEntrada[] = CURSOS.flatMap((c, ci) =>
  Array.from({ length: c.lessonCount }, (_, li) => {
    const semente = ci * 7 + li * 3
    const vista = semente % 5 < 2
    return {
      id: `${c.id}-a${li}`,
      courseId: c.id,
      title: `Aula ${li + 1}`,
      vista,
      aplicada: vista && semente % 9 < 2,
    }
  }),
)

export default async function MapaExemploPage() {
  // Mesma guarda de /design: é referência de equipe, não conteúdo de aluno.
  // Em produção, só a equipe. Em desenvolvimento, quem subiu o servidor já é
  // a equipe — exigir login para ver a referência de design só atrapalha quem
  // está construindo.
  if (process.env.NODE_ENV === 'production') {
    const session = await getSession()
    if (!session || !canOpenAdmin(session.role)) redirect('/')
  }

  const mapa = montarMapa(TEMAS, CURSOS, AULAS, 'Gabriel')
  const constelacoes = mapa.astros.filter((a) => a.tipo === 'tema')

  return (
    <div className="relative h-dvh w-full">
      <Ceu mapa={mapa} temas={constelacoes} />
      <p className="pointer-events-none absolute bottom-4 left-4 z-20 max-w-[15rem] rounded-[var(--radius-card)] border border-line bg-[rgba(10,15,46,0.9)] px-4 py-3 text-caption text-ink-4 [backdrop-filter:blur(12px)]">
        Exemplo do sistema de design — catálogo fictício, para ver o mapa cheio.
      </p>
    </div>
  )
}
