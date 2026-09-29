import { createContext } from 'react'
import type { Academy } from './types'

export type AcademyContextValue = {
  academy: Academy
  token: string
  basePath: string
  academyPath: (path?: string) => string
}

export const AcademyContext = createContext<AcademyContextValue | null>(null)

