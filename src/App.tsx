import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  Archive,
  BookOpen,
  CalendarDays,
  ClipboardList,
  Copy,
  Home,
  Link,
  Minus,
  PackageCheck,
  Plus,
  RotateCcw,
  Send,
  Shield,
  ShoppingCart,
  Swords,
  Users,
  Wrench
} from "lucide-react";
import { locationFamilyLabels, resourceKeys, resourceLabels, riskDescriptions, riskLabels, statLabels } from "./game/labels";
import { clearDemoState, createInitialState, loadDemoState, saveDemoState } from "./game/state";
import type { GameState, ResourceBundle, ResourceKey, RiskStrategy } from "./game/types";
import { advanceRoomDay, applyContribution, assignSurvivorToRoom, resolvePlaytestExpedition, treatSurvivor, upgradeFacility } from "./playtest/sim";
import { clearPlaytestSession, createStarterSession, loadPlaytestSession, savePlaytestSession } from "./playtest/state";
import type { PlaytestSession } from "./playtest/types";
import {
  fetchAuthUser,
  isEmailLogin,
  readSessionFromHash,
  readTokenHashFromUrl,
  signInWithPassword,
  signInWithUsername,
  signUpWithPassword,
  signUpWithUsername,
  verifyTokenHash,
  type AuthSession
} from "./lib/auth";
import {
  loadPlaytestSession as loadRemotePlaytestSession,
  saveAssignment,
  saveContribution,
  savePlaytestProgress,
  saveSettlement
} from "./lib/playtestRemote";
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

type JourneyAction = "careful" | "force" | "trade" | "skip" | "extract";
type CombatAction = "strike" | "guard" | "patch";

type JourneyNode = {
  id: string;
  type: "event" | "combat" | "shop" | "extraction";
  title: string;
  body: string;
};

type JourneyCombat = {
  enemyName: string;
  enemyHp: number;
  enemyMaxHp: number;
  squadHp: number;
  squadMaxHp: number;
  attack: number;
  round: number;
};

