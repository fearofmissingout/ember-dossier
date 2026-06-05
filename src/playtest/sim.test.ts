import { describe, expect, test, vi } from "vitest";
import {
  clearPlaytestSession,
  createStarterAccount,
  createStarterRoom,
  createStarterSession,
  loadPlaytestSession,
  savePlaytestSession
} from "./state";
import { applyContribution, assignSurvivorToRoom, resolvePlaytestExpedition } from "./sim";

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
});
