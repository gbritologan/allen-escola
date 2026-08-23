import type { Timestamp, UUID } from '../shared/types'

/**
 * CAMADA DE SKILLS — grava desde o dia um, sem nenhuma interface (D-08).
 *
 * Este é o item de arquitetura mais barato e mais valioso do projeto.
 * `skill_signals` é append-only, escrito por trigger, sem custo perceptível e
 * sem UI. No dia em que o Skill Engine ligar, ele encontra meses de
 * comportamento real em vez de uma base vazia.
 *
 * Passado não se cria retroativamente.
 */

export interface Skill {
  id: UUID
  slug: string
  name: string
  description: string | null
}

/** Origem do sinal. A lista cresce; o histórico antigo continua legível. */
export type SignalKind =
  | 'lesson_completed'
  | 'application_completed'
  | 'course_completed'
  /** Futuro: respostas a diagnósticos dos agentes. */
  | 'assessment'

export interface SkillSignal {
  id: UUID
  userId: UUID
  skillId: UUID
  kind: SignalKind
  /** Peso do evento. `lesson_skills.weight` entra aqui no momento da gravação. */
  value: number
  /** De onde veio (lição, curso, avaliação). Mantém o sinal auditável. */
  sourceId: UUID | null
  createdAt: Timestamp
}

/**
 * Snapshot recalculável a partir dos sinais. Nunca é a fonte de verdade —
 * os sinais são.
 */
export interface SkillScore {
  userId: UUID
  skillId: UUID
  /** 0–100. Ferramenta de orientação, não medida científica. */
  score: number
  /** Quanta evidência sustenta esse número. Sem isso, o score mente. */
  confidence: number
  updatedAt: Timestamp
}
