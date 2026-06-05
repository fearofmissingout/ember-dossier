import type { Facility, ResourceBundle } from "../game/types";
import type { AccountSurvivor } from "./types";

export type SurvivorPerkId = "field_runner" | "steady_hands" | "base_instinct";

export type SurvivorPerk = {
  id: SurvivorPerkId;
  label: string;
  description: string;
};

export type ExpeditionSupport = {
  ammoDamage: number;
  guardBlock: number;
  lootEvade: number;
  lootIntel: number;
  lootMedicine: number;
  lootSalvage: number;
  maxHp: number;
  patchHeal: number;
  pressureRelief: number;
  startingSupplies: Partial<ResourceBundle>;
};

export const survivorPerks: Record<SurvivorPerkId, SurvivorPerk> = {
  base_instinct: {
    description: "Base shifts produce +1 when this survivor works forage, repair, guard, or care.",
    id: "base_instinct",
    label: "Base Instinct"
  },
  field_runner: {
    description: "Strike and retreat actions are sharper; this survivor helps the squad move through bad contact.",
    id: "field_runner",
    label: "Field Runner"
  },
  steady_hands: {
    description: "Patch and tactic actions are stronger; this survivor keeps panic from becoming injury.",
    id: "steady_hands",
    label: "Steady Hands"
  }
};

export function survivorPerkIds(survivor: AccountSurvivor): SurvivorPerkId[] {
  const perks: SurvivorPerkId[] = [];
  if (survivor.level >= 2) {
    perks.push(primaryPerkFor(survivor));
  }
  if (survivor.level >= 3) {
    perks.push("base_instinct");
  }
  return [...new Set(perks)];
}

export function survivorPerkDetails(survivor: AccountSurvivor): SurvivorPerk[] {
  return survivorPerkIds(survivor).map((perkId) => survivorPerks[perkId]);
}

export function hasSurvivorPerk(survivor: AccountSurvivor, perkId: SurvivorPerkId) {
  return survivorPerkIds(survivor).includes(perkId);
}

export function xpForNextLevel(survivor: AccountSurvivor) {
  return survivor.level * 20;
}

export function supportFromFacilities(facilities: Facility[]): ExpeditionSupport {
  const dorm = facilityLevel(facilities, "dorm");
  const clinic = facilityLevel(facilities, "clinic");
  const generator = facilityLevel(facilities, "generator");
  const watchtower = facilityLevel(facilities, "watchtower");
  const barricade = facilityLevel(facilities, "barricade");
  const radio = facilityLevel(facilities, "radio");
  const training = facilityLevel(facilities, "training");
  const workshop = facilityLevel(facilities, "workshop");

  return {
    ammoDamage: Math.max(0, generator - 1) + workshop,
    guardBlock: Math.max(0, dorm - 1) + barricade,
    lootEvade: Math.max(0, watchtower - 1) + barricade,
    lootIntel: radio,
    lootMedicine: Math.max(0, clinic - 1),
    lootSalvage: workshop,
    maxHp: Math.max(0, dorm - 1) * 4 + training * 2,
    patchHeal: Math.max(0, clinic - 1) * 3,
    pressureRelief: Math.max(0, watchtower - 1) * 2 + radio,
    startingSupplies: {
      ammo: generator >= 3 ? 1 : 0,
      medicine: clinic >= 3 ? 1 : 0
    }
  };
}

function primaryPerkFor(survivor: AccountSurvivor): SurvivorPerkId {
  const mobility = survivor.attributes.agility + survivor.attributes.stamina;
  const control = survivor.attributes.technical + survivor.attributes.medical + survivor.attributes.willpower;
  return mobility >= control / 1.5 ? "field_runner" : "steady_hands";
}

function facilityLevel(facilities: Facility[], facilityId: string) {
  return facilities.find((facility) => facility.id === facilityId)?.level ?? 0;
}
