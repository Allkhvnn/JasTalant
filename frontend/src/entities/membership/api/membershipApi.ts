import { apiRequest } from '../../../shared/api/apiClient'
import type { AcademyRole } from '../../../shared/api/types'
import type { AcademyMember, AcademyMemberUpdate } from '../model/types'

export function getAcademyMembers(token: string, academyId: string, role?: AcademyRole) {
  const query = new URLSearchParams()
  if (role) query.set('role', role)
  const suffix = query.size ? `?${query}` : ''
  return apiRequest<AcademyMember[]>(`/api/academies/${academyId}/members${suffix}`, { token })
}

export function updateAcademyMember(
  token: string,
  academyId: string,
  userId: string,
  payload: AcademyMemberUpdate,
) {
  return apiRequest<AcademyMember>(`/api/academies/${academyId}/members/${userId}`, {
    method: 'PUT', token, body: payload,
  })
}
