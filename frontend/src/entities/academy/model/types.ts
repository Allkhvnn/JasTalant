export type AcademyRole = 'ADMIN' | 'COACH' | 'PARENT'

export type Academy = {
  id: string
  name: string
  roles: AcademyRole[]
}

