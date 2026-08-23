import type { Timestamp, UUID } from '../shared/types'

/**
 * Papéis da Allen Escola.
 *
 * `org_manager` (liderança empresarial, plano B2B) está declarado mas não é
 * atribuível hoje — o briefing pede para não implementar B2B agora e para não
 * criar arquitetura incompatível com ele depois. Declarar o papel custa nada;
 * descobrir que o enum não comporta B2B custa uma migração no pior momento.
 */
export type Role = 'admin' | 'editor' | 'student' | 'org_manager'

export const ASSIGNABLE_ROLES = ['admin', 'editor', 'student'] as const satisfies readonly Role[]

export const ROLE_LABEL: Record<Role, string> = {
  admin: 'Admin',
  editor: 'Conteudista',
  student: 'Aluno',
  org_manager: 'Liderança',
}

export const ROLE_DESCRIPTION: Record<Role, string> = {
  admin: 'Acesso total, incluindo pessoas e configurações.',
  editor: 'Cria, edita e organiza conteúdo. Não administra pessoas.',
  student: 'Consome conteúdo, acompanha o próprio progresso.',
  org_manager: 'Acompanha o time. Reservado para o plano empresarial.',
}

export interface Profile {
  id: UUID
  fullName: string | null
  avatarUrl: string | null
  role: Role
  onboardedAt: Timestamp | null
  createdAt: Timestamp
}

export function isStaff(role: Role): boolean {
  return role === 'admin' || role === 'editor'
}

/**
 * O papel vem do JWT, não de um SELECT em profiles (D-09). Se a claim não
 * estiver lá, o padrão é o menor privilégio possível.
 */
export function roleFromClaim(claim: unknown): Role {
  return claim === 'admin' || claim === 'editor' || claim === 'org_manager' ? claim : 'student'
}
