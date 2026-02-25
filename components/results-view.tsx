"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { TrendingUp, DollarSign, Users, PieChart, Home } from "lucide-react"
import type { Player } from "@/lib/game-types"
import { MULTIPLIER } from "@/lib/game-types"

interface ResultsViewProps {
  players: Player[]
  currentPlayerId: string
  roomId: string
}

export function ResultsView({ players, currentPlayerId, roomId }: ResultsViewProps) {
  const router = useRouter()
  const [loadingPlayAgain, setLoadingPlayAgain] = useState(false)
  const [loadingMainMenu, setLoadingMainMenu] = useState(false)
  const [error, setError] = useState("")

  const results = useMemo(() => {
    const n = players.length
    const bTotal = players.reduce((sum, p) => sum + (p.asset_b ?? 0), 0)
    const bIncreased = bTotal * MULTIPLIER
    const equalShare = bIncreased / n

    const playerResults = players.map((p) => ({
      ...p,
      finalPayout: (p.asset_a ?? 0) + equalShare,
    }))

    playerResults.sort((a, b) => b.finalPayout - a.finalPayout)

    return { n, bTotal, bIncreased, equalShare, playerResults }
  }, [players])

  const maxPayout = Math.max(...results.playerResults.map((p) => p.finalPayout))
  const readyCount = players.filter((player) => player.has_submitted).length
  const allReady = players.length > 0 && readyCount === players.length
  const currentPlayerReady = players.find((player) => player.id === currentPlayerId)?.has_submitted ?? false

  async function handlePlayAgain() {
    setLoadingPlayAgain(true)
    setError("")

    try {
      const res = await fetch("/api/game/play-again", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ room_id: roomId, player_id: currentPlayerId }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Failed to register play again.")
      }
    } catch {
      setError("Network error. Please try again.")
    } finally {
      setLoadingPlayAgain(false)
    }
  }

  async function handleMainMenu() {
    setLoadingMainMenu(true)
    try {
      await fetch("/api/game/leave", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ room_id: roomId, player_id: currentPlayerId }),
      })
    } finally {
      router.push("/")
      setLoadingMainMenu(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="flex flex-col items-center pt-5 pb-4">
            <DollarSign className="mb-1.5 h-5 w-5 text-muted-foreground" />
            <p className="text-2xl font-bold text-foreground">${results.bTotal}</p>
            <p className="text-xs text-muted-foreground text-center">Total Pool</p>
          </CardContent>
        </Card>
        <Card className="border-primary/30">
          <CardContent className="flex flex-col items-center pt-5 pb-4">
            <TrendingUp className="mb-1.5 h-5 w-5 text-primary" />
            <p className="text-2xl font-bold text-primary">${results.bIncreased.toFixed(0)}</p>
            <p className="text-xs text-muted-foreground text-center">After 1.5x</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col items-center pt-5 pb-4">
            <PieChart className="mb-1.5 h-5 w-5 text-muted-foreground" />
            <p className="text-2xl font-bold text-foreground">${results.equalShare.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground text-center">Each Share</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Final Results
          </CardTitle>
          <CardDescription>
            Each player kept their Asset A and received an equal share of the increased pool.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Player</TableHead>
                <TableHead className="text-right">Asset A</TableHead>
                <TableHead className="text-right">Asset B</TableHead>
                <TableHead className="text-right">Payout</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {results.playerResults.map((player, index) => (
                <TableRow
                  key={player.id}
                  className={player.id === currentPlayerId ? "bg-primary/5" : ""}
                >
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                        {index + 1}
                      </span>
                      <span className="font-medium text-foreground">
                        {player.name}
                        {player.id === currentPlayerId && (
                          <span className="ml-1 text-muted-foreground">(You)</span>
                        )}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-mono text-foreground">
                    ${player.asset_a ?? 0}
                  </TableCell>
                  <TableCell className="text-right font-mono text-foreground">
                    ${player.asset_b ?? 0}
                  </TableCell>
                  <TableCell className="text-right">
                    <span
                      className={`font-mono font-bold ${
                        player.finalPayout === maxPayout ? "text-primary" : "text-foreground"
                      }`}
                    >
                      ${player.finalPayout.toFixed(2)}
                    </span>
                    {player.finalPayout === maxPayout && (
                      <Badge variant="default" className="ml-2 text-[10px] px-1.5 py-0">
                        Best
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-5 pb-4">
          <h3 className="mb-2 text-sm font-semibold text-foreground">How Payouts Work</h3>
          <div className="flex flex-col gap-1 text-sm text-muted-foreground">
            <p>
              {"1. All Asset B contributions were pooled: $"}
              {results.bTotal}
            </p>
            <p>
              {"2. The pool was increased by 50%: $"}
              {results.bTotal}
              {" x 1.5 = $"}
              {results.bIncreased.toFixed(2)}
            </p>
            <p>
              {"3. Split equally among "}
              {results.n}
              {" players: $"}
              {results.bIncreased.toFixed(2)}
              {" / "}
              {results.n}
              {" = $"}
              {results.equalShare.toFixed(2)}
            </p>
            <p>{"4. Each player's payout = their Asset A + $"}{results.equalShare.toFixed(2)}</p>
          </div>
        </CardContent>
      </Card>

      {error && (
        <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <Button
        onClick={handlePlayAgain}
        disabled={loadingPlayAgain || currentPlayerReady}
        className="w-full"
      >
        {loadingPlayAgain
          ? "Submitting..."
          : currentPlayerReady
            ? allReady
              ? "Restarting..."
              : `Waiting for players (${readyCount}/${players.length})`
            : "Play Again"}
      </Button>

      <Button
        variant="outline"
        onClick={handleMainMenu}
        disabled={loadingMainMenu || loadingPlayAgain}
        className="w-full gap-2"
      >
        <Home className="h-4 w-4" />
        {loadingMainMenu ? "Leaving..." : "Main Menu"}
      </Button>
    </div>
  )
}