import { afterEach, describe, expect, test, vi } from "vitest";

describe("auth client", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  test("signs in with password and returns an auth session", async () => {
    vi.stubEnv("VITE_SUPABASE_URL", "https://project.supabase.co");
    vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "publishable-key");
    vi.resetModules();

    const fetchMock = vi.fn().mockResolvedValue({
      json: async () => ({
        access_token: "token-123",
        user: {
          email: "alice@example.com",
          id: "user-a"
        }
      }),
      ok: true
    });
    vi.stubGlobal("fetch", fetchMock);

    const { signInWithPassword } = await import("./auth");
    const session = await signInWithPassword("alice@example.com", "secret-pass");

    expect(session).toEqual({
      accessToken: "token-123",
      email: "alice@example.com",
      userId: "user-a"
    });
    const [url, init] = fetchMock.mock.calls[0] as [URL, RequestInit];
    expect(url.toString()).toBe("https://project.supabase.co/auth/v1/token?grant_type=password");
    expect(init).toMatchObject({
      method: "POST"
    });
    expect(init.headers).toMatchObject({
      "Content-Type": "application/json",
      apikey: "publishable-key"
    });
    expect(JSON.parse(init.body as string)).toEqual({
      email: "alice@example.com",
      password: "secret-pass"
    });
  });

  test("signs up with password and returns an auth session", async () => {
    vi.stubEnv("VITE_SUPABASE_URL", "https://project.supabase.co");
    vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "publishable-key");
    vi.resetModules();

    const fetchMock = vi.fn().mockResolvedValue({
      json: async () => ({
        access_token: "token-456",
        user: {
          email: "bob@example.com",
          id: "user-b"
        }
      }),
      ok: true
    });
    vi.stubGlobal("fetch", fetchMock);

    const { signUpWithPassword } = await import("./auth");
    const session = await signUpWithPassword("bob@example.com", "secret-pass");

    expect(session).toEqual({
      accessToken: "token-456",
      email: "bob@example.com",
      userId: "user-b"
    });
    const [url, init] = fetchMock.mock.calls[0] as [URL, RequestInit];
    expect(url.toString()).toBe("https://project.supabase.co/auth/v1/signup");
    expect(init).toMatchObject({
      method: "POST"
    });
    expect(init.headers).toMatchObject({
      "Content-Type": "application/json",
      apikey: "publishable-key"
    });
    expect(JSON.parse(init.body as string)).toEqual({
      email: "bob@example.com",
      password: "secret-pass"
    });
  });
});
