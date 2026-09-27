import { apiBlobRequest, apiMultipartRequest, apiRequest } from '../../../shared/api/apiClient'
import type { PageResponse } from '../../../shared/api/types'
import type { Player, PlayerImportResult, PlayerPayload } from '../model/types'

export function getPlayers(
  token: string,
  academyId: string,
  page = 0,
  size = 20,
  groupId?: string,
) {
  const query = new URLSearchParams({ page: String(page), size: String(size) })
  if (groupId) query.set('groupId', groupId)
  return apiRequest<PageResponse<Player>>(`/api/academies/${academyId}/players?${query}`, { token })
}

export function getPlayer(token: string, academyId: string, playerId: string) {
  return apiRequest<Player>(`/api/academies/${academyId}/players/${playerId}`, { token })
}

export function createPlayer(token: string, academyId: string, payload: PlayerPayload) {
  return apiRequest<Player>(`/api/academies/${academyId}/players`, {
    method: 'POST',
    token,
    body: payload,
  })
}

export function updatePlayer(token: string, academyId: string, player: Player, details: PlayerPayload) {
  return apiRequest<Player>(`/api/academies/${academyId}/players/${player.id}`, {
    method: 'PUT',
    token,
    body: { version: player.version, details },
  })
}

export function deletePlayer(token: string, academyId: string, playerId: string) {
  return apiRequest<void>(`/api/academies/${academyId}/players/${playerId}`, {
    method: 'DELETE',
    token,
  })
}

export function uploadPlayerAvatar(token: string, academyId: string, player: Player, file: File) {
  const body = new FormData()
  body.set('file', file)
  return apiMultipartRequest<Player>(
    `/api/academies/${academyId}/players/${player.id}/avatar?version=${player.version}`, token, body,
  )
}

export function deletePlayerAvatar(token: string, academyId: string, player: Player) {
  return apiRequest<Player>(`/api/academies/${academyId}/players/${player.id}/avatar?version=${player.version}`, {
    method: 'DELETE', token,
  })
}

export function validatePlayerImport(token: string, academyId: string, file: File) {
  const body = new FormData()
  body.set('file', file)
  return apiMultipartRequest<PlayerImportResult>(
    `/api/academies/${academyId}/players/import?dryRun=true`, token, body, 'POST',
  )
}

export function importPlayers(token: string, academyId: string, file: File) {
  const body = new FormData()
  body.set('file', file)
  return apiMultipartRequest<PlayerImportResult>(
    `/api/academies/${academyId}/players/import?dryRun=false`, token, body, 'POST',
  )
}

export function downloadPlayers(token: string, academyId: string, format: 'csv' | 'xlsx') {
  return apiBlobRequest(`/api/academies/${academyId}/players/export?format=${format}`, token)
}

export function downloadPlayerTemplate(token: string, academyId: string, format: 'csv' | 'xlsx') {
  return apiBlobRequest(`/api/academies/${academyId}/players/template?format=${format}`, token)
}
