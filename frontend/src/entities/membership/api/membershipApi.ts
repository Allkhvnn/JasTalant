import { apiMultipartRequest, apiRequest } from '../../../shared/api/apiClient'
import type { AcademyRole } from '../../../shared/api/types'
import type { AcademyMember, AcademyMemberUpdate } from '../model/types'

export function getAcademyMembers(token: string, academyId: string, role?: AcademyRole) {
  const query = new URLSearchParams()
  if (role) query.set('role', role)
  const suffix = query.size ? `?${query}` : ''
  return apiRequest<AcademyMember[]>(`/api/academies/${academyId}/members${suffix}`, { token })
}

export function updateAcademyMember(
  token: string,
  academyId: string,
  userId: string,
  payload: AcademyMemberUpdate,
) {
  return apiRequest<AcademyMember>(`/api/academies/${academyId}/members/${userId}`, {
    method: 'PUT', token, body: payload,
  })
}

export function uploadAcademyMemberAvatar(
  token: string, academyId: string, member: AcademyMember, file: File,
) {
  const body = new FormData()
  body.set('file', file)
  return apiMultipartRequest<AcademyMember>(
    `/api/academies/${academyId}/members/${member.userId}/avatar?version=${member.version}`, token, body,
  )
}

export function deleteAcademyMemberAvatar(token: string, academyId: string, member: AcademyMember) {
  return apiRequest<AcademyMember>(
    `/api/academies/${academyId}/members/${member.userId}/avatar?version=${member.version}`,
    { method: 'DELETE', token },
  )
}
