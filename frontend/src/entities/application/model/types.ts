export type ApplicationStatus = 'EMAIL_UNVERIFIED' | 'PENDING' | 'APPROVED' | 'REJECTED'

export type AcademyApplication = {
  id: string
  applicantId: string
  applicantName: string
  applicantEmail: string
  academyName: string
  status: ApplicationStatus
  academyId: string | null
  rejectionReason: string | null
  createdAt: string
  reviewedAt: string | null
}

export type AcademyApplicationPage = {
  items: AcademyApplication[]
  page: number
  size: number
  totalElements: number
}
