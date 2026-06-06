import { resolveExpedition } from "../game/sim";
import type { ExpeditionReport, ExpeditionRequest, ResourceBundle, ResourceKey } from "../game/types";
import { facilityActionCost, facilityActionLabel, facilityBaseEffect, isFacilityBuilt, isFacilityMaxed } from "../game/facilities";
import { advanceSurvivorExperience, hasSurvivorPerk, type SurvivorAdvancement } from "./progression";
import { emptyLoadout, roomToGameState } from "./state";
import type { AccountState, BaseWorkType, PlaytestSession } from "./types";

type PlaytestExpeditionRequest = Omit<ExpeditionRequest, "squadIds"> & {
  battleScars?: number;
  combatScarSurvivorIds?: string[];
  extractionStatus?: "early" | "complete";
  journeyLogs?: string[];
  routeObjectiveBonus?: number;
  survivorIds: string[];
  trophies?: string[];
  travelFatigue?: number;
  userId: string;
};

export type AccountBaseFacilityId = "medical" | "radio" | "training" | "warehouse";

export type AccountBaseProject = {
  canAfford: boolean;
  cost: {
    intel: number;
    materials: number;
    rareParts: number;
  };
  currentLevel: number;
  effect: string;
  id: AccountBaseFacilityId;
  name: string;
  nextLevel: number;
  status: "available" | "blocked" | "maxed";
};

export type AccountBaseDevelopmentPlan = {
  affordableCount: number;
  blockedCount: number;
  projects: AccountBaseProject[];
  resources: Pick<AccountState["resources"], "intel" | "materials" | "rareParts">;
  summary: string;
};

type AccountBaseLevelKey = "medicalRoomLevel" | "radioBenchLevel" | "trainingRoomLevel" | "warehouseLevel";

const accountBaseLevelCap = 3;

const accountBaseFacilities: Array<{
  effect: (level: number) => string;
  id: AccountBaseFacilityId;
  key: AccountBaseLevelKey;
  name: string;
}> = [
  {
    effect: (level) => `出征经验 +${Math.max(0, level - 1) * 2}，战斗生命准备 +${Math.max(0, level - 1) * 2}`,
    id: "training",
    key: "trainingRoomLevel",
    name: "训练室"
  },
  {
    effect: (level) => `治疗疲劳额外 -${Math.max(0, level - 1) * 4}，野外包扎 +${Math.max(0, level - 1) * 2}`,
    id: "medical",
    key: "medicalRoomLevel",
    name: "医务室"
  },
  {
    effect: (level) => `背包容量 +${Math.max(0, level - 1) * 2}，更适合长线搜刮`,
    id: "warehouse",
    key: "warehouseLevel",
    name: "仓库"
  },
  {
    effect: (level) => `路线压力 -${level * 2}，情报与商店线索 +${level}`,
    id: "radio",
    key: "radioBenchLevel",
    name: "电台工作台"
  }
];

export function accountBaseDevelopmentPlan(account: AccountState): AccountBaseDevelopmentPlan {
  const projects = accountBaseFacilities.map((facility) => {
    const currentLevel = account.base[facility.key];
    const nextLevel = Math.min(accountBaseLevelCap, currentLevel + 1);
    const cost = accountBaseUpgradeCost(facility.id, nextLevel);
    const maxed = currentLevel >= accountBaseLevelCap;
    const canAfford =
      !maxed &&
      account.resources.materials >= cost.materials &&
      account.resources.rareParts >= cost.rareParts &&
      account.resources.intel >= cost.intel;

    return {
      canAfford,
      cost,
      currentLevel,
      effect: facility.effect(nextLevel),
      id: facility.id,
      name: facility.name,
      nextLevel,
      status: maxed ? "maxed" : canAfford ? "available" : "blocked"
    } satisfies AccountBaseProject;
  });
  const activeProjects = projects.filter((project) => project.status !== "maxed");
  const affordableCount = activeProjects.filter((project) => project.canAfford).length;
  const blockedCount = activeProjects.length - affordableCount;

  return {
    affordableCount,
    blockedCount,
    projects,
    resources: {
      intel: account.resources.intel,
      materials: account.resources.materials,
      rareParts: account.resources.rareParts
    },
    summary: `个人基地有 ${activeProjects.length} 项可发展，可立即升级 ${affordableCount} 项，受限 ${blockedCount} 项。`
  };
}

export function upgradeAccountBase(session: PlaytestSession, userId: string, facilityId: AccountBaseFacilityId): PlaytestSession {
  const next = clone(session);
  ensureUser(next, userId);

  const project = accountBaseDevelopmentPlan(next.account).projects.find((candidate) => candidate.id === facilityId);
  if (!project) {
    throw new Error(`未知个人基地项目：${facilityId}`);
  }
  if (project.status === "maxed") {
    throw new Error(`${project.name} 已经达到发展上限。`);
  }
  if (!project.canAfford) {
    throw new Error(`个人库存不足，无法升级${project.name}。`);
  }

  next.account.resources.materials -= project.cost.materials;
  next.account.resources.rareParts -= project.cost.rareParts;
  next.account.resources.intel -= project.cost.intel;
  setAccountBaseFacilityLevel(next.account.base, facilityId, project.nextLevel);
  next.account.base.level = Math.max(
    1,
    next.account.base.medicalRoomLevel,
    next.account.base.radioBenchLevel,
    next.account.base.trainingRoomLevel,
    next.account.base.warehouseLevel
  );
  next.room.feed.unshift({
    body: `${project.name}升级到 Lv.${project.nextLevel}。消耗${formatAccountBaseCost(project.cost)}；${project.effect}。`,
    id: `feed-account-base-${Date.now()}`,
    kind: "member",
    timestamp: "刚刚",
    title: "个人基地升级"
  });

  refreshUiState(next);
  return next;
}

export function applyContribution(session: PlaytestSession, userId: string, resources: ResourceBundle): PlaytestSession {
  const next = clone(session);
  ensureUser(next, userId);

  for (const key of resourceKeys) {
    const amount = Math.max(0, Math.floor(resources[key]));
    if (amount > next.account.resources[key]) {
      throw new Error(`个人库存里的${resourceLabels[key]}不足，无法捐入。`);
    }

    next.account.resources[key] -= amount;
    next.room.base.resources[key] += amount;
  }

  next.room.contributions.unshift({
    createdAt: new Date().toISOString(),
    id: `contribution-${Date.now()}`,
    resources: { ...emptyLoadout(), ...resources },
    roomId: next.room.id,
    userId
  });
  next.room.feed.unshift({
    body: `${actorName(next, userId)}把个人库存转入共同基地：${formatResources(resources)}。`,
    id: `feed-contribution-${Date.now()}`,
    kind: "member",
    timestamp: "刚刚",
    title: "基地收到捐入物资"
  });

  refreshUiState(next);
  return next;
}

export function assignSurvivorToRoom(session: PlaytestSession, userId: string, survivorId: string): PlaytestSession {
  const next = clone(session);
  ensureUser(next, userId);

  const survivor = next.account.survivors.find((candidate) => candidate.id === survivorId);
  if (!survivor) {
    throw new Error(`未知幸存者：${survivorId}`);
  }

  survivor.status = "assigned";

  if (!next.room.assignedSurvivors.some((assignment) => assignment.userId === userId && assignment.survivorId === survivorId)) {
    next.room.assignedSurvivors.push({
      assignedAt: new Date().toISOString(),
      roomId: next.room.id,
      survivorId,
      userId
    });
  }

  refreshUiState(next);
  return next;
}

