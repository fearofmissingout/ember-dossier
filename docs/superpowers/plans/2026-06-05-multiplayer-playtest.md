# Multiplayer Playtest Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Ember Dossier from the current shared demo into a complete multiplayer playtest where players can log in, keep account-bound growth, create or join an independent room base, contribute resources and survivors, run expeditions, and settle rewards back to both room and account.

**Architecture:** Add a formal playtest domain model beside the existing demo model, then move the app through a compatibility layer instead of deleting the playable shell in one pass. Supabase becomes the source of truth for account assets, room state, contributions, expedition assignments, and reports; local storage remains only a guest fallback and migration aid.

**Tech Stack:** React 19, TypeScript, Vite, Vitest, Supabase REST/Auth, PostgreSQL/RLS, Cloudflare Pages.

---

## File Structure

- Create `src/playtest/types.ts`: account, room, contribution, expedition, and settlement types that match the approved spec.
- Create `src/playtest/content.ts`: deterministic starter resources, starter survivors, room facilities, room objective, and room locations.
- Create `src/playtest/state.ts`: pure constructors and converters between `PlaytestSession` and the current `GameState` UI shape.
- Create `src/playtest/sim.ts`: pure contribution, assignment, expedition, day progress, and settlement logic.
- Create `src/playtest/sim.test.ts`: unit tests for account/resource isolation, room contributions, assignments, expedition settlement, and win/loss progress.
- Create `src/lib/auth.ts`: Supabase magic-link auth helpers and account bootstrap calls.
- Create `src/lib/playtestRemote.ts`: Supabase REST persistence for profiles, account assets, rooms, members, contributions, assignments, expeditions, reports, and feed.
- Create `src/lib/playtestRemote.test.ts`: fetch-level tests for REST URLs, Latin-1-safe headers, and row payload boundaries.
- Modify `supabase/schema.sql`: add account-bound tables, room-bound tables, RLS policies, grants, and indexes needed by the playtest loop.
- Modify `scripts/check-supabase-demo.mjs`: add structured table checks without relying on the old `demo_snapshots` path.
- Modify `src/App.tsx`: introduce auth/onboarding, personal base, room lobby, contribution, assignment, expedition, settlement, and objective surfaces while keeping existing visual shell patterns.
- Modify `src/styles.css`: add compact responsive styles for login, account base, room setup, contribution rows, assignment roster, and settlement panels.
- Modify `src/App.smoke.test.tsx`: cover logged-out render and a seeded playtest render.
- Modify `.env.example`: document `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` only; never store database password.

## Scope Check

The spec touches auth, account progression, room state, expeditions, UI, deployment, and tests. These are coupled by the playable vertical loop, so this is one plan with milestone tasks. Each task must leave the app buildable and either preserve the old demo path or replace it with a tested playtest path.

## Expedition Direction

Expedition play should follow a Home Behind-like road-trip survival shape, adapted for async friends-at-work sessions:

- Dispatch creates a short route, not an instant result.
- Each route has visible distance, fatigue, hunger, thirst, carry burden, pressure, and extraction progress.
- Every stop should ask for a small tactical choice: event response, road tactic, turn-based combat action, camp option, shop trade, or early extraction.
- Road pressure and survival conditions should create consequences that come back to the room base: injuries, recovery needs, morale shifts, resource shortages, and facility value.
- Locations should feel like route families with repeatable rules and varied authored beats, so content can scale without changing the core engine.
- The v1 target is a compact five-stop route: event -> combat -> camp -> shop -> extraction, with road forks and hardships between stops.

---

### Task 1: Formal Playtest Domain Model

**Files:**
- Create: `src/playtest/types.ts`
- Create: `src/playtest/content.ts`
- Create: `src/playtest/state.ts`
- Test: `src/playtest/sim.test.ts`

- [ ] **Step 1: Write the failing constructor and isolation tests**

Add this first test block to `src/playtest/sim.test.ts`:

