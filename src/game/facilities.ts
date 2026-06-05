import type { Facility } from "./types";

export const maxFacilityLevel = 3;

export const facilityBlueprints: Facility[] = [
  { category: "core", id: "dorm", name: "Dormitory", level: 1, status: "stable", effect: "Rest beds improve daily fatigue recovery and guard endurance." },
  { category: "core", id: "clinic", name: "Clinic", level: 1, status: "strained", effect: "Treatment improves care shifts and field patching." },
  { category: "core", id: "generator", name: "Generator", level: 1, status: "strained", effect: "Power improves ammo support and field starts." },
  { category: "core", id: "watchtower", name: "Watchtower", level: 1, status: "stable", effect: "Lookouts lower daily danger and route pressure." },
  { category: "survival", id: "kitchen", name: "Kitchen", level: 0, status: "critical", effect: "Unbuilt. Lowers daily food and water upkeep once built." },
  { category: "survival", id: "barricade", name: "Barricade Line", level: 0, status: "critical", effect: "Unbuilt. Reduces daily danger and strengthens guard actions." },
  { category: "expedition", id: "training", name: "Training Room", level: 0, status: "critical", effect: "Unbuilt. Improves expedition XP and combat stamina once built." },
  { category: "expedition", id: "workshop", name: "Workshop", level: 0, status: "critical", effect: "Unbuilt. Improves repair shifts and ammo damage once built." },
  { category: "utility", id: "radio", name: "Radio Bench", level: 0, status: "critical", effect: "Unbuilt. Improves objective progress and lowers route pressure." }
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
    return ["Fully developed", facilityGrowthSummary(facility.id, facility.level)];
  }

  const nextLevel = isFacilityBuilt(facility) ? facility.level + 1 : 1;
  return [`${isFacilityBuilt(facility) ? "Upgrades" : "Builds"} to Lv.${nextLevel}`, facilityGrowthSummary(facility.id, nextLevel)];
}

export function facilityBaseEffect(facilityId: string): string {
  return facilityBlueprints.find((facility) => facility.id === facilityId)?.effect ?? "Improves base operations.";
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
      `Base: danger pressure -${value}/day, guard shifts +${value}. Expedition: guard +${value}, road secure +${value}, evade +${value}.`,
    clinic: (value) => {
      const advanced = Math.max(0, value - 1);
      return `Base: care shifts +${value * 2}, recovery +${advanced * 2}. Expedition: patch +${advanced * 3}, medical loot +${advanced}, start medicine ${
        value >= 3 ? "+1" : "+0"
      }.`;
    },
    dorm: (value) => {
      const advanced = Math.max(0, value - 1);
      return `Base: daily recovery +${value * 3}. Expedition: max HP +${advanced * 4}, guard +${advanced}, camp rest +${advanced}.`;
    },
    generator: (value) => {
      const advanced = Math.max(0, value - 1);
      return `Base: powered starts stay online. Expedition: ammo damage +${advanced}, start ammo ${value >= 3 ? "+1" : "+0"}.`;
    },
    kitchen: (value) =>
      `Base: food upkeep -${value}/day, water upkeep -${Math.floor(value / 2)}/day. Expedition: camp meal +${value}, shop rations +${value}.`,
    radio: (value) =>
      `Base: objective ${value >= 2 ? "+1/day and " : ""}repair shifts +${value >= 1 ? 1 : 0}. Expedition: pressure relief +${value}, intel +${value}, camp scout +${value}.`,
    training: (value) => `Base: no daily upkeep change. Expedition: combat stamina +${value * 2}, carry capacity +${Math.floor(value / 2)}.`,
    watchtower: (value) => {
      const advanced = Math.max(0, value - 1);
      return `Base: danger pressure -${value}/day. Expedition: pressure relief +${advanced * 2}, road search +${advanced}, road push +${advanced}.`;
    },
    workshop: (value) =>
      `Base: repair shifts +${Math.floor(value / 2)}, materials on strong repairs. Expedition: ammo damage +${value}, salvage +${value}, shop service +${value}.`
  };
  const summarize = summaries[facilityId];
  if (summarize) {
    return summarize(level);
  }
  return "Improves base and expedition operations.";
}
