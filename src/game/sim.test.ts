import { describe, expect, test } from "vitest";
import { starterGameState } from "./content";
import { resolveExpedition } from "./sim";

describe("resolveExpedition", () => {
  test("settles a cautious water plant expedition with supplies, rewards, fatigue, and report logs", () => {
    const result = resolveExpedition(starterGameState, {
      locationId: "water-plant",
      squadIds: ["lin", "mara", "otto"],
      risk: "cautious",
      loadout: {
        food: 2,
        water: 1,
        materials: 0,
        medicine: 1,
        fuel: 1,
        ammo: 1
      },
      randomRolls: [0.18, 0.22, 0.31]
    });

    expect(result.report.outcome).toBe("clean");
    expect(result.report.locationName).toBe("北区水处理厂");
    expect(result.report.reward).toEqual({
      food: 0,
      water: 13,
      materials: 3,
      medicine: 1,
      fuel: 0,
      ammo: 0
    });
    expect(result.nextState.resources.water).toBe(25);
    expect(result.nextState.resources.medicine).toBe(8);
    expect(result.nextState.survivors.find((survivor) => survivor.id === "lin")?.fatigue).toBe(24);
    expect(result.nextState.survivors.find((survivor) => survivor.id === "mara")?.injuries).toEqual([]);
    expect(result.report.logs).toHaveLength(4);
    expect(result.report.logs[0]).toContain("侦察员先确认了");
    expect(result.nextState.feed[0].title).toBe("北区水处理厂远征完成");
  });

  test("settles a greedy hospital expedition with injury, morale loss, and danger increase", () => {
    const result = resolveExpedition(starterGameState, {
      locationId: "hospital",
      squadIds: ["pavel", "niko", "vera"],
      risk: "greedy",
      loadout: {
        food: 1,
        water: 1,
        materials: 0,
        medicine: 0,
        fuel: 1,
        ammo: 0
      },
      randomRolls: [0.94, 0.88, 0.92]
    });

    expect(result.report.outcome).toBe("costly");
    expect(result.report.penalties).toEqual({
      morale: -3,
      danger: 2
    });
    expect(result.nextState.resources.danger).toBe(19);
    expect(result.nextState.resources.morale).toBe(58);
    expect(result.nextState.survivors.find((survivor) => survivor.id === "pavel")?.injuries).toContain("撕裂伤");
    expect(result.report.logs.some((line) => line.includes("贪婪路线"))).toBe(true);
  });
});
