import { describe, expect, test, vi } from "vitest";
import {
  clearPlaytestSession,
  createStarterAccount,
  createStarterRoom,
  createStarterSession,
  loadPlaytestSession,
  savePlaytestSession
} from "./state";
import {
  advanceRoomDay,
  applyContribution,
  assignSurvivorToRoom,
  resolvePlaytestExpedition,
  treatSurvivor,
  upgradeFacility
} from "./sim";

describe("playtest state constructors", () => {
  test("creates account-bound assets separately from a room-bound base", () => {
    const account = createStarterAccount("user-a", "Alice");
    const room = createStarterRoom("room-a", "Tower Run");

    expect(account.profile.userId).toBe("user-a");
    expect(account.resources.food).toBe(20);
    expect(account.survivors).toHaveLength(6);
    expect(room.slug).toBe("room-a");
    expect(room.base.resources.food).toBe(12);
    expect(room.members).toEqual([]);
    expect(room.base.day).toBe(1);
  });

  test("creates a session that can be rendered through the current game shell", () => {
    const session = createStarterSession("user-a", "Alice", "room-a");

    expect(session.account.profile.displayName).toBe("Alice");
    expect(session.room.members[0]?.userId).toBe("user-a");
    expect(session.uiState.resources.food).toBe(session.room.base.resources.food);
    expect(session.uiState.survivors.length).toBe(session.account.survivors.length);
    expect(session.uiState.feed[0]?.kind).toBe("system");
  });

  test("persists and reloads a local playtest session for the same account and room", () => {
    const store = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => store.get(key) ?? null,
      removeItem: (key: string) => store.delete(key),
      setItem: (key: string, value: string) => store.set(key, value)
    });

    const session = createStarterSession("user-a", "Alice", "room-a");
    session.account.resources.food = 7;
    session.room.base.objective.repairedParts = 3;

    savePlaytestSession(session);

    const loaded = loadPlaytestSession("user-a", "Alice", "room-a");

    expect(loaded.account.resources.food).toBe(7);
    expect(loaded.room.base.objective.repairedParts).toBe(3);
    expect(loaded.uiState.resources.food).toBe(loaded.room.base.resources.food);

    clearPlaytestSession();
    expect(loadPlaytestSession("user-a", "Alice", "room-a").account.resources.food).toBe(20);
  });
});

