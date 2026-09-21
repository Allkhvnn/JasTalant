import { apiRequest } from '../../../shared/api/apiClient'
import type { PageResponse } from '../../../shared/api/types'
import type { DevelopmentAssessment, DevelopmentAssessmentPayload } from '../model/types'

const path = (academyId: string, playerId: string) =>
  `/api/academies/${academyId}/players/${playerId}/development-assessments`

export function getDevelopmentAssessments(
  token: string,
  academyId: string,
  playerId: string,
  page = 0,
  size = 20,
) {
  const query = new URLSearchParams({ page: String(page), size: String(size) })
  return apiRequest<PageResponse<DevelopmentAssessment>>(`${path(academyId, playerId)}?${query}`, { token })
}

export function createDevelopmentAssessment(
  token: string,
  academyId: string,
  playerId: string,
  payload: DevelopmentAssessmentPayload,
) {
  return apiRequest<DevelopmentAssessment>(path(academyId, playerId), {
    method: 'POST', token, body: payload,
  })
}

export function updateDevelopmentAssessment(
  token: string,
  academyId: string,
  playerId: string,
  assessment: DevelopmentAssessment,
  details: DevelopmentAssessmentPayload,
) {
  return apiRequest<DevelopmentAssessment>(`${path(academyId, playerId)}/${assessment.id}`, {
    method: 'PUT', token, body: { version: assessment.version, details },
  })
}

export function deleteDevelopmentAssessment(
  token: string,
  academyId: string,
  playerId: string,
  assessmentId: string,
) {
  return apiRequest<void>(`${path(academyId, playerId)}/${assessmentId}`, { method: 'DELETE', token })
}
