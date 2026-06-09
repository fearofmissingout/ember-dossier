import { describe, expect, test } from "vitest";

import { findJavaScriptAssetPaths, requiredProductionStrings } from "./check-production-playtest.mjs";

describe("production playtest smoke contract", () => {
  test("tracks the current playable loop UI anchors", () => {
    expect(requiredProductionStrings).toEqual(
      expect.arrayContaining(["今日指挥板", "出征开局预案", "战后复盘", "当前可执行操作"])
    );
  });

  test("checks every Vite JavaScript chunk referenced by the page", () => {
    const html = `
      <script type="module" src="/assets/index-demo.js"></script>
      <link rel="modulepreload" href="/assets/playtest-runtime-demo.js">
      <link rel="modulepreload" href="/assets/journey-runtime-demo.js">
      <link rel="stylesheet" href="/assets/index-demo.css">
    `;

    expect(findJavaScriptAssetPaths(html)).toEqual([
      "/assets/index-demo.js",
      "/assets/playtest-runtime-demo.js",
      "/assets/journey-runtime-demo.js"
    ]);
  });
});
