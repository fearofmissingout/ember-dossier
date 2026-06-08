import { describe, expect, test } from "vitest";
import { completeFacilities } from "../game/facilities";
import { starterRoomFacilities } from "./content";
import type { AccountSurvivor } from "./types";
import {
  accountBaseSupportBriefing,
  advanceSurvivorExperience,
  basePrepSupportFromAssignments,
  expeditionDoctrineForFacility,
  expeditionDoctrineOptions,
  expeditionSupportPlan,
  isSurvivorAtLevelCap,
  mergeExpeditionSupport,
  survivorLevelCap,
  survivorMaxXp,
  survivorPerkDetails,
  supportFromAccountBase,
  supportFromFacilities,
  xpForNextLevel
} from "./progression";
import { createStarterSession } from "./state";

describe("expedition doctrines", () => {
  test("built base facilities unlock selectable expedition doctrines", () => {
    const facilities = completeFacilities(starterRoomFacilities());
    const doctrines = expeditionDoctrineOptions(facilities);

    expect(doctrines.map((doctrine) => doctrine.id)).toEqual([
      "hold-formation",
      "field-triage",
      "hot-magazines",
      "overwatch-route"
    ]);
    expect(doctrines[0]).toMatchObject({
      effect: "生命上限 +6 / 防守 +1 / 开局防护 +2",
      facilityId: "dorm",
      label: "收紧队形"
    });
  });

  test("facilities can explain their expedition doctrine unlocks", () => {
    expect(expeditionDoctrineForFacility("clinic")).toMatchObject({
      effect: "药品 +1 / 包扎 +3",
      id: "field-triage",
      label: "前线分诊"
    });
    expect(expeditionDoctrineForFacility("kitchen")).toMatchObject({
      id: "road-rations",
      label: "路上口粮"
    });
    expect(expeditionDoctrineForFacility("unknown")).toBeNull();
  });

  test("selected expedition doctrine changes combat support without changing passive facility support", () => {
    const facilities = completeFacilities(starterRoomFacilities());
    const passive = supportFromFacilities(facilities);
    const formation = supportFromFacilities(facilities, "hold-formation");
    const magazines = supportFromFacilities(facilities, "hot-magazines");

    expect(formation.maxHp).toBe(passive.maxHp + 6);
    expect(formation.guardBlock).toBe(passive.guardBlock + 1);
    expect(formation.openingGuard).toBe(passive.openingGuard + 2);
    expect(magazines.ammoDamage).toBe(passive.ammoDamage + 2);
    expect(magazines.openingExpose).toBe(passive.openingExpose + 2);
    expect(magazines.startingSupplies.ammo).toBe((passive.startingSupplies.ammo ?? 0) + 1);
    expect(passive.startingSupplies.ammo).toBe(0);
  });

  test("route doctrines convert base facilities into road tactics", () => {
    const facilities = completeFacilities(starterRoomFacilities());
    const passive = supportFromFacilities(facilities);
    const overwatch = supportFromFacilities(facilities, "overwatch-route");

    expect(overwatch.roadSearch).toBe(passive.roadSearch + 2);
    expect(overwatch.roadPush).toBe(passive.roadPush + 1);
  });

  test("base prep shifts add temporary expedition support for non-squad survivors", () => {
    const session = createStarterSession("user-a", "Alice", "prep-room");
    const [forager, medic, mechanic, guard, squadMember] = session.account.survivors;
    session.room.baseAssignments = [
      { roomId: session.room.id, survivorId: forager.id, type: "forage", userId: "user-a" },
      { roomId: session.room.id, survivorId: medic.id, type: "care", userId: "user-a" },
      { roomId: session.room.id, survivorId: mechanic.id, type: "repair", userId: "user-a" },
      { roomId: session.room.id, survivorId: guard.id, type: "guard", userId: "user-a" },
      { roomId: session.room.id, survivorId: squadMember.id, type: "forage", userId: "user-a" }
    ];

    const prep = basePrepSupportFromAssignments(session.room.baseAssignments, session.account.survivors, "user-a", [squadMember.id]);

    expect(prep.startingSupplies.food).toBe(1);
    expect(prep.startingSupplies.water).toBe(1);
    expect(prep.startingSupplies.medicine).toBe(1);
    expect(prep.carryCapacity).toBe(2);
    expect(prep.roadSecure).toBe(1);
    expect(prep.pressureRelief).toBe(1);
  });

  test("merges facility and base prep expedition support without mutating either source", () => {
    const facilities = supportFromFacilities(completeFacilities(starterRoomFacilities()), "hold-formation");
    const prep = {
      ...supportFromFacilities([]),
      carryCapacity: 2,
      roadSecure: 1,
      startingSupplies: { food: 1, medicine: 1 }
    };

    const merged = mergeExpeditionSupport(facilities, prep);

    expect(merged.maxHp).toBe(facilities.maxHp);
    expect(merged.guardBlock).toBe(facilities.guardBlock);
    expect(merged.roadSecure).toBe(facilities.roadSecure + 1);
    expect(merged.carryCapacity).toBe((facilities.carryCapacity ?? 0) + 2);
    expect(merged.startingSupplies.food).toBe(1);
    expect(merged.startingSupplies.medicine).toBe(1);
    expect(facilities.startingSupplies.food).toBeUndefined();
  });

  test("expedition support plan groups base support into readable expedition phases", () => {
    const facilities = supportFromFacilities(completeFacilities(starterRoomFacilities()), "overwatch-route");
    const prep = {
      ...supportFromFacilities([]),
      carryCapacity: 2,
      guardBlock: 1,
      roadSecure: 1,
      shopRations: 1,
      startingSupplies: { food: 1, medicine: 1, water: 1 }
    };
    const support = mergeExpeditionSupport(facilities, prep);

    const plan = expeditionSupportPlan(support);

    expect(plan.summary).toContain("4 条后勤线");
    expect(plan.totalEffects).toBeGreaterThan(8);
    expect(plan.stages.map((stage) => stage.id)).toEqual(["departure", "road", "combat", "camp"]);
    expect(plan.stages[0]).toMatchObject({
      id: "departure",
      label: "出门准备"
    });
    expect(plan.stages[0].items.join(" / ")).toContain("食物 +1");
    expect(plan.stages[1].items.join(" / ")).toContain("路线搜索");
    expect(plan.stages[2].items.join(" / ")).toContain("防守");
    expect(plan.stages[3].items.join(" / ")).toContain("商店口粮");
  });

  test("expedition support plan explains when no logistics are available", () => {
    const plan = expeditionSupportPlan(supportFromFacilities([]));

    expect(plan.summary).toBe("暂无后勤支援");
    expect(plan.totalEffects).toBe(0);
    expect(plan.stages).toHaveLength(0);
  });

  test("account base support adds personal preparation without replacing room facilities", () => {
    const support = supportFromAccountBase({
      level: 3,
      medicalRoomLevel: 2,
      radioBenchLevel: 1,
      trainingRoomLevel: 3,
      userId: "user-a",
      warehouseLevel: 2
    });

    expect(support.maxHp).toBe(4);
    expect(support.patchHeal).toBe(2);
    expect(support.carryCapacity).toBe(2);
    expect(support.pressureRelief).toBe(2);
    expect(support.lootIntel).toBe(1);
    expect(support.shopIntel).toBe(1);
  });

  test("account base support briefing explains current expedition benefits in Chinese", () => {
    const briefing = accountBaseSupportBriefing({
      level: 3,
      medicalRoomLevel: 2,
      radioBenchLevel: 2,
      trainingRoomLevel: 3,
      userId: "user-a",
      warehouseLevel: 2
    });

    expect(briefing.summary).toContain("个人基地提供 4 条出征支援");
    expect(briefing.lines.map((line) => line.title)).toEqual(["训练室", "医务室", "仓库", "电台工作台"]);
    expect(briefing.lines.map((line) => line.effect).join("\n")).toContain("出征经验 +4");
    expect(briefing.lines.map((line) => line.effect).join("\n")).toContain("包扎 +2");
    expect(briefing.lines.map((line) => line.effect).join("\n")).toContain("背包容量 +2");
    expect(briefing.lines.map((line) => line.effect).join("\n")).toContain("压力 -4");
  });
});

