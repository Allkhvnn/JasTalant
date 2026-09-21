export type Player = {
  id: string
  academyId: string
  groupId: string
  fullName: string
  dateOfBirth: string
  parentName: string | null
  parentPhone: string | null
  parentEmail: string | null
  version: number
}

export type PlayerPayload = {
  groupId: string
  fullName: string
  dateOfBirth: string
  parentName: string | null
  parentPhone: string | null
  parentEmail: string | null
}

