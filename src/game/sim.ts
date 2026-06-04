import { emptyResources } from "./content";
import type {
  ExpeditionReport,
  ExpeditionRequest,
  ExpeditionResult,
  GameState,
  ResourceBundle,
  ResourceKey,
  RiskStrategy,
  StatKey,
  Survivor
} from "./types";

const resourceKeys: ResourceKey[] = ["food", "water", "materials", "medicine", "fuel", "ammo"];

const resourceNames: Record<ResourceKey, string> = {
  food: "食物",
  water: "水",
  materials: "材料",
  medicine: "药品",
  fuel: "燃料",
  ammo: "弹药"
};

const riskConfig: Record<RiskStrategy, { label: string; rewardMultiplier: number; scoreBonus: number; fatigue: number }> = {
  cautious: {
    label: "保守路线",
    rewardMultiplier: 1.25,
    scoreBonus: 16,
    fatigue: 12
  },
  standard: {
    label: "标准路线",
    rewardMultiplier: 1.45,
    scoreBonus: 2,
    fatigue: 17
  },
  greedy: {
    label: "贪婪路线",
    rewardMultiplier: 1.8,
    scoreBonus: -20,
    fatigue: 24
  }
};

export function resolveExpedition(state: GameState, request: ExpeditionRequest): ExpeditionResult {
  const location = state.locations.find((candidate) => candidate.id === request.locationId);
  if (!location) {
    throw new Error(`Unknown location: ${request.locationId}`);
  }

  const squad = request.squadIds.map((id) => {
    const survivor = state.survivors.find((candidate) => candidate.id === id);
    if (!survivor) {
      throw new Error(`Unknown survivor: ${id}`);
    }
    return survivor;
  });

  if (squad.length < 3 || squad.length > 5) {
    throw new Error("Expeditions require a squad of 3 to 5 survivors.");
  }

  const config = riskConfig[request.risk];
  const pressureRoll = average(request.randomRolls ?? [Math.random(), Math.random(), Math.random()]);
  const squadScore = scoreSquadForLocation(squad, location.recommendedStats);
  const loadoutScore = scoreLoadout(request.loadout);
  const outcomeScore = squadScore + loadoutScore + config.scoreBonus - location.risk - pressureRoll * 40;
  const outcome = outcomeScore >= 18 ? "clean" : outcomeScore >= -8 ? "rough" : "costly";
  const reward = calculateReward(location.reward, config.rewardMultiplier, outcome);
  const penalties = calculatePenalties(request.risk, outcome);
  const nextState = cloneState(state);

  applyResourceChanges(nextState.resources, request.loadout, reward, penalties);
  applySurvivorConsequences(nextState.survivors, request.squadIds, config.fatigue, outcome);

  const createdAt = "刚刚";
  const report: ExpeditionReport = {
    id: `report-${Date.now()}`,
    locationName: location.name,
    squadNames: squad.map((survivor) => survivor.name),
    outcome,
    reward,
    penalties,
    logs: buildLogs(squad, location.name, config.label, outcome, reward),
    createdAt
  };

  nextState.feed = [
    {
      id: `feed-${report.id}`,
      kind: "report",
      title: `${location.name}远征完成`,
      body: summarizeReport(report),
      timestamp: createdAt
    },
    ...nextState.feed
  ];

  return { nextState, report };
}

function scoreSquadForLocation(squad: Survivor[], recommendedStats: StatKey[]): number {
  const total = squad.reduce((squadTotal, survivor) => {
    const survivorScore = recommendedStats.reduce((statTotal, stat) => statTotal + survivor.attributes[stat], 0);
    return squadTotal + survivorScore / recommendedStats.length;
  }, 0);

  return total / squad.length;
}

function scoreLoadout(loadout: ResourceBundle): number {
  return loadout.medicine * 2 + loadout.fuel * 1.5 + loadout.ammo * 2 + loadout.food + loadout.water;
}

function calculateReward(baseReward: ResourceBundle, multiplier: number, outcome: ExpeditionReport["outcome"]): ResourceBundle {
  const outcomeMultiplier = outcome === "clean" ? multiplier : outcome === "rough" ? Math.max(1, multiplier - 0.25) : 0.75;
  const reward = emptyResources();

  for (const key of resourceKeys) {
    reward[key] = baseReward[key] === 0 ? 0 : Math.max(1, Math.round(baseReward[key] * outcomeMultiplier));
  }

  return reward;
}

function calculatePenalties(risk: RiskStrategy, outcome: ExpeditionReport["outcome"]) {
  if (outcome === "clean") {
    return { morale: 0, danger: 0 };
  }

  if (outcome === "rough") {
    return {
      morale: risk === "greedy" ? -2 : -1,
      danger: risk === "greedy" ? 1 : 0
    };
  }

  return {
    morale: risk === "greedy" ? -3 : -2,
    danger: risk === "greedy" ? 2 : 1
  };
}

function applyResourceChanges(
  resources: GameState["resources"],
  loadout: ResourceBundle,
  reward: ResourceBundle,
  penalties: { morale: number; danger: number }
) {
  for (const key of resourceKeys) {
    resources[key] = Math.max(0, resources[key] - loadout[key] + reward[key]);
  }

  resources.morale = clamp(resources.morale + penalties.morale, 0, 100);
  resources.danger = clamp(resources.danger + penalties.danger, 0, 100);
}

function applySurvivorConsequences(
  survivors: Survivor[],
  squadIds: string[],
  fatigueGain: number,
  outcome: ExpeditionReport["outcome"]
) {
  for (const survivor of survivors) {
    if (squadIds.includes(survivor.id)) {
      survivor.fatigue = clamp(survivor.fatigue + fatigueGain, 0, 100);
    }
  }

  if (outcome === "costly") {
    const wounded = survivors.find((survivor) => survivor.id === squadIds[0]);
    if (wounded && !wounded.injuries.includes("撕裂伤")) {
      wounded.injuries = [...wounded.injuries, "撕裂伤"];
    }
  }
}

function buildLogs(
  squad: Survivor[],
  locationName: string,
  routeLabel: string,
  outcome: ExpeditionReport["outcome"],
  reward: ResourceBundle
): string[] {
  const lead = squad[0];
  const medic = squad.find((survivor) => survivor.profession === "医生") ?? squad[1];

  return [
    `侦察员先确认了${locationName}外围的声响，结论是：能进去，但别向墙打招呼。`,
    `${lead.name}带队选择了${routeLabel}，小队把档案室发的坏运气夹在地图背面。`,
    `${medic.name}记录了沿途状态，${outcome === "costly" ? "其中一页被血和雨水一起糊住了" : "字迹工整得令人不安"}。`,
    `带回补给：水 ${reward.water}、材料 ${reward.materials}、药品 ${reward.medicine}、食物 ${reward.food}、燃料 ${reward.fuel}、弹药 ${reward.ammo}。`
  ];
}

function summarizeReport(report: ExpeditionReport): string {
  const outcomeText = report.outcome === "clean" ? "干净收队" : report.outcome === "rough" ? "有惊无险" : "代价不小";
  return `${outcomeText}：${report.squadNames.join("、")}完成远征，主要收获 ${formatReward(report.reward)}。`;
}

function formatReward(reward: ResourceBundle): string {
  return resourceKeys
    .filter((key) => reward[key] > 0)
    .map((key) => `${resourceNames[key]}:${reward[key]}`)
    .join(" / ");
}

function cloneState(state: GameState): GameState {
  return structuredClone(state) as GameState;
}

function average(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