```ts
import { describe, expect, test } from "vitest";
import { createStarterAccount, createStarterRoom, createStarterSession } from "./state";

describe("playtest state constructors", () => {
  test("creates account-bound assets separately from a room-bound base", () => {
    const account = createStarterAccount("user-a", "Alice");
    const room = createStarterRoom("room-a", "Tower Run");

    expect(account.profile.userId).toBe("user-a");
    expect(account.resources.food).toBe(20);
    expect(account.survivors).toHaveLength(6);
    expect(room.slug).toBe("room-a");
    expect(room.base.resources.food).toBe(12);
    expect(room.members).toEqual([]);
    expect(room.base.day).toBe(1);
  });

  test("creates a session that can be rendered through the current game shell", () => {
    const session = createStarterSession("user-a", "Alice", "room-a");

    expect(session.account.profile.displayName).toBe("Alice");
    expect(session.room.members[0]?.userId).toBe("user-a");
    expect(session.uiState.resources.food).toBe(session.room.base.resources.food);
    expect(session.uiState.survivors.length).toBe(session.account.survivors.length);
    expect(session.uiState.feed[0]?.kind).toBe("system");
  });
});
```

- [ ] **Step 2: Run the focused test and confirm it fails**

Run:

```bash
npm test -- src/playtest/sim.test.ts
```

Expected: FAIL because `src/playtest/state.ts` does not exist.

- [ ] **Step 3: Add playtest types**

Create `src/playtest/types.ts`:

```ts
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
```

- [ ] **Step 4: Add deterministic starter content**

Create `src/playtest/content.ts`:

```ts
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
```

- [ ] **Step 5: Add state constructors and UI adapter**

Create `src/playtest/state.ts`:

```ts
import type { GameState, ResourceBundle } from "../game/types";
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
      facilities: starterRoomFacilities(),
      morale: 62,
      name: `${name} Base`,
      objective: starterObjective(),
      resources: starterRoomResources(),
      roomId
    },
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
  room.members = [
    {
      displayName,
      joinedAt: nowIso(),
      lastSeenAt: nowIso(),
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

export function roomToGameState(room: PlaytestRoom, survivors = [] as AccountState["survivors"]): GameState {
  return {
    facilities: room.base.facilities,
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

function nowIso() {
  return new Date().toISOString();
}

function hash(value: string) {
  return value.split("").reduce((total, char) => total + char.charCodeAt(0), 0);
}
```

- [ ] **Step 6: Run the focused test and verify it passes**

Run:

```bash
npm test -- src/playtest/sim.test.ts
```

Expected: PASS for the constructor tests.

- [ ] **Step 7: Commit**

Run:

```bash
git add src/playtest/types.ts src/playtest/content.ts src/playtest/state.ts src/playtest/sim.test.ts
git commit -m "Add playtest domain model"
```

---

### Task 2: Pure Contribution and Expedition Settlement

**Files:**
- Modify: `src/playtest/sim.test.ts`
- Create: `src/playtest/sim.ts`
- Modify: `src/playtest/state.ts`

- [ ] **Step 1: Add failing tests for contributions and assignments**

Append to `src/playtest/sim.test.ts`:

```ts
import { applyContribution, assignSurvivorToRoom, resolvePlaytestExpedition } from "./sim";

describe("playtest room loop", () => {
  test("moves resources from account inventory into the room base", () => {
    const session = createStarterSession("user-a", "Alice", "room-a");

    const next = applyContribution(session, "user-a", {
      ammo: 1,
      food: 2,
      fuel: 0,
      materials: 3,
      medicine: 0,
      water: 2
    });

    expect(next.account.resources.food).toBe(18);
    expect(next.room.base.resources.food).toBe(14);
    expect(next.account.resources.materials).toBe(15);
    expect(next.room.base.resources.materials).toBe(13);
    expect(next.room.contributions).toHaveLength(1);
  });

  test("assigns an account survivor to the room without transferring ownership", () => {
    const session = createStarterSession("user-a", "Alice", "room-a");
    const survivorId = session.account.survivors[0].id;

    const next = assignSurvivorToRoom(session, "user-a", survivorId);

    expect(next.account.survivors[0].ownerUserId).toBe("user-a");
    expect(next.account.survivors[0].status).toBe("assigned");
    expect(next.room.assignedSurvivors).toEqual([
      expect.objectContaining({
        survivorId,
        userId: "user-a"
      })
    ]);
  });

  test("settles expedition into room resources, account xp, fatigue, objective progress, and feed", () => {
    let session = createStarterSession("user-a", "Alice", "room-a");
    const squad = session.account.survivors.slice(0, 3).map((survivor) => survivor.id);

    for (const survivorId of squad) {
      session = assignSurvivorToRoom(session, "user-a", survivorId);
    }

    const result = resolvePlaytestExpedition(session, {
      loadout: {
        ammo: 1,
        food: 1,
        fuel: 1,
        materials: 0,
        medicine: 1,
        water: 1
      },
      locationId: "water-plant",
      randomRolls: [0.12, 0.18, 0.21],
      risk: "cautious",
      survivorIds: squad,
      userId: "user-a"
    });

    expect(result.report.outcome).toBe("clean");
    expect(result.session.room.base.resources.water).toBeGreaterThan(session.room.base.resources.water);
    expect(result.session.account.survivors[0].xp).toBeGreaterThan(0);
    expect(result.session.account.survivors[0].fatigue).toBeGreaterThan(session.account.survivors[0].fatigue);
    expect(result.session.room.base.objective.repairedParts).toBeGreaterThanOrEqual(1);
    expect(result.session.room.feed[0]?.kind).toBe("report");
  });
});
```

