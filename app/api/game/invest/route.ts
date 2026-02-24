import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { TOTAL_BUDGET } from "@/lib/game-types"

export async function POST(request: Request) {
  try {
    const { room_id, player_id, asset_a, asset_b } = await request.json()

    if (!room_id || !player_id || asset_a == null || asset_b == null) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 })
    }

    // Server-side validation
    const assetAInt = Math.floor(Number(asset_a))
    const assetBInt = Math.floor(Number(asset_b))

    if (!Number.isInteger(assetAInt) || !Number.isInteger(assetBInt)) {
      return NextResponse.json({ error: "Investments must be integers." }, { status: 400 })
    }

    if (assetAInt < 0 || assetBInt < 0) {
      return NextResponse.json({ error: "Investments must be non-negative." }, { status: 400 })
    }

    if (assetAInt + assetBInt !== TOTAL_BUDGET) {
      return NextResponse.json(
        { error: `Investments must total $${TOTAL_BUDGET}.` },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Verify room is in collecting state
    const { data: room, error: roomError } = await supabase
      .from("rooms")
      .select("*")
      .eq("id", room_id)
      .single()

    if (roomError || !room) {
      return NextResponse.json({ error: "Room not found." }, { status: 404 })
    }

    if (room.state !== "COLLECTING_INVESTMENTS") {
      return NextResponse.json({ error: "Game is not accepting investments." }, { status: 400 })
    }

    // Verify player exists and hasn't submitted
    const { data: player, error: playerError } = await supabase
      .from("players")
      .select("*")
      .eq("id", player_id)
      .eq("room_id", room_id)
      .single()

    if (playerError || !player) {
      return NextResponse.json({ error: "Player not found in this room." }, { status: 404 })
    }

    if (player.has_submitted) {
      return NextResponse.json({ error: "You have already submitted." }, { status: 400 })
    }

    // Update player investment
    const { error: updateError } = await supabase
      .from("players")
      .update({
        asset_a: assetAInt,
        asset_b: assetBInt,
        has_submitted: true,
      })
      .eq("id", player_id)
      .eq("has_submitted", false)

    if (updateError) {
      return NextResponse.json({ error: "Failed to submit investment." }, { status: 500 })
    }

    // Check if all players have submitted
    const { data: allPlayers } = await supabase
      .from("players")
      .select("has_submitted")
      .eq("room_id", room_id)

    const allSubmitted = allPlayers?.every((p) => p.has_submitted)

    if (allSubmitted) {
      // Transition to results
      await supabase
        .from("rooms")
        .update({ state: "RESULTS_READY" })
        .eq("id", room_id)
        .eq("state", "COLLECTING_INVESTMENTS")
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Internal server error." }, { status: 500 })
  }
}