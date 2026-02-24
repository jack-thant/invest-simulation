import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { MIN_PLAYERS } from "@/lib/game-types"

export async function POST(request: Request) {
  try {
    const { room_id, player_id } = await request.json()

    if (!room_id || !player_id) {
      return NextResponse.json({ error: "Missing room_id or player_id." }, { status: 400 })
    }

    const supabase = await createClient()

    // Verify room exists and is in waiting state
    const { data: room, error: roomError } = await supabase
      .from("rooms")
      .select("*")
      .eq("id", room_id)
      .single()

    if (roomError || !room) {
      return NextResponse.json({ error: "Room not found." }, { status: 404 })
    }

    if (room.state !== "WAITING_FOR_PLAYERS") {
      return NextResponse.json({ error: "Game has already started." }, { status: 400 })
    }

    // Verify player is host
    const { data: player, error: playerError } = await supabase
      .from("players")
      .select("*")
      .eq("id", player_id)
      .eq("room_id", room_id)
      .single()

    if (playerError || !player) {
      return NextResponse.json({ error: "Player not found in this room." }, { status: 404 })
    }

    if (!player.is_host) {
      return NextResponse.json({ error: "Only the host can start the game." }, { status: 403 })
    }

    // Verify minimum players
    const { data: players } = await supabase
      .from("players")
      .select("id")
      .eq("room_id", room_id)

    if (!players || players.length < MIN_PLAYERS) {
      return NextResponse.json(
        { error: `Need at least ${MIN_PLAYERS} players to start.` },
        { status: 400 }
      )
    }

    // Update room state
    const { error: updateError } = await supabase
      .from("rooms")
      .update({ state: "COLLECTING_INVESTMENTS" })
      .eq("id", room_id)
      .eq("state", "WAITING_FOR_PLAYERS")

    if (updateError) {
      return NextResponse.json({ error: "Failed to start game." }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Internal server error." }, { status: 500 })
  }
}
