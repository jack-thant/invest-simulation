"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Copy, Crown, Users, Check } from "lucide-react"
import type { Room, Player } from "@/lib/game-types"
import { MAX_PLAYERS, MIN_PLAYERS } from "@/lib/game-types"

interface LobbyViewProps {
  room: Room
  players: Player[]
  currentPlayerId: string
}

export function LobbyView({ room, players, currentPlayerId }: LobbyViewProps) {
  const [copied, setCopied] = useState(false)
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState("")

  const currentPlayer = players.find((p) => p.id === currentPlayerId)
  const isHost = currentPlayer?.is_host ?? false
  const canStart = isHost && players.length >= MIN_PLAYERS

  async function copyRoomCode() {
    await navigator.clipboard.writeText(room.id)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleStartGame() {
    setStarting(true)
    setError("")

    try {
      const res = await fetch("/api/game/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ room_id: room.id, player_id: currentPlayerId }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Failed to start game.")
      }
    } catch {
      setError("Network error. Please try again.")
    } finally {
      setStarting(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Room Code</CardTitle>
            <Badge variant="secondary">
              {players.length}/{MAX_PLAYERS} Players
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <div className="flex-1 rounded-lg border-2 border-dashed border-primary/30 bg-primary/5 p-4 text-center">
              <span className="font-mono text-3xl font-bold tracking-[0.3em] text-primary">
                {room.id}
              </span>
            </div>
            <Button variant="outline" size="icon" onClick={copyRoomCode} aria-label="Copy room code">
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
          <p className="mt-3 text-sm text-muted-foreground text-center">
            Share this code with friends to join
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="h-5 w-5" />
            Players
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-2">
            {players.map((player) => (
              <div
                key={player.id}
                className="flex items-center justify-between rounded-lg border bg-card p-3"
              >
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                    {player.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="font-medium text-foreground">
                    {player.name}
                    {player.id === currentPlayerId && (
                      <span className="ml-1 text-muted-foreground">(You)</span>
                    )}
                  </span>
                </div>
                {player.is_host && (
                  <Badge variant="default" className="gap-1">
                    <Crown className="h-3 w-3" />
                    Host
                  </Badge>
                )}
              </div>
            ))}

            {Array.from({ length: MAX_PLAYERS - players.length }).map((_, i) => (
              <div
                key={`empty-${i}`}
                className="flex items-center gap-2 rounded-lg border border-dashed p-3"
              >
                <Skeleton className="h-8 w-8 rounded-full" />
                <span className="text-sm text-muted-foreground">Waiting for player...</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {error && (
        <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive text-center">
          {error}
        </div>
      )}

      {isHost ? (
        <Button
          onClick={handleStartGame}
          disabled={!canStart || starting}
          size="lg"
          className="w-full"
        >
          {starting
            ? "Starting..."
            : canStart
              ? "Start Game"
              : `Need ${MIN_PLAYERS - players.length} more player${MIN_PLAYERS - players.length !== 1 ? "s" : ""}`}
        </Button>
      ) : (
        <div className="rounded-lg bg-muted p-4 text-center text-sm text-muted-foreground">
          Waiting for the host to start the game...
        </div>
      )}
    </div>
  )
}
