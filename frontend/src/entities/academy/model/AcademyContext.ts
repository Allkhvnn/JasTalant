import { createContext } from 'react'
import type { Academy } from './types'

export type AcademyContextValue = {
  academy: Academy
  token: string
}

export const AcademyContext = createContext<AcademyContextValue | null>(null)