export function setBaseAssignment(session: PlaytestSession, userId: string, survivorId: string, type: BaseWorkType | "idle"): PlaytestSession {
  const next = clone(session);
  ensureUser(next, userId);

  const survivor = next.account.survivors.find((candidate) => candidate.id === survivorId);
  if (!survivor) {
    throw new Error(`未知幸存者：${survivorId}`);
  }

  if (survivor.status === "assigned") {
    throw new Error("已派遣出征的幸存者不能安排基地班次。");
  }

  next.room.baseAssignments = next.room.baseAssignments.filter(
    (assignment) => !(assignment.userId === userId && assignment.survivorId === survivorId)
  );

  if (type !== "idle") {
    next.room.baseAssignments.push({
      roomId: next.room.id,
      survivorId,
      type,
      userId
    });
  }

  next.room.feed.unshift({
    body:
      type === "idle"
        ? `${survivor.name} 下班休息，优先恢复状态。`
        : `${survivor.name} 已安排到${baseWorkLabels[type]}，将在下次日结时生效。`,
    id: `feed-base-assignment-${Date.now()}`,
    kind: "member",
    timestamp: "刚刚",
    title: "基地班次已更新"
  });

  refreshUiState(next);
  return next;
}

export function resolvePlaytestExpedition(
  session: PlaytestSession,
  request: PlaytestExpeditionRequest
): { session: PlaytestSession; report: ExpeditionReport } {
  const next = clone(session);
  ensureUser(next, request.userId);

  const assignedIds = new Set(
    next.room.assignedSurvivors
      .filter((assignment) => assignment.userId === request.userId)
      .map((assignment) => assignment.survivorId)
  );

  for (const survivorId of request.survivorIds) {
    if (!assignedIds.has(survivorId)) {
      throw new Error(`幸存者 ${survivorId} 尚未加入这个房间。`);
    }
  }

  const result = resolveExpedition(roomToGameState(next.room, next.account.survivors), {
    loadout: request.loadout,
    locationId: request.locationId,
    randomRolls: request.randomRolls,
    risk: request.risk,
    squadIds: request.survivorIds
  });
  applyExtractionRewardScale(result.nextState.resources, result.report, request);

  const process = buildProcess(next, request, result.report);
  result.report.logs = [...process.logs, ...result.report.logs];

  next.room.base.resources = pickResources(result.nextState.resources);
  next.room.base.morale = result.nextState.resources.morale;
  next.room.base.danger = result.nextState.resources.danger;
  next.room.feed = result.nextState.feed;
  const growthSummaries: string[] = [];
  next.account.survivors = next.account.survivors.map((survivor) => {
    const updated = result.nextState.survivors.find((candidate) => candidate.id === survivor.id);
    if (!updated) {
      return survivor;
    }

    const participated = request.survivorIds.includes(survivor.id);
    const trainingLevel = facilityLevel(next, "training") + Math.max(0, next.account.base.trainingRoomLevel - 1);
    const advancement = participated
      ? advanceSurvivorExperience(survivor, expeditionXpGain(request.travelFatigue ?? 0, trainingLevel))
      : null;
    if (advancement) {
      growthSummaries.push(formatSurvivorGrowth(advancement));
    }

    return {
      ...survivor,
      fatigue: participated ? clamp(updated.fatigue + Math.floor((request.travelFatigue ?? 0) / 5), 0, 100) : updated.fatigue,
      injuries: updated.injuries,
      level: advancement?.survivor.level ?? survivor.level,
      status: participated ? "available" : survivor.status,
      xp: advancement?.survivor.xp ?? survivor.xp
    };
  });
  const progressionLogs = growthSummaries.length ? [`成长：${growthSummaries.join("；")}。`] : [];
  if (progressionLogs.length) {
    result.report.logs.unshift(...progressionLogs);
  }
  applyProcessEffects(next, request, process);

  next.room.assignedSurvivors = next.room.assignedSurvivors.filter(
    (assignment) => !request.survivorIds.includes(assignment.survivorId)
  );
  const siteObjectiveProgress = request.extractionStatus === "early" ? 0 : objectiveProgress(result.report);
  const totalObjectiveProgress = siteObjectiveProgress + process.objectiveBonus + (request.routeObjectiveBonus ?? 0);
  next.room.base.objective.repairedParts = Math.min(
    next.room.base.objective.requiredParts,
    next.room.base.objective.repairedParts + totalObjectiveProgress
  );
  if (next.room.base.objective.repairedParts >= next.room.base.objective.requiredParts) {
    next.room.base.objective.status = "won";
  }
  applyCombatAftermath(next, request, result.report);
  const recoveryLogs = postExpeditionRecoveryLogs(next, request.survivorIds);
  if (recoveryLogs.length) {
    const insertIndex = result.report.logs.findIndex((line) => !line.startsWith("成长：") && !line.startsWith("战斗战利品"));
    result.report.logs.splice(insertIndex === -1 ? result.report.logs.length : insertIndex, 0, ...recoveryLogs);
  }
  const accountSpoilsLogs = applyAccountExpeditionSpoils(next, request, result.report);
  const returnLedgerLog = buildReturnLedgerLog(result.report, request, totalObjectiveProgress, accountSpoilsLogs);
  const returnLedgerIndex = result.report.logs.findIndex((line) => !line.startsWith("成长："));
  result.report.logs.splice(returnLedgerIndex === -1 ? result.report.logs.length : returnLedgerIndex, 0, returnLedgerLog);

  if (next.room.feed[0]) {
    const processLogs = selectFeedProcessLogs(process.logs);
    next.room.feed[0] = {
      ...next.room.feed[0],
      body: [summarizePlaytestReport(result.report, request), ...progressionLogs, returnLedgerLog, ...processLogs, ...recoveryLogs, ...accountSpoilsLogs].join(
        "\n"
      )
    };
  }

  refreshUiState(next);
  return { report: result.report, session: next };
}

export function treatSurvivor(session: PlaytestSession, userId: string, survivorId: string): PlaytestSession {
  const next = clone(session);
  ensureUser(next, userId);

  const survivor = next.account.survivors.find((candidate) => candidate.id === survivorId);
  if (!survivor) {
    throw new Error(`未知幸存者：${survivorId}`);
  }

  if (next.room.base.resources.medicine < 1) {
    throw new Error("基地药品不足，无法治疗幸存者。");
  }

  const medicalBonus = Math.max(0, next.account.base.medicalRoomLevel - 1) * 4;
  const fatigueRecovery = 18 + medicalBonus;
  next.room.base.resources.medicine -= 1;
  survivor.injuries = survivor.injuries.slice(1);
  survivor.fatigue = clamp(survivor.fatigue - fatigueRecovery, 0, 100);
  survivor.status = survivor.injuries.length > 0 ? "recovering" : "available";
  next.room.feed.unshift({
    body: `${survivor.name} 在医务角安静处理了一班。药品 -1，疲劳 -${fatigueRecovery}，并清除 1 个伤病${
      medicalBonus > 0 ? `；个人医务室 Lv.${next.account.base.medicalRoomLevel} 额外恢复 ${medicalBonus}` : ""
    }。`,
    id: `feed-treatment-${Date.now()}`,
    kind: "system",
    timestamp: "刚刚",
    title: "治疗完成"
  });

  refreshUiState(next);
  return next;
}

export function upgradeFacility(session: PlaytestSession, userId: string, facilityId: string): PlaytestSession {
  const next = clone(session);
  ensureUser(next, userId);

  const facility = next.room.base.facilities.find((candidate) => candidate.id === facilityId);
  if (!facility) {
    throw new Error(`未知设施：${facilityId}`);
  }

  const wasBuilt = isFacilityBuilt(facility);
  if (isFacilityMaxed(facility)) {
    throw new Error(`${facility.name} 已经完全发展。`);
  }

  const materialCost = facilityActionCost(facility);
  if (next.room.base.resources.materials < materialCost) {
    throw new Error(`基地材料不足，无法${wasBuilt ? "升级" : "建造"}该设施。`);
  }

  next.room.base.resources.materials -= materialCost;
  facility.level = wasBuilt ? facility.level + 1 : 1;
  facility.status = facility.level >= 3 ? "stable" : "strained";
  facility.effect = `${facilityBaseEffect(facility.id)} / Lv.${facility.level}：基地与出征支援增强。`;
  next.room.feed.unshift({
    body: `${facility.name}${wasBuilt ? "升级到" : "建成并达到"} Lv.${facility.level}。材料 -${materialCost}；${facilityEffectSummary(
      facility.id
    )}。`,
    id: `feed-facility-${Date.now()}`,
    kind: "system",
    timestamp: "刚刚",
    title: wasBuilt ? "设施升级完成" : "设施建造完成"
  });

  refreshUiState(next);
  return next;
}

