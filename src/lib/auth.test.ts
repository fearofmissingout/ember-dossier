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

  test("signs up with username through the playtest registration endpoint", async () => {
    vi.resetModules();

    const fetchMock = vi.fn().mockResolvedValue({
      json: async () => ({
        accessToken: "token-789",
        email: "alice_01@players.ember-dossier.example.com",
        userId: "user-c"
      }),
      ok: true
    });
    vi.stubGlobal("fetch", fetchMock);

    const { signUpWithUsername } = await import("./auth");
    const session = await signUpWithUsername("Alice_01", "secret-pass");

    expect(session).toEqual({
      accessToken: "token-789",
      email: "alice_01@players.ember-dossier.example.com",
      userId: "user-c"
    });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/auth/register");
    expect(init).toMatchObject({
      method: "POST"
    });
    expect(JSON.parse(init.body as string)).toEqual({
      password: "secret-pass",
      username: "alice_01"
    });
  });

  test("signs in with username by using the internal playtest email", async () => {
    vi.stubEnv("VITE_SUPABASE_URL", "https://project.supabase.co");
    vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "publishable-key");
    vi.resetModules();

    const fetchMock = vi.fn().mockResolvedValue({
      json: async () => ({
        access_token: "token-abc",
        user: {
          email: "alice_01@players.ember-dossier.example.com",
          id: "user-c"
        }
      }),
      ok: true
    });
    vi.stubGlobal("fetch", fetchMock);

    const { signInWithUsername } = await import("./auth");
    await signInWithUsername("Alice_01", "secret-pass");

    const [, init] = fetchMock.mock.calls[0] as [URL, RequestInit];
    expect(JSON.parse(init.body as string)).toEqual({
      email: "alice_01@players.ember-dossier.example.com",
      password: "secret-pass"
    });
  });

  test("surfaces Supabase auth error messages as readable text", async () => {
    vi.stubEnv("VITE_SUPABASE_URL", "https://project.supabase.co");
    vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "publishable-key");
    vi.resetModules();

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        text: async () => JSON.stringify({ message: "Email rate limit exceeded" })
      })
    );

    const { signUpWithPassword } = await import("./auth");
    await expect(signUpWithPassword("alice@example.com", "secret-pass")).rejects.toThrow(/^Email rate limit exceeded$/);
  });

  test("explains when signup requires email confirmation before a session is issued", async () => {
    vi.stubEnv("VITE_SUPABASE_URL", "https://project.supabase.co");
    vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "publishable-key");
    vi.resetModules();

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        json: async () => ({
          user: {
            confirmation_sent_at: "2026-06-05T00:00:00.000Z",
            email: "alice@example.com",
            id: "user-a"
          }
        }),
        ok: true
      })
    );

    const { signUpWithPassword } = await import("./auth");
    await expect(signUpWithPassword("alice@example.com", "secret-pass")).rejects.toThrow(
      /^账号已创建，但 Supabase 仍要求邮箱确认/
    );
  });
});
