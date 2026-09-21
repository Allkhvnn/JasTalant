import { apiRequest } from '../../../shared/api/apiClient'
import type { PageResponse } from '../../../shared/api/types'
import type { Player } from '../../player/model/types'
import type { ChildAttendance } from '../model/types'

export function getMyChildren(token: string, academyId: string, page = 0, size = 20) {
  const query = new URLSearchParams({ page: String(page), size: String(size) })
  return apiRequest<PageResponse<Player>>(`/api/academies/${academyId}/parent/players?${query}`, { token })
}

export function getChildAttendance(
  token: string,
  academyId: string,
  playerId: string,
  page = 0,
  size = 20,
) {
  const query = new URLSearchParams({ page: String(page), size: String(size) })
  return apiRequest<PageResponse<ChildAttendance>>(
    `/api/academies/${academyId}/parent/players/${playerId}/attendance?${query}`,
    { token },
  )
}
