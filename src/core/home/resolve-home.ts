import type { CourseSummary, Theme } from '../catalog/types'
import type { ContinueTarget } from '../progress/types'

/**
 * COMPOSIÇÃO DA HOME (D-18).
 *
 * A Home não é uma página com seções fixas escritas no JSX. É uma lista de
 * blocos tipados, resolvida no servidor. Hoje as regras são fixas e explícitas.
 * Quando a recomendação inteligente chegar, troca-se esta função — a interface
 * não muda uma linha.
 *
 * Ordem de prioridade que o briefing pede:
 *   1. Continuar de onde parou
 *   2. Masterclass
 *   3. Recomendações
 *   4. Explorar por tema
 *   5. Minha jornada
 */

export type HomeBlock =
  | { kind: 'continue'; target: ContinueTarget }
  | { kind: 'start'; courses: CourseSummary[] }
  | { kind: 'masterclass'; courses: CourseSummary[] }
  | { kind: 'recommended'; title: string; reason: string | null; courses: CourseSummary[] }
  | { kind: 'themes'; themes: Theme[] }
  | { kind: 'journey'; inProgress: number; completed: number; applications: number }

export interface HomeInput {
  continueTarget: ContinueTarget | null
  masterclasses: CourseSummary[]
  recommended: CourseSummary[]
  themes: Theme[]
  journey: { inProgress: number; completed: number; applications: number }
}

export function resolveHome(input: HomeInput): HomeBlock[] {
  const blocks: HomeBlock[] = []

  if (input.continueTarget) {
    blocks.push({ kind: 'continue', target: input.continueTarget })
  } else if (input.recommended.length > 0) {
    // Aluno novo não tem de onde continuar. Em vez de um vazio pedindo
    // desculpas, a Home abre convidando a começar.
    blocks.push({ kind: 'start', courses: input.recommended.slice(0, 3) })
  }

  if (input.masterclasses.length > 0) {
    blocks.push({ kind: 'masterclass', courses: input.masterclasses.slice(0, 4) })
  }

  if (input.recommended.length > 0) {
    blocks.push({
      kind: 'recommended',
      title: input.continueTarget ? 'Para seguir depois' : 'Comece por aqui',
      // `reason` é o gancho da recomendação explicada ("identificamos uma
      // lacuna em negociação"). Nulo enquanto não houver Skill Engine —
      // preferimos silêncio a um motivo inventado.
      reason: null,
      courses: input.recommended.slice(0, 6),
    })
  }

  if (input.themes.length > 0) {
    blocks.push({ kind: 'themes', themes: input.themes })
  }

  if (input.journey.inProgress > 0 || input.journey.completed > 0) {
    blocks.push({ kind: 'journey', ...input.journey })
  }

  return blocks
}
