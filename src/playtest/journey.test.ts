import { afterEach, describe, expect, test, vi } from "vitest";
import {
  advanceJourneyTravel,
  createJourney,
  createCombatForNode,
  resolveCampAction,
  resolveCombatLootChoice,
  resolveCombatRound,
  setJourneyTravelPlan,
  spendFieldSupplyFromPriority
} from "./journey";
import { createStarterSession } from "./state";

describe("journey route generation", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("creates family-specific route events, enemies, and shops", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const session = createStarterSession("user-a", "Alice", "route-room");
    const draft = {
      loadout: { ammo: 1, food: 1, fuel: 1, materials: 0, medicine: 1, water: 1 },
      risk: "standard" as const,
      squadIds: session.account.survivors.slice(0, 3).map((survivor) => survivor.id)
    };

    const resourceRoute = createJourney(session, draft, "water-plant", 60);
    const weirdRoute = createJourney(session, draft, "greenhouse", 60);

    expect(resourceRoute.nodes[0].title).toBe("Sluice Gate Detour");
    expect(resourceRoute.nodes[1].enemy?.name).toBe("Valve Ghoul");
    expect(resourceRoute.nodes[2].type).toBe("camp");
    expect(resourceRoute.nodes[3].shop?.label).toBe("Buy repair kit");
    expect(weirdRoute.nodes[0].title).toBe("Listening Vines");
    expect(weirdRoute.nodes[1].enemy?.name).toBe("Borrowed Shadow");
    expect(weirdRoute.nodes[2].type).toBe("camp");
    expect(weirdRoute.nodes[3].shop?.label).toBe("Pay masked vendor");
  });

  test("combat inherits enemy stats and salvage rewards from the route node", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const session = createStarterSession("user-a", "Alice", "combat-room");
    const squad = session.account.survivors.slice(0, 3);
    const journey = createJourney(
      session,
      {
        loadout: { ammo: 1, food: 1, fuel: 1, materials: 0, medicine: 1, water: 1 },
        risk: "standard",
        squadIds: squad.map((survivor) => survivor.id)
      },
      "hospital",
      60
    );

    const combat = createCombatForNode(journey.nodes[1], squad, 60);

    expect(combat?.enemyName).toBe("Hallway Pack");
    expect(combat?.attack).toBeGreaterThan(6);
    expect(combat?.reward.ammo).toBe(1);
    expect(combat?.enemyTraitLabel).toBe("Swarm");
    expect(combat?.intentLabel).toBe("Prowl");
    expect(combat?.intentText).toContain("interrupt");
  });

  test("facility support adds field supplies and combat endurance", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const session = createStarterSession("user-a", "Alice", "support-room");
    const squad = session.account.survivors.slice(0, 3);
    const support = {
      ammoDamage: 1,
      guardBlock: 1,
      lootEvade: 0,
      lootIntel: 0,
      lootMedicine: 0,
      lootSalvage: 0,
      maxHp: 8,
      patchHeal: 3,
      pressureRelief: 2,
      startingSupplies: { ammo: 1, medicine: 1 }
    };
    const journey = createJourney(
      session,
      {
        loadout: { ammo: 0, food: 1, fuel: 0, materials: 0, medicine: 0, water: 1 },
        risk: "standard",
        squadIds: squad.map((survivor) => survivor.id),
        support
      },
      "hospital",
      60
    );

    const unsupported = createCombatForNode(journey.nodes[1], squad, 60);
    const supported = createCombatForNode(journey.nodes[1], squad, 60, support);

    expect(journey.fieldSupplies.ammo).toBe(1);
    expect(journey.fieldSupplies.medicine).toBe(1);
    expect((supported?.squadMaxHp ?? 0) - (unsupported?.squadMaxHp ?? 0)).toBe(8);
  });

  test("field supply spending follows priority order", () => {
    const session = createStarterSession("user-a", "Alice", "supply-room");
    const journey = createJourney(
      session,
      {
        loadout: { ammo: 0, food: 1, fuel: 0, materials: 0, medicine: 0, water: 2 },
        risk: "cautious",
        squadIds: session.account.survivors.slice(0, 3).map((survivor) => survivor.id)
      },
      "farm",
      55
    );

    expect(spendFieldSupplyFromPriority(journey, ["ammo", "water", "food"], 1)).toBe("water");
    expect(journey.fieldSupplies.water).toBe(1);
  });

  test("travel segments consume rations and update road condition", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    const session = createStarterSession("user-a", "Alice", "road-room");
    const squad = session.account.survivors.slice(0, 3);
    const journey = createJourney(
      session,
      {
        loadout: { ammo: 0, food: 1, fuel: 0, materials: 0, medicine: 0, water: 1 },
        risk: "standard",
        squadIds: squad.map((survivor) => survivor.id)
      },
      "farm",
      55
    );

    const advanced = advanceJourneyTravel(journey, squad, 55);

    expect(advanced.condition.distance).toBe(1);
    expect(advanced.condition.fatigue).toBeGreaterThan(journey.condition.fatigue);
    expect(advanced.fieldSupplies.food).toBe(0);
    expect(advanced.fieldSupplies.water).toBe(0);
    expect(advanced.logs.join("\n")).toContain("Road: segment 1");
  });

  test("travel segments surface road encounters with visible outcomes", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.99);
    const session = createStarterSession("user-a", "Alice", "road-event-room");
    const squad = session.account.survivors.slice(0, 3);
    const journey = createJourney(
      session,
      {
        loadout: { ammo: 0, food: 1, fuel: 0, materials: 0, medicine: 0, water: 1 },
        risk: "standard",
        squadIds: squad.map((survivor) => survivor.id)
      },
      "farm",
      55
    );

    const advanced = advanceJourneyTravel(setJourneyTravelPlan(journey, "scavenge"), squad, 55);
    const salvageTotal = Object.values(advanced.bonusReward).reduce((sum, value) => sum + value, 0);

    expect(advanced.roadEvents).toHaveLength(1);
    expect(advanced.roadEvents[0]).toMatchObject({
      segment: 1,
      title: "Thorn Wire Ditch",
      tone: "find"
    });
    expect(salvageTotal).toBeGreaterThan(0);
    expect(advanced.logs.join("\n")).toContain("Road event: Thorn Wire Ditch");
  });

  test("road hazards spend matching field supplies to mitigate damage", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const session = createStarterSession("user-a", "Alice", "road-hazard-room");
    const squad = session.account.survivors.slice(0, 3);
    const journey = createJourney(
      session,
      {
        loadout: { ammo: 0, food: 1, fuel: 0, materials: 1, medicine: 0, water: 1 },
        risk: "standard",
        squadIds: squad.map((survivor) => survivor.id)
      },
      "hospital",
      55
    );

    const advanced = advanceJourneyTravel(journey, squad, 55);

    expect(advanced.fieldSupplies.materials).toBe(0);
    expect(advanced.roadEvents[0]).toMatchObject({
      title: "Collapsed Stairwell",
      tone: "hazard"
    });
    expect(advanced.roadEvents[0].outcome).toContain("Materials -1");
    expect(advanced.logs.join("\n")).toContain("Road event: Collapsed Stairwell");
  });

  test("travel plans change road risk and salvage rhythm", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.6);
    const session = createStarterSession("user-a", "Alice", "travel-plan-room");
    const squad = session.account.survivors.slice(0, 3);
    const journey = createJourney(
      session,
      {
        loadout: { ammo: 0, food: 1, fuel: 0, materials: 0, medicine: 0, water: 1 },
        risk: "standard",
        squadIds: squad.map((survivor) => survivor.id)
      },
      "farm",
      55
    );

    const planned = setJourneyTravelPlan(journey, "scavenge");
    const advanced = advanceJourneyTravel(planned, squad, 55);

    expect(planned.travelPlan).toBe("scavenge");
    expect(advanced.bonusReward.food).toBe(1);
    expect(advanced.logs.join("\n")).toContain("Strip the road");
  });

  test("sneak travel spends cover gear to lower route pressure", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    const session = createStarterSession("user-a", "Alice", "sneak-room");
    const squad = session.account.survivors.slice(0, 3);
    const journey = createJourney(
      session,
      {
        loadout: { ammo: 0, food: 1, fuel: 1, materials: 0, medicine: 0, water: 1 },
        risk: "standard",
        squadIds: squad.map((survivor) => survivor.id)
      },
      "hospital",
      55
    );

    const advanced = advanceJourneyTravel(setJourneyTravelPlan(journey, "sneak"), squad, 55);

    expect(advanced.fieldSupplies.fuel).toBe(0);
    expect(advanced.pressure).toBeLessThan(journey.pressure);
    expect(advanced.logs.join("\n")).toContain("Fuel -1 for cover");
  });

  test("camp choices trade supplies for recovery and objective progress", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const session = createStarterSession("user-a", "Alice", "camp-room");
    const squad = session.account.survivors.slice(0, 3);
    const journey = createJourney(
      session,
      {
        loadout: { ammo: 0, food: 1, fuel: 1, materials: 0, medicine: 0, water: 1 },
        risk: "standard",
        squadIds: squad.map((survivor) => survivor.id)
      },
      "water-plant",
      60
    );
    journey.currentNodeIndex = 2;
    journey.condition.fatigue = 40;
    journey.condition.hunger = 35;
    journey.condition.thirst = 30;

    const scouted = resolveCampAction(journey, "scout");

    expect(scouted.fieldSupplies.fuel).toBe(0);
    expect(scouted.objectiveBonus).toBe(1);
    expect(scouted.pressure).toBeLessThan(journey.pressure);
    expect(scouted.logs.join("\n")).toContain("objective +1");
  });

  test("tactics expose armored enemies and improve later strike damage", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const session = createStarterSession("user-a", "Alice", "tactic-room");
    const squad = session.account.survivors.slice(0, 3);
    squad[2].level = 2;
    const journey = createJourney(
      session,
      {
        loadout: { ammo: 0, food: 1, fuel: 0, materials: 0, medicine: 1, water: 1 },
        risk: "standard",
        squadIds: squad.map((survivor) => survivor.id)
      },
      "water-plant",
      60
    );
    journey.currentNodeIndex = 1;
    journey.combat = createCombatForNode(journey.nodes[1], squad, 60);

    const exposed = resolveCombatRound(journey, "tactic", squad, 60);
    const afterStrike = resolveCombatRound(exposed, "strike", squad, 60);

    expect(exposed.combat?.exposed).toBeGreaterThan(0);
    expect(afterStrike.combat?.enemyHp).toBeLessThan(exposed.combat?.enemyHp ?? 999);
    expect(afterStrike.logs.join("\n")).toContain("leads a strike");
  });

  test("combat intent rewards matching counters", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const session = createStarterSession("user-a", "Alice", "intent-room");
    const squad = session.account.survivors.slice(0, 3);
    const journey = createJourney(
      session,
      {
        loadout: { ammo: 0, food: 1, fuel: 0, materials: 0, medicine: 1, water: 1 },
        risk: "standard",
        squadIds: squad.map((survivor) => survivor.id)
      },
      "water-plant",
      60
    );
    journey.currentNodeIndex = 1;
    journey.combat = createCombatForNode(journey.nodes[1], squad, 60);
    if (journey.combat) {
      journey.combat.enemyHp = journey.combat.enemyMaxHp;
      journey.combat.intent = "windup";
      journey.combat.intentLabel = "Wind-up";
      journey.combat.intentText = "A heavy hit is building. Guard can punish it.";
    }

    const guarded = resolveCombatRound(journey, "guard", squad, 60);
    const struck = resolveCombatRound(journey, "strike", squad, 60);

    expect(guarded.combat?.squadHp).toBeGreaterThan(struck.combat?.squadHp ?? 0);
    expect(guarded.logs.join("\n")).toContain("guard catches the wind-up");
  });

  test("tactic breaks brace intent", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const session = createStarterSession("user-a", "Alice", "brace-intent-room");
    const squad = session.account.survivors.slice(0, 3);
    const journey = createJourney(
      session,
      {
        loadout: { ammo: 0, food: 1, fuel: 0, materials: 0, medicine: 1, water: 1 },
        risk: "standard",
        squadIds: squad.map((survivor) => survivor.id)
      },
      "water-plant",
      60
    );
    journey.currentNodeIndex = 1;
    journey.combat = createCombatForNode(journey.nodes[1], squad, 60);
    if (journey.combat) {
      journey.combat.intent = "brace";
      journey.combat.intentLabel = "Brace";
      journey.combat.intentText = "Armor rises this round. Tactic breaks the posture.";
    }

    const resolved = resolveCombatRound(journey, "tactic", squad, 60);

    expect(resolved.combat?.exposed).toBeGreaterThan(1);
    expect(resolved.logs.join("\n")).toContain("tactic breaks the brace");
  });

  test("bleeder enemies add persistent bleed until patched", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.99);
    const session = createStarterSession("user-a", "Alice", "bleed-room");
    const squad = session.account.survivors.slice(0, 3);
    const journey = createJourney(
      session,
      {
        loadout: { ammo: 0, food: 1, fuel: 0, materials: 0, medicine: 1, water: 1 },
        risk: "standard",
        squadIds: squad.map((survivor) => survivor.id)
      },
      "fuel-stop",
      60
    );
    journey.currentNodeIndex = 1;
    journey.combat = createCombatForNode(journey.nodes[1], squad, 60);

    const bleeding = resolveCombatRound(journey, "strike", squad, 60);
    const patched = resolveCombatRound(bleeding, "patch", squad, 60);

    expect(bleeding.combat?.bleed).toBeGreaterThan(0);
    expect(patched.combat?.bleed).toBeLessThan(bleeding.combat?.bleed ?? 0);
  });

  test("retreat exits combat with pressure and route progress", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const session = createStarterSession("user-a", "Alice", "retreat-room");
    const squad = session.account.survivors.slice(0, 3);
    const journey = createJourney(
      session,
      {
        loadout: { ammo: 0, food: 1, fuel: 0, materials: 0, medicine: 1, water: 1 },
        risk: "standard",
        squadIds: squad.map((survivor) => survivor.id)
      },
      "hospital",
      60
    );
    journey.currentNodeIndex = 1;
    journey.combat = createCombatForNode(journey.nodes[1], squad, 60);

    const retreated = resolveCombatRound(journey, "retreat", squad, 60);

    expect(retreated.currentNodeIndex).toBe(2);
    expect(retreated.pressure).toBeGreaterThan(journey.pressure);
    expect(retreated.logs.join("\n")).toContain("retreats under pressure");
  });

  test("combat victory records trophies and battle scars based on remaining stamina", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const session = createStarterSession("user-a", "Alice", "aftermath-room");
    const squad = session.account.survivors.slice(0, 3);
    const journey = createJourney(
      session,
      {
        loadout: { ammo: 3, food: 1, fuel: 0, materials: 0, medicine: 0, water: 1 },
        risk: "standard",
        squadIds: squad.map((survivor) => survivor.id)
      },
      "water-plant",
      75
    );
    journey.currentNodeIndex = 1;
    journey.combat = createCombatForNode(journey.nodes[1], squad, 75);
    if (journey.combat) {
      journey.combat.enemyHp = 3;
      journey.combat.squadHp = Math.floor(journey.combat.squadMaxHp * 0.3);
    }

    const won = resolveCombatRound(journey, "strike", squad, 75);

    expect(won.trophies).toContain("armor plates");
    expect(won.battleScars).toBeGreaterThan(0);
    expect(won.pendingCombatLoot?.trophy).toBe("armor plates");
    expect(won.currentNodeIndex).toBe(1);
    expect(won.logs.join("\n")).toContain("Battle scars");
  });

  test("combat loot choices trade victory time for resources or objective clues", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const session = createStarterSession("user-a", "Alice", "loot-choice-room");
    const squad = session.account.survivors.slice(0, 3);
    const journey = createJourney(
      session,
      {
        loadout: { ammo: 3, food: 1, fuel: 0, materials: 0, medicine: 0, water: 1 },
        risk: "standard",
        squadIds: squad.map((survivor) => survivor.id)
      },
      "water-plant",
      75
    );
    journey.currentNodeIndex = 1;
    journey.combat = createCombatForNode(journey.nodes[1], squad, 75);
    if (journey.combat) {
      journey.combat.enemyHp = 3;
    }

    const won = resolveCombatRound(journey, "strike", squad, 75);
    const intel = resolveCombatLootChoice(won, "intel");
    const salvage = resolveCombatLootChoice(won, "salvage");

    expect(intel.pendingCombatLoot).toBeNull();
    expect(intel.objectiveBonus).toBe(won.objectiveBonus + 1);
    expect(intel.logs.join("\n")).toContain("Search for clues");
    expect(salvage.bonusReward.materials).toBeGreaterThan(won.bonusReward.materials);
  });

  test("facility support improves matching combat loot choices", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const session = createStarterSession("user-a", "Alice", "loot-facility-room");
    const squad = session.account.survivors.slice(0, 3);
    const journey = createJourney(
      session,
      {
        loadout: { ammo: 3, food: 1, fuel: 0, materials: 0, medicine: 0, water: 1 },
        risk: "standard",
        squadIds: squad.map((survivor) => survivor.id)
      },
      "water-plant",
      75
    );
    journey.currentNodeIndex = 1;
    journey.combat = createCombatForNode(journey.nodes[1], squad, 75);
    journey.support = {
      ...journey.support,
      lootIntel: 1,
      lootSalvage: 2
    };
    if (journey.combat) {
      journey.combat.enemyHp = 3;
    }

    const won = resolveCombatRound(journey, "strike", squad, 75);
    const salvage = resolveCombatLootChoice(won, "salvage");
    const intel = resolveCombatLootChoice(won, "intel");

    expect(salvage.bonusReward.materials - won.bonusReward.materials).toBe(4);
    expect(salvage.bonusReward.fuel - won.bonusReward.fuel).toBe(2);
    expect(salvage.logs.join("\n")).toContain("Workshop +2 salvage");
    expect(intel.objectiveBonus - won.objectiveBonus).toBe(2);
    expect(intel.logs.join("\n")).toContain("Radio +1 objective");
  });

  test("field dress loot choice reduces battle scars", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const session = createStarterSession("user-a", "Alice", "loot-medicine-room");
    const squad = session.account.survivors.slice(0, 3);
    const journey = createJourney(
      session,
      {
        loadout: { ammo: 3, food: 1, fuel: 0, materials: 0, medicine: 0, water: 1 },
        risk: "standard",
        squadIds: squad.map((survivor) => survivor.id)
      },
      "water-plant",
      75
    );
    journey.currentNodeIndex = 1;
    journey.combat = createCombatForNode(journey.nodes[1], squad, 75);
    if (journey.combat) {
      journey.combat.enemyHp = 3;
      journey.combat.squadHp = Math.floor(journey.combat.squadMaxHp * 0.3);
    }

    const won = resolveCombatRound(journey, "strike", squad, 75);
    const dressed = resolveCombatLootChoice(won, "medicine");

    expect(dressed.battleScars).toBeLessThan(won.battleScars);
    expect(dressed.bonusReward.medicine).toBeGreaterThan(won.bonusReward.medicine);
    expect(dressed.logs.join("\n")).toContain("battle scars -1");
  });
});
