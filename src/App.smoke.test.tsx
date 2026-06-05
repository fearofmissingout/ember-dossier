import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, test, vi } from "vitest";

describe("App smoke render", () => {
  afterEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  test("renders the local playable shell with account and room entry points", async () => {
    vi.stubEnv("VITE_SUPABASE_URL", "");
    vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "");
    vi.stubEnv("VITE_SUPABASE_ANON_KEY", "");
    vi.resetModules();

    const App = (await import("./App")).default;
    const html = renderToString(<App />);

    expect(html).toContain("Ember Dossier");
    expect(html).toContain("ember-demo");
    expect(html).toContain("Base resources");
    expect(html).toContain("Account Base");
    expect(html).toContain("Room Objective");
    expect(html).toContain("ED-12");
  });

  test("renders the hosted playtest login shell when Supabase is configured", async () => {
    vi.stubEnv("VITE_SUPABASE_URL", "https://project.supabase.co");
    vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "publishable-key");
    vi.resetModules();

    const App = (await import("./App")).default;
    const html = renderToString(<App />);

    expect(html).toContain("Ember Dossier");
    expect(html).toContain("Playtest Login");
    expect(html).toContain("Email");
    expect(html).toContain("Send magic link");
  });
});