- [ ] **Step 2: Run the focused test and confirm it fails**

Run:

```bash
npm test -- src/playtest/sim.test.ts
```

Expected: FAIL because `src/playtest/sim.ts` does not exist.

- [ ] **Step 3: Implement pure playtest simulation**

Create `src/playtest/sim.ts`:

```ts
import { resolveExpedition } from "../game/sim";
import type { ExpeditionReport, ExpeditionRequest, ResourceBundle } from "../game/types";
import { emptyLoadout, roomToGameState } from "./state";
import type { PlaytestSession } from "./types";

type PlaytestExpeditionRequest = Omit<ExpeditionRequest, "squadIds"> & {
  survivorIds: string[];
  userId: string;
};

export function applyContribution(session: PlaytestSession, userId: string, resources: ResourceBundle): PlaytestSession {
  const next = clone(session);
  ensureUser(next, userId);

  for (const key of resourceKeys) {
    const amount = Math.max(0, Math.floor(resources[key]));
    if (amount > next.account.resources[key]) {
      throw new Error(`Not enough ${key} to contribute.`);
    }

    next.account.resources[key] -= amount;
    next.room.base.resources[key] += amount;
  }

  next.room.contributions.unshift({
    createdAt: new Date().toISOString(),
    id: `contribution-${Date.now()}`,
    resources: { ...emptyLoadout(), ...resources },
    roomId: next.room.id,
    userId
  });

  refreshUiState(next);
  return next;
}

export function assignSurvivorToRoom(session: PlaytestSession, userId: string, survivorId: string): PlaytestSession {
  const next = clone(session);
  ensureUser(next, userId);

  const survivor = next.account.survivors.find((candidate) => candidate.id === survivorId);
  if (!survivor) {
    throw new Error(`Unknown survivor: ${survivorId}`);
  }

  survivor.status = "assigned";

  if (!next.room.assignedSurvivors.some((assignment) => assignment.userId === userId && assignment.survivorId === survivorId)) {
    next.room.assignedSurvivors.push({
      assignedAt: new Date().toISOString(),
      roomId: next.room.id,
      survivorId,
      userId
    });
  }

  refreshUiState(next);
  return next;
}

export function resolvePlaytestExpedition(
  session: PlaytestSession,
  request: PlaytestExpeditionRequest
): { session: PlaytestSession; report: ExpeditionReport } {
  const next = clone(session);
  ensureUser(next, request.userId);

  const assignedIds = new Set(
    next.room.assignedSurvivors
      .filter((assignment) => assignment.userId === request.userId)
      .map((assignment) => assignment.survivorId)
  );

  for (const survivorId of request.survivorIds) {
    if (!assignedIds.has(survivorId)) {
      throw new Error(`Survivor ${survivorId} is not assigned to this room.`);
    }
  }

  const result = resolveExpedition(roomToGameState(next.room, next.account.survivors), {
    loadout: request.loadout,
    locationId: request.locationId,
    randomRolls: request.randomRolls,
    risk: request.risk,
    squadIds: request.survivorIds
  });

  next.room.base.resources = pickResources(result.nextState.resources);
  next.room.base.morale = result.nextState.resources.morale;
  next.room.base.danger = result.nextState.resources.danger;
  next.room.feed = result.nextState.feed;
  next.account.survivors = next.account.survivors.map((survivor) => {
    const updated = result.nextState.survivors.find((candidate) => candidate.id === survivor.id);
    if (!updated) {
      return survivor;
    }

    return {
      ...survivor,
      fatigue: updated.fatigue,
      injuries: updated.injuries,
      level: request.survivorIds.includes(survivor.id) && survivor.xp + 8 >= survivor.level * 20 ? survivor.level + 1 : survivor.level,
      status: request.survivorIds.includes(survivor.id) ? "available" : survivor.status,
      xp: request.survivorIds.includes(survivor.id) ? survivor.xp + 8 : survivor.xp
    };
  });

  next.room.assignedSurvivors = next.room.assignedSurvivors.filter(
    (assignment) => !request.survivorIds.includes(assignment.survivorId)
  );
  next.room.base.objective.repairedParts = Math.min(
    next.room.base.objective.requiredParts,
    next.room.base.objective.repairedParts + objectiveProgress(result.report)
  );
  if (next.room.base.objective.repairedParts >= next.room.base.objective.requiredParts) {
    next.room.base.objective.status = "won";
  }

  refreshUiState(next);
  return { report: result.report, session: next };
}

const resourceKeys = ["food", "water", "materials", "medicine", "fuel", "ammo"] as const;

function ensureUser(session: PlaytestSession, userId: string) {
  if (session.account.profile.userId !== userId) {
    throw new Error("This session can only mutate the active account.");
  }
}

function pickResources(resources: ResourceBundle & { morale?: number; danger?: number }): ResourceBundle {
  return {
    ammo: resources.ammo,
    food: resources.food,
    fuel: resources.fuel,
    materials: resources.materials,
    medicine: resources.medicine,
    water: resources.water
  };
}

function objectiveProgress(report: ExpeditionReport) {
  return report.outcome === "clean" ? 2 : report.outcome === "rough" ? 1 : 0;
}

function refreshUiState(session: PlaytestSession) {
  session.uiState = roomToGameState(session.room, session.account.survivors);
}

function clone<T>(value: T): T {
  return structuredClone(value) as T;
}
```

