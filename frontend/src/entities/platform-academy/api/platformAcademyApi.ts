import { apiRequest } from '../../../shared/api/apiClient'
import type { AcademyStatus, PlatformAcademy, PlatformAcademyPage } from '../model/types'

export function getPlatformAcademies(
  token: string,
  options: { status?: AcademyStatus; search?: string; page?: number; size?: number } = {},
) {
  const query = new URLSearchParams()
  if (options.status) query.set('status', options.status)
  if (options.search) query.set('search', options.search)
  query.set('page', String(options.page ?? 0))
  query.set('size', String(options.size ?? 20))
  return apiRequest<PlatformAcademyPage>(`/api/platform/academies?${query}`, { token })
}

export function getPlatformAcademy(token: string, academyId: string) {
  return apiRequest<PlatformAcademy>(`/api/platform/academies/${academyId}`, { token })
}

export function updatePlatformAcademyStatus(
  token: string,
  academyId: string,
  status: AcademyStatus,
  reason: string,
  version: number,
) {
  return apiRequest<PlatformAcademy>(`/api/platform/academies/${academyId}/status`, {
    method: 'PUT', token, body: { status, reason, version },
  })
}
