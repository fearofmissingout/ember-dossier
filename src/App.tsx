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
import { facilityActionCost, facilityActionLabel, facilityImpactPreview, isFacilityBuilt, isFacilityMaxed } from "./game/facilities";
import { clearDemoState, createInitialState, loadDemoState, saveDemoState } from "./game/state";
import type { FeedItem, GameState, ResourceBundle, ResourceKey, RiskStrategy } from "./game/types";
import {
  advanceRoomDay,
  applyContribution,
  baseDayPreview,
  assignSurvivorToRoom,
  accountBaseDevelopmentPlan,
  baseDevelopmentPlan,
  baseRecoveryPlan,
  baseTaskList,
  resolvePlaytestExpedition,
  roomCooperationSummary,
  roomMemberSummaries,
  setBaseAssignment,
  treatSurvivor,
  upgradeAccountBase,
  upgradeFacility,
  type AccountBaseDevelopmentPlan,
  type AccountBaseFacilityId,
  type BaseTaskItem,
  type BaseDevelopmentPlan,
  type BaseRecoveryPlan,
  type RoomCooperationSummary,
  type RoomMemberSummary
} from "./playtest/sim";
import {
  addResources,
  advanceJourneyTravel,
  baseCommandOptions,
  campOptionOutcome,
  calculateCarryBurden,
  combatActionPreview,
  combatThreatPreview,
  combatLootOutcome,
  combatLootList,
  createCombatForNode,
  createJourney,
  enemyTraitPulse,
  forecastNextSegment,
  journeyExtractionPreview,
  journeyDecisionSummaryLines,
  journeyActionGuide,
  journeyObjectivePreview,
  journeyProcessDigest,
  journeyRouteBriefing,
  recordJourneyDecision,
  resolveCampAction,
  resolveBaseCommand,
  resolveCombatLootChoice,
  resolveRoadEncounterChoice,
  roadEncounterChoicePreview,
  resolveJourneyExtraction,
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
  type JourneyCombatRoundRecord,
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
  accountBaseSupportBriefing,
  basePrepSupportFromAssignments,
  expeditionDoctrineOptions,
  expeditionSupportPlan,
  isSurvivorAtLevelCap,
  mergeExpeditionSupport,
  supportFromAccountBase,
  supportFromFacilities,
  survivorPerkDetails,
  xpForNextLevel,
  type ExpeditionDoctrineId
} from "./playtest/progression";
import { clearPlaytestSession, createStarterSession, loadPlaytestSession, savePlaytestSession } from "./playtest/state";
import { expeditionLaunchChecklist, expeditionYieldPreview } from "./playtest/launchChecklist";
import { runPlayableLoopSmoke } from "./playtest/playableLoop";
import {
  summarizeFeedBaseReturnPlan,
  summarizeFeedGrowthRoadmap,
  summarizeFeedReportSettlement,
  summarizeFeedReportTimeline,
  summarizeFeedReturnLedger
} from "./playtest/reports";
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
  { key: "idle", label: "休息" },
  { key: "forage", label: "搜寻" },
  { key: "repair", label: "修理" },
  { key: "guard", label: "守卫" },
  { key: "care", label: "护理" }
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
      setAuthNotice("请先输入账号。");
      return;
    }

    if (authPassword.length < 6) {
      setAuthNotice("密码至少需要 6 个字符。");
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
        setAuthNotice("邮箱已确认，正在读取你的试玩账号。");
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
      player.name || authSession.email || "玩家",
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
      console.warn("Failed to load Supabase demo state", error);
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

  function upgradePersonalBase(facilityId: AccountBaseFacilityId) {
    try {
      const nextSession = upgradeAccountBase(session, session.account.profile.userId, facilityId);
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
    const accountSupport = supportFromAccountBase(preparedSession.account.base);
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
          support: mergeExpeditionSupport(mergeExpeditionSupport(facilitySupport, accountSupport), basePrepSupport)
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

    if (action === "extract") {
      finishJourney(resolveJourneyExtraction(journey));
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
    if (!node || node.type === "extraction") {
      finishJourney(resolveJourneyExtraction(journey));
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
        next.logs.push(`${node.title}：队伍没有停留交易，保留议价筹码继续前进。`);
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
      journeyLogs: [...completedJourney.logs, ...journeyDecisionSummaryLines(completedJourney)],
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
          <p className="eyebrow">试玩登录</p>
          <h1>加入房间 {roomSlug}</h1>
          <label className="auth-field">
            <span>账号</span>
            <input value={authEmail} onChange={(event) => setAuthEmail(event.target.value)} placeholder="alice_01" />
          </label>
          <label className="auth-field">
            <span>密码</span>
            <input
              value={authPassword}
              minLength={6}
              onChange={(event) => setAuthPassword(event.target.value)}
              placeholder="至少 6 个字符"
              type="password"
            />
          </label>
          <div className="auth-actions">
            <button className="primary-button full-width" disabled={authSubmitting} type="button" onClick={() => submitPasswordAuth("signin")}>
              <Send size={18} aria-hidden="true" />
              登录
            </button>
            <button className="ghost-button auth-secondary" disabled={authSubmitting} type="button" onClick={() => submitPasswordAuth("signup")}>
              <Shield size={18} aria-hidden="true" />
              创建试玩账号
            </button>
            <button className="ghost-button auth-secondary" disabled={authSubmitting} type="button" onClick={continueAsGuest}>
              <Users size={18} aria-hidden="true" />
              游客继续
            </button>
          </div>
          <p className="muted-copy">
            账号支持 3-20 位字母、数字或下划线。试玩账号不需要邮箱确认。
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
          重置试玩
        </button>
        {hasSupabaseConfig && guestMode && !authSession && (
          <button className="ghost-button" type="button" onClick={switchToAccountLogin}>
            <Shield size={17} aria-hidden="true" />
            账号登录
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

        <div className="mobile-command-strip" aria-label="手机端单页行动栏">
          <div>
            <span>{roomSlug}</span>
            <strong>{syncStatusLabels[syncStatus]}</strong>
          </div>
          <button className={view === "expedition" ? "active" : ""} type="button" onClick={() => setView("expedition")}>
            出征
          </button>
          <button className={view === "survivors" ? "active" : ""} type="button" onClick={() => setView("survivors")}>
            编队
          </button>
          <button className={view === "facilities" ? "active" : ""} type="button" onClick={() => setView("facilities")}>
            建设
          </button>
        </div>

        {view === "overview" && (
          <Overview
            state={state}
            session={session}
            accountBasePlan={accountBaseDevelopmentPlan(session.account)}
            contributionDraft={contributionDraft}
            goExpedition={() => setView("expedition")}
            onNavigate={setView}
            onAccountBaseUpgrade={upgradePersonalBase}
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
            accountBase={session.account.base}
            accountSurvivors={session.account.survivors}
            baseAssignments={session.room.baseAssignments}
            state={state}
            draft={draft}
            selectedLocation={selectedLocation}
            readiness={readiness}
            session={session}
            squadReady={squadReady}
            canAffordLoadout={canAffordLoadout && objectiveActive}
            objective={session.room.base.objective}
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
        {view === "reports" && <Reports feed={session.room.feed} latestReportId={latestReportId} onNavigate={setView} />}
        {view === "facilities" && (
          <Facilities state={state} developmentPlan={baseDevelopmentPlan(session)} onUpgrade={upgradeRoomFacility} />
        )}
        {view === "members" && (
          <RoomMembers
            player={player}
            players={roomPlayers}
            memberSummaries={roomMemberSummaries(session)}
            roomSlug={roomSlug}
            summary={roomCooperationSummary(session)}
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
  accountBasePlan,
  contributionDraft,
  goExpedition,
  onNavigate,
  onAccountBaseUpgrade,
  onContributionChange,
  onContribute,
  onEndDay
}: {
  state: GameState;
  session: PlaytestSession;
  accountBasePlan: AccountBaseDevelopmentPlan;
  contributionDraft: ResourceBundle;
  goExpedition: () => void;
  onNavigate: (view: ViewKey) => void;
  onAccountBaseUpgrade: (id: AccountBaseFacilityId) => void;
  onContributionChange: (key: ResourceKey, delta: number) => void;
  onContribute: () => void;
  onEndDay: () => void;
}) {
  const objective = session.room.base.objective;
  const objectiveProgress = Math.round((objective.repairedParts / objective.requiredParts) * 100);
  const daysRemaining = Math.max(0, objective.deadlineDay - session.room.base.day + 1);
  const dayPreview = baseDayPreview(session);
  const tasks = baseTaskList(session);
  const accountRooms = [
    { label: "训练室", level: session.account.base.trainingRoomLevel },
    { label: "医务室", level: session.account.base.medicalRoomLevel },
    { label: "仓库", level: session.account.base.warehouseLevel },
    { label: "电台", level: session.account.base.radioBenchLevel }
  ];
  const handleTaskAction = (taskId: BaseTaskItem["id"]) => {
    const action = baseTaskNavigation(taskId);
    if (action.view) {
      onNavigate(action.view);
      return;
    }

    if (action.sectionId) {
      document.getElementById(action.sectionId)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };
  const primaryTask = tasks.items[0];
  const primaryTaskAction = baseTaskNavigation(primaryTask.id);
  const commandActions = [
    { icon: Send, label: "准备远征", text: "编队、地点、补给", view: "expedition" as ViewKey },
    { icon: Users, label: "处理伤病", text: "治疗与班次", view: "survivors" as ViewKey },
    { icon: Wrench, label: "发展设施", text: "建造和升级", view: "facilities" as ViewKey }
  ];

  return (
    <div className="view-grid">
      <section className="panel account-band">
        <p className="eyebrow">个人基地</p>
        <h2>{session.account.profile.displayName}</h2>
        <div className="account-resource-strip" aria-label="个人资源">
          <span>
            材料 <b>{accountBasePlan.resources.materials}</b>
          </span>
          <span>
            稀有零件 <b>{accountBasePlan.resources.rareParts}</b>
          </span>
          <span>
            情报 <b>{accountBasePlan.resources.intel}</b>
          </span>
        </div>
        <div className="account-base-levels">
          {accountRooms.map((room) => (
            <span key={room.label}>
              {room.label}
              <b>Lv.{room.level}</b>
            </span>
          ))}
        </div>
        <div className="account-base-plan" aria-label="个人基地发展计划">
          <div>
            <span>发展计划</span>
            <strong>{accountBasePlan.summary}</strong>
          </div>
          <div className="account-upgrade-list">
            {accountBasePlan.projects.map((project) => (
              <div className={`account-upgrade-row ${project.status}`} key={project.id}>
                <div>
                  <strong>{project.name}</strong>
                  <span>
                    Lv.{project.currentLevel} → Lv.{project.nextLevel}
                  </span>
                  <small>{project.effect}</small>
                </div>
                <div>
                  <small>{formatAccountBaseProjectCost(project.cost)}</small>
                  <button
                    className="ghost-button compact-action"
                    disabled={!project.canAfford}
                    type="button"
                    onClick={() => onAccountBaseUpgrade(project.id)}
                  >
                    <Wrench size={16} aria-hidden="true" />
                    {accountBaseProjectActionLabel(project)}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="panel objective-band">
        <p className="eyebrow">房间目标</p>
        <h2>{objective.title}</h2>
        <div className={`objective-status ${objective.status}`}>
          <span>第 {session.room.base.day} 天</span>
          <strong>{objective.status === "active" ? "进行中" : objective.status === "won" ? "已完成" : "失败"}</strong>
        </div>
        <div className="readiness-meter">
          <span>修复进度</span>
          <div>
            <i style={{ width: `${Math.max(6, objectiveProgress)}%` }} />
          </div>
          <strong>{objective.repairedParts}/{objective.requiredParts}</strong>
        </div>
        <div className="metric-pair">
          <span>剩余期限</span>
          <strong>{daysRemaining} 天</strong>
        </div>
        <div className="base-cycle-compass" aria-label="基地循环罗盘">
          {baseCycleSteps(primaryTask.id).map((step) => (
            <article className={step.active ? "active" : ""} key={step.label}>
              <span>{step.label}</span>
              <strong>{step.title}</strong>
              <small>{step.body}</small>
            </article>
          ))}
        </div>
        <div className="base-task-list" aria-label="今日基地待办">
          <div className="base-command-center" aria-label="基地行动中枢">
            <div className="base-command-priority">
              <span>基地行动中枢</span>
              <strong>{primaryTask.title}</strong>
              <small>{primaryTask.body}</small>
            </div>
            <div className="base-command-actions">
              <button type="button" onClick={() => handleTaskAction(primaryTask.id)}>
                <Activity size={16} aria-hidden="true" />
                <strong>{primaryTaskAction.label}</strong>
                <small>优先处理</small>
              </button>
              {commandActions.map((action) => {
                const Icon = action.icon;
                return (
                  <button type="button" key={action.label} onClick={() => onNavigate(action.view)}>
                    <Icon size={16} aria-hidden="true" />
                    <strong>{action.label}</strong>
                    <small>{action.text}</small>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="base-task-heading">
            <span>今日待办</span>
            <strong>{tasks.summary}</strong>
          </div>
          <div className="base-task-grid">
            {tasks.items.slice(0, 4).map((task) => (
              <article className={`base-task-card ${task.status}`} key={task.id}>
                <span>{task.actionLabel}</span>
                <strong>{task.title}</strong>
                <small>{task.body}</small>
                <div className="base-task-actions" aria-label="今日待办操作">
                  <button type="button" onClick={() => handleTaskAction(task.id)}>
                    {baseTaskNavigation(task.id).label}
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>
        <div className="base-day-preview" aria-label="基地日程预报">
          <div>
            <span>明日预报</span>
            <strong>第 {dayPreview.nextDay} 天</strong>
            <small>{dayPreview.summary}</small>
          </div>
          <div className="base-day-preview-grid">
            <span>
              补给
              <b>
                食物 -{dayPreview.foodNeed - dayPreview.foodShortage}/{dayPreview.foodNeed} / 水 -{dayPreview.waterNeed - dayPreview.waterShortage}/
                {dayPreview.waterNeed}
              </b>
              <small>{dayPreview.supplySummary}</small>
            </span>
            <span>
              压力
              <b>
                士气 {formatSignedNumber(dayPreview.moraleDelta)} / 危险 {formatSignedNumber(dayPreview.dangerDelta)}
              </b>
              <small>设施与守卫减压 {dayPreview.dangerRelief}</small>
            </span>
            <span>
              目标
              <b>
                {dayPreview.objectiveProjected}/{objective.requiredParts}
              </b>
              <small>{dayPreview.repairSummary}</small>
            </span>
            <span>
              恢复
              <b>{dayPreview.shiftCounts.care} 个护理班</b>
              <small>{dayPreview.recoverySummary}</small>
            </span>
          </div>
          <small className="base-day-preview-note">
            {dayPreview.guardSummary}；{dayPreview.forageSummary}
          </small>
        </div>
        <button className="primary-button full-width" type="button" disabled={objective.status !== "active"} onClick={onEndDay}>
          <CalendarDays size={18} aria-hidden="true" />
          结束当天
        </button>
      </section>

      <section className="panel wide">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">基地资源</p>
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

      <section className="panel wide" id="contribution-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">捐入资源</p>
            <h2>个人库存转入房间基地</h2>
          </div>
          <button className="primary-button" type="button" onClick={onContribute}>
            <Archive size={18} aria-hidden="true" />
            捐入
          </button>
        </div>
        <div className="contribution-grid">
          {resourceKeys.map((key) => (
            <div className="loadout-row contribution-row" key={key}>
              <span>{resourceLabels[key]}</span>
              <small>个人 {session.account.resources[key]}</small>
              <div>
                <button className="icon-button" type="button" onClick={() => onContributionChange(key, -1)} aria-label={`减少${resourceLabels[key]}`}>
                  <Minus size={16} />
                </button>
                <strong>{contributionDraft[key]}</strong>
                <button className="icon-button" type="button" onClick={() => onContributionChange(key, 1)} aria-label={`增加${resourceLabels[key]}`}>
                  <Plus size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="panel">
        <p className="eyebrow">设施状态</p>
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
        <p className="eyebrow">近期动态</p>
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
        <p className="eyebrow">队伍健康</p>
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

function baseTaskNavigation(taskId: BaseTaskItem["id"]): { label: string; sectionId?: string; view?: ViewKey } {
  const actions: Record<BaseTaskItem["id"], { label: string; sectionId?: string; view?: ViewKey }> = {
    development: { label: "查看设施", view: "facilities" },
    expedition: { label: "准备远征", view: "expedition" },
    objective: { label: "查看房间", view: "members" },
    recovery: { label: "查看伤病", view: "survivors" },
    shifts: { label: "安排班次", view: "survivors" },
    supplies: { label: "处理捐入", sectionId: "contribution-panel" }
  };

  return actions[taskId];
}

function baseCycleSteps(primaryTaskId: BaseTaskItem["id"]) {
  const activeByTask: Record<BaseTaskItem["id"], string> = {
    development: "建设",
    expedition: "出征",
    objective: "复盘",
    recovery: "恢复",
    shifts: "恢复",
    supplies: "恢复"
  };
  const activeLabel = activeByTask[primaryTaskId];
  const steps = [
    {
      body: "处理伤病、补齐口粮、安排班次。",
      label: "恢复",
      title: "稳住基地"
    },
    {
      body: "升级个人基地和房间设施，转化长期优势。",
      label: "建设",
      title: "扩大支援"
    },
    {
      body: "编队、带补给、选择地点推进目标。",
      label: "出征",
      title: "拿回资源"
    },
    {
      body: "查看战报，把伤病、战利和线索接回下一轮。",
      label: "复盘",
      title: "整理结果"
    }
  ];

  return steps.map((step) => ({
    ...step,
    active: step.label === activeLabel
  }));
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
          <p className="eyebrow">幸存者</p>
          <h2>幸存者档案</h2>
        </div>
        <span className="subtle-pill">已选 {selectedIds.length}/5</span>
      </div>
      <div className="recovery-plan-card" aria-label="基地恢复计划">
        <div>
          <span>恢复计划</span>
          <strong>{recoveryPlan.summary}</strong>
          <small>
            医务室 Lv.{recoveryPlan.clinicLevel} / 宿舍 Lv.{recoveryPlan.dormLevel} / 恢复中 {recoveryPlan.recoveringCount}
          </small>
        </div>
        <div className="recovery-plan-metrics">
          <span>
            护理班 <b>{recoveryPlan.careShifts}</b>
          </span>
          <span>
            可治疗 <b>{recoveryPlan.immediateTreatments}/{recoveryPlan.medicineAvailable}</b>
          </span>
          <span>
            伤病恢复 <b>{recoveryPlan.likelyInjuryClears}/{recoveryPlan.injuredCount}</b>
          </span>
          <span>
            每日休息 <b>-{recoveryPlan.dailyRecovery}</b>
          </span>
        </div>
        <div className={recoveryPlan.medicineShortage > 0 ? "recovery-next-action warning" : "recovery-next-action"}>
          <span>下一步</span>
          <strong>{recoveryPlan.nextAction}</strong>
        </div>
        {recoveryPlan.priorityPatients.length > 0 && (
          <div className="recovery-patient-row">
            {recoveryPlan.priorityPatients.map((patient) => (
              <span key={patient.name}>
                {patient.name}: 疲{patient.fatigue} / 伤{patient.injuries}
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
          const capped = accountSurvivor ? isSurvivorAtLevelCap(accountSurvivor) : false;
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
                  <span>经验</span>
                  <div>
                    <i
                      style={{
                        width: capped ? "100%" : `${Math.max(5, Math.min(100, Math.round((accountSurvivor.xp / xpTarget) * 100)))}%`
                      }}
                    />
                  </div>
                  <strong>
                    {capped ? "已达上限" : `${accountSurvivor.xp}/${xpTarget}`}
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
                <span>基地班次</span>
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
                  治疗
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
  accountBase,
  accountSurvivors,
  baseAssignments,
  state,
  draft,
  selectedLocation,
  readiness,
  session,
  squadReady,
  canAffordLoadout,
  objective,
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
  accountBase: PlaytestSession["account"]["base"];
  accountSurvivors: PlaytestSession["account"]["survivors"];
  baseAssignments: PlaytestSession["room"]["baseAssignments"];
  state: GameState;
  draft: ExpeditionDraft;
  selectedLocation: GameState["locations"][number];
  readiness: number;
  session: PlaytestSession;
  squadReady: boolean;
  canAffordLoadout: boolean;
  objective: PlaytestSession["room"]["base"]["objective"];
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
  const accountSupport = supportFromAccountBase(accountBase);
  const basePrepSupport = basePrepSupportFromAssignments(baseAssignments, accountSurvivors, userId, draft.squadIds);
  const support = mergeExpeditionSupport(mergeExpeditionSupport(facilitySupport, accountSupport), basePrepSupport);
  const supportPlan = expeditionSupportPlan(support);
  const accountSupportBriefing = accountBaseSupportBriefing(accountBase);
  const routeBriefing = journeyRouteBriefing(session, { ...draft, support }, selectedLocation.id, readiness);
  const selectedSquad = state.survivors.filter((survivor) => draft.squadIds.includes(survivor.id));
  const previewFieldSupplies: ResourceBundle = {
    ...draft.loadout
  };
  for (const [key, value] of Object.entries(support.startingSupplies) as Array<[ResourceKey, number | undefined]>) {
    previewFieldSupplies[key] += value ?? 0;
  }
  const carryBurden = calculateCarryBurden(selectedSquad, previewFieldSupplies, support);
  const supportItems = [
    { label: "生命上限", sign: "+", value: support.maxHp },
    { label: "包扎", sign: "+", value: support.patchHeal },
    { label: "防守", sign: "+", value: support.guardBlock },
    { label: "弹药伤害", sign: "+", value: support.ammoDamage },
    { label: "开局防护", sign: "+", value: support.openingGuard },
    { label: "开局暴露", sign: "+", value: support.openingExpose },
    { label: "背包容量", sign: "+", value: support.carryCapacity ?? 0 },
    { label: "压力缓解", sign: "-", value: support.pressureRelief },
    { label: "路段稳固", sign: "+", value: support.roadSecure },
    { label: "路段搜索", sign: "+", value: support.roadSearch },
    { label: "强行推进", sign: "+", value: support.roadPush },
    { label: "战利品", sign: "+", value: support.lootSalvage },
    { label: "医疗战利品", sign: "+", value: support.lootMedicine },
    { label: "情报", sign: "+", value: support.lootIntel },
    { label: "规避", sign: "+", value: support.lootEvade },
    { label: "营地热食", sign: "+", value: support.campCook },
    { label: "营地休整", sign: "+", value: support.campRest },
    { label: "营地侦察", sign: "+", value: support.campScout },
    { label: "商店口粮", sign: "+", value: support.shopRations },
    { label: "商店情报", sign: "+", value: support.shopIntel },
    { label: "商店服务", sign: "+", value: support.shopService }
  ].filter((item) => item.value > 0);
  const startingSupplyItems = [
    { label: "出发食物", value: support.startingSupplies.food ?? 0 },
    { label: "出发饮水", value: support.startingSupplies.water ?? 0 },
    { label: "出发弹药", value: support.startingSupplies.ammo ?? 0 },
    { label: "出发药品", value: support.startingSupplies.medicine ?? 0 }
  ].filter((item) => item.value > 0);
  const hasBaseSupport = supportItems.length > 0 || startingSupplyItems.length > 0;
  const basePrepItems = [
    { label: "准备食物", sign: "+", value: basePrepSupport.startingSupplies.food ?? 0 },
    { label: "准备饮水", sign: "+", value: basePrepSupport.startingSupplies.water ?? 0 },
    { label: "准备药品", sign: "+", value: basePrepSupport.startingSupplies.medicine ?? 0 },
    { label: "准备背包", sign: "+", value: basePrepSupport.carryCapacity ?? 0 },
    { label: "准备防守", sign: "+", value: basePrepSupport.guardBlock },
    { label: "准备路段", sign: "+", value: basePrepSupport.roadSecure },
    { label: "准备交易", sign: "+", value: basePrepSupport.shopRations + basePrepSupport.shopService },
    { label: "准备降压", sign: "-", value: basePrepSupport.pressureRelief }
  ].filter((item) => item.value > 0);
  const accountSupportItems = [
    { label: "训练生命", sign: "+", value: accountSupport.maxHp },
    { label: "个人包扎", sign: "+", value: accountSupport.patchHeal },
    { label: "个人背包", sign: "+", value: accountSupport.carryCapacity ?? 0 },
    { label: "电台降压", sign: "-", value: accountSupport.pressureRelief },
    { label: "路线情报", sign: "+", value: accountSupport.lootIntel },
    { label: "商店情报", sign: "+", value: accountSupport.shopIntel }
  ].filter((item) => item.value > 0);
  const launchChecklist = expeditionLaunchChecklist({
    canAffordLoadout,
    hasActiveJourney: Boolean(journey),
    objectiveActive,
    selectedLocationName: selectedLocation.name,
    squadCount: draft.squadIds.length
  });
  const roomTrainingLevel = state.facilities.find((facility) => facility.id === "training")?.level ?? 0;
  const trainingLevel = roomTrainingLevel + Math.max(0, accountBase.trainingRoomLevel - 1);
  const loadoutTotal = resourceKeys.reduce((sum, key) => sum + draft.loadout[key] + (support.startingSupplies[key] ?? 0), 0);
  const supportEffects = supportPlan.totalEffects;
  const yieldPreview = expeditionYieldPreview({
    canDispatch: launchChecklist.canDispatch,
    loadoutTotal,
    objectiveActive,
    readiness,
    riskLabel: riskLabels[draft.risk],
    selectedLocationName: selectedLocation.name,
    squadCount: draft.squadIds.length,
    supportEffects,
    trainingLevel
  });
  const readinessLabel = readiness >= 70 ? "优势开局" : readiness >= 45 ? "可以行动" : "风险偏高";
  const burdenLabel =
    carryBurden.tier === "overloaded" ? "超载" : carryBurden.tier === "heavy" ? "偏重" : "轻装";
  const dispatchBriefingItems = [
    {
      detail: `${draft.squadIds.length} 人 / ${Math.round(readiness)} 适配`,
      label: "队伍",
      value: readinessLabel
    },
    {
      detail: `${locationFamilyLabels[selectedLocation.family]} / ${riskLabels[draft.risk]}`,
      label: "路线",
      value: selectedLocation.name
    },
    {
      detail: burdenSummary(carryBurden),
      label: "负重",
      value: `${carryBurden.load}/${carryBurden.capacity} ${burdenLabel}`
    },
    {
      detail: launchChecklist.canDispatch ? "准备完成后会进入回合制远征流程" : launchChecklist.summary,
      label: "结论",
      value: launchChecklist.canDispatch ? "可以派遣" : "先处理阻塞项"
    }
  ];
  const prepCommandItems = [
    {
      detail: draft.squadIds.length > 0 ? `${draft.squadIds.length} 名幸存者已入队` : "先选择 3-5 名幸存者",
      id: "prep-squad",
      label: "编队",
      status: draft.squadIds.length >= 3 && draft.squadIds.length <= 5 ? "ready" : "blocked",
      value: `${draft.squadIds.length}/5`
    },
    {
      detail: `${locationFamilyLabels[selectedLocation.family]} / 危险 ${selectedLocation.risk}`,
      id: "prep-route",
      label: "路线",
      status: "ready",
      value: selectedLocation.name
    },
    {
      detail: burdenSummary(carryBurden),
      id: "prep-loadout",
      label: "补给",
      status: canAffordLoadout ? "ready" : "blocked",
      value: `${carryBurden.load}/${carryBurden.capacity}`
    },
    {
      detail: riskDescriptions[draft.risk],
      id: "prep-risk",
      label: "策略",
      status: readiness >= 45 ? "ready" : "warning",
      value: riskLabels[draft.risk]
    }
  ];
  const scrollToPrepStep = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  return (
    <div className="expedition-layout">
      <section className="expedition-prep-command" aria-label="出征准备指挥台">
        <div className="expedition-prep-heading">
          <div>
            <span>出征准备</span>
            <strong>{selectedLocation.name}</strong>
            <small>{launchChecklist.summary}</small>
          </div>
          <button className="primary-button" type="button" disabled={!launchChecklist.canDispatch} onClick={onDispatch}>
            <Send size={17} aria-hidden="true" />
            出发
          </button>
        </div>
        <div className="expedition-prep-steps" aria-label="出征准备步骤">
          {prepCommandItems.map((item, index) => (
            <button className={`expedition-prep-step ${item.status}`} key={item.id} type="button" onClick={() => scrollToPrepStep(item.id)}>
              <span>{index + 1}</span>
              <strong>{item.label}</strong>
              <b>{item.value}</b>
              <small>{item.detail}</small>
            </button>
          ))}
        </div>
      </section>

      <section className="panel expedition-prep-section" id="prep-squad">
        <p className="eyebrow">步骤 1</p>
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

      <section className="panel expedition-prep-section" id="prep-route">
        <p className="eyebrow">步骤 2</p>
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

      <section className="panel expedition-prep-section" id="prep-loadout">
        <p className="eyebrow">步骤 3</p>
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
              <small>携带 {draft.loadout[key]} / 剩余 {state.resources[key] - draft.loadout[key]}</small>
            </div>
          ))}
        </div>
        <BurdenPreview burden={carryBurden} />
      </section>

      <section className="panel expedition-prep-section" id="prep-risk">
        <p className="eyebrow">步骤 4</p>
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

      <section className="panel expedition-prep-section" id="prep-doctrine">
        <p className="eyebrow">步骤 5</p>
        <h2>出征纪律</h2>
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
            <p className="eyebrow">出征预览</p>
            <h2>{selectedLocation.name}</h2>
          </div>
          <Activity size={24} aria-hidden="true" />
        </div>
        <p>{selectedLocation.dossier}</p>
        <div
          className={`route-briefing-card ${
            routeBriefing.pressureLabel === "高压" ? "danger" : routeBriefing.pressureLabel === "紧张" ? "warning" : "safe"
          }`}
          aria-label="出征路线情报"
        >
          <div className="route-briefing-heading">
            <div>
              <span>路线情报</span>
              <strong>{routeBriefing.locationName}</strong>
              <small>
                {routeBriefing.familyLabel} / 预计 {routeBriefing.estimatedHours} 小时到撤离窗口
              </small>
            </div>
            <b>
              {routeBriefing.pressureLabel} {routeBriefing.pressure}%
            </b>
          </div>
          <div className="route-briefing-track">
            {routeBriefing.routePattern.map((step, index) => (
              <span key={`${selectedLocation.id}-briefing-${step}`}>
                <i>{index + 1}</i>
                {step}
              </span>
            ))}
          </div>
          <div className="route-briefing-grid">
            <div>
              <span>生存预估</span>
              <strong>{routeBriefing.survivalSummary}</strong>
            </div>
            <div>
              <span>随身补给</span>
              <strong>{routeBriefing.fieldSupplySummary}</strong>
            </div>
            <div>
              <span>后勤支援</span>
              <strong>{routeBriefing.supportSummary}</strong>
            </div>
          </div>
          {(routeBriefing.warnings.length > 0 || routeBriefing.recommendations.length > 0) && (
            <div className="route-briefing-notes">
              {routeBriefing.warnings.map((warning) => (
                <small className="warning" key={warning}>
                  {warning}
                </small>
              ))}
              {routeBriefing.recommendations.map((recommendation) => (
                <small key={recommendation}>{recommendation}</small>
              ))}
            </div>
          )}
        </div>
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
          <span>基地支援</span>
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
          {!hasBaseSupport && <strong>暂无设施支援</strong>}
          <span>个人基地</span>
          {accountSupportItems.length ? (
            accountSupportItems.map((item) => (
              <strong key={item.label}>
                {item.label} {item.sign}
                {item.value}
              </strong>
            ))
          ) : (
            <strong>个人基地尚未形成额外支援</strong>
          )}
          <span>基地准备</span>
          {basePrepItems.length ? (
            basePrepItems.map((item) => (
              <strong key={item.label}>
                {item.label} {item.sign}
                {item.value}
              </strong>
            ))
          ) : (
            <strong>暂无空闲人员准备</strong>
          )}
        </div>
        <div className="support-plan-card account-support-card" aria-label="个人基地出征支援">
          <div className="support-plan-heading">
            <div>
              <span>个人基地出征支援</span>
              <strong>{accountSupportBriefing.summary}</strong>
            </div>
            <small>个人基地只影响准备空间，不会替房间基地承担全部风险。</small>
          </div>
          {accountSupportBriefing.lines.length > 0 ? (
            <div className="support-plan-grid account-support-grid">
              {accountSupportBriefing.lines.map((line) => (
                <article className="support-plan-stage account-support-stage" key={line.title}>
                  <span>{line.title}</span>
                  <strong>{line.effect}</strong>
                  <small>{line.detail}</small>
                </article>
              ))}
            </div>
          ) : (
            <p className="muted-copy">完成一次完整撤离或返程回收后，把个人仓库材料投进升级，就能逐步打开这条成长线。</p>
          )}
        </div>
        <div className="support-plan-card" aria-label="后勤预案">
          <div className="support-plan-heading">
            <div>
              <span>后勤预案</span>
              <strong>{supportPlan.summary}</strong>
            </div>
            <small>设施、出征纪律和留守班次会在不同路段触发。</small>
          </div>
          {supportPlan.stages.length > 0 ? (
            <div className="support-plan-grid">
              {supportPlan.stages.map((stage) => (
                <article className={`support-plan-stage ${stage.id}`} key={stage.id}>
                  <span>{stage.label}</span>
                  <strong>{stage.items.slice(0, 3).join(" / ")}</strong>
                  <small>{stage.summary}</small>
                </article>
              ))}
            </div>
          ) : (
            <p className="muted-copy">建造设施、选择出征纪律，或让未出征幸存者执行基地班次，就能形成可用的后勤线。</p>
          )}
        </div>
        {journey && activeNode && (
          <JourneyPanel
            activeNode={activeNode}
            journey={journey}
            objective={objective}
            onCombatAction={onCombatAction}
            onJourneyAction={onJourneyAction}
            readiness={readiness}
            squad={selectedSquad}
          />
        )}
        <div className="dispatch-briefing" aria-label="出征开局预案">
          <div className="dispatch-briefing-heading">
            <span>出征开局预案</span>
            <strong>{launchChecklist.canDispatch ? "确认队伍、路线与补给后即可派遣。" : "还有派遣前置条件需要处理。"}</strong>
          </div>
          <div className="dispatch-briefing-grid">
            {dispatchBriefingItems.map((item) => (
              <article className="dispatch-briefing-card" key={item.label}>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
                <small>{item.detail}</small>
              </article>
            ))}
          </div>
        </div>
        <div className="yield-preview" aria-label="本次远征收益预览">
          <div className="yield-preview-heading">
            <span>收益预览</span>
            <strong>{yieldPreview.headline}</strong>
          </div>
          <div className="yield-preview-grid">
            {yieldPreview.items.map((item) => (
              <article className={`yield-preview-card ${item.tone}`} key={item.label}>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
                <small>{item.detail}</small>
              </article>
            ))}
          </div>
        </div>
        <div className="launch-checklist" aria-label="出征检查">
          <div className="launch-checklist-heading">
            <span>出征检查</span>
            <strong>{launchChecklist.summary}</strong>
          </div>
          <div className="launch-checklist-grid">
            {launchChecklist.items.map((item) => (
              <article className={`launch-checklist-item ${item.status}`} key={item.id}>
                <span>{item.status === "ready" ? "就绪" : "待处理"}</span>
                <strong>{item.label}</strong>
                <small>{item.text}</small>
              </article>
            ))}
          </div>
        </div>
        <button className="primary-button full-width" type="button" disabled={!launchChecklist.canDispatch} onClick={onDispatch}>
          <Send size={18} aria-hidden="true" />
          派遣远征
        </button>
        {!squadReady && <p className="warning-copy">需要选择 3-5 名幸存者。</p>}
        {objectiveActive && !canAffordLoadout && <p className="warning-copy">携带物资超过基地库存。</p>}
        {!objectiveActive && <p className="warning-copy">当前房间目标已经结算。创建新房间即可重新开始。</p>}
      </section>
    </div>
  );
}

function JourneyPanel({
  activeNode,
  journey,
  objective,
  onCombatAction,
  onJourneyAction,
  readiness,
  squad
}: {
  activeNode: JourneyNode;
  journey: JourneyState;
  objective: PlaytestSession["room"]["base"]["objective"];
  onCombatAction: (action: CombatAction) => void;
  onJourneyAction: (action: JourneyAction) => void;
  readiness: number;
  squad: GameState["survivors"];
}) {
  const outlook = getJourneyOutlook(journey);
  const pendingRoad = journey.pendingRoadEvent;
  const extractionPreview = journeyExtractionPreview(journey, objective);
  const canReturnEarly = activeNode.type !== "extraction";
  const returnEarlyLabel = extractionPreview.canExtractNow ? "提前返程" : "紧急返程";
  const nodeTypeLabel = pendingRoad ? roadToneLabel(pendingRoad.tone) : journeyNodeTypeLabel(activeNode.type);
  const nodeTitle = pendingRoad?.title ?? activeNode.title;
  const nodeBody = pendingRoad?.body ?? activeNode.body;
  const activeCombatPulse = journey.combat ? journey.combat.traitPulse ?? enemyTraitPulse(journey.combat.enemyTrait) : null;
  const routePace = routePaceFor(journey);
  const processDigest = journeyProcessDigest(journey);
  const actionGuide = journeyActionGuide(journey);
  const latestActionResult = journey.logs[journey.logs.length - 1] ?? nodeBody;
  const activeRouteStop = routePace.forecast.find((stop) => stop.state === "active") ?? routePace.forecast[0];
  const compactRouteStops = routePace.forecast.slice(0, 5);
  const nextCommandHint = pendingRoad
    ? "先处理路上抉择，队伍才能继续前进。"
    : journey.combat
      ? "选择本回合战斗动作，留意敌人意图和反制标签。"
      : journey.pendingCombatLoot
        ? "分配战利品，决定这场战斗如何转化为基地收益。"
        : activeNode.type === "extraction"
          ? "确认撤离，把随身收益结算回基地。"
          : "选择当前节点行动，系统会推进到下一段路线。";
  const segmentForecast =
    !journey.combat && !journey.pendingCombatLoot && !pendingRoad && activeNode.type !== "extraction" ? forecastNextSegment(journey, squad, readiness) : null;
  const segmentThreat = segmentThreatFor(journey);
  const segmentMitigation = segmentThreatMitigationFor(segmentThreat, journey.support);
  const baseCommands = baseCommandOptions(journey);
  const objectivePreview = journeyObjectivePreview(journey, objective);
  const threatPreview = combatThreatPreview(journey);
  const recentDecisions = (journey.decisions ?? []).slice(-4).reverse();
  const latestCombatRound = journey.combatHistory[journey.combatHistory.length - 1] ?? null;
  const counterLabels = segmentThreat.counterTactics
    .map((tacticId) => segmentTacticList.find((tactic) => tactic.id === tacticId)?.label ?? tacticId)
    .join(" / ");
  const mitigationLabel =
    segmentMitigation.value > 0
      ? `设施减压 ${segmentMitigation.pressure}%${segmentMitigation.fatigue > 0 ? ` / 疲劳 -${segmentMitigation.fatigue}` : ""}`
      : "暂无设施掩护";
  const scrollToJourneySection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="journey-panel">
      <section className={`journey-command-center ${actionGuide.tone}`} aria-label="远征行动台">
        <div className={`journey-action-guide ${actionGuide.tone}`} aria-label="出征行动指引">
          <div>
            <span>{actionGuide.label}</span>
            <strong>{actionGuide.title}</strong>
            <small>{actionGuide.body}</small>
          </div>
          <b>{actionGuide.primaryAction}</b>
        </div>
        <div className="journey-mobile-flow" aria-label="手机端出征路线摘要">
          <div className="journey-mobile-flow-main">
            <span>当前任务</span>
            <strong>{activeRouteStop?.label ?? nodeTypeLabel}</strong>
            <small>{nextCommandHint}</small>
          </div>
          <div className="journey-mobile-route" aria-label="当前路线步骤">
            {compactRouteStops.map((stop) => (
              <span className={stop.state} key={`${journey.id}-mobile-flow-${stop.index}`}>
                <b>{stop.index}</b>
                <small>{stop.label}</small>
              </span>
            ))}
          </div>
          <div className="journey-mobile-meters" aria-label="关键状态">
            <span>
              压力 <b>{journey.pressure}%</b>
            </span>
            <span>
              疲劳 <b>{journey.condition.fatigue}</b>
            </span>
            <span>
              补给 <b>{extractionPreview.fieldSupplySummary}</b>
            </span>
          </div>
        </div>
        <div className="journey-section-nav" aria-label="手机端远征页内导航">
          <button type="button" onClick={() => scrollToJourneySection("journey-action-options")}>
            操作
          </button>
          <button type="button" onClick={() => scrollToJourneySection("journey-vitals")}>
            状态
          </button>
          <button type="button" onClick={() => scrollToJourneySection("journey-process")}>
            过程
          </button>
          <button type="button" onClick={() => scrollToJourneySection("journey-extraction")}>
            撤离
          </button>
        </div>
        <div className="journey-command-snapshot">
          <div>
            <span>当前位置</span>
            <strong>{nodeTitle}</strong>
            <small>{nodeTypeLabel}</small>
          </div>
          <div>
            <span>路线</span>
            <strong>
              {routePace.currentStop}/{routePace.totalStops}
            </strong>
            <small>{routePace.etaLabel}</small>
          </div>
          <div>
            <span>下一步</span>
            <strong>{actionGuide.primaryAction}</strong>
            <small>{routePace.nextTitle}</small>
          </div>
        </div>
        <div className="journey-command-actions" id="journey-action-options" aria-label="当前可执行操作">
          {pendingRoad ? (
            pendingRoad.choices.map((choice) => {
              const preview = roadEncounterChoicePreview(journey, choice);
              return (
                <button className={`journey-command-button ${preview.tone}`} key={`command-road-${choice.id}`} type="button" onClick={() => onJourneyAction(`road-${choice.id}` as JourneyAction)}>
                  <strong>{choice.label}</strong>
                  <span>{choice.text}</span>
                  <small>{preview.outcomeLabel}：{preview.costText} / {preview.rewardText}</small>
                </button>
              );
            })
          ) : journey.pendingCombatLoot ? (
            combatLootList.map((option) => {
              const outcome = combatLootOutcome(option, journey.support);
              return (
                <button className="journey-command-button safe" key={`command-loot-${option.id}`} type="button" onClick={() => onJourneyAction(`loot-${option.id}` as JourneyAction)}>
                  <strong>{option.label}</strong>
                  <span>{option.text}</span>
                  <small>
                    {formatResourceDelta(outcome.reward)} / 疲{formatSignedNumber(outcome.fatigue)} / 压{formatSignedPercent(outcome.pressure)}
                  </small>
                </button>
              );
            })
          ) : journey.combat ? (
            combatActionList.map((action) => {
              const preview = combatActionPreview(journey, action, squad, readiness);
              if (!preview) {
                return null;
              }
              const Icon = combatActionIcon(action);
              return (
                <button className={`journey-command-button ${preview.counterTag.toLowerCase()}`} key={`command-combat-${action}`} type="button" onClick={() => onCombatAction(action)}>
                  <strong>
                    <Icon size={15} aria-hidden="true" />
                    {preview.label}
                  </strong>
                  <span>{preview.actorName}</span>
                  <small>{combatCounterTagLabel(preview.counterTag)}：{preview.effect}</small>
                </button>
              );
            })
          ) : activeNode.type === "event" ? (
            <>
              <button className="journey-command-button safe" type="button" onClick={() => onJourneyAction("careful")}>
                <strong>{activeNode.careful?.label ?? "谨慎搜索"}</strong>
                <span>{activeNode.careful?.successLog ?? "放慢速度，降低失误。"}</span>
                <small>更稳，通常压力更低。</small>
              </button>
              <button className="journey-command-button warning" type="button" onClick={() => onJourneyAction("force")}>
                <strong>{activeNode.force?.label ?? "强行推进"}</strong>
                <span>{activeNode.force?.fallbackLog ?? activeNode.force?.successLog ?? "更快通过，承担额外风险。"}</span>
                <small>更快，但可能提高压力。</small>
              </button>
            </>
          ) : activeNode.type === "shop" ? (
            <>
              {shopActionList.map((action) => {
                const offer = activeNode.shop?.offers[action];
                if (!offer) {
                  return null;
                }
                const outcome = shopOfferOutcome(action, offer, journey.support);
                return (
                  <button className="journey-command-button safe" key={`command-shop-${action}`} type="button" onClick={() => onJourneyAction(`shop-${action}` as JourneyAction)}>
                    <strong>{outcome.label}</strong>
                    <span>{outcome.text}</span>
                    <small>随身 {formatResourceDelta(outcome.fieldSupplyReward)} / 入库 {formatResourceDelta(outcome.reward)}</small>
                  </button>
                );
              })}
              <button className="journey-command-button" type="button" onClick={() => onJourneyAction("skip")}>
                <strong>跳过交易</strong>
                <span>保留筹码继续前进。</span>
                <small>不消耗，不补给。</small>
              </button>
            </>
          ) : activeNode.type === "camp" ? (
            campActionList.map((action) => {
              const option = activeNode.camp?.[action];
              if (!option) {
                return null;
              }
              const outcome = campOptionOutcome(action, option, journey.support);
              return (
                <button className="journey-command-button safe" key={`command-camp-${action}`} type="button" onClick={() => onJourneyAction(action)}>
                  <strong>{outcome.label}</strong>
                  <span>{outcome.successLog}</span>
                  <small>
                    疲{formatSignedNumber(outcome.fatigue)} / 饥{formatSignedNumber(outcome.hunger)} / 渴{formatSignedNumber(outcome.thirst)}
                  </small>
                </button>
              );
            })
          ) : (
            <button className="journey-command-button safe" type="button" onClick={() => onJourneyAction("extract")}>
              <strong>撤离并结算</strong>
              <span>带着已获得的战利品返回基地。</span>
              <small>{extractionPreview.fieldSupplySummary}</small>
            </button>
          )}
          {canReturnEarly && (
            <button className="journey-command-button danger" type="button" onClick={() => onJourneyAction("extract")}>
              <strong>{returnEarlyLabel}</strong>
              <span>{extractionPreview.canExtractNow ? "提前带回当前收益。" : "承受阻碍，强行脱离路线。"}</span>
              <small>地点奖励 {extractionPreview.options[0]?.rewardScalePercent ?? 0}%</small>
            </button>
          )}
        </div>
        <div className="journey-command-result" aria-label="最近行动结果">
          <span>{journey.logs.length > 0 ? "最近结果" : "当前情况"}</span>
          <strong>{journey.logs.length > 0 ? latestActionResult.split("：")[0] : nodeTitle}</strong>
          <small>{latestActionResult}</small>
        </div>
      </section>
      <div className="journey-detail-grid" id="journey-process" aria-label="远征详情">
      <div className="route-pacing" aria-label="路线节奏">
        <div>
          <span>路线进度</span>
          <strong>
            {routePace.currentStop}/{routePace.totalStops}
          </strong>
          <small>
            撤离进度 {routePace.progressPercent}% / 还剩 {routePace.remainingStops} 站
          </small>
        </div>
        <div>
          <span>当前节点</span>
          <strong>{routePace.currentLabel}</strong>
          <small>{routePace.currentTitle}</small>
        </div>
        <div>
          <span>下一站</span>
          <strong>{routePace.nextLabel}</strong>
          <small>{routePace.nextTitle}</small>
        </div>
        <div>
          <span>行进时间</span>
          <strong>{routePace.clockLabel}</strong>
          <small>{routePace.etaLabel}</small>
        </div>
      </div>
      <div className="journey-track" aria-label="出征路线进度">
        {routePace.forecast.map((stop) => (
          <span className={stop.state} key={`${journey.id}-pace-${stop.index}`}>
            <b>{stop.index}</b>
            <small>{stop.label}</small>
          </span>
        ))}
      </div>
      <div className="journey-process-digest" aria-label="出征过程摘要">
        <div className="journey-process-heading">
          <div>
            <span>出征过程</span>
            <strong>{processDigest.headline}</strong>
          </div>
          <small>{processDigest.summary}</small>
        </div>
        <div className="journey-process-grid">
          {processDigest.steps.slice(0, 6).map((step) => (
            <article className={`journey-process-step ${step.tone}`} key={step.id}>
              <span>{step.label}</span>
              <strong>{step.title}</strong>
              <small>{step.body}</small>
            </article>
          ))}
        </div>
      </div>
      {recentDecisions.length > 0 && (
        <div className="journey-decision-ledger" aria-label="路线决策账本">
          <div className="journey-decision-heading">
            <span>路线决策</span>
            <strong>最近 {recentDecisions.length} 次抉择</strong>
          </div>
          <div className="journey-decision-grid">
            {recentDecisions.map((decision) => (
              <article className={`journey-decision-card ${decision.tone}`} key={decision.id}>
                <span>{decision.nodeTitle}</span>
                <strong>{decision.label}</strong>
                <small>{decision.impactText}</small>
              </article>
            ))}
          </div>
        </div>
      )}
      </div>
      <div className="journey-status-grid journey-vitals-strip" id="journey-vitals" aria-label="远征状态栏">
        <div className="journey-pressure">
          <span>压力</span>
          <strong>{journey.pressure}%</strong>
          <i>
            <b style={{ width: `${Math.max(0, Math.min(100, journey.pressure))}%` }} />
          </i>
        </div>
        <div className="journey-condition">
          <span>路况</span>
          <div>
            <strong>距离 {journey.condition.distance}</strong>
            <strong>疲劳 {journey.condition.fatigue}</strong>
            <strong>饥饿 {journey.condition.hunger}</strong>
            <strong>口渴 {journey.condition.thirst}</strong>
          </div>
        </div>
        <div className={`journey-burden ${journey.burden.tier}`}>
          <span>背包负重</span>
          <strong>
            {journey.burden.load}/{journey.burden.capacity}
          </strong>
          <i>
            <b style={{ width: `${Math.max(4, Math.min(100, Math.round((journey.burden.load / journey.burden.capacity) * 100)))}%` }} />
          </i>
          <small>{burdenSummary(journey.burden)}</small>
        </div>
        <JourneyResourceStrip title="随身补给" resources={journey.fieldSupplies} />
        <JourneyResourceStrip title="战利品" resources={journey.bonusReward} />
      </div>
      <div className={`journey-outlook ${outlook.tone}`}>
        <strong>{outlook.label}</strong>
        <span>{outlook.text}</span>
      </div>
      <div className="journey-objective-card" aria-label="出征目标线索">
        <div>
          <span>房间目标</span>
          <strong>{objectivePreview.title}</strong>
          <small>{objectivePreview.statusLabel}</small>
        </div>
        <div>
          <span>基地进度</span>
          <strong>
            {objectivePreview.currentParts}/{objectivePreview.requiredParts}
          </strong>
          <i>
            <b style={{ width: `${Math.max(6, objectivePreview.progressPercent)}%` }} />
          </i>
        </div>
        <div>
          <span>本次线索</span>
          <strong>{objectivePreview.routeLabel}</strong>
          <small>{objectivePreview.summary}</small>
        </div>
        <div>
          <span>预计回传</span>
          <strong>
            {objectivePreview.projectedParts}/{objectivePreview.requiredParts}
          </strong>
          <i>
            <b style={{ width: `${Math.max(6, objectivePreview.projectedPercent)}%` }} />
          </i>
          <small>{objectivePreview.hint}</small>
        </div>
      </div>
      <div className="extraction-preview" id="journey-extraction" aria-label="撤离预案">
        <div className="extraction-preview-heading">
          <div>
            <span>撤离预案</span>
            <strong>{extractionPreview.canExtractNow ? "可以返程" : "先处理当前阻碍"}</strong>
          </div>
          <small>
            压力 {extractionPreview.pressure}% / 疲劳 {extractionPreview.fatigue} / 还剩 {extractionPreview.remainingStops} 站 / 随身{" "}
            {extractionPreview.fieldSupplySummary}
          </small>
        </div>
        <div className="extraction-preview-options">
          {extractionPreview.options.map((option) => (
            <div className={`extraction-preview-option ${option.id}`} key={option.id}>
              <div>
                <span>{option.label}</span>
                <strong>{option.title}</strong>
              </div>
              <b>地点奖励 {option.rewardScalePercent}%</b>
              <small>
                目标 {option.objectiveProjectedMin}
                {option.objectiveProjectedMax === option.objectiveProjectedMin ? "" : `-${option.objectiveProjectedMax}`}/{objectivePreview.requiredParts}
              </small>
              <p>{option.summary}</p>
              <em>{option.rewardSummary}</em>
              <em>{option.riskSummary}</em>
            </div>
          ))}
        </div>
      </div>
      <div className="base-command-strip" aria-label="基地指令">
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
        <div className={`march-forecast ${segmentForecast.riskLevel}`} aria-label="下一段行军预告">
          <div>
            <span>下一段</span>
            <strong>路段 {segmentForecast.segment}</strong>
            <small>
              {segmentForecast.planLabel} / {segmentForecast.tacticLabel} / {segmentForecast.hours}h
            </small>
          </div>
          <div>
            <span>消耗</span>
            <strong>{segmentForecast.supplyUse.join(" / ")}</strong>
            <small>{segmentForecast.threatLabel}</small>
          </div>
          <div>
            <span>变化</span>
            <strong>
              疲{formatSignedNumber(segmentForecast.conditionDeltas.fatigue)} 饥{formatSignedNumber(segmentForecast.conditionDeltas.hunger)} 渴
              {formatSignedNumber(segmentForecast.conditionDeltas.thirst)} 压{formatSignedPercent(segmentForecast.pressureDelta)}
            </strong>
            <small>{segmentForecast.notes.slice(0, 2).join(" / ") || "路段平稳"}</small>
          </div>
          <div>
            <span>行进后</span>
            <strong>
              疲{segmentForecast.resultingCondition.fatigue} 饥{segmentForecast.resultingCondition.hunger} 渴{segmentForecast.resultingCondition.thirst}
            </strong>
            <small>
              压力 {segmentForecast.resultingPressure}% / 已行进 {segmentForecast.resultingElapsedHours} 小时
            </small>
            {segmentForecast.hardship && (
              <small className={`hardship-risk ${segmentForecast.hardship.severity}`}>
                风险：{segmentForecast.hardship.label}（{segmentForecast.hardship.effects.join("，")}）
              </small>
            )}
          </div>
          <div className={`road-event-risk ${segmentForecast.roadEventForecast.likelyTone}`}>
            <span>路上事件</span>
            <strong>{segmentForecast.roadEventForecast.riskLabel}</strong>
            <small>
              机会 {segmentForecast.roadEventForecast.findChancePercent}% / 险情 {segmentForecast.roadEventForecast.hazardChancePercent}% / 路口{" "}
              {segmentForecast.roadEventForecast.roadChancePercent}%
            </small>
            <small>{segmentForecast.roadEventForecast.beatTitle}</small>
            <small>{segmentForecast.roadEventForecast.advice}</small>
          </div>
        </div>
      )}
      {journey.travelHistory.length > 0 && (
        <div className="travel-record-strip" aria-label="路上日志">
          {journey.travelHistory.slice(-3).map((record) => (
            <div className={`travel-record-card ${record.tone}`} key={`${journey.id}-travel-${record.segment}`}>
              <div>
                <span>路段 {record.segment}</span>
                <strong>{record.title}</strong>
              </div>
              <p>{record.body}</p>
              <small>{record.planLabel}</small>
              <small>行进时间 {record.timeLabel}</small>
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
        <div className="road-event-strip" aria-label="近期路上事件">
          {journey.roadEvents.slice(-3).map((event) => (
            <div className={`road-event-card ${event.tone}`} key={`${journey.id}-road-${event.segment}-${event.title}`}>
              <span>路段 {event.segment}</span>
              <strong>{event.title}</strong>
              <small>{event.outcome}</small>
            </div>
          ))}
        </div>
      )}
      {journey.hardships.length > 0 && (
        <div className="hardship-strip" aria-label="近期路上苦难">
          {journey.hardships.slice(-3).map((hardship) => (
            <div className={`hardship-card ${hardship.severity}`} key={`${journey.id}-hardship-${hardship.segment}-${hardship.id}`}>
              <span>路段 {hardship.segment}</span>
              <strong>{hardship.label}</strong>
              <small>{hardship.effects.join(" / ")}</small>
              {hardship.targetName && <small>{hardship.targetName} 需要回基地治疗</small>}
            </div>
          ))}
        </div>
      )}
      <div className="journey-plan-strip" aria-label="路上行军计划">
        {travelPlanList.map((plan) => (
          <button
            className={journey.travelPlan === plan.id ? "active" : ""}
            key={plan.id}
            type="button"
            onClick={() => onJourneyAction(`plan-${plan.id}` as JourneyAction)}
          >
            <span>{plan.label}</span>
            <small>
              疲{formatSignedNumber(plan.fatigue)} 压{formatSignedPercent(plan.pressure)}
            </small>
          </button>
        ))}
      </div>
      <div className="segment-threat-card" aria-label="路段威胁">
        <div>
          <span>路段威胁</span>
          <strong>{segmentThreat.label}</strong>
          <small>{segmentThreat.text}</small>
        </div>
        <div>
          <span>反制方式</span>
          <strong>{counterLabels}</strong>
          <small>
            疲+{segmentThreat.fatigue} 饥+{segmentThreat.hunger} 渴+{segmentThreat.thirst} 压+{segmentThreat.pressure}%
          </small>
          <small>{mitigationLabel}</small>
        </div>
      </div>
      <div className="segment-tactic-strip" aria-label="下一段战术">
        {segmentTacticList.map((tactic) => (
          <button
            className={journey.segmentTactic === tactic.id ? "active" : ""}
            key={tactic.id}
            type="button"
            onClick={() => onJourneyAction(`tactic-${tactic.id}` as JourneyAction)}
          >
            <span>{tactic.label}</span>
            <small>{tactic.supplyPriority.length > 0 ? `消耗 ${tactic.supplyPriority.map((key) => resourceLabels[key]).join("/")}` : "无消耗"}</small>
            <small>
              疲{formatSignedNumber(tactic.fatigue)} 饥{formatSignedNumber(tactic.hunger)} 渴{formatSignedNumber(tactic.thirst)} 压
              {formatSignedPercent(tactic.pressure)}
            </small>
          </button>
        ))}
      </div>
      {(journey.trophies.length > 0 || journey.battleScars > 0) && (
        <div className="journey-aftermath">
        <span>战斗后果</span>
          {journey.trophies.length > 0 && <strong>战利标记：{journey.trophies.join("，")}</strong>}
          {journey.battleScars > 0 && <strong>战斗伤痕：{journey.battleScars}</strong>}
        </div>
      )}
      <div className="journey-node journey-primary-actions">
        <span className="subtle-pill">{nodeTypeLabel}</span>
        <h3>{nodeTitle}</h3>
        <p>{nodeBody}</p>
        {pendingRoad ? (
          <div className="road-choice-card">
            <div>
              <strong>路上抉择</strong>
              <span>路段 {pendingRoad.segment} 挡住了下一站。必须先处理，队伍才能继续推进。</span>
            </div>
            <div className="combat-loot-grid">
              {pendingRoad.choices.map((choice) => {
                const preview = roadEncounterChoicePreview(journey, choice);
                return (
                  <button className={`road-choice-option ${preview.tone}`} key={choice.id} type="button" onClick={() => onJourneyAction(`road-${choice.id}` as JourneyAction)}>
                    <strong>{choice.label}</strong>
                    <span>{choice.text}</span>
                    <small>
                      {preview.costText} | {preview.rewardText} | {preview.conditionText}
                    </small>
                    <small className={`road-choice-risk ${preview.tone}`}>
                      {preview.outcomeLabel}：{preview.riskText}
                    </small>
                    {choice.supportText && <small className="facility-support-note">{choice.supportText}</small>}
                  </button>
                );
              })}
            </div>
          </div>
        ) : journey.pendingCombatLoot ? (
          <div className="combat-loot-card">
            <div>
              <strong>{journey.pendingCombatLoot.enemyName} 已倒下</strong>
              <span>获得战利标记：{journey.pendingCombatLoot.trophy}</span>
            </div>
            <CombatReplayStrip records={journey.combatHistory} />
            <div className="combat-loot-grid">
              {combatLootList.map((option) => {
                const outcome = combatLootOutcome(option, journey.support);
                return (
                  <button key={option.id} type="button" onClick={() => onJourneyAction(`loot-${option.id}` as JourneyAction)}>
                    <strong>{option.label}</strong>
                    <span>{option.text}</span>
                    <small>
                      {formatResourceDelta(outcome.reward)} | 疲{formatSignedNumber(outcome.fatigue)} | 压{formatSignedPercent(outcome.pressure)}
                      {outcome.objectiveBonus > 0 ? ` | 目标 +${outcome.objectiveBonus}` : ""}
                      {outcome.battleScarRelief > 0 ? ` | 伤痕 -${outcome.battleScarRelief}` : ""}
                    </small>
                    {outcome.supportText && <small className="facility-support-note">{outcome.supportText}</small>}
                  </button>
                );
              })}
            </div>
          </div>
        ) : journey.combat ? (
          <div className="combat-card">
            <div className="combat-mobile-dashboard" aria-label="手机端回合战斗面板">
              <div className="combat-mobile-heading">
                <span>第 {journey.combat.round} 回合</span>
                <strong>{journey.combat.enemyName}</strong>
                <small>{journey.combat.enemyTraitLabel}：{journey.combat.enemyTraitText}</small>
              </div>
              <div className="combat-mobile-bars" aria-label="战斗生命摘要">
                <div>
                  <span>敌人</span>
                  <strong>
                    {journey.combat.enemyHp}/{journey.combat.enemyMaxHp}
                  </strong>
                  <i>
                    <b style={{ width: `${Math.max(0, Math.min(100, Math.round((journey.combat.enemyHp / journey.combat.enemyMaxHp) * 100)))}%` }} />
                  </i>
                </div>
                <div>
                  <span>队伍</span>
                  <strong>
                    {journey.combat.squadHp}/{journey.combat.squadMaxHp}
                  </strong>
                  <i>
                    <b style={{ width: `${Math.max(0, Math.min(100, Math.round((journey.combat.squadHp / journey.combat.squadMaxHp) * 100)))}%` }} />
                  </i>
                </div>
              </div>
              <div className="combat-mobile-intent">
                <div>
                  <span>敌人意图</span>
                  <strong>{threatPreview?.intentLabel ?? journey.combat.intentLabel}</strong>
                  <small>{threatPreview?.summary ?? journey.combat.intentText}</small>
                </div>
                <div>
                  <span>推荐反制</span>
                  <strong>{threatPreview?.counterLabels.join(" / ") || activeCombatPulse?.counterActions.map(combatActionLabel).join(" / ")}</strong>
                  <small>{threatPreview?.warning ?? activeCombatPulse?.text}</small>
                </div>
              </div>
              <div className="combat-mobile-result">
                <span>{latestCombatRound ? `最近：${latestCombatRound.actionLabel}` : "还未交手"}</span>
                <strong>{latestCombatRound?.outcomeText ?? "选择一个动作开始本回合。"}</strong>
                <small>{latestCombatRound?.enemyText ?? "先看敌人意图，再决定攻击、防守、包扎或战术。"}</small>
              </div>
            </div>
            <div className="combat-trait">
              <strong>{journey.combat.enemyTraitLabel}</strong>
              <span>{journey.combat.enemyTraitText}</span>
            </div>
            <div className="combat-intent">
              <strong>意图：{journey.combat.intentLabel}</strong>
              <span>{journey.combat.intentText}</span>
            </div>
            {threatPreview && (
              <div className="combat-threat" aria-label="回合威胁预告">
                <div>
                  <span>{threatPreview.roundLabel}</span>
                  <strong>
                    {threatPreview.intentLabel} / 反击 {threatPreview.incomingDamage}
                  </strong>
                  <small>{threatPreview.summary}</small>
                </div>
                <div>
                  <span>建议反制</span>
                  <strong>{threatPreview.counterLabels.join(" / ")}</strong>
                  <small>
                    {threatPreview.pulseLabel}
                    {threatPreview.pressureDamage > 0 ? `，压力伤害 +${threatPreview.pressureDamage}` : ""}
                  </small>
                </div>
                <div>
                  <span>高风险动作</span>
                  <strong>{threatPreview.riskyLabels.join(" / ") || "暂无"}</strong>
                  <small>{threatPreview.warning}</small>
                </div>
              </div>
            )}
            <div className="combat-special">
              <strong>{activeCombatPulse?.label}</strong>
              <span>{activeCombatPulse?.text}</span>
              <small>反制：{activeCombatPulse?.counterActions.map(combatActionLabel).join(" / ")}</small>
            </div>
            <div className="combat-rhythm">
              <div>
                <span>节奏</span>
                <strong>{journey.combat.tempo ?? 0}/3</strong>
                <small>正确反制会强化攻击、防守、包扎和战术。</small>
              </div>
              <div>
                <span>破势</span>
                <strong>{journey.combat.stagger ?? 0}/3</strong>
                <small>三次读对意图会击破架势：护甲 -1，暴露 +2。</small>
              </div>
            </div>
            <CombatReplayStrip records={journey.combatHistory} />
            <div className="combat-bars">
              <CombatBar label={journey.combat.enemyName} value={journey.combat.enemyHp} max={journey.combat.enemyMaxHp} tone="danger" />
              <CombatBar label="队伍" value={journey.combat.squadHp} max={journey.combat.squadMaxHp} tone="safe" />
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
                    {line.guard > 0 ? ` | 防护 ${line.guard}` : ""}
                    {line.wounds > 0 ? ` | 伤口 ${line.wounds}` : ""}
                    {line.status === "down" ? " | 倒下" : line.status === "strained" ? " | 吃力" : ""}
                  </small>
                </div>
              ))}
            </div>
            <div className="combat-stats">
              <span>攻击 {journey.combat.attack}</span>
              <span>护甲 {Math.max(0, journey.combat.armor - journey.combat.exposed)}</span>
              <span>暴露 {journey.combat.exposed}</span>
              <span>流血 {journey.combat.bleed}</span>
              <span>节奏 {journey.combat.tempo ?? 0}</span>
              <span>破势 {journey.combat.stagger ?? 0}</span>
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
                      <b>{combatCounterTagLabel(preview.counterTag)}</b>
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
              {activeNode.careful?.label ?? "谨慎搜索"}
            </button>
            <button className="ghost-button inline" type="button" onClick={() => onJourneyAction("force")}>
              {activeNode.force?.label ?? "强行推进"}
            </button>
          </div>
        ) : activeNode.type === "shop" ? (
          <div className="shop-choice-card">
            <div>
              <strong>交易抉择</strong>
              <span>消耗剩余随身补给，换取口粮、路线情报或最后的修理包。</span>
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
                      消耗 {outcome.costPriority.map((key) => resourceLabels[key]).join("/") || "无"} | 随身{" "}
                      {formatResourceDelta(outcome.fieldSupplyReward)} | 入库 {formatResourceDelta(outcome.reward)} | 压力{formatSignedPercent(outcome.pressure)}
                      {outcome.objectiveBonus > 0 ? ` | 目标 +${outcome.objectiveBonus}` : ""}
                    </small>
                    {outcome.supportText && <small className="facility-support-note">{outcome.supportText}</small>}
                  </button>
                );
              })}
            </div>
            <div className="journey-actions">
              <button className="ghost-button inline" type="button" onClick={() => onJourneyAction("skip")}>
                <ShoppingCart size={17} aria-hidden="true" />
                跳过交易
              </button>
            </div>
          </div>
        ) : activeNode.type === "camp" ? (
          <div className="camp-choice-card">
            <div>
              <strong>营地抉择</strong>
              <span>使用随身补给和基地支援，恢复、进食或标记下一段路线。</span>
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
                      消耗 {outcome.supplyPriority.map((key) => resourceLabels[key]).join("/") || "无"} | 疲劳{formatSignedNumber(outcome.fatigue)} 饥饿
                      {formatSignedNumber(outcome.hunger)} 口渴{formatSignedNumber(outcome.thirst)} 压力{formatSignedPercent(outcome.pressure)}
                      {outcome.objectiveBonus > 0 ? ` | 目标 +${outcome.objectiveBonus}` : ""}
                    </small>
                    {outcome.supportText && <small className="facility-support-note">{outcome.supportText}</small>}
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <button className="primary-button full-width" type="button" onClick={() => onJourneyAction("extract")}>
            撤离并结算
          </button>
        )}
        {canReturnEarly && (
          <div className="journey-actions">
            <button className="ghost-button inline danger-action" type="button" onClick={() => onJourneyAction("extract")}>
              {returnEarlyLabel}
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

function journeyNodeTypeLabel(type: JourneyNode["type"]) {
  const labels: Record<JourneyNode["type"], string> = {
    camp: "营地",
    combat: "战斗",
    event: "事件",
    extraction: "撤离",
    shop: "商店"
  };
  return labels[type];
}

function roadToneLabel(tone: "find" | "hazard" | "road") {
  const labels = {
    find: "路上发现",
    hazard: "路上险情",
    road: "路口"
  };
  return labels[tone];
}

function BurdenPreview({ burden }: { burden: JourneyCarryBurden }) {
  const fill = Math.max(4, Math.min(100, Math.round((burden.load / burden.capacity) * 100)));
  return (
    <div className={`burden-preview ${burden.tier}`}>
      <div>
        <span>背包负重</span>
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
    return `超载：初始压力 +${burden.pressurePenalty}%，行进疲劳 +${burden.fatiguePenalty}。`;
  }

  if (burden.tier === "heavy") {
    return `负重偏高：初始压力 +${burden.pressurePenalty}%，行进疲劳 +${burden.fatiguePenalty}。`;
  }

  return `轻装：初始压力 ${burden.pressurePenalty}%，没有额外行进疲劳。`;
}

function CombatReplayStrip({ records }: { records?: JourneyCombatRoundRecord[] }) {
  const recentRecords = (records ?? []).slice(-3);
  if (recentRecords.length === 0) {
    return null;
  }

  return (
    <div className="combat-replay" aria-label="战斗回合回放">
      {recentRecords.map((record) => (
        <article className={`combat-replay-card ${record.tone}`} key={record.id}>
          <span>
            第 {record.round} 回合 / {record.actionLabel}
          </span>
          <strong>{record.actorName}</strong>
          <small>{record.outcomeText}</small>
          <small>{record.enemyText}</small>
          <em>{record.counterText}</em>
        </article>
      ))}
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

function Reports({
  feed,
  latestReportId,
  onNavigate
}: {
  feed: FeedItem[];
  latestReportId: string | null;
  onNavigate: (view: ViewKey) => void;
}) {
  const latestReport = latestReportId ? feed.find((item) => item.id === latestReportId) : null;
  const baseReturnPlan = latestReport ? summarizeFeedBaseReturnPlan(latestReport) : null;
  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">战报</p>
          <h2>战报与动态流</h2>
        </div>
        {latestReportId && <span className="subtle-pill">刚完成一轮远征</span>}
      </div>
      {latestReportId && (
        <div className="report-next-actions" aria-label="战报下一步">
          <div>
            <span>下一步</span>
            <strong>远征已经归队，继续处理基地循环。</strong>
          </div>
          <button type="button" onClick={() => onNavigate("overview")}>
            回基地总览
          </button>
          <button type="button" onClick={() => onNavigate("survivors")}>
            处理伤病
          </button>
          <button type="button" onClick={() => onNavigate("expedition")}>
            准备下一次远征
          </button>
        </div>
      )}
      {baseReturnPlan?.hasPlan && (
        <div className="base-return-plan" aria-label="远征回基地处理队列">
          <div className="base-return-plan-heading">
            <span>回基地处理</span>
            <strong>{baseReturnPlan.headline}</strong>
            <small>{baseReturnPlan.summary}</small>
          </div>
          <div className="base-return-plan-grid">
            {baseReturnPlan.actions.map((action) => (
              <button className={`base-return-plan-action ${action.tone}`} key={action.id} type="button" onClick={() => onNavigate(action.targetView)}>
                <span>{action.label}</span>
                <strong>{action.text}</strong>
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="feed-list large">
        {feed.map((item) => (
          <article className="feed-item" key={item.id}>
            <span>{item.timestamp}</span>
            <div>
              <strong>{item.title}</strong>
              <p>{item.body}</p>
              <ReportSettlement item={item} />
              <ReportGrowthRoadmap item={item} />
              <ReportReturnLedger item={item} />
              <ReportActionDigest item={item} />
              <ReportTimeline item={item} />
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function ReportSettlement({ item }: { item: FeedItem }) {
  const settlement = summarizeFeedReportSettlement(item);
  if (!settlement.hasSettlement) {
    return null;
  }

  const groups = [
    { items: settlement.resources, label: "资源" },
    { items: settlement.objective, label: "目标" },
    { items: settlement.growth, label: "成长" },
    { items: settlement.risk, label: "风险" }
  ].filter((group) => group.items.length);

  return (
    <div className="report-settlement" aria-label="远征结算摘要">
      <div className="report-settlement-heading">
        <span>结算摘要</span>
        <strong>{settlement.headline}</strong>
      </div>
      <p>{settlement.summary}</p>
      <div className="report-settlement-grid">
        {groups.map((group) => (
          <article className="report-settlement-group" key={`${item.id}-settlement-${group.label}`}>
            <span>{group.label}</span>
            <ul>
              {group.items.slice(0, 4).map((entry) => (
                <li key={entry}>{entry}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </div>
  );
}

function ReportGrowthRoadmap({ item }: { item: FeedItem }) {
  const roadmap = summarizeFeedGrowthRoadmap(item);
  if (!roadmap.hasGrowth) {
    return null;
  }

  return (
    <div className="report-growth-roadmap" aria-label="幸存者成长路线">
      <div className="report-growth-heading">
        <span>成长路线</span>
        <strong>{roadmap.summary}</strong>
      </div>
      <div className="report-growth-grid">
        {roadmap.entries.slice(0, 4).map((entry) => (
          <article className="report-growth-card" key={`${item.id}-growth-${entry.raw}`}>
            <span>{entry.name}</span>
            <strong>{entry.xpText || "获得经验"}</strong>
            <small>{entry.levelText || entry.nextText || "继续远征会推进下一级"}</small>
            {entry.perkText && <em>{entry.perkText}</em>}
          </article>
        ))}
      </div>
    </div>
  );
}

function ReportReturnLedger({ item }: { item: FeedItem }) {
  const ledger = summarizeFeedReturnLedger(item);
  if (!ledger.hasLedger) {
    return null;
  }

  const rows = [
    { label: "基地入库", value: ledger.base },
    { label: "目标推进", value: ledger.objective },
    { label: "账号回收", value: ledger.account },
    { label: "伤病", value: ledger.injuries },
    { label: "撤离", value: ledger.extraction }
  ].filter((row) => row.value);

  return (
    <div className="return-ledger" aria-label="归队清单">
      <div className="return-ledger-heading">
        <span>归队清单</span>
        <strong>{ledger.extraction || "本次远征已结算"}</strong>
      </div>
      <div className="return-ledger-grid">
        {rows.map((row) => (
          <article className="return-ledger-row" key={`${item.id}-ledger-${row.label}`}>
            <span>{row.label}</span>
            <strong>{row.value}</strong>
          </article>
        ))}
      </div>
    </div>
  );
}

function ReportActionDigest({ item }: { item: FeedItem }) {
  const ledger = summarizeFeedReturnLedger(item);
  const settlement = summarizeFeedReportSettlement(item);
  if (!ledger.hasLedger && !settlement.hasSettlement) {
    return null;
  }

  const rows = [
    {
      label: "基地",
      text: ledger.base ? `入库 ${ledger.base}` : settlement.resources.length ? `带回 ${settlement.resources.length} 项资源` : "回基地整理库存"
    },
    {
      label: "目标",
      text: ledger.objective || settlement.objective[0] || "确认房间目标进度"
    },
    {
      label: "伤病",
      text: ledger.injuries || settlement.risk.find((entry) => entry.includes("伤") || entry.includes("疲劳")) || "队伍状态可继续观察"
    },
    {
      label: "成长",
      text: ledger.account || settlement.growth[0] || "本轮没有新的个人回收"
    }
  ];

  return (
    <div className="report-action-digest" aria-label="战后复盘">
      <div className="report-action-digest-heading">
        <span>战后复盘</span>
        <strong>{settlement.hasSettlement ? settlement.summary : "远征已经归队，先处理基地循环。"}</strong>
      </div>
      <div className="report-action-digest-grid">
        {rows.map((row) => (
          <article className="report-action-digest-row" key={`${item.id}-digest-${row.label}`}>
            <span>{row.label}</span>
            <strong>{row.text}</strong>
          </article>
        ))}
      </div>
    </div>
  );
}

function ReportTimeline({ item }: { item: FeedItem }) {
  const timeline = summarizeFeedReportTimeline(item);
  if (!timeline.hasProcess) {
    return null;
  }

  return (
    <div className="report-timeline" aria-label="远征过程回放">
      <div className="report-timeline-heading">
        <span>过程回放</span>
        <strong>{timeline.summary}</strong>
      </div>
      <div className="report-timeline-grid">
        {timeline.steps.slice(0, 8).map((step, index) => (
          <article className={`report-timeline-step ${step.category}`} key={`${item.id}-timeline-${index}-${step.title}`}>
            <span>{step.label}</span>
            <strong>{step.title}</strong>
            <small>{step.body}</small>
          </article>
        ))}
      </div>
    </div>
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
      <p className="eyebrow">设施</p>
      <h2>基地发展</h2>
      <div className="development-plan-card" aria-label="基地发展计划">
        <div>
          <span>发展计划</span>
          <strong>{developmentPlan.summary}</strong>
          <small>
            {developmentPlan.recommended.length
              ? "下一轮建造周期推荐项目"
              : "所有设施已经完全发展"}
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
                <span>{facilityProjectActionLabel(project.action)}到 Lv.{project.nextLevel}</span>
              </div>
              <small>
                {project.canAfford ? `材料 ${project.cost} 已备齐` : `还缺 ${project.materialDeficit} 材料`}
              </small>
              <div className="development-project-why" aria-label="设施推荐原因">
                <span>推荐原因</span>
                <strong>{project.reason}</strong>
                <small>{project.nextStep}</small>
              </div>
              <p>基地：{project.baseImpact}</p>
              <p>出征：{project.expeditionImpact}</p>
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
          const preview = facilityImpactPreview(facility);
          return (
            <article className={`facility-card ${facility.status} ${built ? "" : "unbuilt"}`} key={facility.id}>
              <div className="facility-title-row">
                <h3>{facility.name}</h3>
                <small>{facilityCategoryLabel(facility.category)}</small>
              </div>
              <span>{built ? `Lv.${facility.level}` : "蓝图"}</span>
              <p>{facility.effect}</p>
              <div className="facility-upgrade-preview" aria-label="设施升级收益预览">
                <strong>{preview.action}</strong>
                <div className="facility-impact-grid">
                  <span>
                    <b>基地</b>
                    <small>{preview.baseText}</small>
                  </span>
                  <span>
                    <b>出征</b>
                    <small>{preview.expeditionText}</small>
                  </span>
                </div>
              </div>
              <button
                className="ghost-button compact-action"
                type="button"
                disabled={maxed || state.resources.materials < cost}
                onClick={() => onUpgrade(facility.id)}
              >
                <Wrench size={16} aria-hidden="true" />
                {maxed ? "已完全发展" : `${facilityProjectActionLabel(actionLabel)}：${cost} 材料`}
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
  memberSummaries,
  roomSlug,
  summary,
  copyStatus,
  onCopyRoomLink,
  onCreateRoom,
  onRenamePlayer
}: {
  player: RoomPlayer;
  players: RoomPlayer[];
  memberSummaries: RoomMemberSummary[];
  roomSlug: string;
  summary: RoomCooperationSummary;
  copyStatus: "idle" | "copied" | "failed";
  onCopyRoomLink: () => void;
  onCreateRoom: () => void;
  onRenamePlayer: (name: string) => void;
}) {
  return (
    <section className="panel">
      <p className="eyebrow">房间</p>
      <div className="panel-heading">
        <div>
          <h2>房间与成员</h2>
          <p className="muted-copy">同一个房间链接会共享基地、远征结果和动态流。</p>
        </div>
        <span className="subtle-pill">{roomSlug}</span>
      </div>

      <div className={`room-cooperation-board ${summary.readiness}`} aria-label="房间协作总览">
        <div>
          <span>协作状态</span>
          <strong>{summary.headline}</strong>
          <small>下一步：{summary.nextNeed}</small>
          <small>{summary.actionHint}</small>
        </div>
        <div className="room-cooperation-metrics">
          <span>
            成员 <b>{summary.memberCount}</b>
          </span>
          <span>
            捐入 <b>{summary.contributionCount}</b>
          </span>
          <span>
            编队 <b>{summary.assignedSurvivors}</b>
          </span>
          <span>
            班次 <b>{summary.baseShifts}</b>
          </span>
        </div>
        <div className="room-cooperation-gaps" aria-label="房间协作缺口">
          {summary.gaps.map((gap) => (
            <article className={`room-gap-card ${gap.status}`} key={gap.id}>
              <span>{gap.status === "urgent" ? "紧急" : gap.status === "ready" ? "就绪" : "待办"}</span>
              <strong>{gap.label}</strong>
              <small>{gap.text}</small>
            </article>
          ))}
        </div>
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

      <div className="member-summary-list" aria-label="成员协作记录">
        {memberSummaries.map((member) => (
          <article className="member-summary-row" key={member.userId}>
            <div>
              <span>{member.roleLabel}</span>
              <strong>{member.displayName}</strong>
              <small>最近在线 {formatLastSeen(member.lastSeenAt)}</small>
            </div>
            <div className="member-metrics">
              <span>
                捐入 <b>{member.contributionText}</b>
              </span>
              <span>
                出征编队 <b>{member.assignedCount}</b>
              </span>
              <span>
                基地班次 <b>{member.baseShiftText}</b>
              </span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function ArchiveView({ state }: { state: GameState }) {
  const playableSmoke = useMemo(() => runPlayableLoopSmoke(), []);

  return (
    <section className="panel">
      <p className="eyebrow">档案</p>
      <h2>档案/图鉴</h2>
      <div className={`playtest-readiness-card ${playableSmoke.ok ? "ready" : "blocked"}`} aria-label="试玩完整性检查">
        <div className="playtest-readiness-heading">
          <span>本地验收</span>
          <strong>{playableSmoke.ok ? "核心试玩闭环已通过" : "核心试玩闭环有阻塞"}</strong>
          <small>覆盖基地待办、编队、出征结算、战报解析和回基地下一步。</small>
        </div>
        <div className="playtest-checkpoint-grid">
          {playableSmoke.checkpoints.map((checkpoint) => (
            <article className={checkpoint.ok ? "playtest-checkpoint ready" : "playtest-checkpoint blocked"} key={checkpoint.id}>
              <span>{checkpoint.ok ? "通过" : "阻塞"}</span>
              <strong>{playtestCheckpointLabel(checkpoint.id)}</strong>
              <small>{checkpoint.detail}</small>
            </article>
          ))}
        </div>
        <div className="playtest-readiness-footer">
          <span>{playableSmoke.reportDigest.settlement.summary}</span>
          <strong>{playableSmoke.nextBaseTasks.summary}</strong>
        </div>
        <div className="playtest-gate-strip" aria-label="发布前本地门禁">
          <span>npm run copy:check</span>
          <span>npm run playable:check</span>
          <span>npm run iteration:check</span>
        </div>
      </div>
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

function playtestCheckpointLabel(id: ReturnType<typeof runPlayableLoopSmoke>["checkpoints"][number]["id"]) {
  const labels: Record<ReturnType<typeof runPlayableLoopSmoke>["checkpoints"][number]["id"], string> = {
    "base-command": "基地待办",
    "squad-assigned": "出征编队",
    "combat-round": "回合战斗",
    "expedition-settled": "出征结算",
    "report-readable": "战报可读",
    "next-base-action": "回基地行动"
  };

  return labels[id];
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

  const bonusLine = `野外战利入库：${formatResourceDelta(bonusReward)}。`;
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
      `${title}：${choice.successLog} ${resourceLabels[spentKey]} -1，${formatResourceDelta(choice.reward)}，压力 ${formatSignedPercent(
        choice.pressure
      )}。`
    );
    recordJourneyDecision(journey, {
      category: "event",
      detail: choice.successLog,
      impacts: [`${resourceLabels[spentKey]} -1`, formatResourceDelta(choice.reward), `压力 ${formatSignedPercent(choice.pressure)}`],
      label: choice.label,
      nodeTitle: title,
      tone: choice.pressure < 0 || formatResourceDelta(choice.reward) !== "无战利品" ? "safe" : "warning"
    });
    return;
  }

  const fallbackPressure = choice.pressure < 0 ? 5 : Math.max(8, choice.pressure);
  journey.pressure = clampPercent(journey.pressure + fallbackPressure);
  journey.rollShift += choice.rollShift < 0 ? choice.rollShift / 2 : choice.rollShift;
  journey.logs.push(`${title}：${choice.fallbackLog} ${formatResourceDelta(choice.reward)}，压力 ${formatSignedPercent(fallbackPressure)}。`);
  recordJourneyDecision(journey, {
    category: "event",
    detail: choice.fallbackLog,
    impacts: ["补给不足", formatResourceDelta(choice.reward), `压力 ${formatSignedPercent(fallbackPressure)}`],
    label: choice.label,
    nodeTitle: title,
    tone: "danger"
  });
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
    guard: "防守",
    patch: "包扎",
    retreat: "撤退",
    strike: "攻击",
    tactic: "战术"
  };
  return labels[action];
}

function combatCounterTagLabel(tag: "Counter" | "Risk" | "Standard") {
  const labels: Record<"Counter" | "Risk" | "Standard", string> = {
    Counter: "反制",
    Risk: "风险",
    Standard: "常规"
  };
  return labels[tag];
}

function facilityProjectActionLabel(action: "Build" | "Upgrade" | "Maxed") {
  const labels: Record<"Build" | "Upgrade" | "Maxed", string> = {
    Build: "建造",
    Upgrade: "升级",
    Maxed: "满级"
  };
  return labels[action];
}

function accountBaseProjectActionLabel(project: AccountBaseDevelopmentPlan["projects"][number]) {
  if (project.status === "maxed") {
    return "已满级";
  }

  if (!project.canAfford) {
    return "资源不足";
  }

  return `升级：${formatAccountBaseProjectCost(project.cost)}`;
}

function formatAccountBaseProjectCost(cost: AccountBaseDevelopmentPlan["projects"][number]["cost"]) {
  const parts = [
    cost.materials > 0 ? `材料 ${cost.materials}` : "",
    cost.rareParts > 0 ? `零件 ${cost.rareParts}` : "",
    cost.intel > 0 ? `情报 ${cost.intel}` : ""
  ].filter(Boolean);

  return parts.join(" / ") || "无消耗";
}

function facilityCategoryLabel(category?: string) {
  const labels: Record<string, string> = {
    core: "核心",
    expedition: "出征",
    survival: "生存",
    utility: "支援"
  };
  return labels[category ?? "core"] ?? "核心";
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
      label: "红色路线",
      text: "下一段很可能失控。提前返程可以保住已经拿到的野外收获。",
      tone: "danger"
    };
  }

  if (journey.pressure >= 52 || worstCondition >= 58) {
    return {
      label: "吃紧路线",
      text: "队伍还能继续，但补给或营地行动需要尽快解决路况。",
      tone: "warning"
    };
  }

  return {
    label: "可控路线",
    text: "道路仍在可控范围内。现在适合推进、侦察或搜刮。",
    tone: "safe"
  };
}

function formatResourceDelta(resources: ResourceBundle) {
  const entries = resourceKeys.filter((key) => resources[key] > 0);
  if (entries.length === 0) {
    return "无";
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

  return "Supabase 请求失败";
}
