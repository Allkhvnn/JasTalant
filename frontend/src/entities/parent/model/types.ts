import type { AttendanceStatus } from '../../attendance/model/types'

export type ChildAttendance = {
  sessionId: string
  trainingDate: string
  groupId: string
  groupName: string
  status: AttendanceStatus
  comment: string | null
}
