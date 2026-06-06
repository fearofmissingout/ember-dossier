import { createStarterAccount, emptyLoadout, roomToGameState } from "../playtest/state";
import { starterObjective, starterRoomFacilities, starterRoomLocations, starterRoomResources } from "../playtest/content";
import { completeFacilities } from "../game/facilities";
import type { ExpeditionReport, FeedItem } from "../game/types";
import type {
  AccountState,
  AccountSurvivor,
  PlaytestRoom,
  PlaytestSession,
  RoomAssignedSurvivor,
  RoomContribution
} from "../playtest/types";
import { supabaseConfig } from "./supabase";

export async function bootstrapAccount(accessToken: string, userId: string, displayName: string) {
  const account = createStarterAccount(userId, displayName);

  await upsert(accessToken, "account_profiles", {
    avatar_color: account.profile.avatarColor,
    display_name: account.profile.displayName,
    user_id: account.profile.userId
  });
  await upsert(accessToken, "account_bases", {
    level: account.base.level,
    medical_room_level: account.base.medicalRoomLevel,
    radio_bench_level: account.base.radioBenchLevel,
    training_room_level: account.base.trainingRoomLevel,
    user_id: account.base.userId,
    warehouse_level: account.base.warehouseLevel
  });
  await upsert(accessToken, "account_resources", {
    resources: account.resources,
    user_id: account.profile.userId
  });

  for (const survivor of account.survivors) {
    await upsert(accessToken, "account_survivors", serializeAccountSurvivor(survivor), "user_id,content_id");
  }
}

export async function loadPlaytestSession(
  accessToken: string,
  userId: string,
  displayName: string,
  roomSlug: string
): Promise<PlaytestSession> {
  await bootstrapAccount(accessToken, userId, displayName);
  const account = await loadAccount(accessToken, userId, displayName);
  const room = await loadOrCreateRoom(accessToken, roomSlug, account);

  return {
    account,
    activeExpedition: null,
    room,
    uiState: roomToGameState(room, account.survivors)
  };
}

export async function loadAccount(accessToken: string, userId: string, displayName: string): Promise<AccountState> {
  const starter = createStarterAccount(userId, displayName);
  const [profiles, bases, resources, survivorRows] = await Promise.all([
    selectRows<AccountProfileRow>(accessToken, "account_profiles", { user_id: `eq.${userId}` }),
    selectRows<AccountBaseRow>(accessToken, "account_bases", { user_id: `eq.${userId}` }),
    selectRows<AccountResourcesRow>(accessToken, "account_resources", { user_id: `eq.${userId}` }),
    selectRows<AccountSurvivorRow>(accessToken, "account_survivors", { user_id: `eq.${userId}`, order: "content_id.asc" })
  ]);

  return {
    base: bases[0] ? deserializeAccountBase(bases[0]) : starter.base,
    profile: profiles[0] ? deserializeProfile(profiles[0]) : starter.profile,
    resources: resources[0]?.resources ?? starter.resources,
    survivors: survivorRows.length > 0 ? survivorRows.map(deserializeAccountSurvivor) : starter.survivors
  };
}

