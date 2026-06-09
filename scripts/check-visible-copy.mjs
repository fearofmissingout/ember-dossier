import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

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
  "src/lib/playtestRemote.ts",
  "src/lib/remoteState.ts",
  "functions/api/auth/register.js"
];

const requiredChineseAnchors = [
  "基地总览",
  "幸存者",
  "远征准备",
  "战报动态",
  "基地循环罗盘",
  "基地出征支援简报",
  "出征行动指引",
  "手机端单页行动摘要",
  "单页行动",
  "当前可执行操作",
  "你的协作任务",
  "出征接入",
  "出发决策摘要",
  "本回合建议",
  "战斗动作判读",
  "回合威胁预告",
  "战后复盘",
  "试玩登录",
  "试玩路线导航",
  "试玩设置",
  "试玩环境状态",
  "英文包待接入",
  "语言包覆盖范围",
  "语言切换准入",
  "账号成长边界",
  "账号房间边界",
  "建设队列总览",
  "多人试玩开局检查",
  "房间协作分工板",
  "房间行动链",
  "下一轮远征建议",
  "幸存者定位建议",
  "编队定位",
  "发布准入检查",
  "浏览器冒烟清单",
  "本回合指挥摘要",
  "远征总控条",
  "手机端当前行动面板",
  "出征行动脉冲",
  "基地建设路线板",
  "基地日结脉冲",
  "好友房间协作脉冲",
  "归队复盘脉冲",
  "今日指挥板",
  "本回合战斗指挥",
  "多人开局指挥",
  "发布批次判定",
  "手机端单页出征总控",
  "基地日程预演",
  "战斗决策链",
  "出征路线阶段计划",
  "房间协作请求板",
  "西货运编组场"
];

const additionalRequiredChineseAnchors = [
  "手机端回合战斗面板",
  "设施推荐原因",
  "房间协作缺口",
  "试玩完整性检查",
  "核心试玩闭环已通过",
  "单页模式",
  "成长上限",
  "开局检查",
  "复盘建议",
  "默认不要频繁发布",
  "本地先走完整路径",
  "撤离收益",
  "英文包待完整",
  "混写拦截",
  "材料缺口",
  "等待认领",
  "补给容错",
  "路线准备",
  "反制动作",
  "完整基地到出征闭环",
  "游客房间",
  "房间共享",
  "按顺序补齐邀请",
  "直接选择下一步",
  "主要后果"
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
  "Supabase is not configured",
  "Supabase request failed with HTTP",
  "Username must be",
  "Username signup did not return a session"
];

const allowedVisibleLatinWords = new Set([
  "API",
  "Auth",
  "Cloudflare",
  "ED",
  "HP",
  "HTTP",
  "Lv",
  "Supabase",
  "SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "SUPABASE_URL",
  "URL",
  "XP"
]);

const allowedVisibleLatinPhrases = ["Ember Dossier"];

const mojibakePatterns = [
  /鍩|璁|鎴|杩|绋€|彂|勬|€|俙|涓|嗗|犳|悊|栨|忚|哄||叆|垬/,
  /�/
];

const allRequiredChineseAnchors = [...requiredChineseAnchors, ...additionalRequiredChineseAnchors];

export function createVisibleCopyReport(fileTexts = loadVisibleCopyFiles()) {
  const allText = fileTexts.map((file) => file.text).join("\n");
  const failures = [];

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

    for (const fragment of [...extractQuotedStrings(file.text), ...extractJsxTextNodes(file.text)]) {
      const cleaned = stripTemplateExpressions(fragment).replace(/\s+/g, " ").trim();
      if (cleaned && hasCjk(cleaned) && hasDisallowedVisibleLatin(cleaned)) {
        failures.push(`${file.path}: mixed Chinese/English visible copy needs an explicit allowance: "${cleaned}"`);
      }
    }

    for (const pattern of mojibakePatterns) {
      if (pattern.test(file.text)) {
        failures.push(`${file.path}: possible mojibake in player-facing copy (${pattern})`);
      }
    }
  }

  return {
    anchors: allRequiredChineseAnchors.length,
    checkedFiles: fileTexts.length,
    failures,
    ok: failures.length === 0
  };
}

function loadVisibleCopyFiles() {
  return filesToScan.map((path) => ({
    path,
    text: readFileSync(path, "utf8")
  }));
}

function main() {
  const report = createVisibleCopyReport();
  if (!report.ok) {
    console.error("Visible copy check failed:");
    for (const failure of report.failures) {
      console.error(`- ${failure}`);
    }
    process.exit(1);
  }

  console.log(`Visible copy check passed (${report.anchors} anchors, ${report.checkedFiles} files).`);
}

function extractQuotedStrings(text) {
  const strings = [];
  const pattern = /(["'`])((?:\\.|(?!\1)[\s\S])*?)\1/g;
  let match;
  while ((match = pattern.exec(text))) {
    strings.push(match[2]);
  }
  return strings;
}

function extractJsxTextNodes(text) {
  const strings = [];
  const pattern = />\s*([^<>{}][^<>{}]*?)\s*</g;
  let match;
  while ((match = pattern.exec(text))) {
    strings.push(match[1]);
  }
  return strings;
}

function stripTemplateExpressions(text) {
  let result = "";
  for (let index = 0; index < text.length; index += 1) {
    if (text[index] === "$" && text[index + 1] === "{") {
      index += 2;
      let depth = 1;
      for (; index < text.length && depth > 0; index += 1) {
        if (text[index] === "{") {
          depth += 1;
        } else if (text[index] === "}") {
          depth -= 1;
        }
      }
      index -= 1;
    } else {
      result += text[index];
    }
  }
  return result;
}

function hasCjk(text) {
  return [...text].some((char) => {
    const code = char.codePointAt(0);
    return code >= 0x4e00 && code <= 0x9fff;
  });
}

function hasDisallowedVisibleLatin(text) {
  if (/[?:=><]|\b[A-Za-z_][A-Za-z0-9_]*\s*[+\-*/]/.test(text)) {
    return false;
  }

  const normalized = allowedVisibleLatinPhrases.reduce((current, phrase) => current.replaceAll(phrase, ""), text);
  const latinWords = normalized.match(/[A-Za-z_][A-Za-z0-9_-]*/g) ?? [];
  return latinWords.some((word) => !allowedVisibleLatinWords.has(word));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main();
}
