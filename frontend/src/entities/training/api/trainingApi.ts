import { apiRequest } from '../../../shared/api/apiClient'
import type { ScheduledTraining, ScheduledTrainingPayload } from '../model/types'

const path = (academyId: string) => `/api/academies/${academyId}/trainings`

export function getTrainings(
  token: string,
  academyId: string,
  from: string,
  to: string,
  groupId?: string,
) {
  const query = new URLSearchParams({ from, to })
  if (groupId) query.set('groupId', groupId)
  return apiRequest<ScheduledTraining[]>(`${path(academyId)}?${query}`, { token })
}

export function createTraining(
  token: string,
  academyId: string,
  payload: ScheduledTrainingPayload,
) {
  return apiRequest<ScheduledTraining>(path(academyId), { method: 'POST', token, body: payload })
}

export function updateTraining(
  token: string,
  academyId: string,
  training: ScheduledTraining,
  details: ScheduledTrainingPayload,
) {
  return apiRequest<ScheduledTraining>(`${path(academyId)}/${training.id}`, {
    method: 'PUT', token, body: { version: training.version, details },
  })
}

export function deleteTraining(token: string, academyId: string, trainingId: string) {
  return apiRequest<void>(`${path(academyId)}/${trainingId}`, { method: 'DELETE', token })
}
