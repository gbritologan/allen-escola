import type { Timestamp, UUID } from '../shared/types'

/**
 * A APLICAÇÃO — a unidade de valor da Allen (D-07).
 *
 * Não é um booleano dentro de `lesson_progress`. É entidade própria porque a
 * tese do produto é que aplicação vale mais que consumo, e o que vale mais
 * precisa existir no schema, não como flag de outra coisa.
 *
 * A presença da linha significa "aplicada". Desmarcar apaga a linha.
 */
export interface Application {
  userId: UUID
  lessonId: UUID
  completedAt: Timestamp
  /** Nota livre do aluno. Opcional, e opcional de verdade. */
  note: string | null

  /**
   * Reservado para EVIDÊNCIA (briefing §12). Nulo em todo o MVP.
   *
   * PARA FAZER → EVIDÊNCIA → RESULTADO é a evolução prevista. Quando chegar,
   * arquivo, link, texto e checklist entram por aqui — sem migração destrutiva
   * e sem nenhuma complexidade adicionada agora.
   */
  evidenceType: EvidenceType | null
  evidence: unknown | null
}

export type EvidenceType = 'file' | 'link' | 'text' | 'checklist'

export interface ApplicationSummary {
  total: number
  lastAt: Timestamp | null
}
