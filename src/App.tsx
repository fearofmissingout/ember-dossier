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
import { facilityActionCost, facilityActionLabel, facilityUpgradePreview, isFacilityBuilt, isFacilityMaxed } from "./game/facilities";
import { clearDemoState, createInitialState, loadDemoState, saveDemoState } from "./game/state";
import type { GameState, ResourceBundle, ResourceKey, RiskStrategy } from "./game/types";
import {
  advanceRoomDay,
  applyContribution,
  assignSurvivorToRoom,
  baseDevelopmentPlan,
  baseRecoveryPlan,
  resolvePlaytestExpedition,
  setBaseAssignment,
  treatSurvivor,
  upgradeFacility,
  type BaseDevelopmentPlan,
  type BaseRecoveryPlan
} from "./playtest/sim";
import {
  addResources,
  advanceJourneyTravel,
  baseCommandOptions,
  campOptionOutcome,
  calculateCarryBurden,
  combatActionPreview,
  combatLootOutcome,
  combatLootList,
  createCombatForNode,
  createJourney,
  enemyTraitPulse,
  forecastNextSegment,
  resolveCampAction,
  resolveBaseCommand,
  resolveCombatLootChoice,
  resolveRoadEncounterChoice,
  resolveShopAction,
  routePaceFor,
  segmentTacticList,
  segmentThreatFor,
  segmentThreatMitigationFor,
  setJourneySegmentTactic,
  setJourneyTravelPlan,
  shopOfferOutcome,
  spendFieldSupplyFromPriority,
  travelPlanList,
  resolveCombatRound,
  type JourneyBaseCommandAction,
  type CombatAction,
  type JourneyAction,
  type JourneyCampAction,
  type JourneyCombatLootAction,
  type JourneyChoice,
  type JourneyCarryBurden,
  type JourneyNode,
  type JourneyRoadEncounterAction,
  type JourneySegmentTactic,
  type JourneyShopAction,
  type JourneyState,
  type JourneyTravelPlan
} from "./playtest/journey";
import {
  basePrepSupportFromAssignments,
  expeditionDoctrineOptions,
  mergeExpeditionSupport,
  supportFromFacilities,
  survivorPerkDetails,
  xpForNextLevel,
  type ExpeditionDoctrineId
} from "./playtest/progression";
import { clearPlaytestSession, createStarterSession, loadPlaytestSession, savePlaytestSession } from "./playtest/state";
import type { BaseWorkType, PlaytestSession } from "./playtest/types";
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
  doctrineId: ExpeditionDoctrineId;
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

const campActionList: JourneyCampAction[] = ["rest", "cook", "scout"];
const combatActionList: CombatAction[] = ["strike", "guard", "patch", "tactic", "retreat"];
const shopActionList: JourneyShopAction[] = ["resupply", "intel", "service"];

