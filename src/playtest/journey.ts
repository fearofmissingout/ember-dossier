import type { GameState, LocationFamily, ResourceBundle, ResourceKey, RiskStrategy, Survivor } from "../game/types";
import type { ExpeditionSupport } from "./progression";
import type { PlaytestSession, RoomObjective } from "./types";

export type JourneyAction =
  | "careful"
  | "force"
  | "trade"
  | "skip"
  | "shop-resupply"
  | "shop-intel"
  | "shop-service"
  | "extract"
  | "rest"
  | "cook"
  | "scout"
  | "loot-salvage"
  | "loot-medicine"
  | "loot-intel"
  | "loot-evade"
  | "road-secure"
  | "road-search"
  | "road-support"
  | "road-push"
  | "command-guard-relay"
  | "command-recon-ping"
  | "command-supply-cache"
  | "plan-steady"
  | "plan-scavenge"
  | "plan-rush"
  | "plan-sneak"
  | "tactic-observe"
  | "tactic-brace"
  | "tactic-ration"
  | "tactic-prospect";
export type CombatAction = "strike" | "guard" | "patch" | "tactic" | "retreat";
export type JourneyCombatLootAction = "salvage" | "medicine" | "intel" | "evade";
export type JourneyCombatIntent = "maul" | "windup" | "brace" | "prowl";
export type JourneyCombatantStatus = "steady" | "strained" | "down";
export type JourneyRoadEncounterAction = "secure" | "search" | "support" | "push";
export type JourneyBaseCommandAction = "guard-relay" | "recon-ping" | "supply-cache";
export type JourneyExtractionStatus = "in-progress" | "early" | "complete";
export type JourneyTravelPlan = "steady" | "scavenge" | "rush" | "sneak";
export type JourneySegmentTactic = "observe" | "brace" | "ration" | "prospect";
export type JourneyRoadEventTone = "find" | "hazard" | "road";

export type JourneyDraft = {
  squadIds: string[];
  risk: RiskStrategy;
  loadout: ResourceBundle;
  support?: ExpeditionSupport;
};

export type JourneyChoice = {
  label: string;
  supplyPriority: ResourceKey[];
  reward: ResourceBundle;
  pressure: number;
  rollShift: number;
  successLog: string;
  fallbackLog: string;
};

export type JourneyEnemy = {
  name: string;
  armor: number;
  hpBonus: number;
  attackBonus: number;
  reward: ResourceBundle;
  intro: string;
  trait: "armored" | "bleeder" | "swarm" | "dread";
  traitLabel: string;
  traitText: string;
};

export type JourneyEnemyPulse = {
  counterActions: CombatAction[];
  label: string;
  text: string;
  warning: string;
};

export type JourneyShopAction = "resupply" | "intel" | "service";

export type JourneyShopOffer = {
  costPriority: ResourceKey[];
  failLog: string;
  fatigue: number;
  fieldSupplyReward: ResourceBundle;
  hunger: number;
  id: JourneyShopAction;
  label: string;
  objectiveBonus: number;
  pressure: number;
  pressureFail: number;
  reward: ResourceBundle;
  rollShiftFail: number;
  rollShift: number;
  successLog: string;
  supportText?: string;
  text: string;
  thirst: number;
};

export type JourneyShop = {
  label: string;
  offers: Record<JourneyShopAction, JourneyShopOffer>;
};

type MaterializedLegacyShop = {
  label: string;
  costPriority: ResourceKey[];
  reward: ResourceBundle;
  pressureSuccess: number;
  pressureFail: number;
  rollShiftSuccess: number;
  rollShiftFail: number;
  successLog: string;
  failLog: string;
};

export type JourneyCampAction = "rest" | "cook" | "scout";

export type JourneyCampOption = {
  label: string;
  supplyPriority: ResourceKey[];
  pressure: number;
  fatigue: number;
  hunger: number;
  thirst: number;
  rollShift: number;
  objectiveBonus: number;
  supportText?: string;
  successLog: string;
  fallbackLog: string;
};

export type JourneyNode = {
  id: string;
  type: "event" | "combat" | "camp" | "shop" | "extraction";
  title: string;
  body: string;
  camp?: Record<JourneyCampAction, JourneyCampOption>;
  careful?: JourneyChoice;
  enemy?: JourneyEnemy;
  force?: JourneyChoice;
  shop?: JourneyShop;
};

export type JourneyRouteStopState = "active" | "ahead" | "done";

export type JourneyRouteStop = {
  index: number;
  label: string;
  state: JourneyRouteStopState;
  title: string;
};

export type JourneyRoutePace = {
  clockLabel: string;
  currentLabel: string;
  currentStop: number;
  currentTitle: string;
  distanceSegments: number;
  elapsedHours: number;
  etaHours: number;
  etaLabel: string;
  forecast: JourneyRouteStop[];
  nextLabel: string;
  nextTitle: string;
  pendingRoad: boolean;
  progressPercent: number;
  remainingStops: number;
  totalStops: number;
};

export type JourneyProcessStepTone = "neutral" | "safe" | "warning" | "danger";

export type JourneyProcessStep = {
  body: string;
  id: string;
  label: string;
  title: string;
  tone: JourneyProcessStepTone;
};

export type JourneyProcessDigest = {
  headline: string;
  steps: JourneyProcessStep[];
  summary: string;
};

export type JourneyActionGuideTone = "safe" | "warning" | "danger";

export type JourneyActionGuide = {
  body: string;
  label: string;
  primaryAction: string;
  title: string;
  tone: JourneyActionGuideTone;
};

export type JourneyDecisionCategory = "event" | "road" | "shop" | "camp" | "combat-loot" | "base-command";
export type JourneyDecisionTone = "safe" | "warning" | "danger";

export type JourneyDecisionRecord = {
  category: JourneyDecisionCategory;
  detail: string;
  id: string;
  impactText: string;
  label: string;
  nodeTitle: string;
  tone: JourneyDecisionTone;
};

export type JourneyRoadEventRecord = {
  outcome: string;
  segment: number;
  title: string;
  tone: JourneyRoadEventTone;
};

export type JourneyTravelTone = "safe" | "warning" | "danger";

export type JourneyCarryBurdenTier = "light" | "heavy" | "overloaded";

export type JourneyCarryBurden = {
  capacity: number;
  fatiguePenalty: number;
  load: number;
  pressurePenalty: number;
  tier: JourneyCarryBurdenTier;
};

export type JourneyTravelRecord = {
  body: string;
  conditionText: string;
  effects: string[];
  hours: number;
  planLabel: string;
  pressureDelta: number;
  segment: number;
  timeLabel: string;
  title: string;
  tone: JourneyTravelTone;
};

export type JourneySegmentForecastRisk = "stable" | "strained" | "critical";

export type JourneyHardshipSeverity = "minor" | "severe";

export type JourneyHardship = {
  effects: string[];
  id: string;
  label: string;
  severity: JourneyHardshipSeverity;
  text: string;
};

export type JourneyHardshipRecord = JourneyHardship & {
  segment: number;
  targetName?: string;
};

export type JourneySegmentForecast = {
  conditionDeltas: Omit<JourneyCondition, "distance">;
  hardship: JourneyHardship | null;
  hours: number;
  notes: string[];
  planLabel: string;
  pressureDelta: number;
  resultingCondition: JourneyCondition;
  resultingElapsedHours: number;
  resultingPressure: number;
  riskLevel: JourneySegmentForecastRisk;
  roadEventForecast: JourneyRoadEventForecast;
  segment: number;
  supplyUse: string[];
  tacticLabel: string;
  threatLabel: string;
};

export type JourneyRoadEventForecast = {
  advice: string;
  beatTitle: string;
  findChancePercent: number;
  hazardChancePercent: number;
  likelyTone: JourneyRoadEventTone;
  riskLabel: string;
  roadChancePercent: number;
  summary: string;
};

export type JourneyRoadEncounterChoice = {
  fallbackLog?: string;
  fatigue: number;
  hunger: number;
  id: JourneyRoadEncounterAction;
  label: string;
  pressure: number;
  reward: ResourceBundle;
  rollShift: number;
  successLog: string;
  supplyPriority: ResourceKey[];
  supportText?: string;
  text: string;
  thirst: number;
};

export type JourneyPendingRoadEncounter = {
  body: string;
  choices: JourneyRoadEncounterChoice[];
  id: string;
  nextNodeIndex: number;
  segment: number;
  title: string;
  tone: JourneyRoadEventTone;
};

export type JourneyRoadEncounterChoicePreviewTone = "safe" | "warning" | "danger";

export type JourneyRoadEncounterChoicePreview = {
  canPayCost: boolean;
  conditionText: string;
  costText: string;
  outcomeLabel: string;
  rewardText: string;
  riskText: string;
  tone: JourneyRoadEncounterChoicePreviewTone;
};

export type JourneyCombatant = {
  guard: number;
  lastAction: string | null;
  maxStamina: number;
  name: string;
  role: string;
  stamina: number;
  status: JourneyCombatantStatus;
  survivorId: string;
  wounds: number;
};

export type JourneyCombat = {
  armor: number;
  bleed: number;
  enemyName: string;
  enemyHp: number;
  enemyMaxHp: number;
  enemyTrait: JourneyEnemy["trait"];
  enemyTraitLabel: string;
  enemyTraitText: string;
  exposed: number;
  intent: JourneyCombatIntent;
  intentLabel: string;
  intentText: string;
  frontline: JourneyCombatant[];
  squadHp: number;
  squadMaxHp: number;
  stagger: number;
  attack: number;
  tempo: number;
  round: number;
  reward: ResourceBundle;
  traitPulse: JourneyEnemyPulse;
};

export type JourneyCombatLoot = {
  enemyName: string;
  trophy: string;
  trait: JourneyEnemy["trait"];
};

export type JourneyCombatReplayTone = "safe" | "warning" | "danger";

export type JourneyCombatRoundRecord = {
  actionLabel: string;
  actorName: string;
  counterText: string;
  enemyText: string;
  id: string;
  outcomeText: string;
  round: number;
  tone: JourneyCombatReplayTone;
};

export type JourneyCondition = {
  distance: number;
  fatigue: number;
  hunger: number;
  thirst: number;
};

export type JourneyState = {
  battleScars: number;
  baseCommandUses: Partial<Record<JourneyBaseCommandAction, number>>;
  bonusReward: ResourceBundle;
  burden: JourneyCarryBurden;
  combat: JourneyCombat | null;
  combatHistory: JourneyCombatRoundRecord[];
  currentNodeIndex: number;
  elapsedHours: number;
  extractionStatus: JourneyExtractionStatus;
  fieldSupplies: ResourceBundle;
  id: string;
  loadout: ResourceBundle;
  locationFamily: LocationFamily;
  locationId: string;
  logs: string[];
  decisions: JourneyDecisionRecord[];
  nodes: JourneyNode[];
  hardships: JourneyHardshipRecord[];
  pendingCombatLoot: JourneyCombatLoot | null;
  pendingRoadEvent: JourneyPendingRoadEncounter | null;
  pressure: number;
  risk: RiskStrategy;
  rollShift: number;
  roadEvents: JourneyRoadEventRecord[];
  segmentTactic: JourneySegmentTactic;
  squadIds: string[];
  condition: JourneyCondition;
  objectiveBonus: number;
  support: ExpeditionSupport;
  trophies: string[];
  travelHistory: JourneyTravelRecord[];
  travelPlan: JourneyTravelPlan;
  woundedSurvivorIds: string[];
};

export type JourneyTravelPlanOption = {
  id: JourneyTravelPlan;
  label: string;
  text: string;
  hours: number;
  pressure: number;
  fatigue: number;
  hunger: number;
  thirst: number;
};

export type JourneySegmentTacticOption = {
  failFatigue: number;
  failHunger: number;
  failPressure: number;
  failThirst: number;
  fallbackLog: string;
  fatigue: number;
  hunger: number;
  id: JourneySegmentTactic;
  label: string;
  pressure: number;
  routeSkill: number;
  scavengeBonus: number;
  successLog: string;
  supplyPriority: ResourceKey[];
  text: string;
  thirst: number;
};

export type JourneySegmentThreat = {
  counterTactics: JourneySegmentTactic[];
  fatigue: number;
  hunger: number;
  id: string;
  label: string;
  pressure: number;
  scavengePenalty: number;
  text: string;
  thirst: number;
};

export type JourneySegmentThreatMitigation = {
  fatigue: number;
  pressure: number;
  scavengePenalty: number;
  source: string;
  value: number;
};

export type JourneyCombatLootOption = {
  battleScarRelief: number;
  fatigue: number;
  id: JourneyCombatLootAction;
  label: string;
  objectiveBonus: number;
  pressure: number;
  reward: ResourceBundle;
  rollShift: number;
  supportText?: string;
  text: string;
};

export type JourneyBaseCommandOption = {
  canUse: boolean;
  effect: string;
  id: JourneyBaseCommandAction;
  label: string;
  maxUses: number;
  remainingUses: number;
  text: string;
};

export type JourneyObjectivePreview = {
  currentParts: number;
  hint: string;
  progressPercent: number;
  projectedParts: number;
  projectedPercent: number;
  remainingAfterRoute: number;
  requiredParts: number;
  routeBonus: number;
  routeLabel: string;
  statusLabel: string;
  summary: string;
  title: string;
};

export type JourneyExtractionPreviewOption = {
  id: "early" | "complete";
  label: string;
  objectiveCurrent: number;
  objectiveProjectedMax: number;
  objectiveProjectedMin: number;
  objectiveRouteBonus: number;
  objectiveSiteBonusMax: number;
  objectiveSiteBonusMin: number;
  rewardScalePercent: number;
  rewardSummary: string;
  riskSummary: string;
  summary: string;
  title: string;
};

export type JourneyExtractionPreview = {
  bankedReward: ResourceBundle;
  battleScars: number;
  canExtractNow: boolean;
  currentStop: number;
  fatigue: number;
  fieldSupplySummary: string;
  options: JourneyExtractionPreviewOption[];
  pressure: number;
  remainingStops: number;
};

export type JourneyRouteBriefing = {
  estimatedHours: number;
  familyLabel: string;
  fieldSupplySummary: string;
  locationName: string;
  pressure: number;
  pressureLabel: string;
  recommendations: string[];
  routePattern: string[];
  supportSummary: string;
  survivalSummary: string;
  warnings: string[];
};

export function journeyObjectivePreview(
  journey: Pick<JourneyState, "extractionStatus" | "objectiveBonus">,
  objective: RoomObjective
): JourneyObjectivePreview {
  const requiredParts = Math.max(1, objective.requiredParts);
  const currentParts = Math.max(0, Math.min(requiredParts, objective.repairedParts));
  const routeBonus = Math.max(0, Math.floor(journey.objectiveBonus));
  const projectedParts = Math.min(requiredParts, currentParts + routeBonus);
  const remainingAfterRoute = Math.max(0, requiredParts - projectedParts);
  const statusLabel = objective.status === "active" ? "进行中" : objective.status === "won" ? "已完成" : "已失败";
  const routeLabel = routeBonus > 0 ? `本次线索 +${routeBonus}` : "本次尚无线索";
  const summary =
    routeBonus > 0
      ? `撤离后预计推进到 ${projectedParts}/${requiredParts}，还差 ${remainingAfterRoute}。`
      : "营地侦察、交易情报和战后分析会转化为目标线索。";
  const hint =
    journey.extractionStatus === "early"
      ? "提前返程会保留已取得线索，但不会获得地点主体进度。"
      : "完整撤离会把目标线索和地点进度一起回传基地。";

  return {
    currentParts,
    hint,
    progressPercent: Math.round((currentParts / requiredParts) * 100),
    projectedParts,
    projectedPercent: Math.round((projectedParts / requiredParts) * 100),
    remainingAfterRoute,
    requiredParts,
    routeBonus,
    routeLabel,
    statusLabel,
    summary,
    title: objective.title
  };
}

export function journeyRouteBriefing(
  session: PlaytestSession,
  draft: JourneyDraft,
  locationId: string,
  readiness: number
): JourneyRouteBriefing {
  const location = session.room.locations.find((candidate) => candidate.id === locationId);
  const family = location?.family ?? "urban";
  const support = draft.support ?? emptySupport();
  const squad = session.account.survivors.filter((survivor) => draft.squadIds.includes(survivor.id));
  const fieldSupplies = { ...draft.loadout };
  addPartialResources(fieldSupplies, support.startingSupplies);
  const burden = calculateCarryBurden(squad, fieldSupplies, support);
  const basePressure = draft.risk === "cautious" ? 10 : draft.risk === "greedy" ? 28 : 18;
  const pressure = clampPercent(basePressure + burden.pressurePenalty);
  const routePattern = ["事件", "战斗", "营地", "商店", "撤离"];
  const estimatedHours = Math.max(0, routePattern.length - 1) * travelPlanOptions.steady.hours;
  const warnings: string[] = [];
  const recommendations: string[] = [];

  if (squad.length < 3) {
    warnings.push("编队少于 3 人，远征无法稳定出发。");
    recommendations.push("优先补足 3-5 人编队。");
  } else if (squad.length > 5) {
    warnings.push("编队超过 5 人，远征队形会变得难以管理。");
    recommendations.push("压缩到 3-5 人，让疲劳和补给消耗保持可控。");
  }

  if (burden.tier === "overloaded") {
    warnings.push("背包超载会显著增加开局压力和行军疲劳。");
    recommendations.push("减少携带物资，或升级仓库、训练室和工坊类支援。");
  } else if (burden.tier === "heavy") {
    warnings.push("背包偏重，路上更容易累积疲劳。");
    recommendations.push("保留食物、水、药品和弹药，压低非必要材料。");
  }

  if (readiness < 50) {
    warnings.push("编队适配度偏低，关键属性没有覆盖地点需求。");
    recommendations.push("调整幸存者，让推荐属性更接近地点要求。");
  }

  if (fieldSupplies.food === 0 || fieldSupplies.water === 0) {
    warnings.push("食物或饮水不足，路线消耗会更快转化为压力。");
    recommendations.push("至少携带 1 份食物和 1 份水，或选择路上口粮纪律。");
  }

  if (draft.risk === "greedy") {
    recommendations.push("贪婪策略适合冲战利品，但要准备提前返程。");
  }

  return {
    estimatedHours,
    familyLabel: familyLabelFor(family),
    fieldSupplySummary: formatResourceCounts(fieldSupplies),
    locationName: location?.name ?? "未知地点",
    pressure,
    pressureLabel: pressureLabelFor(pressure),
    recommendations: uniqueText(recommendations),
    routePattern,
    supportSummary: supportSummaryFor(support),
    survivalSummary: `开局压力 ${pressure}%（${pressureLabelFor(pressure)}），背包${carryBurdenLabel(burden.tier)} ${burden.load}/${burden.capacity}，预计 ${estimatedHours} 小时抵达撤离窗口。`,
    warnings: uniqueText(warnings)
  };
}

export function journeyExtractionPreview(journey: JourneyState, objective: RoomObjective): JourneyExtractionPreview {
  const pace = routePaceFor(journey);
  const requiredParts = Math.max(1, objective.requiredParts);
  const objectiveCurrent = Math.max(0, Math.min(requiredParts, objective.repairedParts));
  const objectiveRouteBonus = Math.max(0, Math.floor(journey.objectiveBonus));
  const routedProgress = Math.min(requiredParts, objectiveCurrent + objectiveRouteBonus);
  const fatigue = Math.round(journey.condition.fatigue);
  const pressure = Math.round(journey.pressure);
  const riskSummary = [`压力 ${pressure}%`, `疲劳 ${fatigue}`, `战斗伤痕 ${Math.max(0, journey.battleScars)}`].join(" / ");
  const bankedText = formatBundle(journey.bonusReward);
  const fieldSupplySummary = formatBundle(journey.fieldSupplies);
  const canExtractNow = !journey.combat && !journey.pendingCombatLoot && !journey.pendingRoadEvent;

  return {
    bankedReward: { ...journey.bonusReward },
    battleScars: Math.max(0, journey.battleScars),
    canExtractNow,
    currentStop: pace.currentStop,
    fatigue,
    fieldSupplySummary,
    options: [
      {
        id: "early",
        label: "现在返程",
        objectiveCurrent,
        objectiveProjectedMax: routedProgress,
        objectiveProjectedMin: routedProgress,
        objectiveRouteBonus,
        objectiveSiteBonusMax: 0,
        objectiveSiteBonusMin: 0,
        rewardScalePercent: 40,
        rewardSummary: `已入袋：${bankedText}。地点主体奖励约 40%。`,
        riskSummary,
        summary: "保住已入袋战利和路线线索，但放弃地点主体进度。适合压力、疲劳或伤痕已经压不住时使用。",
        title: "稳妥撤回"
      },
      {
        id: "complete",
        label: "完整撤离",
        objectiveCurrent,
        objectiveProjectedMax: Math.min(requiredParts, routedProgress + 2),
        objectiveProjectedMin: routedProgress,
        objectiveRouteBonus,
        objectiveSiteBonusMax: 2,
        objectiveSiteBonusMin: 0,
        rewardScalePercent: 100,
        rewardSummary: `随身补给：${fieldSupplySummary}。地点主体奖励完整结算。`,
        riskSummary: `${riskSummary} / 还剩 ${pace.remainingStops} 站`,
        summary: "继续推进到出口，地点主体进度 +0-2，并获得完整地点奖励；剩余路段仍可能追加伤病和消耗。",
        title: "压到出口"
      }
    ],
    pressure,
    remainingStops: pace.remainingStops
  };
}

export function resolveJourneyExtraction(journey: JourneyState): JourneyState {
  const next = structuredClone(journey) as JourneyState;
  const activeNode = next.nodes[next.currentNodeIndex];
  const completedRoute = !activeNode || activeNode.type === "extraction";

  next.extractionStatus = completedRoute ? "complete" : "early";
  next.combat = null;
  next.pendingCombatLoot = null;
  next.pendingRoadEvent = null;
  next.logs.push(
    completedRoute
      ? "队伍标记撤离路线，呼叫基地接应。"
      : "紧急返程：队伍放弃当前阻碍，保住已入袋战利和路线线索。"
  );

  return next;
}

export function routePaceFor(journey: JourneyState): JourneyRoutePace {
  const totalStops = journey.nodes.length;
  const safeIndex = Math.max(0, Math.min(journey.currentNodeIndex, Math.max(0, totalStops - 1)));
  const activeNode = journey.nodes[safeIndex];
  const nextNode = journey.nodes[safeIndex + 1] ?? null;
  const pendingRoad = journey.pendingRoadEvent;
  const currentLabel = pendingRoad ? roadEventLabel(pendingRoad.tone) : nodeTypeLabel(activeNode?.type);
  const currentTitle = pendingRoad?.title ?? activeNode?.title ?? "未知路线";
  const nextLabel = nextNode ? nodeTypeLabel(nextNode.type) : "返程";
  const nextTitle = nextNode?.title ?? "返回基地";
  const progressPercent = totalStops <= 1 ? 100 : Math.round((safeIndex / (totalStops - 1)) * 100);
  const elapsedHours = journeyElapsedHours(journey);
  const etaHours = Math.max(0, totalStops - safeIndex - 1) * (travelPlanOptions[journey.travelPlan]?.hours ?? 3) + (pendingRoad ? 1 : 0);

  return {
    clockLabel: `已行进 ${elapsedHours} 小时`,
    currentLabel,
    currentStop: safeIndex + 1,
    currentTitle,
    distanceSegments: journey.condition.distance,
    elapsedHours,
    etaHours,
    etaLabel: etaHours > 0 ? `约 ${etaHours} 小时后可撤离` : "可以撤离",
    forecast: journey.nodes.map((node, index) => ({
      index: index + 1,
      label: nodeTypeLabel(node.type),
      state: index === safeIndex ? "active" : index < safeIndex ? "done" : "ahead",
      title: node.title
    })),
    nextLabel,
    nextTitle,
    pendingRoad: Boolean(pendingRoad),
    progressPercent,
    remainingStops: Math.max(0, totalStops - safeIndex - 1),
    totalStops
  };
}

