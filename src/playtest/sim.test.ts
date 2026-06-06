import { describe, expect, test, vi } from "vitest";
import { facilityActionLabel, facilityUpgradePreview, isFacilityMaxed } from "../game/facilities";
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
  baseDayPreview,
  baseDevelopmentPlan,
  baseRecoveryPlan,
  resolvePlaytestExpedition,
  setBaseAssignment,
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
    expect(session.uiState.facilities.some((facility) => facility.id === "training" && facility.level === 0)).toBe(true);
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
    expect(next.room.feed[0]).toEqual(
      expect.objectContaining({
        kind: "member",
        title: "基地收到捐入物资"
      })
    );
    expect(next.room.feed[0]?.body).toContain("Alice");
    expect(next.room.feed[0]?.body).toContain("食物 +2");
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

  test("assigns survivors to base shifts and settles their production on day advance", () => {
    let session = createStarterSession("user-a", "Alice", "room-a");
    session.account.survivors[0].attributes.stamina = 9;
    session.account.survivors[0].attributes.luck = 9;
    session.account.survivors[1].attributes.technical = 10;
    session.account.survivors[2].attributes.willpower = 9;
    session.account.survivors[2].attributes.agility = 8;
    session.room.base.resources.food = 8;
    session.room.base.resources.water = 8;
    session.room.base.resources.materials = 3;
    session.room.base.danger = 20;

    session = setBaseAssignment(session, "user-a", session.account.survivors[0].id, "forage");
    session = setBaseAssignment(session, "user-a", session.account.survivors[1].id, "repair");
    session = setBaseAssignment(session, "user-a", session.account.survivors[2].id, "guard");

    expect(session.room.baseAssignments).toHaveLength(3);
    expect(session.room.feed[0]?.title).toBe("基地班次已更新");

    const next = advanceRoomDay(session, "user-a");

    expect(next.room.baseAssignments).toHaveLength(0);
    expect(next.room.base.resources.food).toBeGreaterThan(6);
    expect(next.room.base.objective.repairedParts).toBeGreaterThan(0);
    expect(next.room.base.danger).toBeLessThan(20);
    expect(next.room.feed[0]?.body).toContain("执行搜寻");
    expect(next.room.feed[0]?.body).toContain("修理通讯塔");
    expect(next.room.feed[0]?.body).toContain("执行守卫");
  });

  test("base instinct perk improves base shift output", () => {
    let session = createStarterSession("user-a", "Alice", "room-a");
    session.account.survivors[0].level = 3;
    session.account.survivors[0].attributes.technical = 10;
    session.room.base.resources.food = 8;
    session.room.base.resources.water = 8;

    session = setBaseAssignment(session, "user-a", session.account.survivors[0].id, "repair");
    const next = advanceRoomDay(session, "user-a");

    expect(next.room.base.objective.repairedParts).toBeGreaterThanOrEqual(3);
    expect(next.room.feed[0]?.body).toContain("修理通讯塔");
  });

  test("previews base recovery capacity from care shifts and facilities", () => {
    let session = createStarterSession("user-a", "Alice", "recovery-plan-room");
    session.account.survivors[0].injuries = ["cracked ribs"];
    session.account.survivors[0].fatigue = 72;
    session.account.survivors[1].attributes.medical = 10;
    const clinic = session.room.base.facilities.find((facility) => facility.id === "clinic");
    const dorm = session.room.base.facilities.find((facility) => facility.id === "dorm");
    if (!clinic || !dorm) {
      throw new Error("Missing recovery facilities");
    }
    clinic.level = 2;
    dorm.level = 1;

    session = setBaseAssignment(session, "user-a", session.account.survivors[1].id, "care");
    const plan = baseRecoveryPlan(session);

    expect(plan).toMatchObject({
      careShifts: 1,
      clinicLevel: 2,
      dailyRecovery: 13,
      injuredCount: 1,
      likelyInjuryClears: 1
    });
    expect(plan.priorityPatients[0]).toMatchObject({
      fatigue: 72,
      injuries: 1,
      name: session.account.survivors[0].name
    });
    expect(plan.summary).toContain("清除 1 个伤病");
  });

  test("previews base development priorities and material gates", () => {
    const session = createStarterSession("user-a", "Alice", "development-plan-room");
    session.room.base.resources.materials = 10;

    const plan = baseDevelopmentPlan(session);
    const workshop = plan.projects.find((project) => project.id === "workshop");
    const radio = plan.projects.find((project) => project.id === "radio");

    expect(plan.materials).toBe(10);
    expect(plan.affordableCount).toBeGreaterThan(0);
    expect(plan.recommended[0]).toMatchObject({
      action: "Build",
      canAfford: true,
      nextLevel: 1
    });
    expect(workshop).toMatchObject({
      action: "Build",
      canAfford: true,
      cost: 10,
      expeditionImpact: expect.stringContaining("拆解")
    });
    expect(radio).toMatchObject({
      canAfford: false,
      materialDeficit: 2
    });
    expect(plan.summary).toContain("当前材料 10");
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

  test("expedition level-up unlocks survivor perks and writes progression logs", () => {
    let session = createStarterSession("user-a", "Alice", "room-a");
    session.account.survivors[0].xp = 18;
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

    expect(result.session.account.survivors[0].level).toBe(2);
    expect(result.report.logs.join("\n")).toContain("解锁");
    expect(result.session.room.feed[0]?.body).toContain("升到 2 级");
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
    expect(result.report.logs.some((line) => line.includes("遭遇"))).toBe(true);
    expect(result.session.account.survivors[0].injuries).toContain("擦伤");
    expect(result.session.room.feed[0]?.body).toContain("遭遇");
  });

  test("expedition reports include journey node logs", () => {
    let session = createStarterSession("user-a", "Alice", "room-a");
    const squad = session.account.survivors.slice(0, 3).map((survivor) => survivor.id);

    for (const survivorId of squad) {
      session = assignSurvivorToRoom(session, "user-a", survivorId);
    }

    const result = resolvePlaytestExpedition(session, {
      journeyLogs: ["Broken Approach: careful search finds a safer path.", "Close Quarters: Relay Ghoul is driven off."],
      loadout: {
        ammo: 1,
        food: 1,
        fuel: 1,
        materials: 1,
        medicine: 1,
        water: 1
      },
      locationId: "water-plant",
      randomRolls: [0.32, 0.24, 0.18, 0.64, 0.31],
      risk: "standard",
      survivorIds: squad,
      userId: "user-a"
    });

    expect(result.report.logs.some((line) => line.includes("路线：Broken Approach"))).toBe(true);
    expect(result.session.room.feed[0]?.body).toContain("路线：Close Quarters");
  });

  test("route objective bonus contributes to room objective progress", () => {
    let session = createStarterSession("user-a", "Alice", "route-objective-room");
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
      randomRolls: [0.82, 0.82, 0.82, 0.82, 0.2],
      risk: "standard",
      routeObjectiveBonus: 1,
      survivorIds: squad,
      userId: "user-a"
    });

    expect(result.report.outcome).not.toBe("clean");
    expect(result.session.room.base.objective.repairedParts).toBeGreaterThanOrEqual(1);
  });

  test("early extraction banks safety but reduces site reward and objective progress", () => {
    let fullSession = createStarterSession("user-a", "Alice", "full-extraction-room");
    let earlySession = createStarterSession("user-a", "Alice", "early-extraction-room");
    const squad = fullSession.account.survivors.slice(0, 3).map((survivor) => survivor.id);

    for (const survivorId of squad) {
      fullSession = assignSurvivorToRoom(fullSession, "user-a", survivorId);
      earlySession = assignSurvivorToRoom(earlySession, "user-a", survivorId);
    }

    const request = {
      loadout: {
        ammo: 1,
        food: 1,
        fuel: 1,
        materials: 1,
        medicine: 1,
        water: 1
      },
      locationId: "water-plant",
      randomRolls: [0.02, 0.02, 0.02, 0.02, 0.02],
      risk: "standard" as const,
      survivorIds: squad,
      userId: "user-a"
    };

    const full = resolvePlaytestExpedition(fullSession, {
      ...request,
      extractionStatus: "complete"
    });
    const early = resolvePlaytestExpedition(earlySession, {
      ...request,
      extractionStatus: "early"
    });

    expect(full.report.reward.water).toBeGreaterThan(early.report.reward.water);
    expect(full.session.room.base.objective.repairedParts).toBeGreaterThan(early.session.room.base.objective.repairedParts);
    expect(early.report.logs.join("\n")).toContain("提前撤离");
    expect(early.session.room.feed[0]?.body).toContain("提前折返");
  });

  test("combat aftermath applies injuries, trophies, and report logs", () => {
    let session = createStarterSession("user-a", "Alice", "combat-aftermath-room");
    const squad = session.account.survivors.slice(0, 3).map((survivor) => survivor.id);

    for (const survivorId of squad) {
      session = assignSurvivorToRoom(session, "user-a", survivorId);
    }
    session.room.base.resources.materials = 3;

    const result = resolvePlaytestExpedition(session, {
      battleScars: 2,
      loadout: {
        ammo: 1,
        food: 1,
        fuel: 1,
        materials: 1,
        medicine: 1,
        water: 1
      },
      locationId: "water-plant",
      randomRolls: [0.32, 0.24, 0.18, 0.64, 0.31],
      risk: "standard",
      survivorIds: squad,
      trophies: ["armor plates", "pack lure"],
      userId: "user-a"
    });

    expect(result.session.account.survivors.some((survivor) => survivor.injuries.includes("肋骨裂伤"))).toBe(true);
    expect(result.session.account.survivors.some((survivor) => survivor.injuries.includes("肩部撕裂"))).toBe(true);
    expect(result.report.reward.materials).toBeGreaterThan(0);
    expect(result.report.logs.join("\n")).toContain("战斗战利");
  });

  test("combat scar targets are applied to named survivors first", () => {
    let session = createStarterSession("user-a", "Alice", "named-scar-room");
    const squad = session.account.survivors.slice(0, 3).map((survivor) => survivor.id);
    const markedSurvivorId = squad[1];

    for (const survivorId of squad) {
      session = assignSurvivorToRoom(session, "user-a", survivorId);
    }

    const result = resolvePlaytestExpedition(session, {
      battleScars: 1,
      combatScarSurvivorIds: [markedSurvivorId],
      loadout: {
        ammo: 1,
        food: 1,
        fuel: 1,
        materials: 1,
        medicine: 1,
        water: 1
      },
      locationId: "water-plant",
      randomRolls: [0.32, 0.24, 0.18, 0.64, 0.31],
      risk: "standard",
      survivorIds: squad,
      userId: "user-a"
    });

    const marked = result.session.account.survivors.find((survivor) => survivor.id === markedSurvivorId);

    expect(marked?.injuries.length).toBeGreaterThan(0);
    expect(result.report.logs.join("\n")).toContain(marked?.name);
  });

  test("journey fatigue carries into survivor settlement", () => {
    let session = createStarterSession("user-a", "Alice", "fatigue-room");
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
      randomRolls: [0.32, 0.24, 0.18, 0.64, 0.31],
      risk: "standard",
      survivorIds: squad,
      travelFatigue: 40,
      userId: "user-a"
    });

    expect(result.session.account.survivors[0].fatigue).toBeGreaterThan(session.account.survivors[0].fatigue + 6);
    expect(result.session.account.survivors[0].xp).toBeGreaterThan(8);
  });

  test("training room increases expedition xp gain", () => {
    let session = createStarterSession("user-a", "Alice", "training-room");
    const training = session.room.base.facilities.find((facility) => facility.id === "training");
    if (training) {
      training.level = 2;
    }
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
      randomRolls: [0.32, 0.24, 0.18, 0.64, 0.31],
      risk: "standard",
      survivorIds: squad,
      userId: "user-a"
    });

    expect(result.session.account.survivors[0].xp).toBe(12);
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
    expect(next.room.feed[0]?.title).toContain("治疗完成");
  });

  test("upgrades room facilities by spending materials", () => {
    const session = createStarterSession("user-a", "Alice", "room-a");
    const facility = session.room.base.facilities[0];
    session.room.base.resources.materials = 20;

    const next = upgradeFacility(session, "user-a", facility.id);

    expect(next.room.base.resources.materials).toBeLessThan(20);
    expect(next.room.base.facilities[0].level).toBe(facility.level + 1);
    expect(next.room.feed[0]?.title).toContain("设施升级完成");
  });

  test("builds facility blueprints from level zero", () => {
    const session = createStarterSession("user-a", "Alice", "room-a");
    const kitchen = session.room.base.facilities.find((facility) => facility.id === "kitchen");
    session.room.base.resources.materials = 10;

    const next = upgradeFacility(session, "user-a", "kitchen");
    const builtKitchen = next.room.base.facilities.find((facility) => facility.id === "kitchen");

    expect(kitchen?.level).toBe(0);
    expect(builtKitchen?.level).toBe(1);
    expect(next.room.base.resources.materials).toBe(4);
    expect(next.room.feed[0]?.title).toContain("设施建造完成");
  });

  test("caps facility growth at level three and previews the next benefit", () => {
    const session = createStarterSession("user-a", "Alice", "facility-cap-room");
    const clinic = session.room.base.facilities.find((facility) => facility.id === "clinic");
    session.room.base.resources.materials = 20;
    if (!clinic) {
      throw new Error("Missing clinic");
    }
    clinic.level = 3;
    clinic.status = "stable";

    expect(isFacilityMaxed(clinic)).toBe(true);
    expect(facilityActionLabel(clinic)).toBe("Maxed");
    expect(facilityUpgradePreview(clinic)[0]).toContain("已完全发展");
    expect(() => upgradeFacility(session, "user-a", "clinic")).toThrow("已经完全发展");
    expect(session.room.base.resources.materials).toBe(20);

    const kitchen = session.room.base.facilities.find((facility) => facility.id === "kitchen");
    if (!kitchen) {
      throw new Error("Missing kitchen");
    }
    expect(facilityUpgradePreview(kitchen)).toEqual([
      "建造到 Lv.1",
      "基地：每日食物消耗 -1，每日饮水消耗 -0。出征：营地餐食 +1，商店口粮 +1。"
    ]);
  });

  test("facility previews show numeric base and expedition growth", () => {
    const session = createStarterSession("user-a", "Alice", "facility-preview-room");
    const training = session.room.base.facilities.find((facility) => facility.id === "training");
    const radio = session.room.base.facilities.find((facility) => facility.id === "radio");
    if (!training || !radio) {
      throw new Error("Missing preview facilities");
    }
    radio.level = 1;

    expect(facilityUpgradePreview(training)).toEqual([
      "建造到 Lv.1",
      "基地：不改变每日消耗。出征：战斗耐力 +2，背包容量 +0。"
    ]);
    expect(facilityUpgradePreview(radio)).toEqual([
      "升级到 Lv.2",
      "基地：目标每日 +1，修理班次 +1。出征：压力缓解 +2，情报 +2，营地侦察 +2。"
    ]);
  });

  test("kitchen and barricade change daily upkeep and danger", () => {
    const session = createStarterSession("user-a", "Alice", "room-a");
    session.room.base.resources.food = 8;
    session.room.base.resources.water = 8;
    session.room.base.danger = 18;
    const kitchen = session.room.base.facilities.find((facility) => facility.id === "kitchen");
    const barricade = session.room.base.facilities.find((facility) => facility.id === "barricade");
    if (kitchen) {
      kitchen.level = 2;
    }
    if (barricade) {
      barricade.level = 2;
    }

    const next = advanceRoomDay(session, "user-a");

    expect(next.room.base.resources.food).toBe(7);
    expect(next.room.base.resources.water).toBe(7);
    expect(next.room.base.danger).toBeLessThan(18);
    expect(next.room.feed[0]?.body).toContain("厨房");
    expect(next.room.feed[0]?.body).toContain("路障线");
  });

  test("base day preview summarizes upkeep shifts recovery and objective pressure before ending the day", () => {
    let session = createStarterSession("user-a", "Alice", "day-preview-room");
    session.room.members.push({
      displayName: "Bob",
      joinedAt: "2026-06-06T00:00:00.000Z",
      lastSeenAt: "2026-06-06T00:00:00.000Z",
      role: "member",
      userId: "user-b"
    });
    session.room.base.resources.food = 2;
    session.room.base.resources.water = 6;
    session.room.base.danger = 22;
    session.room.base.objective.repairedParts = 2;
    const barricade = session.room.base.facilities.find((facility) => facility.id === "barricade");
    if (barricade) {
      barricade.level = 1;
    }
    session = setBaseAssignment(session, "user-a", session.account.survivors[0].id, "repair");
    session = setBaseAssignment(session, "user-a", session.account.survivors[1].id, "guard");

    const preview = baseDayPreview(session);

    expect(preview).toMatchObject({
      nextDay: 2,
      foodNeed: 4,
      foodAvailable: 2,
      foodShortage: 2,
      waterNeed: 4,
      waterAvailable: 6,
      waterShortage: 0,
      moraleDelta: -12,
      objectiveCurrent: 2,
      shiftCounts: { care: 0, forage: 0, guard: 1, repair: 1 }
    });
    expect(preview.dangerDelta).toBeLessThan(6);
    expect(preview.objectiveProjected).toBeGreaterThan(2);
    expect(preview.summary).toContain("明天进入第 2 天");
    expect(preview.summary).toContain("食物短缺 2");
    expect(preview.repairSummary).toContain("修理班 1");
    expect(preview.guardSummary).toContain("守卫班 1");
    expect(preview.recoverySummary).toContain("疲劳恢复");
  });

  test("base day events punish uncovered perimeter breaches", () => {
    const session = createStarterSession("user-a", "Alice", "event-breach-room");
    session.room.base.resources.food = 8;
    session.room.base.resources.water = 8;
    session.room.base.danger = 18;
    const watchtower = session.room.base.facilities.find((facility) => facility.id === "watchtower");
    if (watchtower) {
      watchtower.level = 0;
    }

    const next = advanceRoomDay(session, "user-a");

    expect(next.room.feed[0]?.title).toContain("围栏缺口");
    expect(next.room.feed[0]?.body).toContain("基地事件：围栏缺口");
    expect(next.room.base.danger).toBeGreaterThan(session.room.base.danger);
    expect(next.room.base.morale).toBeLessThan(session.room.base.morale + 2);
  });

  test("guard shifts and barricades turn perimeter events into relief", () => {
    let session = createStarterSession("user-a", "Alice", "event-guard-room");
    session.room.base.resources.food = 8;
    session.room.base.resources.water = 8;
    session.room.base.danger = 22;
    const barricade = session.room.base.facilities.find((facility) => facility.id === "barricade");
    if (barricade) {
      barricade.level = 2;
    }
    session = setBaseAssignment(session, "user-a", session.account.survivors[0].id, "guard");

    const next = advanceRoomDay(session, "user-a");

    expect(next.room.feed[0]?.title).toContain("围栏缺口");
    expect(next.room.feed[0]?.body).toContain("危险 -");
    expect(next.room.base.danger).toBeLessThan(22);
  });

  test("kitchen and forage coverage turn spoiled stores into extra rations", () => {
    let session = createStarterSession("user-a", "Alice", "event-stores-room");
    session.room.base.day = 2;
    session.room.base.resources.food = 6;
    session.room.base.resources.water = 6;
    const kitchen = session.room.base.facilities.find((facility) => facility.id === "kitchen");
    if (kitchen) {
      kitchen.level = 1;
    }
    session = setBaseAssignment(session, "user-a", session.account.survivors[0].id, "forage");

    const next = advanceRoomDay(session, "user-a");

    expect(next.room.feed[0]?.title).toContain("库存变质");
    expect(next.room.feed[0]?.body).toContain("食物 +");
    expect(next.room.base.resources.food).toBeGreaterThanOrEqual(6);
  });

  test("repair coverage converts signal windows into objective progress", () => {
    let session = createStarterSession("user-a", "Alice", "event-signal-room");
    session.room.base.day = 4;
    session.room.base.resources.food = 8;
    session.room.base.resources.water = 8;
    session.room.base.objective.repairedParts = 0;
    const radio = session.room.base.facilities.find((facility) => facility.id === "radio");
    if (radio) {
      radio.level = 1;
    }
    session = setBaseAssignment(session, "user-a", session.account.survivors[1].id, "repair");

    const next = advanceRoomDay(session, "user-a");

    expect(next.room.feed[0]?.title).toContain("信号窗口");
    expect(next.room.feed[0]?.body).toContain("基地事件：信号窗口");
    expect(next.room.base.objective.repairedParts).toBeGreaterThan(1);
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
    expect(next.room.feed[0]?.title).toContain("第 2 天");
    expect(next.uiState.resources.food).toBe(next.room.base.resources.food);
  });

  test("marks the room objective lost when the deadline passes unfinished", () => {
    const session = createStarterSession("user-a", "Alice", "room-a");
    session.room.base.day = session.room.base.objective.deadlineDay;
    session.room.base.objective.repairedParts = 0;

    const next = advanceRoomDay(session, "user-a");

    expect(next.room.base.objective.status).toBe("lost");
    expect(next.room.feed[0]?.title).toContain("目标失败");
  });
});