export function advanceRoomDay(session: PlaytestSession, userId: string): PlaytestSession {
  const next = clone(session);
  ensureUser(next, userId);

  if (next.room.base.objective.status !== "active") {
    throw new Error("这个房间目标已经结算。");
  }

  const previousDay = next.room.base.day;
  const nextDay = previousDay + 1;
  const dormLevel = facilityLevel(next, "dorm");
  const clinicLevel = facilityLevel(next, "clinic");
  const watchtowerLevel = facilityLevel(next, "watchtower");
  const kitchenLevel = facilityLevel(next, "kitchen");
  const barricadeLevel = facilityLevel(next, "barricade");
  const radioLevel = facilityLevel(next, "radio");
  const foodNeed = roomFoodNeed(next);
  const waterNeed = roomWaterNeed(next);
  const foodShortage = spendWithShortage(next.room.base.resources, "food", foodNeed);
  const waterShortage = spendWithShortage(next.room.base.resources, "water", waterNeed);
  const shortagePressure = foodShortage + waterShortage;
  const recovery = 6 + dormLevel * 3 + clinicLevel * 2;
  const shift = resolveBaseAssignments(next);
  const recoveredCount = recoverSurvivors(next, recovery);
  const radioObjectiveBonus = radioLevel >= 2 ? 1 : 0;
  if (radioObjectiveBonus > 0) {
    next.room.base.objective.repairedParts = Math.min(
      next.room.base.objective.requiredParts,
      next.room.base.objective.repairedParts + radioObjectiveBonus
    );
  }

  next.room.base.day = nextDay;
  next.room.base.morale = clamp(next.room.base.morale + (shortagePressure > 0 ? -shortagePressure * 6 : 2), 0, 100);
  next.room.base.danger = clamp(next.room.base.danger + shortagePressure * 3 - watchtowerLevel - barricadeLevel - shift.dangerReduction, 0, 100);
  const baseEvent = resolveBaseDayEvent(next, nextDay, shift.coverage);

  const logs = [
    ...shift.logs,
    `日常消耗：食物 -${foodNeed - foodShortage}/${foodNeed}，水 -${waterNeed - waterShortage}/${waterNeed}。`,
    shortagePressure > 0
      ? `压力：短缺打击士气，也让基地更容易暴露。士气 -${shortagePressure * 6}，危险 +${shortagePressure * 3}。`
      : "压力：基地没有发生口粮恐慌，平稳熬过夜晚。士气 +2。",
    `恢复：${recoveredCount} 名幸存者休息。伤病惩罚前疲劳 -${recovery}。`,
    ...baseEvent.logs
  ];
  if (kitchenLevel > 0) {
    logs.push(`厨房：Lv.${kitchenLevel} 降低了日常消耗。`);
  }
  if (barricadeLevel > 0) {
    logs.push(`路障线：危险压力 -${barricadeLevel}。`);
  }
  if (radioObjectiveBonus > 0) {
    logs.push(`电台：塔台协同让目标 +${radioObjectiveBonus}。`);
  }

  if (next.room.base.objective.repairedParts >= next.room.base.objective.requiredParts) {
    next.room.base.objective.status = "won";
    logs.push("目标：通讯塔稳定上线，房间撑过了这一局。");
  } else if (next.room.base.day > next.room.base.objective.deadlineDay) {
    next.room.base.objective.status = "lost";
    logs.push("目标：修复期限已过，通讯塔没能上线。");
  } else {
    logs.push(
      `目标：已修复 ${next.room.base.objective.repairedParts}/${next.room.base.objective.requiredParts}，还剩 ${Math.max(
        0,
        next.room.base.objective.deadlineDay - next.room.base.day + 1
      )} 天。`
    );
  }
  next.room.baseAssignments = [];

  next.room.feed.unshift({
    body: logs.join("\n"),
    id: `feed-day-${Date.now()}`,
    kind: "system",
    timestamp: `第 ${nextDay} 天`,
    title: next.room.base.objective.status === "lost" ? "目标失败" : `第 ${nextDay} 天：${baseEvent.title}`
  });

  refreshUiState(next);
  return next;
}

const resourceKeys = ["food", "water", "materials", "medicine", "fuel", "ammo"] as const;

const resourceLabels: Record<ResourceKey, string> = {
  ammo: "弹药",
  food: "食物",
  fuel: "燃料",
  materials: "材料",
  medicine: "药品",
  water: "水"
};

const baseWorkLabels: Record<BaseWorkType, string> = {
  care: "护理班",
  forage: "搜寻班",
  guard: "守卫班",
  repair: "修理班"
};

function accountBaseUpgradeCost(facilityId: AccountBaseFacilityId, nextLevel: number) {
  return {
    intel: facilityId === "radio" && nextLevel >= 2 ? nextLevel - 1 : 0,
    materials: nextLevel * 4,
    rareParts: nextLevel >= 3 ? 1 : 0
  };
}

function setAccountBaseFacilityLevel(base: AccountState["base"], facilityId: AccountBaseFacilityId, level: number) {
  const config = accountBaseFacilities.find((facility) => facility.id === facilityId);
  if (!config) {
    throw new Error(`未知个人基地项目：${facilityId}`);
  }

  base[config.key] = level;
}

function formatAccountBaseCost(cost: AccountBaseProject["cost"]) {
  const parts = [
    cost.materials > 0 ? `材料 -${cost.materials}` : "",
    cost.rareParts > 0 ? `稀有零件 -${cost.rareParts}` : "",
    cost.intel > 0 ? `情报 -${cost.intel}` : ""
  ].filter(Boolean);

  return parts.join("，") || "无额外资源";
}

const facilityEffectSummaries: Record<string, string> = {
  barricade: "每日危险和守卫压力得到改善",
  clinic: "护理班次和野外包扎得到改善",
  dorm: "恢复效率和守卫耐久得到改善",
  generator: "弹药支援和出征供电开局得到改善",
  kitchen: "日常消耗和搜寻收益得到改善",
  radio: "塔台协同和路线压力得到改善",
  training: "远征经验和战斗耐力得到改善",
  watchtower: "每日危险和路线压力得到改善",
  workshop: "修理班次和弹药伤害得到改善"
};

const combatScarNames = ["肋骨裂伤", "肩部撕裂", "感染咬伤", "弹片割伤"];

function facilityEffectSummary(facilityId: string) {
  return facilityEffectSummaries[facilityId] ?? "基地运转得到改善";
}

function ensureUser(session: PlaytestSession, userId: string) {
  if (session.account.profile.userId !== userId) {
    throw new Error("This session can only mutate the active account.");
  }
}

function actorName(session: PlaytestSession, userId: string) {
  return session.room.members.find((member) => member.userId === userId)?.displayName ?? session.account.profile.displayName;
}

function formatResources(resources: ResourceBundle) {
  const summary = resourceKeys
    .filter((key) => resources[key] > 0)
    .map((key) => `${resourceLabels[key]} +${resources[key]}`)
    .join(", ");

  return summary || "没有可用物资";
}

function formatSignedNumber(value: number): string {
  return `${value >= 0 ? "+" : ""}${value}`;
}

function summarizePlaytestReport(report: ExpeditionReport, request: PlaytestExpeditionRequest) {
  const status = request.extractionStatus === "early" ? "提前折返" : "完成路线";
  return `${report.squadNames.join("、")}在${report.locationName}${status}。结果：${expeditionOutcomeLabel(report.outcome)}。主要收获：${formatResources(report.reward)}。`;
}

function buildReturnLedgerLog(
  report: ExpeditionReport,
  request: PlaytestExpeditionRequest,
  objectiveProgressDelta: number,
  accountSpoilsLogs: string[]
) {
  const extractionText = request.extractionStatus === "early" ? "提前返程" : "完整撤离";
  const accountText = accountSpoilsLogs.length ? accountSpoilsLogs.map(stripReturnLedgerPrefix).join("；") : "无账号回收";
  const scarCount = Math.max(request.battleScars ?? 0, new Set(request.combatScarSurvivorIds ?? []).size);
  const injuryText = scarCount > 0 ? `伤病 ${scarCount} 名待恢复` : "伤病 0";

  return `归队清单：基地入库 ${formatResources(report.reward)}；目标推进 +${Math.max(0, objectiveProgressDelta)}；账号回收 ${accountText}；${injuryText}；${extractionText}。`;
}