export function journeyProcessDigest(journey: JourneyState): JourneyProcessDigest {
  const pace = routePaceFor(journey);
  const activeNode = journey.nodes[Math.max(0, Math.min(journey.currentNodeIndex, Math.max(0, journey.nodes.length - 1)))] ?? null;
  const latestTravel = journey.travelHistory[journey.travelHistory.length - 1] ?? null;
  const latestRoad = journey.roadEvents[journey.roadEvents.length - 1] ?? null;
  const latestCombat = journey.combatHistory[journey.combatHistory.length - 1] ?? null;
  const latestDecision = (journey.decisions ?? [])[Math.max(0, (journey.decisions ?? []).length - 1)] ?? null;
  const steps: JourneyProcessStep[] = [
    {
      body: journey.pendingRoadEvent?.body ?? activeNode?.body ?? "队伍正在等待下一步指令。",
      id: "current-node",
      label: "当前节点",
      title: pace.currentTitle,
      tone: journey.pendingRoadEvent ? roadToneForDigest(journey.pendingRoadEvent.tone) : nodeToneForDigest(activeNode?.type)
    },
    {
      body: `${pace.clockLabel}，${pace.etaLabel}。下一站：${pace.nextLabel}，${pace.nextTitle}。`,
      id: "route-pace",
      label: "路线进度",
      title: `${pace.progressPercent}% · 还剩 ${pace.remainingStops} 站`,
      tone: pace.remainingStops === 0 ? "safe" : pace.progressPercent >= 60 ? "warning" : "neutral"
    }
  ];

  if (latestTravel) {
    steps.push({
      body: `${latestTravel.planLabel}，${latestTravel.conditionText}。${latestTravel.effects.slice(0, 4).join(" / ")}`,
      id: `travel-${latestTravel.segment}`,
      label: "最近行军",
      title: `${latestTravel.title} · ${latestTravel.timeLabel}`,
      tone: latestTravel.tone
    });
  }

  if (journey.pendingRoadEvent) {
    steps.push({
      body: journey.pendingRoadEvent.body,
      id: `pending-road-${journey.pendingRoadEvent.segment}`,
      label: "待处理路口",
      title: journey.pendingRoadEvent.title,
      tone: roadToneForDigest(journey.pendingRoadEvent.tone)
    });
  } else if (latestRoad) {
    steps.push({
      body: latestRoad.outcome,
      id: `road-${latestRoad.segment}-${latestRoad.title}`,
      label: "路上事件",
      title: latestRoad.title,
      tone: roadToneForDigest(latestRoad.tone)
    });
  }

  if (journey.combat) {
    steps.push({
      body: `${journey.combat.intentLabel}：${journey.combat.intentText}。敌方生命 ${journey.combat.enemyHp}/${journey.combat.enemyMaxHp}，队伍生命 ${journey.combat.squadHp}/${journey.combat.squadMaxHp}。`,
      id: "active-combat",
      label: "当前战斗",
      title: journey.combat.enemyName,
      tone: journey.combat.squadHp / Math.max(1, journey.combat.squadMaxHp) < 0.4 ? "danger" : "warning"
    });
  }

  if (latestCombat) {
    steps.push({
      body: `第 ${latestCombat.round} 回合：${latestCombat.actorName} ${latestCombat.actionLabel}。${latestCombat.outcomeText} ${latestCombat.enemyText} ${latestCombat.counterText}`,
      id: latestCombat.id,
      label: "最近战斗",
      title: latestCombat.tone === "safe" ? "优势回合" : latestCombat.tone === "danger" ? "危险回合" : "胶着回合",
      tone: latestCombat.tone
    });
  }

  if (latestDecision) {
    steps.push({
      body: `${latestDecision.nodeTitle}：${latestDecision.detail}。${latestDecision.impactText}`,
      id: latestDecision.id,
      label: "最近抉择",
      title: latestDecision.label,
      tone: latestDecision.tone
    });
  }

  if (journey.pendingCombatLoot) {
    steps.push({
      body: `已击退 ${journey.pendingCombatLoot.enemyName}，等待选择如何处理 ${journey.pendingCombatLoot.trophy}。`,
      id: "combat-loot",
      label: "战利抉择",
      title: "战后处理",
      tone: "safe"
    });
  }

  steps.push({
    body:
      journey.extractionStatus === "complete"
        ? "路线已经打通，完整撤离会带回地点主体进度。"
        : journey.extractionStatus === "early"
          ? "队伍已经进入返程状态，只保留已入袋收获和路线线索。"
          : "随时可以评估提前返程；完整撤离会带回更多地点奖励和目标进度。",
    id: "extraction-status",
    label: "撤离状态",
    title: journey.extractionStatus === "in-progress" ? "尚在路上" : journey.extractionStatus === "early" ? "提前返程" : "完整撤离",
    tone: journey.extractionStatus === "complete" ? "safe" : journey.extractionStatus === "early" ? "warning" : "neutral"
  });

  const blockers = [
    journey.pendingRoadEvent ? "路口待处理" : "",
    journey.pendingCombatLoot ? "战利抉择未完成" : "",
    journey.combat ? "战斗未解决" : "",
    activeNode?.type === "extraction" ? "可以完整撤离" : ""
  ].filter(Boolean);

  return {
    headline: `第 ${pace.currentStop}/${pace.totalStops} 站：${pace.currentLabel}`,
    steps,
    summary: `${pace.currentTitle}。${blockers.length > 0 ? blockers.join("，") : "可以推进下一段或提前返程"}。${pace.clockLabel}，${pace.etaLabel}。`
  };
}

export function journeyActionGuide(journey: JourneyState): JourneyActionGuide {
  const activeNode = journey.nodes[Math.max(0, Math.min(journey.currentNodeIndex, Math.max(0, journey.nodes.length - 1)))] ?? null;

  if (journey.combat) {
    return {
      body: `${journey.combat.enemyName} 正在准备${journey.combat.intentLabel}。先根据威胁预告选择攻击、防守、包扎或战术，打完本回合再推进路线。`,
      label: "行动指引",
      primaryAction: "选择战斗行动",
      title: "先处理战斗回合",
      tone: "danger"
    };
  }

  if (journey.pendingCombatLoot) {
    return {
      body: `已击退 ${journey.pendingCombatLoot.enemyName}，先决定如何处理${journey.pendingCombatLoot.trophy}，再继续行军或撤离。`,
      label: "行动指引",
      primaryAction: "处理战利品",
      title: "先分配战斗战利",
      tone: "safe"
    };
  }

  if (journey.pendingRoadEvent) {
    return {
      body: `${journey.pendingRoadEvent.title} 正挡在路上。选择一个路口处理方式，结算风险、补给和路线收益后才能继续推进。`,
      label: "行动指引",
      primaryAction: "处理路口",
      title: "先处理路上事件",
      tone: "warning"
    };
  }

  if (activeNode?.type === "camp") {
    return {
      body: "营地适合修整、做饭或侦察。先处理状态和路线线索，再决定继续推进还是提前返程。",
      label: "行动指引",
      primaryAction: "选择营地行动",
      title: "利用营地调整状态",
      tone: "safe"
    };
  }

  if (activeNode?.type === "shop") {
    return {
      body: "交易点可以补给、买情报或换服务。先看随身补给和压力，再决定花哪类资源。",
      label: "行动指引",
      primaryAction: "选择交易",
      title: "处理路边交易",
      tone: "safe"
    };
  }

  if (activeNode?.type === "extraction") {
    return {
      body: "已经抵达撤离窗口。完整撤离能带回地点主体奖励和更多目标进度，也可以先确认归队清单。",
      label: "行动指引",
      primaryAction: "完成撤离",
      title: "准备归队结算",
      tone: "safe"
    };
  }

  if (activeNode?.type === "event") {
    return {
      body: `${activeNode.title} 等待选择。谨慎处理更稳，强行处理更快但压力更高。`,
      label: "行动指引",
      primaryAction: "选择事件行动",
      title: "处理当前事件",
      tone: "warning"
    };
  }

  return {
    body: "确认行军计划、下一段战术和随身补给后，推进下一段路线；状态吃紧时可以提前返程。",
    label: "行动指引",
    primaryAction: "继续行军",
    title: "推进下一段路线",
    tone: "safe"
  };
}

function nodeTypeLabel(type?: JourneyNode["type"]): string {
  if (!type) {
    return "路线";
  }

  const labels: Record<JourneyNode["type"], string> = {
    camp: "营地",
    combat: "战斗",
    event: "事件",
    extraction: "撤离",
    shop: "商店"
  };
  return labels[type];
}

function roadEventLabel(tone: JourneyRoadEventTone): string {
  if (tone === "road") {
    return "路口";
  }

  const labels: Record<Exclude<JourneyRoadEventTone, "road">, string> = {
    find: "路上发现",
    hazard: "路上险情"
  };
  return labels[tone];
}

function nodeToneForDigest(type?: JourneyNode["type"]): JourneyProcessStepTone {
  const tones: Record<JourneyNode["type"], JourneyProcessStepTone> = {
    camp: "safe",
    combat: "warning",
    event: "neutral",
    extraction: "safe",
    shop: "safe"
  };
  return type ? tones[type] : "neutral";
}

function roadToneForDigest(tone: JourneyRoadEventTone): JourneyProcessStepTone {
  const tones: Record<JourneyRoadEventTone, JourneyProcessStepTone> = {
    find: "safe",
    hazard: "danger",
    road: "warning"
  };
  return tones[tone];
}

export type JourneyCombatActionPreview = {
  action: CombatAction;
  actorName: string;
  cost: string;
  counterTag: "Counter" | "Risk" | "Standard";
  effect: string;
  label: string;
  risk: string;
  strain: number;
};

export type JourneyCombatThreatPreview = {
  counterActions: CombatAction[];
  counterLabels: string[];
  incomingDamage: number;
  intentLabel: string;
  pressureDamage: number;
  pulseLabel: string;
  riskyActions: CombatAction[];
  riskyLabels: string[];
  roundLabel: string;
  summary: string;
  warning: string;
};

export type JourneyCombatRoundPlan = {
  action: CombatAction;
  label: string;
  reason: string;
  riskText: string;
  tone: "safe" | "warning";
};

type JourneyEventTemplate = {
  body: string;
  careful: Omit<JourneyChoice, "reward"> & { rewardKeys: ResourceKey[] };
  force: Omit<JourneyChoice, "reward"> & { rewardKeys: ResourceKey[] };
  title: string;
};

type EnemyTemplate = Omit<JourneyEnemy, "reward"> & {
  rewardKeys: ResourceKey[];
};

type ShopTemplate = Omit<MaterializedLegacyShop, "reward"> & {
  rewardKeys: ResourceKey[];
};

type JourneyRoadBeatTemplate = {
  fatigue: number;
  hazardLog: string;
  hunger: number;
  mitigationLog: string;
  neutralLog: string;
  opportunityLog: string;
  pressure: number;
  rewardKeys: ResourceKey[];
  rollShift: number;
  supplyPriority: ResourceKey[];
  thirst: number;
  title: string;
};

type RoadHardship = JourneyHardship & {
  battleScar: boolean;
  fatigueDelta: number;
  pressureDelta: number;
  rollShiftDelta: number;
  score: number;
};

const familyEvents: Record<LocationFamily, JourneyEventTemplate[]> = {
  resources: [
    {
      title: "闸门绕行",
      body: "一扇检修闸半开着，只要队伍愿意放慢速度，就能从缝里钻过去。",
      careful: {
        fallbackLog: "队伍摸索着记录闸门结构，但口渴让每一次停顿都显得更响。",
        label: "测绘闸门",
        pressure: -11,
        rewardKeys: ["water", "materials"],
        rollShift: -0.11,
        successLog: "队伍花掉一次补水停顿测绘闸门，并标出更安全的回撤线。",
        supplyPriority: ["water", "food"]
      },
      force: {
        fallbackLog: "队伍硬拧生锈闸门，金属尖叫声传得太远。",
        label: "强行开闸",
        pressure: 9,
        rewardKeys: ["materials"],
        rollShift: 0.09,
        successLog: "一轮弹药打断锁舌，在噪音扩散前解决了阻碍。",
        supplyPriority: ["ammo", "fuel"]
      }
    },
    {
      title: "泵房储物柜",
      body: "检修柜里封着有用的东西，但房间正在一点点灌满坏空气。",
      careful: {
        fallbackLog: "他们慢慢撬开储物柜，咳着嗽把补给翻出来。",
        label: "先通风",
        pressure: -8,
        rewardKeys: ["materials", "medicine"],
        rollShift: -0.08,
        successLog: "燃料让排风扇多撑了一会儿，搜索过程干净许多。",
        supplyPriority: ["fuel", "water"]
      },
      force: {
        fallbackLog: "柜门被砸开了，但回声吵醒了下层的东西。",
        label: "砸开柜门",
        pressure: 11,
        rewardKeys: ["materials", "water"],
        rollShift: 0.1,
        successLog: "工具消耗换来一次快速撬锁，噪音被压在房间里。",
        supplyPriority: ["materials", "ammo"]
      }
    },
    {
      title: "沉降池吊桥",
      body: "细窄吊桥横在沉降池上，桥下的水面偶尔会自己冒出一串气泡。",
      careful: {
        fallbackLog: "队伍贴着护栏前进，鞋底沾满滑腻沉渣，速度被拖慢。",
        label: "沿护栏慢行",
        pressure: -9,
        rewardKeys: ["water", "medicine"],
        rollShift: -0.09,
        successLog: "饮水和绳扣让队伍稳住重心，顺手捞起一只密封急救盒。",
        supplyPriority: ["water", "materials"]
      },
      force: {
        fallbackLog: "队伍冲过吊桥，铁链尖叫着把整座池子都吵醒了。",
        label: "快速越桥",
        pressure: 13,
        rewardKeys: ["materials", "fuel"],
        rollShift: 0.12,
        successLog: "燃料点亮的照明弹压住了黑水里的动静，队伍抢在桥面塌陷前通过。",
        supplyPriority: ["fuel", "ammo"]
      }
    }
  ],
  urban: [
    {
      title: "公寓楼梯间",
      body: "楼梯间塞满旧家具、封死的门，以及刮进墙漆里的名字。",
      careful: {
        fallbackLog: "队伍一层层清开平台，收获物资，也烧掉了宝贵时间。",
        label: "清理平台",
        pressure: -9,
        rewardKeys: ["food", "materials"],
        rollShift: -0.09,
        successLog: "食物让清扫节奏保持稳定，楼梯间没有被惊动。",
        supplyPriority: ["food", "water"]
      },
      force: {
        fallbackLog: "他们撞开路障，下面有什么东西开始回应。",
        label: "踹开通路",
        pressure: 12,
        rewardKeys: ["materials", "ammo"],
        rollShift: 0.12,
        successLog: "弹药打断最糟糕的门铰，整栋楼还没来得及听见。",
        supplyPriority: ["ammo", "fuel"]
      }
    },
    {
      title: "诊所后台",
      body: "后台抽屉标签还在，但地板一弯，接待铃就会自己响。",
      careful: {
        fallbackLog: "抽屉一个个打开，确实有用，但慢得让人牙酸。",
        label: "逐格登记",
        pressure: -10,
        rewardKeys: ["medicine", "materials"],
        rollShift: -0.1,
        successLog: "药品被用来稳住漏液柜体，搜索才没有变成事故。",
        supplyPriority: ["medicine", "water"]
      },
      force: {
        fallbackLog: "快速抓取拿到了补给，也拉出了三声不该有的回响。",
        label: "快速搜走",
        pressure: 10,
        rewardKeys: ["medicine", "food"],
        rollShift: 0.09,
        successLog: "燃料点出的火光短暂吸引了走廊注意，队伍趁机移动。",
        supplyPriority: ["fuel", "ammo"]
      }
    },
    {
      title: "屋顶晾衣线",
      body: "几栋楼之间拉着旧晾衣线，床单在风里像信号旗一样互相告密。",
      careful: {
        fallbackLog: "队伍压低身形穿过屋顶，花了不少时间才避开松动砖面。",
        label: "低姿穿越",
        pressure: -8,
        rewardKeys: ["food", "medicine"],
        rollShift: -0.08,
        successLog: "食物分配让队伍不急着抢路，顺手取下几包被包好的药。",
        supplyPriority: ["food", "water"]
      },
      force: {
        fallbackLog: "他们剪断晾衣线开路，布片落下去的时候带走了屋里的安静。",
        label: "剪线直穿",
        pressure: 12,
        rewardKeys: ["materials", "ammo"],
        rollShift: 0.11,
        successLog: "弹药吓退了楼下的动静，队伍趁乱拆下几段可用线缆。",
        supplyPriority: ["ammo", "materials"]
      }
    }
  ],
  weird: [
    {
      title: "听声藤蔓",
      body: "植物会朝声音弯过去，连耳语都像是在喂它们。",
      careful: {
        fallbackLog: "队伍用口型传话采集样本，神经被一点点磨薄。",
        label: "无声穿行",
        pressure: -7,
        rewardKeys: ["medicine", "food"],
        rollShift: -0.1,
        successLog: "倒进根部的水让藤蔓分了心。",
        supplyPriority: ["water", "medicine"]
      },
      force: {
        fallbackLog: "队伍砍出一条路，温室记住了他们的名字。",
        label: "砍开通路",
        pressure: 15,
        rewardKeys: ["food", "medicine"],
        rollShift: 0.14,
        successLog: "燃料火焰烧出一条短而难看的通道。",
        supplyPriority: ["fuel", "ammo"]
      }
    },
    {
      title: "镜面走廊",
      body: "走廊里的倒影总慢半拍，像建筑需要时间把队伍重新编出来。",
      careful: {
        fallbackLog: "他们用粉尘标出真实路线，顺手回收了一点材料。",
        label: "标记真实",
        pressure: -8,
        rewardKeys: ["materials", "medicine"],
        rollShift: -0.11,
        successLog: "药品让发抖的手稳住，足够标出安全镜面。",
        supplyPriority: ["medicine", "food"]
      },
      force: {
        fallbackLog: "他们砸碎假镜面，真正的镜面稍后才开始尖叫。",
        label: "砸碎镜面",
        pressure: 14,
        rewardKeys: ["materials", "ammo"],
        rollShift: 0.13,
        successLog: "弹药在错误倒影走出来前击碎了它。",
        supplyPriority: ["ammo", "fuel"]
      }
    },
    {
      title: "倒置候诊区",
      body: "椅子固定在天花板上，排号屏倒着滚动，每个号码都像刚念过你的名字。",
      careful: {
        fallbackLog: "队伍闭眼数步，靠触感绕开错位家具，精神被磨得发紧。",
        label: "闭眼数步",
        pressure: -6,
        rewardKeys: ["medicine", "materials"],
        rollShift: -0.1,
        successLog: "药品压住了眩晕，队伍把真正落在地上的柜门标了出来。",
        supplyPriority: ["medicine", "water"]
      },
      force: {
        fallbackLog: "他们把排号屏砸停，号码停止后，候诊区开始直接叫人。",
        label: "砸停排号屏",
        pressure: 16,
        rewardKeys: ["ammo", "medicine"],
        rollShift: 0.15,
        successLog: "燃料烧掉了倒挂帘幕，露出一条短暂正常的通道。",
        supplyPriority: ["fuel", "ammo"]
      }
    }
  ],
  wilds: [
    {
      title: "灌溉沟",
      body: "沟渠能遮住队伍视线，但每一步都是泥和旧铁丝。",
      careful: {
        fallbackLog: "他们慢慢探泥，找到了食物，也丢掉了推进速度。",
        label: "探查泥沟",
        pressure: -10,
        rewardKeys: ["food", "water"],
        rollShift: -0.1,
        successLog: "水让队伍保持冷静，能一边探路一边避开铁丝。",
        supplyPriority: ["water", "food"]
      },
      force: {
        fallbackLog: "他们冲过沟渠，留下一条可以被追踪的痕迹。",
        label: "冲过沟渠",
        pressure: 9,
        rewardKeys: ["food", "materials"],
        rollShift: 0.08,
        successLog: "一阵燃料烟雾遮住了冲刺路线。",
        supplyPriority: ["fuel", "ammo"]
      }
    },
    {
      title: "田边小龛",
      body: "路边小龛里有新灰、罐头水果，以及突然停止的脚印。",
      careful: {
        fallbackLog: "他们留下供品，只拿不会被惦记的东西。",
        label: "留下供品",
        pressure: -9,
        rewardKeys: ["food", "medicine"],
        rollShift: -0.09,
        successLog: "留下的食物让这次交换几乎显得公平。",
        supplyPriority: ["food", "water"]
      },
      force: {
        fallbackLog: "他们搜走储藏，田野安静得像在记账。",
        label: "搜刮小龛",
        pressure: 13,
        rewardKeys: ["food", "ammo"],
        rollShift: 0.12,
        successLog: "弹药吓退了盯着小龛的东西。",
        supplyPriority: ["ammo", "fuel"]
      }
    },
    {
      title: "倒伏温棚",
      body: "塑料温棚被风压到半塌，里面的植物仍按固定间隔轻轻摆头。",
      careful: {
        fallbackLog: "队伍沿着塌棚边缘摸索，避开了大部分钩刺，也错过了最快路线。",
        label: "沿边摸索",
        pressure: -8,
        rewardKeys: ["food", "water"],
        rollShift: -0.08,
        successLog: "水让队伍能停下来分辨可食用作物，温棚没有被彻底惊动。",
        supplyPriority: ["water", "food"]
      },
      force: {
        fallbackLog: "他们从棚顶踩过去，塑料膜发出的裂响传得很远。",
        label: "踏棚直过",
        pressure: 11,
        rewardKeys: ["food", "materials"],
        rollShift: 0.1,
        successLog: "燃料烟雾遮住了队伍，留下的棚架还能拆成材料。",
        supplyPriority: ["fuel", "materials"]
      }
    }
  ]
};

const familyEnemies: Record<LocationFamily, EnemyTemplate[]> = {
  resources: [
    {
      armor: 2,
      attackBonus: 0,
      hpBonus: 2,
      intro: "检修服里的东西拖着扳手，一步一声铁响。",
      name: "阀门尸",
      rewardKeys: ["materials"],
      trait: "armored",
      traitLabel: "装甲",
      traitText: "除非用弹药或战术暴露弱点，否则会削减攻击伤害。"
    },
    {
      armor: 1,
      attackBonus: 1,
      hpBonus: 5,
      intro: "一团潮湿电缆突然抽动，像被人从梦里拽醒。",
      name: "缆线巢",
      rewardKeys: ["water", "materials"],
      trait: "bleeder",
      traitLabel: "锯齿",
      traitText: "命中会留下持续流血，直到包扎处理。"
    },
    {
      armor: 0,
      attackBonus: 3,
      hpBonus: 4,
      intro: "排水渠里浮出一张没有五官的水膜，贴着地面向队伍滑来。",
      name: "浮膜饥影",
      rewardKeys: ["water", "medicine"],
      trait: "dread",
      traitLabel: "惊惧",
      traitText: "若没有防守，每次命中都会增加压力。"
    }
  ],
  urban: [
    {
      armor: 0,
      attackBonus: 2,
      hpBonus: 3,
      intro: "走廊里的成群影子先听见了队伍。",
      name: "走廊群",
      rewardKeys: ["ammo"],
      trait: "swarm",
      traitLabel: "成群",
      traitText: "压力越高，反击越凶。"
    },
    {
      armor: 1,
      attackBonus: 1,
      hpBonus: 7,
      intro: "上锁病区里并没有空到让人放心。",
      name: "病区看守",
      rewardKeys: ["medicine"],
      trait: "armored",
      traitLabel: "装甲",
      traitText: "除非用弹药或战术暴露弱点，否则会削减攻击伤害。"
    },
    {
      armor: 0,
      attackBonus: 2,
      hpBonus: 5,
      intro: "楼梯拐角的旧保洁车自己转了出来，拖把头像湿冷的手。",
      name: "拖把车残响",
      rewardKeys: ["materials", "medicine"],
      trait: "bleeder",
      traitLabel: "锯齿",
      traitText: "命中会留下持续流血，直到包扎处理。"
    }
  ],
  weird: [
    {
      armor: 0,
      attackBonus: 3,
      hpBonus: 4,
      intro: "影子比主人早半步抵达。",
      name: "借影",
      rewardKeys: ["medicine", "materials"],
      trait: "dread",
      traitLabel: "惊惧",
      traitText: "若没有防守，每次命中都会增加压力。"
    },
    {
      armor: 2,
      attackBonus: 2,
      hpBonus: 8,
      intro: "房间折成了一个棱角过多的东西。",
      name: "玻璃圣徒",
      rewardKeys: ["food", "medicine"],
      trait: "dread",
      traitLabel: "惊惧",
      traitText: "若没有防守，每次命中都会增加压力。"
    },
    {
      armor: 0,
      attackBonus: 2,
      hpBonus: 6,
      intro: "一群纸面人从病历夹里站起来，边缘锋利得像刚裁开的纸。",
      name: "纸面人群",
      rewardKeys: ["materials", "ammo"],
      trait: "swarm",
      traitLabel: "成群",
      traitText: "压力越高，反击越凶。"
    }
  ],
  wilds: [
    {
      armor: 0,
      attackBonus: 0,
      hpBonus: 4,
      intro: "稻草人从杆上落下，跑得别扭，但很快。",
      name: "奔跑稻草人",
      rewardKeys: ["food"],
      trait: "swarm",
      traitLabel: "成群",
      traitText: "压力越高，反击越凶。"
    },
    {
      armor: 2,
      attackBonus: 1,
      hpBonus: 6,
      intro: "田地下的东西像犁一样拱过来。",
      name: "潜土者",
      rewardKeys: ["food", "materials"],
      trait: "bleeder",
      traitLabel: "锯齿",
      traitText: "命中会留下持续流血，直到包扎处理。"
    },
    {
      armor: 1,
      attackBonus: 3,
      hpBonus: 5,
      intro: "一具挂满风铃和鸟骨的稻草人转过头，风声突然有了牙。",
      name: "风铃稻草人",
      rewardKeys: ["food", "ammo"],
      trait: "dread",
      traitLabel: "惊惧",
      traitText: "若没有防守，每次命中都会增加压力。"
    }
  ]
};

