export const localSmokeChecklist = {
  address: "http://localhost:5173/?room=playtest-smoke",
  command: "npm run dev",
  coverage: [
    "auth",
    "baseOverview",
    "facilityDevelopment",
    "memberCooperation",
    "expeditionPrep",
    "journeyProgress",
    "combatOrEvent",
    "settlement",
    "mobileViewport",
    "databaseFallback"
  ],
  paths: [
    "登录或游客进入 -> 基地总览",
    "基地经营优先级 -> 处理补给、伤病或建设",
    "设施发展 -> 建设路线、升级收益、恢复支援",
    "多人协作 -> 成员页、房间协作计划、捐入优先级和邀请链接",
    "出征准备 -> 编队、地点、补给、风险",
    "出征过程 -> 路线预告、当前行动、状态",
    "战斗或事件 -> 敌人意图或事件选择",
    "撤离结算 -> 战报、资源变化、回基地下一步",
    "手机视口 -> 底部导航、行动台和主要按钮不遮挡",
    "数据库不可用 -> 中文降级提示和重试入口"
  ],
  reportTemplate: [
    "本地浏览器冒烟：",
    "- 地址：",
    "- 视口：桌面 / 手机",
    "- 路径：登录或游客进入 -> 基地 -> 成员协作 -> 设施发展 -> 出征准备 -> 出征过程 -> 战斗或事件 -> 结算 -> 回基地",
    "- 结果：",
    "- 发现问题："
  ]
};

export function formatLocalSmokeChecklist(checklist = localSmokeChecklist) {
  return [
    "本地浏览器冒烟清单",
    "",
    `1. 启动：${checklist.command}`,
    `2. 打开：${checklist.address}`,
    "3. 验收路径：",
    ...checklist.paths.map((item, index) => `   ${index + 1}. ${item}`),
    "",
    "记录模板：",
    ...checklist.reportTemplate
  ].join("\n");
}

function main() {
  console.log(formatLocalSmokeChecklist());
}

if (process.argv[1]?.endsWith("print-local-smoke.mjs")) {
  main();
}
