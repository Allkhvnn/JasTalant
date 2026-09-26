import { useEffect, useState } from 'react'
import { apiBlobRequest } from '../api/apiClient'

type Props = {
  path: string
  token: string
  hasAvatar: boolean
  version: number
  name: string
  className: string
}

export function ProtectedAvatar({ path, token, hasAvatar, version, name, className }: Props) {
  const [source, setSource] = useState<string | null>(null)

  useEffect(() => {
    if (!hasAvatar) return
    let cancelled = false
    let objectUrl = ''
    apiBlobRequest(path, token).then((blob) => {
      if (cancelled) return
      objectUrl = URL.createObjectURL(blob)
      setSource(objectUrl)
    }).catch(() => undefined)
    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [hasAvatar, path, token, version])

  return <span className={className} aria-hidden="true">
    {hasAvatar && source ? <img src={source} alt="" /> : name.slice(0, 1).toUpperCase()}
  </span>
}
