import { afterEach, describe, expect, test, vi } from "vitest";

describe("playtest remote client", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  test("bootstraps account rows with authenticated REST headers", async () => {
    vi.stubEnv("VITE_SUPABASE_URL", "https://project.supabase.co");
    vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "publishable-key");
    vi.resetModules();

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => ""
    });
    vi.stubGlobal("fetch", fetchMock);

    const { bootstrapAccount } = await import("./playtestRemote");
    await bootstrapAccount("token-123", "user-a", "Alice");

    expect(fetchMock).toHaveBeenCalled();
    const [, init] = fetchMock.mock.calls[0] as [URL, RequestInit];
    expect(init.headers).toMatchObject({
      Authorization: "Bearer token-123",
      apikey: "publishable-key"
    });
  });

  test("saves shared activity alongside playtest progress", async () => {
    vi.stubEnv("VITE_SUPABASE_URL", "https://project.supabase.co");
    vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "publishable-key");
    vi.resetModules();

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => ""
    });
    vi.stubGlobal("fetch", fetchMock);

    const { createStarterSession } = await import("../playtest/state");
    const { savePlaytestProgress } = await import("./playtestRemote");
    const session = createStarterSession("user-a", "Alice", "room-a");

    await savePlaytestProgress("token-123", session, {
      body: "Alice upgraded the clinic.\nMedicine runs cleaner now.",
      id: "feed-activity-1",
      kind: "system",
      timestamp: "Just now",
      title: "Facility upgraded"
    });

    const reportCall = fetchMock.mock.calls.find(([url]) => String(url).includes("/rest/v1/playtest_reports"));
    expect(reportCall).toBeTruthy();
    const [, reportInit] = reportCall as [URL, RequestInit];
    expect(JSON.parse(String(reportInit.body))).toMatchObject({
      logs: ["Alice upgraded the clinic.", "Medicine runs cleaner now."],
      outcome: "clean",
      penalties: { danger: 0, morale: 0 },
      room_id: "room-room-a",
      title: "Facility upgraded"
    });

    const roomBasePatch = fetchMock.mock.calls.find(
      ([url, init]) => String(url).includes("/rest/v1/playtest_room_bases") && init?.method === "PATCH"
    );
    expect(roomBasePatch).toBeTruthy();
  });
});
