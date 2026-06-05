import type { GameState } from "../game/types";
import { createInitialState } from "../game/state";
import { supabaseConfig } from "./supabase";

export type RemoteLoadMode = "local" | "remote" | "initialized";

export const defaultRoomSlug = "ember-demo";

export type RoomPlayer = {
  id: string;
  name: string;
  color: string;
  joinedAt: string;
  lastSeenAt: string;
};

export type RoomMeta = {
  revision: number;
  updatedBy?: string;
  updatedByName?: string;
  players: Record<string, RoomPlayer>;
};

export type RemoteRoomSnapshot = {
  version: 2;
  gameState: GameState;
  room: RoomMeta;
};

type DemoSnapshotRow = {
  state: GameState | RemoteRoomSnapshot;
  updated_at: string;
};

type SaveOptions = {
  incrementRevision?: boolean;
};

export async function loadRemoteDemoState(
  roomSlug: string,
  fallback: GameState,
  player?: RoomPlayer
): Promise<{ state: GameState; mode: RemoteLoadMode; meta: RoomMeta; updatedAt: string | null }> {
  if (!supabaseConfig) {
    return { state: fallback, mode: "local", meta: createRoomMeta(player), updatedAt: null };
  }

  const endpoint = createDemoSnapshotsUrl();
  endpoint.searchParams.set("select", "state,updated_at");
  endpoint.searchParams.set("room_slug", `eq.${roomSlug}`);
  endpoint.searchParams.set("limit", "1");

  const response = await fetch(endpoint, {
    headers: createSupabaseHeaders()
  });

  if (!response.ok) {
    throw await createRemoteStateError(response);
  }

  const rows = (await response.json()) as DemoSnapshotRow[];
  const row = rows[0];

  if (row?.state) {
    const snapshot = normalizeSnapshot(row.state, player);
    return { state: snapshot.gameState, mode: "remote", meta: snapshot.room, updatedAt: row.updated_at };
  }

  const meta = createRoomMeta(player);
  await saveRemoteDemoState(roomSlug, fallback, meta, player);
  return { state: fallback, mode: "initialized", meta, updatedAt: new Date().toISOString() };
}

export async function saveRemoteDemoState(
  roomSlug: string,
  state: GameState,
  meta: RoomMeta,
  player?: RoomPlayer,
  options: SaveOptions = {}
): Promise<void> {
  if (!supabaseConfig) {
    return;
  }

  const endpoint = createDemoSnapshotsUrl();
  endpoint.searchParams.set("on_conflict", "room_slug");
  const nextMeta = prepareRoomMeta(meta, player, options.incrementRevision !== false);

  const response = await fetch(endpoint, {
    body: JSON.stringify({
      room_slug: roomSlug,
      state: {
        version: 2,
        gameState: state,
        room: nextMeta
      } satisfies RemoteRoomSnapshot,
      updated_at: new Date().toISOString()
    }),
    headers: createSupabaseHeaders({
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=minimal"
    }),
    method: "POST"
  });

  if (!response.ok) {
    throw await createRemoteStateError(response);
  }
}

export async function touchRemotePlayer(roomSlug: string, player: RoomPlayer): Promise<void> {
  const loaded = await loadRemoteDemoState(roomSlug, createInitialState(), player);
  await saveRemoteDemoState(roomSlug, loaded.state, loaded.meta, player, { incrementRevision: false });
}

export function createRoomMeta(player?: RoomPlayer): RoomMeta {
  return prepareRoomMeta({ players: {}, revision: 0 }, player, false);
}

function normalizeSnapshot(rawState: GameState | RemoteRoomSnapshot, player?: RoomPlayer): RemoteRoomSnapshot {
  if (isRemoteRoomSnapshot(rawState)) {
    return {
      version: 2,
      gameState: rawState.gameState,
      room: prepareRoomMeta(rawState.room, player, false)
    };
  }

  return {
    version: 2,
    gameState: rawState,
    room: createRoomMeta(player)
  };
}

function isRemoteRoomSnapshot(value: GameState | RemoteRoomSnapshot): value is RemoteRoomSnapshot {
  return "version" in value && value.version === 2 && "gameState" in value && "room" in value;
}

function prepareRoomMeta(meta: RoomMeta, player: RoomPlayer | undefined, incrementRevision: boolean): RoomMeta {
  const players = pruneInactivePlayers(meta.players);
  const now = new Date().toISOString();

  if (player) {
    players[player.id] = {
      ...player,
      lastSeenAt: now
    };
  }

  return {
    players,
    revision: incrementRevision ? meta.revision + 1 : meta.revision,
    updatedBy: player?.id ?? meta.updatedBy,
    updatedByName: player?.name ?? meta.updatedByName
  };
}

function pruneInactivePlayers(players: Record<string, RoomPlayer>) {
  const cutoff = Date.now() - 1000 * 60 * 5;

  return Object.fromEntries(
    Object.entries(players).filter(([, player]) => new Date(player.lastSeenAt).getTime() > cutoff)
  );
}

function createDemoSnapshotsUrl() {
  if (!supabaseConfig) {
    throw new Error("Supabase is not configured.");
  }

  return new URL("/rest/v1/demo_snapshots", supabaseConfig.url);
}

function createSupabaseHeaders(extraHeaders: Record<string, string> = {}) {
  if (!supabaseConfig) {
    throw new Error("Supabase is not configured.");
  }

  const headers = {
    apikey: supabaseConfig.publishableKey,
    Authorization: `Bearer ${supabaseConfig.publishableKey}`,
    "X-Client-Info": "ember-dossier",
    ...extraHeaders
  };

  for (const [name, value] of Object.entries(headers)) {
    assertHeaderValue(name, value);
  }

  return headers;
}

function assertHeaderValue(name: string, value: string) {
  for (const char of value) {
    const codePoint = char.codePointAt(0) ?? 0;

    if (codePoint > 255 || codePoint < 32) {
      throw new Error(`${name} contains a non-Latin-1 header character.`);
    }
  }
}

async function createRemoteStateError(response: Response) {
  const text = await response.text();

  try {
    const payload = JSON.parse(text) as { message?: string };
    return new Error(payload.message ?? `Supabase request failed with HTTP ${response.status}`);
  } catch {
    return new Error(text || `Supabase request failed with HTTP ${response.status}`);
  }
}