function stripReturnLedgerPrefix(line: string) {
  return line
    .replace(/^账号战利：/, "")
    .replace(/^返程回收：/, "")
    .replace(/。$/, "")
    .trim();
}

function selectFeedProcessLogs(logs: string[]): string[] {
  const priority = logs.filter(isPriorityProcessLog);
  const rest = logs.filter((line) => !isPriorityProcessLog(line));
  return [...priority, ...rest].slice(0, 8);
}

function isPriorityProcessLog(line: string): boolean {
  return /紧急返程|提前截断路线|提前撤离|撤离：|呼叫基地接应|保住已入袋/.test(line);
}

function expeditionXpGain(travelFatigue: number, trainingLevel: number) {
  return 8 + Math.floor(travelFatigue / 25) + trainingLevel * 2;
}

function formatSurvivorGrowth(advancement: SurvivorAdvancement) {
  const base = `${advancement.survivor.name} +${advancement.xpGained} 经验`;
  const unlocked = advancement.unlockedPerks.length
    ? `，解锁 ${advancement.unlockedPerks.map((perk) => perk.label).join("、")}`
    : "";

  if (advancement.levelUps.length > 0) {
    return `${base}，升到 Lv.${advancement.afterLevel}${unlocked}`;
  }

  if (advancement.atLevelCap) {
    return `${base}，Lv.${advancement.afterLevel} 已达上限`;
  }

  return `${base}，距 Lv.${advancement.afterLevel + 1} 还差 ${advancement.xpToNextLevel}`;
}

function expeditionOutcomeLabel(outcome: ExpeditionReport["outcome"]) {
  const labels: Record<ExpeditionReport["outcome"], string> = {
    clean: "干净完成",
    costly: "代价惨重",
    rough: "艰难完成"
  };
  return labels[outcome];
}

function riskStrategyLabel(risk: PlaytestExpeditionRequest["risk"]) {
  const labels: Record<PlaytestExpeditionRequest["risk"], string> = {
    cautious: "保守",
    greedy: "贪婪",
    standard: "标准"
  };
  return labels[risk];
}

function pickResources(resources: ResourceBundle & { morale?: number; danger?: number }): ResourceBundle {
  return {
    ammo: resources.ammo,
    food: resources.food,
    fuel: resources.fuel,
    materials: resources.materials,
    medicine: resources.medicine,
    water: resources.water
  };
}

function objectiveProgress(report: ExpeditionReport) {
  return report.outcome === "clean" ? 2 : report.outcome === "rough" ? 1 : 0;
}

function applyExtractionRewardScale(resources: ResourceBundle & { morale?: number; danger?: number }, report: ExpeditionReport, request: PlaytestExpeditionRequest) {
  if (request.extractionStatus !== "early") {
    return;
  }

  const rewardScale = 0.4;
  const reduced: string[] = [];
  for (const key of resourceKeys) {
    const original = report.reward[key];
    const scaled = Math.floor(original * rewardScale);
    const delta = original - scaled;
    if (delta > 0) {
      resources[key] = Math.max(0, resources[key] - delta);
      reduced.push(`${resourceLabels[key]} -${delta}`);
    }
    report.reward[key] = scaled;
  }

  report.logs.unshift(
    `提前撤离：队伍在抵达地点核心前折返。主要地点奖励降低${reduced.length ? `（${reduced.join("，")}）` : ""}。`
  );
}

type ProcessResult = {
  dangerDelta: number;
  injury?: string;
  logs: string[];
  moraleDelta: number;
  objectiveBonus: number;
  resourceBonus: Partial<Record<ResourceKey, number>>;
};

type BaseShiftCoverage = Record<BaseWorkType, number>;

type BaseDayEventResult = {
  logs: string[];
  title: string;
};

export type BaseRecoveryPatientPreview = {
  fatigue: number;
  injuries: number;
  name: string;
  status: PlaytestSession["account"]["survivors"][number]["status"];
};

export type BaseRecoveryPlan = {
  careShifts: number;
  clinicLevel: number;
  dailyRecovery: number;
  dormLevel: number;
  injuredCount: number;
  likelyInjuryClears: number;
  priorityPatients: BaseRecoveryPatientPreview[];
  recoveringCount: number;
  summary: string;
};

export type BaseDevelopmentProjectPreview = {
  action: "Build" | "Upgrade" | "Maxed";
  baseImpact: string;
  canAfford: boolean;
  category: string;
  cost: number;
  expeditionImpact: string;
  id: string;
  level: number;
  materialDeficit: number;
  name: string;
  nextLevel: number;
  priority: number;
};

export type BaseDevelopmentPlan = {
  affordableCount: number;
  blockedCount: number;
  materials: number;
  projects: BaseDevelopmentProjectPreview[];
  recommended: BaseDevelopmentProjectPreview[];
  summary: string;
};

export type BaseDayPreview = {
  dangerDelta: number;
  dangerRelief: number;
  foodAvailable: number;
  foodNeed: number;
  foodShortage: number;
  forageSummary: string;
  guardSummary: string;
  moraleDelta: number;
  nextDay: number;
  objectiveCurrent: number;
  objectiveGain: number;
  objectiveProjected: number;
  recoverySummary: string;
  repairSummary: string;
  shiftCounts: BaseShiftCoverage;
  summary: string;
  supplySummary: string;
  waterAvailable: number;
  waterNeed: number;
  waterShortage: number;
};

export type RoomMemberSummary = {
  assignedCount: number;
  baseShiftText: string;
  contributionCount: number;
  contributionText: string;
  displayName: string;
  lastSeenAt: string;
  roleLabel: string;
  userId: string;
};

export function roomMemberSummaries(session: PlaytestSession): RoomMemberSummary[] {
  return session.room.members
    .map((member) => {
      const contributionTotals = emptyLoadout();
      let contributionCount = 0;
      for (const contribution of session.room.contributions.filter((entry) => entry.userId === member.userId)) {
        contributionCount += 1;
        for (const key of resourceKeys) {
          contributionTotals[key] += contribution.resources[key] ?? 0;
        }
      }

      const assignedCount = session.room.assignedSurvivors.filter((assignment) => assignment.userId === member.userId).length;
      const shiftCounts = createEmptyShiftCoverage();
      for (const assignment of session.room.baseAssignments.filter((entry) => entry.userId === member.userId)) {
        shiftCounts[assignment.type] += 1;
      }

      return {
        assignedCount,
        baseShiftText: formatBaseShiftCounts(shiftCounts),
        contributionCount,
        contributionText: formatResources(contributionTotals),
        displayName: member.displayName,
        lastSeenAt: member.lastSeenAt,
        roleLabel: member.role === "host" ? "房主" : "成员",
        userId: member.userId
      };
    })
    .sort((left, right) =>
      left.roleLabel === right.roleLabel
        ? left.displayName.localeCompare(right.displayName, "zh-Hans-CN")
        : left.roleLabel === "房主"
          ? -1
          : 1
    );
}

export function baseRecoveryPlan(session: PlaytestSession): BaseRecoveryPlan {
  const dormLevel = facilityLevel(session, "dorm");
  const clinicLevel = facilityLevel(session, "clinic");
  const dailyRecovery = 6 + dormLevel * 3 + clinicLevel * 2;
  const careWorkers = session.room.baseAssignments
    .filter((assignment) => assignment.type === "care")
    .flatMap((assignment) => {
      const survivor = session.account.survivors.find(
        (candidate) => candidate.id === assignment.survivorId && candidate.ownerUserId === assignment.userId
      );
      return survivor && survivor.status !== "assigned" ? [survivor] : [];
    });
  const careWorkerIds = new Set(careWorkers.map((survivor) => survivor.id));
  const priorityPatients = recoveryPriorityPatients(session, careWorkerIds);
  const injuryClearCapacity = careWorkers.filter((survivor) => careHealScore(session, survivor) >= 10).length;
  const injuredCount = session.account.survivors.filter((survivor) => survivor.injuries.length > 0).length;
  const recoveringCount = session.account.survivors.filter((survivor) => survivor.status === "recovering").length;
  const likelyInjuryClears = Math.min(
    priorityPatients.filter((patient) => patient.injuries > 0).length,
    injuryClearCapacity
  );

  return {
    careShifts: careWorkers.length,
    clinicLevel,
    dailyRecovery,
    dormLevel,
    injuredCount,
    likelyInjuryClears,
    priorityPatients,
    recoveringCount,
    summary: `${careWorkers.length} 个护理班，预计清除 ${likelyInjuryClears} 个伤病，基础疲劳恢复 -${dailyRecovery}。`
  };
}

