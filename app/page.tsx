"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TrendingUp, Users, DollarSign } from "lucide-react"

function generateRoomId(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  let result = ""
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

export default function HomePage() {
  const router = useRouter()
  const [createName, setCreateName] = useState("")
  const [joinName, setJoinName] = useState("")
  const [roomCode, setRoomCode] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleCreate() {
    if (!createName.trim()) {
      setError("Please enter your display name.")
      return
    }
    setLoading(true)
    setError("")

    const supabase = createClient()
    const roomId = generateRoomId()

    const { error: roomError } = await supabase
      .from("rooms")
      .insert({ id: roomId, state: "WAITING_FOR_PLAYERS" })

    if (roomError) {
      setError("Failed to create room. Please try again.")
      setLoading(false)
      return
    }

    const { data: playerData, error: playerError } = await supabase
      .from("players")
      .insert({
        room_id: roomId,
        name: createName.trim(),
        is_host: true,
      })
      .select()
      .single()

    if (playerError || !playerData) {
      setError("Failed to join room. Please try again.")
      setLoading(false)
      return
    }

    sessionStorage.setItem("player_id", playerData.id)
    sessionStorage.setItem("player_name", createName.trim())
    router.push(`/room/${roomId}`)
  }

  async function handleJoin() {
    if (!joinName.trim()) {
      setError("Please enter your display name.")
      return
    }
    if (!roomCode.trim()) {
      setError("Please enter a room code.")
      return
    }
    setLoading(true)
    setError("")

    const supabase = createClient()
    const code = roomCode.trim().toUpperCase()

    const { data: room, error: roomError } = await supabase
      .from("rooms")
      .select("*")
      .eq("id", code)
      .single()

    if (roomError || !room) {
      setError("Room not found. Check the code and try again.")
      setLoading(false)
      return
    }

    if (room.state !== "WAITING_FOR_PLAYERS") {
      setError("This game has already started.")
      setLoading(false)
      return
    }

    const { data: existingPlayers } = await supabase
      .from("players")
      .select("id")
      .eq("room_id", code)

    if (existingPlayers && existingPlayers.length >= 4) {
      setError("This room is full (max 4 players).")
      setLoading(false)
      return
    }

    const { data: playerData, error: playerError } = await supabase
      .from("players")
      .insert({
        room_id: code,
        name: joinName.trim(),
        is_host: false,
      })
      .select()
      .single()

    if (playerError || !playerData) {
      setError("Failed to join room. Please try again.")
      setLoading(false)
      return
    }

    sessionStorage.setItem("player_id", playerData.id)
    sessionStorage.setItem("player_name", joinName.trim())
    router.push(`/room/${code}`)
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 p-4">
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="flex items-center gap-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
            <TrendingUp className="h-6 w-6 text-primary-foreground" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-foreground">
            InvestGame
          </h1>
        </div>
        <p className="max-w-md text-muted-foreground leading-relaxed">
          Allocate $100 between a safe asset and a pooled investment. See how your
          decisions shape collective outcomes.
        </p>
      </div>

      <div className="flex items-center gap-6 text-sm text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <Users className="h-4 w-4" />
          2-4 Players
        </span>
        <span className="flex items-center gap-1.5">
          <DollarSign className="h-4 w-4" />
          $100 Budget
        </span>
        <span className="flex items-center gap-1.5">
          <TrendingUp className="h-4 w-4" />
          1.5x Pool
        </span>
      </div>

      <Card className="w-full max-w-md">
        <Tabs defaultValue="create">
          <CardHeader className="pb-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="create">Create Room</TabsTrigger>
              <TabsTrigger value="join">Join Room</TabsTrigger>
            </TabsList>
          </CardHeader>

          <CardContent>
            {error && (
              <div className="mb-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <TabsContent value="create" className="mt-0">
              <CardTitle className="mb-1 text-lg">Create a New Game</CardTitle>
              <CardDescription className="mb-4">
                Start a room and share the code with friends.
              </CardDescription>
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="create-name">Display Name</Label>
                  <Input
                    id="create-name"
                    placeholder="Enter your name"
                    value={createName}
                    onChange={(e) => setCreateName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                    disabled={loading}
                    maxLength={20}
                  />
                </div>
                <Button onClick={handleCreate} disabled={loading} className="w-full">
                  {loading ? "Creating..." : "Create Room"}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="join" className="mt-0">
              <CardTitle className="mb-1 text-lg">Join an Existing Game</CardTitle>
              <CardDescription className="mb-4">
                Enter the room code shared by the host.
              </CardDescription>
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="join-name">Display Name</Label>
                  <Input
                    id="join-name"
                    placeholder="Enter your name"
                    value={joinName}
                    onChange={(e) => setJoinName(e.target.value)}
                    disabled={loading}
                    maxLength={20}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="room-code">Room Code</Label>
                  <Input
                    id="room-code"
                    placeholder="e.g. ABC123"
                    value={roomCode}
                    onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                    onKeyDown={(e) => e.key === "Enter" && handleJoin()}
                    disabled={loading}
                    maxLength={6}
                    className="font-mono tracking-widest text-center text-lg"
                  />
                </div>
                <Button onClick={handleJoin} disabled={loading} className="w-full">
                  {loading ? "Joining..." : "Join Room"}
                </Button>
              </div>
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>

      <div className="max-w-md text-center text-xs text-muted-foreground leading-relaxed">
        <strong>How it works:</strong> Each player allocates $100 between Asset A (safe) and Asset B (pooled).
        The pool is increased by 50% and split equally. Your payout = your Asset A + your share of the pool.
      </div>
    </main>
  )
}
