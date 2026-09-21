import { apiRequest } from '../../../shared/api/apiClient'
import type { PageResponse } from '../../../shared/api/types'
import type { Player, PlayerPayload } from '../model/types'

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

