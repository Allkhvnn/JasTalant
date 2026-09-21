export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED'

export type AttendancePlayer = {
  playerId: string
  fullName: string
  status: AttendanceStatus | null
  comment: string | null
}

export type AttendanceSheet = {
  id: string | null
  academyId: string
  groupId: string
  trainingDate: string
  version: number
  saved: boolean
  players: AttendancePlayer[]
}

export type AttendanceMark = {
  playerId: string
  status: AttendanceStatus
  comment: string | null
}

export type AttendanceSheetPayload = {
  version: number
  records: AttendanceMark[]
}
