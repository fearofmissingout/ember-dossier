import type { GameState, LocationFamily, ResourceBundle, ResourceKey, RiskStrategy, Survivor } from "../game/types";
import type { ExpeditionSupport } from "./progression";
import type { PlaytestSession } from "./types";

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
  currentLabel: string;
  currentStop: number;
  currentTitle: string;
  distanceSegments: number;
  forecast: JourneyRouteStop[];
  nextLabel: string;
  nextTitle: string;
  pendingRoad: boolean;
  progressPercent: number;
  remainingStops: number;
  totalStops: number;
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
  planLabel: string;
  pressureDelta: number;
  segment: number;
  title: string;
  tone: JourneyTravelTone;
};

export type JourneySegmentForecastRisk = "stable" | "strained" | "critical";

export type JourneySegmentForecast = {
  conditionDeltas: Omit<JourneyCondition, "distance">;
  notes: string[];
  planLabel: string;
  pressureDelta: number;
  resultingCondition: JourneyCondition;
  resultingPressure: number;
  riskLevel: JourneySegmentForecastRisk;
  segment: number;
  supplyUse: string[];
  tacticLabel: string;
  threatLabel: string;
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
  attack: number;
  round: number;
  reward: ResourceBundle;
  traitPulse: JourneyEnemyPulse;
};

export type JourneyCombatLoot = {
  enemyName: string;
  trophy: string;
  trait: JourneyEnemy["trait"];
};

export type JourneyCondition = {
  distance: number;
  fatigue: number;
  hunger: number;
  thirst: number;
};