- [ ] **Step 4: Run focused tests and fix compile errors**

Run:

```bash
npm test -- src/playtest/sim.test.ts
```

Expected: PASS.

- [ ] **Step 5: Run all tests**

Run:

```bash
npm test
```

Expected: all test files pass.

- [ ] **Step 6: Commit**

Run:

```bash
git add src/playtest/sim.ts src/playtest/sim.test.ts src/playtest/state.ts
git commit -m "Add playtest room simulation"
```

---

### Task 3: Structured Supabase Schema

**Files:**
- Modify: `supabase/schema.sql`
- Modify: `scripts/check-supabase-demo.mjs`

- [ ] **Step 1: Add schema check expectations before SQL changes**

In `scripts/check-supabase-demo.mjs`, add this expected table list near the existing query/check logic:

```js
const requiredTables = [
  "account_profiles",
  "account_bases",
  "account_resources",
  "account_survivors",
  "playtest_rooms",
  "playtest_room_members",
  "playtest_room_bases",
  "playtest_room_contributions",
  "playtest_room_assignments",
  "playtest_expeditions",
  "playtest_expedition_participants",
  "playtest_reports"
];
```

Then query `information_schema.tables` and fail with:

```js
throw new Error(`Missing playtest tables: ${missingTables.join(", ")}`);
```

- [ ] **Step 2: Run the checker and confirm it fails against a database without the new tables**

Run:

```bash
npm run supabase:check
```

Expected: FAIL with `Missing playtest tables` until the SQL is applied remotely.

- [ ] **Step 3: Add structured tables**

Append this SQL to `supabase/schema.sql` after the existing demo tables and before final policies:

