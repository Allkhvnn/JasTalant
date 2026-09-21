import { apiRequest } from '../../../shared/api/apiClient'
import type { AccessToken, Account, AcademyMembership } from '../../../shared/api/types'

export type LoginPayload = {
  email: string
  password: string
}

export type RegisterPayload = LoginPayload & {
  academyName: string
  fullName: string
}

export function login(payload: LoginPayload) {
  return apiRequest<AccessToken>('/api/auth/login', {
    method: 'POST',
    body: payload,
  })
}

export function register(payload: RegisterPayload) {
  return apiRequest('/api/auth/register', {
    method: 'POST',
    body: payload,
  })
}

export function verifyEmail(token: string) {
  return apiRequest<void>('/api/auth/verify-email', {
    method: 'POST',
    body: { token },
  })
}

export function getAccount(token: string) {
  return apiRequest<Account>('/api/auth/me', { token })
}

export function getMyAcademies(token: string) {
  return apiRequest<AcademyMembership[]>('/api/auth/academies', { token })
}

export function resendVerification(token: string) {
  return apiRequest<void>('/api/auth/resend-verification', {
    method: 'POST',
    token,
  })
}