const familyShops: Record<LocationFamily, ShopTemplate[]> = {
  resources: [
    {
      costPriority: ["materials", "fuel"],
      failLog: "没有能交易的东西了，修路人合上工具包。",
      label: "买修理包",
      pressureFail: 3,
      pressureSuccess: -6,
      rewardKeys: ["medicine", "ammo"],
      rollShiftFail: 0.03,
      rollShiftSuccess: -0.06,
      successLog: "修路人用一套野外工具和几枚子弹换走了材料。"
    },
    {
      costPriority: ["water", "ammo"],
      failLog: "水渠边的换货人把桶盖扣紧，表示空手的人只能听水声。",
      label: "换水渠通行牌",
      pressureFail: 4,
      pressureSuccess: -5,
      rewardKeys: ["water", "fuel"],
      rollShiftFail: 0.04,
      rollShiftSuccess: -0.05,
      successLog: "换货人收下补给，递来一块还带着湿气的通行牌和燃料瓶。"
    }
  ],
  urban: [
    {
      costPriority: ["medicine", "food", "materials"],
      failLog: "跑腿人不收承诺，转身消失在楼上。",
      label: "和跑腿人交易",
      pressureFail: 4,
      pressureSuccess: -7,
      rewardKeys: ["ammo", "fuel"],
      rollShiftFail: 0.04,
      rollShiftSuccess: -0.07,
      successLog: "跑腿人卖出一段捷径口令和一卷弹药。"
    },
    {
      costPriority: ["food", "ammo"],
      failLog: "楼顶电台里的人沉默了，只留下越来越近的杂音。",
      label: "请楼顶电台报路",
      pressureFail: 5,
      pressureSuccess: -8,
      rewardKeys: ["fuel", "materials"],
      rollShiftFail: 0.05,
      rollShiftSuccess: -0.08,
      successLog: "楼顶电台给出一条避开主街的撤离口令，还送下一包旧线圈。"
    }
  ],
  weird: [
    {
      costPriority: ["water", "medicine", "fuel"],
      failLog: "戴面具的摊主歪了歪头，改向队伍收取坏运气。",
      label: "付给面具摊主",
      pressureFail: 6,
      pressureSuccess: -8,
      rewardKeys: ["medicine", "materials"],
      rollShiftFail: 0.06,
      rollShiftSuccess: -0.08,
      successLog: "面具摊主收下供品，指向真正的出口。"
    },
    {
      costPriority: ["medicine", "materials"],
      failLog: "镜中售货员笑着把价签翻面，价格变成队伍刚好没有的东西。",
      label: "向镜中售货员买路",
      pressureFail: 7,
      pressureSuccess: -9,
      rewardKeys: ["medicine", "ammo"],
      rollShiftFail: 0.07,
      rollShiftSuccess: -0.09,
      successLog: "镜中售货员把药品收进反光里，吐出一段不会重复的路线。"
    }
  ],
  wilds: [
    {
      costPriority: ["food", "water", "materials"],
      failLog: "田边商贩耸耸肩：没有交换，就没有地图。",
      label: "在田边车摊换货",
      pressureFail: 2,
      pressureSuccess: -5,
      rewardKeys: ["medicine", "fuel"],
      rollShiftFail: 0.02,
      rollShiftSuccess: -0.05,
      successLog: "田边商贩标出一条干路，递来一只包好的瓶子。"
    },
    {
      costPriority: ["materials", "fuel"],
      failLog: "谷仓门后的声音说：没有垫脚石，就别问河怎么过。",
      label: "向谷仓守夜人换船桨",
      pressureFail: 3,
      pressureSuccess: -6,
      rewardKeys: ["food", "water"],
      rollShiftFail: 0.03,
      rollShiftSuccess: -0.06,
      successLog: "守夜人收下零件，交出一支短船桨和一袋压缩饼。"
    }
  ]
};

const familyCamps: Record<LocationFamily, { body: string; title: string }> = {
  resources: {
    body: "干燥的检修凹室给了队伍十分钟安静，直到管道重新开始敲响。",
    title: "泵站休整点"
  },
  urban: {
    body: "锁上的教室里还有桌椅、窗帘，以及一扇能顶住的门。",
    title: "教室营地"
  },
  weird: {
    body: "一圈冷瓷砖拒绝产生回声。它可能安全，也可能只是礼貌地听着。",
    title: "静瓷营地"
  },
  wilds: {
    body: "旧篷布搭出的防风处能把队伍藏离道路，但烟很容易被看见。",
    title: "田野挡风处"
  }
};

const familyTravelMoods: Record<LocationFamily, Array<{ body: string; title: string }>> = {
  resources: [
    {
      body: "墙后水声滴答，每一滴都让队伍重新掂量水壶。",
      title: "混凝土滴水"
    },
    {
      body: "服务地图还钉在墙上，虽然变形，但足够指引一次谨慎绕行。",
      title: "检修地图"
    },
    {
      body: "旧机器把热气吐进走廊，背包重得像锚。",
      title: "锅炉余热"
    }
  ],
  urban: [
    {
      body: "空办公楼里窗玻璃一片片轻响，像有人在点名。",
      title: "窗格静电"
    },
    {
      body: "队伍穿过公寓平台，每扇关着的门后都有不同气味。",
      title: "住户长廊"
    },
    {
      body: "楼梯间标牌同时指向上下，最快路线依旧只能靠猜。",
      title: "错误楼层"
    }
  ],
  weird: [
    {
      body: "路线的回声总慢半拍，队伍只能靠眼睛移动。",
      title: "错位回声"
    },
    {
      body: "走廊反复出现同一个喷漆编号，地图不再好笑。",
      title: "循环标记"
    },
    {
      body: "墙里有个礼貌的东西在看，从不真正打断你。",
      title: "安静见证"
    }
  ],
  wilds: [
    {
      body: "田野安静到草里的靴声都像一个坏决定。",
      title: "田间静默"
    },
    {
      body: "尘土低低压在小路上，遮住栅栏、沟渠和第一块可用废料。",
      title: "干尘小路"
    },
    {
      body: "一排旧警示带在风里抽响，慢慢耗掉队伍耐心。",
      title: "胶带风"
    }
  ]
};

const familyRoadBeats: Record<LocationFamily, JourneyRoadBeatTemplate[]> = {
  resources: [
    {
      fatigue: 5,
      hazardLog: "淹水检修隧道迫使所有人把背包举过肩头。",
      hunger: 2,
      mitigationLog: "一条干净绕路让队伍避开黑水。",
      neutralLog: "队伍沿着粉笔记号穿过滴水混凝土。",
      opportunityLog: "泵柜里还有一层干燥内屉。",
      pressure: 10,
      rewardKeys: ["water", "materials"],
      rollShift: 0.08,
      supplyPriority: ["fuel", "materials", "water"],
      thirst: 9,
      title: "淹水下穿道"
    },
    {
      fatigue: 4,
      hazardLog: "压力阀崩开，滚烫雾气横扫路线。",
      hunger: 1,
      mitigationLog: "及时支撑让阀门故障只变成一阵吵闹。",
      neutralLog: "旧阀门像时钟一样滴答，队伍贴墙通过。",
      opportunityLog: "破裂管汇咳出几件可用接头。",
      pressure: 8,
      rewardKeys: ["materials", "fuel"],
      rollShift: 0.06,
      supplyPriority: ["materials", "ammo"],
      thirst: 5,
      title: "阀门爆裂"
    },
    {
      fatigue: 3,
      hazardLog: "干涸水池反射了太多声音，引来远处栈桥的注意。",
      hunger: 3,
      mitigationLog: "队伍压低脚步横穿过去，没有留下回声轨迹。",
      neutralLog: "水池已经空了，但每次鞋底摩擦都像借来的声音。",
      opportunityLog: "水池梯下挂着一个检修篮。",
      pressure: 9,
      rewardKeys: ["ammo", "medicine"],
      rollShift: 0.07,
      supplyPriority: ["ammo", "fuel"],
      thirst: 4,
      title: "回声水池"
    },
    {
      fatigue: 5,
      hazardLog: "过滤塔里积满灰白絮团，呼吸声会把它们从滤网上震下来。",
      hunger: 1,
      mitigationLog: "队伍先封住通风格栅，再让过滤塔慢慢沉回安静。",
      neutralLog: "过滤塔像一只没睡醒的肺，隔几秒就吸一次冷风。",
      opportunityLog: "维护夹层里还挂着几包干净滤芯。",
      pressure: 10,
      rewardKeys: ["medicine", "materials"],
      rollShift: 0.08,
      supplyPriority: ["medicine", "materials", "water"],
      thirst: 6,
      title: "滤塔白絮"
    },
    {
      fatigue: 4,
      hazardLog: "备用发电间突然亮起，所有影子都被拖到同一个方向。",
      hunger: 2,
      mitigationLog: "队伍按顺序拔掉负载，让灯光熄灭得像一次正常检修。",
      neutralLog: "发电机低声转着，地上散着标号褪色的保险丝。",
      opportunityLog: "电柜底部还有一罐没挥发完的燃料。",
      pressure: 9,
      rewardKeys: ["fuel", "ammo"],
      rollShift: 0.07,
      supplyPriority: ["fuel", "materials"],
      thirst: 4,
      title: "备用发电间"
    }
  ],
  urban: [
    {
      fatigue: 6,
      hazardLog: "楼梯间塌成钢筋利齿，一段路被迫绕成三段。",
      hunger: 4,
      mitigationLog: "标记过的侧门绕开残骸，也避开了会听见他们的东西。",
      neutralLog: "路线穿过废弃办公室和折断的楼梯标牌。",
      opportunityLog: "清洁间里还有密封的工具箱。",
      pressure: 11,
      rewardKeys: ["materials", "medicine"],
      rollShift: 0.08,
      supplyPriority: ["materials", "fuel"],
      thirst: 4,
      title: "坍塌楼梯间"
    },
    {
      fatigue: 4,
      hazardLog: "一排售货机在走廊里倾倒，把整条走廊敲成饭铃。",
      hunger: 7,
      mitigationLog: "队伍慢慢顶住机器，把噪音压在原地。",
      neutralLog: "旧零食包装在黑暗走廊里被踩得沙沙作响。",
      opportunityLog: "一列售货机里还卡着几包能用的东西。",
      pressure: 9,
      rewardKeys: ["food", "water"],
      rollShift: 0.06,
      supplyPriority: ["materials", "ammo"],
      thirst: 3,
      title: "售货机排"
    },
    {
      fatigue: 5,
      hazardLog: "密封公寓开门时吐出霉味和恐慌。",
      hunger: 2,
      mitigationLog: "滤芯和慢速搜索让房间没有恶化成事故。",
      neutralLog: "队伍经过一扇又一扇被刮掉姓名的门。",
      opportunityLog: "有人把小急救卷藏在全家福后面。",
      pressure: 10,
      rewardKeys: ["medicine", "ammo"],
      rollShift: 0.08,
      supplyPriority: ["medicine", "fuel"],
      thirst: 5,
      title: "密封公寓"
    },
    {
      fatigue: 4,
      hazardLog: "地下商场的卷帘门一扇接一扇抖动，像有人在里面试钥匙。",
      hunger: 5,
      mitigationLog: "队伍用支架固定门片，把整条通道变成一段可控噪音。",
      neutralLog: "商场导视牌还亮着半行字，箭头全指向已经封住的扶梯。",
      opportunityLog: "收银台下的应急箱还没被翻空。",
      pressure: 10,
      rewardKeys: ["food", "materials"],
      rollShift: 0.08,
      supplyPriority: ["materials", "fuel"],
      thirst: 3,
      title: "地下商场"
    },
    {
      fatigue: 5,
      hazardLog: "公交总站的报站器突然开始倒数，站台深处有脚步跟着变快。",
      hunger: 3,
      mitigationLog: "队伍剪断报站器电源，把追来的节奏掐在广播里。",
      neutralLog: "废弃公交横在站台间，车窗里贴着褪色路线图。",
      opportunityLog: "调度室抽屉里压着一张还能用的油卡。",
      pressure: 12,
      rewardKeys: ["fuel", "ammo"],
      rollShift: 0.09,
      supplyPriority: ["ammo", "fuel"],
      thirst: 4,
      title: "倒计时站台"
    }
  ],
  weird: [
    {
      fatigue: 5,
      hazardLog: "走廊不断重复，队伍开始数不清自己的脚步。",
      hunger: 3,
      mitigationLog: "烧焦标记在循环变成第二段记忆前把它切断。",
      neutralLog: "墙壁向内倾斜，又假装无事发生。",
      opportunityLog: "错误转角露出一包干净塑料包好的缓存。",
      pressure: 12,
      rewardKeys: ["medicine", "materials"],
      rollShift: 0.1,
      supplyPriority: ["fuel", "materials"],
      thirst: 5,
      title: "重复走廊"
    },
    {
      fatigue: 4,
      hazardLog: "地板下的合唱太快学会了队员的名字。",
      hunger: 2,
      mitigationLog: "一阵噪音扰乱合唱，足够队伍趁机移动。",
      neutralLog: "地板在每一步下低鸣，几乎和呼吸同拍。",
      opportunityLog: "低鸣地板下藏着一个工具舱口。",
      pressure: 13,
      rewardKeys: ["ammo", "fuel"],
      rollShift: 0.11,
      supplyPriority: ["ammo", "fuel"],
      thirst: 4,
      title: "姓名合唱"
    },
    {
      fatigue: 3,
      hazardLog: "一片玻璃孢子爆开，把银色粉尘黏上裸露皮肤。",
      hunger: 4,
      mitigationLog: "快速冲洗和扎紧袖口阻止孢子扩散。",
      neutralLog: "本该有阳光的地方漂着银尘。",
      opportunityLog: "孢床包住了一只密封医疗袋。",
      pressure: 10,
      rewardKeys: ["medicine", "water"],
      rollShift: 0.09,
      supplyPriority: ["water", "medicine"],
      thirst: 8,
      title: "玻璃孢子"
    },
    {
      fatigue: 4,
      hazardLog: "墙上画出的门忽然变深，队伍有人开始相信自己能推开它。",
      hunger: 2,
      mitigationLog: "队伍用胶带封住门缝，直到墙重新只是一面墙。",
      neutralLog: "涂鸦门安静地画在走廊尽头，门把手的位置被摸得发亮。",
      opportunityLog: "门框阴影里卡着一只写满号码的药盒。",
      pressure: 11,
      rewardKeys: ["medicine", "ammo"],
      rollShift: 0.1,
      supplyPriority: ["materials", "medicine"],
      thirst: 4,
      title: "画出来的门"
    },
    {
      fatigue: 5,
      hazardLog: "一排空病床自己排成队形，轮子在地砖上划出湿痕。",
      hunger: 3,
      mitigationLog: "队伍把床轮锁死，再从床底绕过那段移动的走廊。",
      neutralLog: "病床之间留着刚好一人宽的缝，白床单像在缓慢呼吸。",
      opportunityLog: "床头柜里留着一卷未拆封的纱布和几颗子弹。",
      pressure: 12,
      rewardKeys: ["medicine", "ammo"],
      rollShift: 0.11,
      supplyPriority: ["ammo", "medicine"],
      thirst: 5,
      title: "排队病床"
    }
  ],
  wilds: [
    {
      fatigue: 6,
      hazardLog: "满是刺线的沟渠挂住背包，每次穿越都吵得要命。",
      hunger: 3,
      mitigationLog: "提前剪出的通道节省了时间和皮肉。",
      neutralLog: "道路消失在杂草和半埋反光桩之间。",
      opportunityLog: "灌木下的气象箱里还有干燥补给。",
      pressure: 10,
      rewardKeys: ["food", "materials"],
      rollShift: 0.07,
      supplyPriority: ["materials", "fuel"],
      thirst: 5,
      title: "刺线沟"
    },
    {
      fatigue: 4,
      hazardLog: "一群鸟从田里炸起，把远处所有脑袋都指向队伍。",
      hunger: 2,
      mitigationLog: "队伍在掩护下等待，直到田野重新平静。",
      neutralLog: "草比地图更会隐藏旧小路。",
      opportunityLog: "被遗忘的狩猎棚里还留着可用补给。",
      pressure: 11,
      rewardKeys: ["ammo", "food"],
      rollShift: 0.08,
      supplyPriority: ["fuel", "ammo"],
      thirst: 4,
      title: "惊鸟田"
    },
    {
      fatigue: 5,
      hazardLog: "溪流过点在领队脚下断裂，饮水包被浸湿。",
      hunger: 3,
      mitigationLog: "绳线让渡溪干净又迅速。",
      neutralLog: "溪水很浅、很冷，也清得不正常。",
      opportunityLog: "岸边缓存被水流冲开了。",
      pressure: 9,
      rewardKeys: ["water", "medicine"],
      rollShift: 0.06,
      supplyPriority: ["materials", "water"],
      thirst: 9,
      title: "冷溪"
    },
    {
      fatigue: 5,
      hazardLog: "倒下的谷仓梁木互相支着，稍微碰错一根就会整片塌响。",
      hunger: 4,
      mitigationLog: "队伍先垫稳主梁，再把谷仓拆成可走的短通道。",
      neutralLog: "谷仓里堆着潮湿麦草和几台生锈农具。",
      opportunityLog: "梁木夹层里藏着一袋干粮和旧钉包。",
      pressure: 10,
      rewardKeys: ["food", "materials"],
      rollShift: 0.08,
      supplyPriority: ["materials", "food"],
      thirst: 3,
      title: "倒梁谷仓"
    },
    {
      fatigue: 4,
      hazardLog: "林边蜂箱传出不该有的低语，蜂群先于风发现了队伍。",
      hunger: 2,
      mitigationLog: "烟雾把蜂箱压回低语，队伍从林线边缘绕过。",
      neutralLog: "蜂箱一排排立在树影里，木牌上的字被爪痕刮掉。",
      opportunityLog: "养蜂人的工具箱里还剩一瓶药酒和几包糖块。",
      pressure: 11,
      rewardKeys: ["medicine", "food"],
      rollShift: 0.09,
      supplyPriority: ["fuel", "water"],
      thirst: 5,
      title: "低语蜂箱"
    }
  ]
};

export function createJourney(session: PlaytestSession, draft: JourneyDraft, locationId: string, readiness: number): JourneyState {
  const location = session.room.locations.find((candidate) => candidate.id === locationId);
  const family = location?.family ?? "urban";
  const event = materializeEvent(pick(familyEvents[family]));
  const enemy = materializeEnemy(pick(familyEnemies[family]));
  const shop = materializeShop(pick(familyShops[family]), family);
  const camp = familyCamps[family];

  const nodes: JourneyNode[] = [
    {
      body: `${event.body} 目标地点：${location?.name ?? "未知地点"}。`,
      careful: event.careful,
      force: event.force,
      id: "route-event",
      title: event.title,
      type: "event"
    },
    {
      body: enemy.intro,
      enemy,
      id: "route-combat",
      title: "遭遇战",
      type: "combat"
    },
    {
      body: camp.body,
      camp: createCampOptions(family),
      id: "route-camp",
      title: camp.title,
      type: "camp"
    },
    {
      body: "撤离前出现了一个临时交易点。价格取决于队伍一路上还剩下什么。",
      id: "route-shop",
      shop,
      title: "路边交易点",
      type: "shop"
    },
    {
      body: "出口已经能看见了。基地需要最后一次信号确认，才会打开接应通道。",
      id: "route-extraction",
      title: "撤离窗口",
      type: "extraction"
    }
  ];

  const support = draft.support ?? emptySupport();
  const fieldSupplies = { ...draft.loadout };
  addPartialResources(fieldSupplies, support.startingSupplies);
  const squad = session.account.survivors.filter((survivor) => draft.squadIds.includes(survivor.id));
  const burden = calculateCarryBurden(squad, fieldSupplies, support);
  const startingPressure = clampPercent((draft.risk === "cautious" ? 10 : draft.risk === "greedy" ? 28 : 18) + burden.pressurePenalty);

  return {
    battleScars: 0,
    baseCommandUses: {},
    burden,
    bonusReward: createEmptyResourceBundle(),
    combat: null,
    combatHistory: [],
    currentNodeIndex: 0,
    decisions: [],
    elapsedHours: 0,
    extractionStatus: "in-progress",
    fieldSupplies,
    id: `journey-${Date.now()}`,
    loadout: { ...draft.loadout },
    locationFamily: family,
    locationId,
    logs: [
      `路线开启：${location?.name ?? "未知地点"}，${draft.squadIds.length} 名幸存者出发。`,
      "携带物资已转为随身补给。可以在路上消耗它们降低压力，也可以留到撤离后结算。",
      `背包负重：${burden.load}/${burden.capacity}，${carryBurdenLabel(burden.tier)}${
        burden.fatiguePenalty > 0 ? `，行进疲劳 +${burden.fatiguePenalty}` : ""
      }${burden.pressurePenalty !== 0 ? `，初始压力 ${formatSignedPercent(burden.pressurePenalty)}` : ""}。`
    ],
    nodes,
    hardships: [],
    pendingCombatLoot: null,
    pendingRoadEvent: null,
    pressure: startingPressure,
    risk: draft.risk,
    rollShift: draft.risk === "cautious" ? -0.03 : draft.risk === "greedy" ? 0.05 : 0,
    roadEvents: [],
    segmentTactic: "observe",
    squadIds: [...draft.squadIds],
    condition: {
      distance: 0,
      fatigue: draft.risk === "greedy" ? 8 : draft.risk === "cautious" ? 3 : 5,
      hunger: 0,
      thirst: 0
    },
    objectiveBonus: 0,
    support,
    trophies: [],
    travelHistory: [],
    travelPlan: "steady",
    woundedSurvivorIds: []
  };
}

export function journeyContentBreadth() {
  const families = Object.keys(familyEvents) as LocationFamily[];
  return families.map((family) => ({
    camps: familyCamps[family] ? 1 : 0,
    enemies: familyEnemies[family]?.length ?? 0,
    events: familyEvents[family]?.length ?? 0,
    family,
    roadBeats: familyRoadBeats[family]?.length ?? 0,
    shops: familyShops[family]?.length ?? 0
  }));
}

export function createCombatForNode(
  node: JourneyNode | undefined,
  squad: GameState["survivors"],
  readiness: number,
  support: ExpeditionSupport = emptySupport()
): JourneyCombat | null {
  if (!node || node.type !== "combat") {
    return null;
  }

  const riskIndex = squad.length > 4 ? 2 : squad.length > 3 ? 1 : 0;
  const enemy = node.enemy ?? materializeEnemy(familyEnemies.urban[0]);
  const enemyMaxHp = 22 + riskIndex * 6 + enemy.hpBonus;
  const frontline = createCombatFrontline(squad, readiness, support);
  applyOpeningGuard(frontline, support.openingGuard ?? 0);
  const squadMaxHp = frontline.reduce((sum, combatant) => sum + combatant.maxStamina, 0);
  const intent = nextCombatIntent(enemy.trait, 1, 0);

  return {
    armor: enemy.armor,
    attack: 6 + riskIndex * 2 + enemy.attackBonus,
    bleed: 0,
    enemyHp: enemyMaxHp,
    enemyMaxHp,
    enemyName: enemy.name,
    enemyTrait: enemy.trait,
    enemyTraitLabel: enemy.traitLabel,
    enemyTraitText: enemy.traitText,
    exposed: Math.min(4, support.openingExpose ?? 0),
    intent: intent.id,
    intentLabel: intent.label,
    intentText: intent.text,
    frontline,
    reward: { ...enemy.reward },
    round: 1,
    squadHp: squadMaxHp,
    squadMaxHp,
    stagger: 0,
    tempo: 0,
    traitPulse: enemyTraitPulse(enemy.trait)
  };
}

