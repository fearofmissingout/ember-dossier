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
});
