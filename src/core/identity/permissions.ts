import type { Role } from './roles'

/**
 * Matriz de permissões — espelho em TypeScript do que a RLS aplica no Postgres.
 *
 * ATENÇÃO: isto **não é** a segurança do produto. A segurança mora no banco
 * (D-11). Esta matriz existe para a interface saber o que mostrar, e para que
 * uma divergência entre UI e banco apareça em revisão de código, num arquivo
 * só, em vez de espalhada por quarenta componentes.
 *
 * Se você mudar algo aqui, mude a política correspondente em
 * `supabase/migrations/0007_rls.sql` — e vice-versa.
 */
export type Capability =
  | 'content.read.published'
  | 'content.read.draft'
  | 'content.write'
  | 'content.publish'
  | 'content.delete'
  | 'people.manage'
  | 'progress.read.others'
  | 'progress.write.own'
  | 'billing.manage'

const MATRIX: Record<Capability, readonly Role[]> = {
  'content.read.published': ['admin', 'editor', 'student', 'org_manager'],
  'content.read.draft': ['admin', 'editor'],
  'content.write': ['admin', 'editor'],
  'content.publish': ['admin', 'editor'],
  'content.delete': ['admin'],
  'people.manage': ['admin'],
  'progress.read.others': ['admin', 'org_manager'],
  'progress.write.own': ['admin', 'editor', 'student', 'org_manager'],
  'billing.manage': ['admin'],
}

export function can(role: Role, capability: Capability): boolean {
  return MATRIX[capability].includes(role)
}

/** Atalho para as áreas que existem hoje. */
export function canOpenAdmin(role: Role): boolean {
  return can(role, 'content.write')
}