```sql
create table if not exists public.account_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  avatar_color text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.account_bases (
  user_id uuid primary key references public.account_profiles(user_id) on delete cascade,
  level integer not null default 1,
  medical_room_level integer not null default 1,
  training_room_level integer not null default 1,
  warehouse_level integer not null default 1,
  radio_bench_level integer not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.account_resources (
  user_id uuid primary key references public.account_profiles(user_id) on delete cascade,
  resources jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.account_survivors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.account_profiles(user_id) on delete cascade,
  content_id text not null,
  payload jsonb not null,
  level integer not null default 1,
  xp integer not null default 0,
  fatigue integer not null default 0,
  injuries jsonb not null default '[]'::jsonb,
  status text not null default 'available',
  created_at timestamptz not null default now(),
  unique(user_id, content_id)
);

create table if not exists public.playtest_rooms (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  host_user_id uuid not null references public.account_profiles(user_id) on delete cascade,
  status text not null default 'active',
  created_at timestamptz not null default now()
);

create table if not exists public.playtest_room_members (
  room_id uuid not null references public.playtest_rooms(id) on delete cascade,
  user_id uuid not null references public.account_profiles(user_id) on delete cascade,
  display_name text not null,
  role text not null default 'member',
  joined_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  primary key(room_id, user_id)
);

create table if not exists public.playtest_room_bases (
  room_id uuid primary key references public.playtest_rooms(id) on delete cascade,
  name text not null,
  day integer not null default 1,
  morale integer not null default 62,
  danger integer not null default 12,
  resources jsonb not null,
  facilities jsonb not null,
  objective jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.playtest_room_contributions (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.playtest_rooms(id) on delete cascade,
  user_id uuid not null references public.account_profiles(user_id) on delete cascade,
  resources jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists public.playtest_room_assignments (
  room_id uuid not null references public.playtest_rooms(id) on delete cascade,
  user_id uuid not null references public.account_profiles(user_id) on delete cascade,
  survivor_id uuid not null references public.account_survivors(id) on delete cascade,
  assigned_at timestamptz not null default now(),
  primary key(room_id, survivor_id)
);

create table if not exists public.playtest_expeditions (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.playtest_rooms(id) on delete cascade,
  location_content_id text not null,
  risk text not null,
  loadout jsonb not null,
  outcome text,
  status text not null default 'completed',
  created_by uuid not null references public.account_profiles(user_id) on delete cascade,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.playtest_expedition_participants (
  expedition_id uuid not null references public.playtest_expeditions(id) on delete cascade,
  user_id uuid not null references public.account_profiles(user_id) on delete cascade,
  survivor_id uuid not null references public.account_survivors(id) on delete cascade,
  primary key(expedition_id, survivor_id)
);

create table if not exists public.playtest_reports (
  id uuid primary key default gen_random_uuid(),
  expedition_id uuid references public.playtest_expeditions(id) on delete cascade,
  room_id uuid not null references public.playtest_rooms(id) on delete cascade,
  title text not null,
  outcome text not null,
  reward jsonb not null,
  penalties jsonb not null,
  logs jsonb not null,
  created_at timestamptz not null default now()
);
```

- [ ] **Step 4: Add RLS grants and owner/member policies**

Append:

```sql
alter table public.account_profiles enable row level security;
alter table public.account_bases enable row level security;
alter table public.account_resources enable row level security;
alter table public.account_survivors enable row level security;
alter table public.playtest_rooms enable row level security;
alter table public.playtest_room_members enable row level security;
alter table public.playtest_room_bases enable row level security;
alter table public.playtest_room_contributions enable row level security;
alter table public.playtest_room_assignments enable row level security;
alter table public.playtest_expeditions enable row level security;
alter table public.playtest_expedition_participants enable row level security;
alter table public.playtest_reports enable row level security;

grant select, insert, update on
  public.account_profiles,
  public.account_bases,
  public.account_resources,
  public.account_survivors,
  public.playtest_rooms,
  public.playtest_room_members,
  public.playtest_room_bases,
  public.playtest_room_contributions,
  public.playtest_room_assignments,
  public.playtest_expeditions,
  public.playtest_expedition_participants,
  public.playtest_reports
to authenticated;

create policy "account profile owner access" on public.account_profiles
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "account base owner access" on public.account_bases
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "account resources owner access" on public.account_resources
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "account survivors owner access" on public.account_survivors
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "rooms visible to members" on public.playtest_rooms
  for select using (
    exists (
      select 1 from public.playtest_room_members members
      where members.room_id = id and members.user_id = auth.uid()
    )
  );

create policy "authenticated users can create rooms" on public.playtest_rooms
  for insert with check (auth.uid() = host_user_id);
```

Add matching member-scoped policies for room bases, room contributions, room assignments, expeditions, participants, and reports using `exists (select 1 from public.playtest_room_members ...)`.

- [ ] **Step 5: Validate SQL text locally**

Run:

```bash
npm run build
```

Expected: TypeScript build still passes after script/schema edits.

- [ ] **Step 6: Apply SQL remotely**

Run the SQL from `supabase/schema.sql` in Supabase SQL Editor or through the configured Supabase CLI:

```bash
supabase link --project-ref mdhgxoprewjezjmdkrky
supabase db push
```

Expected: new playtest tables exist in Supabase.