export function combatActionPreview(journey: JourneyState, action: CombatAction, squad: Survivor[], readiness: number): JourneyCombatActionPreview | null {
  const combat = journey.combat;
  if (!combat || squad.length === 0) {
    return null;
  }

  const intent = combatIntentDetails[combat.intent] ?? combatIntentDetails.maul;
  const lead = combatActorForAction(combat, squad, "guard");
  const striker = combatActorForAction(combat, squad, "strike");
  const tactician = combatActorForAction(combat, squad, "tactic");
  const medic = combatActorForAction(combat, squad, "patch");
  const strain = combatActionStrain[action] ?? 0;
  const incoming = combat.attack + (combat.enemyTrait === "swarm" ? Math.floor(journey.pressure / 20) : 0) + intent.incoming;
  const tempoBonus = combatTempoValue(combat);

  if (action === "strike") {
    const hasAmmo = journey.fieldSupplies.ammo > 0;
    const armorPenalty = Math.max(0, combat.armor + intent.armor - combat.exposed - (hasAmmo ? 2 : 0));
    const fieldRunnerBonus = hasPerk(striker, "field_runner") ? 2 : 0;
    const interruptBonus = combat.intent === "prowl" ? 3 : 0;
    const damage = Math.max(
      3,
      Math.round(readiness / 14) +
        Math.floor(striker.attributes.agility / 18) +
        fieldRunnerBonus +
        interruptBonus +
        tempoBonus +
        (hasAmmo ? 5 + journey.support.ammoDamage : 0) -
        armorPenalty
    );
    const pulsePreview = previewWithEnemyPulse(
      combat,
      action,
      journey.pressure,
      combat.intent === "prowl" ? "Counter" : "Standard",
      combat.intent === "prowl" ? "可打断游猎，并降低反击。" : `预计反击 ${incoming}。`
    );
    return {
      action,
      actorName: striker.name,
      cost: hasAmmo ? "弹药 -1" : "没有弹药",
      counterTag: pulsePreview.counterTag,
      effect: withCombatTempoPreview(combat, action, withActionStrain(`伤害 ${damage}${armorPenalty > 0 ? `，护甲吸收 ${armorPenalty}` : ""}`, strain)),
      label: "攻击",
      risk: pulsePreview.risk,
      strain
    };
  }

  if (action === "guard") {
    const guardValue = Math.floor((lead.attributes.willpower + lead.attributes.stamina) / 30) + journey.support.guardBlock + tempoBonus;
    const windupBlock = combat.intent === "windup" ? 6 : 0;
    const blocked = Math.max(0, incoming - Math.max(1, Math.floor(incoming / 2) - guardValue - windupBlock));
    const pulsePreview = previewWithEnemyPulse(
      combat,
      action,
      journey.pressure,
      combat.intent === "windup" ? "Counter" : "Standard",
      combat.intent === "windup" ? "蓄力反击窗口。最强防守应对。" : `预计反击 ${Math.max(1, incoming - blocked)}。`
    );
    return {
      action,
      actorName: lead.name,
      cost: "无补给消耗",
      counterTag: pulsePreview.counterTag,
      effect: withCombatTempoPreview(combat, action, withActionStrain(`格挡 ${blocked}，暴露 +${combat.intent === "windup" ? 2 : 1}`, strain)),
      label: "防守",
      risk: pulsePreview.risk,
      strain
    };
  }

  if (action === "patch") {
    const hasMedicine = journey.fieldSupplies.medicine > 0;
    const steadyHandsBonus = hasPerk(medic, "steady_hands") ? 3 : 0;
    const heal = Math.floor(medic.attributes.medical / 9) + steadyHandsBonus + journey.support.patchHeal + tempoBonus * 2 + (hasMedicine ? 12 : 4);
    const bleedRelief = combat.bleed > 0 ? (hasMedicine ? 2 : 1) : 0;
    const pulsePreview = previewWithEnemyPulse(
      combat,
      action,
      journey.pressure,
      combat.intent === "prowl" ? "Risk" : "Standard",
      combat.intent === "prowl" ? "游猎会在包扎时撕开队形。" : `预计反击 ${incoming}。`
    );
    return {
      action,
      actorName: medic.name,
      cost: hasMedicine ? "药品 -1" : "没有药品",
      counterTag: pulsePreview.counterTag,
      effect: withCombatTempoPreview(combat, action, withActionStrain(`治疗 ${heal}${bleedRelief > 0 ? `，流血 -${bleedRelief}` : ""}`, strain)),
      label: "包扎",
      risk: pulsePreview.risk,
      strain
    };
  }

  if (action === "tactic") {
    const braceBreak = combat.intent === "brace" ? 2 : 0;
    const prowlRead = combat.intent === "prowl" ? 1 : 0;
    const expose = 1 + braceBreak + prowlRead + Math.floor(tempoBonus / 2) + Math.floor(tactician.attributes.technical / 35) + (hasPerk(tactician, "steady_hands") ? 1 : 0);
    const pressureDrop = Math.floor(tactician.attributes.luck / 25) + journey.support.pressureRelief + tempoBonus;
    const tacticRisk =
      combat.intent === "brace"
        ? "在护甲上升前打破架势。"
        : combat.intent === "prowl"
          ? "读出游猎并削弱反击。"
          : `预计反击 ${incoming}。`;
    const pulsePreview = previewWithEnemyPulse(
      combat,
      action,
      journey.pressure,
      combat.intent === "brace" || combat.intent === "prowl" ? "Counter" : "Standard",
      tacticRisk
    );
    return {
      action,
      actorName: tactician.name,
      cost: "无补给消耗",
      counterTag: pulsePreview.counterTag,
      effect: withCombatTempoPreview(combat, action, withActionStrain(`暴露 +${expose}，压力 -${pressureDrop}%`, strain)),
      label: "战术",
      risk: pulsePreview.risk,
      strain
    };
  }

  const retreatPreview = previewWithEnemyPulse(
    combat,
    action,
    journey.pressure,
    "Risk",
    `压力 +${Math.max(8, 18 - journey.support.pressureRelief)}%，路线继续。`
  );

  return {
    action,
    actorName: lead.name,
    cost: "无补给消耗",
    counterTag: retreatPreview.counterTag,
    effect: `脱离战斗，承受 ${Math.max(3, Math.ceil(combat.attack / 2))} 伤害`,
    label: "撤退",
    risk: retreatPreview.risk,
    strain
  };
}

type CombatReplaySnapshot = {
  enemyHp: number;
  pressure: number;
  round: number;
  squadHp: number;
  stagger: number;
  tempo: number;
};

function combatReplayActionLabel(action: CombatAction) {
  const labels: Record<CombatAction, string> = {
    guard: "防守",
    patch: "包扎",
    retreat: "撤退",
    strike: "攻击",
    tactic: "战术"
  };
  return labels[action];
}

function pushCombatRoundReplay(
  journey: JourneyState,
  combat: JourneyCombat,
  action: CombatAction,
  actorName: string,
  before: CombatReplaySnapshot,
  countered: boolean
) {
  const enemyDamage = Math.max(0, before.enemyHp - combat.enemyHp);
  const squadDamage = Math.max(0, before.squadHp - combat.squadHp);
  const pressureDelta = journey.pressure - before.pressure;
  const enemyDefeated = combat.enemyHp <= 0;
  const history = journey.combatHistory ?? [];
  const record: JourneyCombatRoundRecord = {
    actionLabel: combatReplayActionLabel(action),
    actorName,
    counterText: combatReplayCounterText(action, before, combat, countered),
    enemyText: combatReplayEnemyText(combat, action, enemyDefeated, squadDamage, pressureDelta),
    id: `combat-round-${journey.id}-${before.round}-${history.length}-${journey.logs.length}`,
    outcomeText: combatReplayOutcomeText(action, before, combat, enemyDamage),
    round: before.round,
    tone: combatReplayTone(action, countered, enemyDefeated, squadDamage, pressureDelta)
  };

  journey.combatHistory = [...history.slice(-4), record];
}

function combatReplayCounterText(action: CombatAction, before: CombatReplaySnapshot, combat: JourneyCombat, countered: boolean) {
  if (action === "retreat") {
    return "脱离接触：本回合不保留反制节奏。";
  }

  if (countered) {
    const tempoDelta = Math.max(0, combatTempoValue(combat) - before.tempo);
    const tempoText = tempoDelta > 0 ? `节奏 +${tempoDelta}` : "节奏保持满档";
    if (before.stagger + 1 >= combatStaggerBreak) {
      return `反制成功：${tempoText}，破势触发。`;
    }
    return `反制成功：${tempoText}，破势 +1。`;
  }

  const tempoLoss = Math.max(0, before.tempo - combatTempoValue(combat));
  if (tempoLoss > 0) {
    return `节奏受挫：节奏 -${tempoLoss}。`;
  }

  return "未形成反制节奏。";
}

function combatReplayEnemyText(
  combat: JourneyCombat,
  action: CombatAction,
  enemyDefeated: boolean,
  squadDamage: number,
  pressureDelta: number
) {
  if (enemyDefeated) {
    return "敌人被击退，等待战利品选择。";
  }

  if (action === "retreat") {
    return `脱离接触，队伍承受 ${squadDamage} 伤害，压力 ${formatSignedPercent(pressureDelta)}。`;
  }

  return `${combat.enemyName} 反击 ${squadDamage} 伤害，压力 ${formatSignedPercent(pressureDelta)}。`;
}

function combatReplayOutcomeText(action: CombatAction, before: CombatReplaySnapshot, combat: JourneyCombat, enemyDamage: number) {
  const enemyHp = before.enemyHp === combat.enemyHp ? `敌人 ${combat.enemyHp}/${combat.enemyMaxHp}` : `敌人 ${before.enemyHp}->${combat.enemyHp}/${combat.enemyMaxHp}`;
  const squadHp = before.squadHp === combat.squadHp ? `队伍 ${combat.squadHp}/${combat.squadMaxHp}` : `队伍 ${before.squadHp}->${combat.squadHp}/${combat.squadMaxHp}`;
  const result = enemyDamage > 0 ? `，造成 ${enemyDamage} 伤害` : "";
  return `${combatReplayActionLabel(action)}结算：${squadHp}，${enemyHp}${result}。`;
}

function combatReplayTone(
  action: CombatAction,
  countered: boolean,
  enemyDefeated: boolean,
  squadDamage: number,
  pressureDelta: number
): JourneyCombatReplayTone {
  if (enemyDefeated || (countered && squadDamage <= 4 && pressureDelta <= 0)) {
    return "safe";
  }

  if (action === "retreat" || squadDamage >= 12 || pressureDelta >= 8) {
    return "danger";
  }

  if (squadDamage > 0 || pressureDelta > 0) {
    return "warning";
  }

  return "safe";
}

export function resolveCombatRound(journey: JourneyState, action: CombatAction, squad: Survivor[], readiness: number): JourneyState {
  const node = journey.nodes[journey.currentNodeIndex];
  const next = structuredClone(journey) as JourneyState;
  const combat = next.combat;
  if (!combat || !node) {
    return next;
  }

  const lead = combatActorForAction(combat, squad, "guard");
  const striker = combatActorForAction(combat, squad, "strike");
  const tactician = combatActorForAction(combat, squad, "tactic");
  const medic = combatActorForAction(combat, squad, "patch");
  const beforeRound: CombatReplaySnapshot = {
    enemyHp: combat.enemyHp,
    pressure: next.pressure,
    round: combat.round,
    squadHp: combat.squadHp,
    stagger: combatStaggerValue(combat),
    tempo: combatTempoValue(combat)
  };
  const wasCountered = action !== "retreat" && (combatIntentCountersAction(combat, action) || enemyPulseCountersAction(combat, action));
  let actionActorId: string | null = null;
  let replayActorName = lead.name;

  if (action === "retreat") {
    applyCombatDamage(next, combat, Math.max(3, Math.ceil(combat.attack / 2)), lead.id);
    const retreatPressure = Math.max(8, 18 - next.support.pressureRelief);
    next.pressure = clampPercent(next.pressure + retreatPressure);
    next.rollShift += retreatPressure / 100;
    next.logs.push(`${node.title}：队伍顶着压力撤退，全队体力受损，压力 +${retreatPressure}%。`);
    pushCombatRoundReplay(next, combat, action, replayActorName, beforeRound, wasCountered);
    next.currentNodeIndex += 1;
    next.combat = createCombatForNode(next.nodes[next.currentNodeIndex], squad, readiness, next.support);
    return next;
  }

  const intent = combatIntentDetails[combat.intent] ?? combatIntentDetails.maul;
  let incoming = combat.attack + (combat.enemyTrait === "swarm" ? Math.floor(next.pressure / 20) : 0) + intent.incoming;
  const pressureLog: string[] = [];
  const counterLog: string[] = [];
  const tempoBonus = combatTempoValue(combat);
  let patchedThisRound = false;
  let incomingFocusId: string | null = striker.id;

  if (action === "strike") {
    actionActorId = striker.id;
    replayActorName = striker.name;
    markCombatantAction(combat, striker.id, "攻击");
    const ammoSpent = spendFieldSupply(next, "ammo", 1);
    const armorPenalty = Math.max(0, combat.armor + intent.armor - combat.exposed - (ammoSpent ? 2 : 0));
    const fieldRunnerBonus = hasPerk(striker, "field_runner") ? 2 : 0;
    const interruptBonus = combat.intent === "prowl" ? 3 : 0;
    const damage = Math.max(
      3,
      Math.round(readiness / 14) +
        Math.floor(striker.attributes.agility / 18) +
        fieldRunnerBonus +
        interruptBonus +
        tempoBonus +
        (ammoSpent ? 5 + next.support.ammoDamage : 0) -
        armorPenalty
    );
    if (combat.intent === "prowl") {
      incoming = Math.max(1, incoming - 3);
      counterLog.push("攻击打断游猎");
    }
    combat.enemyHp = Math.max(0, combat.enemyHp - damage);
    next.logs.push(
      `${node.title}：第 ${combat.round} 回合，${striker.name} 发起攻击，造成 ${damage} 伤害${ammoSpent ? "，弹药 -1" : ""}${
        armorPenalty > 0 ? `（${combat.enemyTraitLabel} 吸收 ${armorPenalty}）` : ""
      }${counterLog.length ? `，${counterLog.join("，")}` : ""}。`
    );
  } else if (action === "guard") {
    actionActorId = lead.id;
    replayActorName = lead.name;
    markCombatantAction(combat, lead.id, "防守");
    const guardValue = Math.floor((lead.attributes.willpower + lead.attributes.stamina) / 30) + next.support.guardBlock + tempoBonus;
    const windupBlock = combat.intent === "windup" ? 6 : 0;
    incoming = Math.max(1, Math.floor(incoming / 2) - guardValue - windupBlock);
    braceCombatant(combat, lead.id, guardValue + windupBlock + 2);
    incomingFocusId = lead.id;
    combat.exposed = Math.min(3, combat.exposed + 1);
    if (combat.intent === "windup") {
      combat.exposed = Math.min(4, combat.exposed + 1);
      counterLog.push("防守抓住蓄力窗口");
    }
    next.pressure = clampPercent(next.pressure - 3);
    next.rollShift -= 0.02;
    next.logs.push(
      `${node.title}：第 ${combat.round} 回合，${lead.name} 稳住防线。来袭伤害降低，敌人暴露 +${combat.intent === "windup" ? 2 : 1}，压力 -3%${
        counterLog.length ? `，${counterLog.join("，")}` : ""
      }。`
    );
  } else if (action === "patch") {
    actionActorId = medic.id;
    replayActorName = medic.name;
    markCombatantAction(combat, medic.id, "包扎");
    patchedThisRound = true;
    const medicineSpent = spendFieldSupply(next, "medicine", 1);
    const steadyHandsBonus = hasPerk(medic, "steady_hands") ? 3 : 0;
    const heal = Math.floor(medic.attributes.medical / 9) + steadyHandsBonus + next.support.patchHeal + tempoBonus * 2 + (medicineSpent ? 12 : 4);
    const patient = healWeakestCombatant(combat, heal, medic.id);
    if (combat.bleed > 0) {
      combat.bleed = Math.max(0, combat.bleed - (medicineSpent ? 2 : 1));
    }
    if (combat.intent === "prowl") {
      incoming += 4;
      next.pressure = clampPercent(next.pressure + 3);
      counterLog.push("游猎中包扎会撕开队形");
    }
    next.rollShift -= medicineSpent ? 0.02 : 0.01;
    next.logs.push(
      `${node.title}：第 ${combat.round} 回合，${medic.name} 为 ${patient?.name ?? "队形"} 包扎，恢复 ${heal} 体力${
        medicineSpent ? "，药品 -1" : ""
      }${
        counterLog.length ? `，${counterLog.join("，")}` : ""
      }。`
    );
  } else if (action === "tactic") {
    actionActorId = tactician.id;
    replayActorName = tactician.name;
    markCombatantAction(combat, tactician.id, "战术");
    const braceBreak = combat.intent === "brace" ? 2 : 0;
    const prowlRead = combat.intent === "prowl" ? 1 : 0;
    const expose = 1 + braceBreak + prowlRead + Math.floor(tempoBonus / 2) + Math.floor(tactician.attributes.technical / 35) + (hasPerk(tactician, "steady_hands") ? 1 : 0);
    combat.exposed = Math.min(4, combat.exposed + expose);
    if (combat.intent === "brace") {
      incoming = Math.max(1, incoming - 2);
      counterLog.push("战术打破架势");
    }
    if (combat.intent === "prowl") {
      incoming = Math.max(1, incoming - 4);
      counterLog.push("战术读出游猎");
    }
    next.pressure = clampPercent(next.pressure - Math.floor(tactician.attributes.luck / 25) - next.support.pressureRelief - tempoBonus);
    next.rollShift -= 0.04;
    next.logs.push(
      `${node.title}：第 ${combat.round} 回合，${tactician.name} 读出节奏。敌人暴露 +${expose}，压力缓和${
        counterLog.length ? `，${counterLog.join("，")}` : ""
      }。`
    );
  }

  if (actionActorId) {
    applyCombatActionStrain(next, combat, actionActorId, combatActionStrain[action] ?? 0, action);
  }

  if (combat.enemyHp > 0) {
    incoming = applyCombatTempoResult(next, combat, action, incoming, node.title);
  }

  if (combat.enemyHp > 0) {
    const traitPulseLog: string[] = [];
    const traitPulseCountered = enemyPulseCountersAction(combat, action);

    if (combat.enemyTrait === "armored") {
      if (traitPulseCountered) {
        traitPulseLog.push("特性反制：甲壳闭锁维持打开。");
      } else if (combat.exposed <= 0) {
        combat.armor = Math.min(6, combat.armor + 1);
        traitPulseLog.push("特性脉冲：甲壳闭锁使护甲 +1。");
      }
    }

    if (combat.enemyTrait === "swarm") {
      const pressureDamage = Math.floor(next.pressure / 20);
      if (traitPulseCountered && pressureDamage > 0) {
        incoming = Math.max(1, incoming - Math.min(4, pressureDamage));
        next.pressure = clampPercent(next.pressure - 2);
        next.rollShift -= 0.02;
        traitPulseLog.push("特性反制：群体压迫在扑上来前被分割。");
      } else if (pressureDamage > 0) {
        next.pressure = clampPercent(next.pressure + 3);
        next.rollShift += 0.02;
        traitPulseLog.push(`特性脉冲：群体压迫把路线热度转成反击 +${pressureDamage}，压力 +3%。`);
      }
    }

    if (combat.enemyTrait === "dread") {
      if (traitPulseCountered) {
        next.pressure = clampPercent(next.pressure - 2);
        next.rollShift -= 0.02;
        traitPulseLog.push("特性反制：黑色信号被接地。");
      } else {
        next.pressure = clampPercent(next.pressure + 5);
        next.rollShift += 0.04;
        pressureLog.push("压力 +5%");
        traitPulseLog.push("特性脉冲：黑色信号推动压力 +5%。");
      }
    }

    if (combat.bleed > 0) {
      applyCombatDamage(next, combat, combat.bleed, incomingFocusId);
      pressureLog.push(`流血造成 ${combat.bleed}`);
    }

    const counterSpread = applyCombatCounterDamage(next, combat, incoming, incomingFocusId, action);
    if (counterSpread) {
      pressureLog.push("队形分担");
    }
    if (combat.enemyTrait === "bleeder") {
      if (traitPulseCountered || patchedThisRound) {
        traitPulseLog.push("特性反制：裂伤被控制。");
      } else {
        combat.bleed = Math.min(6, combat.bleed + 2);
        pressureLog.push("流血 +2");
        traitPulseLog.push("特性脉冲：裂伤在包扎前增加流血 +2。");
      }
    }
    if (combat.intent === "windup" && action !== "guard") {
      next.pressure = clampPercent(next.pressure + 4);
      next.rollShift += 0.03;
      pressureLog.push("蓄力压力 +4%");
    }

    if (traitPulseLog.length > 0) {
      next.logs.push(`${node.title}：${traitPulseLog.join(" ")}`);
    }
    next.logs.push(`${combat.enemyName} 反击，造成 ${incoming} 伤害${pressureLog.length ? `（${pressureLog.join("，")}）` : ""}。`);
    if (combat.squadHp <= 0) {
      next.pressure = clampPercent(next.pressure + 24);
      next.rollShift += 0.24;
      next.logs.push(`${node.title}：队伍勉强脱离接触，状态很差。结算压力 +24%。`);
      next.currentNodeIndex += 1;
      next.combat = createCombatForNode(next.nodes[next.currentNodeIndex], squad, readiness, next.support);
    } else {
      combat.round += 1;
      combat.exposed = Math.max(0, combat.exposed - 1);
      const nextIntent = nextCombatIntent(combat.enemyTrait, combat.round, next.pressure);
      combat.intent = nextIntent.id;
      combat.intentLabel = nextIntent.label;
      combat.intentText = nextIntent.text;
    }
  } else {
    addResources(next.bonusReward, combat.reward);
    const hpRatio = combat.squadHp / combat.squadMaxHp;
    const trophy = combatTrophyFor(combat.enemyTrait);
    next.trophies.push(trophy);
    if (hpRatio < 0.35) {
      next.battleScars += 2;
      markCombatScarTargetsFromFrontline(next, combat, 2);
      next.condition.fatigue = clampPercent(next.condition.fatigue + 14);
      next.pressure = clampPercent(next.pressure + 8);
      next.rollShift += 0.08;
      next.logs.push(`${node.title}：胜得很难看。战斗伤痕 +2，疲劳 +14，压力 +8%。`);
    } else if (hpRatio < 0.65) {
      next.battleScars += 1;
      markCombatScarTargetsFromFrontline(next, combat, 1);
      next.condition.fatigue = clampPercent(next.condition.fatigue + 7);
      next.logs.push(`${node.title}：队伍赢了，但几乎是互相拖着离开。战斗伤痕 +1，疲劳 +7。`);
    } else {
      next.bonusReward.materials += 1;
      next.logs.push(`${node.title}：战斗控制干净，队伍有时间额外拆解。材料 +1。`);
    }
    next.pressure = clampPercent(next.pressure - 12);
    next.rollShift -= 0.12;
    next.logs.push(`${node.title}：${combat.enemyName} 被击退。${formatBundle(combat.reward)}，战利标记：${trophy}，压力 -12%。`);
    next.pendingCombatLoot = {
      enemyName: combat.enemyName,
      trait: combat.enemyTrait,
      trophy
    };
    next.combat = null;
  }

  pushCombatRoundReplay(next, combat, action, replayActorName, beforeRound, wasCountered);

  return next;
}

export function advanceJourneyTravel(journey: JourneyState, squad: Survivor[], readiness: number, nextNodeIndex = journey.currentNodeIndex + 1): JourneyState {
  const next = structuredClone(journey) as JourneyState;
  const plan = travelPlanOptions[next.travelPlan] ?? travelPlanOptions.steady;
  const tactic = segmentTacticOptions[next.segmentTactic] ?? segmentTacticOptions.observe;
  const tacticOutcome = applySegmentTactic(next, tactic);
  const threat = segmentThreatFor(next);
  const threatOutcome = applySegmentThreat(next, threat, tactic.id);
  const segmentHours = segmentHoursFor(plan, tactic.id);
  const beforePressure = next.pressure;
  const riskFatigue = next.risk === "greedy" ? 12 : next.risk === "cautious" ? 6 : 9;
  const pressureFatigue = Math.floor(next.pressure / 25);
  const fieldRunnerCount = squad.filter((survivor) => hasPerk(survivor, "field_runner")).length;
  const routeSkill = Math.floor(readiness / 25) + fieldRunnerCount + tacticOutcome.routeSkill;
  const burdenFatigue = next.burden?.fatiguePenalty ?? 0;
  const fatigueGain = Math.max(2, riskFatigue + pressureFatigue + plan.fatigue + burdenFatigue + tacticOutcome.fatigue + threatOutcome.fatigue - routeSkill);
  const foodSpent = spendFieldSupply(next, "food", 1);
  const waterSpent = spendFieldSupply(next, "water", 1);
  const planSupplyResult = applyTravelPlanSupply(next, plan.id);
  const rationPressure = (foodSpent ? 0 : 8) + (waterSpent ? 0 : 10);
  const planPressure = plan.pressure + planSupplyResult.pressure + tacticOutcome.pressure + threatOutcome.pressure;

  next.condition.distance += 1;
  next.elapsedHours = journeyElapsedHours(next) + segmentHours;
  next.condition.fatigue = clampPercent(next.condition.fatigue + fatigueGain);
  next.condition.hunger = clampPercent(next.condition.hunger + (foodSpent ? -12 : 18) + plan.hunger + tacticOutcome.hunger + threatOutcome.hunger);
  next.condition.thirst = clampPercent(next.condition.thirst + (waterSpent ? -15 : 22) + plan.thirst + tacticOutcome.thirst + threatOutcome.thirst);
  next.pressure = clampPercent(next.pressure + rationPressure + planPressure + Math.floor(next.condition.fatigue / 35) - next.support.pressureRelief);
  next.rollShift += (rationPressure + planPressure) / 100 + next.condition.fatigue / 350;

  const hardshipEffects = applyRoadHardship(next, squad);
  const pressureDelta = next.pressure - beforePressure;
  const rationLog = [
    foodSpent ? "食物 -1" : "没有食物：饥饿上升",
    waterSpent ? "水 -1" : "没有水：口渴上升"
  ].join(", ");
  next.logs.push(
    `道路：路段 ${next.condition.distance}，${plan.label}，${formatHours(segmentHours)}。${rationLog}${
      planSupplyResult.log ? `, ${planSupplyResult.log}` : ""
    }。疲劳 +${fatigueGain}，压力 ${formatSignedPercent(
      rationPressure + planPressure + Math.floor(next.condition.fatigue / 35) - next.support.pressureRelief
    )}。`
  );
  next.travelHistory.push(
    createTravelRecord(next, plan, {
      effects: [
        foodSpent ? "食物 -1" : "没有食物",
        waterSpent ? "水 -1" : "没有水",
        ...(planSupplyResult.log ? [sentenceCase(planSupplyResult.log)] : []),
        ...tacticOutcome.effects,
        ...threatOutcome.effects,
        ...hardshipEffects,
        ...(burdenFatigue > 0 ? [`负重 +${burdenFatigue}`] : []),
        `疲劳 +${fatigueGain}`,
        `压力 ${formatSignedPercent(pressureDelta)}`
      ],
      hours: segmentHours,
      pressureDelta
    })
  );

  if (canReachExtractionCleanly(next, nextNodeIndex)) {
    next.currentNodeIndex = nextNodeIndex;
    next.logs.push("撤离线清晰：队伍保持队形通过最后一段，没有再被路口拖住。");
    next.segmentTactic = "observe";
    return next;
  }

  queueRoadEncounter(next, squad, plan.id, routeSkill, nextNodeIndex);

  const scavengeRoll =
    Math.random() + routeSkill * 0.04 + planScavengeBonus(plan.id) + tacticOutcome.scavengeBonus - threatOutcome.scavengePenalty - next.pressure / 250;
  if (scavengeRoll > 0.72) {
    const key = travelScavengeKeys[next.condition.distance % travelScavengeKeys.length];
    next.bonusReward[key] += 1;
    next.logs.push(`路上发现：队伍在两站之间找到一个还能用的储藏点。${resourceLabels[key]} +1。`);
  } else if (scavengeRoll < 0.12) {
    next.pressure = clampPercent(next.pressure + 6);
    next.rollShift += 0.04;
    next.logs.push("道路受阻：错误绕路拖慢了队伍，也让下一次接触更近。压力 +6%。");
  }

  next.segmentTactic = "observe";
  return next;
}