export type JourneyState = {
  battleScars: number;
  bonusReward: ResourceBundle;
  burden: JourneyCarryBurden;
  combat: JourneyCombat | null;
  currentNodeIndex: number;
  extractionStatus: JourneyExtractionStatus;
  fieldSupplies: ResourceBundle;
  id: string;
  loadout: ResourceBundle;
  locationFamily: LocationFamily;
  locationId: string;
  logs: string[];
  nodes: JourneyNode[];
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

export function routePaceFor(journey: JourneyState): JourneyRoutePace {
  const totalStops = journey.nodes.length;
  const safeIndex = Math.max(0, Math.min(journey.currentNodeIndex, Math.max(0, totalStops - 1)));
  const activeNode = journey.nodes[safeIndex];
  const nextNode = journey.nodes[safeIndex + 1] ?? null;
  const pendingRoad = journey.pendingRoadEvent;
  const currentLabel = pendingRoad ? roadEventLabel(pendingRoad.tone) : nodeTypeLabel(activeNode?.type);
  const currentTitle = pendingRoad?.title ?? activeNode?.title ?? "Unknown route";
  const nextLabel = nextNode ? nodeTypeLabel(nextNode.type) : "return";
  const nextTitle = nextNode?.title ?? "Back to base";
  const progressPercent = totalStops <= 1 ? 100 : Math.round((safeIndex / (totalStops - 1)) * 100);

  return {
    currentLabel,
    currentStop: safeIndex + 1,
    currentTitle,
    distanceSegments: journey.condition.distance,
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

function nodeTypeLabel(type?: JourneyNode["type"]): string {
  if (!type) {
    return "route";
  }

  return type;
}

function roadEventLabel(tone: JourneyRoadEventTone): string {
  if (tone === "road") {
    return "road fork";
  }

  return `road ${tone}`;
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
    {
      armor: 2,
      attackBonus: 0,
      hpBonus: 2,
      intro: "A maintenance thing drags a wrench behind it.",
      name: "Valve Ghoul",
      rewardKeys: ["materials"],
      trait: "armored",
      traitLabel: "Armored",
      traitText: "Reduces strike damage unless ammo or tactics expose it."
    },
    {
      armor: 1,
      attackBonus: 1,
      hpBonus: 5,
      intro: "A nest of wet cables snaps awake.",
      name: "Cable Nest",
      rewardKeys: ["water", "materials"],
      trait: "bleeder",
      traitLabel: "Serrated",
      traitText: "Hits leave a lingering bleed until patched."
    }
  ],
  urban: [
    {
      armor: 0,
      attackBonus: 2,
      hpBonus: 3,
      intro: "A hallway pack hears the squad before the squad sees it.",
      name: "Hallway Pack",
      rewardKeys: ["ammo"],
      trait: "swarm",
      traitLabel: "Swarm",
      traitText: "Pressure makes its counterattack sharper."
    },
    {
      armor: 1,
      attackBonus: 1,
      hpBonus: 7,
      intro: "The locked ward is not empty enough.",
      name: "Ward Keeper",
      rewardKeys: ["medicine"],
      trait: "armored",
      traitLabel: "Armored",
      traitText: "Reduces strike damage unless ammo or tactics expose it."
    }
  ],
  weird: [
    {
      armor: 0,
      attackBonus: 3,
      hpBonus: 4,
      intro: "The shadow arrives half a step before its owner.",
      name: "Borrowed Shadow",
      rewardKeys: ["medicine", "materials"],
      trait: "dread",
      traitLabel: "Dread",
      traitText: "Each hit adds pressure unless guarded."
    },
    {
      armor: 2,
      attackBonus: 2,
      hpBonus: 8,
      intro: "The room folds into a thing with too many corners.",
      name: "Glass Saint",
      rewardKeys: ["food", "medicine"],
      trait: "dread",
      traitLabel: "Dread",
      traitText: "Each hit adds pressure unless guarded."
    }
  ],
  wilds: [
    {
      armor: 0,
      attackBonus: 0,
      hpBonus: 4,
      intro: "A scarecrow drops from its pole and runs badly but fast.",
      name: "Running Scarecrow",
      rewardKeys: ["food"],
      trait: "swarm",
      traitLabel: "Swarm",
      traitText: "Pressure makes its counterattack sharper."
    },
    {
      armor: 2,
      attackBonus: 1,
      hpBonus: 6,
      intro: "Something under the field moves like a plow.",
      name: "Burrower",
      rewardKeys: ["food", "materials"],
      trait: "bleeder",
      traitLabel: "Serrated",
      traitText: "Hits leave a lingering bleed until patched."
    }
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

const familyCamps: Record<LocationFamily, { body: string; title: string }> = {
  resources: {
    body: "A dry maintenance alcove gives the squad ten quiet minutes before the pipes start knocking again.",
    title: "Pump Service Camp"
  },
  urban: {
    body: "A locked classroom still has desks, curtains, and one door that can be wedged shut.",
    title: "Classroom Camp"
  },
  weird: {
    body: "A circle of cold tile refuses to echo. It might be safe, or it might be listening politely.",
    title: "Quiet Tile Camp"
  },
  wilds: {
    body: "A windbreak of old tarps hides the squad from the road, but smoke would be easy to spot.",
    title: "Field Windbreak"
  }
};

const familyTravelMoods: Record<LocationFamily, Array<{ body: string; title: string }>> = {
  resources: [
    {
      body: "Water ticks behind the walls and every drip makes the squad count its bottles again.",
      title: "Concrete Drip"
    },
    {
      body: "A service map is still bolted to the wall, warped but useful enough for one careful turn.",
      title: "Service Map"
    },
    {
      body: "Old machinery breathes heat into the corridor and turns backpacks into anchors.",
      title: "Boiler Heat"
    }
  ],
  urban: [
    {
      body: "Window glass clicks in an empty office block, one pane at a time, like someone taking attendance.",
      title: "Window Static"
    },
    {
      body: "The squad cuts through an apartment landing where every closed door has a different smell.",
      title: "Tenant Row"
    },
    {
      body: "A stairwell sign points both up and down. The fastest path is still a guess.",
      title: "Wrong Floor"
    }
  ],
  weird: [
    {
      body: "The route echoes half a second late, forcing the squad to move by sight instead of sound.",
      title: "Wrong Echo"
    },
    {
      body: "A corridor repeats the same painted number until the map stops being funny.",
      title: "Loop Mark"
    },
    {
      body: "Something polite watches from the walls and never quite interrupts.",
      title: "Quiet Witness"
    }
  ],
  wilds: [
    {
      body: "The fields go quiet enough that boots in the grass sound like a bad decision.",
      title: "Field Hush"
    },
    {
      body: "Dust hangs low across the lane, hiding fences, ditches, and the first useful scrap.",
      title: "Dry Lane"
    },
    {
      body: "A line of old scare tape snaps in the wind and measures the squad's patience.",
      title: "Tape Wind"
    }
  ]
};

const familyRoadBeats: Record<LocationFamily, JourneyRoadBeatTemplate[]> = {
  resources: [
    {
      fatigue: 5,
      hazardLog: "A flooded service tunnel forces everyone to haul packs over shoulder height.",
      hunger: 2,
      mitigationLog: "A clean bypass keeps the squad out of the black water.",
      neutralLog: "The squad follows chalk marks through dripping concrete.",
      opportunityLog: "A pump cabinet still has a dry inner tray.",
      pressure: 10,
      rewardKeys: ["water", "materials"],
      rollShift: 0.08,
      supplyPriority: ["fuel", "materials", "water"],
      thirst: 9,
      title: "Flooded Underpass"
    },
    {
      fatigue: 4,
      hazardLog: "A pressure valve snaps and throws hot mist across the route.",
      hunger: 1,
      mitigationLog: "A quick brace turns the valve failure into a noisy inconvenience.",
      neutralLog: "The old valves tick like a clock as the squad passes.",
      opportunityLog: "The broken manifold coughs out usable fittings.",
      pressure: 8,
      rewardKeys: ["materials", "fuel"],
      rollShift: 0.06,
      supplyPriority: ["materials", "ammo"],
      thirst: 5,
      title: "Valve Burst"
    },
    {
      fatigue: 3,
      hazardLog: "A dry basin reflects too much sound and draws attention from the far catwalk.",
      hunger: 3,
      mitigationLog: "The squad cuts across with muffled steps and leaves no echo trail.",
      neutralLog: "The basin is empty, but every boot scrape feels borrowed.",
      opportunityLog: "A maintenance basket hangs under the basin ladder.",
      pressure: 9,
      rewardKeys: ["ammo", "medicine"],
      rollShift: 0.07,
      supplyPriority: ["ammo", "fuel"],
      thirst: 4,
      title: "Echo Basin"
    }
  ],
  urban: [
    {
      fatigue: 6,
      hazardLog: "A stairwell has collapsed into rebar teeth, turning one block into three.",
      hunger: 4,
      mitigationLog: "A marked side door cuts around the wreckage before anything hears them.",
      neutralLog: "The route bends through dead offices and broken stair signs.",
      opportunityLog: "A janitor closet still has sealed utility bins.",
      pressure: 11,
      rewardKeys: ["materials", "medicine"],
      rollShift: 0.08,
      supplyPriority: ["materials", "fuel"],
      thirst: 4,
      title: "Collapsed Stairwell"
    },
    {
      fatigue: 4,
      hazardLog: "A vending bank topples in the corridor and turns the hall into a dinner bell.",
      hunger: 7,
      mitigationLog: "The squad wedges the machines down slowly and keeps the noise contained.",
      neutralLog: "Old snack wrappers scrape underfoot in the dark hall.",
      opportunityLog: "One vending column still has a few useful packets inside.",
      pressure: 9,
      rewardKeys: ["food", "water"],
      rollShift: 0.06,
      supplyPriority: ["materials", "ammo"],
      thirst: 3,
      title: "Vending Bank"
    },
    {
      fatigue: 5,
      hazardLog: "A sealed apartment breathes mold and panic when the door opens.",
      hunger: 2,
      mitigationLog: "A mask filter and a slow sweep keep the room from turning ugly.",
      neutralLog: "The squad passes door after door with names scratched off.",
      opportunityLog: "Someone hid a compact first-aid roll behind a family photo.",
      pressure: 10,
      rewardKeys: ["medicine", "ammo"],
      rollShift: 0.08,
      supplyPriority: ["medicine", "fuel"],
      thirst: 5,
      title: "Sealed Apartment"
    }
  ],
  weird: [
    {
      fatigue: 5,
      hazardLog: "A corridor repeats itself until the squad starts losing count of their own footsteps.",
      hunger: 3,
      mitigationLog: "A burned marker breaks the loop before it becomes a second memory.",
      neutralLog: "The walls lean in, then pretend they did not.",
      opportunityLog: "The wrong turn reveals a cache wrapped in clean plastic.",
      pressure: 12,
      rewardKeys: ["medicine", "materials"],
      rollShift: 0.1,
      supplyPriority: ["fuel", "materials"],
      thirst: 5,
      title: "Repeating Hall"
    },
    {
      fatigue: 4,
      hazardLog: "A chorus under the floor learns the squad's names a little too quickly.",
      hunger: 2,
      mitigationLog: "A burst of noise scrambles the chorus long enough to move.",
      neutralLog: "The floor hums under each step, almost in time with breathing.",
      opportunityLog: "The humming floor hides a hatch with untouched tools.",
      pressure: 13,
      rewardKeys: ["ammo", "fuel"],
      rollShift: 0.11,
      supplyPriority: ["ammo", "fuel"],
      thirst: 4,
      title: "Name Chorus"
    },
    {
      fatigue: 3,
      hazardLog: "A patch of glassy spores bursts and sticks silver dust to exposed skin.",
      hunger: 4,
      mitigationLog: "A quick wash and sealed sleeves keep the spores from spreading.",
      neutralLog: "Silver dust drifts where sunlight should have been.",
      opportunityLog: "The spore bed has grown around a sealed medical pouch.",
      pressure: 10,
      rewardKeys: ["medicine", "water"],
      rollShift: 0.09,
      supplyPriority: ["water", "medicine"],
      thirst: 8,
      title: "Glassy Spores"
    }
  ],
  wilds: [
    {
      fatigue: 6,
      hazardLog: "A ditch full of thorn wire snags packs and makes every crossing loud.",
      hunger: 3,
      mitigationLog: "A cut path through the wire saves time and skin.",
      neutralLog: "The road fades into weeds and half-buried road reflectors.",
      opportunityLog: "A weather box under the brush still has dry stores.",
      pressure: 10,
      rewardKeys: ["food", "materials"],
      rollShift: 0.07,
      supplyPriority: ["materials", "fuel"],
      thirst: 5,
      title: "Thorn Wire Ditch"
    },
    {
      fatigue: 4,
      hazardLog: "A flock erupts from the field and points every distant head toward the squad.",
      hunger: 2,
      mitigationLog: "The squad waits under cover until the field settles again.",
      neutralLog: "Grass hides the old lane better than the map does.",
      opportunityLog: "A forgotten hunting blind still holds useful supplies.",
      pressure: 11,
      rewardKeys: ["ammo", "food"],
      rollShift: 0.08,
      supplyPriority: ["fuel", "ammo"],
      thirst: 4,
      title: "Bird Rise"
    },
    {
      fatigue: 5,
      hazardLog: "A creek crossing breaks under the lead foot and soaks the drinking kit.",
      hunger: 3,
      mitigationLog: "A rope line keeps the crossing clean and fast.",
      neutralLog: "The creek is shallow, cold, and too clear.",
      opportunityLog: "A bank cache has been washed open by the current.",
      pressure: 9,
      rewardKeys: ["water", "medicine"],
      rollShift: 0.06,
      supplyPriority: ["materials", "water"],
      thirst: 9,
      title: "Cold Creek"
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
      body: camp.body,
      camp: createCampOptions(family),
      id: "route-camp",
      title: camp.title,
      type: "camp"
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

  const support = draft.support ?? emptySupport();
  const fieldSupplies = { ...draft.loadout };
  addPartialResources(fieldSupplies, support.startingSupplies);
  const squad = session.account.survivors.filter((survivor) => draft.squadIds.includes(survivor.id));
  const burden = calculateCarryBurden(squad, fieldSupplies, support);
  const startingPressure = clampPercent((draft.risk === "cautious" ? 10 : draft.risk === "greedy" ? 28 : 18) + burden.pressurePenalty);

  return {
    battleScars: 0,
    burden,
    bonusReward: createEmptyResourceBundle(),
    combat: null,
    currentNodeIndex: 0,
    extractionStatus: "in-progress",
    fieldSupplies,
    id: `journey-${Date.now()}`,
    loadout: { ...draft.loadout },
    locationFamily: family,
    locationId,
    logs: [
      `Route opened for ${location?.name ?? "unknown site"} with ${draft.squadIds.length} survivor(s).`,
      `Packed supplies are now field supplies. Spend them to lower pressure or save them for settlement.`,
      `Pack burden: ${burden.load}/${burden.capacity}, ${carryBurdenLabel(burden.tier)}${
        burden.fatiguePenalty > 0 ? `, travel fatigue +${burden.fatiguePenalty}` : ""
      }${burden.pressurePenalty !== 0 ? `, starting pressure ${formatSignedPercent(burden.pressurePenalty)}` : ""}.`
    ],
    nodes,
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
    exposed: 0,
    intent: intent.id,
    intentLabel: intent.label,
    intentText: intent.text,
    frontline,
    reward: { ...enemy.reward },
    round: 1,
    squadHp: squadMaxHp,
    squadMaxHp,
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
        (hasAmmo ? 5 + journey.support.ammoDamage : 0) -
        armorPenalty
    );
    const pulsePreview = previewWithEnemyPulse(
      combat,
      action,
      journey.pressure,
      combat.intent === "prowl" ? "Counter" : "Standard",
      combat.intent === "prowl" ? "Can interrupt Prowl and reduce the hit back." : `Expected hit back ${incoming}.`
    );
    return {
      action,
      actorName: striker.name,
      cost: hasAmmo ? "Ammo -1" : "No ammo",
      counterTag: pulsePreview.counterTag,
      effect: withActionStrain(`${damage} damage${armorPenalty > 0 ? `, armor absorbs ${armorPenalty}` : ""}`, strain),
      label: "Strike",
      risk: pulsePreview.risk,
      strain
    };
  }

  if (action === "guard") {
    const guardValue = Math.floor((lead.attributes.willpower + lead.attributes.stamina) / 30) + journey.support.guardBlock;
    const windupBlock = combat.intent === "windup" ? 6 : 0;
    const blocked = Math.max(0, incoming - Math.max(1, Math.floor(incoming / 2) - guardValue - windupBlock));
    const pulsePreview = previewWithEnemyPulse(
      combat,
      action,
      journey.pressure,
      combat.intent === "windup" ? "Counter" : "Standard",
      combat.intent === "windup" ? "Wind-up punish window. Strongest defensive answer." : `Expected hit back ${Math.max(1, incoming - blocked)}.`
    );
    return {
      action,
      actorName: lead.name,
      cost: "No supply",
      counterTag: pulsePreview.counterTag,
      effect: withActionStrain(`block ${blocked}, expose +${combat.intent === "windup" ? 2 : 1}`, strain),
      label: "Guard",
      risk: pulsePreview.risk,
      strain
    };
  }

  if (action === "patch") {
    const hasMedicine = journey.fieldSupplies.medicine > 0;
    const steadyHandsBonus = hasPerk(medic, "steady_hands") ? 3 : 0;
    const heal = Math.floor(medic.attributes.medical / 9) + steadyHandsBonus + journey.support.patchHeal + (hasMedicine ? 12 : 4);
    const bleedRelief = combat.bleed > 0 ? (hasMedicine ? 2 : 1) : 0;
    const pulsePreview = previewWithEnemyPulse(
      combat,
      action,
      journey.pressure,
      combat.intent === "prowl" ? "Risk" : "Standard",
      combat.intent === "prowl" ? "Prowl leaves the line open while patching." : `Expected hit back ${incoming}.`
    );
    return {
      action,
      actorName: medic.name,
      cost: hasMedicine ? "Medicine -1" : "No medicine",
      counterTag: pulsePreview.counterTag,
      effect: withActionStrain(`Heal ${heal}${bleedRelief > 0 ? `, bleed -${bleedRelief}` : ""}`, strain),
      label: "Patch",
      risk: pulsePreview.risk,
      strain
    };
  }

  if (action === "tactic") {
    const braceBreak = combat.intent === "brace" ? 2 : 0;
    const prowlRead = combat.intent === "prowl" ? 1 : 0;
    const expose = 1 + braceBreak + prowlRead + Math.floor(tactician.attributes.technical / 35) + (hasPerk(tactician, "steady_hands") ? 1 : 0);
    const pressureDrop = Math.floor(tactician.attributes.luck / 25) + journey.support.pressureRelief;
    const tacticRisk =
      combat.intent === "brace"
        ? "Breaks Brace before armor rises."
        : combat.intent === "prowl"
          ? "Reads Prowl and softens the hit."
          : `Expected hit back ${incoming}.`;
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
      cost: "No supply",
      counterTag: pulsePreview.counterTag,
      effect: withActionStrain(`Expose +${expose}, pressure -${pressureDrop}%`, strain),
      label: "Tactic",
      risk: pulsePreview.risk,
      strain
    };
  }

  const retreatPreview = previewWithEnemyPulse(
    combat,
    action,
    journey.pressure,
    "Risk",
    `Pressure +${Math.max(8, 18 - journey.support.pressureRelief)}%, route continues.`
  );

  return {
    action,
    actorName: lead.name,
    cost: "No supply",
    counterTag: retreatPreview.counterTag,
    effect: `Exit combat, take ${Math.max(3, Math.ceil(combat.attack / 2))} damage`,
    label: "Retreat",
    risk: retreatPreview.risk,
    strain
  };
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
  let actionActorId: string | null = null;

  if (action === "retreat") {
    applyCombatDamage(next, combat, Math.max(3, Math.ceil(combat.attack / 2)), lead.id);
    const retreatPressure = Math.max(8, 18 - next.support.pressureRelief);
    next.pressure = clampPercent(next.pressure + retreatPressure);
    next.rollShift += retreatPressure / 100;
    next.logs.push(`${node.title}: the squad retreats under pressure. Squad stamina takes a hit, pressure +${retreatPressure}%.`);
    next.currentNodeIndex += 1;
    next.combat = createCombatForNode(next.nodes[next.currentNodeIndex], squad, readiness, next.support);
    return next;
  }

  const intent = combatIntentDetails[combat.intent] ?? combatIntentDetails.maul;
  let incoming = combat.attack + (combat.enemyTrait === "swarm" ? Math.floor(next.pressure / 20) : 0) + intent.incoming;
  const pressureLog: string[] = [];
  const counterLog: string[] = [];
  let patchedThisRound = false;
  let incomingFocusId: string | null = striker.id;

  if (action === "strike") {
    actionActorId = striker.id;
    markCombatantAction(combat, striker.id, "Strike");
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
        (ammoSpent ? 5 + next.support.ammoDamage : 0) -
        armorPenalty
    );
    if (combat.intent === "prowl") {
      incoming = Math.max(1, incoming - 3);
      counterLog.push("strike interrupts the prowl");
    }
    combat.enemyHp = Math.max(0, combat.enemyHp - damage);
    next.logs.push(
      `${node.title}: round ${combat.round}, ${striker.name} leads a strike for ${damage} damage${ammoSpent ? " and spends 1 ammo" : ""}${
        armorPenalty > 0 ? ` (${combat.enemyTraitLabel} absorbs ${armorPenalty})` : ""
      }${counterLog.length ? `, ${counterLog.join(", ")}` : ""}.`
    );
  } else if (action === "guard") {
    actionActorId = lead.id;
    markCombatantAction(combat, lead.id, "Guard");
    const guardValue = Math.floor((lead.attributes.willpower + lead.attributes.stamina) / 30) + next.support.guardBlock;
    const windupBlock = combat.intent === "windup" ? 6 : 0;
    incoming = Math.max(1, Math.floor(incoming / 2) - guardValue - windupBlock);
    braceCombatant(combat, lead.id, guardValue + windupBlock + 2);
    incomingFocusId = lead.id;
    combat.exposed = Math.min(3, combat.exposed + 1);
    if (combat.intent === "windup") {
      combat.exposed = Math.min(4, combat.exposed + 1);
      counterLog.push("guard catches the wind-up");
    }
    next.pressure = clampPercent(next.pressure - 3);
    next.rollShift -= 0.02;
    next.logs.push(
      `${node.title}: round ${combat.round}, ${lead.name} holds guard. Incoming damage drops, enemy exposed +${combat.intent === "windup" ? 2 : 1}, pressure -3%${
        counterLog.length ? `, ${counterLog.join(", ")}` : ""
      }.`
    );
  } else if (action === "patch") {
    actionActorId = medic.id;
    markCombatantAction(combat, medic.id, "Patch");
    patchedThisRound = true;
    const medicineSpent = spendFieldSupply(next, "medicine", 1);
    const steadyHandsBonus = hasPerk(medic, "steady_hands") ? 3 : 0;
    const heal = Math.floor(medic.attributes.medical / 9) + steadyHandsBonus + next.support.patchHeal + (medicineSpent ? 12 : 4);
    const patient = healWeakestCombatant(combat, heal, medic.id);
    if (combat.bleed > 0) {
      combat.bleed = Math.max(0, combat.bleed - (medicineSpent ? 2 : 1));
    }
    if (combat.intent === "prowl") {
      incoming += 4;
      next.pressure = clampPercent(next.pressure + 3);
      counterLog.push("patching under a prowl leaves the line open");
    }
    next.rollShift -= medicineSpent ? 0.02 : 0.01;
    next.logs.push(
      `${node.title}: round ${combat.round}, ${medic.name} patches ${patient?.name ?? "the line"} for ${heal} stamina${
        medicineSpent ? " and spends 1 medicine" : ""
      }${
        counterLog.length ? `, ${counterLog.join(", ")}` : ""
      }.`
    );
  } else if (action === "tactic") {
    actionActorId = tactician.id;
    markCombatantAction(combat, tactician.id, "Tactic");
    const braceBreak = combat.intent === "brace" ? 2 : 0;
    const prowlRead = combat.intent === "prowl" ? 1 : 0;
    const expose = 1 + braceBreak + prowlRead + Math.floor(tactician.attributes.technical / 35) + (hasPerk(tactician, "steady_hands") ? 1 : 0);
    combat.exposed = Math.min(4, combat.exposed + expose);
    if (combat.intent === "brace") {
      incoming = Math.max(1, incoming - 2);
      counterLog.push("tactic breaks the brace");
    }
    if (combat.intent === "prowl") {
      incoming = Math.max(1, incoming - 4);
      counterLog.push("tactic reads the prowl");
    }
    next.pressure = clampPercent(next.pressure - Math.floor(tactician.attributes.luck / 25) - next.support.pressureRelief);
    next.rollShift -= 0.04;
    next.logs.push(
      `${node.title}: round ${combat.round}, ${tactician.name} calls the pattern. Enemy exposed +${expose}, pressure softens${
        counterLog.length ? `, ${counterLog.join(", ")}` : ""
      }.`
    );
  }

  if (actionActorId) {
    applyCombatActionStrain(next, combat, actionActorId, combatActionStrain[action] ?? 0, action);
  }

  if (combat.enemyHp > 0) {
    const traitPulseLog: string[] = [];
    const traitPulseCountered = enemyPulseCountersAction(combat, action);

    if (combat.enemyTrait === "armored") {
      if (traitPulseCountered) {
        traitPulseLog.push("Trait counter: Plating lock stays open.");
      } else if (combat.exposed <= 0) {
        combat.armor = Math.min(6, combat.armor + 1);
        traitPulseLog.push("Trait pulse: Plating lock hardens armor +1.");
      }
    }

    if (combat.enemyTrait === "swarm") {
      const pressureDamage = Math.floor(next.pressure / 20);
      if (traitPulseCountered && pressureDamage > 0) {
        incoming = Math.max(1, incoming - Math.min(4, pressureDamage));
        next.pressure = clampPercent(next.pressure - 2);
        next.rollShift -= 0.02;
        traitPulseLog.push("Trait counter: Pack pressure is split before it lands.");
      } else if (pressureDamage > 0) {
        next.pressure = clampPercent(next.pressure + 3);
        next.rollShift += 0.02;
        traitPulseLog.push(`Trait pulse: Pack pressure converts route heat into +${pressureDamage} hit back and pressure +3%.`);
      }
    }

    if (combat.enemyTrait === "dread") {
      if (traitPulseCountered) {
        next.pressure = clampPercent(next.pressure - 2);
        next.rollShift -= 0.02;
        traitPulseLog.push("Trait counter: Black signal is grounded.");
      } else {
        next.pressure = clampPercent(next.pressure + 5);
        next.rollShift += 0.04;
        pressureLog.push("pressure +5%");
        traitPulseLog.push("Trait pulse: Black signal drives pressure +5%.");
      }
    }

    if (combat.bleed > 0) {
      applyCombatDamage(next, combat, combat.bleed, incomingFocusId);
      pressureLog.push(`bleed deals ${combat.bleed}`);
    }

    applyCombatDamage(next, combat, incoming, incomingFocusId);
    if (combat.enemyTrait === "bleeder") {
      if (traitPulseCountered || patchedThisRound) {
        traitPulseLog.push("Trait counter: Open wounds are contained.");
      } else {
        combat.bleed = Math.min(6, combat.bleed + 2);
        pressureLog.push("bleed +2");
        traitPulseLog.push("Trait pulse: Open wounds add bleed +2 until patched.");
      }
    }
    if (combat.intent === "windup" && action !== "guard") {
      next.pressure = clampPercent(next.pressure + 4);
      next.rollShift += 0.03;
      pressureLog.push("wind-up pressure +4%");
    }

    if (traitPulseLog.length > 0) {
      next.logs.push(`${node.title}: ${traitPulseLog.join(" ")}`);
    }
    next.logs.push(`${combat.enemyName} hits back for ${incoming}${pressureLog.length ? ` (${pressureLog.join(", ")})` : ""}.`);
    if (combat.squadHp <= 0) {
      next.pressure = clampPercent(next.pressure + 24);
      next.rollShift += 0.24;
      next.logs.push(`${node.title}: the squad breaks contact in bad shape. Outcome pressure +24%.`);
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
      next.logs.push(`${node.title}: the victory is ugly. Battle scars +2, fatigue +14, pressure +8%.`);
    } else if (hpRatio < 0.65) {
      next.battleScars += 1;
      markCombatScarTargetsFromFrontline(next, combat, 1);
      next.condition.fatigue = clampPercent(next.condition.fatigue + 7);
      next.logs.push(`${node.title}: the squad wins but has to drag each other clear. Battle scars +1, fatigue +7.`);
    } else {
      next.bonusReward.materials += 1;
      next.logs.push(`${node.title}: clean control of the fight leaves time to strip extra salvage. Materials +1.`);
    }
    next.pressure = clampPercent(next.pressure - 12);
    next.rollShift -= 0.12;
    next.logs.push(`${node.title}: ${combat.enemyName} is driven off. ${formatBundle(combat.reward)}, trophy: ${trophy}, pressure -12%.`);
    next.pendingCombatLoot = {
      enemyName: combat.enemyName,
      trait: combat.enemyTrait,
      trophy
    };
    next.combat = null;
  }

  return next;
}

export function advanceJourneyTravel(journey: JourneyState, squad: Survivor[], readiness: number, nextNodeIndex = journey.currentNodeIndex + 1): JourneyState {
  const next = structuredClone(journey) as JourneyState;
  const plan = travelPlanOptions[next.travelPlan] ?? travelPlanOptions.steady;
  const tactic = segmentTacticOptions[next.segmentTactic] ?? segmentTacticOptions.observe;
  const tacticOutcome = applySegmentTactic(next, tactic);
  const threat = segmentThreatFor(next);
  const threatOutcome = applySegmentThreat(next, threat, tactic.id);
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
  next.condition.fatigue = clampPercent(next.condition.fatigue + fatigueGain);
  next.condition.hunger = clampPercent(next.condition.hunger + (foodSpent ? -12 : 18) + plan.hunger + tacticOutcome.hunger + threatOutcome.hunger);
  next.condition.thirst = clampPercent(next.condition.thirst + (waterSpent ? -15 : 22) + plan.thirst + tacticOutcome.thirst + threatOutcome.thirst);
  next.pressure = clampPercent(next.pressure + rationPressure + planPressure + Math.floor(next.condition.fatigue / 35) - next.support.pressureRelief);
  next.rollShift += (rationPressure + planPressure) / 100 + next.condition.fatigue / 350;

  const pressureDelta = next.pressure - beforePressure;
  const rationLog = [
    foodSpent ? "food -1" : "no food: hunger rises",
    waterSpent ? "water -1" : "no water: thirst rises"
  ].join(", ");
  next.logs.push(
    `Road: segment ${next.condition.distance}, ${plan.label}. ${rationLog}${planSupplyResult.log ? `, ${planSupplyResult.log}` : ""}. Fatigue +${fatigueGain}, pressure ${formatSignedPercent(
      rationPressure + planPressure + Math.floor(next.condition.fatigue / 35) - next.support.pressureRelief
      )}.`
  );
  next.travelHistory.push(
    createTravelRecord(next, plan, {
      effects: [
        foodSpent ? "Food -1" : "No food",
        waterSpent ? "Water -1" : "No water",
        ...(planSupplyResult.log ? [sentenceCase(planSupplyResult.log)] : []),
        ...tacticOutcome.effects,
        ...threatOutcome.effects,
        ...(burdenFatigue > 0 ? [`Burden +${burdenFatigue}`] : []),
        `Fatigue +${fatigueGain}`,
        `Pressure ${formatSignedPercent(pressureDelta)}`
      ],
      pressureDelta
    })
  );

  queueRoadEncounter(next, squad, plan.id, routeSkill, nextNodeIndex);

  const scavengeRoll =
    Math.random() + routeSkill * 0.04 + planScavengeBonus(plan.id) + tacticOutcome.scavengeBonus - threatOutcome.scavengePenalty - next.pressure / 250;
  if (scavengeRoll > 0.72) {
    const key = travelScavengeKeys[next.condition.distance % travelScavengeKeys.length];
    next.bonusReward[key] += 1;
    next.logs.push(`Road find: the squad spots a usable cache between stops. ${resourceLabels[key]} +1.`);
  } else if (scavengeRoll < 0.12) {
    next.pressure = clampPercent(next.pressure + 6);
    next.rollShift += 0.04;
    next.logs.push("Road snag: a bad detour costs time and makes the next contact feel closer. Pressure +6%.");
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
  next.condition.fatigue = clampPercent(next.condition.fatigue + fatigueGain);
  next.condition.hunger = clampPercent(next.condition.hunger + (foodSpent ? -12 : 18) + plan.hunger + tacticOutcome.hunger + threatOutcome.hunger);
  next.condition.thirst = clampPercent(next.condition.thirst + (waterSpent ? -15 : 22) + plan.thirst + tacticOutcome.thirst + threatOutcome.thirst);
  next.pressure = clampPercent(next.pressure + rationPressure + planPressure + Math.floor(next.condition.fatigue / 35) - next.support.pressureRelief);

  const pressureDelta = next.pressure - beforePressure;
  const notes = [
    ...tacticOutcome.effects,
    ...threatOutcome.effects,
    ...(burdenFatigue > 0 ? [`Burden +${burdenFatigue}`] : []),
    ...(planSupplyResult.log ? [sentenceCase(planSupplyResult.log)] : [])
  ];

  return {
    conditionDeltas: {
      fatigue: next.condition.fatigue - beforeCondition.fatigue,
      hunger: next.condition.hunger - beforeCondition.hunger,
      thirst: next.condition.thirst - beforeCondition.thirst
    },
    notes,
    planLabel: plan.label,
    pressureDelta,
    resultingCondition: { ...next.condition },
    resultingPressure: next.pressure,
    riskLevel: segmentForecastRisk(next),
    segment: next.condition.distance,
    supplyUse: [foodSpent ? "Food -1" : "No food", waterSpent ? "Water -1" : "No water"],
    tacticLabel: tactic.label,
    threatLabel: threat.label
  };
}

export function setJourneySegmentTactic(journey: JourneyState, tactic: JourneySegmentTactic): JourneyState {
  const option = segmentTacticOptions[tactic];
  if (!option || journey.segmentTactic === tactic) {
    return journey;
  }

  return {
    ...journey,
    logs: [...journey.logs, `Segment tactic: ${option.label}. ${option.text}`],
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
    logs: [...journey.logs, `Road plan: ${option.label}. ${option.text}`],
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
      `${node.title}: ${option.successLog} ${resourceLabels[spentKey]} -1, fatigue ${formatSignedNumber(option.fatigue)}, hunger ${formatSignedNumber(
        option.hunger
      )}, thirst ${formatSignedNumber(option.thirst)}, pressure ${formatSignedPercent(option.pressure)}${
        option.objectiveBonus > 0 ? `, objective +${option.objectiveBonus}` : ""
      }${option.supportText ? `. ${option.supportText}` : ""}.`
    );
    return next;
  }

  const fallbackPressure = Math.max(3, option.pressure + 10);
  next.condition.fatigue = clampPercent(next.condition.fatigue + (option.fatigue < 0 ? Math.ceil(option.fatigue / 2) : option.fatigue + 4));
  next.condition.hunger = clampPercent(next.condition.hunger + Math.max(5, option.hunger + 16));
  next.condition.thirst = clampPercent(next.condition.thirst + Math.max(5, option.thirst + 16));
  next.pressure = clampPercent(next.pressure + fallbackPressure);
  next.rollShift += Math.max(0.03, option.rollShift / 2);
  next.logs.push(`${node.title}: ${option.fallbackLog} Pressure ${formatSignedPercent(fallbackPressure)}${option.supportText ? `. ${option.supportText}` : ""}.`);
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
    next.logs.push(`${node.title}: ${offer.failLog} Pressure ${formatSignedPercent(offer.pressureFail)}${offer.supportText ? `. ${offer.supportText}` : ""}.`);
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
    `${node.title}: ${offer.successLog} ${resourceLabels[spentKey]} -1, field ${formatBundle(offer.fieldSupplyReward)}, stash ${formatBundle(
      offer.reward
    )}, fatigue ${formatSignedNumber(offer.fatigue)}, hunger ${formatSignedNumber(offer.hunger)}, thirst ${formatSignedNumber(
      offer.thirst
    )}, pressure ${formatSignedPercent(offer.pressure)}${offer.objectiveBonus > 0 ? `, objective +${offer.objectiveBonus}` : ""}${
      offer.supportText ? `. ${offer.supportText}` : ""
    }.`
  );
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
    `${pending.enemyName}: ${option.label}. ${option.text} ${formatBundle(option.reward)}, fatigue ${formatSignedNumber(
      option.fatigue
    )}, pressure ${formatSignedPercent(option.pressure)}${option.objectiveBonus > 0 ? `, objective +${option.objectiveBonus}` : ""}${
      scarsDelta > 0 ? `, battle scars -${scarsDelta}` : ""
    }${option.supportText ? `, ${option.supportText}` : ""}. Trophy secured: ${pending.trophy}.`
  );
  next.pendingCombatLoot = null;
  return next;
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
      ? "Buy wrapped food, clean water, and field directions from the cart."
      : family === "urban"
        ? "Trade for sealed snack packs and a clean bottle before the last blocks."
        : family === "weird"
          ? "Pay for sealed water and things that still remember being food."
          : "Buy dry rations and drinkable water from the road mechanic.";
  const intelText =
    family === "weird"
      ? "Pay for a route omen and a mark that makes the exit less wrong."
      : "Buy the kind of route note that saves one bad turn near extraction.";

  return {
    label: template.label,
    offers: {
      intel: {
        costPriority: [...template.costPriority],
        failLog: "No one sells directions for promises. The delay makes the route feel watched.",
        fatigue: 1,
        fieldSupplyReward: createEmptyResourceBundle(),
        hunger: 0,
        id: "intel",
        label: "Buy route intel",
        objectiveBonus: 1,
        pressure: Math.min(-4, template.pressureSuccess - 2),
        pressureFail: template.pressureFail + 3,
        reward: createEmptyResourceBundle(),
        rollShift: Math.min(-0.06, template.rollShiftSuccess - 0.03),
        rollShiftFail: template.rollShiftFail + 0.02,
        successLog: "The trader marks a cleaner extraction lane and a useful tower clue.",
        text: intelText,
        thirst: 0
      },
      resupply: {
        costPriority: uniqueResourceKeys(["materials", "fuel", "ammo", ...template.costPriority]),
        failLog: "The squad tries to barter for food, but the exchange has already packed the good crates.",
        fatigue: -2,
        fieldSupplyReward: lootReward({ food: 1, water: 1 }),
        hunger: -8,
        id: "resupply",
        label: "Buy road rations",
        objectiveBonus: 0,
        pressure: -4,
        pressureFail: template.pressureFail + 2,
        reward: createEmptyResourceBundle(),
        rollShift: -0.03,
        rollShiftFail: template.rollShiftFail + 0.02,
        successLog: "The squad trades for sealed rations and refills the field kit.",
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
        text: "Buy a field service package: parts for the base, plus a small immediate kit if the vendor has it.",
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
      fallbackLog: "They try to make a meal out of scraps, but the pause only makes empty stomachs louder.",
      fatigue: -6,
      hunger: -28,
      label: "Cook rations",
      objectiveBonus: 0,
      pressure: cookPressure,
      rollShift: -0.06,
      successLog: "A hot ration reset steadies the squad before the next leg.",
      supplyPriority: ["food", "water"],
      thirst: -20
    },
    rest: {
      fallbackLog: "The squad rests without enough supplies. It helps, but everyone wakes up sharper and hungrier.",
      fatigue: -24,
      hunger: 6,
      label: "Rest wounds",
      objectiveBonus: 0,
      pressure: -8,
      rollShift: -0.08,
      successLog: "A guarded rest gets breathing room back into the team.",
      supplyPriority: ["medicine", "food", "water"],
      thirst: 6
    },
    scout: {
      fallbackLog: "They scout by instinct and lose time arguing over the route.",
      fatigue: 5,
      hunger: 4,
      label: "Scout ahead",
      objectiveBonus: 1,
      pressure: scoutPressure,
      rollShift: -0.12,
      successLog: "The squad spends gear to mark a safer lane and useful tower notes.",
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
  ammo: "Ammo",
  food: "Food",
  fuel: "Fuel",
  materials: "Materials",
  medicine: "Medicine",
  water: "Water"
};

export const travelPlanList: JourneyTravelPlanOption[] = [
  {
    fatigue: 0,
    hunger: 0,
    id: "steady",
    label: "Steady march",
    pressure: -1,
    text: "Balanced travel with a small pressure drop.",
    thirst: 0
  },
  {
    fatigue: 3,
    hunger: 3,
    id: "scavenge",
    label: "Strip the road",
    pressure: 5,
    text: "More finds, more time exposed.",
    thirst: 3
  },
  {
    fatigue: 6,
    hunger: 5,
    id: "rush",
    label: "Forced march",
    pressure: -6,
    text: "Lower contact pressure at a heavy stamina cost.",
    thirst: 6
  },
  {
    fatigue: 2,
    hunger: 1,
    id: "sneak",
    label: "Go quiet",
    pressure: -5,
    text: "Spend cover gear to mute the route.",
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
    fallbackLog: "The squad keeps eyes open and does not spend extra supplies.",
    fatigue: 0,
    hunger: 0,
    id: "observe",
    label: "Watch the road",
    pressure: 0,
    routeSkill: 0,
    scavengeBonus: 0,
    successLog: "The squad keeps the next stretch ordinary on purpose.",
    supplyPriority: [],
    text: "Default movement with no extra cost or modifier.",
    thirst: 0
  },
  {
    failFatigue: 2,
    failHunger: 0,
    failPressure: -6,
    failThirst: 0,
    fallbackLog: "The squad tightens formation and trades speed for control.",
    fatigue: 2,
    hunger: 0,
    id: "brace",
    label: "Tight formation",
    pressure: -6,
    routeSkill: 1,
    scavengeBonus: 0,
    successLog: "A tight formation keeps bad angles covered before the next stop.",
    supplyPriority: [],
    text: "Lower pressure and improve route control, but add a little fatigue.",
    thirst: 0
  },
  {
    failFatigue: 1,
    failHunger: 6,
    failPressure: 4,
    failThirst: 6,
    fallbackLog: "They call a ration break, but there is not enough to share cleanly.",
    fatigue: -2,
    hunger: -10,
    id: "ration",
    label: "Share rations",
    pressure: -4,
    routeSkill: 0,
    scavengeBonus: 0,
    successLog: "A controlled ration break steadies hands before the next stretch.",
    supplyPriority: ["food", "water"],
    text: "Spend one food or water to soften hunger, thirst, fatigue, and pressure.",
    thirst: -10
  },
  {
    failFatigue: 5,
    failHunger: 3,
    failPressure: 8,
    failThirst: 3,
    fallbackLog: "They search loose ruins without the right gear and lose time.",
    fatigue: 3,
    hunger: 2,
    id: "prospect",
    label: "Comb ruins",
    pressure: 5,
    routeSkill: 0,
    scavengeBonus: 0.32,
    successLog: "The squad burns a little gear to pry open better roadside finds.",
    supplyPriority: ["materials", "fuel"],
    text: "Spend materials or fuel to greatly improve find odds, at higher pressure.",
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
    sourceScores.push({ label: "route cover", value: support.roadSecure + support.guardBlock });
  }
  if (threat.counterTactics.includes("prospect")) {
    sourceScores.push({ label: "salvage tools", value: support.roadSearch + support.lootSalvage + support.shopService });
  }
  if (threat.counterTactics.includes("ration")) {
    sourceScores.push({ label: "road stores", value: support.shopRations + support.campCook });
  }
  if (threat.counterTactics.includes("observe")) {
    sourceScores.push({ label: "route intel", value: support.pressureRelief + support.lootIntel + support.campScout });
  }

  const activeSources = sourceScores.filter((source) => source.value > 0);
  const value = activeSources.reduce((total, source) => total + source.value, 0);

  return {
    fatigue: Math.min(threat.fatigue, Math.floor(value / 3)),
    pressure: Math.min(threat.pressure, value * 2),
    scavengePenalty: Math.min(threat.scavengePenalty, value * 0.02),
    source: activeSources.map((source) => source.label).join(" + ") || "none",
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
      label: "Chlorine fog",
      pressure: 6,
      scavengePenalty: 0.06,
      text: "Chemical fog turns every breath into a small negotiation.",
      thirst: 5
    },
    {
      counterTactics: ["brace"],
      fatigue: 4,
      hunger: 0,
      id: "service-ladder",
      label: "Service ladder",
      pressure: 7,
      scavengePenalty: 0.04,
      text: "A vertical maintenance climb splits the squad's pace.",
      thirst: 1
    },
    {
      counterTactics: ["prospect"],
      fatigue: 1,
      hunger: 0,
      id: "locked-meter",
      label: "Locked meter",
      pressure: 5,
      scavengePenalty: 0.12,
      text: "Useful parts sit behind old utility locks.",
      thirst: 0
    }
  ],
  urban: [
    {
      counterTactics: ["prospect"],
      fatigue: 3,
      hunger: 0,
      id: "glass-choke",
      label: "Glass choke",
      pressure: 8,
      scavengePenalty: 0.08,
      text: "Broken storefronts make every shortcut loud unless someone works the debris.",
      thirst: 1
    },
    {
      counterTactics: ["brace"],
      fatigue: 4,
      hunger: 0,
      id: "blind-corner",
      label: "Blind corner",
      pressure: 7,
      scavengePenalty: 0.04,
      text: "Tight alleys hide too much movement.",
      thirst: 0
    },
    {
      counterTactics: ["ration"],
      fatigue: 2,
      hunger: 5,
      id: "long-stairwell",
      label: "Long stairwell",
      pressure: 5,
      scavengePenalty: 0.04,
      text: "A long stairwell burns legs and tempers.",
      thirst: 4
    }
  ],
  weird: [
    {
      counterTactics: ["observe"],
      fatigue: 2,
      hunger: 0,
      id: "wrong-echo",
      label: "Wrong echo",
      pressure: 9,
      scavengePenalty: 0.1,
      text: "The route repeats sounds half a second before they happen.",
      thirst: 0
    },
    {
      counterTactics: ["brace"],
      fatigue: 5,
      hunger: 0,
      id: "soft-floor",
      label: "Soft floor",
      pressure: 6,
      scavengePenalty: 0.06,
      text: "The floor flexes like something breathing under tile.",
      thirst: 2
    },
    {
      counterTactics: ["prospect"],
      fatigue: 2,
      hunger: 3,
      id: "mirror-growth",
      label: "Mirror growth",
      pressure: 8,
      scavengePenalty: 0.14,
      text: "Reflective vines hide supplies and exits in the same shimmer.",
      thirst: 3
    }
  ],
  wilds: [
    {
      counterTactics: ["brace"],
      fatigue: 4,
      hunger: 0,
      id: "open-ditch",
      label: "Open ditch",
      pressure: 7,
      scavengePenalty: 0.04,
      text: "A washed-out ditch breaks the road into exposed crossings.",
      thirst: 1
    },
    {
      counterTactics: ["prospect"],
      fatigue: 2,
      hunger: 0,
      id: "overgrown-cache",
      label: "Overgrown cache",
      pressure: 6,
      scavengePenalty: 0.16,
      text: "Useful shapes sit under brush, but every minute searching widens the trail.",
      thirst: 2
    },
    {
      counterTactics: ["ration"],
      fatigue: 2,
      hunger: 5,
      id: "dry-field",
      label: "Dry field",
      pressure: 5,
      scavengePenalty: 0.04,
      text: "Dry stalks cut shade out of the route.",
      thirst: 6
    }
  ]
};

export const combatLootList: JourneyCombatLootOption[] = [
  {
    battleScarRelief: 0,
    fatigue: 4,
    id: "salvage",
    label: "Strip the carcass",
    objectiveBonus: 0,
    pressure: 5,
    reward: lootReward({ fuel: 1, materials: 2 }),
    rollShift: 0.04,
    text: "Slow work, better parts."
  },
  {
    battleScarRelief: 1,
    fatigue: -8,
    id: "medicine",
    label: "Field dress wounds",
    objectiveBonus: 0,
    pressure: 2,
    reward: lootReward({ medicine: 1 }),
    rollShift: -0.02,
    text: "Patch the worst damage before moving."
  },
  {
    battleScarRelief: 0,
    fatigue: 2,
    id: "intel",
    label: "Search for clues",
    objectiveBonus: 1,
    pressure: 6,
    reward: lootReward({}),
    rollShift: -0.1,
    text: "Spend time reading the scene."
  },
  {
    battleScarRelief: 0,
    fatigue: -3,
    id: "evade",
    label: "Leave fast",
    objectiveBonus: 0,
    pressure: -9,
    reward: lootReward({}),
    rollShift: -0.06,
    text: "No extra loot, cleaner exit."
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
    notes.push(`Workshop +${support.lootSalvage} salvage`);
  }

  if (option.id === "medicine" && support.lootMedicine > 0) {
    battleScarRelief += support.lootMedicine;
    fatigue -= support.lootMedicine * 2;
    if (support.lootMedicine >= 2) {
      reward.medicine += 1;
    }
    notes.push(`Clinic +${support.lootMedicine} scar relief`);
  }

  if (option.id === "intel" && support.lootIntel > 0) {
    objectiveBonus += support.lootIntel;
    pressure -= support.lootIntel * 2;
    rollShift -= support.lootIntel * 0.03;
    notes.push(`Radio +${support.lootIntel} objective`);
  }

  if (option.id === "evade" && support.lootEvade > 0) {
    fatigue -= support.lootEvade;
    pressure -= support.lootEvade * 3;
    rollShift -= support.lootEvade * 0.02;
    notes.push(`Lookout +${support.lootEvade} extraction`);
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
    notes.push(`Kitchen +${support.campCook} ration quality`);
  }

  if (action === "rest" && support.campRest > 0) {
    fatigue -= support.campRest * 6;
    pressure -= support.campRest * 2;
    rollShift -= support.campRest * 0.02;
    notes.push(`Clinic/Dorm +${support.campRest} recovery`);
  }

  if (action === "scout" && support.campScout > 0) {
    fatigue -= support.campScout;
    objectiveBonus += support.campScout;
    pressure -= support.campScout * 3;
    rollShift -= support.campScout * 0.02;
    notes.push(`Radio/Lookout +${support.campScout} route read`);
  }

  return {
    ...option,
    fatigue,
    hunger,
    objectiveBonus,
    pressure,
    rollShift,
    supportText: notes.length > 0 ? `Camp support: ${notes.join(", ")}` : "",
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
    notes.push(`Kitchen +${support.shopRations} barter rations`);
  }

  if (action === "intel" && support.shopIntel > 0) {
    objectiveBonus += support.shopIntel;
    pressure -= support.shopIntel * 2;
    rollShift -= support.shopIntel * 0.03;
    notes.push(`Radio +${support.shopIntel} signal leverage`);
  }

  if (action === "service" && support.shopService > 0) {
    reward.materials += support.shopService;
    if (support.shopService >= 2) {
      fieldSupplyReward.ammo += 1;
    }
    fatigue -= support.shopService;
    pressure -= support.shopService;
    notes.push(`Workshop +${support.shopService} service value`);
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
    supportText: notes.length > 0 ? `Shop support: ${notes.join(", ")}` : "",
    thirst
  };
}

const combatIntentDetails: Record<JourneyCombatIntent, { armor: number; id: JourneyCombatIntent; incoming: number; label: string; text: string }> = {
  brace: {
    armor: 2,
    id: "brace",
    incoming: -1,
    label: "Brace",
    text: "Armor rises this round. Tactic breaks the posture."
  },
  maul: {
    armor: 0,
    id: "maul",
    incoming: 0,
    label: "Maul",
    text: "A direct hit is coming. Guard softens it."
  },
  prowl: {
    armor: 0,
    id: "prowl",
    incoming: 2,
    label: "Prowl",
    text: "It hunts for a weak line. Strike or Tactic can interrupt."
  },
  windup: {
    armor: 0,
    id: "windup",
    incoming: 5,
    label: "Wind-up",
    text: "A heavy hit is building. Guard can punish it."
  }
};

const combatActionStrain: Record<CombatAction, number> = {
  guard: 1,
  patch: 1,
  retreat: 0,
  strike: 2,
  tactic: 1
};

const combatActionNames: Record<CombatAction, string> = {
  guard: "guard",
  patch: "patch",
  retreat: "retreat",
  strike: "strike",
  tactic: "tactic"
};

export function enemyTraitPulse(trait: JourneyEnemy["trait"]): JourneyEnemyPulse {
  const pulses: Record<JourneyEnemy["trait"], JourneyEnemyPulse> = {
    armored: {
      counterActions: ["tactic"],
      label: "Plating lock",
      text: "The shell tightens when it is not kept exposed.",
      warning: "armor can harden if tactics do not keep a weak point open."
    },
    bleeder: {
      counterActions: ["guard", "patch"],
      label: "Open wounds",
      text: "Uncontrolled hits leave lingering bleed on the squad.",
      warning: "new bleed can stack until someone patches or covers the line."
    },
    dread: {
      counterActions: ["guard", "tactic"],
      label: "Black signal",
      text: "Every unsteady exchange pushes the route toward panic.",
      warning: "pressure spikes unless the squad holds or reads the pattern."
    },
    swarm: {
      counterActions: ["strike", "tactic"],
      label: "Pack pressure",
      text: "Route pressure turns into extra bodies in the hit back.",
      warning: "current pressure adds extra damage and can climb higher."
    }
  };

  return pulses[trait];
}

function enemyPulseCountersAction(combat: JourneyCombat, action: CombatAction) {
  const pulse = combat.traitPulse ?? enemyTraitPulse(combat.enemyTrait);
  return pulse.counterActions.includes(action);
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
  const nextRisk = countersPulse ? `${risk} Counters ${pulse.label}.` : risksPulse ? `${risk} ${pulse.label}: ${pulse.warning}` : risk;

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
        log: `${resourceLabels[spentKey]} -1 for cover`,
        pressure: -5
      };
    }

    journey.condition.fatigue = clampPercent(journey.condition.fatigue + 3);
    return {
      log: "no cover gear: the quiet route takes longer",
      pressure: 6
    };
  }

  if (plan === "scavenge") {
    return {
      log: "extra search time",
      pressure: 0
    };
  }

  if (plan === "rush") {
    return {
      log: "no stops",
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
    effects.push(`Tactic: ${tactic.label}`);
    if (spentKey) {
      effects.push(`Spent ${resourceLabels[spentKey]}`);
    }
    if (pressure !== 0) {
      effects.push(`Tactic pressure ${formatSignedPercent(pressure)}`);
    }
    journey.logs.push(`Segment tactic: ${tactic.label}. ${effective ? tactic.successLog : tactic.fallbackLog}`);
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
    journey.logs.push(`Threat counter: ${threat.label}. ${threat.text}`);
    return {
      effects: [`Countered: ${threat.label}`],
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
    ...(mitigation.pressure > 0 ? [`Facility mitigation -${mitigation.pressure}%`] : []),
    ...(mitigation.fatigue > 0 ? [`Facility fatigue -${mitigation.fatigue}`] : [])
  ];

  journey.logs.push(`Segment threat: ${threat.label}. ${threat.text}`);
  if (mitigation.value > 0) {
    journey.logs.push(`Facility mitigation: ${threat.label}. ${mitigation.source} softens the route.`);
  }

  return {
    effects: [`Threat: ${threat.label}`, ...(pressure > 0 ? [`Threat pressure ${formatSignedPercent(pressure)}`] : []), ...mitigationEffects],
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
    pressureDelta: number;
  }
): JourneyTravelRecord {
  const moodTable = familyTravelMoods[journey.locationFamily] ?? familyTravelMoods.urban;
  const mood = moodTable[Math.max(0, journey.condition.distance - 1) % moodTable.length];
  const conditionText = `Fatigue ${journey.condition.fatigue} / Hunger ${journey.condition.hunger} / Thirst ${journey.condition.thirst}`;

  return {
    body: `${mood.body} ${plan.text}`,
    conditionText,
    effects: result.effects,
    planLabel: plan.label,
    pressureDelta: result.pressureDelta,
    segment: journey.condition.distance,
    title: mood.title,
    tone: travelToneFor(journey)
  };
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
    heavy: "heavy pack",
    light: "light pack",
    overloaded: "overloaded"
  };
  return labels[tier];
}

function queueRoadEncounter(journey: JourneyState, squad: Survivor[], plan: JourneyTravelPlan, routeSkill: number, nextNodeIndex: number) {
  const table = familyRoadBeats[journey.locationFamily] ?? familyRoadBeats.urban;
  const beat = table[Math.max(0, journey.condition.distance - 1) % table.length];
  const bestLuck = bestBy(squad, "luck").attributes.luck;
  const worstCondition = Math.max(journey.condition.fatigue, journey.condition.hunger, journey.condition.thirst);
  const roll =
    Math.random() +
    routeSkill * 0.05 +
    Math.floor(bestLuck / 40) * 0.03 +
    roadBeatPlanBonus(plan) -
    journey.pressure / 260 -
    worstCondition / 260;

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
  journey.logs.push(`Road fork: ${beat.title}. ${body}`);
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
      fallbackLog: `${beat.hazardLog} No matching gear is ready, so the squad has to improvise.`,
      fatigue: Math.max(1, Math.ceil(beat.fatigue / 2)),
      hunger: 0,
      id: "secure",
      label: "Secure route",
      pressure: securePressure,
      reward: createEmptyResourceBundle(),
      rollShift: Math.max(0.02, beat.rollShift / 2),
      successLog: beat.mitigationLog,
      supplyPriority: beat.supplyPriority,
      text: "Spend matching field gear to control the problem before it spreads.",
      thirst: 0
    },
    {
      fatigue: tone === "find" ? 2 : beat.fatigue,
      hunger: tone === "hazard" ? beat.hunger : 1,
      id: "search",
      label: "Search margins",
      pressure: searchPressure,
      reward: bundleFromKeys(searchRewardKeys),
      rollShift: tone === "find" ? -0.06 : beat.rollShift,
      successLog: beat.opportunityLog,
      supplyPriority: [],
      text: "Slow down and squeeze value out of the route.",
      thirst: tone === "hazard" ? beat.thirst : 1
    },
    {
      fatigue: Math.max(1, Math.ceil(beat.fatigue / 2) + (plan === "rush" ? 2 : 0)),
      hunger: tone === "hazard" ? Math.ceil(beat.hunger / 2) : 0,
      id: "push",
      label: "Push onward",
      pressure: pushPressure,
      reward: createEmptyResourceBundle(),
      rollShift: tone === "hazard" ? beat.rollShift : 0.02,
      successLog: tone === "find" ? "The squad notes the opportunity and keeps the route clock clean." : "The squad keeps moving before the road can demand more.",
      supplyPriority: [],
      text: "Take no detour and preserve tempo.",
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
      ? "Use facility prep to clear the danger without spending packed field gear."
      : tone === "find"
        ? "Call in mapped route notes and turn the opening into cleaner salvage."
        : "Follow the prepared detour and keep the squad moving under base guidance.";

  return {
    fatigue,
    hunger: 0,
    id: "support",
    label: "Base route support",
    pressure,
    reward: bundleFromKeys(rewardKeys),
    rollShift: tone === "find" ? -0.08 : tone === "hazard" ? -0.04 : -0.03,
    successLog: `Base route support resolves ${beat.title.toLowerCase()} before the squad has to burn field gear`,
    supplyPriority: [],
    supportText: `Facility road tactic +${supportLevel}`,
    text,
    thirst: 0
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
  if (choice.supplyPriority.length > 0 && !spentKey) {
    const fallbackPressure = Math.max(4, choice.pressure + 6);
    const fallbackFatigue = choice.fatigue + 2;
    next.condition.fatigue = clampPercent(next.condition.fatigue + fallbackFatigue);
    next.pressure = clampPercent(next.pressure + fallbackPressure);
    next.rollShift += Math.max(0.04, choice.rollShift);
    outcome = `${withoutTerminalPunctuation(choice.fallbackLog ?? choice.successLog)}. Fatigue +${fallbackFatigue}, pressure ${formatSignedPercent(fallbackPressure)}.`;
    queueRoadAmbush(next, pending, squad, readiness);
  } else {
    addResources(next.bonusReward, choice.reward);
    next.condition.fatigue = clampPercent(next.condition.fatigue + choice.fatigue);
    next.condition.hunger = clampPercent(next.condition.hunger + choice.hunger);
    next.condition.thirst = clampPercent(next.condition.thirst + choice.thirst);
    next.pressure = clampPercent(next.pressure + choice.pressure);
    next.rollShift += choice.rollShift;
    const rewardText = formatBundle(choice.reward);
    outcome = `${withoutTerminalPunctuation(choice.successLog)}${spentKey ? `, ${resourceLabels[spentKey]} -1` : ""}${
      rewardText !== "no salvage" ? `, ${rewardText}` : ""
    }, fatigue ${formatSignedNumber(choice.fatigue)}, hunger ${formatSignedNumber(choice.hunger)}, thirst ${formatSignedNumber(
      choice.thirst
    )}, pressure ${formatSignedPercent(choice.pressure)}.`;
    if (pending.tone === "hazard" && choice.id === "push") {
      queueRoadAmbush(next, pending, squad, readiness);
    }
  }

  pushRoadEvent(next, pending.title, pending.tone, outcome, pending.segment);
  next.pendingRoadEvent = null;
  if (!next.combat) {
    next.currentNodeIndex = pending.nextNodeIndex;
  }
  return next;
}

function queueRoadAmbush(next: JourneyState, pending: JourneyPendingRoadEncounter, squad: Survivor[], readiness: number) {
  if (squad.length === 0 || next.combat) {
    return;
  }

  const enemy = materializeRoadAmbushEnemy(next.locationFamily, pending.segment);
  const ambushNode: JourneyNode = {
    body: `${pending.title} turns loud enough to pull something off the route before the next stop.`,
    enemy,
    id: `${pending.id}-ambush`,
    title: "Road Ambush",
    type: "combat"
  };
  next.nodes.splice(pending.nextNodeIndex, 0, ambushNode);
  next.currentNodeIndex = pending.nextNodeIndex;
  next.combat = createCombatForNode(ambushNode, squad, readiness, next.support);
  next.logs.push(`Road ambush: ${pending.title}. The bad route decision turns into contact before the next stop.`);
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
  journey.logs.push(`Road event: ${title}. ${outcome}`);
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
    journey.logs.push(`Action strain: ${combatant.name} is knocked down by overexertion after spending ${spent} stamina on ${combatActionNames[action]}.`);
  } else {
    refreshCombatantStatus(combatant);
    journey.logs.push(`Action strain: ${combatant.name} spends ${spent} stamina on ${combatActionNames[action]}.`);
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
      journey.logs.push(`${target.name} is knocked down and marked for treatment.`);
    } else {
      refreshCombatantStatus(target);
    }
  }

  syncCombatSquadHp(combat);
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
    return "no salvage";
  }

  return entries.map((key) => `${resourceLabels[key]} +${resources[key]}`).join(" / ");
}

function formatSignedPercent(value: number) {
  return `${value >= 0 ? "+" : ""}${value}%`;
}

function formatSignedNumber(value: number) {
  return `${value >= 0 ? "+" : ""}${value}`;
}

function withActionStrain(effect: string, strain: number) {
  return strain > 0 ? `${effect}, strain -${strain}` : effect;
}

function withoutTerminalPunctuation(value: string) {
  return value.replace(/[.!?]+$/, "");
}

function combatTrophyFor(trait: JourneyEnemy["trait"]) {
  const trophies: Record<JourneyEnemy["trait"], string> = {
    armored: "armor plates",
    bleeder: "serrated sample",
    dread: "black signal shard",
    swarm: "pack lure"
  };
  return trophies[trait];
}

function pick<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length) % items.length];
}

const travelScavengeKeys: ResourceKey[] = ["materials", "food", "water", "medicine", "fuel", "ammo"];
