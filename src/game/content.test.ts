import { describe, expect, test } from "vitest";
import { locationContentBreadth, starterLocations } from "./content";

describe("starter game content", () => {
  test("keeps expedition locations stocked across every family", () => {
    expect(starterLocations).toHaveLength(20);
    expect(locationContentBreadth()).toEqual({
      resources: 5,
      urban: 5,
      weird: 5,
      wilds: 5
    });
  });

  test("keeps expanded locations readable and route-ready", () => {
    const ids = new Set(starterLocations.map((location) => location.id));
    expect(ids.size).toBe(starterLocations.length);
    expect(starterLocations.map((location) => location.id)).toEqual(
      expect.arrayContaining([
        "river-filter",
        "freight-yard",
        "cold-storage",
        "metro-east",
        "civic-archive",
        "rooftop-mall",
        "blackbox-theater",
        "folded-apartments",
        "mirror-market",
        "choir-substation",
        "salt-dike",
        "old-orchard",
        "ridge-campsite",
        "windmill-hamlet"
      ])
    );
    expect(starterLocations.every((location) => location.name && location.dossier && location.tags.length >= 3)).toBe(true);
    expect(starterLocations.every((location) => location.recommendedStats.length === 3)).toBe(true);
  });
});