export function forecastNextSegment(journey: JourneyState, squad: Survivor[], readiness: number): JourneySegmentForecast {
  const next = structuredClone(journey) as JourneyState;
  const plan = travelPlanOptions[next.travelPlan] ?? travelPlanOptions.steady;
  const tactic = segmentTacticOptions[next.segmentTactic] ?? segmentTacticOptions.observe;
  const beforeCondition = { ...next.condition };
  const beforePressure = next.pressure;
  const tacticOutcome = applySegmentTactic(next, tactic);
  const threat = segmentThreatFor(next);
  const threatOutcome = applySegmentThreat(next, threat, tactic.id);
  const segmentHours = segmentHoursFor(plan, tactic.id);
  const riskFatigue = next.risk === "greedy" ? 12 : next.risk === "cautious" ? 6 : 9;
  const pressureFatigue = Math.floor(next.pressure / 25);
  const fieldRunnerCount = squad.filter((survivor) => hasPerk(survivor, "field_runner")).length;
  const routeSkill = Math.floor(readiness / 25) + fieldRunnerCount + tacticOutcome.routeSkill;
  const burdenFatigue = next.burden?.fatiguePenalty ?? 0;
  const fatigueGain = Math.max(2, riskFatigue + pressureFatigue + plan.fatigue + burdenFatigue + tacticOutcome.fatigue + threatOutcome.fatigue - routeSkill);
  const foodSpent = spendFieldSupply(next, "food", 1);
  const waterSpent = spendFieldSupply(next, "water", 1);
  const planSupplyResult = applyTravelPlanSupply(next, plan.id);
  const rationPressure = (foodSpent ? 0 : 8) + (waterSpent ? 0 : 10);
  const planPressure = plan.pressure + planSupplyResult.pressure + tacticOutcome.pressure + threatOutcome.pressure;

  next.condition.distance += 1;
  next.elapsedHours = journeyElapsedHours(next) + segmentHours;
  next.condition.fatigue = clampPercent(next.condition.fatigue + fatigueGain);
  next.condition.hunger = clampPercent(next.condition.hunger + (foodSpent ? -12 : 18) + plan.hunger + tacticOutcome.hunger + threatOutcome.hunger);
  next.condition.thirst = clampPercent(next.condition.thirst + (waterSpent ? -15 : 22) + plan.thirst + tacticOutcome.thirst + threatOutcome.thirst);
  next.pressure = clampPercent(next.pressure + rationPressure + planPressure + Math.floor(next.condition.fatigue / 35) - next.support.pressureRelief);

  const hardship = roadHardshipFor(next);
  if (hardship) {
    next.condition.fatigue = clampPercent(next.condition.fatigue + hardship.fatigueDelta);
    next.pressure = clampPercent(next.pressure + hardship.pressureDelta);
  }

  const pressureDelta = next.pressure - beforePressure;
  const notes = [
    ...tacticOutcome.effects,
    ...threatOutcome.effects,
    ...(hardship ? [`路况风险：${hardship.label}`] : []),
    ...(burdenFatigue > 0 ? [`负重 +${burdenFatigue}`] : []),
    ...(planSupplyResult.log ? [sentenceCase(planSupplyResult.log)] : [])
  ];

  return {
    conditionDeltas: {
      fatigue: next.condition.fatigue - beforeCondition.fatigue,
      hunger: next.condition.hunger - beforeCondition.hunger,
      thirst: next.condition.thirst - beforeCondition.thirst
    },
    hardship: hardship ? publicHardship(hardship) : null,
    hours: segmentHours,
    notes,
    planLabel: plan.label,
    pressureDelta,
    resultingCondition: { ...next.condition },
    resultingElapsedHours: journeyElapsedHours(next),
    resultingPressure: next.pressure,
    riskLevel: segmentForecastRisk(next),
    roadEventForecast: canReachExtractionCleanly(next, journey.currentNodeIndex + 1)
      ? cleanExtractionRoadForecast()
      : roadEventForecastFor(next, squad, plan.id, routeSkill, tactic.id, threat),
    segment: next.condition.distance,
    supplyUse: [foodSpent ? "食物 -1" : "没有食物", waterSpent ? "水 -1" : "没有水"],
    tacticLabel: tactic.label,
    threatLabel: threat.label
  };
}

export function baseCommandOptions(journey: Pick<JourneyState, "baseCommandUses" | "combat" | "support">): JourneyBaseCommandOption[] {
  return baseCommandDefinitions.map((definition) => {
    const maxUses = baseCommandCharges(journey.support, definition.id);
    const used = journey.baseCommandUses?.[definition.id] ?? 0;
    const remainingUses = Math.max(0, maxUses - used);
    return {
      ...definition,
      canUse: remainingUses > 0,
      effect: baseCommandEffectText(journey, definition.id),
      maxUses,
      remainingUses
    };
  });
}

export function resolveBaseCommand(journey: JourneyState, action: JourneyBaseCommandAction): JourneyState {
  const option = baseCommandOptions(journey).find((candidate) => candidate.id === action);
  if (!option?.canUse) {
    return journey;
  }

  const next = structuredClone(journey) as JourneyState;
  next.baseCommandUses = {
    ...(next.baseCommandUses ?? {}),
    [action]: (next.baseCommandUses?.[action] ?? 0) + 1
  };

  if (action === "guard-relay") {
    const guardValue = 3 + next.support.guardBlock + next.support.roadSecure;
    if (next.combat) {
      spreadCombatGuard(next.combat, guardValue);
      next.logs.push(`基地指令：守卫接力。基地守卫线掩护前排，队伍前线防护 +${guardValue}。`);
      recordJourneyDecision(next, {
        category: "base-command",
        detail: option.text,
        impacts: [`前线防护 +${guardValue}`],
        label: option.label,
        nodeTitle: "基地指令",
        tone: "safe"
      });
    } else {
      const pressureDrop = Math.max(4, guardValue * 2);
      next.pressure = clampPercent(next.pressure - pressureDrop);
      next.logs.push(`基地指令：守卫接力。门口小队为出征队伍压住路线，压力 -${pressureDrop}%。`);
      recordJourneyDecision(next, {
        category: "base-command",
        detail: option.text,
        impacts: [`压力 -${pressureDrop}%`],
        label: option.label,
        nodeTitle: "基地指令",
        tone: "safe"
      });
    }
  } else if (action === "recon-ping") {
    const reconValue = 1 + Math.floor((next.support.roadSearch + next.support.campScout + next.support.shopIntel) / 2);
    if (next.combat) {
      next.combat.exposed += reconValue;
      next.logs.push(`基地指令：侦察标记。基地标出弱点，暴露 +${reconValue}。`);
      recordJourneyDecision(next, {
        category: "base-command",
        detail: option.text,
        impacts: [`暴露 +${reconValue}`],
        label: option.label,
        nodeTitle: "基地指令",
        tone: "safe"
      });
    } else {
      const pressureDrop = 4 + Math.min(4, next.support.pressureRelief + next.support.roadSearch);
      next.pressure = clampPercent(next.pressure - pressureDrop);
      next.objectiveBonus += 1;
      next.logs.push(`基地指令：侦察标记。路线笔记让下一次抉择更清晰，压力 -${pressureDrop}%，目标 +1。`);
      recordJourneyDecision(next, {
        category: "base-command",
        detail: option.text,
        impacts: [`压力 -${pressureDrop}%`, "目标 +1"],
        label: option.label,
        nodeTitle: "基地指令",
        tone: "safe"
      });
    }
  } else if (action === "supply-cache") {
    const food = 1 + Math.floor(next.support.shopRations / 2);
    const water = 1 + Math.floor(next.support.campCook / 2);
    next.fieldSupplies.food += food;
    next.fieldSupplies.water += water;
    next.condition.hunger = clampPercent(next.condition.hunger - 12);
    next.condition.thirst = clampPercent(next.condition.thirst - 12);
    next.logs.push(`基地指令：补给缓存。随身补给恢复食物 +${food}、水 +${water}，饥饿 -12，口渴 -12。`);
    recordJourneyDecision(next, {
      category: "base-command",
      detail: option.text,
      impacts: [`随身 食物 +${food} / 水 +${water}`, "饥饿 -12", "口渴 -12"],
      label: option.label,
      nodeTitle: "基地指令",
      tone: "safe"
    });
  }

  return next;
}

export function setJourneySegmentTactic(journey: JourneyState, tactic: JourneySegmentTactic): JourneyState {
  const option = segmentTacticOptions[tactic];
  if (!option || journey.segmentTactic === tactic) {
    return journey;
  }

  return {
    ...journey,
    logs: [...journey.logs, `路段战术：${option.label}。${option.text}`],
    segmentTactic: tactic
  };
}

export function setJourneyTravelPlan(journey: JourneyState, plan: JourneyTravelPlan): JourneyState {
  const option = travelPlanOptions[plan];
  if (!option || journey.travelPlan === plan) {
    return journey;
  }

  return {
    ...journey,
    logs: [...journey.logs, `行军计划：${option.label}。${option.text}`],
    travelPlan: plan
  };
}

export function resolveCampAction(journey: JourneyState, action: JourneyCampAction): JourneyState {
  const node = journey.nodes[journey.currentNodeIndex];
  const next = structuredClone(journey) as JourneyState;
  const baseOption = node?.type === "camp" ? node.camp?.[action] : null;
  if (!baseOption || !node) {
    return next;
  }
  const option = campOptionOutcome(action, baseOption, next.support);

  const spentKey = spendFieldSupplyFromPriority(next, option.supplyPriority, 1);
  if (spentKey) {
    next.condition.fatigue = clampPercent(next.condition.fatigue + option.fatigue);
    next.condition.hunger = clampPercent(next.condition.hunger + option.hunger);
    next.condition.thirst = clampPercent(next.condition.thirst + option.thirst);
    next.pressure = clampPercent(next.pressure + option.pressure);
    next.rollShift += option.rollShift;
    next.objectiveBonus += option.objectiveBonus;
    next.logs.push(
      `${node.title}：${option.successLog} ${resourceLabels[spentKey]} -1，疲劳 ${formatSignedNumber(option.fatigue)}，饥饿 ${formatSignedNumber(
        option.hunger
      )}，口渴 ${formatSignedNumber(option.thirst)}，压力 ${formatSignedPercent(option.pressure)}${
        option.objectiveBonus > 0 ? `，目标线索 +${option.objectiveBonus}` : ""
      }${option.supportText ? `。${option.supportText}` : ""}。`
    );
    recordJourneyDecision(next, {
      category: "camp",
      detail: option.successLog,
      impacts: [
        `${resourceLabels[spentKey]} -1`,
        `疲劳 ${formatSignedNumber(option.fatigue)}`,
        `饥饿 ${formatSignedNumber(option.hunger)}`,
        `口渴 ${formatSignedNumber(option.thirst)}`,
        `压力 ${formatSignedPercent(option.pressure)}`,
        option.objectiveBonus > 0 ? `目标 +${option.objectiveBonus}` : "",
        option.supportText ?? ""
      ],
      label: option.label,
      nodeTitle: node.title,
      tone: option.pressure < 0 || option.objectiveBonus > 0 ? "safe" : "warning"
    });
    return next;
  }

  const fallbackPressure = Math.max(3, option.pressure + 10);
  next.condition.fatigue = clampPercent(next.condition.fatigue + (option.fatigue < 0 ? Math.ceil(option.fatigue / 2) : option.fatigue + 4));
  next.condition.hunger = clampPercent(next.condition.hunger + Math.max(5, option.hunger + 16));
  next.condition.thirst = clampPercent(next.condition.thirst + Math.max(5, option.thirst + 16));
  next.pressure = clampPercent(next.pressure + fallbackPressure);
  next.rollShift += Math.max(0.03, option.rollShift / 2);
  next.logs.push(`${node.title}：${option.fallbackLog} 压力 ${formatSignedPercent(fallbackPressure)}${option.supportText ? `。${option.supportText}` : ""}。`);
  recordJourneyDecision(next, {
    category: "camp",
    detail: option.fallbackLog,
    impacts: [`补给不足`, `压力 ${formatSignedPercent(fallbackPressure)}`, `饥饿 +${Math.max(5, option.hunger + 16)}`, `口渴 +${Math.max(5, option.thirst + 16)}`],
    label: option.label,
    nodeTitle: node.title,
    tone: "danger"
  });
  return next;
}

export function resolveShopAction(journey: JourneyState, action: JourneyShopAction): JourneyState {
  const node = journey.nodes[journey.currentNodeIndex];
  const next = structuredClone(journey) as JourneyState;
  const baseOffer = node?.type === "shop" ? node.shop?.offers[action] : null;
  if (!baseOffer || !node) {
    return next;
  }
  const offer = shopOfferOutcome(action, baseOffer, next.support);
  const spentKey = spendFieldSupplyFromPriority(next, offer.costPriority, 1);
  if (!spentKey) {
    next.pressure = clampPercent(next.pressure + offer.pressureFail);
    next.rollShift += offer.rollShiftFail;
    next.logs.push(`${node.title}：${offer.failLog} 压力 ${formatSignedPercent(offer.pressureFail)}${offer.supportText ? `。${offer.supportText}` : ""}。`);
    recordJourneyDecision(next, {
      category: "shop",
      detail: offer.failLog,
      impacts: [`筹码不足`, `压力 ${formatSignedPercent(offer.pressureFail)}`, offer.supportText ?? ""],
      label: offer.label,
      nodeTitle: node.title,
      tone: "danger"
    });
    return next;
  }

  addResources(next.fieldSupplies, offer.fieldSupplyReward);
  addResources(next.bonusReward, offer.reward);
  next.condition.fatigue = clampPercent(next.condition.fatigue + offer.fatigue);
  next.condition.hunger = clampPercent(next.condition.hunger + offer.hunger);
  next.condition.thirst = clampPercent(next.condition.thirst + offer.thirst);
  next.objectiveBonus += offer.objectiveBonus;
  next.pressure = clampPercent(next.pressure + offer.pressure);
  next.rollShift += offer.rollShift;
  next.logs.push(
    `${node.title}：${offer.successLog} ${resourceLabels[spentKey]} -1，随身 ${formatBundle(offer.fieldSupplyReward)}，入库 ${formatBundle(
      offer.reward
    )}，疲劳 ${formatSignedNumber(offer.fatigue)}，饥饿 ${formatSignedNumber(offer.hunger)}，口渴 ${formatSignedNumber(
      offer.thirst
    )}，压力 ${formatSignedPercent(offer.pressure)}${offer.objectiveBonus > 0 ? `，目标线索 +${offer.objectiveBonus}` : ""}${
      offer.supportText ? `。${offer.supportText}` : ""
    }。`
  );
  recordJourneyDecision(next, {
    category: "shop",
    detail: offer.successLog,
    impacts: [
      `${resourceLabels[spentKey]} -1`,
      `随身 ${formatBundle(offer.fieldSupplyReward)}`,
      `入库 ${formatBundle(offer.reward)}`,
      `疲劳 ${formatSignedNumber(offer.fatigue)}`,
      `饥饿 ${formatSignedNumber(offer.hunger)}`,
      `口渴 ${formatSignedNumber(offer.thirst)}`,
      `压力 ${formatSignedPercent(offer.pressure)}`,
      offer.objectiveBonus > 0 ? `目标 +${offer.objectiveBonus}` : "",
      offer.supportText ?? ""
    ],
    label: offer.label,
    nodeTitle: node.title,
    tone: offer.pressure < 0 || offer.objectiveBonus > 0 || formatBundle(offer.reward) !== "无战利品" ? "safe" : "warning"
  });
  return next;
}

export function resolveCombatLootChoice(journey: JourneyState, action: JourneyCombatLootAction): JourneyState {
  const next = structuredClone(journey) as JourneyState;
  const pending = next.pendingCombatLoot;
  const baseOption = combatLootOptions[action];
  if (!pending || !baseOption) {
    return next;
  }
  const option = combatLootOutcome(baseOption, next.support);

  addResources(next.bonusReward, option.reward);
  next.condition.fatigue = clampPercent(next.condition.fatigue + option.fatigue);
  next.pressure = clampPercent(next.pressure + option.pressure);
  next.rollShift += option.rollShift;
  next.objectiveBonus += option.objectiveBonus;

  const scarsBefore = next.battleScars;
  if (option.battleScarRelief > 0) {
    next.battleScars = Math.max(0, next.battleScars - option.battleScarRelief);
  }
  const scarsDelta = scarsBefore - next.battleScars;

  next.logs.push(
    `${pending.enemyName}：${option.label}。${option.text} ${formatBundle(option.reward)}，疲劳 ${formatSignedNumber(
      option.fatigue
    )}，压力 ${formatSignedPercent(option.pressure)}${option.objectiveBonus > 0 ? `，目标线索 +${option.objectiveBonus}` : ""}${
      scarsDelta > 0 ? `，战伤 -${scarsDelta}` : ""
    }${option.supportText ? `，${option.supportText}` : ""}。战利品已记录：${pending.trophy}。`
  );
  recordJourneyDecision(next, {
    category: "combat-loot",
    detail: option.text,
    impacts: [
      formatBundle(option.reward),
      `疲劳 ${formatSignedNumber(option.fatigue)}`,
      `压力 ${formatSignedPercent(option.pressure)}`,
      option.objectiveBonus > 0 ? `目标 +${option.objectiveBonus}` : "",
      scarsDelta > 0 ? `伤痕 -${scarsDelta}` : "",
      `战利标记：${pending.trophy}`,
      option.supportText ?? ""
    ],
    label: option.label,
    nodeTitle: pending.enemyName,
    tone: option.pressure < 0 || option.objectiveBonus > 0 || scarsDelta > 0 || formatBundle(option.reward) !== "无战利品" ? "safe" : "warning"
  });
  next.pendingCombatLoot = null;
  return next;
}

export function addResources(target: ResourceBundle, source: ResourceBundle) {
  for (const key of resourceKeys) {
    target[key] += source[key];
  }
}

export function recordJourneyDecision(
  journey: JourneyState,
  decision: {
    category: JourneyDecisionCategory;
    detail: string;
    impacts: string[];
    label: string;
    nodeTitle: string;
    tone?: JourneyDecisionTone;
  }
) {
  const decisions = journey.decisions ?? [];
  const impactText = compactDecisionImpacts(decision.impacts).join(" / ") || "无明显变化";
  journey.decisions = [
    ...decisions,
    {
      category: decision.category,
      detail: withoutTerminalPunctuation(decision.detail),
      id: `decision-${decisions.length + 1}-${decision.category}`,
      impactText,
      label: decision.label,
      nodeTitle: decision.nodeTitle,
      tone: decision.tone ?? decisionToneFromImpact(impactText)
    }
  ];
}

export function journeyDecisionSummaryLines(journey: Pick<JourneyState, "decisions">, limit = 5): string[] {
  const decisions = (journey.decisions ?? []).slice(-limit);
  if (!decisions.length) {
    return [];
  }

  return [
    `路线决策：${decisions.map((decision) => `${decision.nodeTitle}选择${decision.label}（${decision.impactText}）`).join("；")}。`
  ];
}

export function createEmptyResourceBundle(): ResourceBundle {
  return {
    ammo: 0,
    food: 0,
    fuel: 0,
    materials: 0,
    medicine: 0,
    water: 0
  };
}

export function calculateCarryBurden(
  squad: Survivor[],
  loadout: ResourceBundle,
  support: Pick<ExpeditionSupport, "carryCapacity"> = {}
): JourneyCarryBurden {
  const load = resourceKeys.reduce((sum, key) => sum + loadout[key], 0);
  const staminaAverage = squad.length ? squad.reduce((sum, survivor) => sum + survivor.attributes.stamina, 0) / squad.length : 0;
  const capacity = 4 + squad.length * 3 + Math.floor(staminaAverage / 25) + (support.carryCapacity ?? 0);
  const ratio = capacity > 0 ? load / capacity : 2;

  if (ratio > 1) {
    const overload = Math.max(1, load - capacity);
    return {
      capacity,
      fatiguePenalty: 3 + Math.ceil(overload / 2),
      load,
      pressurePenalty: 8 + overload * 2,
      tier: "overloaded"
    };
  }

  if (ratio >= 0.75) {
    return {
      capacity,
      fatiguePenalty: 1,
      load,
      pressurePenalty: 2,
      tier: "heavy"
    };
  }

  return {
    capacity,
    fatiguePenalty: 0,
    load,
    pressurePenalty: -2,
    tier: "light"
  };
}

export function spendFieldSupply(journey: JourneyState, key: ResourceKey, amount: number) {
  if (journey.fieldSupplies[key] < amount) {
    return false;
  }

  journey.fieldSupplies[key] -= amount;
  return true;
}

export function spendFieldSupplyFromPriority(journey: JourneyState, keys: ResourceKey[], amount: number) {
  const key = keys.find((candidate) => journey.fieldSupplies[candidate] >= amount);
  if (!key) {
    return null;
  }

  journey.fieldSupplies[key] -= amount;
  return key;
}

function materializeEvent(template: JourneyEventTemplate) {
  return {
    ...template,
    careful: materializeChoice(template.careful),
    force: materializeChoice(template.force)
  };
}

function materializeChoice(template: JourneyEventTemplate["careful"]): JourneyChoice {
  return {
    ...template,
    reward: bundleFromKeys(template.rewardKeys)
  };
}

function materializeEnemy(template: EnemyTemplate): JourneyEnemy {
  return {
    ...template,
    reward: bundleFromKeys(template.rewardKeys)
  };
}

function materializeShop(template: ShopTemplate, family: LocationFamily): JourneyShop {
  const serviceReward = bundleFromKeys(template.rewardKeys);
  const resupplyText =
    family === "wilds"
      ? "从车摊买包好的食物、净水和田间路线。"
      : family === "urban"
        ? "在最后几栋楼前换来密封零食和一瓶干净水。"
        : family === "weird"
          ? "买下密封水，以及仍然记得自己是食物的东西。"
          : "从修路人那里买干粮和能喝的水。";
  const intelText =
    family === "weird"
      ? "买下一则路兆，以及能让出口少错一点的标记。"
      : "买下能在撤离前少走一次错路的路线笔记。";

  return {
    label: template.label,
    offers: {
      intel: {
        costPriority: [...template.costPriority],
        failLog: "没人会为了口头承诺卖方向。拖延让路线像是被盯上了。",
        fatigue: 1,
        fieldSupplyReward: createEmptyResourceBundle(),
        hunger: 0,
        id: "intel",
        label: "购买路线情报",
        objectiveBonus: 1,
        pressure: Math.min(-4, template.pressureSuccess - 2),
        pressureFail: template.pressureFail + 3,
        reward: createEmptyResourceBundle(),
        rollShift: Math.min(-0.06, template.rollShiftSuccess - 0.03),
        rollShiftFail: template.rollShiftFail + 0.02,
        successLog: "商贩标出更干净的撤离线，也给了一条有用的塔台线索。",
        text: intelText,
        thirst: 0
      },
      resupply: {
        costPriority: uniqueResourceKeys(["materials", "fuel", "ammo", ...template.costPriority]),
        failLog: "队伍想换食物，但交易点已经收起了好箱子。",
        fatigue: -2,
        fieldSupplyReward: lootReward({ food: 1, water: 1 }),
        hunger: -8,
        id: "resupply",
        label: "购买路上口粮",
        objectiveBonus: 0,
        pressure: -4,
        pressureFail: template.pressureFail + 2,
        reward: createEmptyResourceBundle(),
        rollShift: -0.03,
        rollShiftFail: template.rollShiftFail + 0.02,
        successLog: "队伍换到密封口粮，并补满了野外包。",
        text: resupplyText,
        thirst: -8
      },
      service: {
        costPriority: [...template.costPriority],
        failLog: template.failLog,
        fatigue: -4,
        fieldSupplyReward: lootReward({ medicine: serviceReward.medicine > 0 ? 1 : 0, ammo: serviceReward.ammo > 0 ? 1 : 0 }),
        hunger: 0,
        id: "service",
        label: template.label,
        objectiveBonus: 0,
        pressure: template.pressureSuccess,
        pressureFail: template.pressureFail,
        reward: serviceReward,
        rollShift: template.rollShiftSuccess,
        rollShiftFail: template.rollShiftFail,
        successLog: template.successLog,
        text: "购买野外服务包：给基地的零件，以及摊主手头能给的小型即时补给。",
        thirst: 0
      }
    }
  };
}

