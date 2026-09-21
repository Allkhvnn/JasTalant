import type { AcademyRole } from '../../../shared/api/types'

export type InvitableRole = Extract<AcademyRole, 'COACH' | 'PARENT'>
export type InvitationStatus = 'PENDING' | 'ACCEPTED' | 'REVOKED'

export type Invitation = {
  id: string
  academyId: string
  email: string
  roles: InvitableRole[]
  playerIds: string[]
  status: InvitationStatus
  expired: boolean
  expiresAt: string
  createdAt: string
  acceptedAt: string | null
}

export type InvitationPayload = {
  email: string
  roles: InvitableRole[]
  playerIds: string[]
}

export type InvitationPreview = {
  academyName: string
  maskedEmail: string
  roles: InvitableRole[]
  expiresAt: string
}

export type AcceptedMembership = {
  academyId: string
  userId: string
  roles: AcademyRole[]
}
