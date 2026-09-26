import type { AcademyRole } from '../../../shared/api/types'

export type AcademyMember = {
  membershipId: string
  userId: string
  fullName: string
  email: string
  roles: AcademyRole[]
  active: boolean
  hasAvatar: boolean
  version: number
  createdAt: string
}

export type AcademyMemberUpdate = {
  version: number
  roles: AcademyRole[]
  active: boolean
  displayName?: string
}
