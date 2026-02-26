"use client"

import { useState, useEffect, useCallback, use } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { LobbyView } from "@/components/lobby-view"
import { InvestmentView } from "@/components/investment-view"
import { ResultsView } from "@/components/results-view"
import { Skeleton } from "@/components/ui/skeleton"
import { TrendingUp } from "lucide-react"
import type { Room, Player } from "@/lib/game-types"

export default function RoomPage({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = use(params)
  const router = useRouter()
  const [room, setRoom] = useState<Room | null>(null)
  const [players, setPlayers] = useState<Player[]>([])
  const [playerId, setPlayerId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const fetchRoomData = useCallback(async () => {
    const supabase = createClient()

    const [roomResult, playersResult] = await Promise.all([
      supabase.from("rooms").select("*").eq("id", roomId).single(),
      supabase.from("players").select("*").eq("room_id", roomId).order("created_at", { ascending: true }),
    ])

    setRoom((roomResult.data as Room) ?? null)
    setPlayers((playersResult.data as Player[]) ?? [])

    return { room: roomResult.data, players: playersResult.data }
  }, [roomId])

  useEffect(() => {
    const storedId = sessionStorage.getItem("player_id")
    if (!storedId) {
      router.push("/")
      return
    }
    setPlayerId(storedId)

    async function init() {
      const { room: roomData } = await fetchRoomData()
      if (!roomData) {
        setError("Room not found.")
      }
      setLoading(false)
    }

    init()
  }, [roomId, router, fetchRoomData])

  // Realtime subscriptions
  useEffect(() => {
    if (!playerId) return
    if (loading) return

    if (!room) {
      router.push("/")
      return
    }

    const stillInRoom = players.some((player) => player.id === playerId)
    if (!stillInRoom) {
      router.push("/")
    }
  }, [playerId, room, players, router, loading])

  useEffect(() => {
    if (!playerId) return

    const supabase = createClient()

    const selfChannel = supabase
      .channel(`self-${playerId}`)
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "players", filter: `id=eq.${playerId}` },
        () => {
          window.location.assign("/")
        }
      )
      .subscribe()

    const roomChannel = supabase
      .channel(`room-${roomId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "rooms", filter: `id=eq.${roomId}` },
        (payload) => {
          if (payload.eventType === "DELETE") {
            setRoom(null)
            return
          }

          if (payload.new) {
            setRoom(payload.new as Room)
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "players", filter: `room_id=eq.${roomId}` },
        () => {
          // Re-fetch all players to get consistent state
          fetchRoomData()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(selfChannel)
      supabase.removeChannel(roomChannel)
    }
  }, [roomId, playerId, fetchRoomData])

  if (loading) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4">
          <Skeleton className="h-12 w-12 rounded-xl" />
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
      </main>
    )
  }

  if (error || !room || !playerId) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-4">
        <p className="text-lg font-medium text-destructive">{error || "Something went wrong."}</p>
        <button
          onClick={() => router.push("/")}
          className="text-sm text-primary underline"
        >
          Go back home
        </button>
      </main>
    )
  }

  return (
    <main className="flex min-h-screen flex-col items-center p-4 pt-8">
      <div className="w-full max-w-lg">
        <div className="mb-6 flex items-center justify-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <TrendingUp className="h-4 w-4 text-primary-foreground" />
          </div>
          <h1 className="text-xl font-bold text-foreground">InvestGame</h1>
        </div>

        {room.state === "WAITING_FOR_PLAYERS" && (
          <LobbyView
            room={room}
            players={players}
            currentPlayerId={playerId}
            onRefresh={fetchRoomData}
          />
        )}

        {room.state === "COLLECTING_INVESTMENTS" && (
          <InvestmentView players={players} currentPlayerId={playerId} roomId={roomId} />
        )}

        {room.state === "RESULTS_READY" && (
          <ResultsView players={players} currentPlayerId={playerId} roomId={roomId} />
        )}
      </div>
    </main>
  )
}