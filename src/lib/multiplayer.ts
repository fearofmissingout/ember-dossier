import { defaultRoomSlug, type RoomPlayer } from "./remoteState";

const playerStorageKey = "ember-dossier-player";
const palette = ["#2f756c", "#8a3c2a", "#7d5a9e", "#b67a24", "#426f9c", "#8d4f64"];

type StoredPlayer = {
  id: string;
  name: string;
  color: string;
  joinedAt: string;
};

export function getInitialRoomSlug() {
  if (typeof window === "undefined") {
    return defaultRoomSlug;
  }

  const params = new URLSearchParams(window.location.search);
  const candidate = params.get("room") ?? window.location.hash.replace(/^#\/?/, "");
  return sanitizeRoomSlug(candidate) || defaultRoomSlug;
}

export function setRoomSlugInUrl(roomSlug: string) {
  if (typeof window === "undefined") {
    return;
  }

  const url = new URL(window.location.href);
  url.searchParams.set("room", roomSlug);
  window.history.replaceState(null, "", url);
}

export function createRoomSlug() {
  const segment = Math.random().toString(36).slice(2, 7);
  return `room-${segment}`;
}

export function getRoomShareLink(roomSlug: string) {
  if (typeof window === "undefined") {
    return `?room=${roomSlug}`;
  }

  const url = new URL(window.location.href);
  url.searchParams.set("room", roomSlug);
  return url.toString();
}

export function loadLocalPlayer(): RoomPlayer {
  const now = new Date().toISOString();

  if (typeof localStorage === "undefined") {
    return createPlayer("摸鱼队友", now);
  }

  const saved = localStorage.getItem(playerStorageKey);
  if (saved) {
    try {
      const player = JSON.parse(saved) as StoredPlayer;
      return {
        ...player,
        lastSeenAt: now
      };
    } catch {
      localStorage.removeItem(playerStorageKey);
    }
  }

  const player = createPlayer(`队友${Math.floor(Math.random() * 90 + 10)}`, now);
  saveLocalPlayer(player);
  return player;
}

export function renameLocalPlayer(player: RoomPlayer, name: string) {
  const updated = {
    ...player,
    name: name.trim().slice(0, 14) || player.name,
    lastSeenAt: new Date().toISOString()
  };

  saveLocalPlayer(updated);
  return updated;
}

export function formatLastSeen(lastSeenAt: string) {
  const seconds = Math.max(0, Math.round((Date.now() - new Date(lastSeenAt).getTime()) / 1000));

  if (seconds < 20) {
    return "在线";
  }

  if (seconds < 60) {
    return `${seconds} 秒前`;
  }

  return `${Math.round(seconds / 60)} 分钟前`;
}

function createPlayer(name: string, now: string): RoomPlayer {
  const randomId = globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  const id = `p-${randomId}`;
  const color = palette[Math.floor(Math.random() * palette.length)];

  return {
    color,
    id,
    joinedAt: now,
    lastSeenAt: now,
    name
  };
}

function saveLocalPlayer(player: RoomPlayer) {
  if (typeof localStorage === "undefined") {
    return;
  }

  const stored: StoredPlayer = {
    color: player.color,
    id: player.id,
    joinedAt: player.joinedAt,
    name: player.name
  };
  localStorage.setItem(playerStorageKey, JSON.stringify(stored));
}

function sanitizeRoomSlug(value: string | null) {
  if (!value) {
    return "";
  }

  return value
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 32);
}
