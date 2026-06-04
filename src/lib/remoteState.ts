import type { GameState } from "../game/types";
import { supabase } from "./supabase";

export type RemoteLoadMode = "local" | "remote" | "initialized";

export const demoRoomSlug = "ember-demo";

type DemoSnapshotRow = {
  state: GameState;
};

export async function loadRemoteDemoState(fallback: GameState): Promise<{ state: GameState; mode: RemoteLoadMode }> {
  if (!supabase) {
    return { state: fallback, mode: "local" };
  }

  const { data, error } = await supabase
    .from("demo_snapshots")
    .select("state")
    .eq("room_slug", demoRoomSlug)
    .maybeSingle<DemoSnapshotRow>();

  if (error) {
    throw error;
  }

  if (data?.state) {
    return { state: data.state, mode: "remote" };
  }

  await saveRemoteDemoState(fallback);
  return { state: fallback, mode: "initialized" };
}

export async function saveRemoteDemoState(state: GameState): Promise<void> {
  if (!supabase) {
    return;
  }

  const { error } = await supabase.from("demo_snapshots").upsert(
    {
      room_slug: demoRoomSlug,
      state,
      updated_at: new Date().toISOString()
    },
    { onConflict: "room_slug" }
  );

  if (error) {
    throw error;
  }
}
