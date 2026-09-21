import { apiRequest } from '../../../shared/api/apiClient'
import type { PageResponse } from '../../../shared/api/types'
import type {
  AcceptedMembership,
  Invitation,
  InvitationPayload,
  InvitationPreview,
} from '../model/types'

export function getInvitations(token: string, academyId: string, page = 0, size = 20) {
  const query = new URLSearchParams({ page: String(page), size: String(size) })
  return apiRequest<PageResponse<Invitation>>(
    `/api/academies/${academyId}/invitations?${query}`,
    { token },
  )
}

export function createInvitation(token: string, academyId: string, payload: InvitationPayload) {
  return apiRequest<Invitation>(`/api/academies/${academyId}/invitations`, {
    method: 'POST',
    token,
    body: payload,
  })
}

export function revokeInvitation(token: string, academyId: string, invitationId: string) {
  return apiRequest<Invitation>(`/api/academies/${academyId}/invitations/${invitationId}`, {
    method: 'DELETE',
    token,
  })
}

export function previewInvitation(invitationToken: string) {
  return apiRequest<InvitationPreview>('/api/invitations/preview', {
    method: 'POST',
    body: { token: invitationToken },
  })
}

export function acceptInvitation(token: string, invitationToken: string) {
  return apiRequest<AcceptedMembership>('/api/invitations/accept', {
    method: 'POST',
    token,
    body: { token: invitationToken },
  })
}

export function acceptNewInvitation(invitationToken: string, fullName: string, password: string) {
  return apiRequest<AcceptedMembership>('/api/invitations/accept-new', {
    method: 'POST',
    body: { token: invitationToken, fullName, password },
  })
}
