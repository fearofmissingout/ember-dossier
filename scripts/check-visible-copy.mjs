import { readFileSync } from "node:fs";

const filesToScan = [
  "src/App.tsx",
  "src/game/content.ts",
  "src/game/facilities.ts",
  "src/game/labels.ts",
  "src/playtest/content.ts",
  "src/playtest/journey.ts",
  "src/playtest/launchChecklist.ts",
  "src/playtest/progression.ts",
  "src/playtest/reports.ts",
  "src/playtest/sim.ts",
  "src/lib/auth.ts",
  "src/lib/remoteState.ts",
  "functions/api/auth/register.js"
];

const requiredChineseAnchors = [
  "基地总览",
  "幸存者",
  "远征准备",
  "战报动态",
  "基地循环罗盘",
  "出征行动指引",
  "手机端单页行动摘要",
  "单页行动",
  "当前可执行操作",
  "你的协作任务",
  "回合威胁预告",
  "战后复盘",
  "试玩登录"
];

const additionalRequiredChineseAnchors = [
  "手机端回合战斗面板",
  "设施推荐原因",
  "房间协作缺口",
  "试玩完整性检查",
  "核心试玩闭环已通过"
];

const bannedVisibleEnglish = [
  "Archive",
  "Continue as guest",
  "Email confirmed",
  "Enter a username first",
  "Loading your playtest account",
  "Password needs",
  "Registration failed",
  "Repair the communications tower",
  "Room base initialized",
  "Shared base online",
  "Supabase did not return a session",
  "Supabase request failed with HTTP",
  "Username must be",
  "Username signup did not return a session"
];

const mojibakePatterns = [
  /鍩|璁|鎴|杩|绋€|彂|勬|€|俙|涓|嗗|犳|悊|栨|忚|哄||叆|垬/,
  /�/
];

const fileTexts = filesToScan.map((path) => ({
  path,
  text: readFileSync(path, "utf8")
}));
const allText = fileTexts.map((file) => file.text).join("\n");
const failures = [];

const allRequiredChineseAnchors = [...requiredChineseAnchors, ...additionalRequiredChineseAnchors];

for (const anchor of allRequiredChineseAnchors) {
  if (!allText.includes(anchor)) {
    failures.push(`Missing required Chinese UI anchor: ${anchor}`);
  }
}

for (const file of fileTexts) {
  const visibleTextCorpus = extractQuotedStrings(file.text).join("\n");
  for (const phrase of bannedVisibleEnglish) {
    if (visibleTextCorpus.includes(phrase) || file.text.includes(`>${phrase}<`)) {
      failures.push(`${file.path}: banned visible English phrase "${phrase}"`);
    }
  }

  for (const pattern of mojibakePatterns) {
    if (pattern.test(file.text)) {
      failures.push(`${file.path}: possible mojibake in player-facing copy (${pattern})`);
    }
  }
}

if (failures.length > 0) {
  console.error("Visible copy check failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(`Visible copy check passed (${allRequiredChineseAnchors.length} anchors, ${filesToScan.length} files).`);

function extractQuotedStrings(text) {
  const strings = [];
  const pattern = /(["'`])((?:\\.|(?!\1)[\s\S])*?)\1/g;
  let match;
  while ((match = pattern.exec(text))) {
    strings.push(match[2]);
  }
  return strings;
}
