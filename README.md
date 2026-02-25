# InvestGame

InvestGame is a real time multiplayer decision game where each player allocates $100 between:

- **Asset A (safe):** kept by the player.
- **Asset B (pooled):** combined with others, multiplied by **1.5x**, then split equally.

The app is built with Next.js + Supabase Realtime and supports host management, kicking/leaving, and replay voting.

## Features

- **2-4 player rooms** with short room codes.
- **Realtime room sync** (players, state, submissions).
- **Host controls**: start game, kick players.
- **Auto host handoff** if host leaves (next joined player becomes host).
- **Disconnect/leave handling** to avoid stuck rounds.
- **Play Again flow**:
	- runs in the same room,
	- waits for all players to vote,
	- returns to lobby when all are ready,
	- closes room and sends everyone to main menu if someone exits during results/replay wait.
- **Dark theme by default**.

## Game States

The room transitions through:

1. `WAITING_FOR_PLAYERS`
2. `COLLECTING_INVESTMENTS`
3. `RESULTS_READY`

### Round Rules

- Each player submits integers `asset_a` and `asset_b` such that:
	- `asset_a + asset_b = 100`
- Pool payout:
	- `b_total = sum(asset_b)`
	- `b_increased = b_total * 1.5`
	- `equal_share = b_increased / number_of_players`
	- `final_payout = asset_a + equal_share`

## Tech Stack

- **Next.js 16** (App Router)
- **React 19**
- **TypeScript**
- **Tailwind CSS v4 + shadcn/ui**
- **Supabase** (`@supabase/ssr`) for DB + Realtime

## Local Setup

### 1) Install dependencies

```bash
npm install
```

### 2) Configure environment variables

Create `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=your_supabase_anon_or_publishable_key
```

### 3) Create database tables in Supabase

Run this SQL in Supabase SQL Editor:

```sql
create table if not exists public.rooms (
	id text primary key,
	state text not null default 'WAITING_FOR_PLAYERS',
	created_at timestamptz not null default now(),
	constraint rooms_state_check
		check (state in ('WAITING_FOR_PLAYERS', 'COLLECTING_INVESTMENTS', 'RESULTS_READY'))
);

create extension if not exists pgcrypto;

create table if not exists public.players (
	id uuid primary key default gen_random_uuid(),
	room_id text not null references public.rooms(id) on delete cascade,
	name text not null,
	is_host boolean not null default false,
	asset_a integer,
	asset_b integer,
	has_submitted boolean not null default false,
	created_at timestamptz not null default now()
);

create index if not exists idx_players_room_id on public.players(room_id);
create index if not exists idx_players_room_created on public.players(room_id, created_at);
```

### 4) Enable Realtime

In Supabase, enable realtime replication for:

- `public.rooms`
- `public.players`

### 5) Configure RLS / policies

This app performs client-side inserts/selects for rooms and players, so anonymous/public access policies are required (or disable RLS during local testing).

## Run

```bash
npm run dev
```

Open http://localhost:3000

## Scripts

- `npm run dev` – start development server
- `npm run build` – production build
- `npm run start` – run production server
- `npm run lint` – lint project

## API Routes

- `POST /api/game/start`
	- Host starts game (requires minimum players of 2).
- `POST /api/game/invest`
	- Submit round investment; transitions to results when all submitted.
- `POST /api/game/leave`
	- Removes player, reassigns host if needed, handles room/game termination logic.
- `POST /api/game/play-again`
	- Records replay vote in results state and restarts lobby when all players vote.

## Project Structure

```text
app/
	page.tsx                    
	room/[roomId]/page.tsx      
	api/game/
		start/route.ts
		invest/route.ts
		leave/route.ts
		play-again/route.ts

components/
	lobby-view.tsx
	investment-view.tsx
	results-view.tsx

lib/
	game-types.ts
	supabase/
		client.ts
		server.ts
		middleware.ts
```

## Notes

- Session identity is stored in `sessionStorage` (`player_id`, `player_name`).
- Room IDs are 6-character codes generated in the client.
- If a room is closed (for example, someone exits during results), connected clients are redirected to main menu.
