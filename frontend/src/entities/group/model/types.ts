export type AcademyGroup = {
  id: string
  academyId: string
  name: string
  ageCategory: string
  version: number
}

export type GroupPayload = {
  name: string
  ageCategory: string
}

export type GroupCoach = {
  userId: string
  fullName: string
}