function createCampOptions(family: LocationFamily): Record<JourneyCampAction, JourneyCampOption> {
  const scoutPressure = family === "weird" ? -14 : family === "urban" ? -11 : -9;
  const cookPressure = family === "wilds" ? -8 : -6;
  return {
    cook: {
      fallbackLog: "他们试着用边角料做饭，但停顿只让空腹更吵。",
      fatigue: -6,
      hunger: -28,
      label: "烹煮口粮",
      objectiveBonus: 0,
      pressure: cookPressure,
      rollShift: -0.06,
      successLog: "一份热口粮让队伍在下一段路前重新稳住。",
      supplyPriority: ["food", "water"],
      thirst: -20
    },
    rest: {
      fallbackLog: "补给不足的休息仍有帮助，但每个人醒来都更警觉，也更饿。",
      fatigue: -24,
      hunger: 6,
      label: "处理伤口",
      objectiveBonus: 0,
      pressure: -8,
      rollShift: -0.08,
      successLog: "有人值守的休息让队伍重新喘上气。",
      supplyPriority: ["medicine", "food", "water"],
      thirst: 6
    },
    scout: {
      fallbackLog: "他们凭直觉侦察，又为路线争执丢掉时间。",
      fatigue: 5,
      hunger: 4,
      label: "前出侦察",
      objectiveBonus: 1,
      pressure: scoutPressure,
      rollShift: -0.12,
      successLog: "队伍消耗装备，标出更安全的通道和有用的塔台笔记。",
      supplyPriority: ["fuel", "ammo", "materials"],
      thirst: 4
    }
  };
}

function bundleFromKeys(keys: ResourceKey[]) {
  const bundle = createEmptyResourceBundle();
  for (const key of keys) {
    bundle[key] += 1;
  }
  return bundle;
}

function lootReward(resources: Partial<ResourceBundle>) {
  return {
    ...createEmptyResourceBundle(),
    ...resources
  };
}

const resourceKeys: ResourceKey[] = ["food", "water", "materials", "medicine", "fuel", "ammo"];

function uniqueResourceKeys(keys: ResourceKey[]): ResourceKey[] {
  return [...new Set(keys)];
}

const resourceLabels: Record<ResourceKey, string> = {
  ammo: "弹药",
  food: "食物",
  fuel: "燃料",
  materials: "材料",
  medicine: "药品",
  water: "水"
};

const baseCommandDefinitions: Array<Pick<JourneyBaseCommandOption, "id" | "label" | "text">> = [
  {
    id: "guard-relay",
    label: "守卫接力",
    text: "让基地守卫线掩护队伍，或压低路线压力。"
  },
  {
    id: "recon-ping",
    label: "侦察标记",
    text: "呼叫路线笔记、弱点标记和目标指引。"
  },
  {
    id: "supply-cache",
    label: "补给缓存",
    text: "用基地预备补给，在野外恢复紧急食物和饮水。"
  }
];

function baseCommandCharges(support: ExpeditionSupport, action: JourneyBaseCommandAction): number {
  if (action === "guard-relay") {
    const supportValue = support.guardBlock + support.roadSecure;
    return supportValue > 0 ? 1 + Math.floor((supportValue - 1) / 3) : 0;
  }

  if (action === "recon-ping") {
    const supportValue = support.roadSearch + support.campScout + support.shopIntel + support.pressureRelief;
    return supportValue > 0 ? 1 + Math.floor((supportValue - 1) / 3) : 0;
  }

  const supportValue =
    support.shopRations +
    support.campCook +
    (support.startingSupplies.food ?? 0) +
    (support.startingSupplies.water ?? 0);
  return supportValue > 0 ? 1 + Math.floor((supportValue - 1) / 3) : 0;
}

function baseCommandEffectText(journey: Pick<JourneyState, "combat" | "support">, action: JourneyBaseCommandAction): string {
  if (action === "guard-relay") {
    const guardValue = 3 + journey.support.guardBlock + journey.support.roadSecure;
    return journey.combat ? `前线防护 +${guardValue}` : `压力 -${Math.max(4, guardValue * 2)}%`;
  }

  if (action === "recon-ping") {
    const reconValue = 1 + Math.floor((journey.support.roadSearch + journey.support.campScout + journey.support.shopIntel) / 2);
    const pressureDrop = 4 + Math.min(4, journey.support.pressureRelief + journey.support.roadSearch);
    return journey.combat ? `暴露 +${reconValue}` : `压力 -${pressureDrop}% / 目标 +1`;
  }

  const food = 1 + Math.floor(journey.support.shopRations / 2);
  const water = 1 + Math.floor(journey.support.campCook / 2);
  return `食物 +${food} / 水 +${water}`;
}

function spreadCombatGuard(combat: JourneyCombat, guardValue: number) {
  const frontline = combat.frontline.filter((combatant) => combatant.status !== "down");
  if (frontline.length === 0 || guardValue <= 0) {
    return;
  }

  const share = Math.floor(guardValue / frontline.length);
  const remainder = guardValue % frontline.length;
  frontline.forEach((combatant, index) => {
    combatant.guard += share + (index < remainder ? 1 : 0);
  });
}

export const travelPlanList: JourneyTravelPlanOption[] = [
  {
    fatigue: 0,
    hunger: 0,
    hours: 3,
    id: "steady",
    label: "稳步行军",
    pressure: -1,
    text: "平衡推进，小幅降低路线压力。",
    thirst: 0
  },
  {
    fatigue: 3,
    hunger: 3,
    hours: 5,
    id: "scavenge",
    label: "搜刮沿途",
    pressure: 5,
    text: "发现更多物资，但暴露时间更长。",
    thirst: 3
  },
  {
    fatigue: 6,
    hunger: 5,
    hours: 2,
    id: "rush",
    label: "强行军",
    pressure: -6,
    text: "以大量体力换取更低接触压力。",
    thirst: 6
  },
  {
    fatigue: 2,
    hunger: 1,
    hours: 4,
    id: "sneak",
    label: "静默前进",
    pressure: -5,
    text: "消耗掩护物资，压低路线动静。",
    thirst: 1
  }
];

const travelPlanOptions: Record<JourneyTravelPlan, JourneyTravelPlanOption> = Object.fromEntries(
  travelPlanList.map((option) => [option.id, option])
) as Record<JourneyTravelPlan, JourneyTravelPlanOption>;

export const segmentTacticList: JourneySegmentTacticOption[] = [
  {
    failFatigue: 0,
    failHunger: 0,
    failPressure: 0,
    failThirst: 0,
    fallbackLog: "队伍保持观察，没有额外消耗补给。",
    fatigue: 0,
    hunger: 0,
    id: "observe",
    label: "观察路线",
    pressure: 0,
    routeSkill: 0,
    scavengeBonus: 0,
    successLog: "队伍刻意把下一段路线走得平稳。",
    supplyPriority: [],
    text: "默认推进，不产生额外消耗或修正。",
    thirst: 0
  },
  {
    failFatigue: 2,
    failHunger: 0,
    failPressure: -6,
    failThirst: 0,
    fallbackLog: "队伍收紧队形，用速度换控制。",
    fatigue: 2,
    hunger: 0,
    id: "brace",
    label: "收紧队形",
    pressure: -6,
    routeSkill: 1,
    scavengeBonus: 0,
    successLog: "收紧队形让下一站前的危险角度都有人照看。",
    supplyPriority: [],
    text: "降低压力并改善路线控制，但增加少量疲劳。",
    thirst: 0
  },
  {
    failFatigue: 1,
    failHunger: 6,
    failPressure: 4,
    failThirst: 6,
    fallbackLog: "他们尝试分配口粮，但剩余补给不够干净地分给所有人。",
    fatigue: -2,
    hunger: -10,
    id: "ration",
    label: "分配口粮",
    pressure: -4,
    routeSkill: 0,
    scavengeBonus: 0,
    successLog: "一次受控的口粮休息让队伍在下一段前稳住手脚。",
    supplyPriority: ["food", "water"],
    text: "消耗 1 份食物或水，缓解饥饿、口渴、疲劳和压力。",
    thirst: -10
  },
  {
    failFatigue: 5,
    failHunger: 3,
    failPressure: 8,
    failThirst: 3,
    fallbackLog: "他们缺少合适工具还硬搜废墟，浪费了时间。",
    fatigue: 3,
    hunger: 2,
    id: "prospect",
    label: "搜索废墟",
    pressure: 5,
    routeSkill: 0,
    scavengeBonus: 0.32,
    successLog: "队伍消耗一点工具，撬开了更好的路边发现。",
    supplyPriority: ["materials", "fuel"],
    text: "消耗材料或燃料，大幅提高发现概率，但压力更高。",
    thirst: 2
  }
];

const segmentTacticOptions: Record<JourneySegmentTactic, JourneySegmentTacticOption> = Object.fromEntries(
  segmentTacticList.map((option) => [option.id, option])
) as Record<JourneySegmentTactic, JourneySegmentTacticOption>;

export function segmentThreatFor(journey: Pick<JourneyState, "condition" | "locationFamily">): JourneySegmentThreat {
  const pool = segmentThreats[journey.locationFamily] ?? segmentThreats.urban;
  const nextSegment = Math.max(1, journey.condition.distance + 1);
  return pool[(nextSegment - 1) % pool.length];
}

export function segmentThreatMitigationFor(threat: JourneySegmentThreat, support: ExpeditionSupport): JourneySegmentThreatMitigation {
  const sourceScores: { label: string; value: number }[] = [];
  if (threat.counterTactics.includes("brace")) {
    sourceScores.push({ label: "路线掩护", value: support.roadSecure + support.guardBlock });
  }
  if (threat.counterTactics.includes("prospect")) {
    sourceScores.push({ label: "搜刮工具", value: support.roadSearch + support.lootSalvage + support.shopService });
  }
  if (threat.counterTactics.includes("ration")) {
    sourceScores.push({ label: "路上补给", value: support.shopRations + support.campCook });
  }
  if (threat.counterTactics.includes("observe")) {
    sourceScores.push({ label: "路线情报", value: support.pressureRelief + support.lootIntel + support.campScout });
  }

  const activeSources = sourceScores.filter((source) => source.value > 0);
  const value = activeSources.reduce((total, source) => total + source.value, 0);

  return {
    fatigue: Math.min(threat.fatigue, Math.floor(value / 3)),
    pressure: Math.min(threat.pressure, value * 2),
    scavengePenalty: Math.min(threat.scavengePenalty, value * 0.02),
    source: activeSources.map((source) => source.label).join(" + ") || "无",
    value
  };
}

const segmentThreats: Record<LocationFamily, JourneySegmentThreat[]> = {
  resources: [
    {
      counterTactics: ["ration"],
      fatigue: 2,
      hunger: 3,
      id: "chlorine-fog",
      label: "氯雾",
      pressure: 6,
      scavengePenalty: 0.06,
      text: "化学雾让每一次呼吸都变成一次小谈判。",
      thirst: 5
    },
    {
      counterTactics: ["brace"],
      fatigue: 4,
      hunger: 0,
      id: "service-ladder",
      label: "检修梯",
      pressure: 7,
      scavengePenalty: 0.04,
      text: "垂直检修攀爬会撕开队伍节奏。",
      thirst: 1
    },
    {
      counterTactics: ["prospect"],
      fatigue: 1,
      hunger: 0,
      id: "locked-meter",
      label: "锁住的仪表箱",
      pressure: 5,
      scavengePenalty: 0.12,
      text: "可用零件藏在老旧工具锁后面。",
      thirst: 0
    }
  ],
  urban: [
    {
      counterTactics: ["prospect"],
      fatigue: 3,
      hunger: 0,
      id: "glass-choke",
      label: "玻璃瓶颈",
      pressure: 8,
      scavengePenalty: 0.08,
      text: "破碎店面让每条捷径都很响，除非有人处理碎片。",
      thirst: 1
    },
    {
      counterTactics: ["brace"],
      fatigue: 4,
      hunger: 0,
      id: "blind-corner",
      label: "盲角",
      pressure: 7,
      scavengePenalty: 0.04,
      text: "狭窄巷道藏着太多动静。",
      thirst: 0
    },
    {
      counterTactics: ["ration"],
      fatigue: 2,
      hunger: 5,
      id: "long-stairwell",
      label: "长楼梯",
      pressure: 5,
      scavengePenalty: 0.04,
      text: "长楼梯同时消耗腿力和耐心。",
      thirst: 4
    }
  ],
  weird: [
    {
      counterTactics: ["observe"],
      fatigue: 2,
      hunger: 0,
      id: "wrong-echo",
      label: "错误回声",
      pressure: 9,
      scavengePenalty: 0.1,
      text: "路线会提前半秒重复尚未发生的声音。",
      thirst: 0
    },
    {
      counterTactics: ["brace"],
      fatigue: 5,
      hunger: 0,
      id: "soft-floor",
      label: "软地板",
      pressure: 6,
      scavengePenalty: 0.06,
      text: "地板弯曲得像瓷砖下面有什么东西在呼吸。",
      thirst: 2
    },
    {
      counterTactics: ["prospect"],
      fatigue: 2,
      hunger: 3,
      id: "mirror-growth",
      label: "镜面增生",
      pressure: 8,
      scavengePenalty: 0.14,
      text: "反光藤蔓把补给和出口藏进同一层闪光里。",
      thirst: 3
    }
  ],
  wilds: [
    {
      counterTactics: ["brace"],
      fatigue: 4,
      hunger: 0,
      id: "open-ditch",
      label: "开阔沟渠",
      pressure: 7,
      scavengePenalty: 0.04,
      text: "被冲开的沟渠把道路切成几段暴露的穿越点。",
      thirst: 1
    },
    {
      counterTactics: ["prospect"],
      fatigue: 2,
      hunger: 0,
      id: "overgrown-cache",
      label: "蔓草储藏点",
      pressure: 6,
      scavengePenalty: 0.16,
      text: "灌木下有可用轮廓，但每多搜一分钟，痕迹就更宽。",
      thirst: 2
    },
    {
      counterTactics: ["ration"],
      fatigue: 2,
      hunger: 5,
      id: "dry-field",
      label: "干燥田地",
      pressure: 5,
      scavengePenalty: 0.04,
      text: "干枯秸秆把路线里的阴影切掉了。",
      thirst: 6
    }
  ]
};

export const combatLootList: JourneyCombatLootOption[] = [
  {
    battleScarRelief: 0,
    fatigue: 4,
    id: "salvage",
    label: "拆解残骸",
    objectiveBonus: 0,
    pressure: 5,
    reward: lootReward({ fuel: 1, materials: 2 }),
    rollShift: 0.04,
    text: "慢工细活，能带回更好的零件。"
  },
  {
    battleScarRelief: 1,
    fatigue: -8,
    id: "medicine",
    label: "野外包扎",
    objectiveBonus: 0,
    pressure: 2,
    reward: lootReward({ medicine: 1 }),
    rollShift: -0.02,
    text: "在继续移动前先处理最糟糕的伤口。"
  },
  {
    battleScarRelief: 0,
    fatigue: 2,
    id: "intel",
    label: "搜寻线索",
    objectiveBonus: 1,
    pressure: 6,
    reward: lootReward({}),
    rollShift: -0.1,
    text: "花时间读懂现场留下的痕迹。"
  },
  {
    battleScarRelief: 0,
    fatigue: -3,
    id: "evade",
    label: "快速离开",
    objectiveBonus: 0,
    pressure: -9,
    reward: lootReward({}),
    rollShift: -0.06,
    text: "不拿额外战利品，换一个干净撤出。"
  }
];

const combatLootOptions: Record<JourneyCombatLootAction, JourneyCombatLootOption> = Object.fromEntries(
  combatLootList.map((option) => [option.id, option])
) as Record<JourneyCombatLootAction, JourneyCombatLootOption>;

export function combatLootOutcome(option: JourneyCombatLootOption, support: ExpeditionSupport = emptySupport()): JourneyCombatLootOption {
  const reward = { ...option.reward };
  const notes: string[] = [];
  let battleScarRelief = option.battleScarRelief;
  let fatigue = option.fatigue;
  let objectiveBonus = option.objectiveBonus;
  let pressure = option.pressure;
  let rollShift = option.rollShift;

  if (option.id === "salvage" && support.lootSalvage > 0) {
    reward.materials += support.lootSalvage;
    if (support.lootSalvage >= 2) {
      reward.fuel += Math.floor(support.lootSalvage / 2);
    }
    notes.push(`工坊 +${support.lootSalvage} 战利品`);
  }

  if (option.id === "medicine" && support.lootMedicine > 0) {
    battleScarRelief += support.lootMedicine;
    fatigue -= support.lootMedicine * 2;
    if (support.lootMedicine >= 2) {
      reward.medicine += 1;
    }
    notes.push(`医务室 +${support.lootMedicine} 伤痕缓解`);
  }

  if (option.id === "intel" && support.lootIntel > 0) {
    objectiveBonus += support.lootIntel;
    pressure -= support.lootIntel * 2;
    rollShift -= support.lootIntel * 0.03;
    notes.push(`电台 +${support.lootIntel} 目标线索`);
  }

  if (option.id === "evade" && support.lootEvade > 0) {
    fatigue -= support.lootEvade;
    pressure -= support.lootEvade * 3;
    rollShift -= support.lootEvade * 0.02;
    notes.push(`瞭望 +${support.lootEvade} 撤离`);
  }

  return {
    ...option,
    battleScarRelief,
    fatigue,
    objectiveBonus,
    pressure,
    reward,
    rollShift,
    supportText: notes.join(", ")
  };
}

export function campOptionOutcome(
  action: JourneyCampAction,
  option: JourneyCampOption,
  support: ExpeditionSupport = emptySupport()
): JourneyCampOption {
  let fatigue = option.fatigue;
  let hunger = option.hunger;
  let objectiveBonus = option.objectiveBonus;
  let pressure = option.pressure;
  let rollShift = option.rollShift;
  let thirst = option.thirst;
  const notes: string[] = [];

  if (action === "cook" && support.campCook > 0) {
    fatigue -= support.campCook;
    hunger -= support.campCook * 6;
    pressure -= support.campCook;
    rollShift -= support.campCook * 0.01;
    thirst -= support.campCook * 3;
    notes.push(`厨房 +${support.campCook} 口粮质量`);
  }

  if (action === "rest" && support.campRest > 0) {
    fatigue -= support.campRest * 6;
    pressure -= support.campRest * 2;
    rollShift -= support.campRest * 0.02;
    notes.push(`医务室/宿舍 +${support.campRest} 恢复`);
  }

  if (action === "scout" && support.campScout > 0) {
    fatigue -= support.campScout;
    objectiveBonus += support.campScout;
    pressure -= support.campScout * 3;
    rollShift -= support.campScout * 0.02;
    notes.push(`电台/瞭望 +${support.campScout} 路线判断`);
  }

  return {
    ...option,
    fatigue,
    hunger,
    objectiveBonus,
    pressure,
    rollShift,
    supportText: notes.length > 0 ? `营地支援：${notes.join("，")}` : "",
    thirst
  };
}

export function shopOfferOutcome(
  action: JourneyShopAction,
  offer: JourneyShopOffer,
  support: ExpeditionSupport = emptySupport()
): JourneyShopOffer {
  const fieldSupplyReward = { ...offer.fieldSupplyReward };
  const reward = { ...offer.reward };
  let fatigue = offer.fatigue;
  let hunger = offer.hunger;
  let objectiveBonus = offer.objectiveBonus;
  let pressure = offer.pressure;
  let rollShift = offer.rollShift;
  let thirst = offer.thirst;
  const notes: string[] = [];

  if (action === "resupply" && support.shopRations > 0) {
    fieldSupplyReward.food += support.shopRations;
    fieldSupplyReward.water += support.shopRations;
    hunger -= support.shopRations * 2;
    pressure -= support.shopRations;
    thirst -= support.shopRations * 2;
    notes.push(`厨房 +${support.shopRations} 交易口粮`);
  }

  if (action === "intel" && support.shopIntel > 0) {
    objectiveBonus += support.shopIntel;
    pressure -= support.shopIntel * 2;
    rollShift -= support.shopIntel * 0.03;
    notes.push(`电台 +${support.shopIntel} 信号筹码`);
  }

  if (action === "service" && support.shopService > 0) {
    reward.materials += support.shopService;
    if (support.shopService >= 2) {
      fieldSupplyReward.ammo += 1;
    }
    fatigue -= support.shopService;
    pressure -= support.shopService;
    notes.push(`工坊 +${support.shopService} 服务价值`);
  }

  return {
    ...offer,
    fatigue,
    fieldSupplyReward,
    hunger,
    objectiveBonus,
    pressure,
    reward,
    rollShift,
    supportText: notes.length > 0 ? `商店支援：${notes.join("，")}` : "",
    thirst
  };
}

const combatIntentDetails: Record<JourneyCombatIntent, { armor: number; id: JourneyCombatIntent; incoming: number; label: string; text: string }> = {
  brace: {
    armor: 2,
    id: "brace",
    incoming: -1,
    label: "架势",
    text: "本回合护甲上升。战术可以打破架势。"
  },
  maul: {
    armor: 0,
    id: "maul",
    incoming: 0,
    label: "猛击",
    text: "一次直接重击即将到来。防守可以削弱它。"
  },
  prowl: {
    armor: 0,
    id: "prowl",
    incoming: 2,
    label: "游猎",
    text: "它在寻找薄弱队形。攻击或战术可以打断。"
  },
  windup: {
    armor: 0,
    id: "windup",
    incoming: 5,
    label: "蓄力",
    text: "重击正在积蓄。防守可以反制。"
  }
};

const combatActionStrain: Record<CombatAction, number> = {
  guard: 1,
  patch: 1,
  retreat: 0,
  strike: 2,
  tactic: 1
};

const combatTempoMax = 3;
const combatStaggerBreak = 3;
const combatActionOrder: CombatAction[] = ["strike", "guard", "patch", "tactic", "retreat"];

const combatActionNames: Record<CombatAction, string> = {
  guard: "防守",
  patch: "包扎",
  retreat: "撤退",
  strike: "攻击",
  tactic: "战术"
};

export function combatThreatPreview(journey: Pick<JourneyState, "combat" | "pressure">): JourneyCombatThreatPreview | null {
  const combat = journey.combat;
  if (!combat) {
    return null;
  }

  const intent = combatIntentDetails[combat.intent] ?? combatIntentDetails.maul;
  const pulse = combat.traitPulse ?? enemyTraitPulse(combat.enemyTrait);
  const pressureDamage = combat.enemyTrait === "swarm" ? Math.floor(journey.pressure / 20) : 0;
  const incomingDamage = Math.max(1, combat.attack + pressureDamage + intent.incoming);
  const counterActions = uniqueCombatActions([...combatIntentCounterActions(combat.intent), ...pulse.counterActions]);
  const riskyActions = combatActionOrder.filter(
    (action) => action !== "retreat" && !counterActions.includes(action) && combatActionRisksTempo(combat, action, journey.pressure)
  );
  const counterLabels = counterActions.map((action) => combatActionNames[action]);
  const riskyLabels = riskyActions.map((action) => combatActionNames[action]);
  const summaryParts = [`第 ${combat.round} 回合：${combat.enemyName} 准备${intent.label}，预计反击 ${incomingDamage}`];
  if (pressureDamage > 0) {
    summaryParts.push(`压力转化伤害 +${pressureDamage}`);
  }
  summaryParts.push(`建议反制：${counterLabels.join(" / ") || "保持队形"}`);
  const warningParts: string[] = [];
  if (combat.intent === "prowl" && riskyActions.includes("patch")) {
    warningParts.push("包扎会被游猎惩罚");
  }
  if (riskyLabels.length > 0) {
    warningParts.push(`${pulse.label} 高风险：${riskyLabels.join(" / ")}`);
  }
  if (warningParts.length === 0) {
    warningParts.push("没有明显高风险动作，仍需留意反击伤害。");
  }

  return {
    counterActions,
    counterLabels,
    incomingDamage,
    intentLabel: intent.label,
    pressureDamage,
    pulseLabel: pulse.label,
    riskyActions,
    riskyLabels,
    roundLabel: `第 ${combat.round} 回合`,
    summary: `${summaryParts.join("。")}。`,
    warning: `${warningParts.join("。")}。`
  };
}

