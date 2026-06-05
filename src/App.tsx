import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  Archive,
  BookOpen,
  ClipboardList,
  Copy,
  Home,
  Link,
  Minus,
  Plus,
  RotateCcw,
  Send,
  Shield,
  Users,
  Wrench
} from "lucide-react";
import { locationFamilyLabels, resourceKeys, resourceLabels, riskDescriptions, riskLabels, statLabels } from "./game/labels";
import { clearDemoState, createInitialState, loadDemoState, saveDemoState } from "./game/state";
import { resolveExpedition } from "./game/sim";
import type { GameState, ResourceBundle, ResourceKey, RiskStrategy } from "./game/types";
import {
  createRoomMeta,
  loadRemoteDemoState,
  saveRemoteDemoState,
  touchRemotePlayer,
  type RoomMeta,
  type RoomPlayer
} from "./lib/remoteState";
import {
  createRoomSlug,
  formatLastSeen,
  getInitialRoomSlug,
  getRoomShareLink,
  loadLocalPlayer,
  renameLocalPlayer,
  setRoomSlugInUrl
} from "./lib/multiplayer";
import { hasSupabaseConfig } from "./lib/supabase";

type ViewKey = "overview" | "survivors" | "expedition" | "reports" | "facilities" | "members" | "archive";

type ExpeditionDraft = {
  squadIds: string[];
  locationId: string;
  risk: RiskStrategy;
  loadout: ResourceBundle;
};

type SyncStatus = "local" | "loading" | "initialized" | "saving" | "synced" | "error";

const syncStatusLabels: Record<SyncStatus, string> = {
  local: "本地模式",
  loading: "读取数据库",
  initialized: "数据库已初始化",
  saving: "同步中",
  synced: "数据库已同步",
  error: "数据库未连接"
};

const views: Array<{ key: ViewKey; label: string; icon: typeof Home }> = [
  { key: "overview", label: "基地总览", icon: Home },
  { key: "survivors", label: "幸存者", icon: Users },
  { key: "expedition", label: "远征准备", icon: Send },
  { key: "reports", label: "战报动态", icon: ClipboardList },
  { key: "facilities", label: "设施", icon: Wrench },
  { key: "members", label: "成员", icon: Shield },
  { key: "archive", label: "档案", icon: Archive }
];

const defaultLoadout: ResourceBundle = {
  food: 1,
  water: 1,
  materials: 0,
  medicine: 1,
  fuel: 1,
  ammo: 1
};

