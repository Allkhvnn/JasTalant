export type DevelopmentAssessment = {
  id: string
  playerId: string
  assessmentDate: string
  technique: number
  speed: number
  endurance: number
  physicalFitness: number
  gameIntelligence: number
  comment: string | null
  createdByUserId: string
  createdByName: string
  createdAt: string
  updatedAt: string
  version: number
}

export type DevelopmentAssessmentPayload = {
  assessmentDate: string
  technique: number
  speed: number
  endurance: number
  physicalFitness: number
  gameIntelligence: number
  comment: string | null
}
