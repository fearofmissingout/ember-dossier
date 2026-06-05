import { afterEach, describe, expect, test, vi } from "vitest";
import { onRequestPost } from "../../functions/api/auth/register";

describe("playtest username register function", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("rejects invalid usernames before touching Supabase", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const response = await onRequestPost({
      env: createEnv(),
      request: createRequest({ password: "secret-pass", username: "!" })
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      message: "Username must be 3-20 letters, numbers, or underscores."
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test("validates input before requiring Cloudflare secrets", async () => {
    const response = await onRequestPost({
      env: {},
      request: createRequest({ password: "secret-pass", username: "!" })
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      message: "Username must be 3-20 letters, numbers, or underscores."
    });
  });

  test("creates a confirmed Supabase user and returns a session", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        text: async () => ""
      })
      .mockResolvedValueOnce({
        json: async () => ({
          access_token: "token-123",
          user: {
            email: "alice_01@players.ember-dossier.example.com",
            id: "user-a"
          }
        }),
        ok: true
      });
    vi.stubGlobal("fetch", fetchMock);

    const response = await onRequestPost({
      env: createEnv(),
      request: createRequest({ password: "secret-pass", username: "Alice_01" })
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      accessToken: "token-123",
      email: "alice_01@players.ember-dossier.example.com",
      userId: "user-a"
    });

    const [, createInit] = fetchMock.mock.calls[0] as [URL, RequestInit];
    expect(JSON.parse(createInit.body as string)).toMatchObject({
      email: "alice_01@players.ember-dossier.example.com",
      email_confirm: true,
      password: "secret-pass"
    });
    expect(createInit.headers).toMatchObject({
      Authorization: "Bearer service-role-key",
      apikey: "service-role-key"
    });
  });

  test("falls back to normal Supabase signup when service role is absent", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({
      json: async () => ({
        access_token: "signup-token",
        user: {
          email: "bob_02@players.ember-dossier.example.com",
          id: "user-b"
        }
      }),
      ok: true
    });
    vi.stubGlobal("fetch", fetchMock);

    const response = await onRequestPost({
      env: {
        VITE_SUPABASE_PUBLISHABLE_KEY: "publishable-key",
        VITE_SUPABASE_URL: "https://project.supabase.co"
      },
      request: createRequest({ password: "secret-pass", username: "Bob_02" })
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      accessToken: "signup-token",
      email: "bob_02@players.ember-dossier.example.com",
      userId: "user-b"
    });

    const [url, init] = fetchMock.mock.calls[0] as [URL, RequestInit];
    expect(String(url)).toBe("https://project.supabase.co/auth/v1/signup");
    expect(JSON.parse(init.body as string)).toMatchObject({
      data: {
        display_name: "bob_02",
        username: "bob_02"
      },
      email: "bob_02@players.ember-dossier.example.com",
      password: "secret-pass"
    });
    expect(init.headers).toMatchObject({
      apikey: "publishable-key"
    });
  });

  test("explains confirmation settings when normal signup creates no session", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({
      json: async () => ({
        user: {
          email: "casey@players.ember-dossier.example.com",
          id: "user-c"
        }
      }),
      ok: true
    });
    vi.stubGlobal("fetch", fetchMock);

    const response = await onRequestPost({
      env: {
        VITE_SUPABASE_PUBLISHABLE_KEY: "publishable-key",
        VITE_SUPABASE_URL: "https://project.supabase.co"
      },
      request: createRequest({ password: "secret-pass", username: "Casey" })
    });

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      message:
        "Account created, but Supabase did not return a session. Disable Confirm email for playtests or add SUPABASE_SERVICE_ROLE_KEY to Cloudflare."
    });
  });
});

function createEnv() {
  return {
    SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
    VITE_SUPABASE_PUBLISHABLE_KEY: "publishable-key",
    VITE_SUPABASE_URL: "https://project.supabase.co"
  };
}

function createRequest(body: unknown) {
  return {
    json: async () => body
  } as Request;
}