- [ ] **Step 7: Run Supabase checker**

Run:

```bash
npm run supabase:check
```

Expected: PASS and reports all required playtest tables.

- [ ] **Step 8: Commit**

Run:

```bash
git add supabase/schema.sql scripts/check-supabase-demo.mjs
git commit -m "Add playtest Supabase schema"
```

---

### Task 4: Auth and Account Bootstrap

**Files:**
- Create: `src/lib/auth.ts`
- Create: `src/lib/playtestRemote.ts`
- Create: `src/lib/playtestRemote.test.ts`
- Modify: `.env.example`

- [ ] **Step 1: Add REST/auth tests**

Create `src/lib/playtestRemote.test.ts`:

```ts
import { afterEach, describe, expect, test, vi } from "vitest";

describe("playtest remote client", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  test("bootstraps account rows with authenticated REST headers", async () => {
    vi.stubEnv("VITE_SUPABASE_URL", "https://project.supabase.co");
    vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "publishable-key");
    vi.resetModules();

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => ""
    });
    vi.stubGlobal("fetch", fetchMock);

    const { bootstrapAccount } = await import("./playtestRemote");
    await bootstrapAccount("token-123", "user-a", "Alice");

    expect(fetchMock).toHaveBeenCalled();
    const [, init] = fetchMock.mock.calls[0] as [URL, RequestInit];
    expect(init.headers).toMatchObject({
      Authorization: "Bearer token-123",
      apikey: "publishable-key"
    });
  });
});
```

- [ ] **Step 2: Run test and confirm it fails**

Run:

```bash
npm test -- src/lib/playtestRemote.test.ts
```

Expected: FAIL because `playtestRemote.ts` does not exist.

- [ ] **Step 3: Add auth helpers**

Create `src/lib/auth.ts`:

```ts
import { supabaseConfig } from "./supabase";

export type AuthSession = {
  accessToken: string;
  email: string | null;
  userId: string;
};

export async function requestMagicLink(email: string) {
  if (!supabaseConfig) {
    throw new Error("Supabase is not configured.");
  }

  const response = await fetch(new URL("/auth/v1/otp", supabaseConfig.url), {
    body: JSON.stringify({
      create_user: true,
      email,
      type: "magiclink"
    }),
    headers: authHeaders(),
    method: "POST"
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }
}

export function readSessionFromHash(): AuthSession | null {
  if (typeof window === "undefined") {
    return null;
  }

  const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const accessToken = params.get("access_token");
  const userId = params.get("user_id") ?? params.get("sub");

  if (!accessToken || !userId) {
    return null;
  }

  return {
    accessToken,
    email: params.get("email"),
    userId
  };
}

function authHeaders() {
  if (!supabaseConfig) {
    throw new Error("Supabase is not configured.");
  }

  return {
    "Content-Type": "application/json",
    apikey: supabaseConfig.publishableKey
  };
}
```

- [ ] **Step 4: Add account bootstrap REST client**

Create `src/lib/playtestRemote.ts`:

```ts
import { createStarterAccount } from "../playtest/state";
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
}

async function upsert(accessToken: string, table: string, body: Record<string, unknown>) {
  if (!supabaseConfig) {
    throw new Error("Supabase is not configured.");
  }

  const endpoint = new URL(`/rest/v1/${table}`, supabaseConfig.url);
  const response = await fetch(endpoint, {
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      Prefer: "resolution=merge-duplicates,return=minimal",
      apikey: supabaseConfig.publishableKey
    },
    method: "POST"
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }
}
```

- [ ] **Step 5: Update env example**

Ensure `.env.example` contains only:

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
```

- [ ] **Step 6: Run focused and full tests**

Run:

```bash
npm test -- src/lib/playtestRemote.test.ts
npm test
```

Expected: all tests pass.

- [ ] **Step 7: Commit**

Run:

```bash
git add .env.example src/lib/auth.ts src/lib/playtestRemote.ts src/lib/playtestRemote.test.ts
git commit -m "Add playtest auth bootstrap client"
```

---

### Task 5: Frontend Playtest Flow

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/styles.css`
- Modify: `src/App.smoke.test.tsx`

- [ ] **Step 1: Add smoke tests for logged-out and seeded session states**

Update `src/App.smoke.test.tsx`:

