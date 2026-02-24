export type RoomState = 'WAITING_FOR_PLAYERS' | 'COLLECTING_INVESTMENTS' | 'RESULTS_READY'

export interface Room {
  id: string
  state: RoomState
  created_at: string
}

export interface Player {
  id: string
  room_id: string
  name: string
  is_host: boolean
  asset_a: number | null
  asset_b: number | null
  has_submitted: boolean
  created_at: string
}

export interface GameResults {
  b_total: number
  b_increased: number
  equal_share: number
  players: PlayerResult[]
}

export interface PlayerResult {
  name: string
  asset_a: number
  asset_b: number
  final_payout: number
}

export const TOTAL_BUDGET = 100
export const MULTIPLIER = 1.5
export const MIN_PLAYERS = 2
export const MAX_PLAYERS = 4