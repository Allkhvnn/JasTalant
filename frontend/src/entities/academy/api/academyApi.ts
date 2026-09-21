import { apiRequest } from '../../../shared/api/apiClient'
import type { Academy } from '../model/types'

export function getAcademy(token: string, academyId: string) {
  return apiRequest<Academy>(`/api/academies/${academyId}`, { token })
}