function survivor(overrides: Partial<AccountSurvivor> = {}): AccountSurvivor {
  return {
    attributes: {
      agility: 72,
      infectionResistance: 44,
      luck: 48,
      medical: 34,
      social: 38,
      stamina: 70,
      technical: 42,
      willpower: 46
    },
    codename: "Runner",
    fatigue: 0,
    flaw: "怕黑",
    id: "survivor-runner",
    injuries: [],
    level: 1,
    name: "林岚",
    note: "轻装侦察员。",
    ownerUserId: "user-a",
    profession: "快递员",
    role: "侦察员",
    status: "available",
    traits: ["灵活"],
    xp: 0,
    ...overrides
  };
}

describe("survivor progression", () => {
  test("advances through every reached threshold and reports unlocked perks", () => {
    const result = advanceSurvivorExperience(survivor({ xp: 18 }), 45);

    expect(result.survivor.level).toBe(4);
    expect(result.survivor.xp).toBe(63);
    expect(result.levelUps).toEqual([2, 3, 4]);
    expect(result.unlockedPerks.map((perk) => perk.label)).toEqual(["野外跑手", "基地直觉"]);
    expect(result.xpToNextLevel).toBe(17);
    expect(survivorPerkDetails(result.survivor).map((perk) => perk.label)).toEqual(["野外跑手", "基地直觉"]);
  });

  test("keeps capped survivors at the long-term growth ceiling", () => {
    const result = advanceSurvivorExperience(survivor({ level: survivorLevelCap, xp: survivorMaxXp - 2 }), 20);

    expect(result.survivor.level).toBe(survivorLevelCap);
    expect(result.survivor.xp).toBe(survivorMaxXp);
    expect(result.levelUps).toEqual([]);
    expect(result.xpToNextLevel).toBe(0);
    expect(result.atLevelCap).toBe(true);
    expect(isSurvivorAtLevelCap(result.survivor)).toBe(true);
    expect(xpForNextLevel(result.survivor)).toBe(survivorMaxXp);
  });
});
