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
    expect(html).toContain("基地资源");
    expect(html).toContain("个人基地");
    expect(html).toContain("房间目标");
    expect(html).toContain("ED-12");
  });

  test("renders the hosted playtest login shell when Supabase is configured", async () => {
    vi.stubEnv("VITE_SUPABASE_URL", "https://project.supabase.co");
    vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "publishable-key");
    vi.resetModules();

    const App = (await import("./App")).default;
    const html = renderToString(<App />);

    expect(html).toContain("Ember Dossier");
    expect(html).toContain("试玩登录");
    expect(html).toContain("账号");
    expect(html).toContain("密码");
    expect(html).toContain("登录");
    expect(html).toContain("创建试玩账号");
    expect(html).toContain("游客继续");
  });
});
