export type ResourceKey = "food" | "water" | "materials" | "medicine" | "fuel" | "ammo";

export type RiskStrategy = "cautious" | "standard" | "greedy";

export type StatKey =
  | "stamina"
  | "agility"
  | "technical"
  | "medical"
  | "social"
  | "willpower"
  | "luck"
  | "infectionResistance";

export type PlayerRole = "侦察员" | "后勤员" | "医疗员" | "工程员" | "守夜人";

export type BaseResources = Record<ResourceKey, number> & {
  morale: number;
  danger: number;
};

export type ResourceBundle = Record<ResourceKey, number>;

export type Survivor = {
  id: string;
  name: string;
  codename: string;
  profession: string;
  role: PlayerRole;
  attributes: Record<StatKey, number>;
  traits: string[];
  flaw: string;
  fatigue: number;
  injuries: string[];
  note: string;
};

export type LocationFamily = "resources" | "urban" | "wilds" | "weird";

export type Location = {
  id: string;
  name: string;
  family: LocationFamily;
  risk: number;
  recommendedStats: StatKey[];
  reward: ResourceBundle;
  tags: string[];
  dossier: string;
};

export type Facility = {
  id: string;
  name: string;
  level: number;
  status: "stable" | "strained" | "critical";
  effect: string;
};

export type FeedItem = {
  id: string;
  kind: "report" | "member" | "system";
  title: string;
  body: string;
  timestamp: string;
};

export type GameState = {
  resources: BaseResources;
  survivors: Survivor[];
  locations: Location[];
  facilities: Facility[];
  feed: FeedItem[];
};

export type ExpeditionRequest = {
  locationId: string;
  squadIds: string[];
  risk: RiskStrategy;
  loadout: ResourceBundle;
  randomRolls?: number[];
};

export type ExpeditionOutcome = "clean" | "rough" | "costly";

export type ExpeditionReport = {
  id: string;
  locationName: string;
  squadNames: string[];
  outcome: ExpeditionOutcome;
  reward: ResourceBundle;
  penalties: {
    morale: number;
    danger: number;
  };
  logs: string[];
  createdAt: string;
};

export type ExpeditionResult = {
  nextState: GameState;
  report: ExpeditionReport;
};
