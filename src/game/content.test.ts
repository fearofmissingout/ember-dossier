import { describe, expect, test } from "vitest";
import { locationContentBreadth, starterLocations } from "./content";

describe("starter game content", () => {
  test("keeps expedition locations stocked across every family", () => {
    expect(starterLocations).toHaveLength(12);
    expect(locationContentBreadth()).toEqual({
      resources: 3,
      urban: 3,
      weird: 3,
      wilds: 3
    });
  });

  test("keeps expanded locations readable and route-ready", () => {
    const ids = new Set(starterLocations.map((location) => location.id));
    expect(ids.size).toBe(starterLocations.length);
    expect(starterLocations.map((location) => location.id)).toEqual(
      expect.arrayContaining(["river-filter", "metro-east", "blackbox-theater", "folded-apartments", "salt-dike", "old-orchard"])
    );
    expect(starterLocations.every((location) => location.name && location.dossier && location.tags.length >= 3)).toBe(true);
    expect(starterLocations.every((location) => location.recommendedStats.length === 3)).toBe(true);
  });
});
