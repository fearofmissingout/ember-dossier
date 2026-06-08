import { describe, expect, test } from "vitest";

import { requiredProductionStrings } from "./check-production-playtest.mjs";

describe("production playtest smoke contract", () => {
  test("tracks the current playable loop UI anchors", () => {
    expect(requiredProductionStrings).toEqual(
      expect.arrayContaining(["基地行动中枢", "出征开局预案", "战后复盘", "当前可执行操作"])
    );
  });
});
