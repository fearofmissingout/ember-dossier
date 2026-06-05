import { afterEach, describe, expect, test, vi } from "vitest";

describe("supabase config", () => {
  afterEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  test("normalizes a bare Supabase host from environment secrets", async () => {
    vi.stubEnv("VITE_SUPABASE_URL", "project.supabase.co ");
    vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "publishable-key");
    vi.resetModules();

    const { supabaseConfig } = await import("./supabase");

    expect(supabaseConfig?.url).toBe("https://project.supabase.co");
  });
});