export default function App() {
  const [state, setState] = useState<GameState>(() => loadDemoState());
  const [roomSlug, setRoomSlug] = useState(() => getInitialRoomSlug());
  const [player, setPlayer] = useState<RoomPlayer>(() => loadLocalPlayer());
  const [roomMeta, setRoomMeta] = useState<RoomMeta>(() => createRoomMeta(player));
  const [view, setView] = useState<ViewKey>("overview");
  const [latestReportId, setLatestReportId] = useState<string | null>(null);
  const [remoteReady, setRemoteReady] = useState(!hasSupabaseConfig);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(hasSupabaseConfig ? "loading" : "local");
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncRetryCount, setSyncRetryCount] = useState(0);
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "failed">("idle");
  const applyingRemoteState = useRef(false);
  const latestRemoteUpdatedAt = useRef<string | null>(null);
  const [draft, setDraft] = useState<ExpeditionDraft>(() => ({
    squadIds: ["lin", "mara", "otto"],
    locationId: "water-plant",
    risk: "standard",
    loadout: defaultLoadout
  }));

  async function hydrateRemoteState() {
    if (!hasSupabaseConfig) {
      return;
    }

    setSyncStatus("loading");
    setSyncError(null);

    try {
      const result = await loadRemoteDemoState(roomSlug, createInitialState(), player);

      applyingRemoteState.current = true;
      latestRemoteUpdatedAt.current = result.updatedAt;
      setState(result.state);
      setRoomMeta(result.meta);
      saveDemoState(result.state);
      setRemoteReady(true);
      setSyncRetryCount(0);
      setSyncStatus(result.mode === "initialized" ? "initialized" : "synced");
    } catch (error) {
      console.error("Failed to load Supabase demo state", error);
      setRemoteReady(false);
      setSyncError(describeSyncError(error));
      setSyncRetryCount((count) => count + 1);
      setSyncStatus("error");
    }
  }

  async function pushRemoteState(nextState: GameState) {
    if (!hasSupabaseConfig || !remoteReady) {
      return;
    }

    setSyncStatus("saving");
    setSyncError(null);

    try {
      await saveRemoteDemoState(roomSlug, nextState, roomMeta, player);
      setSyncRetryCount(0);
      setSyncStatus("synced");
    } catch (error) {
      console.error("Failed to save Supabase demo state", error);
      setSyncError(describeSyncError(error));
      setSyncRetryCount((count) => count + 1);
      setSyncStatus("error");
    }
  }

  function retryRemoteSync() {
    if (!hasSupabaseConfig) {
      return;
    }

    if (remoteReady) {
      void pushRemoteState(state);
      return;
    }

    void hydrateRemoteState();
  }

  async function copyRoomLink() {
    const linkToCopy = getRoomShareLink(roomSlug);

    try {
      await navigator.clipboard.writeText(linkToCopy);
      setCopyStatus("copied");
    } catch {
      setCopyStatus("failed");
    }

    window.setTimeout(() => setCopyStatus("idle"), 1800);
  }

  function createNewRoom() {
    const nextRoomSlug = createRoomSlug();

    latestRemoteUpdatedAt.current = null;
    setRoomSlug(nextRoomSlug);
    setView("overview");
    setLatestReportId(null);
    setState(createInitialState());
    setRoomMeta(createRoomMeta(player));
  }

  function updatePlayerName(name: string) {
    const updatedPlayer = renameLocalPlayer(player, name);
    setPlayer(updatedPlayer);
    setRoomMeta((current) => ({
      ...current,
      players: {
        ...current.players,
        [updatedPlayer.id]: {
          ...updatedPlayer,
          lastSeenAt: new Date().toISOString()
        }
      }
    }));
  }

  useEffect(() => {
    setRoomSlugInUrl(roomSlug);
    latestRemoteUpdatedAt.current = null;
    setRemoteReady(!hasSupabaseConfig);
    void hydrateRemoteState();
  }, [roomSlug]);

  useEffect(() => {
    if (!hasSupabaseConfig || syncStatus !== "error" || syncRetryCount >= 3) {
      return;
    }

    const retryTimer = window.setTimeout(retryRemoteSync, 4000);

    return () => {
      window.clearTimeout(retryTimer);
    };
  }, [remoteReady, roomSlug, state, syncRetryCount, syncStatus]);

  useEffect(() => {
    saveDemoState(state);

    if (applyingRemoteState.current) {
      applyingRemoteState.current = false;
      return;
    }

    if (!hasSupabaseConfig || !remoteReady) {
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(() => {
      setSyncStatus("saving");
      setSyncError(null);
      void saveRemoteDemoState(roomSlug, state, roomMeta, player)
        .then(() => {
          if (!cancelled) {
            setSyncRetryCount(0);
            setSyncStatus("synced");
          }
        })
        .catch((error) => {
          console.error("Failed to save Supabase demo state", error);

          if (!cancelled) {
            setSyncError(describeSyncError(error));
            setSyncRetryCount((count) => count + 1);
            setSyncStatus("error");
          }
        });
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [player, remoteReady, roomSlug, state]);

  useEffect(() => {
    if (!hasSupabaseConfig || !remoteReady) {
      return;
    }

    let cancelled = false;
    const poll = () => {
      void loadRemoteDemoState(roomSlug, state, player)
        .then((result) => {
          if (cancelled) {
            return;
          }

          setRoomMeta(result.meta);

          if (result.updatedAt && result.updatedAt !== latestRemoteUpdatedAt.current) {
            latestRemoteUpdatedAt.current = result.updatedAt;
            applyingRemoteState.current = true;
            setState(result.state);
            saveDemoState(result.state);
            setSyncStatus("synced");
          }
        })
        .catch((error) => {
          console.error("Failed to poll Supabase demo state", error);

          if (!cancelled) {
            setSyncError(describeSyncError(error));
            setSyncStatus("error");
          }
        });
    };

    const pollTimer = window.setInterval(poll, 5000);
    return () => {
      cancelled = true;
      window.clearInterval(pollTimer);
    };
  }, [player, remoteReady, roomSlug, state]);

  useEffect(() => {
    if (!hasSupabaseConfig || !remoteReady) {
      return;
    }

    const heartbeatTimer = window.setInterval(() => {
      void touchRemotePlayer(roomSlug, player).catch((error) => {
        console.error("Failed to update room presence", error);
      });
    }, 15000);

    return () => {
      window.clearInterval(heartbeatTimer);
    };
  }, [player, remoteReady, roomSlug]);

  const selectedLocation = state.locations.find((location) => location.id === draft.locationId) ?? state.locations[0];
  const selectedSquad = state.survivors.filter((survivor) => draft.squadIds.includes(survivor.id));
  const squadReady = draft.squadIds.length >= 3 && draft.squadIds.length <= 5;
  const canAffordLoadout = resourceKeys.every((key) => state.resources[key] >= draft.loadout[key]);
  const readiness = useMemo(() => calculateReadiness(selectedSquad, selectedLocation.recommendedStats), [selectedLocation, selectedSquad]);
  const roomPlayers = useMemo(
    () => Object.values(roomMeta.players).sort((left, right) => right.lastSeenAt.localeCompare(left.lastSeenAt)),
    [roomMeta.players]
  );

  function toggleSurvivor(id: string) {
    setDraft((current) => {
      const alreadySelected = current.squadIds.includes(id);
      if (alreadySelected) {
        return { ...current, squadIds: current.squadIds.filter((survivorId) => survivorId !== id) };
      }

      if (current.squadIds.length >= 5) {
        return current;
      }

      return { ...current, squadIds: [...current.squadIds, id] };
    });
  }

  function updateLoadout(key: ResourceKey, delta: number) {
    setDraft((current) => ({
      ...current,
      loadout: {
        ...current.loadout,
        [key]: Math.max(0, Math.min(state.resources[key], current.loadout[key] + delta))
      }
    }));
  }

  function dispatchExpedition() {
    if (!squadReady || !canAffordLoadout) {
      return;
    }

    const result = resolveExpedition(state, {
      ...draft,
      randomRolls: [Math.random(), Math.random(), Math.random()]
    });

    setState(result.nextState);
    setLatestReportId(result.report.id);
    setView("reports");
    setDraft((current) => ({
      ...current,
      loadout: defaultLoadout
    }));
  }

  function resetDemo() {
    const initialState = createInitialState();

    clearDemoState();
    setState(initialState);
    setLatestReportId(null);
    setView("overview");
    setDraft({
      squadIds: ["lin", "mara", "otto"],
      locationId: "water-plant",
      risk: "standard",
      loadout: defaultLoadout
    });

    if (hasSupabaseConfig && remoteReady) {
      void pushRemoteState(initialState);
    }
  }

  return (
    <main className="app-shell">
      <aside className="side-rail">
        <div className="brand-lockup">
          <span className="stamp">ED-12</span>
          <div>
            <p>余烬档案</p>
            <strong>Ember Dossier</strong>
          </div>
        </div>

        <nav className="nav-list" aria-label="主导航">
          {views.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.key}
                className={view === item.key ? "nav-item active" : "nav-item"}
                type="button"
                onClick={() => setView(item.key)}
              >
                <Icon size={18} aria-hidden="true" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="room-card">
          <span>当前房间</span>
          <strong>{roomSlug}</strong>
          <div className="room-actions">
            <button type="button" onClick={copyRoomLink} title="复制邀请链接">
              <Copy size={15} aria-hidden="true" />
              {copyStatus === "copied" ? "已复制" : copyStatus === "failed" ? "复制失败" : "邀请"}
            </button>
            <button type="button" onClick={createNewRoom} title="创建新房间">
              <Link size={15} aria-hidden="true" />
              新房
            </button>
          </div>
        </div>

        <button className="ghost-button" type="button" onClick={resetDemo}>
          <RotateCcw size={17} aria-hidden="true" />
          重置 demo
        </button>
      </aside>

      <section className="workspace">
        <header className="top-bar">
          <div>
            <p className="eyebrow">共享避难所 / 第 12 日</p>
            <h1>{views.find((item) => item.key === view)?.label}</h1>
          </div>
          <div className="system-status">
            <span className={syncStatus === "error" ? "sync-pill error" : "sync-pill"} title={syncError ?? undefined}>
              {syncStatusLabels[syncStatus]}
            </span>
            {syncStatus === "error" && hasSupabaseConfig && (
              <button className="sync-retry" type="button" onClick={retryRemoteSync}>
                重试
              </button>
            )}
            <span>房间 {roomSlug}</span>
            <span>在线 {roomPlayers.length}</span>
            <span>士气 {state.resources.morale}</span>
            <span>危险 {state.resources.danger}</span>
          </div>
        </header>

        {view === "overview" && <Overview state={state} goExpedition={() => setView("expedition")} />}
        {view === "survivors" && <Survivors state={state} selectedIds={draft.squadIds} onToggle={toggleSurvivor} />}
        {view === "expedition" && (
          <ExpeditionPrep
            state={state}
            draft={draft}
            selectedLocation={selectedLocation}
            readiness={readiness}
            squadReady={squadReady}
            canAffordLoadout={canAffordLoadout}
            onToggleSurvivor={toggleSurvivor}
            onLocationChange={(locationId) => setDraft((current) => ({ ...current, locationId }))}
            onRiskChange={(risk) => setDraft((current) => ({ ...current, risk }))}
            onLoadoutChange={updateLoadout}
            onDispatch={dispatchExpedition}
          />
        )}
        {view === "reports" && <Reports state={state} latestReportId={latestReportId} />}
        {view === "facilities" && <Facilities state={state} />}
        {view === "members" && (
          <RoomMembers
            player={player}
            players={roomPlayers}
            roomSlug={roomSlug}
            copyStatus={copyStatus}
            onCopyRoomLink={copyRoomLink}
            onCreateRoom={createNewRoom}
            onRenamePlayer={updatePlayerName}
          />
        )}
        {view === "archive" && <ArchiveView state={state} />}
      </section>
    </main>
  );
}

function Overview({ state, goExpedition }: { state: GameState; goExpedition: () => void }) {
  return (
    <div className="view-grid">
      <section className="panel wide">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Base resources</p>
            <h2>避难所库存</h2>
          </div>
          <button className="primary-button" type="button" onClick={goExpedition}>
            <Send size={18} aria-hidden="true" />
            准备远征
          </button>
        </div>
        <div className="resource-grid">
          {resourceKeys.map((key) => (
            <article className="resource-tile" key={key}>
              <span>{resourceLabels[key]}</span>
              <strong>{state.resources[key]}</strong>
            </article>
          ))}
        </div>
      </section>

      <section className="panel">
        <p className="eyebrow">Alerts</p>
        <h2>设施警报</h2>
        <div className="stack">
          {state.facilities.map((facility) => (
            <div className={`alert-line ${facility.status}`} key={facility.id}>
              <strong>{facility.name}</strong>
              <span>{facility.effect}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="panel wide">
        <p className="eyebrow">Recent feed</p>
        <h2>最新动态</h2>
        <div className="feed-list">
          {state.feed.slice(0, 4).map((item) => (
            <article className="feed-item" key={item.id}>
              <span>{item.timestamp}</span>
              <div>
                <strong>{item.title}</strong>
                <p>{item.body}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="panel">
        <p className="eyebrow">Squad health</p>
        <h2>可派遣人员</h2>
        <div className="metric-pair">
          <span>可用幸存者</span>
          <strong>{state.survivors.filter((survivor) => survivor.fatigue < 80).length}</strong>
        </div>
        <div className="metric-pair">
          <span>伤病记录</span>
          <strong>{state.survivors.reduce((sum, survivor) => sum + survivor.injuries.length, 0)}</strong>
        </div>
      </section>
    </div>
  );
}

function Survivors({
  state,
  selectedIds,
  onToggle
}: {
  state: GameState;
  selectedIds: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Roster</p>
          <h2>幸存者档案</h2>
        </div>
        <span className="subtle-pill">已选 {selectedIds.length}/5</span>
      </div>
      <div className="survivor-grid">
        {state.survivors.map((survivor) => (
          <article className={selectedIds.includes(survivor.id) ? "survivor-card selected" : "survivor-card"} key={survivor.id}>
            <div className="portrait-mark">{survivor.codename.slice(0, 2)}</div>
            <div className="card-copy">
              <div className="card-title-line">
                <div>
                  <h3>{survivor.name}</h3>
                  <p>{survivor.profession} / {survivor.role}</p>
                </div>
                <button className="icon-button" type="button" onClick={() => onToggle(survivor.id)} aria-label={`切换 ${survivor.name}`}>
                  {selectedIds.includes(survivor.id) ? <Minus size={17} /> : <Plus size={17} />}
                </button>
              </div>
              <p>{survivor.note}</p>
              <div className="stat-strip">
                {(["stamina", "technical", "medical", "willpower"] as const).map((stat) => (
                  <span key={stat}>{statLabels[stat]} {survivor.attributes[stat]}</span>
                ))}
              </div>
              <div className="tag-row">
                {survivor.traits.map((trait) => (
                  <span key={trait}>{trait}</span>
                ))}
                {survivor.injuries.map((injury) => (
                  <span className="danger-tag" key={injury}>{injury}</span>
                ))}
              </div>
              <div className="fatigue-line">
                <span>疲劳</span>
                <div>
                  <i style={{ width: `${survivor.fatigue}%` }} />
                </div>
                <strong>{survivor.fatigue}</strong>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function ExpeditionPrep({
  state,
  draft,
  selectedLocation,
  readiness,
  squadReady,
  canAffordLoadout,
  onToggleSurvivor,
  onLocationChange,
  onRiskChange,
  onLoadoutChange,
  onDispatch
}: {
  state: GameState;
  draft: ExpeditionDraft;
  selectedLocation: GameState["locations"][number];
  readiness: number;
  squadReady: boolean;
  canAffordLoadout: boolean;
  onToggleSurvivor: (id: string) => void;
  onLocationChange: (locationId: string) => void;
  onRiskChange: (risk: RiskStrategy) => void;
  onLoadoutChange: (key: ResourceKey, delta: number) => void;
  onDispatch: () => void;
}) {
  return (
    <div className="expedition-layout">
      <section className="panel">
        <p className="eyebrow">Step 1</p>
        <h2>选择编队</h2>
        <div className="compact-list">
          {state.survivors.map((survivor) => (
            <button
              className={draft.squadIds.includes(survivor.id) ? "pick-row selected" : "pick-row"}
              key={survivor.id}
              type="button"
              onClick={() => onToggleSurvivor(survivor.id)}
            >
              <span>{survivor.name}</span>
              <small>{survivor.profession} / 疲劳 {survivor.fatigue}</small>
            </button>
          ))}
        </div>
      </section>

      <section className="panel">
        <p className="eyebrow">Step 2</p>
        <h2>选择地点</h2>
        <div className="compact-list">
          {state.locations.map((location) => (
            <button
              className={draft.locationId === location.id ? "pick-row selected" : "pick-row"}
              key={location.id}
              type="button"
              onClick={() => onLocationChange(location.id)}
            >
              <span>{location.name}</span>
              <small>{locationFamilyLabels[location.family]} / 危险 {location.risk}</small>
            </button>
          ))}
        </div>
      </section>

      <section className="panel">
        <p className="eyebrow">Step 3</p>
        <h2>携带物资</h2>
        <div className="loadout-list">
          {resourceKeys.map((key) => (
            <div className="loadout-row" key={key}>
              <span>{resourceLabels[key]}</span>
              <div>
                <button className="icon-button" type="button" onClick={() => onLoadoutChange(key, -1)} aria-label={`减少${resourceLabels[key]}`}>
                  <Minus size={16} />
                </button>
                <strong>{draft.loadout[key]}</strong>
                <button className="icon-button" type="button" onClick={() => onLoadoutChange(key, 1)} aria-label={`增加${resourceLabels[key]}`}>
                  <Plus size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="panel">
        <p className="eyebrow">Step 4</p>
        <h2>风险策略</h2>
        <div className="risk-options">
          {(Object.keys(riskLabels) as RiskStrategy[]).map((risk) => (
            <button className={draft.risk === risk ? "risk-card selected" : "risk-card"} key={risk} type="button" onClick={() => onRiskChange(risk)}>
              <strong>{riskLabels[risk]}</strong>
              <span>{riskDescriptions[risk]}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="panel summary-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Dispatch preview</p>
            <h2>{selectedLocation.name}</h2>
          </div>
          <Activity size={24} aria-hidden="true" />
        </div>
        <p>{selectedLocation.dossier}</p>
        <div className="readiness-meter">
          <span>编队适配度</span>
          <div>
            <i style={{ width: `${Math.max(8, Math.min(100, readiness))}%` }} />
          </div>
          <strong>{Math.round(readiness)}</strong>
        </div>
        <div className="tag-row">
          {selectedLocation.tags.map((tag) => (
            <span key={tag}>{tag}</span>
          ))}
        </div>
        <button className="primary-button full-width" type="button" disabled={!squadReady || !canAffordLoadout} onClick={onDispatch}>
          <Send size={18} aria-hidden="true" />
          派遣远征
        </button>
        {!squadReady && <p className="warning-copy">需要选择 3-5 名幸存者。</p>}
        {!canAffordLoadout && <p className="warning-copy">携带物资超过基地库存。</p>}
      </section>
    </div>
  );
}

function Reports({ state, latestReportId }: { state: GameState; latestReportId: string | null }) {
  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Reports</p>
          <h2>战报与动态流</h2>
        </div>
        {latestReportId && <span className="subtle-pill">刚完成一轮远征</span>}
      </div>
      <div className="feed-list large">
        {state.feed.map((item) => (
          <article className="feed-item" key={item.id}>
            <span>{item.timestamp}</span>
            <div>
              <strong>{item.title}</strong>
              <p>{item.body}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function Facilities({ state }: { state: GameState }) {
  return (
    <section className="panel">
      <p className="eyebrow">Facilities</p>
      <h2>轻量设施管理</h2>
      <div className="facility-grid">
        {state.facilities.map((facility) => (
          <article className={`facility-card ${facility.status}`} key={facility.id}>
            <h3>{facility.name}</h3>
            <span>等级 {facility.level}</span>
            <p>{facility.effect}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function RoomMembers({
  player,
  players,
  roomSlug,
  copyStatus,
  onCopyRoomLink,
  onCreateRoom,
  onRenamePlayer
}: {
  player: RoomPlayer;
  players: RoomPlayer[];
  roomSlug: string;
  copyStatus: "idle" | "copied" | "failed";
  onCopyRoomLink: () => void;
  onCreateRoom: () => void;
  onRenamePlayer: (name: string) => void;
}) {
  return (
    <section className="panel">
      <p className="eyebrow">Room</p>
      <div className="panel-heading">
        <div>
          <h2>房间与成员</h2>
          <p className="muted-copy">同一个房间链接会共享基地、远征结果和动态流。</p>
        </div>
        <span className="subtle-pill">{roomSlug}</span>
      </div>

      <div className="room-settings">
        <label>
          <span>你的名字</span>
          <input value={player.name} onChange={(event) => onRenamePlayer(event.target.value)} />
        </label>
        <div className="room-actions large">
          <button type="button" onClick={onCopyRoomLink}>
            <Copy size={16} aria-hidden="true" />
            {copyStatus === "copied" ? "邀请链接已复制" : copyStatus === "failed" ? "复制失败" : "复制邀请链接"}
          </button>
          <button type="button" onClick={onCreateRoom}>
            <Link size={16} aria-hidden="true" />
            创建新房间
          </button>
        </div>
      </div>

      <div className="member-list">
        {players.map((roomPlayer) => (
          <div className="member-row player-row" key={roomPlayer.id}>
            <span className="player-mark" style={{ background: roomPlayer.color }} />
            <div>
              <strong>{roomPlayer.name}</strong>
              <small>{roomPlayer.id === player.id ? "你" : formatLastSeen(roomPlayer.lastSeenAt)}</small>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Members() {
  const members = [
    ["你", "房主 / 工程员"],
    ["阿周", "成员 / 侦察员"],
    ["小许", "成员 / 医疗员"]
  ];

  return (
    <section className="panel">
      <p className="eyebrow">Room</p>
      <h2>成员与权限</h2>
      <div className="member-list">
        {members.map(([name, role]) => (
          <div className="member-row" key={name}>
            <span>{name}</span>
            <strong>{role}</strong>
          </div>
        ))}
      </div>
      <p className="muted-copy">真实邀请、白名单、魔法链接登录会在 Supabase 接入后启用。</p>
    </section>
  );
}

function ArchiveView({ state }: { state: GameState }) {
  return (
    <section className="panel">
      <p className="eyebrow">Archive</p>
      <h2>档案/图鉴</h2>
      <div className="archive-grid">
        <div>
          <BookOpen size={20} aria-hidden="true" />
          <strong>{state.survivors.length}</strong>
          <span>幸存者档案</span>
        </div>
        <div>
          <BookOpen size={20} aria-hidden="true" />
          <strong>{state.locations.length}</strong>
          <span>开放地点</span>
        </div>
        <div>
          <BookOpen size={20} aria-hidden="true" />
          <strong>100</strong>
          <span>规划事件池</span>
        </div>
      </div>
    </section>
  );
}

function calculateReadiness(squad: GameState["survivors"], recommendedStats: GameState["locations"][number]["recommendedStats"]) {
  if (squad.length === 0) {
    return 0;
  }

  const total = squad.reduce((sum, survivor) => {
    const survivorScore = recommendedStats.reduce((statSum, stat) => statSum + survivor.attributes[stat], 0) / recommendedStats.length;
    return sum + survivorScore;
  }, 0);

  return total / squad.length;
}

function describeSyncError(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (error && typeof error === "object" && "message" in error && typeof error.message === "string") {
    return error.message;
  }

  return "Supabase request failed";
}