export function combatRoundPlan(journey: Pick<JourneyState, "combat" | "pressure">): JourneyCombatRoundPlan | null {
  const threat = combatThreatPreview(journey);
  if (!threat) {
    return null;
  }

  const action = threat.counterActions[0] ?? "guard";
  const label = combatActionNames[action];
  const riskyText = threat.riskyLabels.length > 0 ? `避开 ${threat.riskyLabels.join(" / ")}` : "暂无必须避开的动作";

  return {
    action,
    label,
    reason: `${threat.intentLabel} 推荐 ${label}，预计反击 ${threat.incomingDamage}。`,
    riskText: `${riskyText}。${threat.warning}`,
    tone: threat.riskyActions.length > 0 || threat.pressureDamage > 0 ? "warning" : "safe"
  };
}

export function enemyTraitPulse(trait: JourneyEnemy["trait"]): JourneyEnemyPulse {
  const pulses: Record<JourneyEnemy["trait"], JourneyEnemyPulse> = {
    armored: {
      counterActions: ["tactic"],
      label: "甲壳闭锁",
      text: "如果没有持续暴露弱点，外壳会重新收紧。",
      warning: "如果战术没有维持弱点，护甲会硬化。"
    },
    bleeder: {
      counterActions: ["guard", "patch"],
      label: "裂伤",
      text: "失控攻击会让队伍留下持续流血。",
      warning: "新的流血会叠加，直到有人包扎或掩护队形。"
    },
    dread: {
      counterActions: ["guard", "tactic"],
      label: "黑色信号",
      text: "每一次不稳的交锋都会把路线推向恐慌。",
      warning: "除非队伍稳住或读懂节奏，否则压力会飙升。"
    },
    swarm: {
      counterActions: ["strike", "tactic"],
      label: "群体压迫",
      text: "路线压力会变成反击时额外扑上来的身影。",
      warning: "当前压力会增加伤害，并可能继续攀升。"
    }
  };

  return pulses[trait];
}

function enemyPulseCountersAction(combat: JourneyCombat, action: CombatAction) {
  const pulse = combat.traitPulse ?? enemyTraitPulse(combat.enemyTrait);
  return pulse.counterActions.includes(action);
}

function combatIntentCountersAction(combat: JourneyCombat, action: CombatAction) {
  return (
    (combat.intent === "windup" && action === "guard") ||
    (combat.intent === "brace" && action === "tactic") ||
    (combat.intent === "prowl" && (action === "strike" || action === "tactic"))
  );
}

function combatIntentCounterActions(intent: JourneyCombatIntent): CombatAction[] {
  if (intent === "windup" || intent === "maul") {
    return ["guard"];
  }

  if (intent === "brace") {
    return ["tactic"];
  }

  return ["strike", "tactic"];
}

function uniqueCombatActions(actions: CombatAction[]): CombatAction[] {
  return combatActionOrder.filter((action) => actions.includes(action));
}

function combatTempoValue(combat: JourneyCombat) {
  return Math.max(0, Math.min(combatTempoMax, combat.tempo ?? 0));
}

function combatStaggerValue(combat: JourneyCombat) {
  return Math.max(0, Math.min(combatStaggerBreak - 1, combat.stagger ?? 0));
}

function combatActionRisksTempo(combat: JourneyCombat, action: CombatAction, pressure: number) {
  return (combat.intent === "prowl" && action === "patch") || enemyPulseRisksAction(combat, action, pressure);
}

function withCombatTempoPreview(combat: JourneyCombat, action: CombatAction, effect: string) {
  if (combatIntentCountersAction(combat, action) || enemyPulseCountersAction(combat, action)) {
    return `${effect}, 节奏 +1，破势 +1`;
  }

  return effect;
}

function applyCombatTempoResult(journey: JourneyState, combat: JourneyCombat, action: CombatAction, incoming: number, title: string) {
  combat.tempo = combatTempoValue(combat);
  combat.stagger = combatStaggerValue(combat);

  if (combatIntentCountersAction(combat, action) || enemyPulseCountersAction(combat, action)) {
    combat.tempo = Math.min(combatTempoMax, combat.tempo + 1);
    combat.stagger = Math.min(combatStaggerBreak, combat.stagger + 1);
    journey.rollShift -= 0.01;
    journey.logs.push(`${title}: 战斗节奏：节奏 +1，破势 +1。节奏 ${combat.tempo}/${combatTempoMax}，破势 ${combat.stagger}/${combatStaggerBreak}。`);

    if (combat.stagger >= combatStaggerBreak) {
      combat.stagger = 0;
      combat.exposed = Math.min(5, combat.exposed + 2);
      combat.armor = Math.max(0, combat.armor - 1);
      journey.pressure = clampPercent(journey.pressure - 4);
      journey.rollShift -= 0.03;
      journey.logs.push(`${title}: 破势触发：敌人的架势被打裂，护甲 -1，暴露 +2，压力 -4%。`);
      return Math.max(1, incoming - 3);
    }

    return incoming;
  }

  if (combatActionRisksTempo(combat, action, journey.pressure) && combat.tempo > 0) {
    combat.tempo = Math.max(0, combat.tempo - 1);
    journey.pressure = clampPercent(journey.pressure + 2);
    journey.rollShift += 0.02;
    journey.logs.push(`${title}: 战斗节奏受挫：节奏 -1，压力 +2%。`);
  }

  return incoming;
}

function enemyPulseRisksAction(combat: JourneyCombat, action: CombatAction, pressure: number) {
  if (action === "retreat") {
    return false;
  }

  if (combat.enemyTrait === "armored") {
    return action !== "tactic" && combat.exposed <= 0;
  }

  if (combat.enemyTrait === "bleeder") {
    return action !== "guard" && action !== "patch";
  }

  if (combat.enemyTrait === "dread") {
    return action !== "guard" && action !== "tactic";
  }

  return action !== "strike" && action !== "tactic" && Math.floor(pressure / 20) > 0;
}

function previewWithEnemyPulse(
  combat: JourneyCombat,
  action: CombatAction,
  pressure: number,
  counterTag: JourneyCombatActionPreview["counterTag"],
  risk: string
): Pick<JourneyCombatActionPreview, "counterTag" | "risk"> {
  const pulse = combat.traitPulse ?? enemyTraitPulse(combat.enemyTrait);
  const countersPulse = enemyPulseCountersAction(combat, action);
  const risksPulse = enemyPulseRisksAction(combat, action, pressure);
  const nextCounterTag: JourneyCombatActionPreview["counterTag"] =
    countersPulse || counterTag === "Counter" ? "Counter" : counterTag === "Risk" || risksPulse ? "Risk" : "Standard";
  const nextRisk = countersPulse ? `${risk} 反制 ${pulse.label}。` : risksPulse ? `${risk} ${pulse.label}：${pulse.warning}` : risk;

  return {
    counterTag: nextCounterTag,
    risk: nextRisk
  };
}

function emptySupport(): ExpeditionSupport {
  return {
    ammoDamage: 0,
    campCook: 0,
    campRest: 0,
    campScout: 0,
    guardBlock: 0,
    lootEvade: 0,
    lootIntel: 0,
    lootMedicine: 0,
    lootSalvage: 0,
    maxHp: 0,
    openingExpose: 0,
    openingGuard: 0,
    patchHeal: 0,
    pressureRelief: 0,
    roadPush: 0,
    roadSearch: 0,
    roadSecure: 0,
    shopIntel: 0,
    shopRations: 0,
    shopService: 0,
    startingSupplies: {}
  };
}

function addPartialResources(target: ResourceBundle, source: Partial<ResourceBundle>) {
  for (const [key, value] of Object.entries(source) as Array<[ResourceKey, number | undefined]>) {
    target[key] += value ?? 0;
  }
}

function applyTravelPlanSupply(journey: JourneyState, plan: JourneyTravelPlan) {
  if (plan === "sneak") {
    const spentKey = spendFieldSupplyFromPriority(journey, ["fuel", "materials", "ammo"], 1);
    if (spentKey) {
      return {
        log: `${resourceLabels[spentKey]} -1 用于掩护`,
        pressure: -5
      };
    }

    journey.condition.fatigue = clampPercent(journey.condition.fatigue + 3);
    return {
      log: "缺少掩护物资：静默路线耗时更久",
      pressure: 6
    };
  }

  if (plan === "scavenge") {
    return {
      log: "额外搜索耗时",
      pressure: 0
    };
  }

  if (plan === "rush") {
    return {
      log: "不作停留",
      pressure: 0
    };
  }

  return {
    log: "",
    pressure: 0
  };
}

function applySegmentTactic(journey: JourneyState, tactic: JourneySegmentTacticOption) {
  const spentKey = tactic.supplyPriority.length > 0 ? spendFieldSupplyFromPriority(journey, tactic.supplyPriority, 1) : null;
  const effective = tactic.supplyPriority.length === 0 || Boolean(spentKey);
  const pressure = effective ? tactic.pressure : tactic.failPressure;
  const effects: string[] = [];

  if (tactic.id !== "observe") {
    effects.push(`战术：${tactic.label}`);
    if (spentKey) {
      effects.push(`消耗${resourceLabels[spentKey]}`);
    }
    if (pressure !== 0) {
      effects.push(`战术压力 ${formatSignedPercent(pressure)}`);
    }
    journey.logs.push(`路段战术：${tactic.label}。${effective ? tactic.successLog : tactic.fallbackLog}`);
  }

  return {
    effects,
    fatigue: effective ? tactic.fatigue : tactic.failFatigue,
    hunger: effective ? tactic.hunger : tactic.failHunger,
    pressure,
    routeSkill: effective ? tactic.routeSkill : 0,
    scavengeBonus: effective ? tactic.scavengeBonus : 0,
    thirst: effective ? tactic.thirst : tactic.failThirst
  };
}

function applySegmentThreat(journey: JourneyState, threat: JourneySegmentThreat, tactic: JourneySegmentTactic) {
  const countered = threat.counterTactics.includes(tactic);
  if (countered) {
    journey.logs.push(`威胁反制：${threat.label}。${threat.text}`);
    return {
      effects: [`已反制：${threat.label}`],
      fatigue: 0,
      hunger: 0,
      pressure: -Math.max(1, Math.floor(threat.pressure / 2)),
      scavengePenalty: 0,
      thirst: 0
    };
  }

  const mitigation = segmentThreatMitigationFor(threat, journey.support);
  const fatigue = Math.max(0, threat.fatigue - mitigation.fatigue);
  const pressure = Math.max(0, threat.pressure - mitigation.pressure);
  const scavengePenalty = Math.max(0, threat.scavengePenalty - mitigation.scavengePenalty);
  const mitigationEffects = [
    ...(mitigation.pressure > 0 ? [`设施减压 -${mitigation.pressure}%`] : []),
    ...(mitigation.fatigue > 0 ? [`设施降疲劳 -${mitigation.fatigue}`] : [])
  ];

  journey.logs.push(`路段威胁：${threat.label}。${threat.text}`);
  if (mitigation.value > 0) {
    journey.logs.push(`设施缓解：${threat.label}。${mitigation.source} 减轻了路线压力。`);
  }

  return {
    effects: [`威胁：${threat.label}`, ...(pressure > 0 ? [`威胁压力 ${formatSignedPercent(pressure)}`] : []), ...mitigationEffects],
    fatigue,
    hunger: threat.hunger,
    pressure,
    scavengePenalty,
    thirst: threat.thirst
  };
}

function createTravelRecord(
  journey: JourneyState,
  plan: JourneyTravelPlanOption,
  result: {
    effects: string[];
    hours: number;
    pressureDelta: number;
  }
): JourneyTravelRecord {
  const moodTable = familyTravelMoods[journey.locationFamily] ?? familyTravelMoods.urban;
  const mood = moodTable[Math.max(0, journey.condition.distance - 1) % moodTable.length];
  const conditionText = `疲劳 ${journey.condition.fatigue} / 饥饿 ${journey.condition.hunger} / 口渴 ${journey.condition.thirst}`;

  return {
    body: `${mood.body} ${plan.text}`,
    conditionText,
    effects: result.effects,
    hours: result.hours,
    planLabel: plan.label,
    pressureDelta: result.pressureDelta,
    segment: journey.condition.distance,
    timeLabel: formatHours(result.hours),
    title: mood.title,
    tone: travelToneFor(journey)
  };
}

function journeyElapsedHours(journey: Pick<JourneyState, "condition"> & Partial<Pick<JourneyState, "elapsedHours">>): number {
  return journey.elapsedHours ?? journey.condition.distance * 3;
}

function segmentHoursFor(plan: JourneyTravelPlanOption, tactic: JourneySegmentTactic): number {
  const tacticHours: Record<JourneySegmentTactic, number> = {
    brace: 1,
    observe: 0,
    prospect: 1,
    ration: 0
  };
  return Math.max(1, plan.hours + tacticHours[tactic]);
}

function formatHours(hours: number): string {
  return `${hours} 小时`;
}

function travelToneFor(journey: JourneyState): JourneyTravelTone {
  const worstCondition = Math.max(journey.condition.fatigue, journey.condition.hunger, journey.condition.thirst);
  if (journey.pressure >= 78 || worstCondition >= 82) {
    return "danger";
  }

  if (journey.pressure >= 52 || worstCondition >= 58) {
    return "warning";
  }

  return "safe";
}

function applyRoadHardship(journey: JourneyState, squad: Survivor[]): string[] {
  const hardship = roadHardshipFor(journey);
  if (!hardship) {
    return [];
  }

  let targetName: string | undefined;
  if (hardship.battleScar) {
    const target = roadHardshipTarget(journey, squad);
    journey.battleScars += 1;
    if (target) {
      markCombatScarTarget(journey, target.id);
      targetName = target.name;
    }
  }

  journey.condition.fatigue = clampPercent(journey.condition.fatigue + hardship.fatigueDelta);
  journey.pressure = clampPercent(journey.pressure + hardship.pressureDelta);
  journey.rollShift += hardship.rollShiftDelta;
  const record: JourneyHardshipRecord = {
    ...publicHardship(hardship),
    segment: journey.condition.distance,
    targetName
  };
  journey.hardships.push(record);
  journey.logs.push(
    `路上事故：${hardship.label}。${hardship.text} ${[
      ...hardship.effects,
      ...(targetName ? [`${targetName} 需要回基地治疗`] : [])
    ].join("，")}。`
  );

  return [`路上事故：${hardship.label}`, ...hardship.effects];
}

function roadHardshipFor(journey: Pick<JourneyState, "condition" | "pressure">): RoadHardship | null {
  const candidates = [
    createHardshipCandidate({
      battleScar: true,
      fatigueDelta: 3,
      id: "dehydration-crash",
      label: "脱水崩溃",
      minorAt: 58,
      pressureDelta: 8,
      rollShiftDelta: 0.08,
      severeAt: 82,
      text: "队伍缺水到无法维持干净的行军队形。",
      value: journey.condition.thirst
    }),
    createHardshipCandidate({
      battleScar: true,
      fatigueDelta: 6,
      id: "hunger-shakes",
      label: "饥饿发抖",
      minorAt: 62,
      pressureDelta: 6,
      rollShiftDelta: 0.06,
      severeAt: 84,
      text: "空腹让小失误变成了真正的伤口。",
      value: journey.condition.hunger
    }),
    createHardshipCandidate({
      battleScar: true,
      fatigueDelta: 0,
      id: "fatigue-collapse",
      label: "疲劳倒下",
      minorAt: 64,
      pressureDelta: 7,
      rollShiftDelta: 0.07,
      severeAt: 86,
      text: "路线最需要速度的时候，有人的腿先垮了。",
      value: journey.condition.fatigue
    }),
    createHardshipCandidate({
      battleScar: false,
      fatigueDelta: 4,
      id: "panic-spiral",
      label: "恐慌螺旋",
      minorAt: 64,
      pressureDelta: 4,
      rollShiftDelta: 0.09,
      severeAt: 86,
      text: "混乱的无线电纪律让道路听起来到处都是东西。",
      value: journey.pressure
    })
  ].filter((candidate): candidate is RoadHardship => Boolean(candidate));

  return candidates.sort((left, right) => right.score - left.score)[0] ?? null;
}

function createHardshipCandidate(input: {
  battleScar: boolean;
  fatigueDelta: number;
  id: string;
  label: string;
  minorAt: number;
  pressureDelta: number;
  rollShiftDelta: number;
  severeAt: number;
  text: string;
  value: number;
}): RoadHardship | null {
  if (input.value < input.minorAt) {
    return null;
  }

  const severe = input.value >= input.severeAt;
  const pressureDelta = severe ? input.pressureDelta : Math.max(2, Math.floor(input.pressureDelta / 2));
  const fatigueDelta = severe ? input.fatigueDelta : Math.max(0, Math.floor(input.fatigueDelta / 2));
  const effects = [
    ...(severe && input.battleScar ? ["战斗伤痕 +1"] : []),
    ...(fatigueDelta > 0 ? [`疲劳 +${fatigueDelta}`] : []),
    `压力 +${pressureDelta}%`
  ];

  return {
    battleScar: severe && input.battleScar,
    effects,
    fatigueDelta,
    id: input.id,
    label: input.label,
    pressureDelta,
    rollShiftDelta: severe ? input.rollShiftDelta : input.rollShiftDelta / 2,
    score: input.value + (severe ? 100 : 0),
    severity: severe ? "severe" : "minor",
    text: input.text
  };
}

function publicHardship(hardship: RoadHardship): JourneyHardship {
  return {
    effects: [...hardship.effects],
    id: hardship.id,
    label: hardship.label,
    severity: hardship.severity,
    text: hardship.text
  };
}

function roadHardshipTarget(journey: JourneyState, squad: Survivor[]) {
  const squadIds = new Set(journey.squadIds);
  const candidates = squad.filter((survivor) => squadIds.has(survivor.id));
  return [...candidates].sort((left, right) => {
    const leftScore = left.fatigue + left.injuries.length * 18 - Math.floor((left.attributes.stamina + left.attributes.willpower) / 2);
    const rightScore = right.fatigue + right.injuries.length * 18 - Math.floor((right.attributes.stamina + right.attributes.willpower) / 2);
    return rightScore - leftScore;
  })[0];
}

function segmentForecastRisk(journey: Pick<JourneyState, "condition" | "pressure">): JourneySegmentForecastRisk {
  const worstCondition = Math.max(journey.condition.fatigue, journey.condition.hunger, journey.condition.thirst);
  if (journey.pressure >= 78 || worstCondition >= 82) {
    return "critical";
  }

  if (journey.pressure >= 52 || worstCondition >= 58) {
    return "strained";
  }

  return "stable";
}

function sentenceCase(text: string) {
  return text.length ? `${text[0].toUpperCase()}${text.slice(1)}` : text;
}

function carryBurdenLabel(tier: JourneyCarryBurdenTier) {
  const labels: Record<JourneyCarryBurdenTier, string> = {
    heavy: "负重偏高",
    light: "轻装",
    overloaded: "超载"
  };
  return labels[tier];
}

function queueRoadEncounter(journey: JourneyState, squad: Survivor[], plan: JourneyTravelPlan, routeSkill: number, nextNodeIndex: number) {
  const table = familyRoadBeats[journey.locationFamily] ?? familyRoadBeats.urban;
  const beat = table[Math.max(0, journey.condition.distance - 1) % table.length];
  const roll = Math.random() + roadEncounterRollModifier(journey, squad, plan, routeSkill);

  let tone: JourneyRoadEventTone = "road";
  let body = beat.neutralLog;
  if (roll >= 0.78) {
    tone = "find";
    body = beat.opportunityLog;
  } else if (roll <= 0.22) {
    tone = "hazard";
    body = beat.hazardLog;
  }

  journey.pendingRoadEvent = {
    body,
    choices: createRoadEncounterChoices(beat, tone, plan, journey.support),
    id: `road-${journey.condition.distance}-${beat.title.replace(/\s+/g, "-").toLowerCase()}`,
    nextNodeIndex,
    segment: journey.condition.distance,
    title: beat.title,
    tone
  };
  journey.logs.push(`路口：${beat.title}。${body}`);
}

function roadEventForecastFor(
  journey: JourneyState,
  squad: Survivor[],
  plan: JourneyTravelPlan,
  routeSkill: number,
  tactic: JourneySegmentTactic,
  threat: JourneySegmentThreat
): JourneyRoadEventForecast {
  const table = familyRoadBeats[journey.locationFamily] ?? familyRoadBeats.urban;
  const beat = table[Math.max(0, journey.condition.distance - 1) % table.length];
  const modifier = roadEncounterRollModifier(journey, squad, plan, routeSkill);
  const hazardChance = clampChance(0.22 - modifier);
  const findChance = clampChance(0.22 + modifier);
  const roadChance = Math.max(0, 1 - hazardChance - findChance);
  const likelyTone = likelyRoadEventTone({ find: findChance, hazard: hazardChance, road: roadChance });
  const recommendedTactics = threat.counterTactics
    .map((tacticId) => segmentTacticOptions[tacticId]?.label ?? tacticId)
    .join(" / ");

  return {
    advice: threat.counterTactics.includes(tactic)
      ? `${segmentTacticOptions[tactic]?.label ?? "当前战术"}正在压低险情。`
      : `可考虑 ${recommendedTactics}，或用基地路线支援处理。`,
    beatTitle: beat.title,
    findChancePercent: chancePercent(findChance),
    hazardChancePercent: chancePercent(hazardChance),
    likelyTone,
    riskLabel: roadEventForecastLabel(likelyTone, hazardChance),
    roadChancePercent: chancePercent(roadChance),
    summary: `路上事件：${beat.title}。机会 ${chancePercent(findChance)}%，险情 ${chancePercent(hazardChance)}%，普通路口 ${chancePercent(roadChance)}%。`
  };
}

function cleanExtractionRoadForecast(): JourneyRoadEventForecast {
  return {
    advice: "保持队形撤离，不需要再处理路上抉择。",
    beatTitle: "撤离线",
    findChancePercent: 0,
    hazardChancePercent: 0,
    likelyTone: "road",
    riskLabel: "撤离线清晰",
    roadChancePercent: 100,
    summary: "撤离线清晰：下一段不会再触发额外路上事件。"
  };
}

function roadEncounterRollModifier(
  journey: Pick<JourneyState, "condition" | "locationFamily" | "pressure">,
  squad: Survivor[],
  plan: JourneyTravelPlan,
  routeSkill: number
) {
  const bestLuck = squad.length > 0 ? bestBy(squad, "luck").attributes.luck : 0;
  const worstCondition = Math.max(journey.condition.fatigue, journey.condition.hunger, journey.condition.thirst);
  return routeSkill * 0.05 + Math.floor(bestLuck / 40) * 0.03 + roadBeatPlanBonus(plan) - journey.pressure / 260 - worstCondition / 260;
}

function likelyRoadEventTone(chances: Record<JourneyRoadEventTone, number>): JourneyRoadEventTone {
  if (chances.hazard >= chances.find && chances.hazard >= chances.road) {
    return "hazard";
  }

  if (chances.find >= chances.road) {
    return "find";
  }

  return "road";
}

function roadEventForecastLabel(tone: JourneyRoadEventTone, hazardChance: number) {
  if (hazardChance >= 0.45) {
    return "险情偏高";
  }

  if (tone === "find") {
    return "机会偏高";
  }

  if (tone === "hazard") {
    return "险情接近";
  }

  return "路口可控";
}

function clampChance(value: number) {
  return Math.max(0, Math.min(1, value));
}

function chancePercent(value: number) {
  return Math.round(clampChance(value) * 100);
}

function canReachExtractionCleanly(journey: JourneyState, nextNodeIndex: number) {
  const nextNode = journey.nodes[nextNodeIndex];
  const worstCondition = Math.max(journey.condition.fatigue, journey.condition.hunger, journey.condition.thirst);
  return nextNode?.type === "extraction" && journey.pressure < 35 && worstCondition < 55;
}

