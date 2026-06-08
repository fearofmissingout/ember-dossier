import { describe, expect, test, vi } from "vitest";
import { facilityActionLabel, facilityImpactPreview, facilityUpgradePreview, isFacilityMaxed } from "../game/facilities";
import {
  clearPlaytestSession,
  createStarterAccount,
  createStarterRoom,
  createStarterSession,
  loadPlaytestSession,
  savePlaytestSession
} from "./state";
import {
  accountBaseDevelopmentPlan,
  advanceRoomDay,
  applyContribution,
  assignSurvivorToRoom,
  baseDayEventBreadth,
  baseDayPreview,
  baseDevelopmentPlan,
  baseRecoveryPlan,
  baseTaskList,
  resolvePlaytestExpedition,
  roomCooperationSummary,
  roomContributionPlan,
  roomMemberSummaries,
  setBaseAssignment,
  treatSurvivor,
  upgradeAccountBase,
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

  test("summarizes each room member contribution assignments and base shifts", () => {
    let session = createStarterSession("user-a", "Alice", "member-summary-room");
    session = applyContribution(session, "user-a", {
      ammo: 0,
      food: 2,
      fuel: 0,
      materials: 0,
      medicine: 0,
      water: 1
    });
    session.room.members.push({
      displayName: "阿周",
      joinedAt: "2026-06-06T09:00:00.000Z",
      lastSeenAt: "2026-06-06T10:00:00.000Z",
      role: "member",
      userId: "user-b"
    });
    session.room.contributions.push({
      createdAt: "2026-06-06T10:05:00.000Z",
      id: "contribution-b",
      resources: { ammo: 0, food: 0, fuel: 0, materials: 4, medicine: 1, water: 0 },
      roomId: session.room.id,
      userId: "user-b"
    });
    session.room.assignedSurvivors.push({
      assignedAt: "2026-06-06T10:10:00.000Z",
      roomId: session.room.id,
      survivorId: "zhou-scout",
      userId: "user-b"
    });
    session.room.baseAssignments.push({
      roomId: session.room.id,
      survivorId: "zhou-guard",
      type: "guard",
      userId: "user-b"
    });

    const summaries = roomMemberSummaries(session);
    const alice = summaries.find((member) => member.userId === "user-a");
    const zhou = summaries.find((member) => member.userId === "user-b");

    expect(alice).toMatchObject({
      collaborationHint: expect.stringContaining("派 1 名幸存者"),
      collaborationStatus: "todo",
      contributionText: expect.stringContaining("食物 +2"),
      displayName: "Alice",
      roleLabel: "房主"
    });
    expect(zhou).toMatchObject({
      assignedCount: 1,
      baseShiftText: "守卫 1",
      collaborationHint: expect.stringContaining("都已覆盖"),
      collaborationStatus: "ready",
      contributionText: expect.stringContaining("材料 +4"),
      displayName: "阿周",
      roleLabel: "成员"
    });
    expect(zhou?.contributionText).toContain("药品 +1");

    const cooperation = roomCooperationSummary(session);
    expect(cooperation).toMatchObject({
      actionHint: expect.any(String),
      assignedSurvivors: 1,
      baseShifts: 1,
      contributionCount: 2,
      gaps: expect.arrayContaining([
        expect.objectContaining({
          id: expect.any(String),
          label: expect.any(String),
          status: expect.any(String),
          text: expect.any(String)
        })
      ]),
      memberCount: 2,
      nextNeed: expect.any(String)
    });
    expect(["blocked", "building", "ready"]).toContain(cooperation.readiness);
  });

  test("member cooperation hints point inactive room members to the next useful action", () => {
    const session = createStarterSession("user-a", "Alice", "member-hint-room");
    session.room.members.push({
      displayName: "阿白",
      joinedAt: "2026-06-06T09:00:00.000Z",
      lastSeenAt: "2026-06-06T10:00:00.000Z",
      role: "member",
      userId: "user-b"
    });

    const summaries = roomMemberSummaries(session);
    const inactive = summaries.find((member) => member.userId === "user-b");

    expect(inactive).toMatchObject({
      collaborationHint: expect.stringContaining("先捐入"),
      collaborationStatus: "urgent"
    });
  });

  test("room cooperation summary points players at urgent shared gaps", () => {
    const session = createStarterSession("user-a", "Alice", "cooperation-gap-room");
    session.room.base.resources.food = 0;
    session.room.base.resources.water = 0;
    session.room.baseAssignments = [];

    const cooperation = roomCooperationSummary(session);

    expect(cooperation.readiness).toBe("blocked");
    expect(cooperation.actionHint).toContain("捐入口粮和饮水");
    expect(cooperation.gaps[0]).toMatchObject({
      id: "supplies",
      status: "urgent"
    });
    expect(cooperation.gaps.map((gap) => gap.id)).toContain("shifts");
  });

  test("room contribution plan turns shared gaps into resource priorities", () => {
    const session = createStarterSession("user-a", "Alice", "contribution-plan-room");
    session.room.base.resources.food = 0;
    session.room.base.resources.water = 0;
    session.room.base.resources.medicine = 0;
    session.account.survivors[0].injuries = ["裂伤"];

    const plan = roomContributionPlan(session);

    expect(plan.summary).toContain("捐入优先级");
    expect(plan.items.map((item) => item.key)).toEqual(["food", "water", "medicine"]);
    expect(plan.items.every((item) => item.priority === "urgent")).toBe(true);
    expect(plan.items[0].detail).toContain("明日预计缺食物");
    expect(plan.items[2].detail).toContain("优先伤员");
  });

  test("upgrades account base rooms with account resources and readable planning", () => {
    const session = createStarterSession("user-a", "Alice", "account-base-room");
    session.account.resources.materials = 20;
    session.account.resources.rareParts = 2;

    const plan = accountBaseDevelopmentPlan(session.account);
    const trainingProject = plan.projects.find((project) => project.id === "training");

    expect(plan.summary).toContain("4 项可发展");
    expect(trainingProject).toMatchObject({
      canAfford: true,
      currentLevel: 1,
      nextLevel: 2
    });

    const next = upgradeAccountBase(session, "user-a", "training");

    expect(next.account.base.trainingRoomLevel).toBe(2);
    expect(next.account.resources.materials).toBe(12);
    expect(next.account.resources.rareParts).toBe(2);
    expect(next.room.feed[0]?.title).toContain("个人基地升级");
    expect(next.room.feed[0]?.body).toContain("训练室升级到 Lv.2");
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
      immediateTreatments: 1,
      injuredCount: 1,
      likelyInjuryClears: 1,
      medicineShortage: 0
    });
    expect(plan.priorityPatients[0]).toMatchObject({
      fatigue: 72,
      injuries: 1,
      name: session.account.survivors[0].name
    });
    expect(plan.summary).toContain("清除 1 个伤病");
    expect(plan.nextAction).toContain(session.account.survivors[0].name);
    expect(plan.nextAction).toContain("手动治疗");
  });

  test("base recovery plan warns when medicine cannot cover injured survivors", () => {
    const session = createStarterSession("user-a", "Alice", "recovery-shortage-room");
    session.room.base.resources.medicine = 0;
    session.account.survivors[0].injuries = ["裂伤"];
    session.account.survivors[0].fatigue = 70;
    session.account.survivors[1].injuries = ["感染"];
    session.account.survivors[1].fatigue = 52;

    const plan = baseRecoveryPlan(session);

    expect(plan).toMatchObject({
      immediateTreatments: 0,
      injuredCount: 2,
      medicineAvailable: 0,
      medicineShortage: 2
    });
    expect(plan.nextAction).toContain("药品不足 2");
  });

  test("care shifts clear patient injuries during day advance and explain the recovery", () => {
    let session = createStarterSession("user-a", "Alice", "care-recovery-room");
    const patient = session.account.survivors[0];
    const medic = session.account.survivors[1];
    patient.injuries = ["裂伤"];
    patient.fatigue = 66;
    patient.status = "recovering";
    medic.attributes.medical = 10;
    session.room.base.resources.food = 8;
    session.room.base.resources.water = 8;

    session = setBaseAssignment(session, "user-a", medic.id, "care");
    const next = advanceRoomDay(session, "user-a");
    const recoveredPatient = next.account.survivors.find((survivor) => survivor.id === patient.id);

    expect(recoveredPatient?.injuries).toEqual([]);
    expect(recoveredPatient?.status).toBe("available");
    expect(recoveredPatient?.fatigue).toBeLessThan(66);
    expect(next.room.feed[0]?.body).toContain("护理");
    expect(next.room.feed[0]?.body).toContain("裂伤");
    expect(next.room.feed[0]?.body).toContain("清除 1 个伤病");
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
      expeditionImpact: expect.stringContaining("拆解"),
      reason: expect.stringContaining("工坊"),
      nextStep: expect.stringContaining("建议本轮建造")
    });
    expect(radio).toMatchObject({
      canAfford: false,
      materialDeficit: 2,
      nextStep: expect.stringContaining("还缺 2 材料")
    });
    expect(plan.summary).toContain("当前材料 10");
  });

  test("base development reasons react to injury and objective pressure", () => {
    const session = createStarterSession("user-a", "Alice", "development-reason-room");
    session.room.base.resources.materials = 20;
    session.account.survivors[0].injuries = ["裂伤"];
    session.room.base.objective.repairedParts = 0;
    session.room.base.objective.requiredParts = 6;

    const plan = baseDevelopmentPlan(session);
    const clinic = plan.projects.find((project) => project.id === "clinic");
    const radio = plan.projects.find((project) => project.id === "radio");

    expect(clinic?.reason).toContain("1 名伤员");
    expect(radio?.reason).toContain("房间目标还没完成");
    expect(clinic?.nextStep).toContain("建议本轮");
  });

  test("summarizes urgent base tasks for supplies recovery shifts and upgrades", () => {
    const session = createStarterSession("user-a", "Alice", "base-task-room");
    session.room.base.resources.food = 1;
    session.room.base.resources.water = 1;
    session.room.base.resources.materials = 12;
    session.account.survivors[0].injuries = ["裂伤"];
    session.account.survivors[0].status = "recovering";

    const tasks = baseTaskList(session);

    expect(tasks.summary).toBe("今日待办：补给、恢复、班次、建设。");
    expect(tasks.items.map((item) => item.id)).toEqual(["supplies", "recovery", "shifts", "development"]);
    expect(tasks.items[0]).toMatchObject({
      actionLabel: "捐入资源",
      status: "urgent",
      title: "补足明日口粮"
    });
    expect(tasks.items[1].body).toContain("1 名伤员");
    expect(tasks.items[2].body).toContain("安排搜寻、修理、守卫或护理班");
    expect(tasks.items[3].body).toContain("可推进");
  });

  test("summarizes a stable base as ready for expedition", () => {
    const session = createStarterSession("user-a", "Alice", "base-ready-room");
    session.room.base.resources.food = 12;
    session.room.base.resources.water = 12;
    session.room.base.resources.materials = 0;
    session.room.baseAssignments.push({
      roomId: session.room.id,
      survivorId: session.account.survivors[0].id,
      type: "guard",
      userId: session.account.profile.userId
    });

    const tasks = baseTaskList(session);

    expect(tasks.summary).toBe("基地状态可控，可以准备下一次远征。");
    expect(tasks.items).toEqual([
      expect.objectContaining({
        actionLabel: "准备远征",
        id: "expedition",
        status: "ready",
        title: "准备下一次远征"
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
    expect(result.report.logs[0]).toContain("成长：");
    expect(result.report.logs[0]).toContain("+8 经验");
    expect(result.report.logs[0]).toContain("升到 Lv.2");
    expect(result.report.logs[0]).toContain("解锁");
    expect(result.session.room.feed[0]?.body.split("\n")[1]).toContain("成长：");
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

  test("expedition feed keeps route decision summaries when process logs are long", () => {
    let session = createStarterSession("user-a", "Alice", "route-decision-feed-room");
    const squad = session.account.survivors.slice(0, 3).map((survivor) => survivor.id);

    for (const survivorId of squad) {
      session = assignSurvivorToRoom(session, "user-a", survivorId);
    }

    const result = resolvePlaytestExpedition(session, {
      extractionStatus: "early",
      journeyLogs: [
        "路线开启：北区水处理厂，3 名幸存者出发。",
        "携带物资已转为随身补给。",
        "背包负重：5/15，轻装。",
        "闸门绕行：队伍标出更安全的回撤线。",
        "行军记录：队伍穿过积水走廊。",
        "路口：冷沟。水声盖住脚步。",
        "路上事件：冷沟。队伍搜索边缘。",
        "战斗回合：队伍压住敌人。",
        "营地：前出侦察。",
        "路线决策：闸门绕行选择测绘闸门（水 -1 / 水 +1 / 材料 +1 / 压力 -11%）。"
      ],
      loadout: { ammo: 1, food: 1, fuel: 1, materials: 0, medicine: 1, water: 1 },
      locationId: "water-plant",
      randomRolls: [0.2, 0.3, 0.4, 0.5, 0.6],
      risk: "standard",
      survivorIds: squad,
      userId: "user-a"
    });

    expect(result.report.logs.join("\n")).toContain("路线决策");
    expect(result.session.room.feed[0]?.body).toContain("路线决策");
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

    const emergency = resolvePlaytestExpedition(earlySession, {
      ...request,
      extractionStatus: "early",
      journeyLogs: [
        "路线开启：北区水处理厂，3 名幸存者出发。",
        "携带物资已转为随身补给。",
        "背包负重：5/15，轻装。",
        "闸门绕行：队伍测绘闸门。",
        "路段威胁：氯雾。",
        "道路：路段 1，疲劳 +9，压力 +15%。",
        "路口：淹水下穿道。",
        "道路受阻：压力 +6%。",
        "路线：额外噪音引来伏击。",
        "战斗：队伍顶着压力撤退。",
        "紧急返程：队伍放弃当前阻碍，保住已入袋战利和路线线索。"
      ]
    });

    expect(emergency.session.room.feed[0]?.body).toContain("紧急返程");
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
    expect(result.report.logs.join("\n")).toContain("恢复预案");
    expect(result.report.logs.join("\n")).toContain("药品");
    expect(result.session.room.feed[0]?.body).toContain("恢复预案");
  });

  test("complete expeditions settle account spoils for personal base growth", () => {
    let session = createStarterSession("user-a", "Alice", "account-spoils-room");
    session.account.resources.materials = 2;
    const squad = session.account.survivors.slice(0, 3).map((survivor) => survivor.id);

    for (const survivorId of squad) {
      session = assignSurvivorToRoom(session, "user-a", survivorId);
    }

    const result = resolvePlaytestExpedition(session, {
      extractionStatus: "complete",
      journeyLogs: ["路边交易点：购买路线情报。目标 +1，压力 -5%。"],
      loadout: {
        ammo: 1,
        food: 1,
        fuel: 1,
        materials: 1,
        medicine: 1,
        water: 1
      },
      locationId: "water-plant",
      randomRolls: [0.12, 0.18, 0.22, 0.64, 0.31],
      risk: "standard",
      routeObjectiveBonus: 1,
      survivorIds: squad,
      trophies: ["装甲碎片"],
      userId: "user-a"
    });

    expect(result.session.account.resources.materials).toBeGreaterThan(2);
    expect(result.session.account.resources.rareParts).toBe(1);
    expect(result.session.account.resources.intel).toBe(2);
    expect(result.report.logs.join("\n")).toContain("账号战利");
    expect(result.session.room.feed[0]?.body).toContain("账号战利");
  });

  test("expedition settlement includes a return ledger for base account objective and injuries", () => {
    let session = createStarterSession("user-a", "Alice", "return-ledger-room");
    session.account.resources.materials = 2;
    const squad = session.account.survivors.slice(0, 3).map((survivor) => survivor.id);

    for (const survivorId of squad) {
      session = assignSurvivorToRoom(session, "user-a", survivorId);
    }

    const result = resolvePlaytestExpedition(session, {
      battleScars: 1,
      combatScarSurvivorIds: [squad[1]],
      extractionStatus: "complete",
      journeyLogs: ["路边交易点：购买路线情报。目标 +1，压力 -5%。"],
      loadout: {
        ammo: 1,
        food: 1,
        fuel: 1,
        materials: 1,
        medicine: 1,
        water: 1
      },
      locationId: "water-plant",
      randomRolls: [0.12, 0.18, 0.22, 0.64, 0.31],
      risk: "standard",
      routeObjectiveBonus: 1,
      survivorIds: squad,
      trophies: ["装甲碎片"],
      userId: "user-a"
    });
    const reportText = result.report.logs.join("\n");
    const feedText = result.session.room.feed[0]?.body ?? "";

    expect(reportText).toContain("归队清单");
    expect(reportText).toContain("基地入库");
    expect(reportText).toContain("目标推进");
    expect(reportText).toContain("账号回收");
    expect(reportText).toContain("伤病");
    expect(reportText).toContain("完整撤离");
    expect(feedText).toContain("归队清单");
    expect(feedText).toContain("基地入库");
    expect(feedText).toContain("账号回收");
  });

  test("early extraction preserves a small account cache without full rare spoils", () => {
    let session = createStarterSession("user-a", "Alice", "early-account-cache-room");
    session.account.resources.materials = 2;
    session.account.resources.intel = 0;
    session.account.resources.rareParts = 0;
    const squad = session.account.survivors.slice(0, 3).map((survivor) => survivor.id);

    for (const survivorId of squad) {
      session = assignSurvivorToRoom(session, "user-a", survivorId);
    }

    const result = resolvePlaytestExpedition(session, {
      extractionStatus: "early",
      journeyLogs: ["测绘闸门：队伍标记回撤线。", "紧急返程：队伍放弃当前阻碍，保住已入袋战利和路线线索。"],
      loadout: {
        ammo: 1,
        food: 1,
        fuel: 1,
        materials: 1,
        medicine: 1,
        water: 1
      },
      locationId: "water-plant",
      randomRolls: [0.04, 0.08, 0.12, 0.2, 0.3],
      risk: "standard",
      routeObjectiveBonus: 1,
      survivorIds: squad,
      trophies: ["装甲碎片"],
      userId: "user-a"
    });

    expect(result.session.account.resources.materials).toBeGreaterThan(2);
    expect(result.session.account.resources.intel).toBe(1);
    expect(result.session.account.resources.rareParts).toBe(0);
    expect(result.report.logs.join("\n")).toContain("返程回收");
    expect(result.session.room.feed[0]?.body).toContain("返程回收");
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

  test("personal training room also improves expedition xp without changing the shared room", () => {
    let session = createStarterSession("user-a", "Alice", "personal-training-room");
    session.account.base.trainingRoomLevel = 2;
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

    expect(result.session.account.survivors[0].xp).toBe(10);
    expect(result.session.room.base.facilities.find((facility) => facility.id === "training")?.level).toBe(0);
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

  test("personal medical room improves treatment recovery after the first level", () => {
    const session = createStarterSession("user-a", "Alice", "medical-base-room");
    const survivorId = session.account.survivors[0].id;
    session.account.base.medicalRoomLevel = 3;
    session.account.survivors[0].injuries = ["深度割伤"];
    session.account.survivors[0].fatigue = 70;
    session.room.base.resources.medicine = 4;

    const next = treatSurvivor(session, "user-a", survivorId);

    expect(next.account.survivors[0].fatigue).toBe(44);
    expect(next.room.feed[0]?.body).toContain("个人医务室 Lv.3");
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

  test("facility impact preview separates base and expedition value", () => {
    const session = createStarterSession("user-a", "Alice", "facility-impact-room");
    const training = session.room.base.facilities.find((facility) => facility.id === "training");
    if (!training) {
      throw new Error("Missing training facility");
    }

    expect(facilityImpactPreview(training)).toEqual({
      action: "建造到 Lv.1",
      baseText: "不改变每日消耗。",
      expeditionText: "战斗耐力 +2，背包容量 +0。"
    });
  });

  test("base development plan explains where upgrades plug into expeditions", () => {
    const session = createStarterSession("user-a", "Alice", "facility-stage-room");
    session.room.base.resources.materials = 30;

    const plan = baseDevelopmentPlan(session);
    const training = plan.projects.find((project) => project.id === "training");
    const radio = plan.projects.find((project) => project.id === "radio");
    const kitchen = plan.projects.find((project) => project.id === "kitchen");

    expect(training).toMatchObject({ expeditionStage: "出门准备" });
    expect(radio).toMatchObject({ expeditionStage: "路上控制" });
    expect(kitchen).toMatchObject({ expeditionStage: "营地交易" });
    expect(plan.recommended.every((project) => project.expeditionStage.length > 0)).toBe(true);
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

  test("keeps base day events stocked with enough variety", () => {
    expect(baseDayEventBreadth()).toMatchObject({
      count: 6,
      titles: expect.arrayContaining(["围栏缺口", "库存变质", "医务高峰", "信号窗口", "净水滤芯堵塞", "夜间求救信号"])
    });
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

  test("medical surge events name the injury they clear", () => {
    const session = createStarterSession("user-a", "Alice", "event-medical-room");
    const patient = session.account.survivors[0];
    patient.injuries = ["裂伤"];
    patient.fatigue = 70;
    patient.status = "recovering";
    session.room.base.day = 3;
    session.room.base.resources.food = 8;
    session.room.base.resources.water = 8;
    const clinic = session.room.base.facilities.find((facility) => facility.id === "clinic");
    if (clinic) {
      clinic.level = 2;
    }

    const next = advanceRoomDay(session, "user-a");
    const recoveredPatient = next.account.survivors.find((survivor) => survivor.id === patient.id);

    expect(next.room.feed[0]?.title).toContain("医务高峰");
    expect(next.room.feed[0]?.body).toContain("基地事件：医务高峰");
    expect(next.room.feed[0]?.body).toContain("处理裂伤");
    expect(next.room.feed[0]?.body).toContain("清除 1 个伤病");
    expect(recoveredPatient?.injuries).toEqual([]);
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

  test("repair and forage coverage turn clogged filters into water and materials", () => {
    let session = createStarterSession("user-a", "Alice", "event-filter-room");
    session.room.base.day = 5;
    session.room.base.resources.food = 8;
    session.room.base.resources.water = 4;
    session.room.base.resources.materials = 2;
    const generator = session.room.base.facilities.find((facility) => facility.id === "generator");
    if (generator) {
      generator.level = 1;
    }
    session = setBaseAssignment(session, "user-a", session.account.survivors[0].id, "repair");
    session = setBaseAssignment(session, "user-a", session.account.survivors[1].id, "forage");

    const next = advanceRoomDay(session, "user-a");

    expect(next.room.feed[0]?.title).toContain("净水滤芯堵塞");
    expect(next.room.feed[0]?.body).toContain("水 +");
    expect(next.room.feed[0]?.body).toContain("材料 +1");
    expect(next.room.base.resources.water).toBeGreaterThanOrEqual(4);
    expect(next.room.base.resources.materials).toBeGreaterThanOrEqual(2);
  });

  test("unguarded night distress signals add danger and hurt morale", () => {
    const session = createStarterSession("user-a", "Alice", "event-distress-room");
    session.room.base.day = 6;
    session.room.base.resources.food = 8;
    session.room.base.resources.water = 8;
    session.room.base.danger = 16;
    session.room.base.morale = 62;
    session.room.base.objective.deadlineDay = 12;
    const radio = session.room.base.facilities.find((facility) => facility.id === "radio");
    if (radio) {
      radio.level = 0;
    }

    const next = advanceRoomDay(session, "user-a");

    expect(next.room.feed[0]?.title).toContain("夜间求救信号");
    expect(next.room.feed[0]?.body).toContain("危险 +5");
    expect(next.room.base.danger).toBeGreaterThan(session.room.base.danger);
    expect(next.room.feed[0]?.body).toContain("士气 -2");
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
