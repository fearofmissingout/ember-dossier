import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  Archive,
  BookOpen,
  ClipboardList,
  Home,
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
import { loadRemoteDemoState, saveRemoteDemoState } from "./lib/remoteState";
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
  const [view, setView] = useState<ViewKey>("overview");
  const [latestReportId, setLatestReportId] = useState<string | null>(null);
  const [remoteReady, setRemoteReady] = useState(!hasSupabaseConfig);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(hasSupabaseConfig ? "loading" : "local");
  const [draft, setDraft] = useState<ExpeditionDraft>(() => ({
    squadIds: ["lin", "mara", "otto"],
    locationId: "water-plant",
    risk: "standard",
    loadout: defaultLoadout
  }));

  useEffect(() => {
    let cancelled = false;

    async function hydrateRemoteState() {
      if (!hasSupabaseConfig) {
        return;
      }

      setSyncStatus("loading");

      try {
        const result = await loadRemoteDemoState(createInitialState());

        if (cancelled) {
          return;
        }

        setState(result.state);
        saveDemoState(result.state);
        setRemoteReady(true);
        setSyncStatus(result.mode === "initialized" ? "initialized" : "synced");
      } catch (error) {
        console.error("Failed to load Supabase demo state", error);

        if (!cancelled) {
          setRemoteReady(false);
          setSyncStatus("error");
        }
      }
    }

    void hydrateRemoteState();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    saveDemoState(state);

    if (!hasSupabaseConfig || !remoteReady) {
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(() => {
      setSyncStatus("saving");
      void saveRemoteDemoState(state)
        .then(() => {
          if (!cancelled) {
            setSyncStatus("synced");
          }
        })
        .catch((error) => {
          console.error("Failed to save Supabase demo state", error);

          if (!cancelled) {
            setSyncStatus("error");
          }
        });
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [remoteReady, state]);

  const selectedLocation = state.locations.find((location) => location.id === draft.locationId) ?? state.locations[0];
  const selectedSquad = state.survivors.filter((survivor) => draft.squadIds.includes(survivor.id));
  const squadReady = draft.squadIds.length >= 3 && draft.squadIds.length <= 5;
  const canAffordLoadout = resourceKeys.every((key) => state.resources[key] >= draft.loadout[key]);
  const readiness = useMemo(() => calculateReadiness(selectedSquad, selectedLocation.recommendedStats), [selectedLocation, selectedSquad]);

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
      setSyncStatus("saving");
      void saveRemoteDemoState(initialState)
        .then(() => setSyncStatus("synced"))
        .catch((error) => {
          console.error("Failed to reset Supabase demo state", error);
          setSyncStatus("error");
        });
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
            <span>{syncStatusLabels[syncStatus]}</span>
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
        {view === "members" && <Members />}
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
