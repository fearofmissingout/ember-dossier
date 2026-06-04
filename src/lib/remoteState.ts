import type { GameState } from "../game/types";
import { supabaseConfig } from "./supabase";

export type RemoteLoadMode = "local" | "remote" | "initialized";

export const demoRoomSlug = "ember-demo";

type DemoSnapshotRow = {
  state: GameState;
};

export async function loadRemoteDemoState(fallback: GameState): Promise<{ state: GameState; mode: RemoteLoadMode }> {
  if (!supabaseConfig) {
    return { state: fallback, mode: "local" };
  }

  const endpoint = createDemoSnapshotsUrl();
  endpoint.searchParams.set("select", "state");
  endpoint.searchParams.set("room_slug", `eq.${demoRoomSlug}`);
  endpoint.searchParams.set("limit", "1");

  const response = await fetch(endpoint, {
    headers: createSupabaseHeaders()
  });

  if (!response.ok) {
    throw await createRemoteStateError(response);
  }

  const rows = (await response.json()) as DemoSnapshotRow[];

  if (rows[0]?.state) {
    return { state: rows[0].state, mode: "remote" };
  }

  await saveRemoteDemoState(fallback);
  return { state: fallback, mode: "initialized" };
}

export async function saveRemoteDemoState(state: GameState): Promise<void> {
  if (!supabaseConfig) {
    return;
  }

  const endpoint = createDemoSnapshotsUrl();
  endpoint.searchParams.set("on_conflict", "room_slug");

  const response = await fetch(endpoint, {
    body: JSON.stringify({
      room_slug: demoRoomSlug,
      state,
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
    const payload = JSON.parse(text) as { code?: string; details?: string; hint?: string; message?: string };
    return new Error(payload.message ?? `Supabase request failed with HTTP ${response.status}`);
  } catch {
    return new Error(text || `Supabase request failed with HTTP ${response.status}`);
  }
}
