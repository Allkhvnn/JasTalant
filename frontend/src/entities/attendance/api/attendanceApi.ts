import { apiRequest } from '../../../shared/api/apiClient'
import type { AttendanceSheet, AttendanceSheetPayload } from '../model/types'

function attendancePath(academyId: string, groupId: string, trainingDate: string) {
  return `/api/academies/${academyId}/groups/${groupId}/attendance/${trainingDate}`
}

export function getAttendance(
  token: string,
  academyId: string,
  groupId: string,
  trainingDate: string,
) {
  return apiRequest<AttendanceSheet>(attendancePath(academyId, groupId, trainingDate), { token })
}

export function saveAttendance(
  token: string,
  academyId: string,
  groupId: string,
  trainingDate: string,
  payload: AttendanceSheetPayload,
) {
  return apiRequest<AttendanceSheet>(attendancePath(academyId, groupId, trainingDate), {
    method: 'PUT',
    token,
    body: payload,
  })
}

function trainingAttendancePath(academyId: string, trainingId: string) {
  return `/api/academies/${academyId}/trainings/${trainingId}/attendance`
}

export function getTrainingAttendance(token: string, academyId: string, trainingId: string) {
  return apiRequest<AttendanceSheet>(trainingAttendancePath(academyId, trainingId), { token })
}

export function saveTrainingAttendance(
  token: string,
  academyId: string,
  trainingId: string,
  payload: AttendanceSheetPayload,
) {
  return apiRequest<AttendanceSheet>(trainingAttendancePath(academyId, trainingId), {
    method: 'PUT', token, body: payload,
  })
}
