export type AcademyStatus = 'ACTIVE' | 'SUSPENDED' | 'ARCHIVED'

export type PlatformAcademyAdmin = {
  userId: string
  fullName: string
  email: string
}

export type PlatformAcademy = {
  id: string
  name: string
  status: AcademyStatus
  statusReason: string | null
  createdAt: string
  statusChangedAt: string | null
  statusChangedBy: string | null
  version: number
  playerCount: number
  groupCount: number
  activeCoachCount: number
  activeMemberCount: number
  administrators: PlatformAcademyAdmin[]
}

export type PlatformAcademyPage = {
  items: PlatformAcademy[]
  page: number
  size: number
  totalElements: number
}