describe("playtest room loop", () => {
  test("moves resources from account inventory into the room base", () => {
    const session = createStarterSession("user-a", "Alice", "room-a");

    const next = applyContribution(session, "user-a", {
      ammo: 1,
      food: 2,
      fuel: 0,
      materials: 3,
      medicine: 0,
      water: 2
    });

    expect(next.account.resources.food).toBe(18);
    expect(next.room.base.resources.food).toBe(14);
    expect(next.account.resources.materials).toBe(15);
    expect(next.room.base.resources.materials).toBe(13);
    expect(next.room.contributions).toHaveLength(1);
  });

  test("assigns an account survivor to the room without transferring ownership", () => {
    const session = createStarterSession("user-a", "Alice", "room-a");
    const survivorId = session.account.survivors[0].id;

    const next = assignSurvivorToRoom(session, "user-a", survivorId);

    expect(next.account.survivors[0].ownerUserId).toBe("user-a");
    expect(next.account.survivors[0].status).toBe("assigned");
    expect(next.room.assignedSurvivors).toEqual([
      expect.objectContaining({
        survivorId,
        userId: "user-a"
      })
    ]);
  });

  test("settles expedition into room resources, account xp, fatigue, objective progress, and feed", () => {
    let session = createStarterSession("user-a", "Alice", "room-a");
    const squad = session.account.survivors.slice(0, 3).map((survivor) => survivor.id);

    for (const survivorId of squad) {
      session = assignSurvivorToRoom(session, "user-a", survivorId);
    }

    const result = resolvePlaytestExpedition(session, {
      loadout: {
        ammo: 1,
        food: 1,
        fuel: 1,
        materials: 0,
        medicine: 1,
        water: 1
      },
      locationId: "water-plant",
      randomRolls: [0.12, 0.18, 0.21],
      risk: "cautious",
      survivorIds: squad,
      userId: "user-a"
    });

    expect(result.report.outcome).toBe("clean");
    expect(result.session.room.base.resources.water).toBeGreaterThan(session.room.base.resources.water);
    expect(result.session.account.survivors[0].xp).toBeGreaterThan(0);
    expect(result.session.account.survivors[0].fatigue).toBeGreaterThan(session.account.survivors[0].fatigue);
    expect(result.session.room.base.objective.repairedParts).toBeGreaterThanOrEqual(1);
    expect(result.session.room.feed[0]?.kind).toBe("report");
  });

  test("expedition reports include process beats and random encounters", () => {
    let session = createStarterSession("user-a", "Alice", "room-a");
    const squad = session.account.survivors.slice(0, 3).map((survivor) => survivor.id);

    for (const survivorId of squad) {
      session = assignSurvivorToRoom(session, "user-a", survivorId);
    }

    const result = resolvePlaytestExpedition(session, {
      loadout: {
        ammo: 1,
        food: 1,
        fuel: 1,
        materials: 1,
        medicine: 1,
        water: 1
      },
      locationId: "water-plant",
      randomRolls: [0.92, 0.12, 0.54, 0.12, 0.77],
      risk: "standard",
      survivorIds: squad,
      userId: "user-a"
    });

    expect(result.report.logs.length).toBeGreaterThanOrEqual(5);
    expect(result.report.logs.some((line) => line.includes("Encounter"))).toBe(true);
    expect(result.session.account.survivors[0].injuries).toContain("擦伤");
    expect(result.session.room.feed[0]?.body).toContain("Encounter");
  });

  test("treats injured survivors by spending medicine", () => {
    const session = createStarterSession("user-a", "Alice", "room-a");
    const survivorId = session.account.survivors[0].id;
    session.account.survivors[0].injuries = ["深度割伤"];
    session.account.survivors[0].fatigue = 44;
    session.room.base.resources.medicine = 4;

    const next = treatSurvivor(session, "user-a", survivorId);

    expect(next.room.base.resources.medicine).toBe(3);
    expect(next.account.survivors[0].injuries).toEqual([]);
    expect(next.account.survivors[0].fatigue).toBeLessThan(44);
    expect(next.room.feed[0]?.title).toContain("Treatment");
  });

  test("upgrades room facilities by spending materials", () => {
    const session = createStarterSession("user-a", "Alice", "room-a");
    const facility = session.room.base.facilities[0];
    session.room.base.resources.materials = 20;

    const next = upgradeFacility(session, "user-a", facility.id);

    expect(next.room.base.resources.materials).toBeLessThan(20);
    expect(next.room.base.facilities[0].level).toBe(facility.level + 1);
    expect(next.room.feed[0]?.title).toContain("Facility upgraded");
  });

  test("advances a room day with upkeep, recovery, pressure, and feed", () => {
    const session = createStarterSession("user-a", "Alice", "room-a");
    session.account.survivors[0].fatigue = 52;
    session.room.base.resources.food = 8;
    session.room.base.resources.water = 8;
    session.room.base.danger = 18;

    const next = advanceRoomDay(session, "user-a");

    expect(next.room.base.day).toBe(2);
    expect(next.room.base.resources.food).toBeLessThan(8);
    expect(next.room.base.resources.water).toBeLessThan(8);
    expect(next.account.survivors[0].fatigue).toBeLessThan(52);
    expect(next.room.feed[0]?.title).toContain("Day 2");
    expect(next.uiState.resources.food).toBe(next.room.base.resources.food);
  });

  test("marks the room objective lost when the deadline passes unfinished", () => {
    const session = createStarterSession("user-a", "Alice", "room-a");
    session.room.base.day = session.room.base.objective.deadlineDay;
    session.room.base.objective.repairedParts = 0;

    const next = advanceRoomDay(session, "user-a");

    expect(next.room.base.objective.status).toBe("lost");
    expect(next.room.feed[0]?.title).toContain("Objective failed");
  });
});
