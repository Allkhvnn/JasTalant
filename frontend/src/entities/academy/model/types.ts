export type AcademyRole = 'ADMIN' | 'COACH' | 'PARENT'

export type Academy = {
  id: string
  name: string
  roles: AcademyRole[]
}

export type AgeDistributionItem = {
  birthYear: number
  playerCount: number
}

export type DashboardTraining = {
  id: string
  academyId: string
  groupId: string
  groupName: string
  coachUserId: string
  coachName: string
  trainingDate: string
  startTime: string
  endTime: string
  location: string | null
  status: 'SCHEDULED' | 'CANCELLED'
  version: number
  createdAt: string
  updatedAt: string
}

export type AcademyDashboard = {
  academyId: string
  academyName: string
  roles: AcademyRole[]
  groupCount: number
  playerCount: number
  activeCoachCount: number | null
  upcomingTrainingCount: number
  attendance: {
    periodStart: string
    periodEnd: string
    sessionsRecorded: number
    recordsMarked: number
    presentCount: number
    lateCount: number
    absentCount: number
    excusedCount: number
    attendanceRate: number
    pendingSheets: number
  }
  ageDistribution: AgeDistributionItem[]
  upcomingTrainings: DashboardTraining[]
}

