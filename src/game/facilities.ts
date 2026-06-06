import type { Facility } from "./types";

export const maxFacilityLevel = 3;

export const facilityBlueprints: Facility[] = [
  { category: "core", id: "dorm", name: "宿舍", level: 1, status: "stable", effect: "床位改善每日疲劳恢复，并提升守卫耐久。" },
  { category: "core", id: "clinic", name: "医务室", level: 1, status: "strained", effect: "治疗区提升护理班次和野外包扎效果。" },
  { category: "core", id: "generator", name: "发电机", level: 1, status: "strained", effect: "供电提升弹药支援和出征开局准备。" },
  { category: "core", id: "watchtower", name: "瞭望塔", level: 1, status: "stable", effect: "瞭望降低每日危险和路线压力。" },
  { category: "survival", id: "kitchen", name: "厨房", level: 0, status: "critical", effect: "降低每日食物和饮水消耗。" },
  { category: "survival", id: "barricade", name: "路障线", level: 0, status: "critical", effect: "降低每日危险，并强化守卫行动。" },
  { category: "expedition", id: "training", name: "训练室", level: 0, status: "critical", effect: "提升远征经验和战斗耐力。" },
  { category: "expedition", id: "workshop", name: "工坊", level: 0, status: "critical", effect: "提升修理班次和弹药伤害。" },
  { category: "utility", id: "radio", name: "电台台架", level: 0, status: "critical", effect: "提升目标进度，并降低路线压力。" }
];

const buildCosts: Record<string, number> = {
  barricade: 8,
  kitchen: 6,
  radio: 12,
  training: 8,
  workshop: 10
};

export function completeFacilities(facilities: Facility[]): Facility[] {
  const byId = new Map(facilities.map((facility) => [facility.id, facility]));
  return facilityBlueprints.map((blueprint) => ({
    ...blueprint,
    ...(byId.get(blueprint.id) ?? {})
  }));
}

export function facilityActionCost(facility: Facility): number {
  if (isFacilityMaxed(facility)) {
    return 0;
  }

  if (!isFacilityBuilt(facility)) {
    return buildCosts[facility.id] ?? 8;
  }

  return facility.level * 5;
}

export function facilityActionLabel(facility: Facility): "Build" | "Upgrade" | "Maxed" {
  if (isFacilityMaxed(facility)) {
    return "Maxed";
  }

  return isFacilityBuilt(facility) ? "Upgrade" : "Build";
}

export function facilityUpgradePreview(facility: Facility): string[] {
  if (isFacilityMaxed(facility)) {
    return ["已完全发展", facilityGrowthSummary(facility.id, facility.level)];
  }

  const nextLevel = isFacilityBuilt(facility) ? facility.level + 1 : 1;
  return [`${isFacilityBuilt(facility) ? "升级" : "建造"}到 Lv.${nextLevel}`, facilityGrowthSummary(facility.id, nextLevel)];
}

export function facilityBaseEffect(facilityId: string): string {
  return facilityBlueprints.find((facility) => facility.id === facilityId)?.effect ?? "改善基地运转。";
}

export function isFacilityBuilt(facility: Facility): boolean {
  return facility.level > 0;
}

export function isFacilityMaxed(facility: Facility): boolean {
  return facility.level >= maxFacilityLevel;
}

function facilityGrowthSummary(facilityId: string, level: number): string {
  const summaries: Record<string, (level: number) => string> = {
    barricade: (value) =>
      `基地：每日危险压力 -${value}，守卫班次 +${value}。出征：防守 +${value}，稳固路线 +${value}，撤离回避 +${value}。`,
    clinic: (value) => {
      const advanced = Math.max(0, value - 1);
      return `基地：护理班次 +${value * 2}，恢复 +${advanced * 2}。出征：包扎 +${advanced * 3}，医疗战利 +${advanced}，开局药品 ${
        value >= 3 ? "+1" : "+0"
      }.`;
    },
    dorm: (value) => {
      const advanced = Math.max(0, value - 1);
      return `基地：每日恢复 +${value * 3}。出征：生命上限 +${advanced * 4}，防守 +${advanced}，营地休整 +${advanced}。`;
    },
    generator: (value) => {
      const advanced = Math.max(0, value - 1);
      return `基地：供电系统保持在线。出征：弹药伤害 +${advanced}，开局弹药 ${value >= 3 ? "+1" : "+0"}。`;
    },
    kitchen: (value) =>
      `基地：每日食物消耗 -${value}，每日饮水消耗 -${Math.floor(value / 2)}。出征：营地餐食 +${value}，商店口粮 +${value}。`,
    radio: (value) =>
      `基地：目标${value >= 2 ? "每日 +1，" : ""}修理班次 +${value >= 1 ? 1 : 0}。出征：压力缓解 +${value}，情报 +${value}，营地侦察 +${value}。`,
    training: (value) => `基地：不改变每日消耗。出征：战斗耐力 +${value * 2}，背包容量 +${Math.floor(value / 2)}。`,
    watchtower: (value) => {
      const advanced = Math.max(0, value - 1);
      return `基地：每日危险压力 -${value}。出征：压力缓解 +${advanced * 2}，路线搜索 +${advanced}，强行推进 +${advanced}。`;
    },
    workshop: (value) =>
      `基地：修理班次 +${Math.floor(value / 2)}，高效修理可产出材料。出征：弹药伤害 +${value}，拆解战利 +${value}，商店服务 +${value}。`
  };
  const summarize = summaries[facilityId];
  if (summarize) {
    return summarize(level);
  }
  return "改善基地与出征运转。";
}
