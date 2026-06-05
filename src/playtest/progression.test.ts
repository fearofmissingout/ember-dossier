import { describe, expect, test } from "vitest";
import { completeFacilities } from "../game/facilities";
import { starterRoomFacilities } from "./content";
import { basePrepSupportFromAssignments, expeditionDoctrineOptions, mergeExpeditionSupport, supportFromFacilities } from "./progression";
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
      effect: "Max HP +6 / Guard +1",
      facilityId: "dorm",
      label: "Hold Formation"
    });
  });

  test("selected expedition doctrine changes combat support without changing passive facility support", () => {
    const facilities = completeFacilities(starterRoomFacilities());
    const passive = supportFromFacilities(facilities);
    const formation = supportFromFacilities(facilities, "hold-formation");
    const magazines = supportFromFacilities(facilities, "hot-magazines");

    expect(formation.maxHp).toBe(passive.maxHp + 6);
    expect(formation.guardBlock).toBe(passive.guardBlock + 1);
    expect(magazines.ammoDamage).toBe(passive.ammoDamage + 2);
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
});
