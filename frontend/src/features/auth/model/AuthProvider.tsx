import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { ApiError } from '../../../shared/api/apiClient'
import type { AcademyMembership, Account } from '../../../shared/api/types'
import { getAccount, getMyAcademies, login, type LoginPayload } from '../api/authApi'
import { AuthContext, type AuthContextValue } from './AuthContext'
import { clearSession, readSession, saveSession, type AuthSession } from './session'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(readSession)
  const [account, setAccount] = useState<Account | null>(null)
  const [academies, setAcademies] = useState<AcademyMembership[]>([])
  const [loading, setLoading] = useState(Boolean(session))

  const signOut = useCallback(() => {
    clearSession()
    setSession(null)
    setAccount(null)
    setAcademies([])
    setLoading(false)
  }, [])

  useEffect(() => {
    if (!session) return

    let cancelled = false
    Promise.all([getAccount(session.accessToken), getMyAcademies(session.accessToken)])
      .then(([nextAccount, nextAcademies]) => {
        if (!cancelled) {
          setAccount(nextAccount)
          setAcademies(nextAcademies)
        }
      })
      .catch((error: unknown) => {
        if (!cancelled && error instanceof ApiError && error.status === 401) {
          signOut()
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [session, signOut])

  const signIn = useCallback(async (payload: LoginPayload) => {
    const result = await login(payload)
    setLoading(true)
    setSession(saveSession(result.accessToken, result.expiresIn))
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      account,
      academies,
      token: session?.accessToken ?? null,
      loading,
      isAuthenticated: Boolean(session),
      signIn,
      signOut,
    }),
    [account, academies, loading, session, signIn, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
