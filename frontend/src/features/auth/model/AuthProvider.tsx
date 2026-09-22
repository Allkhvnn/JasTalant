import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { ApiError } from '../../../shared/api/apiClient'
import type { AcademyMembership, Account } from '../../../shared/api/types'
import { getAccount, getMyAcademies, login, logout, refreshAccessToken, type LoginPayload } from '../api/authApi'
import { AuthContext, type AuthContextValue } from './AuthContext'
import { clearSession, readSession, saveSession, type AuthSession } from './session'

function loadProfile(accessToken: string) {
  return Promise.all([getAccount(accessToken), getMyAcademies(accessToken)])
}

let ongoingRefresh: ReturnType<typeof refreshAccessToken> | null = null

function renewAccess() {
  if (!ongoingRefresh) {
    ongoingRefresh = refreshAccessToken().finally(() => { ongoingRefresh = null })
  }
  return ongoingRefresh
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(readSession)
  const [account, setAccount] = useState<Account | null>(null)
  const [academies, setAcademies] = useState<AcademyMembership[]>([])
  const [loading, setLoading] = useState(true)

  const signOut = useCallback(() => {
    void logout().catch(() => undefined)
    clearSession()
    setSession(null)
    setAccount(null)
    setAcademies([])
    setLoading(false)
  }, [])

  const refreshProfile = useCallback(async () => {
    if (!session) return
    const [nextAccount, nextAcademies] = await loadProfile(session.accessToken)
    setAccount(nextAccount)
    setAcademies(nextAcademies)
  }, [session])

  useEffect(() => {
    let cancelled = false
    const restore = async () => {
      let current = readSession()
      if (!current) {
        const access = await renewAccess()
        current = saveSession(access.accessToken, access.expiresIn)
      }
      try {
        return { current, profile: await loadProfile(current.accessToken) }
      } catch (error) {
        if (!(error instanceof ApiError) || error.status !== 401) throw error
        const access = await renewAccess()
        current = saveSession(access.accessToken, access.expiresIn)
        return { current, profile: await loadProfile(current.accessToken) }
      }
    }

    restore()
      .then(({ current, profile: [nextAccount, nextAcademies] }) => {
        if (!cancelled) {
          setSession(current)
          setAccount(nextAccount)
          setAcademies(nextAcademies)
        }
      })
      .catch((error: unknown) => {
        if (!cancelled && error instanceof ApiError && error.status === 401) {
          clearSession()
          setSession(null)
          setAccount(null)
          setAcademies([])
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!session) return
    const delay = Math.max(0, session.expiresAt - Date.now() - 60_000)
    const timer = window.setTimeout(() => {
      renewAccess()
        .then((access) => setSession(saveSession(access.accessToken, access.expiresIn)))
        .catch(() => signOut())
    }, delay)
    return () => window.clearTimeout(timer)
  }, [session, signOut])

  const signIn = useCallback(async (payload: LoginPayload) => {
    const result = await login(payload)
    setLoading(true)
    const nextSession = saveSession(result.accessToken, result.expiresIn)
    try {
      const [nextAccount, nextAcademies] = await loadProfile(nextSession.accessToken)
      setSession(nextSession)
      setAccount(nextAccount)
      setAcademies(nextAcademies)
    } finally {
      setLoading(false)
    }
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
      refreshProfile,
    }),
    [account, academies, loading, refreshProfile, session, signIn, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