export function baseDevelopmentPlan(session: PlaytestSession): BaseDevelopmentPlan {
  const materials = session.room.base.resources.materials;
  const projects = session.room.base.facilities.map((facility) => {
    const action = facilityActionLabel(facility);
    const cost = facilityActionCost(facility);
    const nextLevel = action === "Maxed" ? facility.level : isFacilityBuilt(facility) ? facility.level + 1 : 1;
    const canAfford = action !== "Maxed" && materials >= cost;
    return {
      action,
      baseImpact: facilityDevelopmentImpact(facility.id).base,
      canAfford,
      category: facility.category ?? "core",
      cost,
      expeditionImpact: facilityDevelopmentImpact(facility.id).expedition,
      id: facility.id,
      level: facility.level,
      materialDeficit: Math.max(0, cost - materials),
      name: facility.name,
      nextLevel,
      priority: developmentProjectScore(facility.id, facility.category ?? "core", action, canAfford)
    };
  });
  const activeProjects = projects
    .filter((project) => project.action !== "Maxed")
    .sort((left, right) => right.priority - left.priority || left.materialDeficit - right.materialDeficit || left.cost - right.cost);
  const affordableCount = activeProjects.filter((project) => project.canAfford).length;
  const blockedCount = activeProjects.length - affordableCount;

  return {
    affordableCount,
    blockedCount,
    materials,
    projects,
    recommended: activeProjects.slice(0, 3),
    summary: `当前材料 ${materials}。可推进 ${affordableCount} 个项目，仍受材料限制 ${blockedCount} 个。`
  };
}

export function baseDayPreview(session: PlaytestSession): BaseDayPreview {
  const nextDay = session.room.base.day + 1;
  const shifts = previewBaseAssignments(session);
  const foodNeed = roomFoodNeed(session);
  const waterNeed = roomWaterNeed(session);
  const foodAvailable = session.room.base.resources.food;
  const waterAvailable = session.room.base.resources.water;
  const foodShortage = Math.max(0, foodNeed - foodAvailable);
  const waterShortage = Math.max(0, waterNeed - waterAvailable);
  const shortagePressure = foodShortage + waterShortage;
  const watchtowerLevel = facilityLevel(session, "watchtower");
  const barricadeLevel = facilityLevel(session, "barricade");
  const moraleDelta = shortagePressure > 0 ? -shortagePressure * 6 : 2;
  const dangerDelta = shortagePressure * 3 - watchtowerLevel - barricadeLevel - shifts.dangerReduction;
  const recovery = baseRecoveryPlan(session);
  const radioObjectiveBonus = facilityLevel(session, "radio") >= 2 ? 1 : 0;
  const objectiveCurrent = session.room.base.objective.repairedParts;
  const objectiveGain = shifts.objectiveGain + radioObjectiveBonus;
  const objectiveProjected = Math.min(session.room.base.objective.requiredParts, objectiveCurrent + objectiveGain);
  const supplyPressure = foodShortage + waterShortage > 0 ? `食物短缺 ${foodShortage}，水短缺 ${waterShortage}` : "食物和水足够过夜";

  return {
    dangerDelta,
    dangerRelief: Math.max(0, watchtowerLevel + barricadeLevel + shifts.dangerReduction),
    foodAvailable,
    foodNeed,
    foodShortage,
    forageSummary: shifts.shiftCounts.forage > 0 ? `搜寻班 ${shifts.shiftCounts.forage}，预计食物 +${shifts.foodGain}，水 +${shifts.waterGain}` : "没有搜寻班",
    guardSummary: shifts.shiftCounts.guard > 0 ? `守卫班 ${shifts.shiftCounts.guard}，危险压力 -${shifts.dangerReduction}` : "没有守卫班",
    moraleDelta,
    nextDay,
    objectiveCurrent,
    objectiveGain,
    objectiveProjected,
    recoverySummary: `${recovery.recoveringCount} 人恢复中，疲劳恢复 -${recovery.dailyRecovery}，护理班 ${recovery.careShifts}`,
    repairSummary:
      shifts.shiftCounts.repair > 0
        ? `修理班 ${shifts.shiftCounts.repair}，预计目标 +${shifts.objectiveGain}${shifts.materialGain > 0 ? `，材料 +${shifts.materialGain}` : ""}`
        : "没有修理班",
    shiftCounts: shifts.shiftCounts,
    summary: `明天进入第 ${nextDay} 天：${supplyPressure}，士气 ${formatSignedNumber(moraleDelta)}，危险 ${formatSignedNumber(dangerDelta)}，目标预计 ${objectiveProjected}/${session.room.base.objective.requiredParts}。`,
    supplySummary: `需要食物 ${foodNeed} / 水 ${waterNeed}，当前食物 ${foodAvailable} / 水 ${waterAvailable}。`,
    waterAvailable,
    waterNeed,
    waterShortage
  };
}

function buildProcess(session: PlaytestSession, request: PlaytestExpeditionRequest, report: ExpeditionReport): ProcessResult {
  const rolls = request.randomRolls ?? [Math.random(), Math.random(), Math.random(), Math.random(), Math.random()];
  const squad = request.survivorIds
    .map((id) => session.account.survivors.find((survivor) => survivor.id === id))
    .filter(Boolean) as PlaytestSession["account"]["survivors"];
  const lead = squad[0];
  const specialist = squad.find((survivor) => survivor.attributes.technical >= 7 || survivor.attributes.medical >= 7) ?? squad[1] ?? lead;
  const process: ProcessResult = {
    dangerDelta: 0,
    logs: [],
    moraleDelta: 0,
    objectiveBonus: 0,
    resourceBonus: {}
  };
  const logs = [
    `出发：${lead?.name ?? "队伍"}检查路线标记，消耗打包物资，并赶在塔台警报再次循环前离开。`,
    `接近：${specialist?.name ?? "专精队员"}判断地点压力。风险策略为${riskStrategyLabel(request.risk)}，队伍始终记着一条撤离线。`
  ];
  if (request.journeyLogs?.length) {
    logs.push(...request.journeyLogs.map((line) => `路线：${line}`));
  }

  if (request.extractionStatus === "early") {
    logs.push("撤离：队伍提前截断路线，保住野外战利，并避免更深伤病。");
    return {
      ...process,
      logs
    };
  }

  const encounterRoll = rolls[3] ?? rolls[0] ?? 0.5;
  if (encounterRoll < 0.25) {
    process.dangerDelta = 1;
    process.injury = "擦伤";
    const target = squad[0];
    logs.push(`遭遇：堵死的楼梯间变成吵闹绕路。危险 +1${target ? `，${target.name} 受到擦伤` : ""}。`);
  } else if (encounterRoll < 0.5) {
    process.resourceBonus.materials = 1;
    logs.push("遭遇：队伍离开前拆空一个检修柜。材料 +1。");
  } else if (encounterRoll < 0.75) {
    process.objectiveBonus = 1;
    logs.push("遭遇：一张清晰中继图正好对应塔台问题。目标 +1。");
  } else {
    process.resourceBonus.medicine = 1;
    logs.push("遭遇：坍塌桌下还压着一个密封急救缓存。药品 +1。");
  }

  const pressureRoll = rolls[4] ?? rolls[1] ?? 0.5;
  if (pressureRoll > 0.72 && report.outcome !== "clean") {
    process.moraleDelta = -1;
    logs.push("变故：撤退过程有些混乱，所有人都从电台里听见了。士气 -1。");
  } else {
    logs.push("撤离：队伍带回足够细节，下一队能做出更好的路线选择。");
  }

  return {
    ...process,
    logs
  };
}

