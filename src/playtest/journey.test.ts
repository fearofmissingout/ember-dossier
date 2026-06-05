import { afterEach, describe, expect, test, vi } from "vitest";
import {
  advanceJourneyTravel,
  calculateCarryBurden,
  campOptionOutcome,
  combatActionPreview,
  createJourney,
  createCombatForNode,
  forecastNextSegment,
  resolveCampAction,
  resolveCombatLootChoice,
  resolveCombatRound,
  resolveRoadEncounterChoice,
  resolveShopAction,
  routePaceFor,
  segmentThreatFor,
  setJourneySegmentTactic,
  setJourneyTravelPlan,
  shopOfferOutcome,
  spendFieldSupplyFromPriority
} from "./journey";
import { supportFromFacilities } from "./progression";
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

  test("summarizes route pace and upcoming journey beats", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const session = createStarterSession("user-a", "Alice", "pace-room");
    const squad = session.account.survivors.slice(0, 3);
    const journey = createJourney(
      session,
      {
        loadout: { ammo: 1, food: 1, fuel: 1, materials: 0, medicine: 1, water: 1 },
        risk: "standard",
        squadIds: squad.map((survivor) => survivor.id)
      },
      "water-plant",
      60
    );

    const startPace = routePaceFor(journey);
    const midJourney = { ...journey, currentNodeIndex: 2, condition: { ...journey.condition, distance: 2 } };
    const midPace = routePaceFor(midJourney);

    expect(startPace).toMatchObject({
      currentLabel: "event",
      currentStop: 1,
      nextLabel: "combat",
      progressPercent: 0,
      remainingStops: 4,
      totalStops: 5
    });
    expect(startPace.forecast.map((stop) => `${stop.index}:${stop.label}:${stop.state}`)).toEqual([
      "1:event:active",
      "2:combat:ahead",
      "3:camp:ahead",
      "4:shop:ahead",
      "5:extraction:ahead"
    ]);
    expect(midPace).toMatchObject({
      currentLabel: "camp",
      currentStop: 3,
      distanceSegments: 2,
      nextLabel: "shop",
      progressPercent: 50,
      remainingStops: 2
    });
    expect(midPace.forecast[0].state).toBe("done");
  });

  test("route pace surfaces pending road encounters as the current beat", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.99);
    const session = createStarterSession("user-a", "Alice", "pace-road-room");
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

    const blocked = advanceJourneyTravel(setJourneyTravelPlan(journey, "scavenge"), squad, 55);
    const pace = routePaceFor(blocked);

    expect(blocked.pendingRoadEvent?.tone).toBe("find");
    expect(pace).toMatchObject({
      currentLabel: "road find",
      currentTitle: "Thorn Wire Ditch",
      currentStop: 1,
      nextLabel: "combat",
      pendingRoad: true,
      progressPercent: 0
    });
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
      campCook: 0,
      campRest: 0,
      campScout: 0,
      guardBlock: 1,
      lootEvade: 0,
      lootIntel: 0,
      lootMedicine: 0,
      lootSalvage: 0,
      maxHp: 8,
      patchHeal: 3,
      pressureRelief: 2,
      roadPush: 0,
      roadSearch: 0,
      roadSecure: 0,
      shopIntel: 0,
      shopRations: 0,
      shopService: 0,
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

  test("combat actions show and apply actor strain", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const session = createStarterSession("user-a", "Alice", "combat-strain-room");
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
    const combat = createCombatForNode(journey.nodes[1], squad, 60)!;
    const withCombat = { ...journey, combat, currentNodeIndex: 1 };
    const preview = combatActionPreview(withCombat, "strike", squad, 60);
    const striker = combat.frontline.find((line) => line.name === preview?.actorName)!;

    const resolved = resolveCombatRound(withCombat, "strike", squad, 60);
    const resolvedStriker = resolved.combat?.frontline.find((line) => line.survivorId === striker.survivorId);

    expect(preview?.strain).toBeGreaterThan(0);
    expect(preview?.effect).toContain("strain");
    expect(resolved.logs.join("\n")).toContain("Action strain:");
    expect(resolvedStriker?.stamina).toBeLessThan(striker.stamina);
  });

  test("combat actions avoid downed specialists when choosing actors", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const session = createStarterSession("user-a", "Alice", "combat-downed-role-room");
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
    const combat = createCombatForNode(journey.nodes[1], squad, 60)!;
    const originalPreview = combatActionPreview({ ...journey, combat, currentNodeIndex: 1 }, "strike", squad, 60)!;
    const downedStriker = combat.frontline.find((line) => line.name === originalPreview.actorName)!;
    downedStriker.stamina = 0;
    downedStriker.status = "down";

    const preview = combatActionPreview({ ...journey, combat, currentNodeIndex: 1 }, "strike", squad, 60);
    const resolved = resolveCombatRound({ ...journey, combat, currentNodeIndex: 1 }, "strike", squad, 60);

    expect(preview?.actorName).not.toBe(downedStriker.name);
    expect(resolved.logs.join("\n")).not.toContain(`${downedStriker.name} leads a strike`);
  });

  test("heavy loadouts create pack burden and slow route travel", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    const session = createStarterSession("user-a", "Alice", "burden-room");
    const squad = session.account.survivors.slice(0, 3);
    const journey = createJourney(
      session,
      {
        loadout: { ammo: 3, food: 3, fuel: 3, materials: 3, medicine: 3, water: 3 },
        risk: "standard",
        squadIds: squad.map((survivor) => survivor.id)
      },
      "farm",
      55
    );
    const lightJourney = createJourney(
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
    const lightAdvanced = advanceJourneyTravel(lightJourney, squad, 55);

    expect(journey.burden).toMatchObject({
      load: 18,
      tier: "overloaded"
    });
    expect(journey.pressure).toBeGreaterThan(18);
    expect(journey.logs.join("\n")).toContain("Pack burden");
    expect(advanced.condition.fatigue - journey.condition.fatigue).toBeGreaterThan(lightAdvanced.condition.fatigue - lightJourney.condition.fatigue);
    expect(advanced.travelHistory[0].effects).toEqual(expect.arrayContaining([expect.stringContaining("Burden +")]));
  });

  test("carry capacity support can turn an overloaded pack into a heavy pack", () => {
    const session = createStarterSession("user-a", "Alice", "capacity-room");
    const squad = session.account.survivors.slice(0, 3);
    const loadout = { ammo: 3, food: 3, fuel: 3, materials: 3, medicine: 3, water: 3 };
    const baseline = calculateCarryBurden(squad, loadout);
    const supported = calculateCarryBurden(squad, loadout, { carryCapacity: 5 });

    expect(baseline.tier).toBe("overloaded");
    expect(supported.capacity).toBeGreaterThan(baseline.capacity);
    expect(supported.tier).toBe("heavy");
    expect(supported.fatiguePenalty).toBeLessThan(baseline.fatiguePenalty);
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
    expect(advanced.pendingRoadEvent?.title).toBe("Thorn Wire Ditch");
    expect(advanced.logs.join("\n")).toContain("Road: segment 1");
    expect(advanced.travelHistory[0]).toMatchObject({
      effects: expect.arrayContaining(["Food -1", "Water -1", "Threat: Open ditch", "Threat pressure +7%", "Fatigue +11", "Pressure +6%"]),
      planLabel: "Steady march",
      segment: 1,
      title: "Field Hush",
      tone: "safe"
    });
    expect(advanced.travelHistory[0].conditionText).toContain("Fatigue 16");
  });

  test("next segment forecast previews Home Behind style road attrition", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    const session = createStarterSession("user-a", "Alice", "forecast-room");
    const squad = session.account.survivors.slice(0, 3);
    const journey = createJourney(
      session,
      {
        loadout: { ammo: 0, food: 1, fuel: 0, materials: 1, medicine: 0, water: 0 },
        risk: "standard",
        squadIds: squad.map((survivor) => survivor.id)
      },
      "farm",
      55
    );

    const forecast = forecastNextSegment(setJourneySegmentTactic(journey, "brace"), squad, 55);

    expect(forecast).toMatchObject({
      planLabel: "Steady march",
      riskLevel: "stable",
      segment: 1,
      tacticLabel: "Tight formation",
      threatLabel: "Open ditch"
    });
    expect(forecast.supplyUse).toEqual(expect.arrayContaining(["Food -1", "No water"]));
    expect(forecast.conditionDeltas).toMatchObject({
      fatigue: 8,
      hunger: 0,
      thirst: 22
    });
    expect(forecast.resultingCondition).toMatchObject({
      distance: 1,
      fatigue: 13,
      hunger: 0,
      thirst: 22
    });
    expect(forecast.notes).toEqual(expect.arrayContaining(["Countered: Open ditch", "Tactic pressure -6%"]));
  });

  test("segment tactics change the next road advance then reset to watch mode", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    const session = createStarterSession("user-a", "Alice", "tactic-room");
    const squad = session.account.survivors.slice(0, 3);
    const draft = {
      loadout: { ammo: 0, food: 1, fuel: 0, materials: 1, medicine: 0, water: 1 },
      risk: "standard" as const,
      squadIds: squad.map((survivor) => survivor.id)
    };
    const baseline = advanceJourneyTravel(createJourney(session, draft, "farm", 55), squad, 55);
    const braced = advanceJourneyTravel(setJourneySegmentTactic(createJourney(session, draft, "farm", 55), "brace"), squad, 55);

    expect(braced.segmentTactic).toBe("observe");
    expect(braced.pressure).toBeLessThan(baseline.pressure);
    expect(braced.travelHistory[0].effects).toEqual(expect.arrayContaining(["Tactic: Tight formation", "Tactic pressure -6%"]));
    expect(braced.logs.join("\n")).toContain("Segment tactic: Tight formation");
  });

  test("route segments preview deterministic threats by location family", () => {
    const session = createStarterSession("user-a", "Alice", "threat-preview-room");
    const squad = session.account.survivors.slice(0, 3);
    const farmJourney = createJourney(
      session,
      {
        loadout: { ammo: 0, food: 1, fuel: 0, materials: 1, medicine: 0, water: 1 },
        risk: "standard",
        squadIds: squad.map((survivor) => survivor.id)
      },
      "farm",
      55
    );
    const hospitalJourney = createJourney(
      session,
      {
        loadout: { ammo: 0, food: 1, fuel: 0, materials: 1, medicine: 0, water: 1 },
        risk: "standard",
        squadIds: squad.map((survivor) => survivor.id)
      },
      "hospital",
      55
    );

    expect(segmentThreatFor(farmJourney)).toMatchObject({
      counterTactics: ["brace"],
      label: "Open ditch",
      pressure: 7
    });
    expect(segmentThreatFor(hospitalJourney)).toMatchObject({
      counterTactics: ["prospect"],
      label: "Glass choke",
      pressure: 8
    });
  });

  test("segment tactics can counter the next route threat", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    const session = createStarterSession("user-a", "Alice", "threat-counter-room");
    const squad = session.account.survivors.slice(0, 3);
    const draft = {
      loadout: { ammo: 0, food: 1, fuel: 0, materials: 1, medicine: 0, water: 1 },
      risk: "standard" as const,
      squadIds: squad.map((survivor) => survivor.id)
    };

    const exposed = advanceJourneyTravel(createJourney(session, draft, "farm", 55), squad, 55);
    const countered = advanceJourneyTravel(setJourneySegmentTactic(createJourney(session, draft, "farm", 55), "brace"), squad, 55);

    expect(exposed.travelHistory[0].effects).toEqual(expect.arrayContaining(["Threat: Open ditch", "Threat pressure +7%"]));
    expect(countered.travelHistory[0].effects).toEqual(expect.arrayContaining(["Countered: Open ditch"]));
    expect(countered.pressure).toBeLessThan(exposed.pressure);
    expect(countered.logs.join("\n")).toContain("Threat counter: Open ditch");
  });

  test("facility route support softens matching segment threats", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    const session = createStarterSession("user-a", "Alice", "facility-threat-room");
    const squad = session.account.survivors.slice(0, 3);
    const draft = {
      loadout: { ammo: 0, food: 1, fuel: 0, materials: 1, medicine: 0, water: 1 },
      risk: "standard" as const,
      squadIds: squad.map((survivor) => survivor.id)
    };
    const supportedDraft = {
      ...draft,
      support: {
        ...supportFromFacilities([]),
        guardBlock: 1,
        roadSecure: 2
      }
    };

    const exposed = advanceJourneyTravel(createJourney(session, draft, "farm", 55), squad, 55);
    const supported = advanceJourneyTravel(createJourney(session, supportedDraft, "farm", 55), squad, 55);

    expect(supported.pressure).toBeLessThan(exposed.pressure);
    expect(supported.travelHistory[0].effects).toEqual(expect.arrayContaining(["Facility mitigation -6%", "Facility fatigue -1"]));
    expect(supported.logs.join("\n")).toContain("Facility mitigation: Open ditch");
  });

  test("prospecting a segment spends gear and can turn the road into a find", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    const session = createStarterSession("user-a", "Alice", "prospect-room");
    const squad = session.account.survivors.slice(0, 3);
    const draft = {
      loadout: { ammo: 0, food: 1, fuel: 0, materials: 1, medicine: 0, water: 1 },
      risk: "standard" as const,
      squadIds: squad.map((survivor) => survivor.id)
    };

    const baseline = advanceJourneyTravel(createJourney(session, draft, "farm", 55), squad, 55);
    const prospected = advanceJourneyTravel(setJourneySegmentTactic(createJourney(session, draft, "farm", 55), "prospect"), squad, 55);
    const baselineFinds = Object.values(baseline.bonusReward).reduce((sum, value) => sum + value, 0);
    const prospectFinds = Object.values(prospected.bonusReward).reduce((sum, value) => sum + value, 0);

    expect(prospected.segmentTactic).toBe("observe");
    expect(prospected.fieldSupplies.materials).toBe(0);
    expect(prospectFinds).toBeGreaterThan(baselineFinds);
    expect(prospected.travelHistory[0].effects).toEqual(expect.arrayContaining(["Tactic: Comb ruins", "Spent Materials"]));
    expect(prospected.logs.join("\n")).toContain("Segment tactic: Comb ruins");
  });

  test("travel segments pause on road encounters before the next node", () => {
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
    const resolved = resolveRoadEncounterChoice(advanced, "search");
    const salvageTotal = Object.values(resolved.bonusReward).reduce((sum, value) => sum + value, 0);

    expect(advanced.pendingRoadEvent).toMatchObject({
      segment: 1,
      title: "Thorn Wire Ditch",
      tone: "find"
    });
    expect(advanced.currentNodeIndex).toBe(0);
    expect(resolved.pendingRoadEvent).toBeNull();
    expect(resolved.currentNodeIndex).toBe(1);
    expect(resolved.roadEvents[0]).toMatchObject({ title: "Thorn Wire Ditch", tone: "find" });
    expect(salvageTotal).toBeGreaterThan(0);
    expect(resolved.logs.join("\n")).toContain("Road event: Thorn Wire Ditch");
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
    const secured = resolveRoadEncounterChoice(advanced, "secure");

    expect(advanced.pendingRoadEvent).toMatchObject({
      title: "Collapsed Stairwell",
      tone: "hazard"
    });
    expect(secured.fieldSupplies.materials).toBe(0);
    expect(secured.roadEvents[0].outcome).toContain("Materials -1");
    expect(secured.logs.join("\n")).toContain("Road event: Collapsed Stairwell");
  });

  test("facility route support adds a road tactic that preserves field supplies", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const session = createStarterSession("user-a", "Alice", "road-support-room");
    const squad = session.account.survivors.slice(0, 3);
    const journey = createJourney(
      session,
      {
        loadout: { ammo: 0, food: 1, fuel: 0, materials: 1, medicine: 0, water: 1 },
        risk: "standard",
        squadIds: squad.map((survivor) => survivor.id),
        support: {
          ...supportFromFacilities(session.room.base.facilities),
          roadSecure: 2
        }
      },
      "hospital",
      55
    );

    const advanced = advanceJourneyTravel(journey, squad, 55);
    const supportChoice = advanced.pendingRoadEvent?.choices.find((choice) => choice.id === "support");
    const supported = resolveRoadEncounterChoice(advanced, "support");

    expect(supportChoice).toMatchObject({
      label: "Base route support",
      supplyPriority: []
    });
    expect(supported.fieldSupplies.materials).toBe(1);
    expect(supported.roadEvents[0].outcome).toContain("Base route support");
    expect(supported.logs.join("\n")).toContain("Road event: Collapsed Stairwell");
  });

  test("pushing through road hazards can trigger an ambush combat before the next stop", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const session = createStarterSession("user-a", "Alice", "road-ambush-room");
    const squad = session.account.survivors.slice(0, 3);
    const journey = createJourney(
      session,
      {
        loadout: { ammo: 0, food: 1, fuel: 0, materials: 0, medicine: 0, water: 1 },
        risk: "standard",
        squadIds: squad.map((survivor) => survivor.id)
      },
      "hospital",
      55
    );

    const advanced = advanceJourneyTravel(journey, squad, 55);
    const ambushed = resolveRoadEncounterChoice(advanced, "push", squad, 55);

    expect(advanced.pendingRoadEvent).toMatchObject({
      title: "Collapsed Stairwell",
      tone: "hazard"
    });
    expect(ambushed.currentNodeIndex).toBe(1);
    expect(ambushed.nodes[1]).toMatchObject({
      title: "Road Ambush",
      type: "combat"
    });
    expect(ambushed.nodes[2].title).toBe("Contact");
    expect(ambushed.combat?.enemyName).toBe("Hallway Pack");
    expect(ambushed.pendingRoadEvent).toBeNull();
    expect(ambushed.logs.join("\n")).toContain("Road ambush: Collapsed Stairwell");
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

  test("base facility support strengthens camp recovery choices", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const session = createStarterSession("user-a", "Alice", "supported-camp-room");
    const squad = session.account.survivors.slice(0, 3);
    const baseJourney = createJourney(
      session,
      {
        loadout: { ammo: 0, food: 1, fuel: 0, materials: 0, medicine: 1, water: 1 },
        risk: "standard",
        squadIds: squad.map((survivor) => survivor.id)
      },
      "hospital",
      60
    );
    baseJourney.currentNodeIndex = 2;
    baseJourney.condition.fatigue = 54;
    baseJourney.condition.hunger = 18;
    baseJourney.condition.thirst = 18;

    const supportedJourney = structuredClone(baseJourney);
    supportedJourney.support = {
      ...supportedJourney.support,
      campCook: 2,
      campRest: 2,
      campScout: 1
    };

    const unsupported = resolveCampAction(baseJourney, "rest");
    const supported = resolveCampAction(supportedJourney, "rest");

    expect(supported.condition.fatigue).toBeLessThan(unsupported.condition.fatigue);
    expect(supported.pressure).toBeLessThan(unsupported.pressure);
    expect(supported.logs.join("\n")).toContain("Camp support");
  });

  test("camp option previews include facility support notes", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const session = createStarterSession("user-a", "Alice", "camp-preview-room");
    const squad = session.account.survivors.slice(0, 3);
    const journey = createJourney(
      session,
      {
        loadout: { ammo: 0, food: 1, fuel: 1, materials: 0, medicine: 1, water: 1 },
        risk: "standard",
        squadIds: squad.map((survivor) => survivor.id)
      },
      "water-plant",
      60
    );
    journey.currentNodeIndex = 2;

    const scout = journey.nodes[2].camp?.scout;
    expect(scout).toBeDefined();
    const preview = campOptionOutcome("scout", scout!, {
      ...journey.support,
      campCook: 0,
      campRest: 0,
      campScout: 2
    });

    expect(preview.objectiveBonus).toBeGreaterThan(scout!.objectiveBonus);
    expect(preview.pressure).toBeLessThan(scout!.pressure);
    expect(preview.supportText).toContain("Radio");
  });

  test("shop offers include resupply, intel, and field service choices", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const session = createStarterSession("user-a", "Alice", "shop-offers-room");
    const squad = session.account.survivors.slice(0, 3);
    const journey = createJourney(
      session,
      {
        loadout: { ammo: 0, food: 1, fuel: 1, materials: 1, medicine: 0, water: 1 },
        risk: "standard",
        squadIds: squad.map((survivor) => survivor.id)
      },
      "water-plant",
      60
    );

    expect(journey.nodes[3].shop?.offers.resupply.label).toBe("Buy road rations");
    expect(journey.nodes[3].shop?.offers.intel.label).toBe("Buy route intel");
    expect(journey.nodes[3].shop?.offers.service.label).toBe("Buy repair kit");
  });

  test("shop resupply converts trade goods into field supplies with kitchen support", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const session = createStarterSession("user-a", "Alice", "shop-resupply-room");
    const squad = session.account.survivors.slice(0, 3);
    const journey = createJourney(
      session,
      {
        loadout: { ammo: 0, food: 0, fuel: 1, materials: 1, medicine: 0, water: 0 },
        risk: "standard",
        squadIds: squad.map((survivor) => survivor.id)
      },
      "water-plant",
      60
    );
    journey.currentNodeIndex = 3;
    journey.pressure = 42;
    journey.support = {
      ...journey.support,
      shopIntel: 0,
      shopRations: 1,
      shopService: 0
    };

    const resolved = resolveShopAction(journey, "resupply");

    expect(resolved.fieldSupplies.materials).toBe(0);
    expect(resolved.fieldSupplies.food).toBeGreaterThan(1);
    expect(resolved.fieldSupplies.water).toBeGreaterThan(1);
    expect(resolved.pressure).toBeLessThan(42);
    expect(resolved.logs.join("\n")).toContain("Shop support");
  });

  test("shop offer previews include radio and workshop support", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const session = createStarterSession("user-a", "Alice", "shop-preview-room");
    const squad = session.account.survivors.slice(0, 3);
    const journey = createJourney(
      session,
      {
        loadout: { ammo: 0, food: 1, fuel: 1, materials: 1, medicine: 0, water: 1 },
        risk: "standard",
        squadIds: squad.map((survivor) => survivor.id)
      },
      "hospital",
      60
    );
    const shop = journey.nodes[3].shop;
    expect(shop).toBeDefined();

    const intel = shopOfferOutcome("intel", shop!.offers.intel, {
      ...journey.support,
      shopIntel: 2,
      shopRations: 0,
      shopService: 0
    });
    const service = shopOfferOutcome("service", shop!.offers.service, {
      ...journey.support,
      shopIntel: 0,
      shopRations: 0,
      shopService: 2
    });

    expect(intel.objectiveBonus).toBeGreaterThan(shop!.offers.intel.objectiveBonus);
    expect(intel.supportText).toContain("Radio");
    expect(service.reward.materials).toBeGreaterThan(shop!.offers.service.reward.materials);
    expect(service.supportText).toContain("Workshop");
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

  test("combat tracks individual survivor stamina and marks downed fighters", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const session = createStarterSession("user-a", "Alice", "frontline-room");
    const squad = session.account.survivors.slice(0, 3);
    const striker = squad.reduce((best, survivor) => (survivor.attributes.agility > best.attributes.agility ? survivor : best), squad[0]);
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
      const strikerLine = journey.combat.frontline.find((line) => line.survivorId === striker.id);
      expect(strikerLine?.maxStamina).toBeGreaterThan(0);
      if (strikerLine) {
        strikerLine.stamina = 2;
      }
      journey.combat.squadHp = journey.combat.frontline.reduce((sum, line) => sum + line.stamina, 0);
      journey.combat.attack = 18;
      journey.combat.enemyHp = journey.combat.enemyMaxHp;
    }

    const resolved = resolveCombatRound(journey, "strike", squad, 60);
    const resolvedStriker = resolved.combat?.frontline.find((line) => line.survivorId === striker.id);

    expect(resolvedStriker?.status).toBe("down");
    expect(resolved.woundedSurvivorIds).toContain(striker.id);
    expect(resolved.battleScars).toBeGreaterThan(journey.battleScars);
    expect(resolved.logs.join("\n")).toContain(`${striker.name} is knocked down`);
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

  test("combat action previews show damage, costs, and wind-up counters", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const session = createStarterSession("user-a", "Alice", "preview-windup-room");
    const squad = session.account.survivors.slice(0, 3);
    const journey = createJourney(
      session,
      {
        loadout: { ammo: 1, food: 1, fuel: 0, materials: 0, medicine: 1, water: 1 },
        risk: "standard",
        squadIds: squad.map((survivor) => survivor.id)
      },
      "water-plant",
      60
    );
    journey.currentNodeIndex = 1;
    journey.combat = createCombatForNode(journey.nodes[1], squad, 60);
    if (journey.combat) {
      journey.combat.intent = "windup";
      journey.combat.intentLabel = "Wind-up";
      journey.combat.intentText = "A heavy hit is building. Guard can punish it.";
    }

    const strike = combatActionPreview(journey, "strike", squad, 60);
    const guard = combatActionPreview(journey, "guard", squad, 60);

    expect(strike?.effect).toContain("damage");
    expect(strike?.cost).toContain("Ammo -1");
    expect(guard?.counterTag).toBe("Counter");
    expect(guard?.effect).toContain("block");
    expect(guard?.risk).toContain("Wind-up");
  });

  test("combat action previews call out brace, prowl, and patch risk", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const session = createStarterSession("user-a", "Alice", "preview-prowl-room");
    const squad = session.account.survivors.slice(0, 3);
    const journey = createJourney(
      session,
      {
        loadout: { ammo: 0, food: 1, fuel: 0, materials: 0, medicine: 0, water: 1 },
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

    const tactic = combatActionPreview(journey, "tactic", squad, 60);
    if (journey.combat) {
      journey.combat.intent = "prowl";
      journey.combat.intentLabel = "Prowl";
      journey.combat.intentText = "It is looking for an opening. Strike or tactic can interrupt.";
    }
    const strike = combatActionPreview(journey, "strike", squad, 60);
    const patch = combatActionPreview(journey, "patch", squad, 60);

    expect(tactic?.counterTag).toBe("Counter");
    expect(tactic?.effect).toContain("Expose");
    expect(strike?.counterTag).toBe("Counter");
    expect(strike?.risk).toContain("interrupt");
    expect(patch?.counterTag).toBe("Risk");
    expect(patch?.risk).toContain("open");
  });

  test("combat action previews surface enemy special pulse counters", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const session = createStarterSession("user-a", "Alice", "preview-pulse-room");
    const squad = session.account.survivors.slice(0, 3);
    const journey = createJourney(
      session,
      {
        loadout: { ammo: 1, food: 1, fuel: 0, materials: 0, medicine: 1, water: 1 },
        risk: "standard",
        squadIds: squad.map((survivor) => survivor.id)
      },
      "hospital",
      60
    );
    journey.currentNodeIndex = 1;
    journey.pressure = 64;
    journey.combat = createCombatForNode(journey.nodes[1], squad, 60);
    if (journey.combat) {
      journey.combat.intent = "maul";
      journey.combat.intentLabel = "Maul";
      journey.combat.intentText = "A direct hit is coming.";
    }

    const tactic = combatActionPreview(journey, "tactic", squad, 60);
    const guard = combatActionPreview(journey, "guard", squad, 60);

    expect(journey.combat?.traitPulse.label).toBe("Pack pressure");
    expect(tactic?.counterTag).toBe("Counter");
    expect(tactic?.risk).toContain("Counters Pack pressure");
    expect(guard?.counterTag).toBe("Risk");
    expect(guard?.risk).toContain("Pack pressure");
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

  test("enemy special pulses log countered and uncountered monster pressure", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const session = createStarterSession("user-a", "Alice", "pulse-log-room");
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
      journey.combat.intent = "maul";
      journey.combat.intentLabel = "Maul";
      journey.combat.intentText = "A direct hit is coming.";
      journey.combat.exposed = 0;
      journey.combat.armor = 2;
    }

    const hardened = resolveCombatRound(journey, "strike", squad, 60);
    const countered = resolveCombatRound(journey, "tactic", squad, 60);

    expect(hardened.combat?.armor).toBe(3);
    expect(hardened.logs.join("\n")).toContain("Trait pulse: Plating lock");
    expect(countered.combat?.armor).toBe(2);
    expect(countered.logs.join("\n")).toContain("Trait counter: Plating lock");
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
