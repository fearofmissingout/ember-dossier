import { emptyResources, starterGameState } from "../game/content";
import type { AccountSurvivor, RoomObjective } from "./types";

export function starterAccountResources() {
  return {
    ...emptyResources(),
    food: 20,
    water: 20,
    materials: 18,
    medicine: 8,
    fuel: 6,
    ammo: 6,
    rareParts: 0,
    intel: 0
  };
}

export function starterRoomResources() {
  return {
    ...emptyResources(),
    food: 12,
    water: 12,
    materials: 10,
    medicine: 4,
    fuel: 3,
    ammo: 3
  };
}

export function starterObjective(): RoomObjective {
  return {
    deadlineDay: 5,
    id: "repair-comms",
    repairedParts: 0,
    requiredParts: 8,
    status: "active",
    title: "Repair the communications tower"
  };
}

export function starterAccountSurvivors(userId: string): AccountSurvivor[] {
  return starterGameState.survivors.slice(0, 6).map((survivor) => ({
    ...structuredClone(survivor),
    level: 1,
    ownerUserId: userId,
    status: "available",
    xp: 0
  }));
}

export function starterRoomFacilities() {
  return structuredClone(starterGameState.facilities);
}

export function starterRoomLocations() {
  return structuredClone(starterGameState.locations);
}
