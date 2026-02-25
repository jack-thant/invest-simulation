"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Slider } from "@/components/ui/slider"
import { Progress } from "@/components/ui/progress"
import { ShieldCheck, TrendingUp, CheckCircle, Clock, Users, LogOut } from "lucide-react"
import type { Player } from "@/lib/game-types"
import { TOTAL_BUDGET } from "@/lib/game-types"

interface InvestmentViewProps {
  players: Player[]
  currentPlayerId: string
  roomId: string
}

export function InvestmentView({ players, currentPlayerId, roomId }: InvestmentViewProps) {
  const router = useRouter()
  const [assetB, setAssetB] = useState(50)
  const [submitting, setSubmitting] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const [error, setError] = useState("")

  const currentPlayer = players.find((p) => p.id === currentPlayerId)
  const hasSubmitted = currentPlayer?.has_submitted ?? false
  const assetA = TOTAL_BUDGET - assetB
  const submittedCount = players.filter((p) => p.has_submitted).length

  async function handleLeave() {
    setLeaving(true)
    try {
      await fetch("/api/game/leave", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ room_id: roomId, player_id: currentPlayerId }),
      })
      router.push("/")
    } catch (error) {
      console.error("Failed to leave game:", error)
    } finally {
      setLeaving(false)
    }
  }

  async function handleSubmit() {
    setSubmitting(true)
    setError("")

    try {
      const res = await fetch("/api/game/invest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          room_id: roomId,
          player_id: currentPlayerId,
          asset_a: assetA,
          asset_b: assetB,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Failed to submit investment.")
      }
    } catch {
      setError("Network error. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  if (hasSubmitted) {
    return (
      <div className="flex flex-col gap-6">
        <Card className="border-primary/30">
          <CardContent className="flex flex-col items-center gap-4 pt-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <CheckCircle className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-xl font-semibold text-foreground">Investment Submitted</h2>
            <div className="flex gap-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-foreground">${currentPlayer?.asset_a ?? 0}</p>
                <p className="text-sm text-muted-foreground">Asset A (Safe)</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-primary">${currentPlayer?.asset_b ?? 0}</p>
                <p className="text-sm text-muted-foreground">Asset B (Pool)</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="h-4 w-4" />
              Waiting for Others
            </CardTitle>
            <CardDescription>
              {submittedCount} of {players.length} players have submitted
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Progress value={(submittedCount / players.length) * 100} className="mb-4" />
            <div className="flex flex-col gap-2">
              {players.map((player) => (
                <div
                  key={player.id}
                  className="flex items-center justify-between rounded-lg border p-2.5"
                >
                  <span className="text-sm font-medium text-foreground">
                    {player.name}
                    {player.id === currentPlayerId && (
                      <span className="ml-1 text-muted-foreground">(You)</span>
                    )}
                  </span>
                  <Badge variant={player.has_submitted ? "default" : "secondary"}>
                    {player.has_submitted ? "Submitted" : "Pending"}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Allocate Your Investment</CardTitle>
          <CardDescription>
            Distribute $100 between Asset A (safe) and Asset B (pooled). This decision is final.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-muted-foreground" />
                <Label className="text-base font-medium">Asset A (Safe)</Label>
              </div>
              <span className="text-2xl font-bold text-foreground">${assetA}</span>
            </div>

            <Slider
              value={[assetB]}
              onValueChange={([v]) => setAssetB(v)}
              max={100}
              min={0}
              step={1}
              className="py-2"
            />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                <Label className="text-base font-medium">Asset B (Pool)</Label>
              </div>
              <span className="text-2xl font-bold text-primary">${assetB}</span>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <Label htmlFor="input-a" className="text-xs text-muted-foreground">
                Asset A
              </Label>
              <Input
                id="input-a"
                type="number"
                min={0}
                max={100}
                value={assetA}
                onChange={(e) => {
                  const v = Math.max(0, Math.min(100, parseInt(e.target.value) || 0))
                  setAssetB(TOTAL_BUDGET - v)
                }}
                className="text-center font-mono"
              />
            </div>
            <div className="flex-1">
              <Label htmlFor="input-b" className="text-xs text-muted-foreground">
                Asset B
              </Label>
              <Input
                id="input-b"
                type="number"
                min={0}
                max={100}
                value={assetB}
                onChange={(e) => {
                  const v = Math.max(0, Math.min(100, parseInt(e.target.value) || 0))
                  setAssetB(v)
                }}
                className="text-center font-mono"
              />
            </div>
          </div>

          <div className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
            <strong>Reminder:</strong> Asset B contributions from all players are pooled, increased by
            50%, and split equally among everyone.
          </div>

          {error && (
            <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <Button onClick={handleSubmit} disabled={submitting} size="lg" className="w-full">
            {submitting ? "Submitting..." : "Submit Investment"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4" />
            Player Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-2">
            {players.map((player) => (
              <div
                key={player.id}
                className="flex items-center justify-between rounded-lg border p-2.5"
              >
                <span className="text-sm font-medium text-foreground">
                  {player.name}
                  {player.id === currentPlayerId && (
                    <span className="ml-1 text-muted-foreground">(You)</span>
                  )}
                </span>
                <Badge variant={player.has_submitted ? "default" : "secondary"}>
                  {player.has_submitted ? "Submitted" : "Pending"}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Button
        variant="ghost"
        className="w-full text-muted-foreground hover:text-destructive"
        onClick={handleLeave}
        disabled={leaving}
      >
        <LogOut className="mr-2 h-4 w-4" />
        {leaving ? "Leaving..." : "Leave Game"}
      </Button>
    </div>
  )
}