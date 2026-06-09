import { resolveExpedition } from "../game/sim";
import type { ExpeditionReport, ExpeditionRequest, ResourceBundle, ResourceKey } from "../game/types";
import { facilityActionCost, facilityActionLabel, facilityBaseEffect, isFacilityBuilt, isFacilityMaxed } from "../game/facilities";
import {
  advanceSurvivorExperience,
  expeditionXpGain,
  hasSurvivorPerk,
  isSurvivorAtLevelCap,
  survivorLevelCap,
  xpForNextLevel,
  type SurvivorAdvancement
} from "./progression";
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

export type AccountGrowthBoundary = {
  baseCapLabel: string;
  cappedSurvivors: number;
  maxedRooms: number;
  nearLevelSurvivors: number;
  nextAction: string;
  remainingRoomUpgrades: number;
  summary: string;
  survivorCapLabel: string;
  survivorProgressLabel: string;
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

export function accountGrowthBoundary(account: AccountState): AccountGrowthBoundary {
  const plan = accountBaseDevelopmentPlan(account);
  const currentRoomLevelTotal = accountBaseFacilities.reduce((sum, facility) => sum + account.base[facility.key], 0);
  const roomLevelCapTotal = accountBaseFacilities.length * accountBaseLevelCap;
  const remainingRoomUpgrades = Math.max(0, roomLevelCapTotal - currentRoomLevelTotal);
  const maxedRooms = plan.projects.filter((project) => project.status === "maxed").length;
  const cappedSurvivors = account.survivors.filter(isSurvivorAtLevelCap).length;
  const nearLevelSurvivors = account.survivors.filter((survivor) => {
    if (isSurvivorAtLevelCap(survivor)) {
      return false;
    }

    return xpForNextLevel(survivor) - survivor.xp <= 10;
  }).length;

  return {
    baseCapLabel: `${currentRoomLevelTotal}/${roomLevelCapTotal} 房间等级，剩余 ${remainingRoomUpgrades} 级`,
    cappedSurvivors,
    maxedRooms,
    nearLevelSurvivors,
    nextAction: accountGrowthNextAction(plan, nearLevelSurvivors, remainingRoomUpgrades),
    remainingRoomUpgrades,
    summary: `成长上限：幸存者最高 Lv.${survivorLevelCap}，个人基地房间最高 Lv.${accountBaseLevelCap}。`,
    survivorCapLabel: `幸存者最高 Lv.${survivorLevelCap}`,
    survivorProgressLabel: `${cappedSurvivors}/${account.survivors.length} 名到顶，${nearLevelSurvivors} 名接近升级`
  };
}

function accountGrowthNextAction(plan: AccountBaseDevelopmentPlan, nearLevelSurvivors: number, remainingRoomUpgrades: number) {
  if (plan.affordableCount > 0) {
    return `可立即升级 ${plan.affordableCount} 个个人基地房间，优先补出征短板。`;
  }

  if (nearLevelSurvivors > 0) {
    return `${nearLevelSurvivors} 名幸存者接近升级，安排完整撤离收益最高。`;
  }

  if (remainingRoomUpgrades > 0) {
    return "继续远征回收材料、稀有零件和情报，推进个人基地。";
  }

  return "账号纵向成长已接近上限，改用轮换编队和房间协作追求更稳路线。";
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

function baseTaskShortLabel(id: BaseTaskItem["id"]) {
  const labels: Record<BaseTaskItem["id"], string> = {
    development: "建设",
    expedition: "远征",
    objective: "目标",
    recovery: "恢复",
    shifts: "班次",
    supplies: "补给"
  };
  return labels[id];
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
  return /路线决策|紧急返程|提前截断路线|提前撤离|撤离：|呼叫基地接应|保住已入袋/.test(line);
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

const baseDayEventTitles = ["围栏缺口", "库存变质", "医务高峰", "信号窗口", "净水滤芯堵塞", "夜间求救信号"] as const;

export function baseDayEventBreadth() {
  return {
    count: baseDayEventTitles.length,
    titles: [...baseDayEventTitles]
  };
}

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
  immediateTreatments: number;
  injuredCount: number;
  likelyInjuryClears: number;
  medicineAvailable: number;
  medicineShortage: number;
  nextAction: string;
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
  expeditionStage: string;
  id: string;
  level: number;
  materialDeficit: number;
  name: string;
  nextLevel: number;
  priority: number;
  reason: string;
  nextStep: string;
};

export type BaseDevelopmentPlan = {
  affordableCount: number;
  blockedCount: number;
  materials: number;
  projects: BaseDevelopmentProjectPreview[];
  recommended: BaseDevelopmentProjectPreview[];
  summary: string;
};

export type BaseDevelopmentRouteStep = {
  detail: string;
  id: string;
  impact: string;
  label: string;
  nextAction: string;
  status: "ready" | "blocked" | "complete";
  title: string;
};

export type BaseDevelopmentRoute = {
  blockedCount: number;
  materialGap: number;
  readyCount: number;
  steps: BaseDevelopmentRouteStep[];
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

export type BaseShiftPlanItem = {
  assigned: number;
  detail: string;
  effect: string;
  id: BaseWorkType;
  label: string;
  nextAction: string;
  status: "urgent" | "todo" | "ready";
};

export type BaseShiftPlan = {
  items: BaseShiftPlanItem[];
  summary: string;
};

export type RoomMemberSummary = {
  assignedCount: number;
  baseShiftText: string;
  collaborationHint: string;
  collaborationStatus: "ready" | "todo" | "urgent";
  contributionCount: number;
  contributionText: string;
  displayName: string;
  lastSeenAt: string;
  roleLabel: string;
  userId: string;
};

export type RoomCooperationSummary = {
  actionHint: string;
  assignedSurvivors: number;
  baseShifts: number;
  contributionCount: number;
  gaps: Array<{
    id: BaseTaskItem["id"];
    label: string;
    status: BaseTaskStatus;
    text: string;
  }>;
  headline: string;
  memberCount: number;
  nextNeed: string;
  readiness: "blocked" | "building" | "ready";
};

export type RoomPlaytestReadinessItem = {
  detail: string;
  id: "invite" | "contribution" | "squad" | "shifts" | "expedition";
  label: string;
  status: "blocked" | "todo" | "ready";
};

export type RoomPlaytestReadiness = {
  headline: string;
  items: RoomPlaytestReadinessItem[];
  nextAction: string;
  readyCount: number;
  status: "blocked" | "building" | "ready";
  summary: string;
};

export type RoomCooperationPulseItem = {
  detail: string;
  id: "members" | "contribution" | "squad" | "shifts";
  label: string;
  status: "blocked" | "todo" | "ready";
  value: string;
};

export type RoomCooperationPulse = {
  headline: string;
  items: RoomCooperationPulseItem[];
  nextAction: string;
  summary: string;
  tone: "blocked" | "building" | "ready";
};

export type RoomContributionPlanItem = {
  detail: string;
  key: ResourceKey;
  label: string;
  priority: "urgent" | "todo" | "ready";
  target: number;
};

export type RoomContributionPlan = {
  items: RoomContributionPlanItem[];
  summary: string;
};

export type BaseTaskStatus = "urgent" | "todo" | "ready";

export type BaseTaskItem = {
  actionLabel: string;
  body: string;
  id: "supplies" | "recovery" | "shifts" | "development" | "objective" | "expedition";
  status: BaseTaskStatus;
  title: string;
};

export type BaseTaskList = {
  items: BaseTaskItem[];
  summary: string;
};

export type BaseCommandBriefingItem = {
  actionLabel: string;
  body: string;
  detail: string;
  id: BaseTaskItem["id"];
  label: string;
  status: BaseTaskStatus;
  title: string;
};

export type BaseCommandBriefing = {
  headline: string;
  items: BaseCommandBriefingItem[];
  phase: "recover" | "build" | "deploy" | "resolve";
  primaryTaskId: BaseTaskItem["id"];
  readiness: BaseTaskStatus;
  summary: string;
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
        collaborationHint: roomMemberCollaborationHint(contributionCount, assignedCount, shiftCounts),
        collaborationStatus: roomMemberCollaborationStatus(contributionCount, assignedCount, shiftCounts),
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

function roomMemberCollaborationHint(contributionCount: number, assignedCount: number, shiftCounts: BaseShiftCoverage) {
  const shiftCount = Object.values(shiftCounts).reduce((sum, count) => sum + count, 0);
  if (contributionCount === 0) {
    return "先捐入一批口粮、水或材料，让房间基地有操作空间。";
  }

  if (assignedCount === 0) {
    return "派 1 名幸存者进入远征编队，补足下一次出征人数。";
  }

  if (shiftCount === 0) {
    return "安排 1 名留守幸存者执行守卫、护理、修理或搜寻班。";
  }

  return "捐入、编队和留守都已覆盖，可以等待队友补缺或准备远征。";
}

function roomMemberCollaborationStatus(
  contributionCount: number,
  assignedCount: number,
  shiftCounts: BaseShiftCoverage
): RoomMemberSummary["collaborationStatus"] {
  const shiftCount = Object.values(shiftCounts).reduce((sum, count) => sum + count, 0);
  if (contributionCount === 0) {
    return "urgent";
  }

  if (assignedCount === 0 || shiftCount === 0) {
    return "todo";
  }

  return "ready";
}

function contributionPriorityScore(item: RoomContributionPlanItem) {
  const scores: Record<RoomContributionPlanItem["priority"], number> = {
    urgent: 0,
    todo: 1,
    ready: 2
  };
  return scores[item.priority];
}

export function roomCooperationSummary(session: PlaytestSession): RoomCooperationSummary {
  const memberCount = session.room.members.length;
  const contributionCount = session.room.contributions.length;
  const assignedSurvivors = session.room.assignedSurvivors.length;
  const baseShifts = session.room.baseAssignments.length;
  const tasks = baseTaskList(session);
  const primaryTask = tasks.items[0];
  const urgentCount = tasks.items.filter((task) => task.status === "urgent").length;
  const gaps = tasks.items.slice(0, 3).map((task) => ({
    id: task.id,
    label: task.title,
    status: task.status,
    text: task.body
  }));
  const readiness: RoomCooperationSummary["readiness"] =
    primaryTask.id === "expedition" ? "ready" : urgentCount > 0 ? "blocked" : "building";
  const actionHint =
    primaryTask.id === "supplies"
      ? "请队友优先捐入口粮和饮水，或安排搜寻班。"
      : primaryTask.id === "recovery"
        ? "请有空的幸存者转护理班，先处理战后伤病。"
        : primaryTask.id === "shifts"
          ? "每名成员至少安排一个基地班次，避免日结空转。"
          : primaryTask.id === "development"
            ? "材料足够时先推进推荐设施，让下一次出征更稳。"
            : primaryTask.id === "objective"
              ? "房间目标已结算，创建新房间开始下一局。"
              : "房间已经可以准备出征，确认编队和补给。";

  return {
    actionHint,
    assignedSurvivors,
    baseShifts,
    contributionCount,
    gaps,
    headline:
      readiness === "ready"
        ? "房间已经可以准备下一次远征。"
        : readiness === "blocked"
          ? `房间还有 ${urgentCount} 个紧急缺口。`
          : "房间正在补齐建设和班次。",
    memberCount,
    nextNeed: primaryTask.title,
    readiness
  };
}

export function roomPlaytestReadiness(session: PlaytestSession): RoomPlaytestReadiness {
  const cooperation = roomCooperationSummary(session);
  const contributionPlan = roomContributionPlan(session);
  const canLaunch = cooperation.readiness === "ready";
  const items: RoomPlaytestReadinessItem[] = [
    {
      detail:
        cooperation.memberCount >= 2
          ? `${cooperation.memberCount} 名成员已在房间，可以分工建设和出征。`
          : "先复制邀请链接，让至少 1 位好友进入同一个房间。",
      id: "invite",
      label: "邀请好友",
      status: cooperation.memberCount >= 2 ? "ready" : "todo"
    },
    {
      detail:
        cooperation.contributionCount > 0
          ? `${cooperation.contributionCount} 次捐入已进入共享基地。`
          : contributionPlan.summary,
      id: "contribution",
      label: "共享库存",
      status: contributionPlan.items.some((item) => item.priority === "urgent")
        ? "blocked"
        : cooperation.contributionCount > 0
          ? "ready"
          : "todo"
    },
    {
      detail:
        cooperation.assignedSurvivors >= 3
          ? `远征编队已有 ${cooperation.assignedSurvivors} 名幸存者。`
          : `还需要 ${Math.max(0, 3 - cooperation.assignedSurvivors)} 名幸存者加入远征编队。`,
      id: "squad",
      label: "远征编队",
      status: cooperation.assignedSurvivors >= 3 ? "ready" : "blocked"
    },
    {
      detail:
        cooperation.baseShifts > 0
          ? `${cooperation.baseShifts} 个留守班次正在支撑基地。`
          : "至少安排 1 个搜寻、修理、守卫或护理班，避免基地空转。",
      id: "shifts",
      label: "留守班次",
      status: cooperation.baseShifts > 0 ? "ready" : "todo"
    },
    {
      detail: canLaunch ? "房间可以进入出征准备，确认地点、补给和风险策略。" : cooperation.actionHint,
      id: "expedition",
      label: "开局远征",
      status: canLaunch ? "ready" : cooperation.readiness === "blocked" ? "blocked" : "todo"
    }
  ];
  const readyCount = items.filter((item) => item.status === "ready").length;
  const blockedCount = items.filter((item) => item.status === "blocked").length;
  const status: RoomPlaytestReadiness["status"] =
    canLaunch && readyCount >= 4 ? "ready" : blockedCount > 0 ? "blocked" : "building";

  return {
    headline:
      status === "ready"
        ? "房间已经具备多人试玩开局条件。"
        : status === "blocked"
          ? "房间还有关键开局项未补齐。"
          : "房间正在接近可试玩状态。",
    items,
    nextAction: roomPlaytestNextAction(items),
    readyCount,
    status,
    summary: `开局检查 ${readyCount}/${items.length} 项就绪。`
  };
}

export function roomCooperationPulse(session: PlaytestSession): RoomCooperationPulse {
  const cooperation = roomCooperationSummary(session);
  const readiness = roomPlaytestReadiness(session);
  const members = roomMemberSummaries(session);
  const membersReady = members.filter((member) => member.collaborationStatus === "ready").length;
  const items: RoomCooperationPulseItem[] = [
    {
      detail:
        cooperation.memberCount >= 2
          ? `${cooperation.memberCount} 名成员在同一房间，可以分工建设和远征。`
          : "先复制邀请链接，让至少 1 位好友进入同一房间。",
      id: "members",
      label: "成员",
      status: cooperation.memberCount >= 2 ? "ready" : "todo",
      value: `${cooperation.memberCount} 人`
    },
    {
      detail:
        cooperation.contributionCount > 0
          ? `已有 ${cooperation.contributionCount} 次捐入进入共享基地。`
          : "共享库存还没有贡献，先捐入口粮、水或材料。",
      id: "contribution",
      label: "共享库存",
      status: cooperation.contributionCount > 0 ? "ready" : "blocked",
      value: `${cooperation.contributionCount} 次`
    },
    {
      detail:
        cooperation.assignedSurvivors >= 3
          ? `远征编队已有 ${cooperation.assignedSurvivors} 名幸存者。`
          : `还差 ${Math.max(0, 3 - cooperation.assignedSurvivors)} 名幸存者才能稳定出征。`,
      id: "squad",
      label: "远征编队",
      status: cooperation.assignedSurvivors >= 3 ? "ready" : "blocked",
      value: `${cooperation.assignedSurvivors}/3`
    },
    {
      detail:
        cooperation.baseShifts > 0
          ? `${cooperation.baseShifts} 个留守班次会支撑下一次日结。`
          : "还没有留守班次，日结会缺少搜寻、修理、守卫或护理收益。",
      id: "shifts",
      label: "留守班次",
      status: cooperation.baseShifts > 0 ? "ready" : "todo",
      value: `${cooperation.baseShifts} 个`
    }
  ];
  const blockedCount = items.filter((item) => item.status === "blocked").length;
  const readyCount = items.filter((item) => item.status === "ready").length;

  return {
    headline:
      readiness.status === "ready"
        ? "好友房间已经可以一起开局远征。"
        : blockedCount > 0
          ? `好友房间还有 ${blockedCount} 个关键协作缺口。`
          : "好友房间正在补齐协作准备。",
    items,
    nextAction: readiness.nextAction,
    summary: `成员完成度 ${membersReady}/${Math.max(1, members.length)}，房间准备 ${readyCount}/${items.length}。${cooperation.actionHint}`,
    tone: readiness.status
  };
}

function roomPlaytestNextAction(items: RoomPlaytestReadinessItem[]) {
  const blocked = items.find((item) => item.status === "blocked");
  if (blocked) {
    return `优先处理：${blocked.label}。${blocked.detail}`;
  }

  const todo = items.find((item) => item.status === "todo");
  if (todo) {
    return `下一步：${todo.label}。${todo.detail}`;
  }

  return "可以进入远征准备，开始一次完整多人试玩。";
}

export function roomContributionPlan(session: PlaytestSession): RoomContributionPlan {
  const day = baseDayPreview(session);
  const recovery = baseRecoveryPlan(session);
  const development = baseDevelopmentPlan(session);
  const items: RoomContributionPlanItem[] = [];

  if (day.foodShortage > 0) {
    items.push({
      detail: `明日预计缺食物 ${day.foodShortage}，优先保证成员消耗。`,
      key: "food",
      label: "补足食物",
      priority: "urgent",
      target: day.foodShortage
    });
  }

  if (day.waterShortage > 0) {
    items.push({
      detail: `明日预计缺饮水 ${day.waterShortage}，否则危险和士气会承压。`,
      key: "water",
      label: "补足饮水",
      priority: "urgent",
      target: day.waterShortage
    });
  }

  if (recovery.medicineShortage > 0) {
    items.push({
      detail: `还有 ${recovery.medicineShortage} 名优先伤员缺药品处理。`,
      key: "medicine",
      label: "补治疗药品",
      priority: "urgent",
      target: recovery.medicineShortage
    });
  }

  const affordableProject = development.recommended.find((project) => project.action !== "Maxed");
  if (affordableProject) {
    const materialNeed = Math.max(0, affordableProject.cost - session.room.base.resources.materials);
    items.push({
      detail:
        materialNeed > 0
          ? `${affordableProject.name} 还差 ${materialNeed} 材料，建成后会改善基地和出征。`
          : `${affordableProject.name} 已可推进，材料可继续储备用于下一次升级。`,
      key: "materials",
      label: "推进设施材料",
      priority: materialNeed > 0 ? "todo" : "ready",
      target: materialNeed || Math.max(1, Math.ceil(affordableProject.cost / 2))
    });
  }

  if (session.room.base.resources.ammo < 2) {
    items.push({
      detail: "下一次遭遇战缺少弹药余量，建议至少储备 2。",
      key: "ammo",
      label: "准备战斗弹药",
      priority: "todo",
      target: Math.max(1, 2 - session.room.base.resources.ammo)
    });
  }

  const sorted = items.sort((left, right) => contributionPriorityScore(left) - contributionPriorityScore(right)).slice(0, 3);

  return {
    items: sorted,
    summary:
      sorted.length > 0
        ? `捐入优先级：${sorted.map((item) => `${item.label} ${item.target}`).join(" / ")}。`
        : "房间库存暂时可控，可以把资源留给下一轮设施或出征准备。"
  };
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
  const medicineAvailable = session.room.base.resources.medicine;
  const immediatePatientCount = priorityPatients.filter((patient) => patient.injuries > 0).length;
  const immediateTreatments = Math.min(medicineAvailable, immediatePatientCount);
  const medicineShortage = Math.max(0, immediatePatientCount - medicineAvailable);
  const likelyInjuryClears = Math.min(
    priorityPatients.filter((patient) => patient.injuries > 0).length,
    injuryClearCapacity
  );
  const nextAction =
    injuredCount === 0 && recoveringCount === 0
      ? "队伍状态稳定，可以把班次转向搜寻、守卫或修理。"
      : immediateTreatments > 0
        ? `先手动治疗 ${priorityPatients.find((patient) => patient.injuries > 0)?.name ?? "伤员"}，再安排护理班过夜。`
        : medicineShortage > 0
          ? `药品不足 ${medicineShortage}，先补药品或安排护理班压住疲劳。`
          : careWorkers.length > 0
            ? "护理班已安排，可以结束当天等待恢复结算。"
            : "先安排护理班，否则伤病会拖慢下一次出征。";

  return {
    careShifts: careWorkers.length,
    clinicLevel,
    dailyRecovery,
    dormLevel,
    immediateTreatments,
    injuredCount,
    likelyInjuryClears,
    medicineAvailable,
    medicineShortage,
    nextAction,
    priorityPatients,
    recoveringCount,
    summary: `${careWorkers.length} 个护理班，立即可治疗 ${immediateTreatments} 人，预计清除 ${likelyInjuryClears} 个伤病，基础疲劳恢复 -${dailyRecovery}。`
  };
}

export function baseDevelopmentPlan(session: PlaytestSession): BaseDevelopmentPlan {
  const materials = session.room.base.resources.materials;
  const projects = session.room.base.facilities.map((facility) => {
    const action = facilityActionLabel(facility);
    const cost = facilityActionCost(facility);
    const nextLevel = action === "Maxed" ? facility.level : isFacilityBuilt(facility) ? facility.level + 1 : 1;
    const canAfford = action !== "Maxed" && materials >= cost;
    const impact = facilityDevelopmentImpact(facility.id);
    return {
      action,
      baseImpact: impact.base,
      canAfford,
      category: facility.category ?? "core",
      cost,
      expeditionImpact: impact.expedition,
      expeditionStage: facilityExpeditionStage(facility.id),
      id: facility.id,
      level: facility.level,
      materialDeficit: Math.max(0, cost - materials),
      name: facility.name,
      nextLevel,
      nextStep: facilityDevelopmentNextStep(facility.name, action, canAfford, Math.max(0, cost - materials)),
      priority: developmentProjectScore(facility.id, facility.category ?? "core", action, canAfford),
      reason: facilityDevelopmentReason(session, facility.id)
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

export function baseDevelopmentRoute(session: PlaytestSession): BaseDevelopmentRoute {
  const plan = baseDevelopmentPlan(session);
  const steps: BaseDevelopmentRouteStep[] = plan.recommended.map((project, index) => {
    const status = project.canAfford ? "ready" : "blocked";
    return {
      detail: project.canAfford
        ? `${project.name} 已可推进，消耗 ${project.cost} 材料后接入${project.expeditionStage}。`
        : `${project.name} 还缺 ${project.materialDeficit} 材料；先通过搜寻、捐入或出征战利补齐。`,
      id: project.id,
      impact: `基地：${project.baseImpact} / 出征：${project.expeditionImpact}`,
      label: `第 ${index + 1} 步`,
      nextAction: project.nextStep,
      status,
      title: `${project.name} ${project.action === "Build" ? "建造" : "升级"}到 Lv.${project.nextLevel}`
    } satisfies BaseDevelopmentRouteStep;
  });

  if (steps.length === 0) {
    steps.push({
      detail: "当前房间设施已经到达阶段上限，可以把资源转向出征、恢复和个人基地成长。",
      id: "complete",
      impact: "基地：日结稳定 / 出征：后勤线完整",
      label: "路线完成",
      nextAction: "开始更高风险的远征，或创建新房间继续协作建设。",
      status: "complete",
      title: "设施路线已完成"
    });
  }

  const readyCount = steps.filter((step) => step.status === "ready").length;
  const blockedCount = steps.filter((step) => step.status === "blocked").length;
  const materialGap = plan.recommended.reduce((sum, project) => sum + project.materialDeficit, 0);

  return {
    blockedCount,
    materialGap,
    readyCount,
    steps,
    summary:
      materialGap > 0
        ? `建设路线：${readyCount} 项可立即推进，推荐队列仍缺 ${materialGap} 材料。`
        : readyCount > 0
          ? `建设路线：${readyCount} 项已满足材料，优先推进能接入出征的设施。`
          : "建设路线已完成，当前资源可转向出征和恢复。"
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

export function baseShiftPlan(session: PlaytestSession): BaseShiftPlan {
  const day = baseDayPreview(session);
  const recovery = baseRecoveryPlan(session);
  const shifts = day.shiftCounts;
  const objectiveRemaining = Math.max(0, session.room.base.objective.requiredParts - day.objectiveProjected);
  const supplyShortage = day.foodShortage + day.waterShortage;
  const dangerAfterDay = clamp(session.room.base.danger + day.dangerDelta, 0, 100);

  const items: BaseShiftPlanItem[] = [
    {
      assigned: shifts.forage,
      detail:
        shifts.forage > 0
          ? day.forageSummary
          : supplyShortage > 0
            ? `明日仍缺食物 ${day.foodShortage} / 饮水 ${day.waterShortage}，优先安排搜寻或捐入库存。`
            : "口粮压力可控，搜寻班可以继续垫高后续出征补给。",
      effect: shifts.forage > 0 ? "补给进账" : supplyShortage > 0 ? "缺口未覆盖" : "补给储备",
      id: "forage",
      label: "搜寻补给",
      nextAction: shifts.forage > 0 ? "保留搜寻班，日结后补入口粮。" : "派高体能或幸运的幸存者去搜寻。",
      status: supplyShortage > 0 && shifts.forage === 0 ? "urgent" : shifts.forage > 0 ? "ready" : "todo"
    },
    {
      assigned: shifts.repair,
      detail:
        shifts.repair > 0
          ? day.repairSummary
          : objectiveRemaining > 0
            ? `目标还差 ${objectiveRemaining} 进度，修理班会推进房间胜利条件。`
            : "房间目标已接近完成，修理班可转向材料和设施准备。",
      effect: shifts.repair > 0 ? `目标 ${day.objectiveProjected}/${session.room.base.objective.requiredParts}` : "目标停滞",
      id: "repair",
      label: "修理目标",
      nextAction: shifts.repair > 0 ? "保留修理班，争取缩短房间目标天数。" : "派技术最高的幸存者修理目标。",
      status: objectiveRemaining > 0 && shifts.repair === 0 ? "todo" : shifts.repair > 0 ? "ready" : "todo"
    },
    {
      assigned: shifts.guard,
      detail:
        shifts.guard > 0
          ? day.guardSummary
          : dangerAfterDay >= 25
            ? `日结后危险可能到 ${dangerAfterDay}，无人守卫会让事件更疼。`
            : "危险暂时可控，但守卫班能减少夜间突发损失。",
      effect: shifts.guard > 0 ? `危险 ${formatSignedNumber(day.dangerDelta)}` : "防线空缺",
      id: "guard",
      label: "守卫防线",
      nextAction: shifts.guard > 0 ? "守卫班已覆盖，日结风险会更低。" : "派意志或敏捷高的人守卫。",
      status: dangerAfterDay >= 25 && shifts.guard === 0 ? "urgent" : shifts.guard > 0 ? "ready" : "todo"
    },
    {
      assigned: shifts.care,
      detail:
        shifts.care > 0
          ? recovery.summary
          : recovery.injuredCount > 0 || recovery.recoveringCount > 0
            ? `${recovery.injuredCount} 名伤员，${recovery.recoveringCount} 人恢复中；无人护理会拖慢下一次出征。`
            : "队伍状态稳定，护理班可以让疲劳恢复更稳。",
      effect: shifts.care > 0 ? `预计清除 ${recovery.likelyInjuryClears} 处伤病` : "恢复放缓",
      id: "care",
      label: "护理恢复",
      nextAction: shifts.care > 0 ? "护理班已安排，日结后处理恢复。" : "派医疗最高的人护理伤员。",
      status:
        (recovery.injuredCount > 0 || recovery.recoveringCount > 0) && shifts.care === 0
          ? "urgent"
          : shifts.care > 0
            ? "ready"
            : "todo"
    }
  ];
  const urgentCount = items.filter((item) => item.status === "urgent").length;
  const readyCount = items.filter((item) => item.status === "ready").length;

  return {
    items,
    summary:
      urgentCount > 0
        ? `还有 ${urgentCount} 个基地缺口需要补班；已覆盖 ${readyCount} 条班次。`
        : readyCount > 0
          ? `今日基地班次已覆盖 ${readyCount} 条，可以日结或继续微调。`
          : "还没有安排基地班次；先决定今天要补给、修理、防线还是恢复。"
  };
}

export function baseTaskList(session: PlaytestSession): BaseTaskList {
  const day = baseDayPreview(session);
  const recovery = baseRecoveryPlan(session);
  const development = baseDevelopmentPlan(session);
  const items: BaseTaskItem[] = [];

  if (day.foodShortage > 0 || day.waterShortage > 0) {
    items.push({
      actionLabel: "捐入资源",
      body: `明日预计缺食物 ${day.foodShortage}、饮水 ${day.waterShortage}。先从个人库存捐入资源，或安排搜寻班。`,
      id: "supplies",
      status: "urgent",
      title: "补足明日口粮"
    });
  }

  if (recovery.injuredCount > 0 || recovery.recoveringCount > 0) {
    items.push({
      actionLabel: recovery.careShifts > 0 ? "查看恢复" : "安排护理",
      body: `${recovery.injuredCount} 名伤员，${recovery.recoveringCount} 人恢复中；预计清除 ${recovery.likelyInjuryClears} 个伤病。`,
      id: "recovery",
      status: recovery.careShifts > 0 ? "todo" : "urgent",
      title: "处理伤病恢复"
    });
  }

  const shiftCount = Object.values(day.shiftCounts).reduce((sum, count) => sum + count, 0);
  if (shiftCount === 0) {
    items.push({
      actionLabel: "安排班次",
      body: "还没有人留守。安排搜寻、修理、守卫或护理班，日结时会转成补给、目标、危险控制和恢复。",
      id: "shifts",
      status: "todo",
      title: "安排基地班次"
    });
  }

  if (development.affordableCount > 0) {
    const recommended = development.recommended.find((project) => project.canAfford) ?? development.recommended[0];
    items.push({
      actionLabel: "升级设施",
      body: `${recommended?.name ?? "设施"}可推进；设施会同时影响基地日结和出征支援。`,
      id: "development",
      status: "todo",
      title: "推进基地建设"
    });
  }

  if (session.room.base.objective.status !== "active") {
    items.push({
      actionLabel: "创建房间",
      body: "当前房间目标已经结算。创建新房间后，可以重新开始一轮共享基地。",
      id: "objective",
      status: "urgent",
      title: "房间目标已结算"
    });
  }

  if (items.length === 0) {
    items.push({
      actionLabel: "准备远征",
      body: "水粮、班次和恢复都没有明显阻塞。可以进入远征准备，选择编队和地点。",
      id: "expedition",
      status: "ready",
      title: "准备下一次远征"
    });
  }

  return {
    items,
    summary:
      items.length === 1 && items[0].id === "expedition"
        ? "基地状态可控，可以准备下一次远征。"
        : `今日待办：${items.map((item) => baseTaskShortLabel(item.id)).join("、")}。`
  };
}

export function baseCommandBriefing(session: PlaytestSession): BaseCommandBriefing {
  const tasks = baseTaskList(session);
  const day = baseDayPreview(session);
  const shiftPlan = baseShiftPlan(session);
  const development = baseDevelopmentPlan(session);
  const primary = tasks.items[0];
  const phase = commandPhaseForTask(primary.id);
  const readiness = primary.status;
  const items = tasks.items.slice(0, 4).map((task) => ({
    actionLabel: task.actionLabel,
    body: task.body,
    detail: commandBriefingDetail(task.id, day, shiftPlan, development),
    id: task.id,
    label: baseTaskShortLabel(task.id),
    status: task.status,
    title: task.title
  }));

  return {
    headline: commandBriefingHeadline(primary, phase),
    items,
    phase,
    primaryTaskId: primary.id,
    readiness,
    summary: commandBriefingSummary(tasks, day, shiftPlan, development)
  };
}

function commandPhaseForTask(taskId: BaseTaskItem["id"]): BaseCommandBriefing["phase"] {
  if (taskId === "supplies" || taskId === "recovery" || taskId === "shifts") {
    return "recover";
  }

  if (taskId === "development") {
    return "build";
  }

  if (taskId === "objective") {
    return "resolve";
  }

  return "deploy";
}

function commandBriefingHeadline(primary: BaseTaskItem, phase: BaseCommandBriefing["phase"]) {
  if (primary.status === "urgent") {
    return "先稳住基地，再谈出征。";
  }

  if (phase === "deploy") {
    return "基地窗口已打开，可以组织下一次远征。";
  }

  if (phase === "build") {
    return "今天适合把资源转成长期支援。";
  }

  if (phase === "resolve") {
    return "房间目标需要先完成结算处理。";
  }

  return "先把恢复、补给和班次接顺。";
}

function commandBriefingSummary(
  tasks: BaseTaskList,
  day: BaseDayPreview,
  shiftPlan: BaseShiftPlan,
  development: BaseDevelopmentPlan
) {
  const urgentCount = tasks.items.filter((item) => item.status === "urgent").length;
  const readyShiftCount = shiftPlan.items.filter((item) => item.status === "ready").length;
  const supplyGap = day.foodShortage + day.waterShortage;
  const projectText =
    development.affordableCount > 0
      ? `可建设 ${development.affordableCount} 项`
      : development.blockedCount > 0
        ? `建设缺材料 ${development.recommended.reduce((sum, item) => sum + item.materialDeficit, 0)}`
        : "建设路线稳定";

  return [
    urgentCount > 0 ? `${urgentCount} 个急迫缺口` : "无急迫缺口",
    supplyGap > 0 ? `补给缺口 ${supplyGap}` : "补给可过夜",
    `班次覆盖 ${readyShiftCount}/4`,
    projectText
  ].join(" / ");
}

function commandBriefingDetail(
  taskId: BaseTaskItem["id"],
  day: BaseDayPreview,
  shiftPlan: BaseShiftPlan,
  development: BaseDevelopmentPlan
) {
  if (taskId === "supplies") {
    return `明日需要食物 ${day.foodNeed}、水 ${day.waterNeed}；缺口会影响士气和危险。`;
  }

  if (taskId === "recovery") {
    return shiftPlan.items.find((item) => item.id === "care")?.detail ?? "确认伤病、疲劳和护理班。";
  }

  if (taskId === "shifts") {
    return shiftPlan.summary;
  }

  if (taskId === "development") {
    const recommended = development.recommended.find((project) => project.canAfford) ?? development.recommended[0];
    return recommended
      ? `${recommended.name}：${recommended.reason} ${recommended.nextStep}`
      : "设施路线已经稳定，可以把资源转给出征和恢复。";
  }

  if (taskId === "objective") {
    return `当前目标 ${day.objectiveCurrent}/${day.objectiveProjected}，先确认房间是否进入下一轮。`;
  }

  return `明日目标预计 ${day.objectiveProjected}，补给和班次可支撑下一次路线选择。`;
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
  const eventIndex = Math.max(0, nextDay - 2) % baseDayEventTitles.length;
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
        const clearedInjury = patient.injuries.length > 0 ? patient.injuries[0] : "";
        patient.fatigue = clamp(patient.fatigue - fatigueRelief, 0, 100);
        if (clearedInjury) {
          patient.injuries = patient.injuries.slice(1);
        }
        patient.status = patient.injuries.length > 0 ? "recovering" : "available";
        logs.push(
          `基地事件：${title}。医务覆盖稳定了 ${patient.name}。疲劳 -${fatigueRelief}${
            clearedInjury ? `，处理${clearedInjury}，清除 1 个伤病` : "，没有需要清除的伤病"
          }。`
        );
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

  if (eventIndex === 3) {
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

  if (eventIndex === 4) {
    const title = "净水滤芯堵塞";
    const support = coverage.repair + coverage.forage + facilityLevel(session, "generator");
    if (support >= 3) {
      const water = Math.min(4, support);
      session.room.base.resources.water += water;
      session.room.base.resources.materials += 1;
      logs.push(`基地事件：${title}。维修班和搜寻班拆下堵塞滤芯，顺手补齐一段管路。水 +${water}，材料 +1。`);
    } else if (support > 0) {
      session.room.base.resources.water += 1;
      logs.push(`基地事件：${title}。临时冲洗保住了夜间用水。水 +1。`);
    } else {
      const waterShortage = spendWithShortage(session.room.base.resources, "water", 2);
      const materialShortage = spendWithShortage(session.room.base.resources, "materials", 1);
      const pressure = waterShortage + materialShortage;
      session.room.base.morale = clamp(session.room.base.morale - 2 - pressure * 2, 0, 100);
      logs.push(`基地事件：${title}。无人处理的滤芯拖慢供水。水 -${2 - waterShortage}/2，材料 -${1 - materialShortage}/1，士气 -${2 + pressure * 2}。`);
    }
    return { logs, title };
  }

  const title = "夜间求救信号";
  const support = coverage.guard + coverage.care + facilityLevel(session, "radio");
  if (support >= 3) {
    const objective = Math.min(2, Math.max(1, Math.floor(support / 2)));
    session.room.base.objective.repairedParts = Math.min(
      session.room.base.objective.requiredParts,
      session.room.base.objective.repairedParts + objective
    );
    session.room.base.morale = clamp(session.room.base.morale + 2, 0, 100);
    logs.push(`基地事件：${title}。守卫确认来源，护理班安抚幸存者，电台留下可追踪坐标。目标 +${objective}，士气 +2。`);
  } else if (support > 0) {
    session.room.base.danger = clamp(session.room.base.danger + 1, 0, 100);
    session.room.base.morale = clamp(session.room.base.morale + 1, 0, 100);
    logs.push(`基地事件：${title}。值班人员没有贸然开门，只把坐标记入明早路线。危险 +1，士气 +1。`);
  } else {
    session.room.base.danger = clamp(session.room.base.danger + 5, 0, 100);
    session.room.base.morale = clamp(session.room.base.morale - 2, 0, 100);
    logs.push(`基地事件：${title}。整夜无人分辨信号真假，基地被噪声和猜疑拖住。危险 +5，士气 -2。`);
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
        const clearedInjury = patient.injuries.length > 0 && healScore >= 10 ? patient.injuries[0] : "";
        patient.fatigue = clamp(patient.fatigue - healScore, 0, 100);
        if (clearedInjury) {
          patient.injuries = patient.injuries.slice(1);
        }
        patient.status = patient.injuries.length > 0 ? "recovering" : "available";
        logs.push(
          `${survivor.name} 执行护理：${patient.name} 疲劳 -${healScore}${
            clearedInjury ? `，处理${clearedInjury}，清除 1 个伤病` : healScore >= 10 ? "，没有需要清除的伤病" : ""
          }。`
        );
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

function facilityDevelopmentReason(session: PlaytestSession, facilityId: string): string {
  const injuredCount = session.account.survivors.filter((survivor) => survivor.injuries.length > 0).length;
  const wearyCount = session.account.survivors.filter((survivor) => survivor.fatigue >= 55).length;
  const foodWater = session.room.base.resources.food + session.room.base.resources.water;
  const objective = session.room.base.objective;
  const danger = session.room.base.danger;
  const baseReasons: Record<string, string> = {
    barricade: danger >= 35 ? "当前基地危险偏高，先补防线能降低日结压力。" : "提升守卫班价值，减少基地被突发事件拖垮。",
    clinic: injuredCount > 0 ? `当前有 ${injuredCount} 名伤员，医务室会直接缩短战后恢复。` : "提前补医疗线，让下一次战斗后的伤病更容易处理。",
    dorm: wearyCount > 0 ? `当前有 ${wearyCount} 名高疲劳队员，宿舍会提高每日恢复。` : "提高队伍周转率，让连续出征不用等太久。",
    generator: "供电会强化弹药准备，并支撑净水、工坊和夜间事件处理。",
    kitchen: foodWater <= 10 ? "当前口粮和饮水偏紧，厨房能降低基地日结压力。" : "厨房把搜寻、营地和商店补给串成稳定后勤。",
    radio:
      objective.status === "active" && objective.repairedParts < objective.requiredParts
        ? "房间目标还没完成，电台能加快线索、减压和目标推进。"
        : "电台增强协作和路线情报，让多人房间更容易同步。",
    training: "训练室提升出征成长，让幸存者等级和战斗表现更快进入正循环。",
    watchtower: danger >= 25 ? "当前危险需要提前发现，瞭望塔能减压并支援守卫。" : "瞭望塔让路线搜索和基地防守更稳定。",
    workshop: "工坊同时提升修理班、弹药伤害和商店服务，是出征效率核心设施。"
  };

  return baseReasons[facilityId] ?? "当前项目能补强基地和出征之间的长期循环。";
}

function facilityDevelopmentNextStep(name: string, action: "Build" | "Upgrade" | "Maxed", canAfford: boolean, materialDeficit: number): string {
  if (action === "Maxed") {
    return `${name} 已达到当前上限。`;
  }

  if (canAfford) {
    return `材料已够，建议本轮${action === "Build" ? "建造" : "升级"}。`;
  }

  return `还缺 ${materialDeficit} 材料；先出征、搜寻或让队友捐入材料。`;
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

function facilityExpeditionStage(facilityId: string): string {
  const stages: Record<string, string> = {
    barricade: "路上控制",
    clinic: "战斗医疗",
    dorm: "出门准备",
    generator: "战斗医疗",
    kitchen: "营地交易",
    radio: "路上控制",
    training: "出门准备",
    watchtower: "路上控制",
    workshop: "战斗医疗"
  };
  return stages[facilityId] ?? "后勤支援";
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
