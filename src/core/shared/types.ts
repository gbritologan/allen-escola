/** Identificador vindo do Postgres. */
export type UUID = string

/** ISO 8601, como o Postgres devolve. */
export type Timestamp = string

/**
 * Ciclo de publicação. Rascunho é o estado natural: tudo nasce invisível para
 * o aluno e publicar é um ato deliberado.
 */
export type ContentStatus = 'draft' | 'published' | 'archived'

export const CONTENT_STATUS_LABEL: Record<ContentStatus, string> = {
  draft: 'Rascunho',
  published: 'Publicado',
  archived: 'Arquivado',
}

export function isPublished(item: { status: ContentStatus }): boolean {
  return item.status === 'published'
}
