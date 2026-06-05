import { afterEach, describe, expect, test, vi } from "vitest";
import { createInitialState } from "../game/state";
import type { RoomMeta, RoomPlayer } from "./remoteState";

const player: RoomPlayer = {
  color: "#2f756c",
  id: "p-test",
  joinedAt: "2026-06-05T00:00:00.000Z",
  lastSeenAt: "2026-06-05T00:00:00.000Z",
  name: "Player"
};

describe("remote room state", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  test("loads a room snapshot through Supabase REST without SDK headers", async () => {
    vi.stubEnv("VITE_SUPABASE_URL", "https://project.supabase.co");
    vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "publishable-key");
    vi.resetModules();

    const state = createInitialState();
    const fetchMock = vi.fn().mockResolvedValue({
      json: async () => [
        {
          state: {
            gameState: state,
            room: {
              players: {},
              revision: 4
            },
            version: 2
          },
          updated_at: "2026-06-05T00:01:00.000Z"
        }
      ],
      ok: true
    });
    vi.stubGlobal("fetch", fetchMock);

    const { loadRemoteDemoState } = await import("./remoteState");
    const result = await loadRemoteDemoState("room-test", createInitialState(), player);

    expect(result.mode).toBe("remote");
    expect(result.state.resources.food).toBe(state.resources.food);
    expect(result.meta.players[player.id]?.name).toBe("Player");

    const [url, init] = fetchMock.mock.calls[0] as [URL, RequestInit];
    expect(String(url)).toContain("/rest/v1/demo_snapshots");
    expect(url.searchParams.get("room_slug")).toBe("eq.room-test");
    expect(init.headers).toMatchObject({
      Authorization: "Bearer publishable-key",
      apikey: "publishable-key"
    });
  });

  test("saves a v2 multiplayer snapshot with Latin-1-safe headers", async () => {
    vi.stubEnv("VITE_SUPABASE_URL", "https://project.supabase.co");
    vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "publishable-key");
    vi.resetModules();

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => ""
    });
    vi.stubGlobal("fetch", fetchMock);

    const { saveRemoteDemoState } = await import("./remoteState");
    const meta: RoomMeta = {
      players: {},
      revision: 2
    };

    await saveRemoteDemoState("room-test", createInitialState(), meta, player);

    const [url, init] = fetchMock.mock.calls[0] as [URL, RequestInit];
    expect(url.searchParams.get("on_conflict")).toBe("room_slug");
    expect(init.method).toBe("POST");

    const headers = init.headers as Record<string, string>;
    for (const value of Object.values(headers)) {
      for (const char of value) {
        expect(char.codePointAt(0)).toBeLessThanOrEqual(255);
      }
    }

    const body = JSON.parse(init.body as string);
    expect(body.room_slug).toBe("room-test");
    expect(body.state.version).toBe(2);
    expect(body.state.room.revision).toBe(3);
    expect(body.state.room.players[player.id].name).toBe("Player");
  });
});
