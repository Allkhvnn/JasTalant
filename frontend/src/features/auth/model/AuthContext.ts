import { createContext } from 'react'
import type { AcademyMembership, Account } from '../../../shared/api/types'
import type { LoginPayload } from '../api/authApi'

export type AuthContextValue = {
  account: Account | null
  academies: AcademyMembership[]
  token: string | null
  loading: boolean
  isAuthenticated: boolean
  signIn: (payload: LoginPayload) => Promise<void>
  signOut: () => void
  refreshProfile: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)
