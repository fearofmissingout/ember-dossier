import { starterGameState } from "./content";
import type { GameState } from "./types";

export const demoStorageKey = "ember-dossier-demo-state";

export function createInitialState(): GameState {
  return structuredClone(starterGameState) as GameState;
}

export function loadDemoState(): GameState {
  if (typeof localStorage === "undefined") {
    return createInitialState();
  }

  const saved = localStorage.getItem(demoStorageKey);
  if (!saved) {
    return createInitialState();
  }

  try {
    return JSON.parse(saved) as GameState;
  } catch {
    localStorage.removeItem(demoStorageKey);
    return createInitialState();
  }
}

export function saveDemoState(state: GameState) {
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(demoStorageKey, JSON.stringify(state));
  }
}

export function clearDemoState() {
  if (typeof localStorage !== "undefined") {
    localStorage.removeItem(demoStorageKey);
  }
}
