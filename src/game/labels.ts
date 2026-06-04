import type { ExpeditionOutcome, LocationFamily, ResourceKey, RiskStrategy, StatKey } from "./types";

export const resourceLabels: Record<ResourceKey, string> = {
  food: "食物",
  water: "水",
  materials: "材料",
  medicine: "药品",
  fuel: "燃料",
  ammo: "弹药"
};

export const statLabels: Record<StatKey, string> = {
  stamina: "体能",
  agility: "敏捷",
  technical: "技术",
  medical: "医疗",
  social: "社交",
  willpower: "意志",
  luck: "幸运",
  infectionResistance: "抗感染"
};

export const riskLabels: Record<RiskStrategy, string> = {
  cautious: "保守",
  standard: "标准",
  greedy: "贪婪"
};

export const riskDescriptions: Record<RiskStrategy, string> = {
  cautious: "收益较低，伤病和意外概率下降。",
  standard: "平衡收益与风险，适合多数地点。",
  greedy: "收益更高，也更容易把战报写得很难看。"
};

export const outcomeLabels: Record<ExpeditionOutcome, string> = {
  clean: "干净收队",
  rough: "有惊无险",
  costly: "代价不小"
};

export const locationFamilyLabels: Record<LocationFamily, string> = {
  resources: "生存资源点",
  urban: "城市风险点",
  wilds: "荒野探索点",
  weird: "剧情/怪异点"
};

export const resourceKeys = Object.keys(resourceLabels) as ResourceKey[];
