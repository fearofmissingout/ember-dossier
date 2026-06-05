import { renderToString } from "react-dom/server";
import { describe, expect, test } from "vitest";
import App from "./App";

describe("App smoke render", () => {
  test("renders the first playable shell with room and expedition entry points", () => {
    const html = renderToString(<App />);

    expect(html).toContain("Ember Dossier");
    expect(html).toContain("ember-demo");
    expect(html).toContain("Base resources");
    expect(html).toContain("ED-12");
  });
});
