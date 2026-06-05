import type { GameState, LocationFamily, ResourceBundle, ResourceKey, RiskStrategy } from "../game/types";
import type { PlaytestSession } from "./types";

export type JourneyAction = "careful" | "force" | "trade" | "skip" | "extract";
export type CombatAction = "strike" | "guard" | "patch";

export type JourneyDraft = {
  squadIds: string[];
  risk: RiskStrategy;
  loadout: ResourceBundle;
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
  hpBonus: number;
  attackBonus: number;
  reward: ResourceBundle;
  intro: string;
};

export type JourneyShop = {
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

export type JourneyNode = {
  id: string;
  type: "event" | "combat" | "shop" | "extraction";
  title: string;
  body: string;
  careful?: JourneyChoice;
  enemy?: JourneyEnemy;
  force?: JourneyChoice;
  shop?: JourneyShop;
};

export type JourneyCombat = {
  enemyName: string;
  enemyHp: number;
  enemyMaxHp: number;
  squadHp: number;
  squadMaxHp: number;
  attack: number;
  round: number;
  reward: ResourceBundle;
};

export type JourneyState = {
  bonusReward: ResourceBundle;
  combat: JourneyCombat | null;
  currentNodeIndex: number;
  fieldSupplies: ResourceBundle;
  id: string;
  loadout: ResourceBundle;
  locationId: string;
  logs: string[];
  nodes: JourneyNode[];
  pressure: number;
  risk: RiskStrategy;
  rollShift: number;
  squadIds: string[];
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

type ShopTemplate = Omit<JourneyShop, "reward"> & {
  rewardKeys: ResourceKey[];
};

const familyEvents: Record<LocationFamily, JourneyEventTemplate[]> = {
  resources: [
    {
      title: "Sluice Gate Detour",
      body: "A service gate is half-open, with enough room to crawl through if the squad is willing to slow down.",
      careful: {
        fallbackLog: "The team maps the gate by touch, but thirst makes every pause louder.",
        label: "Map the gate",
        pressure: -11,
        rewardKeys: ["water", "materials"],
        rollShift: -0.11,
        successLog: "The team spends a drink break mapping the gate and marks a safer return lane.",
        supplyPriority: ["water", "food"]
      },
      force: {
        fallbackLog: "The squad forces the rusted gate dry and the shriek carries too far.",
        label: "Crank it open",
        pressure: 9,
        rewardKeys: ["materials"],
        rollShift: 0.09,
        successLog: "A burst of ammo breaks the lock before the sound can build.",
        supplyPriority: ["ammo", "fuel"]
      }
    },
    {
      title: "Pump Room Cache",
      body: "Something useful is sealed inside a maintenance locker, but the room keeps filling with bad air.",
      careful: {
        fallbackLog: "They open the locker slowly, finding supplies while coughing through the delay.",
        label: "Vent first",
        pressure: -8,
        rewardKeys: ["materials", "medicine"],
        rollShift: -0.08,
        successLog: "Fuel runs the vent fan long enough to search cleanly.",
        supplyPriority: ["fuel", "water"]
      },
      force: {
        fallbackLog: "The locker gives way, but the echo wakes the lower level.",
        label: "Break locker",
        pressure: 11,
        rewardKeys: ["materials", "water"],
        rollShift: 0.1,
        successLog: "A quick pry job spends tools and keeps the noise contained.",
        supplyPriority: ["materials", "ammo"]
      }
    }
  ],
  urban: [
    {
      title: "Apartment Stairwell",
      body: "A stairwell is packed with old furniture, sealed doors, and names scratched into the paint.",
      careful: {
        fallbackLog: "The squad clears each landing by hand, gaining loot but burning daylight.",
        label: "Clear landings",
        pressure: -9,
        rewardKeys: ["food", "materials"],
        rollShift: -0.09,
        successLog: "Food keeps the sweep methodical and the stairwell stays quiet.",
        supplyPriority: ["food", "water"]
      },
      force: {
        fallbackLog: "They shove through the barricade and something below starts answering.",
        label: "Kick through",
        pressure: 12,
        rewardKeys: ["materials", "ammo"],
        rollShift: 0.12,
        successLog: "Ammo clears the worst door hinge before the whole block hears it.",
        supplyPriority: ["ammo", "fuel"]
      }
    },
    {
      title: "Clinic Back Desk",
      body: "The back desk still has labeled drawers, but the reception bell rings whenever the floor flexes.",
      careful: {
        fallbackLog: "The drawers open one by one, useful but painfully slow.",
        label: "Catalog drawers",
        pressure: -10,
        rewardKeys: ["medicine", "materials"],
        rollShift: -0.1,
        successLog: "Medicine is spent stabilizing a leaking cabinet before the search.",
        supplyPriority: ["medicine", "water"]
      },
      force: {
        fallbackLog: "A fast grab pulls supplies and three unwanted echoes.",
        label: "Fast grab",
        pressure: 10,
        rewardKeys: ["medicine", "food"],
        rollShift: 0.09,
        successLog: "A flare of fuel distracts the corridor long enough to move.",
        supplyPriority: ["fuel", "ammo"]
      }
    }
  ],
  weird: [
    {
      title: "Listening Vines",
      body: "The plants bend toward voices. Even whispers seem to feed them.",
      careful: {
        fallbackLog: "The squad mouths instructions and gathers samples while nerves fray.",
        label: "Move silent",
        pressure: -7,
        rewardKeys: ["medicine", "food"],
        rollShift: -0.1,
        successLog: "Water poured into the roots keeps the vines distracted.",
        supplyPriority: ["water", "medicine"]
      },
      force: {
        fallbackLog: "The squad cuts through and the greenhouse remembers their names.",
        label: "Cut through",
        pressure: 15,
        rewardKeys: ["food", "medicine"],
        rollShift: 0.14,
        successLog: "Fuel fire buys a short, ugly path through the vines.",
        supplyPriority: ["fuel", "ammo"]
      }
    },
    {
      title: "Mirror Aisle",
      body: "The corridor reflects the squad with a delay, as if the building needs time to invent them.",
      careful: {
        fallbackLog: "They mark the real path with chalk dust and recover a little salvage.",
        label: "Mark reality",
        pressure: -8,
        rewardKeys: ["materials", "medicine"],
        rollShift: -0.11,
        successLog: "Medicine keeps the shaking hands steady enough to mark the safe panes.",
        supplyPriority: ["medicine", "food"]
      },
      force: {
        fallbackLog: "They smash the false panes. The real ones scream later.",
        label: "Smash panes",
        pressure: 14,
        rewardKeys: ["materials", "ammo"],
        rollShift: 0.13,
        successLog: "Ammo shatters the wrong reflection before it can step out.",
        supplyPriority: ["ammo", "fuel"]
      }
    }
  ],
  wilds: [
    {
      title: "Irrigation Ditch",
      body: "The ditch can hide the team from sight, but every step is mud and old wire.",
      careful: {
        fallbackLog: "They probe the mud slowly, finding food but losing momentum.",
        label: "Probe mud",
        pressure: -10,
        rewardKeys: ["food", "water"],
        rollShift: -0.1,
        successLog: "Water keeps the team steady while they probe for wire.",
        supplyPriority: ["water", "food"]
      },
      force: {
        fallbackLog: "They sprint the ditch and leave a trail that can be followed.",
        label: "Sprint ditch",
        pressure: 9,
        rewardKeys: ["food", "materials"],
        rollShift: 0.08,
        successLog: "A burst of fuel smoke hides the sprint.",
        supplyPriority: ["fuel", "ammo"]
      }
    },
    {
      title: "Field Shrine",
      body: "A roadside shrine has fresh ash, canned fruit, and footprints that stop too suddenly.",
      careful: {
        fallbackLog: "They leave a token and take only what will not be missed.",
        label: "Leave token",
        pressure: -9,
        rewardKeys: ["food", "medicine"],
        rollShift: -0.09,
        successLog: "Food left behind makes the exchange feel almost fair.",
        supplyPriority: ["food", "water"]
      },
      force: {
        fallbackLog: "They take the stash and the field goes quiet in the wrong way.",
        label: "Loot shrine",
        pressure: 13,
        rewardKeys: ["food", "ammo"],
        rollShift: 0.12,
        successLog: "Ammo scares off whatever was watching the shrine.",
        supplyPriority: ["ammo", "fuel"]
      }
    }
  ]
};

const familyEnemies: Record<LocationFamily, EnemyTemplate[]> = {
  resources: [
    { attackBonus: 0, hpBonus: 2, intro: "A maintenance thing drags a wrench behind it.", name: "Valve Ghoul", rewardKeys: ["materials"] },
    { attackBonus: 1, hpBonus: 5, intro: "A nest of wet cables snaps awake.", name: "Cable Nest", rewardKeys: ["water", "materials"] }
  ],
  urban: [
    { attackBonus: 2, hpBonus: 3, intro: "A hallway pack hears the squad before the squad sees it.", name: "Hallway Pack", rewardKeys: ["ammo"] },
    { attackBonus: 1, hpBonus: 7, intro: "The locked ward is not empty enough.", name: "Ward Keeper", rewardKeys: ["medicine"] }
  ],
  weird: [
    { attackBonus: 3, hpBonus: 4, intro: "The shadow arrives half a step before its owner.", name: "Borrowed Shadow", rewardKeys: ["medicine", "materials"] },
    { attackBonus: 2, hpBonus: 8, intro: "The room folds into a thing with too many corners.", name: "Glass Saint", rewardKeys: ["food", "medicine"] }
  ],
  wilds: [
    { attackBonus: 0, hpBonus: 4, intro: "A scarecrow drops from its pole and runs badly but fast.", name: "Running Scarecrow", rewardKeys: ["food"] },
    { attackBonus: 1, hpBonus: 6, intro: "Something under the field moves like a plow.", name: "Burrower", rewardKeys: ["food", "materials"] }
  ]
};

const familyShops: Record<LocationFamily, ShopTemplate[]> = {
  resources: [
    {
      costPriority: ["materials", "fuel"],
      failLog: "No useful trade goods remain; the mechanic closes the kit.",
      label: "Buy repair kit",
      pressureFail: 3,
      pressureSuccess: -6,
      rewardKeys: ["medicine", "ammo"],
      rollShiftFail: 0.03,
      rollShiftSuccess: -0.06,
      successLog: "The road mechanic swaps a field kit and bullets for salvage."
    }
  ],
  urban: [
    {
      costPriority: ["medicine", "food", "materials"],
      failLog: "The courier refuses promises and disappears upstairs.",
      label: "Trade with courier",
      pressureFail: 4,
      pressureSuccess: -7,
      rewardKeys: ["ammo", "fuel"],
      rollShiftFail: 0.04,
      rollShiftSuccess: -0.07,
      successLog: "A courier sells a shortcut code and a small ammo roll."
    }
  ],
  weird: [
    {
      costPriority: ["water", "medicine", "fuel"],
      failLog: "The masked vendor tilts its head and charges the squad in bad luck instead.",
      label: "Pay masked vendor",
      pressureFail: 6,
      pressureSuccess: -8,
      rewardKeys: ["medicine", "materials"],
      rollShiftFail: 0.06,
      rollShiftSuccess: -0.08,
      successLog: "The masked vendor accepts the offering and points at the real exit."
    }
  ],
  wilds: [
    {
      costPriority: ["food", "water", "materials"],
      failLog: "The field trader shrugs. No barter, no map.",
      label: "Barter at field cart",
      pressureFail: 2,
      pressureSuccess: -5,
      rewardKeys: ["medicine", "fuel"],
      rollShiftFail: 0.02,
      rollShiftSuccess: -0.05,
      successLog: "A field trader marks a dry path and hands over a wrapped bottle."
    }
  ]
};

export function createJourney(session: PlaytestSession, draft: JourneyDraft, locationId: string, readiness: number): JourneyState {
  const location = session.room.locations.find((candidate) => candidate.id === locationId);
  const family = location?.family ?? "urban";
  const event = materializeEvent(pick(familyEvents[family]));
  const enemy = materializeEnemy(pick(familyEnemies[family]));
  const shop = materializeShop(pick(familyShops[family]));

  const nodes: JourneyNode[] = [
    {
      body: `${event.body} Destination: ${location?.name ?? "unknown site"}.`,
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
      title: "Contact",
      type: "combat"
    },
    {
      body: "A temporary barter point appears before extraction. The price depends on what survived the road.",
      id: "route-shop",
      shop,
      title: "Roadside Exchange",
      type: "shop"
    },
    {
      body: "The exit is visible. One last signal check before the base opens the gate.",
      id: "route-extraction",
      title: "Extraction Window",
      type: "extraction"
    }
  ];

  return {
    bonusReward: createEmptyResourceBundle(),
    combat: null,
    currentNodeIndex: 0,
    fieldSupplies: { ...draft.loadout },
    id: `journey-${Date.now()}`,
    loadout: { ...draft.loadout },
    locationId,
    logs: [
      `Route opened for ${location?.name ?? "unknown site"} with ${draft.squadIds.length} survivor(s).`,
      `Packed supplies are now field supplies. Spend them to lower pressure or save them for settlement.`
    ],
    nodes,
    pressure: draft.risk === "cautious" ? 10 : draft.risk === "greedy" ? 28 : 18,
    risk: draft.risk,
    rollShift: draft.risk === "cautious" ? -0.03 : draft.risk === "greedy" ? 0.05 : 0,
    squadIds: [...draft.squadIds]
  };
}

export function createCombatForNode(
  node: JourneyNode | undefined,
  squad: GameState["survivors"],
  readiness: number
): JourneyCombat | null {
  if (!node || node.type !== "combat") {
    return null;
  }

  const riskIndex = squad.length > 4 ? 2 : squad.length > 3 ? 1 : 0;
  const enemy = node.enemy ?? materializeEnemy(familyEnemies.urban[0]);
  const enemyMaxHp = 22 + riskIndex * 6 + enemy.hpBonus;
  const squadMaxHp = 28 + squad.length * 10 + Math.round(readiness / 5);

  return {
    attack: 6 + riskIndex * 2 + enemy.attackBonus,
    enemyHp: enemyMaxHp,
    enemyMaxHp,
    enemyName: enemy.name,
    reward: { ...enemy.reward },
    round: 1,
    squadHp: squadMaxHp,
    squadMaxHp
  };
}

export function addResources(target: ResourceBundle, source: ResourceBundle) {
  for (const key of resourceKeys) {
    target[key] += source[key];
  }
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

function materializeShop(template: ShopTemplate): JourneyShop {
  return {
    ...template,
    reward: bundleFromKeys(template.rewardKeys)
  };
}

function bundleFromKeys(keys: ResourceKey[]) {
  const bundle = createEmptyResourceBundle();
  for (const key of keys) {
    bundle[key] += 1;
  }
  return bundle;
}

const resourceKeys: ResourceKey[] = ["food", "water", "materials", "medicine", "fuel", "ammo"];

function pick<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length) % items.length];
}
