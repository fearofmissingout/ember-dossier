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
    return ["Fully developed", facilityGrowthSummary(facility.id)];
  }

  const nextLevel = isFacilityBuilt(facility) ? facility.level + 1 : 1;
  return [`${isFacilityBuilt(facility) ? "Upgrades" : "Builds"} to Lv.${nextLevel}`, facilityGrowthSummary(facility.id)];
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

function facilityGrowthSummary(facilityId: string): string {
  const summaries: Record<string, string> = {
    barricade: "Reduces danger, strengthens guard shifts, and unlocks road-secure doctrine support.",
    clinic: "Improves care shifts, field patching, and high-level medicine starts.",
    dorm: "Improves daily recovery, guard endurance, and formation doctrine stamina.",
    generator: "Improves ammo support, combat damage, and high-level starting ammo.",
    kitchen: "Lowers daily food and water upkeep.",
    radio: "Improves objective repair windows, route pressure relief, and intel recovery.",
    training: "Improves expedition stamina, breach drills, and combat resilience.",
    watchtower: "Improves route pressure relief, scouting, and road-search doctrine support.",
    workshop: "Improves repair shifts, salvage, ammo damage, and road-secure support."
  };
  return summaries[facilityId] ?? "Improves base and expedition operations.";
}
