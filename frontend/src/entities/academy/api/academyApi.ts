import { apiRequest } from '../../../shared/api/apiClient'
import type { Academy, AcademyDashboard } from '../model/types'

export function getAcademy(token: string, academyId: string) {
  return apiRequest<Academy>(`/api/academies/${academyId}`, { token })
}

export function getAcademyDashboard(token: string, academyId: string) {
  return apiRequest<AcademyDashboard>(`/api/academies/${academyId}/dashboard`, { token })
}