function applyProcessEffects(session: PlaytestSession, request: PlaytestExpeditionRequest, process: ProcessResult) {
  for (const [key, amount] of Object.entries(process.resourceBonus) as Array<[ResourceKey, number]>) {
    session.room.base.resources[key] = Math.max(0, session.room.base.resources[key] + amount);
  }

  session.room.base.danger = clamp(session.room.base.danger + process.dangerDelta, 0, 100);
  session.room.base.morale = clamp(session.room.base.morale + process.moraleDelta, 0, 100);

  if (process.injury) {
    const target = session.account.survivors.find((survivor) => survivor.id === request.survivorIds[0]);
    if (target && !target.injuries.includes(process.injury)) {
      target.injuries = [...target.injuries, process.injury];
    }
  }
}

function applyCombatAftermath(session: PlaytestSession, request: PlaytestExpeditionRequest, report: ExpeditionReport) {
  const scars = request.battleScars ?? 0;
  const trophies = request.trophies ?? [];
  if (trophies.length) {
    session.room.base.resources.materials += Math.min(2, trophies.length);
    report.reward.materials += Math.min(2, trophies.length);
    report.logs.unshift(`战斗战利品回收：${trophies.join("、")}。材料 +${Math.min(2, trophies.length)}。`);
  }

  if (scars <= 0) {
    return;
  }

  const squad = request.survivorIds
    .map((survivorId) => session.account.survivors.find((survivor) => survivor.id === survivorId))
    .filter(Boolean) as PlaytestSession["account"]["survivors"];
  const sorted = squad.sort((left, right) => right.fatigue + right.injuries.length * 20 - (left.fatigue + left.injuries.length * 20));
  const targeted = (request.combatScarSurvivorIds ?? [])
    .map((survivorId) => squad.find((survivor) => survivor.id === survivorId))
    .filter(Boolean) as PlaytestSession["account"]["survivors"];
  const fallback = sorted.filter((survivor) => !targeted.some((target) => target.id === survivor.id));
  const scarTargets = [...targeted, ...fallback, ...sorted];
  for (let index = 0; index < scars; index += 1) {
    const target = scarTargets[index % Math.max(1, scarTargets.length)];
    if (!target) {
      continue;
    }

    const injury = combatScarNames[index % combatScarNames.length];
    if (!target.injuries.includes(injury)) {
      target.injuries = [...target.injuries, injury];
      target.status = "recovering";
      report.logs.unshift(`${target.name} 从战斗中带回${injury}。`);
    } else {
      target.fatigue = clamp(target.fatigue + 10, 0, 100);
      report.logs.unshift(`${target.name} 加重了${injury}。疲劳 +10。`);
    }
  }
}

function postExpeditionRecoveryLogs(session: PlaytestSession, survivorIds: string[]): string[] {
  const squadIds = new Set(survivorIds);
  const patients = session.account.survivors
    .filter((survivor) => squadIds.has(survivor.id) && (survivor.injuries.length > 0 || survivor.fatigue >= 35))
    .sort((left, right) => right.injuries.length * 30 + right.fatigue - (left.injuries.length * 30 + left.fatigue));

  if (patients.length === 0) {
    return [];
  }

  const plan = baseRecoveryPlan(session);
  const totalInjuries = patients.reduce((sum, survivor) => sum + survivor.injuries.length, 0);
  const medicineText =
    totalInjuries > 0
      ? `药品 ${session.room.base.resources.medicine}/${totalInjuries}`
      : `药品 ${session.room.base.resources.medicine}，暂无伤病消耗`;
  const careText =
    plan.careShifts > 0
      ? `护理班 ${plan.careShifts} 个，预计清除 ${plan.likelyInjuryClears}/${plan.injuredCount} 个伤病`
      : "暂无护理班，建议安排医疗高的幸存者护理";
  const priorityText = patients
    .slice(0, 3)
    .map((survivor) => `${survivor.name} 疲${survivor.fatigue}/伤${survivor.injuries.length}`)
    .join("；");

  return [
    `恢复预案：医务室 Lv.${plan.clinicLevel} / 宿舍 Lv.${plan.dormLevel}；${medicineText}；${careText}；每日疲劳恢复 -${plan.dailyRecovery}。优先恢复：${priorityText}。`
  ];
}

function applyAccountExpeditionSpoils(session: PlaytestSession, request: PlaytestExpeditionRequest, report: ExpeditionReport): string[] {
  const trophyCount = request.trophies?.length ?? 0;
  const routeIntel =
    (request.routeObjectiveBonus ?? 0) +
    (request.journeyLogs ?? []).filter((line) => /情报|线索|地图|目标 \+|回撤线/.test(line)).length;

  if (request.extractionStatus === "early") {
    return applyEarlyExtractionAccountCache(session, report, trophyCount, routeIntel);
  }

  const materials = Math.min(4, Math.max(1, Math.floor(report.reward.materials / 2) + trophyCount));
  const rareParts = trophyCount > 0 || (report.outcome === "clean" && request.risk === "greedy") ? 1 : 0;
  const intel = Math.min(2, (routeIntel > 0 ? 1 : 0) + (report.outcome === "clean" ? 1 : 0));
  const spoils = [
    materials > 0 ? `材料 +${materials}` : "",
    rareParts > 0 ? `稀有零件 +${rareParts}` : "",
    intel > 0 ? `情报 +${intel}` : ""
  ].filter(Boolean);

  if (spoils.length === 0) {
    return [];
  }

  session.account.resources.materials += materials;
  session.account.resources.rareParts += rareParts;
  session.account.resources.intel += intel;
  const log = `账号战利：个人仓库回收${spoils.join("，")}。`;
  const insertIndex = report.logs.findIndex((line) => !line.startsWith("成长："));
  report.logs.splice(insertIndex === -1 ? report.logs.length : insertIndex, 0, log);
  return [log];
}

function applyEarlyExtractionAccountCache(session: PlaytestSession, report: ExpeditionReport, trophyCount: number, routeIntel: number): string[] {
  const materials = Math.min(2, Math.max(0, Math.floor(report.reward.materials / 3) + (trophyCount > 0 ? 1 : 0)));
  const intel = routeIntel > 0 ? 1 : 0;
  const spoils = [materials > 0 ? `材料 +${materials}` : "", intel > 0 ? `情报 +${intel}` : ""].filter(Boolean);

  if (spoils.length === 0) {
    return [];
  }

  session.account.resources.materials += materials;
  session.account.resources.intel += intel;
  const log = `返程回收：个人仓库带回${spoils.join("，")}。提前返程不会获得稀有零件。`;
  const insertIndex = report.logs.findIndex((line) => !line.startsWith("成长："));
  report.logs.splice(insertIndex === -1 ? report.logs.length : insertIndex, 0, log);
  return [log];
}

function spendWithShortage(resources: ResourceBundle, key: ResourceKey, amount: number): number {
  const spent = Math.min(resources[key], amount);
  resources[key] -= spent;
  return amount - spent;
}

function facilityLevel(session: PlaytestSession, facilityId: string): number {
  return session.room.base.facilities.find((facility) => facility.id === facilityId)?.level ?? 0;
}

function roomFoodNeed(session: PlaytestSession): number {
  return Math.max(1, Math.max(2, session.room.members.length * 2) - facilityLevel(session, "kitchen"));
}

function roomWaterNeed(session: PlaytestSession): number {
  return Math.max(1, Math.max(2, session.room.members.length * 2) - Math.floor(facilityLevel(session, "kitchen") / 2));
}

function createEmptyShiftCoverage(): BaseShiftCoverage {
  return {
    care: 0,
    forage: 0,
    guard: 0,
    repair: 0
  };
}

function formatBaseShiftCounts(shiftCounts: BaseShiftCoverage) {
  const labels: Record<BaseWorkType, string> = {
    care: "护理",
    forage: "搜寻",
    guard: "守卫",
    repair: "修理"
  };
  const text = (Object.keys(labels) as BaseWorkType[])
    .filter((type) => shiftCounts[type] > 0)
    .map((type) => `${labels[type]} ${shiftCounts[type]}`)
    .join(" / ");

  return text || "未安排";
}

