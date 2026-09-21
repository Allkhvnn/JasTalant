import { apiRequest } from '../../../shared/api/apiClient'
import type {
  AcademyApplication,
  AcademyApplicationPage,
  ApplicationStatus,
} from '../model/types'

export function getMyApplication(token: string) {
  return apiRequest<AcademyApplication>('/api/applications/mine', { token })
}

export function getApplications(
  token: string,
  status: ApplicationStatus,
  page: number,
  size = 10,
) {
  const query = new URLSearchParams({
    status,
    page: String(page),
    size: String(size),
  })
  return apiRequest<AcademyApplicationPage>(`/api/platform/applications?${query}`, { token })
}

export function approveApplication(token: string, id: string) {
  return apiRequest<AcademyApplication>(`/api/platform/applications/${id}/approve`, {
    method: 'POST',
    token,
  })
}

export function rejectApplication(token: string, id: string, reason: string) {
  return apiRequest<AcademyApplication>(`/api/platform/applications/${id}/reject`, {
    method: 'POST',
    token,
    body: { reason },
  })
}
