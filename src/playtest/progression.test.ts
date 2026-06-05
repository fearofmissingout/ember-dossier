import { describe, expect, test } from "vitest";
import { completeFacilities } from "../game/facilities";
import { starterRoomFacilities } from "./content";
import { expeditionDoctrineOptions, supportFromFacilities } from "./progression";

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
});
