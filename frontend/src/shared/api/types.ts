export type PlatformRole = 'USER' | 'SUPER_ADMIN'

export type Account = {
  id: string
  email: string
  fullName: string
  emailVerified: boolean
  platformRole: PlatformRole
}

export type AccessToken = {
  accessToken: string
  tokenType: 'Bearer'
  expiresIn: number
}

export type PageResponse<T> = {
  items: T[]
  page: number
  size: number
  totalElements: number
}

export type AcademyMembership = {
  academyId: string
  academyName: string
  roles: Array<'ADMIN' | 'COACH' | 'PARENT'>
}
