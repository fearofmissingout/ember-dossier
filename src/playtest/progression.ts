import type { Facility, ResourceBundle } from "../game/types";
import type { AccountSurvivor } from "./types";

export type SurvivorPerkId = "field_runner" | "steady_hands" | "base_instinct";
export type ExpeditionDoctrineId =
  | "breach-drill"
  | "field-triage"
  | "hold-formation"
  | "hot-magazines"
  | "overwatch-route"
  | "road-rations"
  | "salvage-rig"
  | "shield-line"
  | "signal-map";

export type SurvivorPerk = {
  id: SurvivorPerkId;
  label: string;
  description: string;
};

export type ExpeditionSupport = {
  ammoDamage: number;
  campCook: number;
  campRest: number;
  campScout: number;
  guardBlock: number;
  lootEvade: number;
  lootIntel: number;
  lootMedicine: number;
  lootSalvage: number;
  maxHp: number;
  patchHeal: number;
  pressureRelief: number;
  roadPush: number;
  roadSearch: number;
  roadSecure: number;
  shopIntel: number;
  shopRations: number;
  shopService: number;
  startingSupplies: Partial<ResourceBundle>;
};

export type ExpeditionDoctrineOption = {
  effect: string;
  facilityId: string;
  id: ExpeditionDoctrineId;
  label: string;
  text: string;
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

const expeditionDoctrineDefinitions: ExpeditionDoctrineOption[] = [
  {
    effect: "Max HP +6 / Guard +1",
    facilityId: "dorm",
    id: "hold-formation",
    label: "Hold Formation",
    text: "Dorm shifts send the squad out rested and drilled around a tighter marching line."
  },
  {
    effect: "Medicine +1 / Patch +3",
    facilityId: "clinic",
    id: "field-triage",
    label: "Field Triage",
    text: "The clinic pre-packs a treatment roll and assigns a clear casualty protocol."
  },
  {
    effect: "Ammo +1 / Ammo damage +2",
    facilityId: "generator",
    id: "hot-magazines",
    label: "Hot Magazines",
    text: "Generator time charges tools and keeps the first magazines dry and ready."
  },
  {
    effect: "Pressure -4 / Road search +2",
    facilityId: "watchtower",
    id: "overwatch-route",
    label: "Overwatch Route",
    text: "Lookouts mark the first blind turns before the squad leaves the gate."
  },
  {
    effect: "Food +1 / Water +1",
    facilityId: "kitchen",
    id: "road-rations",
    label: "Road Rations",
    text: "The kitchen turns base stores into compact travel meals and clean canteens."
  },
  {
    effect: "Guard +2 / Road secure +2",
    facilityId: "barricade",
    id: "shield-line",
    label: "Shield Line",
    text: "The barricade crew sends planks, shields, and gate drills with the squad."
  },
  {
    effect: "Max HP +4 / Guard +1",
    facilityId: "training",
    id: "breach-drill",
    label: "Breach Drill",
    text: "The training room rehearses contact roles before the route starts."
  },
  {
    effect: "Salvage +2 / Road secure +1",
    facilityId: "workshop",
    id: "salvage-rig",
    label: "Salvage Rig",
    text: "The workshop bolts together pry kits and impact tools for the return haul."
  },
  {
    effect: "Pressure -3 / Road search +1",
    facilityId: "radio",
    id: "signal-map",
    label: "Signal Map",
    text: "The radio bench turns static into a marked route and better clue recovery."
  }
];

export function expeditionDoctrineOptions(facilities: Facility[]): ExpeditionDoctrineOption[] {
  return expeditionDoctrineDefinitions.filter((doctrine) => facilityLevel(facilities, doctrine.facilityId) > 0);
}

export function supportFromFacilities(facilities: Facility[], doctrineId?: ExpeditionDoctrineId | null): ExpeditionSupport {
  const dorm = facilityLevel(facilities, "dorm");
  const clinic = facilityLevel(facilities, "clinic");
  const generator = facilityLevel(facilities, "generator");
  const watchtower = facilityLevel(facilities, "watchtower");
  const barricade = facilityLevel(facilities, "barricade");
  const kitchen = facilityLevel(facilities, "kitchen");
  const radio = facilityLevel(facilities, "radio");
  const training = facilityLevel(facilities, "training");
  const workshop = facilityLevel(facilities, "workshop");

  const support: ExpeditionSupport = {
    ammoDamage: Math.max(0, generator - 1) + workshop,
    campCook: kitchen,
    campRest: Math.max(0, dorm - 1) + Math.max(0, clinic - 1),
    campScout: Math.max(0, watchtower - 1) + radio,
    guardBlock: Math.max(0, dorm - 1) + barricade,
    lootEvade: Math.max(0, watchtower - 1) + barricade,
    lootIntel: radio,
    lootMedicine: Math.max(0, clinic - 1),
    lootSalvage: workshop,
    maxHp: Math.max(0, dorm - 1) * 4 + training * 2,
    patchHeal: Math.max(0, clinic - 1) * 3,
    pressureRelief: Math.max(0, watchtower - 1) * 2 + radio,
    roadPush: Math.max(0, watchtower - 1),
    roadSearch: Math.max(0, watchtower - 1) + radio,
    roadSecure: barricade + Math.floor(workshop / 2),
    shopIntel: radio,
    shopRations: kitchen,
    shopService: workshop,
    startingSupplies: {
      ammo: generator >= 3 ? 1 : 0,
      medicine: clinic >= 3 ? 1 : 0
    }
  };

  if (!doctrineId || !expeditionDoctrineOptions(facilities).some((doctrine) => doctrine.id === doctrineId)) {
    return support;
  }

  return applyExpeditionDoctrine(support, doctrineId);
}

function applyExpeditionDoctrine(support: ExpeditionSupport, doctrineId: ExpeditionDoctrineId): ExpeditionSupport {
  const next: ExpeditionSupport = {
    ...support,
    startingSupplies: { ...support.startingSupplies }
  };

  if (doctrineId === "hold-formation") {
    next.maxHp += 6;
    next.guardBlock += 1;
  } else if (doctrineId === "field-triage") {
    next.patchHeal += 3;
    next.lootMedicine += 1;
    next.startingSupplies.medicine = (next.startingSupplies.medicine ?? 0) + 1;
  } else if (doctrineId === "hot-magazines") {
    next.ammoDamage += 2;
    next.startingSupplies.ammo = (next.startingSupplies.ammo ?? 0) + 1;
  } else if (doctrineId === "overwatch-route") {
    next.pressureRelief += 4;
    next.campScout += 1;
    next.lootEvade += 1;
    next.roadSearch += 2;
    next.roadPush += 1;
  } else if (doctrineId === "road-rations") {
    next.campCook += 1;
    next.roadPush += 1;
    next.shopRations += 1;
    next.startingSupplies.food = (next.startingSupplies.food ?? 0) + 1;
    next.startingSupplies.water = (next.startingSupplies.water ?? 0) + 1;
  } else if (doctrineId === "shield-line") {
    next.guardBlock += 2;
    next.lootEvade += 1;
    next.roadSecure += 2;
  } else if (doctrineId === "breach-drill") {
    next.maxHp += 4;
    next.guardBlock += 1;
    next.roadSecure += 1;
  } else if (doctrineId === "salvage-rig") {
    next.ammoDamage += 1;
    next.lootSalvage += 2;
    next.roadSecure += 1;
    next.shopService += 1;
  } else if (doctrineId === "signal-map") {
    next.pressureRelief += 3;
    next.campScout += 1;
    next.lootIntel += 1;
    next.roadSearch += 1;
  }

  return next;
}

function primaryPerkFor(survivor: AccountSurvivor): SurvivorPerkId {
  const mobility = survivor.attributes.agility + survivor.attributes.stamina;
  const control = survivor.attributes.technical + survivor.attributes.medical + survivor.attributes.willpower;
  return mobility >= control / 1.5 ? "field_runner" : "steady_hands";
}

function facilityLevel(facilities: Facility[], facilityId: string) {
  return facilities.find((facility) => facility.id === facilityId)?.level ?? 0;
}
