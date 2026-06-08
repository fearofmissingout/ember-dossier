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
    session.room.baseAssignments = [
      {
        roomId: session.room.id,
        survivorId: session.account.survivors[0].id,
        type: "forage",
        userId: session.account.profile.userId
      }
    ];

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
    const [, roomBaseInit] = roomBasePatch as [URL, RequestInit];
    const roomBaseBody = JSON.parse(String(roomBaseInit.body));
    expect(roomBaseBody.assignments).toBeUndefined();
    expect(roomBaseBody.objective.assignments).toEqual(session.room.baseAssignments);

    const accountBasePatch = fetchMock.mock.calls.find(
      ([url, init]) => String(url).includes("/rest/v1/account_bases") && init?.method === "PATCH"
    );
    expect(accountBasePatch).toBeTruthy();
    const [, accountBaseInit] = accountBasePatch as [URL, RequestInit];
    expect(JSON.parse(String(accountBaseInit.body))).toMatchObject({
      medical_room_level: session.account.base.medicalRoomLevel,
      training_room_level: session.account.base.trainingRoomLevel,
      warehouse_level: session.account.base.warehouseLevel
    });
  });

  test("turns REST failures into readable Chinese sync errors", async () => {
    vi.stubEnv("VITE_SUPABASE_URL", "https://project.supabase.co");
    vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "publishable-key");
    vi.resetModules();

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        text: async () => JSON.stringify({ message: "房间数据表暂时不可用" })
      })
    );

    const { bootstrapAccount } = await import("./playtestRemote");
    await expect(bootstrapAccount("token-123", "user-a", "Alice")).rejects.toThrow(
      "Supabase 请求失败（HTTP 400）：房间数据表暂时不可用"
    );
  });
});
