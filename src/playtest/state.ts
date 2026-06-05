import type { GameState, ResourceBundle } from "../game/types";
import { completeFacilities } from "../game/facilities";
import {
  starterAccountResources,
  starterAccountSurvivors,
  starterObjective,
  starterRoomFacilities,
  starterRoomLocations,
  starterRoomResources
} from "./content";
import type { AccountState, PlaytestRoom, PlaytestSession } from "./types";

const colors = ["#2f756c", "#8a3c2a", "#426f9c", "#7d5a9e"];
const playtestStorageKey = "ember-dossier-playtest-session";

export function createStarterAccount(userId: string, displayName: string): AccountState {
  return {
    base: {
      level: 1,
      medicalRoomLevel: 1,
      radioBenchLevel: 0,
      trainingRoomLevel: 1,
      userId,
      warehouseLevel: 1
    },
    profile: {
      avatarColor: colors[Math.abs(hash(userId)) % colors.length],
      createdAt: nowIso(),
      displayName,
      userId
    },
    resources: starterAccountResources(),
    survivors: starterAccountSurvivors(userId)
  };
}

export function createStarterRoom(slug: string, name = "Tower Run", hostUserId = "host"): PlaytestRoom {
  const roomId = `room-${slug}`;

  return {
    assignedSurvivors: [],
    base: {
      danger: 12,
      day: 1,
      facilities: completeFacilities(starterRoomFacilities()),
      morale: 62,
      name: `${name} Base`,
      objective: starterObjective(),
      resources: starterRoomResources(),
      roomId
    },
    baseAssignments: [],
    contributions: [],
    createdAt: nowIso(),
    feed: [
      {
        body: "Room base initialized. Members can contribute supplies and assign survivors.",
        id: `feed-${roomId}-init`,
        kind: "system",
        timestamp: "Day 1",
        title: "Shared base online"
      }
    ],
    hostUserId,
    id: roomId,
    locations: starterRoomLocations(),
    members: [],
    name,
    slug
  };
}

export function createStarterSession(userId: string, displayName: string, roomSlug: string): PlaytestSession {
  const account = createStarterAccount(userId, displayName);
  const room = createStarterRoom(roomSlug, "Tower Run", userId);
  const joinedAt = nowIso();

  room.members = [
    {
      displayName,
      joinedAt,
      lastSeenAt: joinedAt,
      role: "host",
      userId
    }
  ];

  return {
    account,
    activeExpedition: null,
    room,
    uiState: roomToGameState(room, account.survivors)
  };
}

export function roomToGameState(room: PlaytestRoom, survivors: AccountState["survivors"] = []): GameState {
  return {
    facilities: completeFacilities(room.base.facilities),
    feed: room.feed,
    locations: room.locations,
    resources: {
      ...room.base.resources,
      danger: room.base.danger,
      morale: room.base.morale
    },
    survivors
  };
}

export function emptyLoadout(): ResourceBundle {
  return {
    ammo: 0,
    food: 0,
    fuel: 0,
    materials: 0,
    medicine: 0,
    water: 0
  };
}

export function loadPlaytestSession(userId: string, displayName: string, roomSlug: string): PlaytestSession {
  if (typeof localStorage === "undefined") {
    return createStarterSession(userId, displayName, roomSlug);
  }

  const saved = localStorage.getItem(playtestStorageKey);
  if (!saved) {
    return createStarterSession(userId, displayName, roomSlug);
  }

  try {
    const session = JSON.parse(saved) as PlaytestSession;
    if (session.account.profile.userId !== userId || session.room.slug !== roomSlug) {
      return createStarterSession(userId, displayName, roomSlug);
    }

    const room = {
      ...session.room,
      base: {
        ...session.room.base,
        facilities: completeFacilities(session.room.base.facilities ?? [])
      },
      baseAssignments: session.room.baseAssignments ?? []
    };

    return {
      ...session,
      room,
      uiState: roomToGameState(room, session.account.survivors)
    };
  } catch {
    localStorage.removeItem(playtestStorageKey);
    return createStarterSession(userId, displayName, roomSlug);
  }
}

export function savePlaytestSession(session: PlaytestSession) {
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(playtestStorageKey, JSON.stringify(session));
  }
}

export function clearPlaytestSession() {
  if (typeof localStorage !== "undefined") {
    localStorage.removeItem(playtestStorageKey);
  }
}

function nowIso() {
  return new Date().toISOString();
}

function hash(value: string) {
  return value.split("").reduce((total, char) => total + char.charCodeAt(0), 0);
}
