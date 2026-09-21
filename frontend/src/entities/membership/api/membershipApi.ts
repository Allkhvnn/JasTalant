import { apiRequest } from '../../../shared/api/apiClient'
import type { AcademyRole } from '../../../shared/api/types'
import type { AcademyMember } from '../model/types'

export function getAcademyMembers(token: string, academyId: string, role: AcademyRole) {
  const query = new URLSearchParams({ role })
  return apiRequest<AcademyMember[]>(`/api/academies/${academyId}/members?${query}`, { token })
}
