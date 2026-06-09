import { describe, expect, test } from "vitest";
import { createLocalSmokeContractReport } from "./check-local-smoke-contract.mjs";
import { localSmokeChecklist } from "./print-local-smoke.mjs";

describe("local smoke contract", () => {
  test("covers the complete local multiplayer playtest path", () => {
    const report = createLocalSmokeContractReport(localSmokeChecklist);

    expect(report.ok).toBe(true);
    expect(report.missing).toEqual([]);
  });

  test("reports drift when a required coverage area is removed", () => {
    const report = createLocalSmokeContractReport({
      ...localSmokeChecklist,
      coverage: localSmokeChecklist.coverage.filter((item) => item !== "combatOrEvent")
    });

    expect(report.ok).toBe(false);
    expect(report.missing).toContain("coverage: combatOrEvent");
  });

  test("reports drift when base event forecasting drops out of local smoke coverage", () => {
    const report = createLocalSmokeContractReport({
      ...localSmokeChecklist,
      coverage: localSmokeChecklist.coverage.filter((item) => item !== "baseEventForecast")
    });

    expect(report.ok).toBe(false);
    expect(report.missing).toContain("coverage: baseEventForecast");
  });

  test("reports drift when mobile acceptance is removed from the report template", () => {
    const report = createLocalSmokeContractReport({
      ...localSmokeChecklist,
      reportTemplate: localSmokeChecklist.reportTemplate.filter((line) => !line.includes("手机"))
    });

    expect(report.ok).toBe(false);
    expect(report.missing).toContain("report template: desktop and mobile viewport");
  });
});