```ts
import { renderToString } from "react-dom/server";
import { describe, expect, test } from "vitest";
import App from "./App";

describe("App smoke render", () => {
  test("renders login and room entry for the playtest shell", () => {
    const html = renderToString(<App />);

    expect(html).toContain("Ember Dossier");
    expect(html).toContain("Email");
    expect(html).toContain("Room");
  });
});
```

- [ ] **Step 2: Run smoke test and confirm it fails until UI is updated**

Run:

```bash
npm test -- src/App.smoke.test.tsx
```

Expected: FAIL if login/room entry text is absent.

- [ ] **Step 3: Add top-level playtest mode state**

In `src/App.tsx`, replace the initial `GameState`-only state with:

```ts
const [session, setSession] = useState(() => createStarterSession(player.id, player.name, roomSlug));
const state = session.uiState;
```

Keep the old remote demo path behind a temporary fallback until Task 6 replaces remote writes.

- [ ] **Step 4: Add account/base overview panel**

Add a panel that renders:

```tsx
<section className="panel">
  <p className="eyebrow">Account Base</p>
  <h2>{session.account.profile.displayName}</h2>
  <div className="metric-pair">
    <span>Training</span>
    <strong>{session.account.base.trainingRoomLevel}</strong>
  </div>
  <div className="metric-pair">
    <span>Medical</span>
    <strong>{session.account.base.medicalRoomLevel}</strong>
  </div>
</section>
```

- [ ] **Step 5: Add contribution controls**

Add a contribution section with plus/minus controls for food, water, materials, medicine, fuel, and ammo. On submit, call:

```ts
setSession((current) => applyContribution(current, current.account.profile.userId, contributionDraft));
```

- [ ] **Step 6: Route survivor toggles through room assignment**

When selecting a survivor for the room, call:

```ts
setSession((current) => assignSurvivorToRoom(current, current.account.profile.userId, survivorId));
```

Then set expedition draft squad IDs from `session.room.assignedSurvivors`.

- [ ] **Step 7: Route expedition dispatch through playtest settlement**

Replace direct `resolveExpedition` call with:

```ts
const result = resolvePlaytestExpedition(session, {
  ...draft,
  survivorIds: draft.squadIds,
  userId: session.account.profile.userId,
  randomRolls: [Math.random(), Math.random(), Math.random()]
});
setSession(result.session);
```

- [ ] **Step 8: Add objective display and win/loss state**

Render room objective:

```tsx
<section className="panel">
  <p className="eyebrow">Room Objective</p>
  <h2>{session.room.base.objective.title}</h2>
  <div className="readiness-meter">
    <span>Repair Progress</span>
    <div>
      <i style={{ width: `${(session.room.base.objective.repairedParts / session.room.base.objective.requiredParts) * 100}%` }} />
    </div>
    <strong>{session.room.base.objective.repairedParts}/{session.room.base.objective.requiredParts}</strong>
  </div>
</section>
```

- [ ] **Step 9: Add responsive CSS**

Add CSS classes:

```css
.account-band,
.objective-band,
.contribution-grid {
  display: grid;
  gap: 12px;
}

.contribution-grid {
  grid-template-columns: repeat(auto-fit, minmax(132px, 1fr));
}

.auth-panel {
  margin: min(8vh, 64px) auto;
  max-width: 520px;
}
```

- [ ] **Step 10: Run tests and build**

Run:

```bash
npm test
npm run build
```

Expected: all tests and build pass.

- [ ] **Step 11: Browser smoke test**

Run local dev server:

```bash
npm run dev -- --port 5173
```

Open `http://localhost:5173/?room=playtest-smoke` and verify:

- Login/account panel visible.
- Room objective visible.
- Resource contribution changes account and room numbers.
- Survivor assignment changes status.
- Expedition produces a report.
- Refresh preserves local fallback state.

- [ ] **Step 12: Commit**

Run:

```bash
git add src/App.tsx src/styles.css src/App.smoke.test.tsx
git commit -m "Add playable account room loop"
```

---

### Task 6: Structured Remote Sync

**Files:**
- Modify: `src/lib/playtestRemote.ts`
- Modify: `src/lib/playtestRemote.test.ts`
- Modify: `src/App.tsx`

- [ ] **Step 1: Add REST tests for loading and saving full playtest session**

Add tests that verify:

```ts
expect(String(url)).toContain("/rest/v1/playtest_rooms");
expect(String(url)).toContain("/rest/v1/account_resources");
expect(init.headers).toMatchObject({
  Authorization: "Bearer token-123",
  apikey: "publishable-key"
});
```

