import type { Facility, FeedItem, GameState, Location, ResourceBundle, Survivor } from "../game/types";

export type AccountProfile = {
  userId: string;
  displayName: string;
  avatarColor: string;
  createdAt: string;
};

export type AccountBase = {
  userId: string;
  level: number;
  medicalRoomLevel: number;
  trainingRoomLevel: number;
  warehouseLevel: number;
  radioBenchLevel: number;
};

export type AccountSurvivor = Survivor & {
  ownerUserId: string;
  level: number;
  xp: number;
  status: "available" | "assigned" | "recovering";
};

export type AccountState = {
  profile: AccountProfile;
  base: AccountBase;
  resources: ResourceBundle & {
    rareParts: number;
    intel: number;
  };
  survivors: AccountSurvivor[];
};

export type RoomMember = {
  userId: string;
  displayName: string;
  role: "host" | "member";
  joinedAt: string;
  lastSeenAt: string;
};

export type RoomObjective = {
  id: "repair-comms";
  title: string;
  requiredParts: number;
  repairedParts: number;
  deadlineDay: number;
  status: "active" | "won" | "lost";
};

export type RoomBase = {
  roomId: string;
  name: string;
  day: number;
  morale: number;
  danger: number;
  resources: ResourceBundle;
  facilities: Facility[];
  objective: RoomObjective;
};

export type RoomContribution = {
  id: string;
  roomId: string;
  userId: string;
  resources: ResourceBundle;
  createdAt: string;
};

export type RoomAssignedSurvivor = {
  roomId: string;
  userId: string;
  survivorId: string;
  assignedAt: string;
};

export type ExpeditionParticipant = {
  userId: string;
  survivorId: string;
};

export type PlaytestExpedition = {
  id: string;
  roomId: string;
  locationId: string;
  risk: "cautious" | "standard" | "greedy";
  loadout: ResourceBundle;
  participants: ExpeditionParticipant[];
  status: "planned" | "completed";
  createdAt: string;
  completedAt?: string;
};

export type PlaytestRoom = {
  id: string;
  slug: string;
  name: string;
  hostUserId: string;
  createdAt: string;
  members: RoomMember[];
  base: RoomBase;
  contributions: RoomContribution[];
  assignedSurvivors: RoomAssignedSurvivor[];
  locations: Location[];
  feed: FeedItem[];
};

export type PlaytestSession = {
  account: AccountState;
  room: PlaytestRoom;
  activeExpedition: PlaytestExpedition | null;
  uiState: GameState;
};
