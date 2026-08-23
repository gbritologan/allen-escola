import type { ContentStatus, Timestamp, UUID } from '../shared/types'

/**
 * TEMA → CURSO → MÓDULO → AULA.
 * Um curso pertence a vários temas (N:N, com posição própria em cada um).
 */

export interface Theme {
  id: UUID
  slug: string
  name: string
  description: string | null
  /** Acento opcional do tema. Não substitui o azul da Allen — apenas identifica. */
  accent: string | null
  position: number
  status: ContentStatus
}

export interface Instructor {
  id: UUID
  slug: string
  name: string
  headline: string | null
  bio: string | null
  photoUrl: string | null
}

/**
 * Formato editorial do curso (D-03).
 *
 * Enum, não booleano `is_masterclass`. Masterclass muda apresentação, não
 * estrutura — e o terceiro formato vai aparecer.
 */
export type CourseFormat = 'course' | 'masterclass'

export const COURSE_FORMAT_LABEL: Record<CourseFormat, string> = {
  course: 'Curso',
  masterclass: 'Masterclass',
}

export interface Course {
  id: UUID
  slug: string
  title: string
  /** Uma linha. É o que aparece no card. */
  summary: string | null
  /** Texto longo da página do curso. */
  description: string | null
  coverUrl: string | null
  format: CourseFormat
  instructor: Instructor | null
  themes: Theme[]
  status: ContentStatus
  publishedAt: Timestamp | null
  /** Soma das aulas publicadas, mantida pelo banco. Evita agregar na leitura. */
  durationSeconds: number
  lessonCount: number
}

export interface Module {
  id: UUID
  courseId: UUID
  title: string
  summary: string | null
  position: number
  status: ContentStatus
}

export type VideoProviderName = 'bunny' | 'mux'

export interface Lesson {
  id: UUID
  moduleId: UUID
  slug: string
  title: string
  description: string | null
  position: number
  status: ContentStatus

  /** O vídeo mora no provedor; aqui fica só a referência (D-17). */
  videoProvider: VideoProviderName | null
  videoAssetId: string | null
  durationSeconds: number

  /**
   * O par que define a Allen.
   * Nomes preservados em português de propósito — ver `src/core/README.md`.
   */
  para_saber: string | null
  para_fazer: string | null
}

export type MaterialKind = 'file' | 'link' | 'template'

export interface Material {
  id: UUID
  lessonId: UUID | null
  courseId: UUID | null
  kind: MaterialKind
  title: string
  url: string
  position: number
}

/** Curso com currículo carregado — o formato que a página do curso consome. */
export interface CourseOutline extends Course {
  modules: Array<Module & { lessons: Lesson[] }>
}

/** Uma aula tem Para Fazer? É a pergunta que o Content Studio faz antes de publicar. */
export function hasApplication(lesson: Lesson): boolean {
  return Boolean(lesson.para_fazer && lesson.para_fazer.trim().length > 0)
}
