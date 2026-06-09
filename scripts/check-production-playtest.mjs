import { existsSync, readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const productionUrl = process.env.PLAYTEST_URL ?? "https://ember-dossier.pages.dev/?room=playtest-smoke";
const defaultRoomSlug = "ember-demo";
let supabaseUrl = "";
let publishableKey = "";
export const requiredProductionStrings = [
  "游客继续",
  "创建试玩账号",
  "/api/auth/register",
  "/rest/v1/demo_snapshots",
  "房间目标",
  "撤离预案",
  "后勤预案",
  "成长：",
  "个人基地升级",
  "训练生命",
  "账号战利",
  "捐入",
  "今日指挥板",
  "出征开局预案",
  "战后复盘",
  "单页行动",
  "你的协作任务",
  "出征接入",
  "本回合建议",
  "当前可执行操作"
];

if (isMainModule()) {
  loadEnvFile(".env.local");
  loadEnvFile("../../.env.local");

  supabaseUrl = normalizeSupabaseUrl(process.env.VITE_SUPABASE_URL);
  publishableKey = cleanEnvValue(process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? process.env.VITE_SUPABASE_ANON_KEY);

  await checkProductionBundle();
  await checkPlaytestSignupEndpoint();
  await checkGuestRoomRoundTrip();
}

function isMainModule() {
  return import.meta.url === pathToFileURL(process.argv[1]).href;
}

function loadEnvFile(path) {
  if (!existsSync(path)) {
    return;
  }

  const contents = readFileSync(path, "utf8");
  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separator = trimmed.indexOf("=");
    if (separator === -1) {
      continue;
    }

    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

function normalizeSupabaseUrl(value) {
  const trimmed = cleanEnvValue(value);
  if (!trimmed) {
    return "";
  }

  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  return new URL(withProtocol).origin;
}

function cleanEnvValue(value) {
  return value?.replace(/^\uFEFF/, "").trim() ?? "";
}

async function checkProductionBundle() {
  const htmlUrl = new URL(productionUrl);
  htmlUrl.searchParams.set("smoke", String(Date.now()));
  const htmlResponse = await fetch(htmlUrl, {
    headers: {
      "Cache-Control": "no-cache"
    }
  });

  if (!htmlResponse.ok) {
    throw new Error(`Production page returned HTTP ${htmlResponse.status}.`);
  }

  const html = await htmlResponse.text();
  const assetPaths = findJavaScriptAssetPaths(html);
  if (assetPaths.length === 0) {
    throw new Error("Could not find production JavaScript assets in index.html.");
  }

  const assets = await Promise.all(assetPaths.map((assetPath) => fetchJavaScriptAsset(htmlUrl.origin, assetPath)));
  const bundleText = assets.map((asset) => asset.text).join("\n");
  const missingStrings = requiredProductionStrings.filter((text) => !bundleText.includes(text));

  if (missingStrings.length > 0) {
    throw new Error(`Production bundle is missing required playtest strings: ${missingStrings.join(", ")}`);
  }

  console.log(`Production bundle is reachable and contains playtest entry points. assets=${assetPaths.join(", ")}`);
}

export function findJavaScriptAssetPaths(html) {
  const paths = [...html.matchAll(/(?:src|href)="(\/assets\/[^"]+\.js)"/g)].map((match) => match[1]);
  return [...new Set(paths)];
}

async function fetchJavaScriptAsset(origin, assetPath) {
  const assetUrl = new URL(assetPath, origin);
  assetUrl.searchParams.set("smoke", String(Date.now()));
  const response = await fetch(assetUrl, {
    headers: {
      "Cache-Control": "no-cache"
    }
  });

  if (!response.ok) {
    throw new Error(`Production JavaScript asset ${assetPath} returned HTTP ${response.status}.`);
  }

  return {
    path: assetPath,
    text: await response.text()
  };
}

async function checkPlaytestSignupEndpoint() {
  const endpoint = new URL("/api/auth/register", productionUrl);
  const response = await fetch(endpoint, {
    body: JSON.stringify({
      password: "short",
      username: "!"
    }),
    headers: {
      "Content-Type": "application/json"
    },
    method: "POST"
  });

  const text = await response.text();
  if (response.status === 404 || !text.includes("message")) {
    throw new Error(`Playtest signup endpoint is not reachable. status=${response.status} body=${text.slice(0, 120)}`);
  }

  console.log(`Playtest signup endpoint is reachable. status=${response.status}`);
}

async function checkGuestRoomRoundTrip() {
  if (!supabaseUrl || !publishableKey) {
    throw new Error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY.");
  }

  const roomSlug = `codex-smoke-${Date.now()}`;
  const collection = await loadCollection();
  const previousRooms = { ...collection.rooms };
  const previousRevision = previousRooms[roomSlug]?.room.revision ?? 0;
  const baseState = cloneExistingGameState(previousRooms) ?? createSmokeGameState();

  collection.rooms[roomSlug] = {
    gameState: {
      ...baseState,
      resources: {
        ...baseState.resources,
        food: 77,
        water: 66
      }
    },
    room: {
      players: {
        "smoke-player-a": createSmokePlayer("smoke-player-a", "Smoke A"),
        "smoke-player-b": createSmokePlayer("smoke-player-b", "Smoke B")
      },
      revision: previousRevision + 1,
      updatedBy: "smoke-player-b",
      updatedByName: "Smoke B"
    }
  };

  await saveCollection(collection);
  const verified = await loadCollection();
  const savedRoom = verified.rooms[roomSlug];

  if (!savedRoom) {
    throw new Error("Guest room smoke write was not visible on readback.");
  }

  if (savedRoom.gameState.resources.food !== 77 || savedRoom.gameState.resources.water !== 66) {
    throw new Error("Guest room smoke readback did not preserve resource changes.");
  }

  if (!savedRoom.room.players["smoke-player-a"] || !savedRoom.room.players["smoke-player-b"]) {
    throw new Error("Guest room smoke readback did not preserve both players.");
  }

  delete verified.rooms[roomSlug];
  await saveCollection(verified);

  console.log(`Guest multiplayer snapshot round-trip succeeded. room=${roomSlug}`);
}

async function loadCollection() {
  const endpoint = createDemoSnapshotsUrl();
  endpoint.searchParams.set("select", "state");
  endpoint.searchParams.set("room_slug", `eq.${defaultRoomSlug}`);
  endpoint.searchParams.set("limit", "1");

  const response = await fetch(endpoint, {
    headers: createSupabaseHeaders()
  });

  if (!response.ok) {
    throw await createSupabaseError(response);
  }

  const rows = await response.json();
  return normalizeCollection(rows[0]?.state);
}

async function saveCollection(collection) {
  const endpoint = createDemoSnapshotsUrl();
  endpoint.searchParams.set("on_conflict", "room_slug");

  const response = await fetch(endpoint, {
    body: JSON.stringify({
      room_slug: defaultRoomSlug,
      state: collection,
      updated_at: new Date().toISOString()
    }),
    headers: createSupabaseHeaders({
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=minimal"
    }),
    method: "POST"
  });

  if (!response.ok) {
    throw await createSupabaseError(response);
  }
}

function normalizeCollection(rawState) {
  if (rawState?.version === 3 && rawState.rooms) {
    return {
      rooms: rawState.rooms,
      version: 3
    };
  }

  if (rawState?.version === 2 && rawState.gameState && rawState.room) {
    return {
      rooms: {
        [defaultRoomSlug]: {
          gameState: rawState.gameState,
          room: rawState.room
        }
      },
      version: 3
    };
  }

  if (rawState?.resources) {
    return {
      rooms: {
        [defaultRoomSlug]: {
          gameState: rawState,
          room: {
            players: {},
            revision: 0
          }
        }
      },
      version: 3
    };
  }

  return {
    rooms: {},
    version: 3
  };
}

function cloneExistingGameState(rooms) {
  const source = rooms["playtest-smoke"]?.gameState ?? rooms[defaultRoomSlug]?.gameState ?? Object.values(rooms)[0]?.gameState;
  return source ? structuredClone(source) : null;
}

function createSmokeGameState() {
  return {
    facilities: [],
    feed: [],
    locations: [],
    resources: {
      ammo: 3,
      danger: 12,
      food: 12,
      fuel: 3,
      materials: 10,
      medicine: 4,
      morale: 62,
      water: 12
    },
    survivors: []
  };
}

function createSmokePlayer(id, name) {
  const now = new Date().toISOString();
  return {
    color: id.endsWith("a") ? "#2f756c" : "#8a3c2a",
    id,
    joinedAt: now,
    lastSeenAt: now,
    name
  };
}

function createDemoSnapshotsUrl() {
  return new URL("/rest/v1/demo_snapshots", supabaseUrl);
}

function createSupabaseHeaders(extraHeaders = {}) {
  return {
    apikey: publishableKey,
    Authorization: `Bearer ${publishableKey}`,
    "X-Client-Info": "ember-dossier-smoke",
    ...extraHeaders
  };
}

async function createSupabaseError(response) {
  const text = await response.text();
  try {
    const payload = JSON.parse(text);
    return new Error(payload.message ?? payload.msg ?? payload.error_description ?? payload.error ?? text);
  } catch {
    return new Error(text || `Supabase request failed with HTTP ${response.status}`);
  }
}