function previewBaseAssignments(session: PlaytestSession) {
  const shiftCounts = createEmptyShiftCoverage();
  let dangerReduction = 0;
  let foodGain = 0;
  let waterGain = 0;
  let objectiveGain = 0;
  let materialGain = 0;

  for (const assignment of session.room.baseAssignments) {
    const survivor = session.account.survivors.find(
      (candidate) => candidate.id === assignment.survivorId && candidate.ownerUserId === assignment.userId
    );
    if (!survivor || survivor.status === "assigned") {
      continue;
    }

    shiftCounts[assignment.type] += 1;
    const fatiguePenalty = survivor.fatigue >= 70 ? 1 : 0;
    const baseInstinctBonus = hasSurvivorPerk(survivor, "base_instinct") ? 1 : 0;

    if (assignment.type === "forage") {
      const kitchenBonus = Math.floor(facilityLevel(session, "kitchen") / 2);
      const yieldScore = Math.max(
        1,
        Math.floor((survivor.attributes.stamina + survivor.attributes.luck) / 6) - fatiguePenalty + baseInstinctBonus + kitchenBonus
      );
      foodGain += yieldScore;
      waterGain += Math.max(1, yieldScore - 1);
    }

    if (assignment.type === "repair") {
      const workshopBonus = Math.floor(facilityLevel(session, "workshop") / 2);
      const radioBonus = facilityLevel(session, "radio") >= 1 ? 1 : 0;
      const repairScore = Math.max(1, Math.floor(survivor.attributes.technical / 5) - fatiguePenalty + baseInstinctBonus + workshopBonus + radioBonus);
      objectiveGain += repairScore;
      materialGain += repairScore > 1 ? 1 : 0;
    }

    if (assignment.type === "guard") {
      const barricadeBonus = facilityLevel(session, "barricade");
      dangerReduction += Math.max(
        1,
        Math.floor((survivor.attributes.willpower + survivor.attributes.agility) / 7) - fatiguePenalty + baseInstinctBonus + barricadeBonus
      );
    }
  }

  return {
    dangerReduction,
    foodGain,
    materialGain,
    objectiveGain,
    shiftCounts,
    waterGain
  };
}

function resolveBaseDayEvent(session: PlaytestSession, nextDay: number, coverage: BaseShiftCoverage): BaseDayEventResult {
  const eventIndex = Math.max(0, nextDay - 2) % 4;
  const logs: string[] = [];

  if (eventIndex === 0) {
    const title = "围栏缺口";
    const support = coverage.guard + facilityLevel(session, "watchtower") + facilityLevel(session, "barricade");
    if (support >= 3) {
      const relief = Math.min(6, support);
      session.room.base.danger = clamp(session.room.base.danger - relief, 0, 100);
      session.room.base.morale = clamp(session.room.base.morale + 1, 0, 100);
      logs.push(`基地事件：${title}。守卫、瞭望塔视野和路障在天亮前堵住缺口。危险 -${relief}，士气 +1。`);
    } else if (support > 0) {
      session.room.base.danger = clamp(session.room.base.danger + 2, 0, 100);
      logs.push(`基地事件：${title}。值守发现得有点晚，但阻止了更糟的突破。危险 +2。`);
    } else {
      session.room.base.danger = clamp(session.room.base.danger + 8, 0, 100);
      session.room.base.morale = clamp(session.room.base.morale - 3, 0, 100);
      logs.push(`基地事件：${title}。盲侧无人看守。危险 +8，士气 -3。`);
    }
    return { logs, title };
  }

  if (eventIndex === 1) {
    const title = "库存变质";
    const support = coverage.forage + facilityLevel(session, "kitchen");
    if (support >= 2) {
      const food = 1 + Math.floor(support / 2);
      session.room.base.resources.food += food;
      session.room.base.resources.water += 1;
      logs.push(`基地事件：${title}。厨房班发现霉变，并把安全边料转成口粮。食物 +${food}，水 +1。`);
    } else if (support > 0) {
      logs.push(`基地事件：${title}。搜寻员在坏箱扩散前隔离了它。没有额外损失。`);
    } else {
      const foodLoss = spendWithShortage(session.room.base.resources, "food", 2);
      const waterLoss = spendWithShortage(session.room.base.resources, "water", 1);
      const pressure = foodLoss + waterLoss;
      session.room.base.morale = clamp(session.room.base.morale - 2 - pressure * 2, 0, 100);
      logs.push(`基地事件：${title}。一箱酸败物资污染了货架。食物 -${2 - foodLoss}/2，水 -${1 - waterLoss}/1，士气 -${2 + pressure * 2}。`);
    }
    return { logs, title };
  }

  if (eventIndex === 2) {
    const title = "医务高峰";
    const support = coverage.care + facilityLevel(session, "clinic");
    const patient = session.account.survivors
      .filter((survivor) => survivor.status !== "assigned")
      .sort((left, right) => right.fatigue + right.injuries.length * 20 - (left.fatigue + left.injuries.length * 20))[0];
    if (support >= 2) {
      if (patient) {
        const fatigueRelief = 6 + support * 2;
        patient.fatigue = clamp(patient.fatigue - fatigueRelief, 0, 100);
        if (patient.injuries.length > 0) {
          patient.injuries = patient.injuries.slice(1);
        }
        patient.status = patient.injuries.length > 0 ? "recovering" : "available";
        logs.push(`基地事件：${title}。医务覆盖稳定了 ${patient.name}。疲劳 -${fatigueRelief}，若有伤病则清除 1 个。`);
      } else {
        session.room.base.resources.medicine += 1;
        logs.push(`基地事件：${title}。医务室难得安静，重新整理了野外药包。药品 +1。`);
      }
    } else if (support > 0) {
      session.room.base.resources.medicine += 1;
      logs.push(`基地事件：${title}。一名护理员维持队列，省下可用药品。药品 +1。`);
    } else {
      const shortage = spendWithShortage(session.room.base.resources, "medicine", 1);
      if (patient) {
        patient.fatigue = clamp(patient.fatigue + 6, 0, 100);
      }
      session.room.base.morale = clamp(session.room.base.morale - (shortage > 0 ? 4 : 2), 0, 100);
      logs.push(`基地事件：${title}。没有护理班准备好。药品 -${1 - shortage}/1${patient ? `，${patient.name} 疲劳 +6` : ""}，士气 -${shortage > 0 ? 4 : 2}。`);
    }
    return { logs, title };
  }

  const title = "信号窗口";
  const support = coverage.repair + facilityLevel(session, "radio") + Math.floor(facilityLevel(session, "workshop") / 2);
  if (support >= 2) {
    const objective = Math.min(2, Math.max(1, Math.floor(support / 2)));
    session.room.base.objective.repairedParts = Math.min(
      session.room.base.objective.requiredParts,
      session.room.base.objective.repairedParts + objective
    );
    session.room.base.resources.materials += 1;
    logs.push(`基地事件：${title}。房间捕捉到一次干净的塔台回波，并快速行动。目标 +${objective}，材料 +1。`);
  } else if (support > 0) {
    session.room.base.objective.repairedParts = Math.min(session.room.base.objective.requiredParts, session.room.base.objective.repairedParts + 1);
    logs.push(`基地事件：${title}。粗糙信号仍给修理队一条可用塔台笔记。目标 +1。`);
  } else {
    session.room.base.danger = clamp(session.room.base.danger + 3, 0, 100);
    logs.push(`基地事件：${title}。塔台在无人应答的频段里咔哒作响。危险 +3。`);
  }
  return { logs, title };
}