export async function loadOrCreateRoom(accessToken: string, roomSlug: string, account: AccountState): Promise<PlaytestRoom> {
  const existingRooms = await selectRows<PlaytestRoomRow>(accessToken, "playtest_rooms", { slug: `eq.${roomSlug}`, limit: "1" });
  const room =
    existingRooms[0] ??
    (await insertReturning<PlaytestRoomRow>(accessToken, "playtest_rooms", {
      host_user_id: account.profile.userId,
      name: "塔楼据点",
      slug: roomSlug,
      status: "active"
    }));

  await upsert(
    accessToken,
    "playtest_room_members",
    {
      display_name: account.profile.displayName,
      last_seen_at: new Date().toISOString(),
      role: room.host_user_id === account.profile.userId ? "host" : "member",
      room_id: room.id,
      user_id: account.profile.userId
    },
    "room_id,user_id"
  );

  let baseRows = await selectRows<PlaytestRoomBaseRow>(accessToken, "playtest_room_bases", { room_id: `eq.${room.id}`, limit: "1" });
  if (baseRows.length === 0 && room.host_user_id === account.profile.userId) {
    await upsert(accessToken, "playtest_room_bases", serializeStarterRoomBase(room.id), "room_id");
    baseRows = await selectRows<PlaytestRoomBaseRow>(accessToken, "playtest_room_bases", { room_id: `eq.${room.id}`, limit: "1" });
  }

  const [members, contributions, assignments, reports] = await Promise.all([
    selectRows<PlaytestRoomMemberRow>(accessToken, "playtest_room_members", { room_id: `eq.${room.id}`, order: "joined_at.asc" }),
    selectRows<ContributionRow>(accessToken, "playtest_room_contributions", { room_id: `eq.${room.id}`, order: "created_at.desc" }),
    selectRows<AssignmentRow>(accessToken, "playtest_room_assignments", { room_id: `eq.${room.id}`, order: "assigned_at.asc" }),
    selectRows<ReportRow>(accessToken, "playtest_reports", { room_id: `eq.${room.id}`, order: "created_at.desc" })
  ]);

  const base = baseRows[0] ?? serializeStarterRoomBase(room.id);
  const remoteObjective = deserializeRemoteObjective(base.objective);

  return {
    assignedSurvivors: assignments.map((assignment) => ({
      assignedAt: assignment.assigned_at,
      roomId: assignment.room_id,
      survivorId: assignment.survivor_content_id,
      userId: assignment.user_id
    })),
    base: {
      danger: base.danger,
      day: base.day,
      facilities: completeFacilities(base.facilities ?? []),
      morale: base.morale,
      name: base.name,
      objective: remoteObjective.objective,
      resources: base.resources,
      roomId: room.id
    },
    baseAssignments: remoteObjective.assignments,
    contributions: contributions.map((contribution) => ({
      createdAt: contribution.created_at,
      id: contribution.id,
      resources: contribution.resources,
      roomId: contribution.room_id,
      userId: contribution.user_id
    })),
    createdAt: room.created_at,
    feed:
      reports.length > 0
        ? reports.map((report) => ({
            body: report.logs.join("\n"),
            id: report.id,
            kind: "report",
            timestamp: new Date(report.created_at).toLocaleString(),
            title: report.title
          }))
        : [
            {
              body: "共享基地已经建立。成员可以捐入物资、编队出征，也可以安排幸存者处理基地班次。",
              id: `feed-${room.id}-init`,
              kind: "system",
              timestamp: "第 1 天",
              title: "共享基地上线"
            }
          ],
    hostUserId: room.host_user_id,
    id: room.id,
    locations: starterRoomLocations(),
    members: members.map((member) => ({
      displayName: member.display_name,
      joinedAt: member.joined_at,
      lastSeenAt: member.last_seen_at,
      role: member.role,
      userId: member.user_id
    })),
    name: room.name,
    slug: room.slug
  };
}

export async function saveContribution(accessToken: string, contribution: RoomContribution) {
  await upsert(accessToken, "playtest_room_contributions", {
    id: contribution.id,
    resources: contribution.resources,
    room_id: contribution.roomId,
    user_id: contribution.userId
  });
}

export async function saveAssignment(accessToken: string, assignment: RoomAssignedSurvivor) {
  await upsert(
    accessToken,
    "playtest_room_assignments",
    {
      assigned_at: assignment.assignedAt,
      room_id: assignment.roomId,
      survivor_content_id: assignment.survivorId,
      user_id: assignment.userId
    },
    "room_id,user_id,survivor_content_id"
  );
}

export async function savePlaytestProgress(accessToken: string, session: PlaytestSession, activity?: FeedItem) {
  await Promise.all([saveCoreProgress(accessToken, session), activity ? saveRoomActivity(accessToken, session, activity) : Promise.resolve()]);
}

export async function saveSettlement(accessToken: string, session: PlaytestSession, report: ExpeditionReport) {
  await Promise.all([
    saveCoreProgress(accessToken, session),
    upsert(accessToken, "playtest_reports", {
      expedition_id: null,
      logs: report.logs,
      outcome: report.outcome,
      penalties: report.penalties,
      reward: report.reward,
      room_id: session.room.id,
      title: `${report.locationName} expedition complete`
    })
  ]);
}

