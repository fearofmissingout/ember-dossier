import { fileURLToPath } from "node:url";
import { localSmokeChecklist } from "./print-local-smoke.mjs";

const requiredCoverage = [
  "auth",
  "baseOverview",
  "baseEventForecast",
  "facilityDevelopment",
  "memberCooperation",
  "expeditionPrep",
  "journeyProgress",
  "combatOrEvent",
  "settlement",
  "mobileViewport",
  "databaseFallback"
];

export function createLocalSmokeContractReport(checklist = localSmokeChecklist) {
  const missing = [];
  const coverage = new Set(checklist.coverage ?? []);
  const paths = checklist.paths ?? [];
  const template = checklist.reportTemplate ?? [];

  if (checklist.command !== "npm run dev") {
    missing.push("command: npm run dev");
  }

  if (checklist.address !== "http://localhost:5173/?room=playtest-smoke") {
    missing.push("address: playtest smoke room");
  }

  for (const item of requiredCoverage) {
    if (!coverage.has(item)) {
      missing.push(`coverage: ${item}`);
    }
  }

  if (paths.length < requiredCoverage.length) {
    missing.push("paths: one visible path per coverage area");
  }

  if (!template.some((line) => line.includes("桌面") && line.includes("手机"))) {
    missing.push("report template: desktop and mobile viewport");
  }

  if (!template.some((line) => line.includes("成员协作") && line.includes("设施发展") && line.includes("战斗或事件"))) {
    missing.push("report template: complete playable path");
  }

  return {
    checked: requiredCoverage.length + 5,
    missing,
    ok: missing.length === 0
  };
}

function main() {
  const report = createLocalSmokeContractReport();
  if (!report.ok) {
    console.error("Local smoke contract drifted:");
    for (const item of report.missing) {
      console.error(`- ${item}`);
    }
    process.exit(1);
  }

  console.log(`Local smoke contract passed (${report.checked} checks).`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main();
}