const baseWorkOptions: Array<{ key: BaseWorkType | "idle"; label: string }> = [
  { key: "idle", label: "Rest" },
  { key: "forage", label: "Forage" },
  { key: "repair", label: "Repair" },
  { key: "guard", label: "Guard" },
  { key: "care", label: "Care" }
];

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
    doctrineId: "hold-formation",
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
      void Promise.all([
        saveContribution(authSession.accessToken, contribution),
        savePlaytestProgress(authSession.accessToken, nextSession, nextSession.room.feed[0])
      ]).catch((error) => {
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

    void savePlaytestProgress(authSession.accessToken, nextSession, nextSession.room.feed[0]).catch((error) => {
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

  function assignBaseShift(survivorId: string, type: BaseWorkType | "idle") {
    try {
      const nextSession = setBaseAssignment(session, session.account.profile.userId, survivorId, type);
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
    const facilitySupport = supportFromFacilities(preparedSession.room.base.facilities, draft.doctrineId);
    const basePrepSupport = basePrepSupportFromAssignments(
      preparedSession.room.baseAssignments,
      preparedSession.account.survivors,
      preparedSession.account.profile.userId,
      draft.squadIds
    );
    setJourney(
      createJourney(
        preparedSession,
        {
          ...draft,
          support: mergeExpeditionSupport(facilitySupport, basePrepSupport)
        },
        selectedLocation.id,
        readiness
      )
    );
  }

  function resolveJourneyAction(action: JourneyAction) {
    if (!journey) {
      return;
    }

    const selectedBaseCommand = baseCommandActionFromJourneyAction(action);
    if (selectedBaseCommand) {
      setJourney(resolveBaseCommand(journey, selectedBaseCommand));
      return;
    }

    const selectedRoadAction = roadEncounterActionFromJourneyAction(action);
    if (journey.pendingRoadEvent) {
      if (!selectedRoadAction) {
        return;
      }

      const next = resolveRoadEncounterChoice(journey, selectedRoadAction, selectedSquad, readiness);
      if (!next.combat) {
        next.combat = createCombatForNode(next.nodes[next.currentNodeIndex], selectedSquad, readiness, next.support);
      }
      setJourney(next);
      return;
    }

    const selectedLootAction = combatLootActionFromJourneyAction(action);
    if (journey.pendingCombatLoot) {
      if (!selectedLootAction) {
        return;
      }

      let next = resolveCombatLootChoice(journey, selectedLootAction);
      next = advanceJourneyTravel(next, selectedSquad, readiness);
      if (!next.pendingRoadEvent) {
        next.currentNodeIndex += 1;
        next.combat = createCombatForNode(next.nodes[next.currentNodeIndex], selectedSquad, readiness, next.support);
      }
      setJourney(next);
      return;
    }

    const selectedTravelPlan = travelPlanFromAction(action);
    if (selectedTravelPlan) {
      setJourney(setJourneyTravelPlan(journey, selectedTravelPlan));
      return;
    }

    const selectedSegmentTactic = segmentTacticFromAction(action);
    if (selectedSegmentTactic) {
      setJourney(setJourneySegmentTactic(journey, selectedSegmentTactic));
      return;
    }

    const node = journey.nodes[journey.currentNodeIndex];
    if (!node || node.type === "extraction" || action === "extract") {
      const completedRoute = !node || node.type === "extraction";
      finishJourney({
        ...journey,
        extractionStatus: completedRoute ? "complete" : "early",
        logs: [
          ...journey.logs,
          completedRoute
            ? "The squad marks the extraction route and calls the base for pickup."
            : "The squad turns back early, banking field salvage before the route gets worse."
        ]
      });
      return;
    }

    let next = structuredClone(journey) as JourneyState;
    if (node.type === "event") {
      const choice = action === "careful" ? node.careful : node.force;
      if (choice) {
        applyJourneyChoice(next, node.title, choice);
      }
    }

    if (node.type === "shop") {
      const selectedShopAction = shopActionFromJourneyAction(action);
      if (selectedShopAction) {
        next = resolveShopAction(next, selectedShopAction);
      } else {
        next.logs.push(`${node.title}: the squad keeps moving and saves its bargaining power.`);
      }
    }

    if (node.type === "camp" && (action === "rest" || action === "cook" || action === "scout")) {
      next = resolveCampAction(next, action);
    }

    next = advanceJourneyTravel(next, selectedSquad, readiness);
    if (!next.pendingRoadEvent) {
      next.currentNodeIndex += 1;
      next.combat = createCombatForNode(next.nodes[next.currentNodeIndex], selectedSquad, readiness, next.support);
    }
    setJourney(next);
  }

  function resolveCombatAction(action: CombatAction) {
    if (!journey?.combat) {
      return;
    }

    const resolved = resolveCombatRound(journey, action, selectedSquad, readiness);
    if (resolved.currentNodeIndex !== journey.currentNodeIndex) {
      const traveled = advanceJourneyTravel(resolved, selectedSquad, readiness, resolved.currentNodeIndex);
      if (!traveled.pendingRoadEvent) {
        traveled.combat = createCombatForNode(traveled.nodes[traveled.currentNodeIndex], selectedSquad, readiness, traveled.support);
      }
      setJourney(traveled);
      return;
    }

    setJourney(resolved);
  }

  function finishJourney(completedJourney: JourneyState) {
    const adjustedRolls = [Math.random(), Math.random(), Math.random(), Math.random(), Math.random()].map((roll) =>
      Math.max(0.02, Math.min(0.98, roll + completedJourney.rollShift))
    );
    const result = resolvePlaytestExpedition(session, {
      battleScars: completedJourney.battleScars,
      combatScarSurvivorIds: completedJourney.woundedSurvivorIds,
      extractionStatus: completedJourney.extractionStatus === "early" ? "early" : "complete",
      journeyLogs: completedJourney.logs,
      loadout: completedJourney.loadout,
      locationId: completedJourney.locationId,
      randomRolls: adjustedRolls,
      routeObjectiveBonus: completedJourney.objectiveBonus,
      risk: completedJourney.risk,
      survivorIds: completedJourney.squadIds,
      trophies: completedJourney.trophies,
      travelFatigue: completedJourney.condition.fatigue,
      userId: session.account.profile.userId
    });
    applyJourneyBonus(result.session, result.report, completedJourney.bonusReward);

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
      doctrineId: "hold-formation",
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
            accountSurvivors={session.account.survivors}
            selectedIds={draft.squadIds}
            canTreat={session.room.base.resources.medicine > 0}
            baseAssignments={session.room.baseAssignments}
            recoveryPlan={baseRecoveryPlan(session)}
            onToggle={toggleSurvivor}
            onTreat={treatSelectedSurvivor}
            onWorkChange={assignBaseShift}
          />
        )}
        {view === "expedition" && (
          <ExpeditionPrep
            accountSurvivors={session.account.survivors}
            baseAssignments={session.room.baseAssignments}
            state={state}
            draft={draft}
            selectedLocation={selectedLocation}
            readiness={readiness}
            squadReady={squadReady}
            canAffordLoadout={canAffordLoadout && objectiveActive}
            objectiveActive={objectiveActive}
            userId={session.account.profile.userId}
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
            onDoctrineChange={(doctrineId) => setDraft((current) => ({ ...current, doctrineId }))}
            onCombatAction={resolveCombatAction}
            onDispatch={dispatchExpedition}
            onJourneyAction={resolveJourneyAction}
          />
        )}
        {view === "reports" && <Reports state={state} latestReportId={latestReportId} />}
        {view === "facilities" && (
          <Facilities state={state} developmentPlan={baseDevelopmentPlan(session)} onUpgrade={upgradeRoomFacility} />
        )}
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
  accountSurvivors,
  state,
  selectedIds,
  canTreat,
  baseAssignments,
  recoveryPlan,
  onToggle,
  onTreat,
  onWorkChange
}: {
  accountSurvivors: PlaytestSession["account"]["survivors"];
  state: GameState;
  selectedIds: string[];
  canTreat: boolean;
  baseAssignments: PlaytestSession["room"]["baseAssignments"];
  recoveryPlan: BaseRecoveryPlan;
  onToggle: (id: string) => void;
  onTreat: (id: string) => void;
  onWorkChange: (id: string, type: BaseWorkType | "idle") => void;
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
      <div className="recovery-plan-card" aria-label="Base recovery plan">
        <div>
          <span>Recovery plan</span>
          <strong>{recoveryPlan.summary}</strong>
          <small>
            Clinic Lv.{recoveryPlan.clinicLevel} / Dorm Lv.{recoveryPlan.dormLevel} / {recoveryPlan.recoveringCount} recovering
          </small>
        </div>
        <div className="recovery-plan-metrics">
          <span>
            Care shifts <b>{recoveryPlan.careShifts}</b>
          </span>
          <span>
            Injury clears <b>{recoveryPlan.likelyInjuryClears}/{recoveryPlan.injuredCount}</b>
          </span>
          <span>
            Daily rest <b>-{recoveryPlan.dailyRecovery}</b>
          </span>
        </div>
        {recoveryPlan.priorityPatients.length > 0 && (
          <div className="recovery-patient-row">
            {recoveryPlan.priorityPatients.map((patient) => (
              <span key={patient.name}>
                {patient.name}: F{patient.fatigue} / I{patient.injuries}
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="survivor-grid">
        {state.survivors.map((survivor) => {
          const accountSurvivor = accountSurvivors.find((candidate) => candidate.id === survivor.id);
          const perks = accountSurvivor ? survivorPerkDetails(accountSurvivor) : [];
          const xpTarget = accountSurvivor ? xpForNextLevel(accountSurvivor) : 0;
          return (
          <article className={selectedIds.includes(survivor.id) ? "survivor-card selected" : "survivor-card"} key={survivor.id}>
            <div className="portrait-mark">{survivor.codename.slice(0, 2)}</div>
            <div className="card-copy">
              <div className="card-title-line">
                <div>
                  <h3>{survivor.name}</h3>
                  <p>
                    {survivor.profession} / {survivor.role}
                    {accountSurvivor ? ` / Lv.${accountSurvivor.level}` : ""}
                  </p>
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
                {perks.map((perk) => (
                  <span className="perk-tag" key={perk.id} title={perk.description}>
                    {perk.label}
                  </span>
                ))}
                {survivor.injuries.map((injury) => (
                  <span className="danger-tag" key={injury}>{injury}</span>
                ))}
              </div>
              {accountSurvivor && (
                <div className="xp-line">
                  <span>XP</span>
                  <div>
                    <i style={{ width: `${Math.max(5, Math.min(100, Math.round((accountSurvivor.xp / xpTarget) * 100)))}%` }} />
                  </div>
                  <strong>
                    {accountSurvivor.xp}/{xpTarget}
                  </strong>
                </div>
              )}
              <div className="fatigue-line">
                <span>疲劳</span>
                <div>
                  <i style={{ width: `${survivor.fatigue}%` }} />
                </div>
                <strong>{survivor.fatigue}</strong>
              </div>
              <div className="work-row">
                <span>Base shift</span>
                <select
                  value={baseAssignments.find((assignment) => assignment.survivorId === survivor.id)?.type ?? "idle"}
                  onChange={(event) => onWorkChange(survivor.id, event.target.value as BaseWorkType | "idle")}
                >
                  {baseWorkOptions.map((option) => (
                    <option key={option.key} value={option.key}>
                      {option.label}
                    </option>
                  ))}
                </select>
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
          );
        })}
      </div>
    </section>
  );
}

function ExpeditionPrep({
  accountSurvivors,
  baseAssignments,
  state,
  draft,
  selectedLocation,
  readiness,
  squadReady,
  canAffordLoadout,
  objectiveActive,
  userId,
  journey,
  onToggleSurvivor,
  onLocationChange,
  onRiskChange,
  onLoadoutChange,
  onDoctrineChange,
  onCombatAction,
  onDispatch,
  onJourneyAction
}: {
  accountSurvivors: PlaytestSession["account"]["survivors"];
  baseAssignments: PlaytestSession["room"]["baseAssignments"];
  state: GameState;
  draft: ExpeditionDraft;
  selectedLocation: GameState["locations"][number];
  readiness: number;
  squadReady: boolean;
  canAffordLoadout: boolean;
  objectiveActive: boolean;
  userId: string;
  journey: JourneyState | null;
  onToggleSurvivor: (id: string) => void;
  onLocationChange: (locationId: string) => void;
  onRiskChange: (risk: RiskStrategy) => void;
  onLoadoutChange: (key: ResourceKey, delta: number) => void;
  onDoctrineChange: (doctrineId: ExpeditionDoctrineId) => void;
  onCombatAction: (action: CombatAction) => void;
  onDispatch: () => void;
  onJourneyAction: (action: JourneyAction) => void;
}) {
  const activeNode = journey?.nodes[journey.currentNodeIndex];
  const doctrineOptions = expeditionDoctrineOptions(state.facilities);
  const selectedDoctrine = doctrineOptions.find((doctrine) => doctrine.id === draft.doctrineId) ?? doctrineOptions[0];
  const facilitySupport = supportFromFacilities(state.facilities, selectedDoctrine?.id);
  const basePrepSupport = basePrepSupportFromAssignments(baseAssignments, accountSurvivors, userId, draft.squadIds);
  const support = mergeExpeditionSupport(facilitySupport, basePrepSupport);
  const selectedSquad = state.survivors.filter((survivor) => draft.squadIds.includes(survivor.id));
  const previewFieldSupplies: ResourceBundle = {
    ...draft.loadout
  };
  for (const [key, value] of Object.entries(support.startingSupplies) as Array<[ResourceKey, number | undefined]>) {
    previewFieldSupplies[key] += value ?? 0;
  }
  const carryBurden = calculateCarryBurden(selectedSquad, previewFieldSupplies, support);
  const supportItems = [
    { label: "Max HP", sign: "+", value: support.maxHp },
    { label: "Patch", sign: "+", value: support.patchHeal },
    { label: "Guard", sign: "+", value: support.guardBlock },
    { label: "Ammo", sign: "+", value: support.ammoDamage },
    { label: "Opening guard", sign: "+", value: support.openingGuard },
    { label: "Opening expose", sign: "+", value: support.openingExpose },
    { label: "Pack", sign: "+", value: support.carryCapacity ?? 0 },
    { label: "Pressure", sign: "-", value: support.pressureRelief },
    { label: "Road secure", sign: "+", value: support.roadSecure },
    { label: "Road search", sign: "+", value: support.roadSearch },
    { label: "Road push", sign: "+", value: support.roadPush },
    { label: "Loot", sign: "+", value: support.lootSalvage },
    { label: "Clinic loot", sign: "+", value: support.lootMedicine },
    { label: "Intel", sign: "+", value: support.lootIntel },
    { label: "Evade", sign: "+", value: support.lootEvade },
    { label: "Camp meal", sign: "+", value: support.campCook },
    { label: "Camp rest", sign: "+", value: support.campRest },
    { label: "Camp scout", sign: "+", value: support.campScout },
    { label: "Shop rations", sign: "+", value: support.shopRations },
    { label: "Shop intel", sign: "+", value: support.shopIntel },
    { label: "Shop service", sign: "+", value: support.shopService }
  ].filter((item) => item.value > 0);
  const startingSupplyItems = [
    { label: "Start Food", value: support.startingSupplies.food ?? 0 },
    { label: "Start Water", value: support.startingSupplies.water ?? 0 },
    { label: "Start Ammo", value: support.startingSupplies.ammo ?? 0 },
    { label: "Start Medicine", value: support.startingSupplies.medicine ?? 0 }
  ].filter((item) => item.value > 0);
  const hasBaseSupport = supportItems.length > 0 || startingSupplyItems.length > 0;
  const basePrepItems = [
    { label: "Prep food", sign: "+", value: basePrepSupport.startingSupplies.food ?? 0 },
    { label: "Prep water", sign: "+", value: basePrepSupport.startingSupplies.water ?? 0 },
    { label: "Prep medicine", sign: "+", value: basePrepSupport.startingSupplies.medicine ?? 0 },
    { label: "Prep pack", sign: "+", value: basePrepSupport.carryCapacity ?? 0 },
    { label: "Prep guard", sign: "+", value: basePrepSupport.guardBlock },
    { label: "Prep road", sign: "+", value: basePrepSupport.roadSecure },
    { label: "Prep shop", sign: "+", value: basePrepSupport.shopRations + basePrepSupport.shopService },
    { label: "Prep pressure", sign: "-", value: basePrepSupport.pressureRelief }
  ].filter((item) => item.value > 0);
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
        <BurdenPreview burden={carryBurden} />
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

      <section className="panel">
        <p className="eyebrow">Step 5</p>
        <h2>Expedition doctrine</h2>
        <div className="doctrine-grid">
          {doctrineOptions.map((doctrine) => (
            <button
              className={selectedDoctrine?.id === doctrine.id ? "doctrine-card selected" : "doctrine-card"}
              key={doctrine.id}
              type="button"
              onClick={() => onDoctrineChange(doctrine.id)}
            >
              <strong>{doctrine.label}</strong>
              <span>{doctrine.text}</span>
              <small>{doctrine.effect}</small>
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
        <div className="support-grid">
          <span>Base support</span>
          {supportItems.map((item) => (
            <strong key={item.label}>
              {item.label} {item.sign}
              {item.value}
            </strong>
          ))}
          {startingSupplyItems.map((item) => (
            <strong key={item.label}>
              {item.label} +{item.value}
            </strong>
          ))}
          {!hasBaseSupport && <strong>No facility support yet</strong>}
          <span>Base prep</span>
          {basePrepItems.length ? (
            basePrepItems.map((item) => (
              <strong key={item.label}>
                {item.label} {item.sign}
                {item.value}
              </strong>
            ))
          ) : (
            <strong>No idle base crew prep</strong>
          )}
        </div>
        {journey && activeNode && (
          <JourneyPanel
            activeNode={activeNode}
            journey={journey}
            onCombatAction={onCombatAction}
            onJourneyAction={onJourneyAction}
            readiness={readiness}
            squad={selectedSquad}
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
  onJourneyAction,
  readiness,
  squad
}: {
  activeNode: JourneyNode;
  journey: JourneyState;
  onCombatAction: (action: CombatAction) => void;
  onJourneyAction: (action: JourneyAction) => void;
  readiness: number;
  squad: GameState["survivors"];
}) {
  const outlook = getJourneyOutlook(journey);
  const pendingRoad = journey.pendingRoadEvent;
  const canReturnEarly = !journey.combat && !journey.pendingCombatLoot && !pendingRoad && activeNode.type !== "extraction";
  const nodeTypeLabel = pendingRoad ? (pendingRoad.tone === "road" ? "road fork" : `road ${pendingRoad.tone}`) : activeNode.type;
  const nodeTitle = pendingRoad?.title ?? activeNode.title;
  const nodeBody = pendingRoad?.body ?? activeNode.body;
  const activeCombatPulse = journey.combat ? journey.combat.traitPulse ?? enemyTraitPulse(journey.combat.enemyTrait) : null;
  const routePace = routePaceFor(journey);
  const segmentForecast =
    !journey.combat && !journey.pendingCombatLoot && !pendingRoad && activeNode.type !== "extraction" ? forecastNextSegment(journey, squad, readiness) : null;
  const segmentThreat = segmentThreatFor(journey);
  const segmentMitigation = segmentThreatMitigationFor(segmentThreat, journey.support);
  const baseCommands = baseCommandOptions(journey);
  const counterLabels = segmentThreat.counterTactics
    .map((tacticId) => segmentTacticList.find((tactic) => tactic.id === tacticId)?.label ?? tacticId)
    .join(" / ");
  const mitigationLabel =
    segmentMitigation.value > 0
      ? `Facility: P-${segmentMitigation.pressure}%${segmentMitigation.fatigue > 0 ? ` / F-${segmentMitigation.fatigue}` : ""}`
      : "No facility cover";

  return (
    <div className="journey-panel">
      <div className="route-pacing" aria-label="Route pace">
        <div>
          <span>Route progress</span>
          <strong>
            {routePace.currentStop}/{routePace.totalStops}
          </strong>
          <small>
            {routePace.progressPercent}% to extraction / {routePace.remainingStops} stop(s) left
          </small>
        </div>
        <div>
          <span>Current beat</span>
          <strong>{routePace.currentLabel}</strong>
          <small>{routePace.currentTitle}</small>
        </div>
        <div>
          <span>Next stop</span>
          <strong>{routePace.nextLabel}</strong>
          <small>{routePace.nextTitle}</small>
        </div>
        <div>
          <span>March clock</span>
          <strong>{routePace.clockLabel}</strong>
          <small>{routePace.etaLabel}</small>
        </div>
      </div>
      <div className="journey-track" aria-label="Expedition route progress">
        {routePace.forecast.map((stop) => (
          <span className={stop.state} key={`${journey.id}-pace-${stop.index}`}>
            <b>{stop.index}</b>
            <small>{stop.label}</small>
          </span>
        ))}
      </div>
      <div className="journey-status-grid">
        <div className="journey-pressure">
          <span>Pressure</span>
          <strong>{journey.pressure}%</strong>
          <i>
            <b style={{ width: `${Math.max(0, Math.min(100, journey.pressure))}%` }} />
          </i>
        </div>
        <div className="journey-condition">
          <span>Road condition</span>
          <div>
            <strong>Dist {journey.condition.distance}</strong>
            <strong>Fatigue {journey.condition.fatigue}</strong>
            <strong>Hunger {journey.condition.hunger}</strong>
            <strong>Thirst {journey.condition.thirst}</strong>
          </div>
        </div>
        <div className={`journey-burden ${journey.burden.tier}`}>
          <span>Pack burden</span>
          <strong>
            {journey.burden.load}/{journey.burden.capacity}
          </strong>
          <i>
            <b style={{ width: `${Math.max(4, Math.min(100, Math.round((journey.burden.load / journey.burden.capacity) * 100)))}%` }} />
          </i>
          <small>{burdenSummary(journey.burden)}</small>
        </div>
        <JourneyResourceStrip title="Field supplies" resources={journey.fieldSupplies} />
        <JourneyResourceStrip title="Salvage" resources={journey.bonusReward} />
      </div>
      <div className={`journey-outlook ${outlook.tone}`}>
        <strong>{outlook.label}</strong>
        <span>{outlook.text}</span>
      </div>
      <div className="base-command-strip" aria-label="Base commands">
        {baseCommands.map((command) => (
          <button
            disabled={!command.canUse}
            key={command.id}
            type="button"
            onClick={() => onJourneyAction(`command-${command.id}` as JourneyAction)}
          >
            <div>
              <strong>{command.label}</strong>
              <span>
                {command.remainingUses}/{command.maxUses}
              </span>
            </div>
            <small>{command.effect}</small>
            <em>{command.text}</em>
          </button>
        ))}
      </div>
      {segmentForecast && (
        <div className={`march-forecast ${segmentForecast.riskLevel}`} aria-label="Next march forecast">
          <div>
            <span>Next march</span>
            <strong>Segment {segmentForecast.segment}</strong>
            <small>
              {segmentForecast.planLabel} / {segmentForecast.tacticLabel} / {segmentForecast.hours}h
            </small>
          </div>
          <div>
            <span>Cost</span>
            <strong>{segmentForecast.supplyUse.join(" / ")}</strong>
            <small>{segmentForecast.threatLabel}</small>
          </div>
          <div>
            <span>Change</span>
            <strong>
              F{formatSignedNumber(segmentForecast.conditionDeltas.fatigue)} H{formatSignedNumber(segmentForecast.conditionDeltas.hunger)} T
              {formatSignedNumber(segmentForecast.conditionDeltas.thirst)} P{formatSignedPercent(segmentForecast.pressureDelta)}
            </strong>
            <small>{segmentForecast.notes.slice(0, 2).join(" / ") || "Clean segment"}</small>
          </div>
          <div>
            <span>After</span>
            <strong>
              F{segmentForecast.resultingCondition.fatigue} H{segmentForecast.resultingCondition.hunger} T{segmentForecast.resultingCondition.thirst}
            </strong>
            <small>
              Pressure {segmentForecast.resultingPressure}% / Clock {segmentForecast.resultingElapsedHours}h
            </small>
            {segmentForecast.hardship && (
              <small className={`hardship-risk ${segmentForecast.hardship.severity}`}>
                Risk: {segmentForecast.hardship.label} ({segmentForecast.hardship.effects.join(", ")})
              </small>
            )}
          </div>
        </div>
      )}
      {journey.travelHistory.length > 0 && (
        <div className="travel-record-strip" aria-label="Road diary">
          {journey.travelHistory.slice(-3).map((record) => (
            <div className={`travel-record-card ${record.tone}`} key={`${journey.id}-travel-${record.segment}`}>
              <div>
                <span>Segment {record.segment}</span>
                <strong>{record.title}</strong>
              </div>
              <p>{record.body}</p>
              <small>{record.planLabel}</small>
              <small>Travel time {record.timeLabel}</small>
              <small>{record.conditionText}</small>
              <div>
                {record.effects.map((effect) => (
                  <b key={`${record.segment}-${effect}`}>{effect}</b>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      {journey.roadEvents.length > 0 && (
        <div className="road-event-strip" aria-label="Recent road events">
          {journey.roadEvents.slice(-3).map((event) => (
            <div className={`road-event-card ${event.tone}`} key={`${journey.id}-road-${event.segment}-${event.title}`}>
              <span>Seg {event.segment}</span>
              <strong>{event.title}</strong>
              <small>{event.outcome}</small>
            </div>
          ))}
        </div>
      )}
      {journey.hardships.length > 0 && (
        <div className="hardship-strip" aria-label="Recent road hardships">
          {journey.hardships.slice(-3).map((hardship) => (
            <div className={`hardship-card ${hardship.severity}`} key={`${journey.id}-hardship-${hardship.segment}-${hardship.id}`}>
              <span>Seg {hardship.segment}</span>
              <strong>{hardship.label}</strong>
              <small>{hardship.effects.join(" / ")}</small>
              {hardship.targetName && <small>{hardship.targetName} marked for treatment</small>}
            </div>
          ))}
        </div>
      )}
      <div className="journey-plan-strip" aria-label="Road travel plan">
        {travelPlanList.map((plan) => (
          <button
            className={journey.travelPlan === plan.id ? "active" : ""}
            key={plan.id}
            type="button"
            onClick={() => onJourneyAction(`plan-${plan.id}` as JourneyAction)}
          >
            <span>{plan.label}</span>
            <small>
              F{formatSignedNumber(plan.fatigue)} P{formatSignedPercent(plan.pressure)}
            </small>
          </button>
        ))}
      </div>
      <div className="segment-threat-card" aria-label="Segment threat">
        <div>
          <span>Segment threat</span>
          <strong>{segmentThreat.label}</strong>
          <small>{segmentThreat.text}</small>
        </div>
        <div>
          <span>Counter</span>
          <strong>{counterLabels}</strong>
          <small>
            F+{segmentThreat.fatigue} H+{segmentThreat.hunger} T+{segmentThreat.thirst} P+{segmentThreat.pressure}%
          </small>
          <small>{mitigationLabel}</small>
        </div>
      </div>
      <div className="segment-tactic-strip" aria-label="Next segment tactic">
        {segmentTacticList.map((tactic) => (
          <button
            className={journey.segmentTactic === tactic.id ? "active" : ""}
            key={tactic.id}
            type="button"
            onClick={() => onJourneyAction(`tactic-${tactic.id}` as JourneyAction)}
          >
            <span>{tactic.label}</span>
            <small>{tactic.supplyPriority.length > 0 ? `Cost ${tactic.supplyPriority.map((key) => resourceLabels[key]).join("/")}` : "No cost"}</small>
            <small>
              F{formatSignedNumber(tactic.fatigue)} H{formatSignedNumber(tactic.hunger)} T{formatSignedNumber(tactic.thirst)} P
              {formatSignedPercent(tactic.pressure)}
            </small>
          </button>
        ))}
      </div>
      {(journey.trophies.length > 0 || journey.battleScars > 0) && (
        <div className="journey-aftermath">
          <span>Combat aftermath</span>
          {journey.trophies.length > 0 && <strong>Trophies: {journey.trophies.join(", ")}</strong>}
          {journey.battleScars > 0 && <strong>Battle scars: {journey.battleScars}</strong>}
        </div>
      )}
      <div className="journey-node">
        <span className="subtle-pill">{nodeTypeLabel}</span>
        <h3>{nodeTitle}</h3>
        <p>{nodeBody}</p>
        {pendingRoad ? (
          <div className="road-choice-card">
            <div>
              <strong>Road decision</strong>
              <span>Segment {pendingRoad.segment} blocks the next stop. Resolve it before the squad reaches the next node.</span>
            </div>
            <div className="combat-loot-grid">
              {pendingRoad.choices.map((choice) => (
                <button key={choice.id} type="button" onClick={() => onJourneyAction(`road-${choice.id}` as JourneyAction)}>
                  <strong>{choice.label}</strong>
                  <span>{choice.text}</span>
                  <small>
                    {choice.supplyPriority.length > 0 ? `Cost ${choice.supplyPriority.map((key) => resourceLabels[key]).join("/")}; ` : ""}
                    {formatResourceDelta(choice.reward)} | F{formatSignedNumber(choice.fatigue)} H{formatSignedNumber(choice.hunger)} T
                    {formatSignedNumber(choice.thirst)} P{formatSignedPercent(choice.pressure)}
                  </small>
                  {choice.supportText && <small className="facility-support-note">{choice.supportText}</small>}
                </button>
              ))}
            </div>
          </div>
        ) : journey.pendingCombatLoot ? (
          <div className="combat-loot-card">
            <div>
              <strong>{journey.pendingCombatLoot.enemyName} down</strong>
              <span>Trophy secured: {journey.pendingCombatLoot.trophy}</span>
            </div>
            <div className="combat-loot-grid">
              {combatLootList.map((option) => {
                const outcome = combatLootOutcome(option, journey.support);
                return (
                  <button key={option.id} type="button" onClick={() => onJourneyAction(`loot-${option.id}` as JourneyAction)}>
                    <strong>{option.label}</strong>
                    <span>{option.text}</span>
                    <small>
                      {formatResourceDelta(outcome.reward)} | F{formatSignedNumber(outcome.fatigue)} | P{formatSignedPercent(outcome.pressure)}
                      {outcome.objectiveBonus > 0 ? ` | Obj +${outcome.objectiveBonus}` : ""}
                      {outcome.battleScarRelief > 0 ? ` | Scar -${outcome.battleScarRelief}` : ""}
                    </small>
                    {outcome.supportText && <small className="facility-support-note">{outcome.supportText}</small>}
                  </button>
                );
              })}
            </div>
          </div>
        ) : journey.combat ? (
          <div className="combat-card">
            <div className="combat-trait">
              <strong>{journey.combat.enemyTraitLabel}</strong>
              <span>{journey.combat.enemyTraitText}</span>
            </div>
            <div className="combat-intent">
              <strong>Intent: {journey.combat.intentLabel}</strong>
              <span>{journey.combat.intentText}</span>
            </div>
            <div className="combat-special">
              <strong>{activeCombatPulse?.label}</strong>
              <span>{activeCombatPulse?.text}</span>
              <small>Counter: {activeCombatPulse?.counterActions.map(combatActionLabel).join(" / ")}</small>
            </div>
            <div className="combat-rhythm">
              <div>
                <span>Tempo</span>
                <strong>{journey.combat.tempo ?? 0}/3</strong>
                <small>Correct counters improve damage, guard, healing, and tactics.</small>
              </div>
              <div>
                <span>Stagger</span>
                <strong>{journey.combat.stagger ?? 0}/3</strong>
                <small>Three counter reads break posture: armor -1, exposed +2.</small>
              </div>
            </div>
            <div className="combat-bars">
              <CombatBar label={journey.combat.enemyName} value={journey.combat.enemyHp} max={journey.combat.enemyMaxHp} tone="danger" />
              <CombatBar label="Squad" value={journey.combat.squadHp} max={journey.combat.squadMaxHp} tone="safe" />
            </div>
            <div className="frontline-grid">
              {journey.combat.frontline.map((line) => (
                <div className={`frontline-row ${line.status}`} key={line.survivorId}>
                  <div>
                    <strong>{line.name}</strong>
                    <span>
                      {line.role} {line.lastAction ? `/ ${line.lastAction}` : ""}
                    </span>
                  </div>
                  <div className="frontline-meter">
                    <i style={{ width: `${Math.round((line.stamina / line.maxStamina) * 100)}%` }} />
                  </div>
                  <small>
                    {line.stamina}/{line.maxStamina}
                    {line.guard > 0 ? ` | Guard ${line.guard}` : ""}
                    {line.wounds > 0 ? ` | Wounds ${line.wounds}` : ""}
                    {line.status === "down" ? " | Down" : line.status === "strained" ? " | Strained" : ""}
                  </small>
                </div>
              ))}
            </div>
            <div className="combat-stats">
              <span>Atk {journey.combat.attack}</span>
              <span>Armor {Math.max(0, journey.combat.armor - journey.combat.exposed)}</span>
              <span>Exposed {journey.combat.exposed}</span>
              <span>Bleed {journey.combat.bleed}</span>
              <span>Tempo {journey.combat.tempo ?? 0}</span>
              <span>Stagger {journey.combat.stagger ?? 0}</span>
            </div>
            <div className="combat-action-grid">
              {combatActionList.map((action) => {
                const preview = combatActionPreview(journey, action, squad, readiness);
                if (!preview) {
                  return null;
                }
                const Icon = combatActionIcon(action);
                return (
                  <button className={`combat-action-card ${preview.counterTag.toLowerCase()}`} key={action} type="button" onClick={() => onCombatAction(action)}>
                    <div>
                      <Icon size={16} aria-hidden="true" />
                      <strong>{preview.label}</strong>
                      <b>{preview.counterTag}</b>
                    </div>
                    <span>{preview.actorName}</span>
                    <small>{preview.effect}</small>
                    <small>{preview.cost}</small>
                    <em>{preview.risk}</em>
                  </button>
                );
              })}
            </div>
          </div>
        ) : activeNode.type === "event" ? (
          <div className="journey-actions">
            <button className="primary-button" type="button" onClick={() => onJourneyAction("careful")}>
              {activeNode.careful?.label ?? "Careful search"}
            </button>
            <button className="ghost-button inline" type="button" onClick={() => onJourneyAction("force")}>
              {activeNode.force?.label ?? "Force route"}
            </button>
          </div>
        ) : activeNode.type === "shop" ? (
          <div className="shop-choice-card">
            <div>
              <strong>Exchange decision</strong>
              <span>Spend surviving field goods for rations, route intel, or a last repair package.</span>
            </div>
            <div className="combat-loot-grid">
              {shopActionList.map((action) => {
                const offer = activeNode.shop?.offers[action];
                if (!offer) {
                  return null;
                }
                const outcome = shopOfferOutcome(action, offer, journey.support);
                return (
                  <button key={action} type="button" onClick={() => onJourneyAction(`shop-${action}` as JourneyAction)}>
                    <strong>{outcome.label}</strong>
                    <span>{outcome.text}</span>
                    <small>
                      Cost {outcome.costPriority.map((key) => resourceLabels[key]).join("/") || "none"} | Field{" "}
                      {formatResourceDelta(outcome.fieldSupplyReward)} | Stash {formatResourceDelta(outcome.reward)} | P{formatSignedPercent(outcome.pressure)}
                      {outcome.objectiveBonus > 0 ? ` | Obj +${outcome.objectiveBonus}` : ""}
                    </small>
                    {outcome.supportText && <small className="facility-support-note">{outcome.supportText}</small>}
                  </button>
                );
              })}
            </div>
            <div className="journey-actions">
              <button className="ghost-button inline" type="button" onClick={() => onJourneyAction("skip")}>
                <ShoppingCart size={17} aria-hidden="true" />
                Skip exchange
              </button>
            </div>
          </div>
        ) : activeNode.type === "camp" ? (
          <div className="camp-choice-card">
            <div>
              <strong>Camp decision</strong>
              <span>Use field supplies and base support to recover, eat, or map the next leg.</span>
            </div>
            <div className="combat-loot-grid">
              {campActionList.map((action) => {
                const option = activeNode.camp?.[action];
                if (!option) {
                  return null;
                }
                const outcome = campOptionOutcome(action, option, journey.support);
                return (
                  <button key={action} type="button" onClick={() => onJourneyAction(action)}>
                    <strong>{outcome.label}</strong>
                    <span>{outcome.successLog}</span>
                    <small>
                      Cost {outcome.supplyPriority.map((key) => resourceLabels[key]).join("/") || "none"} | F{formatSignedNumber(outcome.fatigue)} H
                      {formatSignedNumber(outcome.hunger)} T{formatSignedNumber(outcome.thirst)} P{formatSignedPercent(outcome.pressure)}
                      {outcome.objectiveBonus > 0 ? ` | Obj +${outcome.objectiveBonus}` : ""}
                    </small>
                    {outcome.supportText && <small className="facility-support-note">{outcome.supportText}</small>}
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <button className="primary-button full-width" type="button" onClick={() => onJourneyAction("extract")}>
            Extract and settle
          </button>
        )}
        {canReturnEarly && (
          <div className="journey-actions">
            <button className="ghost-button inline danger-action" type="button" onClick={() => onJourneyAction("extract")}>
              Return early
            </button>
          </div>
        )}
      </div>
      <div className="journey-log">
        {journey.logs.slice(-6).map((line, index) => (
          <p key={`${journey.id}-log-${index}`}>{line}</p>
        ))}
      </div>
    </div>
  );
}

function JourneyResourceStrip({ resources, title }: { resources: ResourceBundle; title: string }) {
  return (
    <div className="journey-resource-strip">
      <span>{title}</span>
      <div>
        {resourceKeys.map((key) => (
          <small className={resources[key] > 0 ? "has-value" : ""} key={key}>
            {resourceLabels[key]} {resources[key]}
          </small>
        ))}
      </div>
    </div>
  );
}

function BurdenPreview({ burden }: { burden: JourneyCarryBurden }) {
  const fill = Math.max(4, Math.min(100, Math.round((burden.load / burden.capacity) * 100)));
  return (
    <div className={`burden-preview ${burden.tier}`}>
      <div>
        <span>Pack load</span>
        <strong>
          {burden.load}/{burden.capacity}
        </strong>
      </div>
      <i>
        <b style={{ width: `${fill}%` }} />
      </i>
      <p>{burdenSummary(burden)}</p>
    </div>
  );
}

function burdenSummary(burden: JourneyCarryBurden) {
  if (burden.tier === "overloaded") {
    return `Overloaded: start pressure +${burden.pressurePenalty}%, travel fatigue +${burden.fatiguePenalty}.`;
  }

  if (burden.tier === "heavy") {
    return `Heavy pack: start pressure +${burden.pressurePenalty}%, travel fatigue +${burden.fatiguePenalty}.`;
  }

  return `Light pack: start pressure ${burden.pressurePenalty}%, no travel fatigue penalty.`;
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

function Facilities({
  state,
  developmentPlan,
  onUpgrade
}: {
  state: GameState;
  developmentPlan: BaseDevelopmentPlan;
  onUpgrade: (id: string) => void;
}) {
  return (
    <section className="panel">
      <p className="eyebrow">Facilities</p>
      <h2>Base development</h2>
      <div className="development-plan-card" aria-label="Base development plan">
        <div>
          <span>Development plan</span>
          <strong>{developmentPlan.summary}</strong>
          <small>
            {developmentPlan.recommended.length
              ? "Recommended projects for the next build cycle"
              : "All facilities are fully developed"}
          </small>
        </div>
        <div className="development-project-strip">
          {developmentPlan.recommended.map((project) => (
            <article
              className={project.canAfford ? "development-project-card" : "development-project-card gated"}
              key={project.id}
            >
              <div>
                <strong>{project.name}</strong>
                <span>{project.action} to Lv.{project.nextLevel}</span>
              </div>
              <small>
                {project.canAfford ? `${project.cost} materials ready` : `Need ${project.materialDeficit} more materials`}
              </small>
              <p>{project.baseImpact}</p>
              <p>{project.expeditionImpact}</p>
            </article>
          ))}
        </div>
      </div>
      <div className="facility-grid">
        {state.facilities.map((facility) => {
          const cost = facilityActionCost(facility);
          const actionLabel = facilityActionLabel(facility);
          const built = isFacilityBuilt(facility);
          const maxed = isFacilityMaxed(facility);
          const preview = facilityUpgradePreview(facility);
          return (
            <article className={`facility-card ${facility.status} ${built ? "" : "unbuilt"}`} key={facility.id}>
              <div className="facility-title-row">
                <h3>{facility.name}</h3>
                <small>{facility.category ?? "core"}</small>
              </div>
              <span>{built ? `Level ${facility.level}` : "Blueprint"}</span>
              <p>{facility.effect}</p>
              <div className="facility-upgrade-preview">
                <strong>{preview[0]}</strong>
                <span>{preview[1]}</span>
              </div>
              <button
                className="ghost-button compact-action"
                type="button"
                disabled={maxed || state.resources.materials < cost}
                onClick={() => onUpgrade(facility.id)}
              >
                <Wrench size={16} aria-hidden="true" />
                {maxed ? "Fully developed" : `${actionLabel}: ${cost} materials`}
              </button>
            </article>
          );
        })}
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

function applyJourneyBonus(session: PlaytestSession, report: { logs: string[]; reward: ResourceBundle }, bonusReward: ResourceBundle) {
  const claimed = resourceKeys.filter((key) => bonusReward[key] > 0);
  if (claimed.length === 0) {
    return;
  }

  for (const key of claimed) {
    session.room.base.resources[key] += bonusReward[key];
    report.reward[key] += bonusReward[key];
  }

  const bonusLine = `Field salvage secured: ${formatResourceDelta(bonusReward)}.`;
  report.logs.unshift(bonusLine);
  if (session.room.feed[0]) {
    session.room.feed[0] = {
      ...session.room.feed[0],
      body: `${session.room.feed[0].body}\n${bonusLine}`
    };
  }
}

function applyJourneyChoice(journey: JourneyState, title: string, choice: JourneyChoice) {
  const spentKey = spendFieldSupplyFromPriority(journey, choice.supplyPriority, 1);
  addResources(journey.bonusReward, choice.reward);

  if (spentKey) {
    journey.pressure = clampPercent(journey.pressure + choice.pressure);
    journey.rollShift += choice.rollShift;
    journey.logs.push(
      `${title}: ${choice.successLog} ${resourceLabels[spentKey]} -1, ${formatResourceDelta(choice.reward)}, pressure ${formatSignedPercent(
        choice.pressure
      )}.`
    );
    return;
  }

  const fallbackPressure = choice.pressure < 0 ? 5 : Math.max(8, choice.pressure);
  journey.pressure = clampPercent(journey.pressure + fallbackPressure);
  journey.rollShift += choice.rollShift < 0 ? choice.rollShift / 2 : choice.rollShift;
  journey.logs.push(`${title}: ${choice.fallbackLog} ${formatResourceDelta(choice.reward)}, pressure ${formatSignedPercent(fallbackPressure)}.`);
}

function travelPlanFromAction(action: JourneyAction): JourneyTravelPlan | null {
  const planByAction: Partial<Record<JourneyAction, JourneyTravelPlan>> = {
    "plan-rush": "rush",
    "plan-scavenge": "scavenge",
    "plan-sneak": "sneak",
    "plan-steady": "steady"
  };
  return planByAction[action] ?? null;
}

function segmentTacticFromAction(action: JourneyAction): JourneySegmentTactic | null {
  const tacticByAction: Partial<Record<JourneyAction, JourneySegmentTactic>> = {
    "tactic-brace": "brace",
    "tactic-observe": "observe",
    "tactic-prospect": "prospect",
    "tactic-ration": "ration"
  };
  return tacticByAction[action] ?? null;
}

function combatLootActionFromJourneyAction(action: JourneyAction): JourneyCombatLootAction | null {
  const lootByAction: Partial<Record<JourneyAction, JourneyCombatLootAction>> = {
    "loot-evade": "evade",
    "loot-intel": "intel",
    "loot-medicine": "medicine",
    "loot-salvage": "salvage"
  };
  return lootByAction[action] ?? null;
}

function baseCommandActionFromJourneyAction(action: JourneyAction): JourneyBaseCommandAction | null {
  const commandByAction: Partial<Record<JourneyAction, JourneyBaseCommandAction>> = {
    "command-guard-relay": "guard-relay",
    "command-recon-ping": "recon-ping",
    "command-supply-cache": "supply-cache"
  };
  return commandByAction[action] ?? null;
}

function combatActionIcon(action: CombatAction) {
  const icons: Record<CombatAction, typeof Swords> = {
    guard: Shield,
    patch: PackageCheck,
    retreat: RotateCcw,
    strike: Swords,
    tactic: Activity
  };
  return icons[action];
}

function combatActionLabel(action: CombatAction) {
  const labels: Record<CombatAction, string> = {
    guard: "Guard",
    patch: "Patch",
    retreat: "Retreat",
    strike: "Strike",
    tactic: "Tactic"
  };
  return labels[action];
}

function shopActionFromJourneyAction(action: JourneyAction): JourneyShopAction | null {
  const shopByAction: Partial<Record<JourneyAction, JourneyShopAction>> = {
    "shop-intel": "intel",
    "shop-resupply": "resupply",
    "shop-service": "service",
    trade: "service"
  };
  return shopByAction[action] ?? null;
}

function roadEncounterActionFromJourneyAction(action: JourneyAction): JourneyRoadEncounterAction | null {
  const roadByAction: Partial<Record<JourneyAction, JourneyRoadEncounterAction>> = {
    "road-push": "push",
    "road-search": "search",
    "road-secure": "secure",
    "road-support": "support"
  };
  return roadByAction[action] ?? null;
}

function getJourneyOutlook(journey: JourneyState) {
  const worstCondition = Math.max(journey.condition.fatigue, journey.condition.hunger, journey.condition.thirst);
  if (journey.pressure >= 78 || worstCondition >= 82) {
    return {
      label: "Red route",
      text: "The next leg is likely to turn ugly. Returning early preserves field salvage.",
      tone: "danger"
    };
  }

  if (journey.pressure >= 52 || worstCondition >= 58) {
    return {
      label: "Strained route",
      text: "The squad can continue, but supplies or camp actions should solve the road soon.",
      tone: "warning"
    };
  }

  return {
    label: "Open route",
    text: "The road is still controllable. This is a good window to push, scout, or scavenge.",
    tone: "safe"
  };
}

function formatResourceDelta(resources: ResourceBundle) {
  const entries = resourceKeys.filter((key) => resources[key] > 0);
  if (entries.length === 0) {
    return "none";
  }

  return entries.map((key) => `${resourceLabels[key]} +${resources[key]}`).join(" / ");
}

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, value));
}

function formatSignedPercent(value: number) {
  return `${value >= 0 ? "+" : ""}${value}%`;
}

function formatSignedNumber(value: number) {
  return `${value >= 0 ? "+" : ""}${value}`;
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