export async function saveRoomActivity(accessToken: string, session: PlaytestSession, activity: FeedItem) {
  await upsert(accessToken, "playtest_reports", {
    expedition_id: null,
    logs: activity.body.split("\n").filter(Boolean),
    outcome: "clean",
    penalties: { danger: 0, morale: 0 },
    reward: emptyLoadout(),
    room_id: session.room.id,
    title: activity.title
  });
}

async function saveCoreProgress(accessToken: string, session: PlaytestSession) {
  await Promise.all([
    patchRows(accessToken, "account_resources", { user_id: `eq.${session.account.profile.userId}` }, { resources: session.account.resources }),
    patchRows(
      accessToken,
      "playtest_room_bases",
      { room_id: `eq.${session.room.id}` },
      {
        danger: session.room.base.danger,
        day: session.room.base.day,
        facilities: session.room.base.facilities,
        morale: session.room.base.morale,
        objective: serializeRemoteObjective(session),
        resources: session.room.base.resources
      }
    ),
    ...session.account.survivors.map((survivor) =>
      upsert(accessToken, "account_survivors", serializeAccountSurvivor(survivor), "user_id,content_id")
    )
  ]);
}

function serializeAccountSurvivor(survivor: AccountSurvivor) {
  return {
    content_id: survivor.id,
    fatigue: survivor.fatigue,
    injuries: survivor.injuries,
    level: survivor.level,
    payload: {
      attributes: survivor.attributes,
      codename: survivor.codename,
      flaw: survivor.flaw,
      name: survivor.name,
      note: survivor.note,
      profession: survivor.profession,
      role: survivor.role,
      traits: survivor.traits
    },
    status: survivor.status,
    user_id: survivor.ownerUserId,
    xp: survivor.xp
  };
}

