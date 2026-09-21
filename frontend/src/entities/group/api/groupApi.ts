import { apiRequest } from '../../../shared/api/apiClient'
import type { PageResponse } from '../../../shared/api/types'
import type { AcademyGroup, GroupPayload } from '../model/types'

export function getGroups(token: string, academyId: string, page = 0, size = 20) {
  const query = new URLSearchParams({ page: String(page), size: String(size) })
  return apiRequest<PageResponse<AcademyGroup>>(`/api/academies/${academyId}/groups?${query}`, { token })
}

export function createGroup(token: string, academyId: string, payload: GroupPayload) {
  return apiRequest<AcademyGroup>(`/api/academies/${academyId}/groups`, {
    method: 'POST',
    token,
    body: payload,
  })
}

export function updateGroup(token: string, academyId: string, group: AcademyGroup, details: GroupPayload) {
  return apiRequest<AcademyGroup>(`/api/academies/${academyId}/groups/${group.id}`, {
    method: 'PUT',
    token,
    body: { version: group.version, details },
  })
}

export function deleteGroup(token: string, academyId: string, groupId: string) {
  return apiRequest<void>(`/api/academies/${academyId}/groups/${groupId}`, {
    method: 'DELETE',
    token,
  })
}