type JourneyState = {
  combat: JourneyCombat | null;
  currentNodeIndex: number;
  id: string;
  loadout: ResourceBundle;
  locationId: string;
  logs: string[];
  nodes: JourneyNode[];
  risk: RiskStrategy;
  rollShift: number;
  squadIds: string[];
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

const guestModeStorageKey = "ember-dossier-guest-mode";

export default function App() {
  const [roomSlug, setRoomSlug] = useState(() => getInitialRoomSlug());
  const [player, setPlayer] = useState<RoomPlayer>(() => loadLocalPlayer());
  const [session, setSession] = useState<PlaytestSession>(() => loadPlaytestSession(player.id, player.name, roomSlug));
  const [state, setState] = useState<GameState>(() => session.uiState);
  const [roomMeta, setRoomMeta] = useState<RoomMeta>(() => createRoomMeta(player));
  const [view, setView] = useState<ViewKey>("overview");
  const [latestReportId, setLatestReportId] = useState<string | null>(null);
  const [remoteReady, setRemoteReady] = useState(!hasSupabaseConfig);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(hasSupabaseConfig ? "loading" : "local");
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncRetryCount, setSyncRetryCount] = useState(0);
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "failed">("idle");
  const [authSession, setAuthSession] = useState<AuthSession | null>(null);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authNotice, setAuthNotice] = useState<string | null>(null);
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [guestMode, setGuestMode] = useState(loadGuestMode);
  const applyingRemoteState = useRef(false);
  const latestRemoteUpdatedAt = useRef<string | null>(null);
  const [draft, setDraft] = useState<ExpeditionDraft>(() => ({
    squadIds: ["lin", "mara", "otto"],
    locationId: "water-plant",
    risk: "standard",
    loadout: defaultLoadout
  }));
  const [journey, setJourney] = useState<JourneyState | null>(null);
  const [contributionDraft, setContributionDraft] = useState<ResourceBundle>(() => ({
    ammo: 0,
    food: 1,
    fuel: 0,
    materials: 1,
    medicine: 0,
    water: 1
  }));

  function applySession(nextSession: PlaytestSession) {
    setSession(nextSession);
    setState(nextSession.uiState);
    savePlaytestSession(nextSession);
    saveDemoState(nextSession.uiState);
  }

  async function submitPasswordAuth(mode: "signin" | "signup") {
    if (!authEmail.trim()) {
      setAuthNotice("Enter a username first.");
      return;
    }

    if (authPassword.length < 6) {
      setAuthNotice("Password needs at least 6 characters.");
      return;
    }

    try {
      setAuthSubmitting(true);
      setAuthNotice(null);
      const login = authEmail.trim();
      const nextSession =
        mode === "signin"
          ? isEmailLogin(login)
            ? await signInWithPassword(login, authPassword)
            : await signInWithUsername(login, authPassword)
          : isEmailLogin(login)
            ? await signUpWithPassword(login, authPassword)
            : await signUpWithUsername(login, authPassword);
      setAuthSession(nextSession);
    } catch (error) {
      setAuthNotice(describeSyncError(error));
    } finally {
      setAuthSubmitting(false);
    }
  }

  function continueAsGuest() {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(guestModeStorageKey, "1");
    }
    setAuthNotice(null);
    setGuestMode(true);
  }

  function switchToAccountLogin() {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(guestModeStorageKey);
    }
    setAuthNotice(null);
    setGuestMode(false);
  }

  useEffect(() => {
    if (!hasSupabaseConfig) {
      return;
    }

    const parsed = readSessionFromHash();
    if (parsed) {
      if (typeof window !== "undefined") {
        window.history.replaceState(null, "", `/?room=${roomSlug}`);
      }

      if (parsed.userId) {
        setAuthSession(parsed);
        return;
      }

      void fetchAuthUser(parsed.accessToken)
        .then(setAuthSession)
        .catch((error) => {
          setSyncError(describeSyncError(error));
          setSyncStatus("error");
        });
      return;
    }

    const tokenHash = readTokenHashFromUrl();
    if (!tokenHash) {
      return;
    }

    void verifyTokenHash(tokenHash.tokenHash, tokenHash.type)
      .then((nextSession) => {
        if (typeof window !== "undefined") {
          window.history.replaceState(null, "", `/?room=${roomSlug}`);
        }
        setAuthNotice("Email confirmed. Loading your playtest account.");
        setAuthSession(nextSession);
      })
      .catch((error) => {
        setAuthNotice(describeSyncError(error));
        setSyncError(describeSyncError(error));
        setSyncStatus("error");
      });
  }, [roomSlug]);

  useEffect(() => {
    if (!hasSupabaseConfig || !authSession) {
      return;
    }

    setSyncStatus("loading");
    setSyncError(null);
    void loadRemotePlaytestSession(
      authSession.accessToken,
      authSession.userId,
      player.name || authSession.email || "Player",
      roomSlug
    )
      .then((loadedSession) => {
        applySession(loadedSession);
        setRemoteReady(true);
        setSyncStatus("synced");
      })
      .catch((error) => {
        setSyncError(describeSyncError(error));
        setSyncStatus("error");
      });
  }, [authSession, roomSlug]);

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
    if (!hasSupabaseConfig || authSession || !guestMode) {
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
    const nextSession = createStarterSession(player.id, player.name, nextRoomSlug);

    latestRemoteUpdatedAt.current = null;
    clearPlaytestSession();
    setRoomSlug(nextRoomSlug);
    setView("overview");
    setLatestReportId(null);
    applySession(nextSession);
    setRoomMeta(createRoomMeta(player));
  }

  function updatePlayerName(name: string) {
    const updatedPlayer = renameLocalPlayer(player, name);
    setPlayer(updatedPlayer);
    setSession((current) => ({
      ...current,
      account: {
        ...current.account,
        profile: {
          ...current.account.profile,
          displayName: updatedPlayer.name
        }
      },
      room: {
        ...current.room,
        members: current.room.members.map((member) =>
          member.userId === current.account.profile.userId ? { ...member, displayName: updatedPlayer.name } : member
        )
      }
    }));
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
    if (!hasSupabaseConfig || authSession || !guestMode) {
      return;
    }
    void hydrateRemoteState();
  }, [authSession, guestMode, roomSlug]);

  useEffect(() => {
    if (!hasSupabaseConfig || authSession || !guestMode || syncStatus !== "error" || syncRetryCount >= 3) {
      return;
    }

    const retryTimer = window.setTimeout(retryRemoteSync, 4000);

    return () => {
      window.clearTimeout(retryTimer);
    };
  }, [authSession, guestMode, remoteReady, roomSlug, state, syncRetryCount, syncStatus]);

  useEffect(() => {
    saveDemoState(state);

    if (applyingRemoteState.current) {
      applyingRemoteState.current = false;
      return;
    }

    if (!hasSupabaseConfig || authSession || !guestMode || !remoteReady) {
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
  }, [authSession, guestMode, player, remoteReady, roomSlug, state]);

  useEffect(() => {
    if (!hasSupabaseConfig || authSession || !guestMode || !remoteReady) {
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
  }, [authSession, guestMode, player, remoteReady, roomSlug, state]);

  useEffect(() => {
    if (!hasSupabaseConfig || authSession || !guestMode || !remoteReady) {
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
  }, [authSession, guestMode, player, remoteReady, roomSlug]);

  const selectedLocation = state.locations.find((location) => location.id === draft.locationId) ?? state.locations[0];
  const selectedSquad = state.survivors.filter((survivor) => draft.squadIds.includes(survivor.id));
  const squadReady = draft.squadIds.length >= 3 && draft.squadIds.length <= 5;
  const canAffordLoadout = resourceKeys.every((key) => state.resources[key] >= draft.loadout[key]);
  const objectiveActive = session.room.base.objective.status === "active";
  const readiness = useMemo(() => calculateReadiness(selectedSquad, selectedLocation.recommendedStats), [selectedLocation, selectedSquad]);
  const roomPlayers = useMemo(
    () => Object.values(roomMeta.players).sort((left, right) => right.lastSeenAt.localeCompare(left.lastSeenAt)),
    [roomMeta.players]
  );

  function toggleSurvivor(id: string) {
    if (!draft.squadIds.includes(id)) {
      const nextSession = assignSurvivorToRoom(session, session.account.profile.userId, id);
      applySession(nextSession);
      const assignment = nextSession.room.assignedSurvivors.find(
        (candidate) => candidate.userId === nextSession.account.profile.userId && candidate.survivorId === id
      );
      if (authSession && assignment) {
        void saveAssignment(authSession.accessToken, assignment).catch((error) => {
          setSyncError(describeSyncError(error));
          setSyncStatus("error");
        });
      }
    }

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

  function updateContribution(key: ResourceKey, delta: number) {
    setContributionDraft((current) => ({
      ...current,
      [key]: Math.max(0, Math.min(session.account.resources[key], current[key] + delta))
    }));
  }

  function submitContribution() {
    const nextSession = applyContribution(session, session.account.profile.userId, contributionDraft);
    applySession(nextSession);
    const contribution = nextSession.room.contributions[0];
    if (authSession && contribution) {
      void saveContribution(authSession.accessToken, contribution).catch((error) => {
        setSyncError(describeSyncError(error));
        setSyncStatus("error");
      });
    }
    setContributionDraft({
      ammo: 0,
      food: 1,
      fuel: 0,
      materials: 1,
      medicine: 0,
      water: 1
    });
  }

  function persistPlaytestProgress(nextSession: PlaytestSession) {
    if (!authSession) {
      return;
    }

    void savePlaytestProgress(authSession.accessToken, nextSession).catch((error) => {
      setSyncError(describeSyncError(error));
      setSyncStatus("error");
    });
  }

  function treatSelectedSurvivor(survivorId: string) {
    try {
      const nextSession = treatSurvivor(session, session.account.profile.userId, survivorId);
      applySession(nextSession);
      persistPlaytestProgress(nextSession);
    } catch (error) {
      setSyncError(describeSyncError(error));
      setSyncStatus("error");
    }
  }

  function upgradeRoomFacility(facilityId: string) {
    try {
      const nextSession = upgradeFacility(session, session.account.profile.userId, facilityId);
      applySession(nextSession);
      persistPlaytestProgress(nextSession);
    } catch (error) {
      setSyncError(describeSyncError(error));
      setSyncStatus("error");
    }
  }

  function endRoomDay() {
    try {
      const nextSession = advanceRoomDay(session, session.account.profile.userId);
      applySession(nextSession);
      persistPlaytestProgress(nextSession);
    } catch (error) {
      setSyncError(describeSyncError(error));
      setSyncStatus("error");
    }
  }

  function dispatchExpedition() {
    if (!squadReady || !canAffordLoadout || !objectiveActive) {
      return;
    }

    let preparedSession = session;
    for (const survivorId of draft.squadIds) {
      const alreadyAssigned = preparedSession.room.assignedSurvivors.some(
        (assignment) => assignment.survivorId === survivorId && assignment.userId === preparedSession.account.profile.userId
      );
      if (!alreadyAssigned) {
        preparedSession = assignSurvivorToRoom(preparedSession, preparedSession.account.profile.userId, survivorId);
      }
    }

    applySession(preparedSession);
    setJourney(createJourney(preparedSession, draft, selectedLocation.id, readiness));
  }

  function resolveJourneyAction(action: JourneyAction) {
    if (!journey) {
      return;
    }

    const node = journey.nodes[journey.currentNodeIndex];
    if (!node || node.type === "extraction" || action === "extract") {
      finishJourney({
        ...journey,
        logs: [...journey.logs, "The squad marks the extraction route and calls the base for pickup."]
      });
      return;
    }

    const next = structuredClone(journey) as JourneyState;
    if (node.type === "event") {
      if (action === "careful") {
        next.rollShift -= 0.1;
        next.logs.push(`${node.title}: slow search finds a safer path. Outcome pressure -10%.`);
      } else {
        next.rollShift += 0.08;
        next.logs.push(`${node.title}: forced route saves time but raises noise. Outcome pressure +8%.`);
      }
    }

    if (node.type === "shop") {
      if (action === "trade") {
        next.rollShift -= 0.06;
        next.logs.push(`${node.title}: the trader swaps route gossip for a promise of future salvage. Outcome pressure -6%.`);
      } else {
        next.logs.push(`${node.title}: the squad keeps moving and saves its bargaining power.`);
      }
    }

    next.currentNodeIndex += 1;
    next.combat = createCombatForNode(next.nodes[next.currentNodeIndex], selectedSquad, readiness);
    setJourney(next);
  }

  function resolveCombatAction(action: CombatAction) {
    if (!journey?.combat) {
      return;
    }

    const node = journey.nodes[journey.currentNodeIndex];
    const next = structuredClone(journey) as JourneyState;
    const combat = next.combat;
    if (!combat) {
      return;
    }

    let squadDamage = Math.max(4, Math.round(readiness / 12));
    let incoming = combat.attack;

    if (action === "strike") {
      const ammoBonus = next.loadout.ammo > 0 ? 4 : 0;
      squadDamage += ammoBonus;
      combat.enemyHp = Math.max(0, combat.enemyHp - squadDamage);
      next.logs.push(`${node.title}: round ${combat.round}, focused strike deals ${squadDamage} damage.`);
    } else if (action === "guard") {
      incoming = Math.max(1, Math.floor(incoming / 2));
      next.rollShift -= 0.02;
      next.logs.push(`${node.title}: round ${combat.round}, the squad guards and keeps formation.`);
    } else {
      const heal = next.loadout.medicine > 0 ? 10 : 4;
      combat.squadHp = Math.min(combat.squadMaxHp, combat.squadHp + heal);
      next.rollShift -= 0.01;
      next.logs.push(`${node.title}: round ${combat.round}, field patch restores ${heal} squad stamina.`);
    }

    if (combat.enemyHp > 0) {
      combat.squadHp = Math.max(0, combat.squadHp - incoming);
      next.logs.push(`${combat.enemyName} hits back for ${incoming}.`);
      if (combat.squadHp <= 0) {
        next.rollShift += 0.24;
        next.logs.push(`${node.title}: the squad breaks contact in bad shape. Outcome pressure +24%.`);
        next.currentNodeIndex += 1;
        next.combat = createCombatForNode(next.nodes[next.currentNodeIndex], selectedSquad, readiness);
      } else {
        combat.round += 1;
      }
    } else {
      next.rollShift -= 0.12;
      next.logs.push(`${node.title}: ${combat.enemyName} is driven off. Outcome pressure -12%.`);
      next.currentNodeIndex += 1;
      next.combat = createCombatForNode(next.nodes[next.currentNodeIndex], selectedSquad, readiness);
    }

    setJourney(next);
  }

  function finishJourney(completedJourney: JourneyState) {
    const adjustedRolls = [Math.random(), Math.random(), Math.random(), Math.random(), Math.random()].map((roll) =>
      Math.max(0.02, Math.min(0.98, roll + completedJourney.rollShift))
    );
    const result = resolvePlaytestExpedition(session, {
      journeyLogs: completedJourney.logs,
      loadout: completedJourney.loadout,
      locationId: completedJourney.locationId,
      randomRolls: adjustedRolls,
      risk: completedJourney.risk,
      survivorIds: completedJourney.squadIds,
      userId: session.account.profile.userId
    });

    applySession(result.session);
    if (authSession) {
      void saveSettlement(authSession.accessToken, result.session, result.report).catch((error) => {
        setSyncError(describeSyncError(error));
        setSyncStatus("error");
      });
    }
    setLatestReportId(result.report.id);
    setJourney(null);
    setView("reports");
    setDraft((current) => ({
      ...current,
      loadout: defaultLoadout
    }));
  }

  function resetDemo() {
    const initialSession = createStarterSession(player.id, player.name, roomSlug);

    clearDemoState();
    clearPlaytestSession();
    applySession(initialSession);
    setLatestReportId(null);
    setView("overview");
    setDraft({
      squadIds: ["lin", "mara", "otto"],
      locationId: "water-plant",
      risk: "standard",
      loadout: defaultLoadout
    });

    if (hasSupabaseConfig && remoteReady && !authSession && guestMode) {
      void pushRemoteState(initialSession.uiState);
    }
  }

  if (hasSupabaseConfig && !authSession && !guestMode) {
    return (
      <main className="auth-shell">
        <section className="panel auth-panel">
          <div className="brand-lockup">
            <span className="stamp">ED-12</span>
            <div>
              <p>余烬档案</p>
              <strong>Ember Dossier</strong>
            </div>
          </div>
          <p className="eyebrow">Playtest Login</p>
          <h1>Join room {roomSlug}</h1>
          <label className="auth-field">
            <span>Username</span>
            <input value={authEmail} onChange={(event) => setAuthEmail(event.target.value)} placeholder="alice_01" />
          </label>
          <label className="auth-field">
            <span>Password</span>
            <input
              value={authPassword}
              minLength={6}
              onChange={(event) => setAuthPassword(event.target.value)}
              placeholder="At least 6 characters"
              type="password"
            />
          </label>
          <div className="auth-actions">
            <button className="primary-button full-width" disabled={authSubmitting} type="button" onClick={() => submitPasswordAuth("signin")}>
              <Send size={18} aria-hidden="true" />
              Sign in
            </button>
            <button className="ghost-button auth-secondary" disabled={authSubmitting} type="button" onClick={() => submitPasswordAuth("signup")}>
              <Shield size={18} aria-hidden="true" />
              Create playtest account
            </button>
            <button className="ghost-button auth-secondary" disabled={authSubmitting} type="button" onClick={continueAsGuest}>
              <Users size={18} aria-hidden="true" />
              Continue as guest
            </button>
          </div>
          <p className="muted-copy">
            Use 3-20 letters, numbers, or underscores. No email confirmation is needed for playtest accounts.
          </p>
          {authNotice && <p className="muted-copy">{authNotice}</p>}
        </section>
      </main>
    );
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
        {hasSupabaseConfig && guestMode && !authSession && (
          <button className="ghost-button" type="button" onClick={switchToAccountLogin}>
            <Shield size={17} aria-hidden="true" />
            Account login
          </button>
        )}
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

        {view === "overview" && (
          <Overview
            state={state}
            session={session}
            contributionDraft={contributionDraft}
            goExpedition={() => setView("expedition")}
            onContributionChange={updateContribution}
            onContribute={submitContribution}
            onEndDay={endRoomDay}
          />
        )}
        {view === "survivors" && (
          <Survivors
            state={state}
            selectedIds={draft.squadIds}
            canTreat={session.room.base.resources.medicine > 0}
            onToggle={toggleSurvivor}
            onTreat={treatSelectedSurvivor}
          />
        )}
        {view === "expedition" && (
          <ExpeditionPrep
            state={state}
            draft={draft}
            selectedLocation={selectedLocation}
            readiness={readiness}
            squadReady={squadReady}
            canAffordLoadout={canAffordLoadout && objectiveActive}
            objectiveActive={objectiveActive}
            journey={journey}
            onToggleSurvivor={toggleSurvivor}
            onLocationChange={(locationId) => {
              setJourney(null);
              setDraft((current) => ({ ...current, locationId }));
            }}
            onRiskChange={(risk) => {
              setJourney(null);
              setDraft((current) => ({ ...current, risk }));
            }}
            onLoadoutChange={updateLoadout}
            onCombatAction={resolveCombatAction}
            onDispatch={dispatchExpedition}
            onJourneyAction={resolveJourneyAction}
          />
        )}
        {view === "reports" && <Reports state={state} latestReportId={latestReportId} />}
        {view === "facilities" && <Facilities state={state} onUpgrade={upgradeRoomFacility} />}
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

function Overview({
  state,
  session,
  contributionDraft,
  goExpedition,
  onContributionChange,
  onContribute,
  onEndDay
}: {
  state: GameState;
  session: PlaytestSession;
  contributionDraft: ResourceBundle;
  goExpedition: () => void;
  onContributionChange: (key: ResourceKey, delta: number) => void;
  onContribute: () => void;
  onEndDay: () => void;
}) {
  const objective = session.room.base.objective;
  const objectiveProgress = Math.round((objective.repairedParts / objective.requiredParts) * 100);
  const daysRemaining = Math.max(0, objective.deadlineDay - session.room.base.day + 1);

  return (
    <div className="view-grid">
      <section className="panel account-band">
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
        <div className="metric-pair">
          <span>Warehouse</span>
          <strong>{session.account.base.warehouseLevel}</strong>
        </div>
      </section>

      <section className="panel objective-band">
        <p className="eyebrow">Room Objective</p>
        <h2>{objective.title}</h2>
        <div className={`objective-status ${objective.status}`}>
          <span>Day {session.room.base.day}</span>
          <strong>{objective.status.toUpperCase()}</strong>
        </div>
        <div className="readiness-meter">
          <span>Repair Progress</span>
          <div>
            <i style={{ width: `${Math.max(6, objectiveProgress)}%` }} />
          </div>
          <strong>{objective.repairedParts}/{objective.requiredParts}</strong>
        </div>
        <div className="metric-pair">
          <span>Deadline</span>
          <strong>{daysRemaining} day(s)</strong>
        </div>
        <button className="primary-button full-width" type="button" disabled={objective.status !== "active"} onClick={onEndDay}>
          <CalendarDays size={18} aria-hidden="true" />
          End day
        </button>
      </section>

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

      <section className="panel wide">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Contribute</p>
            <h2>Account supplies to room base</h2>
          </div>
          <button className="primary-button" type="button" onClick={onContribute}>
            <Archive size={18} aria-hidden="true" />
            Contribute
          </button>
        </div>
        <div className="contribution-grid">
          {resourceKeys.map((key) => (
            <div className="loadout-row contribution-row" key={key}>
              <span>{resourceLabels[key]}</span>
              <small>Account {session.account.resources[key]}</small>
              <div>
                <button className="icon-button" type="button" onClick={() => onContributionChange(key, -1)} aria-label={`Decrease ${resourceLabels[key]}`}>
                  <Minus size={16} />
                </button>
                <strong>{contributionDraft[key]}</strong>
                <button className="icon-button" type="button" onClick={() => onContributionChange(key, 1)} aria-label={`Increase ${resourceLabels[key]}`}>
                  <Plus size={16} />
                </button>
              </div>
            </div>
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
  canTreat,
  onToggle,
  onTreat
}: {
  state: GameState;
  selectedIds: string[];
  canTreat: boolean;
  onToggle: (id: string) => void;
  onTreat: (id: string) => void;
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
              {(survivor.injuries.length > 0 || survivor.fatigue >= 35) && (
                <button
                  className="ghost-button compact-action"
                  type="button"
                  disabled={!canTreat}
                  onClick={() => onTreat(survivor.id)}
                >
                  <Shield size={16} aria-hidden="true" />
                  Treat
                </button>
              )}
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
  objectiveActive,
  journey,
  onToggleSurvivor,
  onLocationChange,
  onRiskChange,
  onLoadoutChange,
  onCombatAction,
  onDispatch,
  onJourneyAction
}: {
  state: GameState;
  draft: ExpeditionDraft;
  selectedLocation: GameState["locations"][number];
  readiness: number;
  squadReady: boolean;
  canAffordLoadout: boolean;
  objectiveActive: boolean;
  journey: JourneyState | null;
  onToggleSurvivor: (id: string) => void;
  onLocationChange: (locationId: string) => void;
  onRiskChange: (risk: RiskStrategy) => void;
  onLoadoutChange: (key: ResourceKey, delta: number) => void;
  onCombatAction: (action: CombatAction) => void;
  onDispatch: () => void;
  onJourneyAction: (action: JourneyAction) => void;
}) {
  const activeNode = journey?.nodes[journey.currentNodeIndex];
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
        <div className="resource-preview-grid">
          {resourceKeys.map((key) => (
            <div className="resource-preview-row" key={key}>
              <span>{resourceLabels[key]}</span>
              <strong>{state.resources[key]}</strong>
              <small>Carry {draft.loadout[key]} / Left {state.resources[key] - draft.loadout[key]}</small>
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
        {journey && activeNode && (
          <JourneyPanel
            activeNode={activeNode}
            journey={journey}
            onCombatAction={onCombatAction}
            onJourneyAction={onJourneyAction}
          />
        )}
        <button className="primary-button full-width" type="button" disabled={!squadReady || !canAffordLoadout || Boolean(journey)} onClick={onDispatch}>
          <Send size={18} aria-hidden="true" />
          派遣远征
        </button>
        {!squadReady && <p className="warning-copy">需要选择 3-5 名幸存者。</p>}
        {objectiveActive && !canAffordLoadout && <p className="warning-copy">携带物资超过基地库存。</p>}
        {!objectiveActive && <p className="warning-copy">This room objective is already resolved. Create a new room to start over.</p>}
      </section>
    </div>
  );
}

function JourneyPanel({
  activeNode,
  journey,
  onCombatAction,
  onJourneyAction
}: {
  activeNode: JourneyNode;
  journey: JourneyState;
  onCombatAction: (action: CombatAction) => void;
  onJourneyAction: (action: JourneyAction) => void;
}) {
  return (
    <div className="journey-panel">
      <div className="journey-track" aria-label="Expedition route progress">
        {journey.nodes.map((node, index) => (
          <span className={index === journey.currentNodeIndex ? "active" : index < journey.currentNodeIndex ? "done" : ""} key={node.id}>
            {index + 1}
          </span>
        ))}
      </div>
      <div className="journey-node">
        <span className="subtle-pill">{activeNode.type}</span>
        <h3>{activeNode.title}</h3>
        <p>{activeNode.body}</p>
        {journey.combat ? (
          <div className="combat-card">
            <div className="combat-bars">
              <CombatBar label={journey.combat.enemyName} value={journey.combat.enemyHp} max={journey.combat.enemyMaxHp} tone="danger" />
              <CombatBar label="Squad" value={journey.combat.squadHp} max={journey.combat.squadMaxHp} tone="safe" />
            </div>
            <div className="journey-actions">
              <button className="primary-button" type="button" onClick={() => onCombatAction("strike")}>
                <Swords size={17} aria-hidden="true" />
                Strike
              </button>
              <button className="ghost-button inline" type="button" onClick={() => onCombatAction("guard")}>
                <Shield size={17} aria-hidden="true" />
                Guard
              </button>
              <button className="ghost-button inline" type="button" onClick={() => onCombatAction("patch")}>
                <PackageCheck size={17} aria-hidden="true" />
                Patch
              </button>
            </div>
          </div>
        ) : activeNode.type === "event" ? (
          <div className="journey-actions">
            <button className="primary-button" type="button" onClick={() => onJourneyAction("careful")}>
              Careful search
            </button>
            <button className="ghost-button inline" type="button" onClick={() => onJourneyAction("force")}>
              Force route
            </button>
          </div>
        ) : activeNode.type === "shop" ? (
          <div className="journey-actions">
            <button className="primary-button" type="button" onClick={() => onJourneyAction("trade")}>
              <ShoppingCart size={17} aria-hidden="true" />
              Trade rumor
            </button>
            <button className="ghost-button inline" type="button" onClick={() => onJourneyAction("skip")}>
              Skip
            </button>
          </div>
        ) : (
          <button className="primary-button full-width" type="button" onClick={() => onJourneyAction("extract")}>
            Extract and settle
          </button>
        )}
      </div>
      <div className="journey-log">
        {journey.logs.slice(-4).map((line, index) => (
          <p key={`${journey.id}-log-${index}`}>{line}</p>
        ))}
      </div>
    </div>
  );
}

function CombatBar({ label, max, tone, value }: { label: string; max: number; tone: "danger" | "safe"; value: number }) {
  const width = Math.max(0, Math.min(100, Math.round((value / max) * 100)));
  return (
    <div className={`combat-bar ${tone}`}>
      <div>
        <span>{label}</span>
        <strong>
          {value}/{max}
        </strong>
      </div>
      <i>
        <b style={{ width: `${width}%` }} />
      </i>
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

function Facilities({ state, onUpgrade }: { state: GameState; onUpgrade: (id: string) => void }) {
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
            <button
              className="ghost-button compact-action"
              type="button"
              disabled={state.resources.materials < facility.level * 5}
              onClick={() => onUpgrade(facility.id)}
            >
              <Wrench size={16} aria-hidden="true" />
              Upgrade: {facility.level * 5} materials
            </button>
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

function createJourney(session: PlaytestSession, draft: ExpeditionDraft, locationId: string, readiness: number): JourneyState {
  const location = session.room.locations.find((candidate) => candidate.id === locationId);
  const nodes: JourneyNode[] = [
    {
      body: `The squad reaches the edge of ${location?.name ?? "the site"} and must decide how loudly to move.`,
      id: "route-event",
      title: "Broken Approach",
      type: "event"
    },
    {
      body: "A hostile shape blocks the safest corridor. The team has to win space or retreat through the noise.",
      id: "route-combat",
      title: "Close Quarters",
      type: "combat"
    },
    {
      body: "A quiet trader has supplies, rumors, and a very strict no-refunds policy.",
      id: "route-shop",
      title: "Roadside Broker",
      type: "shop"
    },
    {
      body: "The exit is visible. One last signal check before the base opens the gate.",
      id: "route-extraction",
      title: "Extraction Window",
      type: "extraction"
    }
  ];

  return {
    combat: null,
    currentNodeIndex: 0,
    id: `journey-${Date.now()}`,
    loadout: { ...draft.loadout },
    locationId,
    logs: [`Route opened for ${location?.name ?? "unknown site"} with ${draft.squadIds.length} survivor(s).`],
    nodes,
    risk: draft.risk,
    rollShift: draft.risk === "cautious" ? -0.03 : draft.risk === "greedy" ? 0.05 : 0,
    squadIds: [...draft.squadIds]
  };
}

function createCombatForNode(
  node: JourneyNode | undefined,
  squad: GameState["survivors"],
  readiness: number
): JourneyCombat | null {
  if (!node || node.type !== "combat") {
    return null;
  }

  const riskIndex = squad.length > 4 ? 2 : squad.length > 3 ? 1 : 0;
  const enemyMaxHp = 22 + riskIndex * 6;
  const squadMaxHp = 28 + squad.length * 10 + Math.round(readiness / 5);

  return {
    attack: 6 + riskIndex * 2,
    enemyHp: enemyMaxHp,
    enemyMaxHp,
    enemyName: squad.length > 3 ? "Signal Nest" : "Relay Ghoul",
    round: 1,
    squadHp: squadMaxHp,
    squadMaxHp
  };
}

function loadGuestMode() {
  return typeof window !== "undefined" && window.localStorage.getItem(guestModeStorageKey) === "1";
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
