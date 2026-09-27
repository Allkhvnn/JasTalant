export type Player = {
  id: string
  academyId: string
  groupId: string
  fullName: string
  dateOfBirth: string
  parentName: string | null
  parentPhone: string | null
  parentEmail: string | null
  hasAvatar: boolean
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

export type PlayerImportError = {
  row: number
  field: string
  message: string
}

export type PlayerImportResult = {
  totalRows: number
  validRows: number
  importedRows: number
  errors: PlayerImportError[]
}