function createRoadEncounterChoices(
  beat: JourneyRoadBeatTemplate,
  tone: JourneyRoadEventTone,
  plan: JourneyTravelPlan,
  support: ExpeditionSupport
): JourneyRoadEncounterChoice[] {
  const securePressure = tone === "hazard" ? Math.max(2, beat.pressure - 7) : tone === "find" ? 1 : 2;
  const searchRewardKeys = beat.rewardKeys.slice(0, tone === "find" ? 2 : 1);
  const searchPressure = tone === "find" ? (plan === "scavenge" ? -6 : -4) : tone === "hazard" ? Math.ceil(beat.pressure / 2) + 4 : 5;
  const pushPressure = tone === "hazard" ? beat.pressure + (plan === "rush" ? 2 : 0) : tone === "find" ? 2 : plan === "steady" ? 1 : 3;

  const choices: JourneyRoadEncounterChoice[] = [
    {
      fallbackLog: `${beat.hazardLog} 没有对应装备可用，队伍只能临场硬撑。`,
      fatigue: Math.max(1, Math.ceil(beat.fatigue / 2)),
      hunger: 0,
      id: "secure",
      label: "稳固路线",
      pressure: securePressure,
      reward: createEmptyResourceBundle(),
      rollShift: Math.max(0.02, beat.rollShift / 2),
      successLog: beat.mitigationLog,
      supplyPriority: beat.supplyPriority,
      text: "消耗匹配的随身装备，在问题扩散前把它压住。",
      thirst: 0
    },
    {
      fatigue: tone === "find" ? 2 : beat.fatigue,
      hunger: tone === "hazard" ? beat.hunger : 1,
      id: "search",
      label: "搜索边缘",
      pressure: searchPressure,
      reward: bundleFromKeys(searchRewardKeys),
      rollShift: tone === "find" ? -0.06 : beat.rollShift,
      successLog: beat.opportunityLog,
      supplyPriority: [],
      text: "放慢速度，把这段路线的价值榨出来。",
      thirst: tone === "hazard" ? beat.thirst : 1
    },
    {
      fatigue: Math.max(1, Math.ceil(beat.fatigue / 2) + (plan === "rush" ? 2 : 0)),
      hunger: tone === "hazard" ? Math.ceil(beat.hunger / 2) : 0,
      id: "push",
      label: "继续推进",
      pressure: pushPressure,
      reward: createEmptyResourceBundle(),
      rollShift: tone === "hazard" ? beat.rollShift : 0.02,
      successLog: tone === "find" ? "队伍记下机会点，保持路线节奏。" : "队伍在道路继续索价前离开。",
      supplyPriority: [],
      text: "不绕路，保住行进节奏。",
      thirst: tone === "hazard" ? Math.ceil(beat.thirst / 2) : 0
    }
  ];
  const supportChoice = createRoadSupportChoice(beat, tone, support);
  if (supportChoice) {
    choices.push(supportChoice);
  }
  return choices;
}

function createRoadSupportChoice(
  beat: JourneyRoadBeatTemplate,
  tone: JourneyRoadEventTone,
  support: ExpeditionSupport
): JourneyRoadEncounterChoice | null {
  const supportLevel =
    tone === "hazard"
      ? support.roadSecure
      : tone === "find"
        ? support.roadSearch
        : Math.max(support.roadSecure, support.roadSearch, support.roadPush);
  if (supportLevel <= 0) {
    return null;
  }

  const rewardKeys = tone === "find" ? beat.rewardKeys.slice(0, Math.min(2, supportLevel)) : tone === "road" ? beat.rewardKeys.slice(0, 1) : [];
  const pressure = tone === "hazard" ? -2 - supportLevel * 2 : tone === "find" ? -3 - supportLevel : -1 - supportLevel;
  const fatigue = Math.max(0, Math.ceil(beat.fatigue / 3) - Math.max(0, supportLevel - 1));
  const text =
    tone === "hazard"
      ? "调用基地预案清除危险，不消耗随身装备。"
      : tone === "find"
        ? "调用已标记路线，把机会点转成更干净的搜刮。"
        : "按预设绕路前进，让队伍继续受基地引导。";

  return {
    fatigue,
    hunger: 0,
    id: "support",
    label: "基地路线支援",
    pressure,
    reward: bundleFromKeys(rewardKeys),
    rollShift: tone === "find" ? -0.08 : tone === "hazard" ? -0.04 : -0.03,
    successLog: `基地路线支援提前处理了${beat.title}，队伍没有消耗随身装备`,
    supplyPriority: [],
    supportText: `设施路线战术 +${supportLevel}`,
    text,
    thirst: 0
  };
}

export function roadEncounterChoicePreview(
  journey: Pick<JourneyState, "fieldSupplies" | "pendingRoadEvent">,
  choice: JourneyRoadEncounterChoice
): JourneyRoadEncounterChoicePreview {
  const hasCost = choice.supplyPriority.length > 0;
  const spentKey = hasCost ? firstAvailableFieldSupply(journey.fieldSupplies, choice.supplyPriority) : null;
  const canPayCost = !hasCost || Boolean(spentKey);
  const pendingTone = journey.pendingRoadEvent?.tone ?? "road";

  if (!canPayCost) {
    const fallbackPressure = Math.max(4, choice.pressure + 6);
    const fallbackFatigue = choice.fatigue + 2;
    return {
      canPayCost: false,
      conditionText: `疲劳 +${fallbackFatigue} / 压力 ${formatSignedPercent(fallbackPressure)}`,
      costText: `缺少${choice.supplyPriority.map((key) => resourceLabels[key]).join("/")}`,
      outcomeLabel: "装备不足",
      rewardText: "无战利品",
      riskText: "缺少对应装备会硬吃险情，并可能在下一站前引发路上伏击。",
      tone: "danger"
    };
  }

  const ambushRisk = pendingTone === "hazard" && choice.id === "push";
  const supportChoice = choice.id === "support";
  const rewardText = formatBundle(choice.reward);
  const costText = spentKey ? `消耗${resourceLabels[spentKey]}` : hasCost ? "装备足够" : "无消耗";
  const outcomeLabel = supportChoice
    ? "基地支援"
    : ambushRisk
      ? "强行穿越"
      : rewardText !== "无战利品"
        ? "可带回收获"
        : choice.pressure < 0
          ? "降低压力"
          : "可控代价";

  return {
    canPayCost: true,
    conditionText: `疲劳 ${formatSignedNumber(choice.fatigue)} / 饥饿 ${formatSignedNumber(choice.hunger)} / 口渴 ${formatSignedNumber(
      choice.thirst
    )} / 压力 ${formatSignedPercent(choice.pressure)}`,
    costText,
    outcomeLabel,
    rewardText,
    riskText: supportChoice
      ? "调用基地路线预案，不消耗随身装备。"
      : ambushRisk
        ? "险情中继续推进会把动静带到下一站，可能直接触发路上伏击。"
        : choice.rollShift < 0
          ? "这会降低后续接触风险。"
          : choice.pressure > 0
            ? "会推高路线压力，之后更容易失控。"
            : "风险变化较小，适合保守处理。",
    tone: supportChoice || choice.pressure < 0 ? "safe" : ambushRisk || choice.pressure >= 8 ? "danger" : "warning"
  };
}

export function resolveRoadEncounterChoice(journey: JourneyState, action: JourneyRoadEncounterAction, squad: Survivor[] = [], readiness = 50): JourneyState {
  const next = structuredClone(journey) as JourneyState;
  const pending = next.pendingRoadEvent;
  const choice = pending?.choices.find((candidate) => candidate.id === action);
  if (!pending || !choice) {
    return next;
  }

  const spentKey = choice.supplyPriority.length > 0 ? spendFieldSupplyFromPriority(next, choice.supplyPriority, 1) : null;
  let outcome: string;
  let decisionImpacts: string[] = [];
  let decisionTone: JourneyDecisionTone = "warning";
  if (choice.supplyPriority.length > 0 && !spentKey) {
    const fallbackPressure = Math.max(4, choice.pressure + 6);
    const fallbackFatigue = choice.fatigue + 2;
    next.condition.fatigue = clampPercent(next.condition.fatigue + fallbackFatigue);
    next.pressure = clampPercent(next.pressure + fallbackPressure);
    next.rollShift += Math.max(0.04, choice.rollShift);
    outcome = `${withoutTerminalPunctuation(choice.fallbackLog ?? choice.successLog)}。疲劳 +${fallbackFatigue}，压力 ${formatSignedPercent(fallbackPressure)}。`;
    decisionImpacts = [`疲劳 +${fallbackFatigue}`, `压力 ${formatSignedPercent(fallbackPressure)}`, "可能触发伏击"];
    decisionTone = "danger";
    queueRoadAmbush(next, pending, squad, readiness);
  } else {
    addResources(next.bonusReward, choice.reward);
    next.condition.fatigue = clampPercent(next.condition.fatigue + choice.fatigue);
    next.condition.hunger = clampPercent(next.condition.hunger + choice.hunger);
    next.condition.thirst = clampPercent(next.condition.thirst + choice.thirst);
    next.pressure = clampPercent(next.pressure + choice.pressure);
    next.rollShift += choice.rollShift;
    const rewardText = formatBundle(choice.reward);
    outcome = `${withoutTerminalPunctuation(choice.successLog)}${spentKey ? `，${resourceLabels[spentKey]} -1` : ""}${
      rewardText !== "无战利品" ? `，${rewardText}` : ""
    }，疲劳 ${formatSignedNumber(choice.fatigue)}，饥饿 ${formatSignedNumber(choice.hunger)}，口渴 ${formatSignedNumber(
      choice.thirst
    )}，压力 ${formatSignedPercent(choice.pressure)}。`;
    decisionImpacts = [
      spentKey ? `${resourceLabels[spentKey]} -1` : "无消耗",
      rewardText,
      `疲劳 ${formatSignedNumber(choice.fatigue)}`,
      `饥饿 ${formatSignedNumber(choice.hunger)}`,
      `口渴 ${formatSignedNumber(choice.thirst)}`,
      `压力 ${formatSignedPercent(choice.pressure)}`
    ];
    decisionTone = choice.id === "support" || choice.pressure < 0 || rewardText !== "无战利品" ? "safe" : pending.tone === "hazard" ? "danger" : "warning";
    if (pending.tone === "hazard" && choice.id === "push") {
      queueRoadAmbush(next, pending, squad, readiness);
    }
  }

  recordJourneyDecision(next, {
    category: "road",
    detail: outcome,
    impacts: decisionImpacts,
    label: choice.label,
    nodeTitle: pending.title,
    tone: decisionTone
  });
  pushRoadEvent(next, pending.title, pending.tone, outcome, pending.segment);
  next.pendingRoadEvent = null;
  if (!next.combat) {
    next.currentNodeIndex = pending.nextNodeIndex;
  }
  return next;
}

function firstAvailableFieldSupply(resources: ResourceBundle, priority: ResourceKey[]) {
  return priority.find((key) => resources[key] > 0) ?? null;
}

function queueRoadAmbush(next: JourneyState, pending: JourneyPendingRoadEncounter, squad: Survivor[], readiness: number) {
  if (squad.length === 0 || next.combat) {
    return;
  }

  const enemy = materializeRoadAmbushEnemy(next.locationFamily, pending.segment);
  const ambushNode: JourneyNode = {
    body: `${pending.title}变得太吵，在下一站前把路外的东西引了过来。`,
    enemy,
    id: `${pending.id}-ambush`,
    title: "路上伏击",
    type: "combat"
  };
  next.nodes.splice(pending.nextNodeIndex, 0, ambushNode);
  next.currentNodeIndex = pending.nextNodeIndex;
  next.combat = createCombatForNode(ambushNode, squad, readiness, next.support);
  next.logs.push(`路上伏击：${pending.title}。错误的路线决策在下一站前变成了一次接触战。`);
}

function materializeRoadAmbushEnemy(family: LocationFamily, segment: number): JourneyEnemy {
  const table = familyEnemies[family] ?? familyEnemies.urban;
  return materializeEnemy(table[Math.max(0, segment - 1) % table.length]);
}

function pushRoadEvent(journey: JourneyState, title: string, tone: JourneyRoadEventTone, outcome: string, segment = journey.condition.distance) {
  const record = {
    outcome,
    segment,
    title,
    tone
  };
  journey.roadEvents.push(record);
  journey.logs.push(`路上事件：${title}。${outcome}`);
}

function roadBeatPlanBonus(plan: JourneyTravelPlan) {
  const bonuses: Record<JourneyTravelPlan, number> = {
    rush: -0.1,
    scavenge: 0.12,
    sneak: 0.08,
    steady: 0.03
  };
  return bonuses[plan];
}

function planScavengeBonus(plan: JourneyTravelPlan) {
  const bonuses: Record<JourneyTravelPlan, number> = {
    rush: -0.14,
    scavenge: 0.24,
    sneak: 0.06,
    steady: 0
  };
  return bonuses[plan];
}

function createCombatFrontline(squad: Survivor[], readiness: number, support: ExpeditionSupport): JourneyCombatant[] {
  const readinessBonus = Math.floor(readiness / 18);
  const supportShare = Math.floor(support.maxHp / Math.max(1, squad.length));
  const supportRemainder = support.maxHp % Math.max(1, squad.length);
  return squad.map((survivor, index) => {
    const supportBonus = supportShare + (index < supportRemainder ? 1 : 0);
    const injuryPenalty = survivor.injuries.length * 3;
    const fatiguePenalty = Math.floor(survivor.fatigue / 18);
    const maxStamina = Math.max(
      10,
      12 +
        Math.floor(survivor.attributes.stamina / 10) +
        Math.floor(survivor.attributes.willpower / 18) +
        readinessBonus +
        supportBonus -
        injuryPenalty -
        fatiguePenalty
    );

    return {
      guard: 0,
      lastAction: null,
      maxStamina,
      name: survivor.name,
      role: survivor.profession,
      stamina: maxStamina,
      status: "steady",
      survivorId: survivor.id,
      wounds: 0
    };
  });
}

function applyOpeningGuard(frontline: JourneyCombatant[], openingGuard: number) {
  if (frontline.length === 0 || openingGuard <= 0) {
    return;
  }

  const guardShare = Math.floor(openingGuard / frontline.length);
  const guardRemainder = openingGuard % frontline.length;
  frontline.forEach((combatant, index) => {
    combatant.guard += guardShare + (index < guardRemainder ? 1 : 0);
  });
}

function markCombatantAction(combat: JourneyCombat, survivorId: string, action: string) {
  const combatant = combat.frontline.find((line) => line.survivorId === survivorId);
  if (combatant) {
    combatant.lastAction = action;
  }
}

function applyCombatActionStrain(journey: JourneyState, combat: JourneyCombat, survivorId: string, amount: number, action: CombatAction) {
  const combatant = combat.frontline.find((line) => line.survivorId === survivorId);
  const strain = Math.max(0, Math.floor(amount));
  if (!combatant || combatant.status === "down" || strain <= 0) {
    return;
  }

  const spent = Math.min(combatant.stamina, strain);
  combatant.stamina = Math.max(0, combatant.stamina - spent);
  combat.squadHp = Math.max(0, combat.squadHp - spent);
  if (combatant.stamina === 0) {
    combatant.wounds += 1;
    combatant.status = "down";
    journey.battleScars += 1;
    markCombatScarTarget(journey, combatant.survivorId);
    journey.logs.push(`行动负担：${combatant.name} 在${combatActionNames[action]}中消耗 ${spent} 体力，过度用力后倒下。`);
  } else {
    refreshCombatantStatus(combatant);
    journey.logs.push(`行动负担：${combatant.name} 在${combatActionNames[action]}中消耗 ${spent} 体力。`);
  }
}

function braceCombatant(combat: JourneyCombat, survivorId: string, guard: number) {
  const combatant = combat.frontline.find((line) => line.survivorId === survivorId);
  if (combatant && combatant.status !== "down") {
    combatant.guard = Math.max(combatant.guard, guard);
  }
}

function healWeakestCombatant(combat: JourneyCombat, amount: number, fallbackSurvivorId: string) {
  const damaged = [...combat.frontline]
    .filter((line) => line.stamina < line.maxStamina)
    .sort((left, right) => {
      if (left.status === "down" && right.status !== "down") {
        return -1;
      }
      if (left.status !== "down" && right.status === "down") {
        return 1;
      }
      return left.stamina / left.maxStamina - right.stamina / right.maxStamina;
    });
  const patient = damaged[0] ?? combat.frontline.find((line) => line.survivorId === fallbackSurvivorId) ?? combat.frontline[0];
  if (!patient) {
    return null;
  }

  patient.stamina = Math.min(patient.maxStamina, patient.stamina + Math.max(0, Math.floor(amount)));
  refreshCombatantStatus(patient);
  syncCombatSquadHp(combat);
  return patient;
}

function applyCombatDamage(journey: JourneyState, combat: JourneyCombat, amount: number, focusSurvivorId: string | null) {
  let remaining = Math.max(0, Math.floor(amount));
  const targets = orderedCombatTargets(combat, focusSurvivorId);

  for (const target of targets) {
    if (remaining <= 0) {
      break;
    }

    if (target.status === "down") {
      continue;
    }

    const blocked = Math.min(target.guard, remaining);
    target.guard -= blocked;
    remaining -= blocked;
    if (remaining <= 0) {
      refreshCombatantStatus(target);
      break;
    }

    const before = target.stamina;
    const dealt = Math.min(before, remaining);
    target.stamina = Math.max(0, before - dealt);
    remaining -= dealt;
    if (before > 0 && target.stamina === 0) {
      target.wounds += 1;
      target.status = "down";
      journey.battleScars += 1;
      markCombatScarTarget(journey, target.survivorId);
      journey.logs.push(`${target.name} 倒下，已标记为回营治疗。`);
    } else {
      refreshCombatantStatus(target);
    }
  }

  syncCombatSquadHp(combat);
}

function applyCombatCounterDamage(
  journey: JourneyState,
  combat: JourneyCombat,
  amount: number,
  focusSurvivorId: string | null,
  action: CombatAction
) {
  if (!shouldSpreadCounterDamage(journey, combat, action)) {
    applyCombatDamage(journey, combat, amount, focusSurvivorId);
    return false;
  }

  const targets = combat.frontline.filter((line) => line.status !== "down");
  const damage = Math.max(0, Math.floor(amount));
  const share = Math.floor(damage / targets.length);
  const remainder = damage % targets.length;
  targets.forEach((target, index) => {
    applyCombatDamage(journey, combat, share + (index < remainder ? 1 : 0), target.survivorId);
  });
  journey.logs.push(`${combat.enemyName} 的反击被队形分担，没有集中压垮主攻手。`);
  return true;
}

function shouldSpreadCounterDamage(journey: JourneyState, combat: JourneyCombat, action: CombatAction) {
  return (
    action === "strike" &&
    combat.enemyTrait === "armored" &&
    combat.exposed <= 0 &&
    journey.pressure < 30 &&
    combat.frontline.filter((line) => line.status !== "down").length > 1
  );
}

function orderedCombatTargets(combat: JourneyCombat, focusSurvivorId: string | null) {
  const living = combat.frontline.filter((line) => line.status !== "down");
  const focused = focusSurvivorId ? living.find((line) => line.survivorId === focusSurvivorId) : null;
  const rest = living
    .filter((line) => line.survivorId !== focused?.survivorId)
    .sort((left, right) => left.stamina / left.maxStamina - right.stamina / right.maxStamina);
  return focused ? [focused, ...rest] : rest;
}

function markCombatScarTargetsFromFrontline(journey: JourneyState, combat: JourneyCombat, count: number) {
  const candidates = [...combat.frontline].sort((left, right) => {
    if (left.status === "down" && right.status !== "down") {
      return -1;
    }
    if (left.status !== "down" && right.status === "down") {
      return 1;
    }
    if (right.wounds !== left.wounds) {
      return right.wounds - left.wounds;
    }
    return left.stamina / left.maxStamina - right.stamina / right.maxStamina;
  });

  for (const candidate of candidates.slice(0, count)) {
    markCombatScarTarget(journey, candidate.survivorId);
  }
}

function markCombatScarTarget(journey: JourneyState, survivorId: string) {
  if (!journey.woundedSurvivorIds.includes(survivorId)) {
    journey.woundedSurvivorIds.push(survivorId);
  }
}

function refreshCombatantStatus(combatant: JourneyCombatant) {
  if (combatant.stamina <= 0) {
    combatant.status = "down";
    return;
  }

  combatant.status = combatant.stamina / combatant.maxStamina < 0.35 ? "strained" : "steady";
}

function syncCombatSquadHp(combat: JourneyCombat) {
  combat.squadHp = combat.frontline.reduce((sum, line) => sum + line.stamina, 0);
}

function nextCombatIntent(trait: JourneyEnemy["trait"], round: number, pressure: number) {
  const pressureIntent: JourneyCombatIntent | null = pressure >= 70 ? "windup" : pressure >= 50 ? "prowl" : null;
  if (pressureIntent && round > 1) {
    return combatIntentDetails[pressureIntent];
  }

  const sequenceByTrait: Record<JourneyEnemy["trait"], JourneyCombatIntent[]> = {
    armored: ["brace", "windup", "maul"],
    bleeder: ["prowl", "maul", "windup"],
    dread: ["windup", "prowl", "maul"],
    swarm: ["prowl", "maul", "brace"]
  };
  const sequence = sequenceByTrait[trait];
  return combatIntentDetails[sequence[(round - 1) % sequence.length]];
}

function combatActorForAction(combat: JourneyCombat, squad: Survivor[], action: CombatAction) {
  const statByAction: Record<CombatAction, keyof Survivor["attributes"]> = {
    guard: "willpower",
    patch: "medical",
    retreat: "willpower",
    strike: "agility",
    tactic: "technical"
  };
  const livingIds = new Set(combat.frontline.filter((line) => line.status !== "down").map((line) => line.survivorId));
  const candidates = squad.filter((survivor) => livingIds.has(survivor.id));
  return bestBy(candidates.length > 0 ? candidates : squad, statByAction[action]);
}

function bestBy(squad: Survivor[], stat: keyof Survivor["attributes"]) {
  return squad.reduce((best, survivor) => (survivor.attributes[stat] > best.attributes[stat] ? survivor : best), squad[0]);
}

function hasPerk(survivor: Survivor, perkId: "field_runner" | "steady_hands") {
  const level = "level" in survivor && typeof survivor.level === "number" ? survivor.level : 1;
  if (level < 2) {
    return false;
  }

  const mobility = survivor.attributes.agility + survivor.attributes.stamina;
  const control = survivor.attributes.technical + survivor.attributes.medical + survivor.attributes.willpower;
  const primary = mobility >= control / 1.5 ? "field_runner" : "steady_hands";
  return primary === perkId;
}

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, value));
}

function formatBundle(resources: ResourceBundle) {
  const entries = resourceKeys.filter((key) => resources[key] > 0);
  if (entries.length === 0) {
    return "无战利品";
  }

  return entries.map((key) => `${resourceLabels[key]} +${resources[key]}`).join(" / ");
}

function formatResourceCounts(resources: ResourceBundle | Partial<ResourceBundle>) {
  const entries = resourceKeys.filter((key) => (resources[key] ?? 0) > 0);
  if (entries.length === 0) {
    return "无";
  }

  return entries.map((key) => `${resourceLabels[key]} ${resources[key] ?? 0}`).join(" / ");
}

function compactDecisionImpacts(impacts: string[]) {
  return impacts.map((impact) => impact.trim()).filter((impact) => impact && !/无战利品|无消耗/.test(impact));
}

function decisionToneFromImpact(impactText: string): JourneyDecisionTone {
  if (/伏击|伤痕|\+\d+%|压力 \+\d|疲劳 \+\d|饥饿 \+\d|口渴 \+\d|不足/.test(impactText)) {
    return "danger";
  }

  if (/压力 -|目标|入库|随身|战利|回收|伤痕 -/.test(impactText)) {
    return "safe";
  }

  return "warning";
}

function familyLabelFor(family: LocationFamily) {
  const labels: Record<LocationFamily, string> = {
    resources: "生存资源点",
    urban: "城市风险点",
    weird: "剧情/怪异点",
    wilds: "荒野探索点"
  };
  return labels[family];
}

function pressureLabelFor(pressure: number) {
  if (pressure >= 60) {
    return "高压";
  }

  if (pressure >= 30) {
    return "紧张";
  }

  return "可控";
}

function supportSummaryFor(support: ExpeditionSupport) {
  const effects = [
    support.maxHp > 0 ? `生命 +${support.maxHp}` : "",
    support.guardBlock > 0 ? `防守 +${support.guardBlock}` : "",
    support.patchHeal > 0 ? `包扎 +${support.patchHeal}` : "",
    support.pressureRelief > 0 ? `压力 -${support.pressureRelief}` : "",
    support.roadSecure + support.roadSearch + support.roadPush > 0
      ? `路线 +${support.roadSecure + support.roadSearch + support.roadPush}`
      : "",
    support.campCook + support.campRest + support.campScout > 0 ? `营地 +${support.campCook + support.campRest + support.campScout}` : "",
    support.shopRations + support.shopIntel + support.shopService > 0 ? `商店 +${support.shopRations + support.shopIntel + support.shopService}` : "",
    formatResourceCounts(support.startingSupplies) !== "无" ? `出发补给：${formatResourceCounts(support.startingSupplies)}` : ""
  ].filter(Boolean);

  return effects.length > 0 ? effects.join(" / ") : "暂无可用后勤支援";
}

function uniqueText(items: string[]) {
  return [...new Set(items)];
}

function formatSignedPercent(value: number) {
  return `${value >= 0 ? "+" : ""}${value}%`;
}

function formatSignedNumber(value: number) {
  return `${value >= 0 ? "+" : ""}${value}`;
}

function withActionStrain(effect: string, strain: number) {
  return strain > 0 ? `${effect}，体力 -${strain}` : effect;
}

function withoutTerminalPunctuation(value: string) {
  return value.replace(/[.!?]+$/, "");
}

function combatTrophyFor(trait: JourneyEnemy["trait"]) {
  const trophies: Record<JourneyEnemy["trait"], string> = {
    armored: "装甲碎片",
    bleeder: "锯齿样本",
    dread: "黑色信号碎片",
    swarm: "群体诱饵"
  };
  return trophies[trait];
}

function pick<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length) % items.length];
}

const travelScavengeKeys: ResourceKey[] = ["materials", "food", "water", "medicine", "fuel", "ammo"];
