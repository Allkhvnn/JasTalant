export type TrainingStatus = 'SCHEDULED' | 'CANCELLED'

export type ScheduledTraining = {
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
  status: TrainingStatus
  version: number
  createdAt: string
  updatedAt: string
}

export type ScheduledTrainingPayload = {
  groupId: string
  coachUserId: string
  trainingDate: string
  startTime: string
  endTime: string
  location: string | null
  status: TrainingStatus
}
