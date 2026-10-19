import { apiRequest } from '../../../shared/api/apiClient'

export const academyActions = [
  'PLAYER_CREATED', 'PLAYER_UPDATED', 'PLAYER_DELETED', 'PLAYER_AVATAR_UPDATED', 'PLAYER_AVATAR_REMOVED',
  'PLAYERS_IMPORTED', 'ATTENDANCE_CREATED', 'ATTENDANCE_UPDATED',
  'DEVELOPMENT_CREATED', 'DEVELOPMENT_UPDATED', 'DEVELOPMENT_DELETED',
  'MEMBER_PROFILE_UPDATED', 'MEMBER_ROLES_UPDATED', 'MEMBER_ACCESS_ENABLED', 'MEMBER_ACCESS_DISABLED',
  'MEMBER_AVATAR_UPDATED', 'MEMBER_AVATAR_REMOVED',
] as const
export const platformActions = [
  'APPLICATION_APPROVED', 'APPLICATION_REJECTED', 'ACADEMY_ACTIVATED', 'ACADEMY_SUSPENDED', 'ACADEMY_ARCHIVED',
] as const
export type AuditAction = typeof academyActions[number] | typeof platformActions[number]
export type AuditEvent = {
  id: string; academyId: string | null; actorId: string; actorName: string
  action: AuditAction; targetId: string; targetName: string; occurredAt: string
}
export type AuditPage = { items: AuditEvent[]; page: number; size: number; totalElements: number }
export type AuditActor = { id: string; name: string }

export function getAudit(token: string, path: string, query: string) {
  return apiRequest<AuditPage>(`${path}?${query}`, { token })
}
export function getAuditActors(token: string, path: string) {
  return apiRequest<AuditActor[]>(`${path}/actors`, { token })
}
