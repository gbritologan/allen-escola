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
 * ORDEM (revista a pedido do Gabriel, com a referência do Arkom na mão):
 *   1. O painel — onde eu estou, em quatro números
 *   2. Continuar de onde parou
 *   3. Masterclass
 *   4. Recomendações
 *   5. Explorar por tema
 *
 * A jornada era o ÚLTIMO bloco e virou o primeiro. O motivo: ela responde
 * "onde eu estou", que é a pergunta com que a pessoa abre a plataforma. No
 * rodapé, ela respondia essa pergunta para quem já tinha rolado a página
 * inteira procurando por outra coisa.
 *
 * E ela aparece SEMPRE, inclusive zerada. Um placar que começa em zero num
 * produto sobre fazer não é vazio — é o convite. Esconder até existir número
 * também esconderia o que a escola mede.
 */

export type HomeBlock =
  | { kind: 'continue'; target: ContinueTarget }
  | { kind: 'start'; courses: CourseSummary[] }
  | { kind: 'masterclass'; courses: CourseSummary[] }
  | { kind: 'recommended'; title: string; reason: string | null; courses: CourseSummary[] }
  | { kind: 'themes'; themes: Theme[] }
  | {
      kind: 'journey'
      inProgress: number
      completed: number
      applications: number
      lessonsCompleted: number
    }

export interface HomeInput {
  continueTarget: ContinueTarget | null
  masterclasses: CourseSummary[]
  recommended: CourseSummary[]
  themes: Theme[]
  journey: {
    inProgress: number
    completed: number
    applications: number
    lessonsCompleted: number
  }
}

export function resolveHome(input: HomeInput): HomeBlock[] {
  const blocks: HomeBlock[] = []

  blocks.push({ kind: 'journey', ...input.journey })

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

  return blocks
}
