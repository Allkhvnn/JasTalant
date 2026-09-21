import { useContext } from 'react'
import { AcademyContext } from './AcademyContext'

export function useAcademy() {
  const context = useContext(AcademyContext)
  if (!context) {
    throw new Error('useAcademy must be used inside AcademyProvider')
  }
  return context
}

