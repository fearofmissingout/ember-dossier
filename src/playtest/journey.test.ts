import { afterEach, describe, expect, test, vi } from "vitest";
import { createJourney, createCombatForNode, spendFieldSupplyFromPriority } from "./journey";
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
    expect(resourceRoute.nodes[2].shop?.label).toBe("Buy repair kit");
    expect(weirdRoute.nodes[0].title).toBe("Listening Vines");
    expect(weirdRoute.nodes[1].enemy?.name).toBe("Borrowed Shadow");
    expect(weirdRoute.nodes[2].shop?.label).toBe("Pay masked vendor");
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
});