async function upsert(accessToken: string, table: string, body: Record<string, unknown>, onConflict?: string) {
  if (!supabaseConfig) {
    throw new Error("Supabase is not configured.");
  }

  const endpoint = new URL(`/rest/v1/${table}`, supabaseConfig.url);
  if (onConflict) {
    endpoint.searchParams.set("on_conflict", onConflict);
  }
  const response = await fetch(endpoint, {
    body: JSON.stringify(body),
    headers: createRestHeaders(accessToken),
    method: "POST"
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }
}

async function insertReturning<T>(accessToken: string, table: string, body: Record<string, unknown>): Promise<T> {
  if (!supabaseConfig) {
    throw new Error("Supabase is not configured.");
  }

  const endpoint = new URL(`/rest/v1/${table}`, supabaseConfig.url);
  const response = await fetch(endpoint, {
    body: JSON.stringify(body),
    headers: createRestHeaders(accessToken, "return=representation"),
    method: "POST"
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  const rows = (await response.json()) as T[];
  return rows[0];
}

async function selectRows<T>(accessToken: string, table: string, filters: Record<string, string>): Promise<T[]> {
  if (!supabaseConfig) {
    throw new Error("Supabase is not configured.");
  }

  const endpoint = new URL(`/rest/v1/${table}`, supabaseConfig.url);
  endpoint.searchParams.set("select", "*");
  for (const [key, value] of Object.entries(filters)) {
    endpoint.searchParams.set(key, value);
  }

  const response = await fetch(endpoint, {
    headers: createRestHeaders(accessToken)
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return (await response.json()) as T[];
}

async function patchRows(
  accessToken: string,
  table: string,
  filters: Record<string, string>,
  body: Record<string, unknown>
) {
  if (!supabaseConfig) {
    throw new Error("Supabase is not configured.");
  }

  const endpoint = new URL(`/rest/v1/${table}`, supabaseConfig.url);
  for (const [key, value] of Object.entries(filters)) {
    endpoint.searchParams.set(key, value);
  }

  const response = await fetch(endpoint, {
    body: JSON.stringify(body),
    headers: createRestHeaders(accessToken),
    method: "PATCH"
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }
}

function createRestHeaders(accessToken: string, prefer = "resolution=merge-duplicates,return=minimal") {
  if (!supabaseConfig) {
    throw new Error("Supabase is not configured.");
  }

  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${accessToken}`,
    Prefer: prefer,
    apikey: supabaseConfig.publishableKey
  };
}

function serializeStarterRoomBase(roomId: string): PlaytestRoomBaseRow {
  return {
    danger: 12,
    day: 1,
    facilities: completeFacilities(starterRoomFacilities()),
    morale: 62,
    name: "塔楼据点基地",
    objective: {
      ...starterObjective(),
      assignments: []
    },
    resources: starterRoomResources(),
    room_id: roomId,
    updated_at: new Date().toISOString()
  };
}

function deserializeRemoteObjective(objective: RemoteRoomObjective) {
  const { assignments, ...cleanObjective } = objective;
  return {
    assignments: Array.isArray(assignments) ? assignments : [],
    objective: cleanObjective as PlaytestRoom["base"]["objective"]
  };
}

function serializeRemoteObjective(session: PlaytestSession): RemoteRoomObjective {
  return {
    ...session.room.base.objective,
    assignments: session.room.baseAssignments
  };
}

function deserializeProfile(row: AccountProfileRow) {
  return {
    avatarColor: row.avatar_color,
    createdAt: row.created_at,
    displayName: row.display_name,
    userId: row.user_id
  };
}

function deserializeAccountBase(row: AccountBaseRow) {
  return {
    level: row.level,
    medicalRoomLevel: row.medical_room_level,
    radioBenchLevel: row.radio_bench_level,
    trainingRoomLevel: row.training_room_level,
    userId: row.user_id,
    warehouseLevel: row.warehouse_level
  };
}

function deserializeAccountSurvivor(row: AccountSurvivorRow): AccountSurvivor {
  return {
    attributes: row.payload.attributes,
    codename: row.payload.codename,
    fatigue: row.fatigue,
    flaw: row.payload.flaw,
    id: row.content_id,
    injuries: row.injuries,
    level: row.level,
    name: row.payload.name,
    note: row.payload.note,
    ownerUserId: row.user_id,
    profession: row.payload.profession,
    role: row.payload.role,
    status: row.status,
    traits: row.payload.traits,
    xp: row.xp
  };
}

type AccountProfileRow = {
  avatar_color: string;
  created_at: string;
  display_name: string;
  user_id: string;
};

type AccountBaseRow = {
  level: number;
  medical_room_level: number;
  radio_bench_level: number;
  training_room_level: number;
  user_id: string;
  warehouse_level: number;
};

type AccountResourcesRow = {
  resources: AccountState["resources"];
  user_id: string;
};

type AccountSurvivorRow = {
  content_id: string;
  fatigue: number;
  injuries: string[];
  level: number;
  payload: Pick<AccountSurvivor, "attributes" | "codename" | "flaw" | "name" | "note" | "profession" | "role" | "traits">;
  status: AccountSurvivor["status"];
  user_id: string;
  xp: number;
};

type PlaytestRoomRow = {
  created_at: string;
  host_user_id: string;
  id: string;
  name: string;
  slug: string;
  status: string;
};

type PlaytestRoomMemberRow = {
  display_name: string;
  joined_at: string;
  last_seen_at: string;
  role: "host" | "member";
  room_id: string;
  user_id: string;
};

type PlaytestRoomBaseRow = {
  danger: number;
  day: number;
  facilities: PlaytestRoom["base"]["facilities"];
  morale: number;
  name: string;
  objective: RemoteRoomObjective;
  resources: PlaytestRoom["base"]["resources"];
  room_id: string;
  updated_at: string;
};

type RemoteRoomObjective = PlaytestRoom["base"]["objective"] & {
  assignments?: PlaytestRoom["baseAssignments"];
};

type ContributionRow = {
  created_at: string;
  id: string;
  resources: RoomContribution["resources"];
  room_id: string;
  user_id: string;
};

type AssignmentRow = {
  assigned_at: string;
  room_id: string;
  survivor_content_id: string;
  user_id: string;
};

type ReportRow = {
  created_at: string;
  id: string;
  logs: string[];
  outcome: ExpeditionReport["outcome"];
  penalties: ExpeditionReport["penalties"];
  reward: ExpeditionReport["reward"];
  room_id: string;
  title: string;
};
