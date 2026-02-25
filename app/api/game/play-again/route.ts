import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const supabase = await createClient()
  const { room_id, player_id } = await request.json()

  if (!room_id || !player_id) {
    return NextResponse.json({ error: "Missing room_id or player_id." }, { status: 400 })
  }

  const { data: room, error: roomError } = await supabase
    .from("rooms")
    .select("id, state")
    .eq("id", room_id)
    .single()

  if (roomError || !room) {
    return NextResponse.json({ error: "Room not found." }, { status: 404 })
  }

  if (room.state !== "RESULTS_READY") {
    return NextResponse.json({ error: "Play again is only available after results." }, { status: 400 })
  }

  const { data: player, error: playerError } = await supabase
    .from("players")
    .select("id")
    .eq("id", player_id)
    .eq("room_id", room_id)
    .single()

  if (playerError || !player) {
    return NextResponse.json({ error: "Player not found in this room." }, { status: 404 })
  }

  const { error: voteError } = await supabase
    .from("players")
    .update({ has_submitted: true })
    .eq("id", player_id)
    .eq("room_id", room_id)

  if (voteError) {
    return NextResponse.json({ error: "Failed to register play again." }, { status: 500 })
  }

  const { data: players, error: playersError } = await supabase
    .from("players")
    .select("id, has_submitted")
    .eq("room_id", room_id)

  if (playersError || !players) {
    return NextResponse.json({ error: "Failed to load players." }, { status: 500 })
  }

  const allReady = players.length > 0 && players.every((p) => p.has_submitted)

  if (allReady) {
    await supabase
      .from("players")
      .update({ has_submitted: false, asset_a: null, asset_b: null })
      .eq("room_id", room_id)

    await supabase
      .from("rooms")
      .update({ state: "WAITING_FOR_PLAYERS" })
      .eq("id", room_id)

    return NextResponse.json({ success: true, restarted: true })
  }

  return NextResponse.json({ success: true, restarted: false })
}
