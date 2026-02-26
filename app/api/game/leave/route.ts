import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const ACTIVE_GAME_STATE = "COLLECTING_INVESTMENTS"
  const RESULTS_STATE = "RESULTS_READY"

  const supabase = await createClient()
  const { player_id, room_id, actor_id } = await request.json()

  if (!player_id || !room_id) {
    return NextResponse.json({ error: "Missing player_id or room_id" }, { status: 400 })
  }

  const { data: room, error: roomError } = await supabase
    .from("rooms")
    .select("id, state")
    .eq("id", room_id)
    .single()

  if (roomError || !room) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 })
  }

  if (actor_id && actor_id !== player_id) {
    const { data: actor, error: actorError } = await supabase
      .from("players")
      .select("id, is_host")
      .eq("id", actor_id)
      .eq("room_id", room_id)
      .single()

    if (actorError || !actor || !actor.is_host) {
      return NextResponse.json({ error: "Only the host can kick players" }, { status: 403 })
    }
  }

  const { data: playerToRemove, error: fetchPlayerError } = await supabase
    .from("players")
    .select("id, room_id, is_host")
    .eq("id", player_id)
    .eq("room_id", room_id)
    .maybeSingle()

  if (fetchPlayerError) {
    return NextResponse.json({ error: "Failed to load player" }, { status: 500 })
  }

  if (!playerToRemove) {
    return NextResponse.json({ success: true, already_removed: true })
  }

  const { error: deletePlayerError } = await supabase
    .from("players")
    .delete()
    .eq("id", player_id)
    .eq("room_id", room_id)

  if (deletePlayerError) {
    return NextResponse.json({ error: "Failed to remove player" }, { status: 500 })
  }

  const { data: remainingPlayers, error: remainingPlayersError } = await supabase
    .from("players")
    .select("id, is_host, has_submitted, created_at")
    .eq("room_id", room_id)
    .order("created_at", { ascending: true })

  if (remainingPlayersError) {
    return NextResponse.json({ error: "Failed to load remaining players" }, { status: 500 })
  }

  if (!remainingPlayers || remainingPlayers.length === 0) {
    await supabase.from("rooms").delete().eq("id", room_id)
    return NextResponse.json({ success: true, closed: true })
  }

  if (room.state === RESULTS_STATE) {
    await supabase.from("players").delete().eq("room_id", room_id)
    await supabase.from("rooms").delete().eq("id", room_id)
    return NextResponse.json({ success: true, closed: true })
  }

  if (playerToRemove.is_host) {
    const nextHost = remainingPlayers[0]

    const { error: clearHostsError } = await supabase
      .from("players")
      .update({ is_host: false })
      .eq("room_id", room_id)

    if (clearHostsError) {
      return NextResponse.json({ error: "Failed to reassign host" }, { status: 500 })
    }

    const { error: promoteHostError } = await supabase
      .from("players")
      .update({ is_host: true })
      .eq("id", nextHost.id)
      .eq("room_id", room_id)

    if (promoteHostError) {
      return NextResponse.json({ error: "Failed to reassign host" }, { status: 500 })
    }
  }

  const hostOnlyRemaining = remainingPlayers.length === 1 && remainingPlayers[0].is_host

  if (room.state === ACTIVE_GAME_STATE && hostOnlyRemaining) {
    await supabase
      .from("rooms")
      .update({ state: "WAITING_FOR_PLAYERS" })
      .eq("id", room_id)

    await supabase
      .from("players")
      .update({ has_submitted: false, asset_a: null, asset_b: null })
      .eq("room_id", room_id)

    return NextResponse.json({ success: true, terminated: true })
  }

  if (room.state === ACTIVE_GAME_STATE) {
    const allSubmitted = remainingPlayers.every((player) => player.has_submitted)

    if (allSubmitted) {
      const { error: transitionError } = await supabase
        .from("rooms")
        .update({ state: "RESULTS_READY" })
        .eq("id", room_id)
        .eq("state", ACTIVE_GAME_STATE)

      if (!transitionError) {
        await supabase
          .from("players")
          .update({ has_submitted: false })
          .eq("room_id", room_id)
      }
    }
  }

  return NextResponse.json({ success: true })
}