function resolveBaseAssignments(session: PlaytestSession) {
  const logs: string[] = [];
  let dangerReduction = 0;
  const coverage = createEmptyShiftCoverage();

  for (const assignment of session.room.baseAssignments) {
    const survivor = session.account.survivors.find(
      (candidate) => candidate.id === assignment.survivorId && candidate.ownerUserId === assignment.userId
    );
    if (!survivor || survivor.status === "assigned") {
      continue;
    }
    coverage[assignment.type] += 1;

    const fatiguePenalty = survivor.fatigue >= 70 ? 1 : 0;
    const baseInstinctBonus = hasSurvivorPerk(survivor, "base_instinct") ? 1 : 0;
    if (assignment.type === "forage") {
      const kitchenBonus = Math.floor(facilityLevel(session, "kitchen") / 2);
      const yieldScore = Math.max(
        1,
        Math.floor((survivor.attributes.stamina + survivor.attributes.luck) / 6) - fatiguePenalty + baseInstinctBonus + kitchenBonus
      );
      session.room.base.resources.food += yieldScore;
      session.room.base.resources.water += Math.max(1, yieldScore - 1);
      survivor.fatigue = clamp(survivor.fatigue + 6, 0, 100);
      logs.push(
        `${survivor.name} 执行搜寻：食物 +${yieldScore}，水 +${Math.max(1, yieldScore - 1)}，疲劳 +6${
          kitchenBonus > 0 ? `，厨房加成 +${kitchenBonus}` : ""
        }。`
      );
    }

    if (assignment.type === "repair") {
      const workshopBonus = Math.floor(facilityLevel(session, "workshop") / 2);
      const radioBonus = facilityLevel(session, "radio") >= 1 ? 1 : 0;
      const repairScore = Math.max(1, Math.floor(survivor.attributes.technical / 5) - fatiguePenalty + baseInstinctBonus + workshopBonus + radioBonus);
      session.room.base.objective.repairedParts = Math.min(
        session.room.base.objective.requiredParts,
        session.room.base.objective.repairedParts + repairScore
      );
      session.room.base.resources.materials += repairScore > 1 ? 1 : 0;
      survivor.fatigue = clamp(survivor.fatigue + 5, 0, 100);
      logs.push(
        `${survivor.name} 修理通讯塔：目标 +${repairScore}${repairScore > 1 ? "，材料 +1" : ""}，疲劳 +5${
          workshopBonus + radioBonus > 0 ? `，设施加成 +${workshopBonus + radioBonus}` : ""
        }。`
      );
    }

    if (assignment.type === "guard") {
      const barricadeBonus = facilityLevel(session, "barricade");
      const guardScore = Math.max(
        1,
        Math.floor((survivor.attributes.willpower + survivor.attributes.agility) / 7) - fatiguePenalty + baseInstinctBonus + barricadeBonus
      );
      dangerReduction += guardScore;
      survivor.fatigue = clamp(survivor.fatigue + 4, 0, 100);
      logs.push(`${survivor.name} 执行守卫：危险压力 -${guardScore}，疲劳 +4${barricadeBonus > 0 ? `，路障 +${barricadeBonus}` : ""}。`);
    }

    if (assignment.type === "care") {
      const healScore = careHealScore(session, survivor);
      const patient = recoveryPrioritySurvivors(session, new Set([survivor.id]))[0];
      if (patient) {
        patient.fatigue = clamp(patient.fatigue - healScore, 0, 100);
        if (patient.injuries.length > 0 && healScore >= 10) {
          patient.injuries = patient.injuries.slice(1);
        }
        patient.status = patient.injuries.length > 0 ? "recovering" : "available";
        logs.push(`${survivor.name} 执行护理：${patient.name} 疲劳 -${healScore}${healScore >= 10 ? "，若有伤病则清除 1 个" : ""}。`);
      } else {
        logs.push(`${survivor.name} 执行护理，但当前没有需要处理的患者。`);
      }
      survivor.fatigue = clamp(survivor.fatigue + 3, 0, 100);
    }
  }

  if (logs.length === 0) {
    logs.push("基地班次：无人分配，基地只处理基础维持。");
  }

  return {
    coverage,
    dangerReduction,
    logs
  };
}

function careHealScore(session: PlaytestSession, survivor: PlaytestSession["account"]["survivors"][number]): number {
  const baseInstinctBonus = hasSurvivorPerk(survivor, "base_instinct") ? 1 : 0;
  return Math.max(6, survivor.attributes.medical + facilityLevel(session, "clinic") * 2 + baseInstinctBonus * 3);
}

function developmentProjectScore(facilityId: string, category: string, action: "Build" | "Upgrade" | "Maxed", canAfford: boolean): number {
  if (action === "Maxed") {
    return 0;
  }

  const categoryScore: Record<string, number> = {
    core: 4,
    expedition: 7,
    survival: 6,
    utility: 7
  };
  const focusScore: Record<string, number> = {
    kitchen: 3,
    radio: 3,
    training: 3,
    workshop: 4,
    barricade: 2,
    clinic: 1,
    dorm: 1,
    generator: 1,
    watchtower: 1
  };

  return (categoryScore[category] ?? 4) + (focusScore[facilityId] ?? 0) + (action === "Build" ? 3 : 0) + (canAfford ? 2 : -1);
}

function facilityDevelopmentImpact(facilityId: string): { base: string; expedition: string } {
  const impacts: Record<string, { base: string; expedition: string }> = {
    barricade: {
      base: "降低危险，并让守卫班更强。",
      expedition: "强化防守、稳固路线和撤离回避选择。"
    },
    clinic: {
      base: "提升护理班、疲劳恢复和伤病清除。",
      expedition: "强化包扎行动、医疗战利和野外治疗。"
    },
    dorm: {
      base: "提升每日疲劳恢复，让队伍更可持续。",
      expedition: "提高队伍耐力，并提升营地休整价值。"
    },
    generator: {
      base: "保持供电系统在线，并支撑弹药准备。",
      expedition: "提升弹药伤害，并可能增加开局弹药。"
    },
    kitchen: {
      base: "降低日结时的食物和饮水压力。",
      expedition: "强化营地餐食、商店口粮和路线补给。"
    },
    radio: {
      base: "改善目标修复窗口和基地协同。",
      expedition: "强化减压、路线情报、营地侦察和商店情报。"
    },
    training: {
      base: "提供长期战斗成长轨道。",
      expedition: "提升耐力、背包容量和开局战斗演练。"
    },
    watchtower: {
      base: "降低每日危险，并帮助守卫更早发现问题。",
      expedition: "强化减压、路线搜索、强行推进和回避。"
    },
    workshop: {
      base: "强化修理班，并把高效修理转成材料。",
      expedition: "强化弹药伤害、拆解、商店服务和开局暴露。"
    }
  };

  return impacts[facilityId] ?? {
    base: "改善基地运转。",
    expedition: "改善出征支援。"
  };
}

function recoveryPriorityPatients(session: PlaytestSession, excludedIds: Set<string>): BaseRecoveryPatientPreview[] {
  return recoveryPrioritySurvivors(session, excludedIds)
    .slice(0, 3)
    .map((survivor) => ({
      fatigue: survivor.fatigue,
      injuries: survivor.injuries.length,
      name: survivor.name,
      status: survivor.status
    }));
}

function recoveryPrioritySurvivors(session: PlaytestSession, excludedIds: Set<string>): PlaytestSession["account"]["survivors"] {
  return session.account.survivors
    .filter((candidate) => !excludedIds.has(candidate.id) && candidate.status !== "assigned")
    .sort((left, right) => right.fatigue + right.injuries.length * 20 - (left.fatigue + left.injuries.length * 20));
}

function recoverSurvivors(session: PlaytestSession, recovery: number): number {
  let count = 0;
  for (const survivor of session.account.survivors) {
    if (survivor.status === "assigned") {
      continue;
    }

    const injuryPenalty = survivor.injuries.length * 4;
    const actualRecovery = Math.max(1, recovery - injuryPenalty);
    const before = survivor.fatigue;
    survivor.fatigue = clamp(survivor.fatigue - actualRecovery, 0, 100);
    survivor.status = survivor.injuries.length > 0 ? "recovering" : "available";
    if (survivor.fatigue < before) {
      count += 1;
    }
  }

  return count;
}

function refreshUiState(session: PlaytestSession) {
  session.uiState = roomToGameState(session.room, session.account.survivors);
}

function clone<T>(value: T): T {
  return structuredClone(value) as T;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
