import type { AcademyRole } from '../../../shared/api/types'

export type AcademyMember = {
  userId: string
  fullName: string
  email: string
  roles: AcademyRole[]
}
