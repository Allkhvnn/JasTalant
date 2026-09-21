const SESSION_KEY = 'jastalant.auth'

export type AuthSession = {
  accessToken: string
  expiresAt: number
}

export function readSession(): AuthSession | null {
  const raw = sessionStorage.getItem(SESSION_KEY)
  if (!raw) return null

  try {
    const session = JSON.parse(raw) as AuthSession
    if (!session.accessToken || session.expiresAt <= Date.now()) {
      clearSession()
      return null
    }
    return session
  } catch {
    clearSession()
    return null
  }
}

export function saveSession(accessToken: string, expiresIn: number): AuthSession {
  const session = {
    accessToken,
    expiresAt: Date.now() + expiresIn * 1000,
  }
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session))
  return session
}

export function clearSession() {
  sessionStorage.removeItem(SESSION_KEY)
}

