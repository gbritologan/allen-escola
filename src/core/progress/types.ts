import type { Timestamp, UUID } from '../shared/types'

/** Uma aula só ganha linha quando o aluno começa. Ausência = não iniciada. */
export type LessonState = 'in_progress' | 'completed'

export interface LessonProgress {
  userId: UUID
  lessonId: UUID
  state: LessonState
  /** Segundo exato onde parou. É isso que faz "continuar" parecer mágica. */
  positionSeconds: number
  watchedSeconds: number
  completedAt: Timestamp | null
  updatedAt: Timestamp
}

/**
 * Matrícula — tabela derivada, mantida por trigger (D-06).
 *
 * Existe para que a Home responda "onde eu parei" com **uma** query indexada,
 * e não com um agregado sobre todo o histórico de aulas.
 */
export interface Enrollment {
  userId: UUID
  courseId: UUID
  startedAt: Timestamp
  lastLessonId: UUID | null
  lastSeenAt: Timestamp
  completedLessons: number
  totalLessons: number
  progressPercent: number
  completedAt: Timestamp | null
}

/** O card mais importante do produto. */
export interface ContinueTarget {
  courseId: UUID
  courseSlug: string
  courseTitle: string
  moduleTitle: string
  modulePosition: number
  lessonId: UUID
  lessonSlug: string
  lessonTitle: string
  lessonPosition: number
  positionSeconds: number
  durationSeconds: number
  progressPercent: number
}

export function isComplete(enrollment: Enrollment): boolean {
  return enrollment.completedAt !== null
}

/**
 * Quando o vídeo "conta" como assistido.
 *
 * 92% e não 100%: créditos finais, um respiro no fim, o aluno que pula os
 * últimos segundos. Exigir 100% transforma progresso em burocracia.
 */
export const COMPLETION_THRESHOLD = 0.92

export function shouldMarkComplete(positionSeconds: number, durationSeconds: number): boolean {
  if (durationSeconds <= 0) return false
  return positionSeconds / durationSeconds >= COMPLETION_THRESHOLD
}

/**
 * Retomar exatamente onde parou é ótimo — menos nos últimos segundos, quando
 * recomeçar do zero é o que a pessoa quer.
 */
export function resumePosition(progress: LessonProgress | null, durationSeconds: number): number {
  if (!progress) return 0
  if (progress.state === 'completed') return 0
  if (durationSeconds > 0 && progress.positionSeconds / durationSeconds >= COMPLETION_THRESHOLD) return 0
  return Math.max(0, progress.positionSeconds - 3)
}