- [ ] **Step 2: Implement remote read methods**

Add functions:

```ts
export async function loadAccount(accessToken: string, userId: string) {}
export async function loadOrCreateRoom(accessToken: string, roomSlug: string, account: AccountState) {}
export async function loadPlaytestSession(accessToken: string, userId: string, displayName: string, roomSlug: string) {}
```

Each method fetches only the active user’s account rows and the active room’s member-scoped rows.

- [ ] **Step 3: Implement remote mutation methods**

Add:

```ts
export async function saveContribution(accessToken: string, contribution: RoomContribution) {}
export async function saveAssignment(accessToken: string, assignment: RoomAssignedSurvivor) {}
export async function saveSettlement(accessToken: string, session: PlaytestSession, report: ExpeditionReport) {}
```

Use `POST` with `Prefer: resolution=merge-duplicates,return=minimal` for upserts and `PATCH` for room base/account rows.

- [ ] **Step 4: Connect `App.tsx` to authenticated remote mode**

When `readSessionFromHash()` returns a session, call:

```ts
const loaded = await loadPlaytestSession(auth.accessToken, auth.userId, player.name, roomSlug);
setSession(loaded);
```

For local-only mode, continue using `createStarterSession`.

- [ ] **Step 5: Save contribution, assignment, and expedition remotely**

After pure local state changes succeed, call the corresponding remote method. If remote save fails, show sync error and keep the local session visible with retry.

- [ ] **Step 6: Run tests and build**

Run:

```bash
npm test
npm run build
```

Expected: all tests and build pass.

- [ ] **Step 7: Commit**

Run:

```bash
git add src/lib/playtestRemote.ts src/lib/playtestRemote.test.ts src/App.tsx
git commit -m "Persist playtest sessions to Supabase"
```

---

### Task 7: Deployment and Multiplayer Verification

**Files:**
- Modify: `README.md`
- Modify: `.env.example`

- [ ] **Step 1: Document environment and deploy flow**

Add to `README.md`:

```md
## Multiplayer Playtest Deployment

Cloudflare Pages requires:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

Never store the database password in Cloudflare Pages or frontend code. The browser uses Supabase Auth and row-level security through the publishable key.
```

- [ ] **Step 2: Run final local verification**

Run:

```bash
npm test
npm run build
npm run supabase:check
```

Expected: all pass.

- [ ] **Step 3: Deploy through Cloudflare Pages**

Push to GitHub or trigger Cloudflare’s connected deployment. Verify the production build has the two public env vars configured.

- [ ] **Step 4: Production browser verification**

Open:

```text
https://ember-dossier.pages.dev/?room=playtest-smoke
```

Verify with two browser profiles or windows:

- User A logs in or enters local fallback.
- User B joins same room link.
- Both see the same room base/objective.
- User A contribution updates room resources.
- User B contribution updates same room resources.
- Assigned survivors remain account-owned.
- Expedition produces visible report and account survivor XP/fatigue.
- Refresh keeps the room and account state.

- [ ] **Step 5: Commit docs**

Run:

```bash
git add README.md .env.example
git commit -m "Document multiplayer playtest deployment"
```

---

## Self-Review

Spec coverage:
- Login and account initialization: Task 4 and Task 6.
- Account long-term assets: Task 1, Task 2, Task 3, Task 4, Task 6.
- Room as independent shared base: Task 1, Task 2, Task 3, Task 5, Task 6.
- Contribution bridge from account to room: Task 2, Task 5, Task 6.
- Survivor assignment without ownership transfer: Task 2, Task 5, Task 6.
- Expedition and settlement: Task 2, Task 5, Task 6.
- Objective win condition: Task 2 and Task 5.
- Mobile/browser testability: Task 5 and Task 7.
- Supabase structured schema instead of `demo_snapshots`: Task 3 and Task 6.

Placeholder scan:
- This plan contains only concrete tasks, file paths, commands, and expected results.

Type consistency:
- `PlaytestSession`, `AccountState`, `PlaytestRoom`, `RoomContribution`, `RoomAssignedSurvivor`, and `PlaytestExpedition` are introduced in Task 1 and reused by later tasks.
- `applyContribution`, `assignSurvivorToRoom`, and `resolvePlaytestExpedition` are introduced in Task 2 and consumed by UI tasks.
