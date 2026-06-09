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
import type { FeedItem, GameState, LocationFamily, ResourceBundle, ResourceKey, RiskStrategy, Survivor } from "./game/types";
import {
  advanceRoomDay,
  applyContribution,
  baseDayPreview,
  baseCommandBriefing,
  baseDevelopmentBriefing,
  assignSurvivorToRoom,
  accountBaseDevelopmentPlan,
  accountGrowthBoundary,
  baseDevelopmentPlan,
  baseDevelopmentRoute,
  baseRecoveryPlan,
  baseShiftPlan,
  baseTaskList,
  resolvePlaytestExpedition,
  roomCooperationPulse,
  roomCooperationSummary,
  roomContributionPlan,
  roomLaunchBriefing,
  roomMemberSummaries,
  roomPlaytestReadiness,
  setBaseAssignment,
  treatSurvivor,
  upgradeAccountBase,
  upgradeFacility,
  type AccountBaseDevelopmentPlan,
  type AccountBaseFacilityId,
  type BaseTaskItem,
  type BaseDevelopmentPlan,
  type BaseDevelopmentRoute,
  type BaseRecoveryPlan,
  type BaseShiftPlan,
  type RoomCooperationPulse,
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
  combatCommandBriefing,
  combatRoundPlan,
  combatThreatPreview,
  combatLootPlan,
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
  journeySituationReport,
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
  expeditionXpGain,
  expeditionDoctrineForFacility,
  expeditionDoctrineOptions,
  expeditionSupportDiagnosis,
  expeditionSupportPlan,
  isSurvivorAtLevelCap,
  mergeExpeditionSupport,
  supportFromAccountBase,
  supportFromFacilities,
  survivorGrowthPlan,
  survivorExpeditionGrowthPreview,
  survivorPerkDetails,
  xpForNextLevel,
  type ExpeditionDoctrineId
} from "./playtest/progression";
import { clearPlaytestSession, createStarterSession, loadPlaytestSession, savePlaytestSession } from "./playtest/state";
import { expeditionLaunchChecklist, expeditionYieldPreview } from "./playtest/launchChecklist";
import { runPlayableLoopSmoke } from "./playtest/playableLoop";
import {
  summarizeFeedBaseReturnPlan,
  summarizeFeedExpeditionDebrief,
  summarizeFeedGrowthRoadmap,
  summarizeFeedReportSettlement,
  summarizeFeedReportTimeline,
  summarizeFeedReturnPulse,
  summarizeFeedReturnLedger,
  type FeedReturnPulse
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
type ViewDefinition = { key: ViewKey; label: string; icon: typeof Home; mobilePrimary?: boolean };

const syncStatusLabels: Record<SyncStatus, string> = {
  local: "本地模式",
  loading: "读取数据库",
  initialized: "数据库已初始化",
  saving: "同步中",
  synced: "数据库已同步",
  error: "数据库未连接"
};

const views: ViewDefinition[] = [
  { key: "overview", label: "基地总览", icon: Home, mobilePrimary: true },
  { key: "survivors", label: "幸存者", icon: Users, mobilePrimary: true },
  { key: "expedition", label: "远征准备", icon: Send, mobilePrimary: true },
  { key: "reports", label: "战报动态", icon: ClipboardList },
  { key: "facilities", label: "设施", icon: Wrench, mobilePrimary: true },
  { key: "members", label: "成员", icon: Shield, mobilePrimary: true },
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

const playtestSettings = {
  languageMode: "中文",
  languageStatus: "当前启用完整中文文案，英文包待接入后再开放切换。",
  pageMode: "单页模式",
  pageStatus: "基地、编队、远征、设施和成员都在同一页面内切换。",
  releaseMode: "本地验证",
  releaseStatus: "大功能先跑本地门禁，通过后再发布试玩。"
};

const languagePackChecklist = [
  {
    label: "界面按钮",
    status: "中文已覆盖",
    text: "导航、操作按钮、设置和确认提示必须整包切换。"
  },
  {
    label: "路上文本",
    status: "中文已覆盖",
    text: "远征事件、战斗意图、商店和营地文本必须同语种显示。"
  },
  {
    label: "结算战报",
    status: "中文已覆盖",
    text: "战报、成长、复盘建议和回基地队列必须同语种输出。"
  },
  {
    label: "异常提示",
    status: "中文已覆盖",
    text: "登录、同步、数据库降级和发布验收提示不能混用语言。"
  }
];

const languageSwitchReadiness = [
  {
    detail: "所有玩家可见按钮、状态、确认提示和错误提示必须进入同一套语言表。",
    label: "界面包",
    status: "中文可用"
  },
  {
    detail: "远征事件、战斗意图、商店、营地和结算日志需要整包翻译后才能切换。",
    label: "玩法包",
    status: "英文待接入"
  },
  {
    detail: "本地门禁会继续禁止未豁免的中英文混写，发布前必须重新跑完整检查。",
    label: "发布门禁",
    status: "混写拦截"
  }
];

const releaseReadinessSteps = [
  {
    command: "npm run iteration:check",
    detail: "覆盖工作流契约、中文文案、试玩闭环、测试和生产构建。",
    label: "本地门禁"
  },
  {
    command: "git status --short",
    detail: "发布前必须没有未提交改动，避免把半成品带上线。",
    label: "工作区干净"
  },
  {
    command: "npm run release:preflight",
    detail: "只在准备发布的大切片或线上阻断修复时运行。",
    label: "发布预检"
  },
  {
    command: "npm run release:verify",
    detail: "发布后确认生产页面、注册接口、房间读写和关键文案。",
    label: "线上验收"
  }
];

const releaseBatchPolicy = [
  {
    detail: "基地、出征、战斗、战报、多人协作中的多个本地切片已经组成玩家能连续体验的新路径。",
    label: "大功能批次",
    status: "可以发布"
  },
  {
    detail: "登录、进房、保存、出征、构建产物或生产页面访问被阻断时，可以单独发布修复。",
    label: "线上阻断",
    status: "可以发布"
  },
  {
    detail: "界面小调整、文案、样式、测试、内部重构先留在本地提交，累积到下一批完整试玩切片。",
    label: "局部小改",
    status: "暂不发布"
  },
  {
    detail: "发布前必须通过本地门禁、工作区干净、发布预检和发布后线上验收。",
    label: "准入条件",
    status: "强制检查"
  }
];

const browserSmokeChecklist = [
  {
    detail: "打开后能看到试玩登录或基地总览。",
    label: "本地入口",
    target: "http://localhost:5173/?room=playtest-smoke"
  },
  {
    detail: "底部导航、手机端行动栏和当前操作不互相遮挡。",
    label: "手机单页",
    target: "窄屏视口"
  },
  {
    detail: "至少触发一项资源、设施、治疗或协作操作。",
    label: "基地经营",
    target: "基地、设施、治疗、编队、协作"
  },
  {
    detail: "能看到收益预览、路线预告、当前行动和结算战报。",
    label: "出征流程",
    target: "准备、路线、战斗或事件、撤离"
  },
  {
    detail: "中文提示原因，并能继续本地试玩或重试。",
    label: "同步降级",
    target: "数据库不可用时"
  },
  {
    detail: "发布后确认生产页面、注册接口和游客房间快照。",
    label: "线上验收",
    target: "https://ember-dossier.pages.dev/?room=playtest-smoke"
  }
];

const baseWorkOptions: Array<{ key: BaseWorkType | "idle"; label: string }> = [
  { key: "idle", label: "休息" },
  { key: "forage", label: "搜寻" },
  { key: "repair", label: "修理" },
  { key: "guard", label: "守卫" },
  { key: "care", label: "护理" }
];

type BaseActionFeedback = {
  detail: string;
  items: Array<{
    detail: string;
    id: string;
    label: string;
    tone: "safe" | "warning" | "danger";
    value: string;
  }>;
  scope: "survivors" | "facilities" | "overview";
  title: string;
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
  const [lastBaseActionFeedback, setLastBaseActionFeedback] = useState<BaseActionFeedback | null>(null);
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
    setLastBaseActionFeedback(buildBaseActionFeedback(session, nextSession, "资源捐入", "overview"));
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
      setLastBaseActionFeedback(buildBaseActionFeedback(session, nextSession, "伤病治疗", "survivors"));
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
      setLastBaseActionFeedback(
        buildBaseActionFeedback(session, nextSession, type === "idle" ? "班次调整" : `${baseWorkLabel(type)}班安排`, "survivors")
      );
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
      setLastBaseActionFeedback(buildBaseActionFeedback(session, nextSession, "设施建设", "facilities"));
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
      setLastBaseActionFeedback(buildBaseActionFeedback(session, nextSession, "个人基地升级", "facilities"));
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
      setLastBaseActionFeedback(buildBaseActionFeedback(session, nextSession, "结束当天", "overview"));
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
      setJourney(annotateJourneyActionDelta(journey, resolveBaseCommand(journey, selectedBaseCommand)));
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
      setJourney(annotateJourneyActionDelta(journey, next));
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
      setJourney(annotateJourneyActionDelta(journey, next));
      return;
    }

    const selectedTravelPlan = travelPlanFromAction(action);
    if (selectedTravelPlan) {
      setJourney(annotateJourneyActionDelta(journey, setJourneyTravelPlan(journey, selectedTravelPlan)));
      return;
    }

    const selectedSegmentTactic = segmentTacticFromAction(action);
    if (selectedSegmentTactic) {
      setJourney(annotateJourneyActionDelta(journey, setJourneySegmentTactic(journey, selectedSegmentTactic)));
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
    setJourney(annotateJourneyActionDelta(journey, next));
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
      setJourney(annotateJourneyActionDelta(journey, traveled));
      return;
    }

    setJourney(annotateJourneyActionDelta(journey, resolved));
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

  const syncCanRetry = hasSupabaseConfig && guestMode && !authSession;
  const syncTroubleHint = syncCanRetry
    ? "可以继续本地试玩；重试会重新读取房间并上传当前进度。"
    : authSession
      ? "账号进度会先保留在本机；稍后刷新页面或重新登录后再同步。"
      : "当前会继续使用本地试玩数据。";
  const playtestEnvironment = hasSupabaseConfig
    ? authSession
      ? {
          detail: "账号进度会随登录账号保存，房间仍通过链接协作。",
          mode: "账号云端",
          sync: syncStatusLabels[syncStatus]
        }
      : guestMode
        ? {
            detail: "游客房间会尝试同步到数据库，失败时仍可本地继续。",
            mode: "游客房间",
            sync: syncStatusLabels[syncStatus]
          }
        : {
            detail: "需要登录或选择游客继续后，才能进入房间试玩。",
            mode: "等待登录",
            sync: "尚未进入"
          }
    : {
        detail: "当前没有远端配置，所有试玩数据只保存在本机。",
        mode: "本地试玩",
        sync: syncStatusLabels[syncStatus]
      };

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
    <main className="app-shell" data-app-mode="single-page">
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
            const navClassName = [
              "nav-item",
              view === item.key ? "active" : "",
              item.mobilePrimary ? "mobile-primary" : "mobile-secondary"
            ]
              .filter(Boolean)
              .join(" ");
            return (
              <button
                key={item.key}
                className={navClassName}
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

        <div className="playtest-settings-card" aria-label="试玩设置">
          <span>试玩设置</span>
          <strong>{playtestSettings.languageMode}</strong>
          <small>{playtestSettings.languageStatus}</small>
          <div className="playtest-environment-card" aria-label="试玩环境状态">
            <span>试玩环境</span>
            <strong>{playtestEnvironment.mode}</strong>
            <small>{playtestEnvironment.detail}</small>
            <div>
              <b>{playtestEnvironment.sync}</b>
              <em>房间人数 {roomPlayers.length}</em>
            </div>
          </div>
          <div className="language-mode-switch" aria-label="语言模式">
            <button className="active" type="button">
              中文已启用
            </button>
            <button disabled type="button">
              英文包待完整
            </button>
          </div>
          <div className="language-switch-readiness" aria-label="语言切换准入">
            <div className="language-switch-heading">
              <span>切换准入</span>
              <strong>英文模式未解锁，避免半中文半英文进入试玩。</strong>
            </div>
            <div className="language-switch-grid">
              {languageSwitchReadiness.map((item) => (
                <article key={item.label}>
                  <span>{item.label}</span>
                  <strong>{item.status}</strong>
                  <small>{item.detail}</small>
                </article>
              ))}
            </div>
          </div>
          <div className="language-pack-grid" aria-label="语言包覆盖范围">
            {languagePackChecklist.map((item) => (
              <span key={item.label}>
                {item.label}
                <b>{item.status}</b>
                <small>{item.text}</small>
              </span>
            ))}
          </div>
          <div className="playtest-settings-grid">
            <span>
              {playtestSettings.pageMode}
              <b>{playtestSettings.pageStatus}</b>
            </span>
            <span>
              {playtestSettings.releaseMode}
              <b>{playtestSettings.releaseStatus}</b>
            </span>
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
            {syncStatus === "error" && syncCanRetry && (
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

        {syncStatus === "error" && (
          <section className="sync-health-card" aria-label="数据库同步提示">
            <div>
              <span>同步状态</span>
              <strong>数据库未连接</strong>
              <p>{syncError ?? "暂时无法连接数据库。"}</p>
              <small>{syncTroubleHint}</small>
            </div>
            {syncCanRetry && (
              <button className="sync-retry" type="button" onClick={retryRemoteSync}>
                重试
              </button>
            )}
          </section>
        )}

        {view === "overview" && (
          <Overview
            state={state}
            session={session}
            accountBasePlan={accountBaseDevelopmentPlan(session.account)}
            contributionDraft={contributionDraft}
            lastBaseActionFeedback={lastBaseActionFeedback}
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
            accountTrainingRoomLevel={session.account.base.trainingRoomLevel}
            selectedIds={draft.squadIds}
            canTreat={session.room.base.resources.medicine > 0}
            baseAssignments={session.room.baseAssignments}
            baseFeedback={baseFeedbackForScope(lastBaseActionFeedback, "survivors")}
            recoveryPlan={baseRecoveryPlan(session)}
            shiftPlan={baseShiftPlan(session)}
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
          <Facilities
            state={state}
            baseFeedback={baseFeedbackForScope(lastBaseActionFeedback, "facilities")}
            developmentPlan={baseDevelopmentPlan(session)}
            developmentBriefing={baseDevelopmentBriefing(session)}
            developmentRoute={baseDevelopmentRoute(session)}
            onUpgrade={upgradeRoomFacility}
          />
        )}
        {view === "members" && (
          <RoomMembers
            contributionPlan={roomContributionPlan(session)}
            player={player}
            players={roomPlayers}
            memberSummaries={roomMemberSummaries(session)}
            launchBriefing={roomLaunchBriefing(session)}
            playtestReadiness={roomPlaytestReadiness(session)}
            pulse={roomCooperationPulse(session)}
            roomSlug={roomSlug}
            summary={roomCooperationSummary(session)}
            copyStatus={copyStatus}
            currentUserId={session.account.profile.userId}
            onCopyRoomLink={copyRoomLink}
            onCreateRoom={createNewRoom}
            onNavigate={setView}
            onRenamePlayer={updatePlayerName}
          />
        )}
        {view === "archive" && <ArchiveView state={state} />}
      </section>
    </main>
  );
}

function baseFeedbackForScope(feedback: BaseActionFeedback | null, scope: BaseActionFeedback["scope"]) {
  return feedback?.scope === scope ? feedback : null;
}

function BaseActionFeedbackPanel({
  feedback,
  label
}: {
  feedback: BaseActionFeedback | null;
  label: string;
}) {
  if (!feedback) {
    return null;
  }

  return (
    <div className="base-action-feedback" aria-label={label}>
      <div className="base-action-feedback-heading">
        <span>最近操作</span>
        <strong>{feedback.title}</strong>
        <small>{feedback.detail}</small>
      </div>
      <div className="base-action-feedback-grid">
        {feedback.items.map((item) => (
          <article className={item.tone} key={item.id}>
            <span>{item.label}</span>
            <strong>{item.value}</strong>
            <small>{item.detail}</small>
          </article>
        ))}
      </div>
    </div>
  );
}

function Overview({
  state,
  session,
  accountBasePlan,
  contributionDraft,
  lastBaseActionFeedback,
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
  lastBaseActionFeedback: BaseActionFeedback | null;
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
  const commandBriefing = baseCommandBriefing(session);
  const growthBoundary = accountGrowthBoundary(session.account);
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
  const latestReport = session.room.feed.find((item) => item.kind === "report") ?? null;
  const latestReturnPlan = latestReport ? summarizeFeedBaseReturnPlan(latestReport) : null;
  const commandActions = [
    { icon: Send, label: "准备远征", text: "编队、地点、补给", view: "expedition" as ViewKey },
    { icon: Users, label: "处理伤病", text: "治疗与班次", view: "survivors" as ViewKey },
    { icon: Wrench, label: "发展设施", text: "建造和升级", view: "facilities" as ViewKey }
  ];
  const playtestRouteSteps = [
    { label: "基地", text: "看资源、今日待办和明日预报。", view: "overview" as ViewKey },
    { label: "协作", text: "邀请好友、认领捐入和留守职责。", view: "members" as ViewKey },
    { label: "编队", text: "安排幸存者出征或治疗伤病。", view: "survivors" as ViewKey },
    { label: "建设", text: "按建设队列升级房间设施。", view: "facilities" as ViewKey },
    { label: "出征", text: "选择地点、补给、风险并进入回合战斗。", view: "expedition" as ViewKey },
    { label: "复盘", text: "查看战报，回基地处理下一轮循环。", view: "reports" as ViewKey }
  ];
  const baseExpeditionSupport = baseExpeditionSupportBriefing(dayPreview);
  const settlementPulse = baseDaySettlementPulse(lastBaseActionFeedback, session);
  const basePriorityItems = baseOperationPriorities({
    developmentPlan: baseDevelopmentPlan(session),
    recoveryPlan: baseRecoveryPlan(session),
    session,
    supportBriefing: baseExpeditionSupport
  });
  const baseSchedulePreview = [
    {
      detail: dayPreview.supplySummary,
      label: "消耗",
      tone: dayPreview.foodShortage + dayPreview.waterShortage > 0 ? "danger" : "safe",
      value: `食物 -${dayPreview.foodNeed - dayPreview.foodShortage} / 水 -${dayPreview.waterNeed - dayPreview.waterShortage}`
    },
    {
      detail: dayPreview.recoverySummary,
      label: "恢复",
      tone: dayPreview.shiftCounts.care > 0 ? "safe" : dayPreview.recoverySummary.includes("0 人恢复中") ? "neutral" : "warning",
      value: `${dayPreview.shiftCounts.care} 个护理班`
    },
    {
      detail: dayPreview.repairSummary,
      label: "目标",
      tone: dayPreview.objectiveGain > 0 ? "safe" : "warning",
      value: `${dayPreview.objectiveCurrent} → ${dayPreview.objectiveProjected}`
    },
    {
      detail: dayPreview.guardSummary,
      label: "危险",
      tone: dayPreview.dangerDelta <= 0 ? "safe" : dayPreview.dangerDelta >= 5 ? "danger" : "warning",
      value: formatSignedNumber(dayPreview.dangerDelta)
    },
    {
      detail: dayPreview.forageSummary,
      label: "搜寻",
      tone: dayPreview.shiftCounts.forage > 0 ? "safe" : "neutral",
      value: dayPreview.shiftCounts.forage > 0 ? "有补给进账" : "无人搜寻"
    }
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
        <div className="account-growth-boundary" aria-label="账号成长边界">
          <div>
            <span>成长上限</span>
            <strong>{growthBoundary.summary}</strong>
            <small>{growthBoundary.nextAction}</small>
          </div>
          <div className="account-growth-metrics">
            <span>
              幸存者
              <b>{growthBoundary.survivorProgressLabel}</b>
              <small>{growthBoundary.survivorCapLabel}</small>
            </span>
            <span>
              个人基地
              <b>{growthBoundary.baseCapLabel}</b>
              <small>{growthBoundary.maxedRooms} 个房间已达上限</small>
            </span>
          </div>
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
        <div className="playtest-route-guide" aria-label="试玩路线导航">
          <div className="playtest-route-heading">
            <span>试玩路线</span>
            <strong>按这条路线走，可以体验完整基地到出征闭环。</strong>
          </div>
          <div className="playtest-route-grid">
            {playtestRouteSteps.map((step, index) => (
              <button key={step.label} type="button" onClick={() => onNavigate(step.view)}>
                <span>第 {index + 1} 步</span>
                <strong>{step.label}</strong>
                <small>{step.text}</small>
              </button>
            ))}
          </div>
        </div>
        <div className="base-task-list" aria-label="今日基地待办">
          <div className={`base-command-center ${commandBriefing.readiness}`} aria-label="今日指挥板">
            <div className="base-command-priority">
              <span>今日指挥板</span>
              <strong>{commandBriefing.headline}</strong>
              <small>{commandBriefing.summary}</small>
            </div>
            <div className="base-command-primary">
              <span>{baseTaskShortUiLabel(commandBriefing.phase)}</span>
              <strong>{primaryTask.title}</strong>
              <small>{primaryTask.body}</small>
              <button type="button" onClick={() => handleTaskAction(commandBriefing.primaryTaskId)}>
                <Activity size={16} aria-hidden="true" />
                {primaryTaskAction.label}
              </button>
            </div>
            <div className="base-command-actions">
              {commandBriefing.items.map((item) => (
                <button className={item.status} type="button" key={item.id} onClick={() => handleTaskAction(item.id)}>
                  <strong>{item.actionLabel}</strong>
                  <small>{item.detail}</small>
                </button>
              ))}
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
          <div className="base-operation-priority" aria-label="基地经营优先级">
            <div className="base-operation-priority-heading">
              <span>经营优先级</span>
              <strong>先处理会卡住下一次出征的事。</strong>
              <small>补给、伤病、建设和后勤支援会一起影响明天能不能稳妥出发。</small>
            </div>
            <div className="base-operation-priority-grid">
              {basePriorityItems.map((item) => (
                <button className={item.tone} key={item.id} type="button" onClick={() => onNavigate(item.view)}>
                  <span>{item.label}</span>
                  <strong>{item.title}</strong>
                  <small>{item.detail}</small>
                  <b>{item.action}</b>
                </button>
              ))}
            </div>
          </div>
          <div className="base-schedule-preview" aria-label="基地日程预演">
            <div className="base-schedule-preview-heading">
              <span>日程预演</span>
              <strong>按下结束当天后，会先结算这些基地后果。</strong>
              <small>用它判断该先补资源、排护理、修目标，还是直接进入下一天。</small>
            </div>
            <div className="base-schedule-preview-grid">
              {baseSchedulePreview.map((item) => (
                <article className={item.tone} key={item.label}>
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                  <small>{item.detail}</small>
                </article>
              ))}
            </div>
          </div>
          <BaseActionFeedbackPanel feedback={lastBaseActionFeedback} label="基地操作结果拆解" />
          {settlementPulse && (
            <div className={`base-settlement-pulse ${settlementPulse.tone}`} aria-label="基地日结脉冲">
              <div className="base-settlement-pulse-heading">
                <div>
                  <span>{settlementPulse.label}</span>
                  <strong>{settlementPulse.title}</strong>
                  <small>{settlementPulse.body}</small>
                </div>
                <small>{settlementPulse.nextHint}</small>
              </div>
              <div className="base-settlement-pulse-grid">
                {settlementPulse.items.map((item) => (
                  <article className={item.tone} key={item.id}>
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                    <small>{item.detail}</small>
                  </article>
                ))}
              </div>
            </div>
          )}
          {latestReturnPlan?.hasPlan && (
            <div className="overview-return-card" aria-label="基地归队承接">
              <div className="overview-return-heading">
                <span>归队承接</span>
                <strong>{latestReturnPlan.headline}</strong>
                <small>{latestReturnPlan.summary}</small>
              </div>
              <div className="overview-return-actions">
                {latestReturnPlan.actions.map((action) => (
                  <button className={action.tone} key={`overview-return-${action.id}`} type="button" onClick={() => onNavigate(action.targetView)}>
                    <span>{action.label}</span>
                    <strong>{action.text}</strong>
                  </button>
                ))}
                <button type="button" onClick={() => onNavigate("reports")}>
                  <span>查看战报</span>
                  <strong>打开完整过程回放和结算细节。</strong>
                </button>
              </div>
            </div>
          )}
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
        <div className="base-expedition-briefing" aria-label="基地出征支援简报">
          <div className="base-expedition-briefing-heading">
            <span>出征支援</span>
            <strong>{baseExpeditionSupport.headline}</strong>
            <small>{baseExpeditionSupport.summary}</small>
          </div>
          <div className="base-expedition-briefing-grid">
            {baseExpeditionSupport.items.map((item) => (
              <article className={item.tone} key={item.label}>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
                <small>{item.detail}</small>
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

function baseTaskShortUiLabel(phase: ReturnType<typeof baseCommandBriefing>["phase"]) {
  const labels: Record<ReturnType<typeof baseCommandBriefing>["phase"], string> = {
    build: "建设阶段",
    deploy: "出征阶段",
    recover: "恢复阶段",
    resolve: "结算阶段"
  };

  return labels[phase];
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

function buildBaseActionFeedback(
  before: PlaytestSession,
  after: PlaytestSession,
  title: string,
  scope: BaseActionFeedback["scope"]
): BaseActionFeedback {
  const roomResourceDelta = resourceBundleDelta(before.room.base.resources, after.room.base.resources);
  const accountResourceDelta = accountResourceDeltaText(before, after);
  const moraleDelta = after.room.base.morale - before.room.base.morale;
  const dangerDelta = after.room.base.danger - before.room.base.danger;
  const objectiveDelta = after.room.base.objective.repairedParts - before.room.base.objective.repairedParts;
  const survivorDelta = baseSurvivorDeltaText(before, after);
  const feedLine = after.room.feed[0]?.body ?? "操作已完成，等待下一步安排。";

  return {
    detail: feedLine,
    items: [
      {
        detail: accountResourceDelta !== "无变化" ? `个人资源：${accountResourceDelta}` : "房间库存与捐入、建设、治疗会在这里显示。",
        id: "resources",
        label: "资源变化",
        tone: hasNegativeResourceDelta(roomResourceDelta) || accountResourceDelta.includes("-") ? "warning" : hasPositiveResourceDelta(roomResourceDelta) ? "safe" : "warning",
        value: formatSignedResourceDelta(roomResourceDelta)
      },
      {
        detail: `士气 ${formatSignedNumber(moraleDelta)} / 危险 ${formatSignedNumber(dangerDelta)} / 目标 ${formatSignedNumber(objectiveDelta)}`,
        id: "base",
        label: "基地状态",
        tone: dangerDelta > 0 || moraleDelta < 0 ? "danger" : objectiveDelta > 0 || moraleDelta > 0 || dangerDelta < 0 ? "safe" : "warning",
        value: `第 ${after.room.base.day} 天`
      },
      {
        detail: survivorDelta.detail,
        id: "survivors",
        label: "幸存者状态",
        tone: survivorDelta.tone,
        value: survivorDelta.value
      },
      {
        detail: feedLine,
        id: "feed",
        label: "最新记录",
        tone: feedLine.includes("不足") || feedLine.includes("失败") ? "danger" : "safe",
        value: after.room.feed[0]?.title ?? title
      }
    ],
    scope,
    title
  };
}

function baseDaySettlementPulse(feedback: BaseActionFeedback | null, session: PlaytestSession) {
  if (!feedback || feedback.title !== "结束当天") {
    return null;
  }

  const resourceItem = feedback.items.find((item) => item.id === "resources");
  const baseItem = feedback.items.find((item) => item.id === "base");
  const survivorItem = feedback.items.find((item) => item.id === "survivors");
  const feedItem = feedback.items.find((item) => item.id === "feed");
  const dangerItem = feedback.items.find((item) => item.tone === "danger");
  const safeCount = feedback.items.filter((item) => item.tone === "safe").length;
  const tone = dangerItem ? "danger" : safeCount >= 2 ? "safe" : "warning";
  const objective = session.room.base.objective;

  return {
    body: feedItem?.detail.split("\n")[0] ?? feedback.detail.split("\n")[0],
    items: [
      resourceItem ?? {
        detail: "本日没有明确资源变化。",
        id: "resources",
        label: "资源",
        tone: "warning",
        value: "无变化"
      },
      baseItem ?? {
        detail: "基地状态保持稳定。",
        id: "base",
        label: "基地",
        tone: "warning",
        value: `第 ${session.room.base.day} 天`
      },
      survivorItem ?? {
        detail: "幸存者状态没有明显变化。",
        id: "survivors",
        label: "幸存者",
        tone: "warning",
        value: "无变化"
      }
    ],
    label: "日结脉冲",
    nextHint:
      objective.status === "won"
        ? "房间目标已经完成，可以查看战报并准备下一轮协作。"
        : objective.status === "lost"
          ? "目标已经失败，建议复盘资源、班次和设施路线。"
          : dangerItem
            ? "下一天优先补口粮、守卫或护理，先把基地风险压回可控。"
            : "基地还能继续运转，下一步可以安排建设、班次或远征。",
    title: `第 ${session.room.base.day} 天结算`,
    tone
  };
}

function accountResourceDeltaText(before: PlaytestSession, after: PlaytestSession) {
  const parts = [
    ...resourceKeys
      .map((key) => ({ label: resourceLabels[key], value: after.account.resources[key] - before.account.resources[key] }))
      .filter((item) => item.value !== 0),
    { label: "稀有零件", value: after.account.resources.rareParts - before.account.resources.rareParts },
    { label: "情报", value: after.account.resources.intel - before.account.resources.intel }
  ].filter((item) => item.value !== 0);

  return parts.length > 0 ? parts.map((item) => `${item.label} ${formatSignedNumber(item.value)}`).join(" / ") : "无变化";
}

function baseSurvivorDeltaText(before: PlaytestSession, after: PlaytestSession) {
  const beforeById = new Map(before.account.survivors.map((survivor) => [survivor.id, survivor]));
  const fatigueDelta = after.account.survivors.reduce((sum, survivor) => sum + survivor.fatigue - (beforeById.get(survivor.id)?.fatigue ?? survivor.fatigue), 0);
  const injuryDelta = after.account.survivors.reduce(
    (sum, survivor) => sum + survivor.injuries.length - (beforeById.get(survivor.id)?.injuries.length ?? survivor.injuries.length),
    0
  );
  const assignedDelta = after.room.baseAssignments.length - before.room.baseAssignments.length;

  return {
    detail: `疲劳合计 ${formatSignedNumber(fatigueDelta)} / 伤病 ${formatSignedNumber(injuryDelta)} / 留守班次 ${formatSignedNumber(assignedDelta)}`,
    tone: injuryDelta > 0 || fatigueDelta > 0 ? "warning" : injuryDelta < 0 || fatigueDelta < 0 || assignedDelta > 0 ? "safe" : "warning",
    value: assignedDelta !== 0 ? `班次 ${formatSignedNumber(assignedDelta)}` : fatigueDelta !== 0 ? `疲劳 ${formatSignedNumber(fatigueDelta)}` : "无变化"
  } satisfies Pick<BaseActionFeedback["items"][number], "detail" | "tone" | "value">;
}

function baseExpeditionSupportBriefing(dayPreview: ReturnType<typeof baseDayPreview>) {
  const recoveryReady = dayPreview.shiftCounts.care > 0;
  const guardReady = dayPreview.dangerRelief > 0 || dayPreview.shiftCounts.guard > 0;
  const routeReady = dayPreview.shiftCounts.forage + dayPreview.shiftCounts.repair > 0;
  const readyCount = [recoveryReady, guardReady, routeReady].filter(Boolean).length;

  return {
    headline:
      readyCount >= 3
        ? "留守支援已经成型，可以更大胆规划下一次出征。"
        : readyCount > 0
          ? "基地已有部分支援，补齐空缺后出征更稳。"
          : "还没有形成留守支援，下一次出征会更依赖随身补给。",
    items: [
      {
        detail: recoveryReady ? dayPreview.recoverySummary : "安排护理班，伤病和疲劳才会更快回到可出征状态。",
        label: "恢复线",
        tone: recoveryReady ? "ready" : "todo",
        value: recoveryReady ? `${dayPreview.shiftCounts.care} 个护理班` : "等待护理"
      },
      {
        detail: guardReady ? `${dayPreview.guardSummary}；明日危险 ${formatSignedNumber(dayPreview.dangerDelta)}。` : "安排守卫或建设瞭望塔、路障，降低基地暴露带来的连锁损失。",
        label: "防线",
        tone: guardReady ? "ready" : "urgent",
        value: guardReady ? `减压 ${dayPreview.dangerRelief}` : "没有防线"
      },
      {
        detail:
          routeReady
            ? `${dayPreview.forageSummary}；${dayPreview.repairSummary}`
            : "搜寻班补给、修理班推进目标，两者会决定下一次出征是否只是止损。",
        label: "路线准备",
        tone: routeReady ? "ready" : "todo",
        value: routeReady ? `搜寻 ${dayPreview.shiftCounts.forage} / 修理 ${dayPreview.shiftCounts.repair}` : "等待安排"
      }
    ],
    summary: `支援覆盖 ${readyCount}/3。先让基地稳定，再把人和补给投入远征。`
  };
}

type BaseOperationPriorityItem = {
  action: string;
  detail: string;
  id: string;
  label: string;
  title: string;
  tone: "safe" | "warning" | "danger";
  view: ViewKey;
};

function baseOperationPriorities({
  developmentPlan,
  recoveryPlan,
  session,
  supportBriefing
}: {
  developmentPlan: BaseDevelopmentPlan;
  recoveryPlan: BaseRecoveryPlan;
  session: PlaytestSession;
  supportBriefing: ReturnType<typeof baseExpeditionSupportBriefing>;
}): BaseOperationPriorityItem[] {
  const resources = session.room.base.resources;
  const foodWaterShortage = Math.max(0, 6 - resources.food) + Math.max(0, 6 - resources.water);
  const recommendedProject = developmentPlan.recommended[0] ?? null;
  const supportReady = supportBriefing.items.filter((item) => item.tone === "ready").length;
  const activeObjective = session.room.base.objective.status === "active";

  const items: BaseOperationPriorityItem[] = [
    {
      action: foodWaterShortage > 0 ? "去成员页安排搜寻或捐入补给" : "库存稳定，按计划分配补给",
      detail:
        foodWaterShortage > 0
          ? `食物 ${resources.food} / 水 ${resources.water}，明日消耗可能压住士气。`
          : `食物 ${resources.food} / 水 ${resources.water}，可以把材料投向建设或出征。`,
      id: "supply",
      label: "补给",
      title: foodWaterShortage > 0 ? "先补吃喝" : "库存能撑住",
      tone: foodWaterShortage >= 4 ? "danger" : foodWaterShortage > 0 ? "warning" : "safe",
      view: foodWaterShortage > 0 ? "members" : "overview"
    },
    {
      action: recoveryPlan.immediateTreatments > 0 ? "去幸存者页治疗" : recoveryPlan.careShifts > 0 ? "保留护理班" : "安排护理或轮换",
      detail:
        recoveryPlan.injuredCount > 0
          ? `${recoveryPlan.injuredCount} 人带伤，药品可立即处理 ${recoveryPlan.immediateTreatments} 人。`
          : recoveryPlan.recoveringCount > 0
            ? `${recoveryPlan.recoveringCount} 人在恢复，护理班会影响下一次出征人数。`
            : "当前没有明显伤病，可以把健康成员投入建设或出征。",
      id: "recovery",
      label: "伤病",
      title: recoveryPlan.injuredCount > 0 ? "先稳住队伍" : "队伍状态可用",
      tone: recoveryPlan.medicineShortage > 0 ? "danger" : recoveryPlan.injuredCount > 0 || recoveryPlan.recoveringCount > 0 ? "warning" : "safe",
      view: "survivors"
    },
    {
      action: recommendedProject
        ? recommendedProject.canAfford
          ? "去设施页推进"
          : `还缺 ${recommendedProject.materialDeficit} 材料`
        : "设施路线暂时稳定",
      detail: recommendedProject
        ? `${recommendedProject.name}：${recommendedProject.reason} ${recommendedProject.nextStep}`
        : "当前房间设施已经接近阶段上限，资源可转向出征和恢复。",
      id: "development",
      label: "建设",
      title: recommendedProject ? `${recommendedProject.name} ${recommendedProject.canAfford ? "可推进" : "缺材料"}` : "建设暂稳",
      tone: recommendedProject ? (recommendedProject.canAfford ? "safe" : "warning") : "safe",
      view: "facilities"
    },
    {
      action: supportReady >= 3 && activeObjective ? "去远征页准备出发" : "先补留守支援",
      detail: `${supportBriefing.summary} ${activeObjective ? "房间目标仍在进行中。" : "房间目标已经结算，先复盘战报。"}`,
      id: "expedition",
      label: "出征",
      title: supportReady >= 3 && activeObjective ? "可以准备下一趟" : "后勤还要补",
      tone: !activeObjective ? "warning" : supportReady >= 3 ? "safe" : supportReady > 0 ? "warning" : "danger",
      view: activeObjective ? "expedition" : "reports"
    }
  ];

  return items.sort((left, right) => operationPriorityScore(right) - operationPriorityScore(left));
}

function operationPriorityScore(item: BaseOperationPriorityItem) {
  const toneScore = {
    danger: 3,
    safe: 1,
    warning: 2
  };
  return toneScore[item.tone];
}

type SurvivorRoleBoardItem = {
  detail: string;
  id: string;
  label: string;
  tone: "ready" | "todo" | "urgent";
  value: string;
};

function baseWorkLabel(type: BaseWorkType | "idle") {
  return baseWorkOptions.find((option) => option.key === type)?.label ?? "休息";
}

function assignedWorkType(baseAssignments: PlaytestSession["room"]["baseAssignments"], survivorId: string): BaseWorkType | "idle" {
  return baseAssignments.find((assignment) => assignment.survivorId === survivorId)?.type ?? "idle";
}

function bestSurvivorBy(survivors: Survivor[], score: (survivor: Survivor) => number) {
  return survivors.reduce<Survivor | null>((best, survivor) => {
    const adjustedScore = score(survivor) - survivor.fatigue - survivor.injuries.length * 20;
    if (!best) {
      return survivor;
    }
    const bestScore = score(best) - best.fatigue - best.injuries.length * 20;
    return adjustedScore > bestScore ? survivor : best;
  }, null);
}

function survivorAssignmentDetail(
  survivor: Survivor | null,
  baseAssignments: PlaytestSession["room"]["baseAssignments"],
  expectedWork: BaseWorkType,
  reason: string
) {
  if (!survivor) {
    return "暂无可用人手，先治疗伤病或减少出征人数。";
  }

  const workType = assignedWorkType(baseAssignments, survivor.id);
  const workHint = workType === expectedWork ? `已在${baseWorkLabel(expectedWork)}班` : `当前${baseWorkLabel(workType)}，可转入${baseWorkLabel(expectedWork)}班`;
  return `${reason}；${workHint}；疲劳 ${survivor.fatigue} / 伤病 ${survivor.injuries.length}`;
}

function survivorRoleBoard(
  survivors: Survivor[],
  selectedIds: string[],
  baseAssignments: PlaytestSession["room"]["baseAssignments"]
) {
  const selectedSurvivors = survivors.filter((survivor) => selectedIds.includes(survivor.id));
  const selectedNames = selectedSurvivors.map((survivor) => survivor.name).join("、");
  const medic = bestSurvivorBy(survivors, (survivor) => survivor.attributes.medical * 2 + survivor.attributes.willpower);
  const mechanic = bestSurvivorBy(survivors, (survivor) => survivor.attributes.technical * 2 + survivor.attributes.luck);
  const guard = bestSurvivorBy(survivors, (survivor) => survivor.attributes.willpower + survivor.attributes.stamina + survivor.attributes.agility);

  const expeditionTone = selectedSurvivors.length >= 3 ? "ready" : selectedSurvivors.length > 0 ? "todo" : "urgent";
  const expeditionValue =
    selectedSurvivors.length >= 3
      ? `${selectedSurvivors.length} 人可出征`
      : selectedSurvivors.length > 0
        ? "还需补编"
        : "未选择";

  return {
    items: [
      {
        detail:
          selectedSurvivors.length >= 3
            ? `${selectedNames} 已形成基础小队，继续补一名医疗或技术位会更稳。`
            : selectedSurvivors.length > 0
              ? `${selectedNames} 已入队，建议补到三至五人再出发。`
              : "先从幸存者卡片右上角加入三名核心成员，再选择路线和补给。",
        id: "expedition",
        label: "出征核心",
        tone: expeditionTone,
        value: expeditionValue
      },
      {
        detail: survivorAssignmentDetail(
          medic,
          baseAssignments,
          "care",
          medic ? `${statLabels.medical} ${medic.attributes.medical}，适合压低伤病恢复时间` : ""
        ),
        id: "medical",
        label: "医疗护理",
        tone: medic && assignedWorkType(baseAssignments, medic.id) === "care" ? "ready" : "todo",
        value: medic?.name ?? "缺口"
      },
      {
        detail: survivorAssignmentDetail(
          mechanic,
          baseAssignments,
          "repair",
          mechanic ? `${statLabels.technical} ${mechanic.attributes.technical}，适合推进设施和房间目标` : ""
        ),
        id: "repair",
        label: "修理建设",
        tone: mechanic && assignedWorkType(baseAssignments, mechanic.id) === "repair" ? "ready" : "todo",
        value: mechanic?.name ?? "缺口"
      },
      {
        detail: survivorAssignmentDetail(
          guard,
          baseAssignments,
          "guard",
          guard ? `${statLabels.willpower} ${guard.attributes.willpower} / ${statLabels.stamina} ${guard.attributes.stamina}，适合守住危险度` : ""
        ),
        id: "guard",
        label: "守卫防线",
        tone: guard && assignedWorkType(baseAssignments, guard.id) === "guard" ? "ready" : "urgent",
        value: guard?.name ?? "缺口"
      }
    ] satisfies SurvivorRoleBoardItem[],
    summary:
      selectedSurvivors.length >= 3
        ? "出征核心已成型，基地岗位决定这轮能恢复多少、修多少、降多少危险。"
        : "先补齐出征核心，再把医疗、修理、守卫分到对应岗位。"
  };
}

function Survivors({
  accountSurvivors,
  accountTrainingRoomLevel,
  state,
  selectedIds,
  canTreat,
  baseAssignments,
  baseFeedback,
  recoveryPlan,
  shiftPlan,
  onToggle,
  onTreat,
  onWorkChange
}: {
  accountSurvivors: PlaytestSession["account"]["survivors"];
  accountTrainingRoomLevel: number;
  state: GameState;
  selectedIds: string[];
  canTreat: boolean;
  baseAssignments: PlaytestSession["room"]["baseAssignments"];
  baseFeedback: BaseActionFeedback | null;
  recoveryPlan: BaseRecoveryPlan;
  shiftPlan: BaseShiftPlan;
  onToggle: (id: string) => void;
  onTreat: (id: string) => void;
  onWorkChange: (id: string, type: BaseWorkType | "idle") => void;
}) {
  const growthPlan = survivorGrowthPlan(accountSurvivors);
  const roomTrainingLevel = state.facilities.find((facility) => facility.id === "training")?.level ?? 0;
  const expectedExpeditionXp = expeditionXpGain(30, roomTrainingLevel + Math.max(0, accountTrainingRoomLevel - 1));
  const expeditionGrowthPreview = survivorExpeditionGrowthPreview(accountSurvivors, selectedIds, expectedExpeditionXp);
  const roleBoard = survivorRoleBoard(state.survivors, selectedIds, baseAssignments);

  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">幸存者</p>
          <h2>幸存者档案</h2>
        </div>
        <span className="subtle-pill">已选 {selectedIds.length}/5</span>
      </div>
      <BaseActionFeedbackPanel feedback={baseFeedback} label="幸存者操作结果" />
      <div className="base-shift-plan" aria-label="基地班次预案">
        <div className="base-shift-plan-heading">
          <div>
            <span>基地班次预案</span>
            <strong>{shiftPlan.summary}</strong>
          </div>
          <small>先定今天的基地重心，再到幸存者卡片里分配岗位。</small>
        </div>
        <div className="base-shift-plan-grid">
          {shiftPlan.items.map((item) => (
            <article className={item.status} key={item.id}>
              <div>
                <span>{item.label}</span>
                <b>{item.assigned} 人</b>
              </div>
              <strong>{item.effect}</strong>
              <small>{item.detail}</small>
              <em>{item.nextAction}</em>
            </article>
          ))}
        </div>
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
      <div className="growth-plan-card" aria-label="幸存者培养队列">
        <div className="growth-plan-heading">
          <div>
            <span>培养队列</span>
            <strong>{growthPlan.summary}</strong>
          </div>
          <small>{growthPlan.hasAction ? "按顺序处理，下一次出征更稳。" : "当前队伍以轮换和带新人为主。"}</small>
        </div>
        <div className="growth-plan-grid">
          {growthPlan.items.map((item) => (
            <article className={`growth-plan-item ${item.priority}`} key={item.id}>
              <span>{item.label}</span>
              <strong>{item.name}</strong>
              <small>{item.detail}</small>
            </article>
          ))}
        </div>
      </div>
      <div className="expedition-growth-preview" aria-label="出征成长预期">
        <div className="expedition-growth-heading">
          <div>
            <span>出征成长预期</span>
            <strong>{expeditionGrowthPreview.summary}</strong>
          </div>
          <small>
            标准完整撤离预计 +{expeditionGrowthPreview.estimatedXp} 经验 / 训练室 Lv.{roomTrainingLevel} / 个人训练室 Lv.
            {accountTrainingRoomLevel}
          </small>
        </div>
        <div className="expedition-growth-grid">
          {expeditionGrowthPreview.items.map((item) => (
            <article className={item.tone} key={item.id}>
              <span>{item.label}</span>
              <strong>{item.name}</strong>
              <b>{item.value}</b>
              <small>{item.detail}</small>
            </article>
          ))}
        </div>
      </div>
      <div className="survivor-role-board" aria-label="幸存者定位建议">
        <div className="survivor-role-heading">
          <div>
            <span>编队定位</span>
            <strong>{roleBoard.summary}</strong>
          </div>
          <small>出征、护理、建设、守卫都从同一批幸存者里取舍。</small>
        </div>
        <div className="survivor-role-grid">
          {roleBoard.items.map((item) => (
            <article className={`survivor-role-item ${item.tone}`} key={item.id}>
              <span>{item.label}</span>
              <strong>{item.value}</strong>
              <small>{item.detail}</small>
            </article>
          ))}
        </div>
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
  const supportDiagnosis = expeditionSupportDiagnosis({
    account: accountSupport,
    facility: facilitySupport,
    prep: basePrepSupport
  });
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
  const routePhasePlan = expeditionRoutePhasePlan(selectedLocation, draft.risk, readiness, supportEffects);
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
  const departureDecisionItems = [
    {
      detail: launchChecklist.canDispatch ? "队伍、路线、补给和目标都已满足派遣条件。" : launchChecklist.summary,
      label: "出发判断",
      tone: launchChecklist.canDispatch ? "ready" : "blocked",
      value: launchChecklist.canDispatch ? "可以出发" : "暂缓出发"
    },
    {
      detail: `${routeBriefing.familyLabel} / 预计 ${routeBriefing.estimatedHours} 小时到撤离窗口`,
      label: "路线压力",
      tone: routeBriefing.pressureLabel === "高压" ? "blocked" : routeBriefing.pressureLabel === "紧张" ? "warning" : "ready",
      value: `${routeBriefing.pressureLabel} ${routeBriefing.pressure}%`
    },
    {
      detail: burdenSummary(carryBurden),
      label: "补给容错",
      tone: carryBurden.tier === "overloaded" ? "blocked" : carryBurden.tier === "heavy" ? "warning" : "ready",
      value: `${carryBurden.load}/${carryBurden.capacity} ${burdenLabel}`
    },
    {
      detail: yieldPreview.headline,
      label: "预期收益",
      tone: yieldPreview.items.some((item) => item.tone === "warning") ? "warning" : "ready",
      value: yieldPreview.items.find((item) => item.label === "基地目标")?.value ?? "待确认"
    }
  ];
  const onePageCommandItems = [
    {
      action: draft.squadIds.length < 3 ? "补齐编队" : !canAffordLoadout ? "调整补给" : "确认出发",
      detail:
        draft.squadIds.length < 3
          ? "手机端先点这里选择幸存者，凑够 3 人后再看补给。"
          : !canAffordLoadout
            ? "携带物资超过库存，先减少物资或回基地补给。"
            : "当前可直接派遣，出发后会在本页进入回合行动台。",
      id: "mobile-squad-command",
      label: "当前操作",
      targetId: draft.squadIds.length < 3 ? "prep-squad" : !canAffordLoadout ? "prep-loadout" : "prep-risk"
    },
    {
      action: "回合行动",
      detail: journey ? "事件、商店、营地和战斗动作都收拢在行动台第一屏。" : "派遣后本页会显示路线进度、当前节点和主要动作。",
      id: "mobile-journey-command",
      label: "出发以后",
      targetId: journey ? "journey-action-options" : "prep-route"
    },
    {
      action: "归队处理",
      detail: "结算后回到战报，再按提示处理伤病、设施和下一次出征。",
      id: "mobile-return-command",
      label: "回基地",
      targetId: "prep-doctrine"
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
        <div className="expedition-one-page-command" aria-label="手机端单页出征总控">
          <div className="expedition-one-page-heading">
            <span>单页出征</span>
            <strong>所有准备、行动和归队提示都在这一页完成。</strong>
          </div>
          <div className="expedition-one-page-grid">
            {onePageCommandItems.map((item) => (
              <button className="expedition-one-page-card" key={item.id} type="button" onClick={() => scrollToPrepStep(item.targetId)}>
                <span>{item.label}</span>
                <strong>{item.action}</strong>
                <small>{item.detail}</small>
              </button>
            ))}
          </div>
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
        <div className="location-choice-grid" aria-label="出征地点列表">
          {state.locations.map((location) => {
            const selected = draft.locationId === location.id;
            return (
              <button
                className={selected ? "location-choice-card selected" : "location-choice-card"}
                key={location.id}
                type="button"
                onClick={() => onLocationChange(location.id)}
              >
                <div className="location-choice-heading">
                  <div>
                    <span>{locationFamilyLabels[location.family]}</span>
                    <strong>{location.name}</strong>
                  </div>
                  <b>危险 {location.risk}</b>
                </div>
                <div className="location-choice-reward">
                  <span>主要收益</span>
                  <strong>{locationRewardSummary(location.reward)}</strong>
                </div>
                <div className="location-choice-stats">
                  {location.recommendedStats.map((stat) => (
                    <small key={`${location.id}-${stat}`}>{statLabels[stat]}</small>
                  ))}
                </div>
                <p>{location.dossier}</p>
                <div className="location-choice-tags">
                  {location.tags.slice(0, 3).map((tag) => (
                    <small key={`${location.id}-${tag}`}>{tag}</small>
                  ))}
                </div>
              </button>
            );
          })}
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
        <div className="route-phase-plan" aria-label="出征路线阶段计划">
          <div className="route-phase-heading">
            <span>路线阶段</span>
            <strong>{routePhasePlan.summary}</strong>
            <small>{routePhasePlan.hint}</small>
          </div>
          <div className="route-phase-grid">
            {routePhasePlan.phases.map((phase, index) => (
              <article className={phase.tone} key={phase.label}>
                <span>第 {index + 1} 段</span>
                <strong>{phase.label}</strong>
                <small>{phase.detail}</small>
              </article>
            ))}
          </div>
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
        <div className="support-diagnosis-card" aria-label="出征后勤诊断">
          <div className="support-diagnosis-heading">
            <div>
              <span>出征后勤诊断</span>
              <strong>{supportDiagnosis.readinessLabel}</strong>
              <small>{supportDiagnosis.summary}</small>
            </div>
            <b>{supportDiagnosis.weakestStageLabel}</b>
          </div>
          <div className="support-source-grid">
            {supportDiagnosis.sources.map((source) => (
              <article className={source.total > 0 ? "active" : "empty"} key={source.id}>
                <span>{source.label}</span>
                <strong>{source.total} 点</strong>
                <small>{source.detail}</small>
              </article>
            ))}
          </div>
          <p>{supportDiagnosis.focusHint}</p>
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
        <div className="departure-decision-card" aria-label="出发决策摘要">
          <div className="departure-decision-heading">
            <span>出发决策</span>
            <strong>{launchChecklist.canDispatch ? "这次远征已经具备开局条件。" : "先处理阻塞项，再让队伍出发。"}</strong>
          </div>
          <div className="departure-decision-grid">
            {departureDecisionItems.map((item) => (
              <article className={item.tone} key={item.label}>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
                <small>{item.detail}</small>
              </article>
            ))}
          </div>
        </div>
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
  const situationReport = journeySituationReport(journey);
  const actionGuide = journeyActionGuide(journey);
  const routeIntel = journeyRouteIntel(journey, routePace);
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
  const roundPlan = combatRoundPlan(journey);
  const lootPlan = journey.pendingCombatLoot ? combatLootPlan(journey) : null;
  const combatActionPreviews = journey.combat
    ? combatActionList.flatMap((action) => {
        const preview = combatActionPreview(journey, action, squad, readiness);
        if (!preview) {
          return [];
        }

        return [{ action, icon: combatActionIcon(action), preview }];
      })
    : [];
  const combatBriefing = journey.combat ? combatCommandBriefing(journey, combatActionPreviews.map((item) => item.preview)) : null;
  const counterActionLabels = combatActionPreviews
    .filter((item) => item.preview.counterTag === "Counter")
    .map((item) => item.preview.label)
    .join(" / ");
  const riskyActionLabels = combatActionPreviews
    .filter((item) => item.preview.counterTag === "Risk")
    .map((item) => item.preview.label)
    .join(" / ");
  const standardActionLabels = combatActionPreviews
    .filter((item) => item.preview.counterTag === "Standard")
    .map((item) => item.preview.label)
    .join(" / ");
  const recentDecisions = (journey.decisions ?? []).slice(-4).reverse();
  const latestCombatRound = journey.combatHistory[journey.combatHistory.length - 1] ?? null;
  const primaryCombatPreview = combatBriefing
    ? combatActionPreviews.find((item) => item.action === combatBriefing.primaryAction)?.preview ?? null
    : null;
  const combatDecisionChain =
    journey.combat && threatPreview
      ? [
          {
            detail: threatPreview.warning,
            label: "读意图",
            tone: threatPreview.incomingDamage >= journey.combat.squadHp ? "danger" : threatPreview.incomingDamage >= 10 ? "warning" : "safe",
            value: `${threatPreview.intentLabel} / 反击 ${threatPreview.incomingDamage}`
          },
          {
            detail: counterActionLabels ? `优先考虑 ${counterActionLabels}。` : "没有明确反制动作，保持队形或撤退更稳。",
            label: "选反制",
            tone: counterActionLabels ? "safe" : "warning",
            value: combatBriefing?.primaryLabel ?? roundPlan?.label ?? "观察"
          },
          {
            detail: primaryCombatPreview ? `${primaryCombatPreview.cost}；${primaryCombatPreview.risk}` : "先选择一个动作，系统会显示体力和风险。",
            label: "看代价",
            tone: primaryCombatPreview?.counterTag === "Risk" ? "danger" : primaryCombatPreview?.counterTag === "Counter" ? "safe" : "warning",
            value: primaryCombatPreview?.actorName ?? "待选择"
          },
          {
            detail: latestCombatRound ? latestCombatRound.enemyText : "本回合结算后会更新敌人意图、队伍体力、节奏和破势。",
            label: "看后果",
            tone: latestCombatRound ? (latestCombatRound.tone === "danger" ? "danger" : latestCombatRound.tone === "warning" ? "warning" : "safe") : "warning",
            value: latestCombatRound?.outcomeText ?? "等待行动"
          }
        ]
      : [];
  const counterLabels = segmentThreat.counterTactics
    .map((tacticId) => segmentTacticList.find((tactic) => tactic.id === tacticId)?.label ?? tacticId)
    .join(" / ");
  const mitigationLabel =
    segmentMitigation.value > 0
      ? `设施减压 ${segmentMitigation.pressure}%${segmentMitigation.fatigue > 0 ? ` / 疲劳 -${segmentMitigation.fatigue}` : ""}`
      : "暂无设施掩护";
  const commandActionItems = pendingRoad
    ? pendingRoad.choices.map((choice) => {
        const preview = roadEncounterChoicePreview(journey, choice);
        return {
          body: choice.text,
          detail: `${preview.costText} / ${preview.rewardText}`,
          id: `road-${choice.id}`,
          label: choice.label,
          onSelect: () => onJourneyAction(`road-${choice.id}` as JourneyAction),
          result: preview.outcomeLabel,
          tone: preview.tone
        };
      })
    : journey.pendingCombatLoot
      ? combatLootList.map((option) => {
          const outcome = combatLootOutcome(option, journey.support);
          return {
            body: option.text,
            detail: `${formatResourceDelta(outcome.reward)} / 疲${formatSignedNumber(outcome.fatigue)} / 压${formatSignedPercent(outcome.pressure)}`,
            id: `loot-${option.id}`,
            label: option.label,
            onSelect: () => onJourneyAction(`loot-${option.id}` as JourneyAction),
            result: "战利结算",
            tone: "safe"
          };
        })
      : journey.combat
        ? combatActionPreviews.map(({ action, preview }) => ({
            body: preview.actorName,
            detail: preview.effect,
            id: `combat-${action}`,
            label: preview.label,
            onSelect: () => onCombatAction(action),
            result: combatCounterTagLabel(preview.counterTag),
            tone: preview.counterTag.toLowerCase()
          }))
        : activeNode.type === "event"
          ? [
              {
                body: "放慢速度处理现场，适合补给紧张或压力偏高时使用。",
                detail: activeNode.careful?.successLog ?? "放慢速度，降低失误。",
                id: "careful",
                label: activeNode.careful?.label ?? "谨慎搜索",
                onSelect: () => onJourneyAction("careful"),
                result: "稳妥推进",
                tone: "safe"
              },
              {
                body: "更快通过当前节点，适合想抢时间但能承受风险时使用。",
                detail: activeNode.force?.fallbackLog ?? activeNode.force?.successLog ?? "更快通过，承担额外风险。",
                id: "force",
                label: activeNode.force?.label ?? "强行推进",
                onSelect: () => onJourneyAction("force"),
                result: "快速推进",
                tone: "warning"
              }
            ]
          : activeNode.type === "shop"
            ? [
                ...shopActionList.flatMap((action) => {
                  const offer = activeNode.shop?.offers[action];
                  if (!offer) {
                    return [];
                  }
                  const outcome = shopOfferOutcome(action, offer, journey.support);
                  return [
                    {
                      body: outcome.text,
                      detail: `随身 ${formatResourceDelta(outcome.fieldSupplyReward)} / 入库 ${formatResourceDelta(outcome.reward)} / 压力${formatSignedPercent(outcome.pressure)}`,
                      id: `shop-${action}`,
                      label: outcome.label,
                      onSelect: () => onJourneyAction(`shop-${action}` as JourneyAction),
                      result: outcome.objectiveBonus > 0 ? `目标 +${outcome.objectiveBonus}` : "补给交易",
                      tone: "safe"
                    }
                  ];
                }),
                {
                  body: "不交易，保留随身补给和筹码继续前进。",
                  detail: "不消耗，不补给。",
                  id: "skip",
                  label: "跳过交易",
                  onSelect: () => onJourneyAction("skip"),
                  result: "保留筹码",
                  tone: "standard"
                }
              ]
            : activeNode.type === "camp"
              ? campActionList.flatMap((action) => {
                  const option = activeNode.camp?.[action];
                  if (!option) {
                    return [];
                  }
                  const outcome = campOptionOutcome(action, option, journey.support);
                  return [
                    {
                      body: outcome.successLog,
                      detail: `疲${formatSignedNumber(outcome.fatigue)} / 饥${formatSignedNumber(outcome.hunger)} / 渴${formatSignedNumber(outcome.thirst)} / 压${formatSignedPercent(outcome.pressure)}`,
                      id: `camp-${action}`,
                      label: outcome.label,
                      onSelect: () => onJourneyAction(action),
                      result: outcome.objectiveBonus > 0 ? `目标 +${outcome.objectiveBonus}` : "营地恢复",
                      tone: "safe"
                    }
                  ];
                })
              : [
                  {
                    body: "带着已经获得的战利品返回基地。",
                    detail: extractionPreview.fieldSupplySummary,
                    id: "extract",
                    label: "撤离并结算",
                    onSelect: () => onJourneyAction("extract"),
                    result: "回基地",
                    tone: "safe"
                  }
                ];
  if (canReturnEarly) {
    commandActionItems.push({
      body: extractionPreview.canExtractNow ? "提前带回当前收益。" : "承受阻碍，强行脱离路线。",
      detail: `地点奖励 ${extractionPreview.options[0]?.rewardScalePercent ?? 0}%`,
      id: "return-early",
      label: returnEarlyLabel,
      onSelect: () => onJourneyAction("extract"),
      result: extractionPreview.canExtractNow ? "提前返程" : "紧急返程",
      tone: "danger"
    });
  }
  const currentActionQueue = commandActionItems;
  const mobilePrimaryActions = currentActionQueue.slice(0, 2);
  const resultBreakdown = journeyActionResultBreakdown(journey, latestActionResult, routePace);
  const actionPulse = journeyActionPulse(journey, latestActionResult, actionGuide.primaryAction, routePace);
  const scrollToJourneySection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const commandHudItems = [
    {
      detail: nodeTypeLabel,
      label: "当前",
      tone: pendingRoad || journey.combat ? "warning" : "safe",
      value: nodeTitle
    },
    {
      detail: routePace.etaLabel,
      label: "路线",
      tone: routePace.remainingStops <= 1 ? "safe" : "standard",
      value: `${routePace.progressPercent}%`
    },
    {
      detail: outlook.text,
      label: "队伍",
      tone: outlook.tone,
      value: outlook.label
    },
    {
      detail: nextCommandHint,
      label: "下一步",
      tone: actionGuide.tone,
      value: actionGuide.primaryAction
    }
  ];

  return (
    <div className="journey-panel">
      <section className={`journey-command-center ${actionGuide.tone}`} aria-label="远征行动台">
        <div className="journey-command-hud" aria-label="远征总控条">
          {commandHudItems.map((item) => (
            <article className={item.tone} key={item.label}>
              <span>{item.label}</span>
              <strong>{item.value}</strong>
              <small>{item.detail}</small>
            </article>
          ))}
        </div>
        <div className={`journey-action-guide ${actionGuide.tone}`} aria-label="出征行动指引">
          <div>
            <span>{actionGuide.label}</span>
            <strong>{actionGuide.title}</strong>
            <small>{actionGuide.body}</small>
          </div>
          <b>{actionGuide.primaryAction}</b>
        </div>
        <div className="journey-turn-summary" aria-label="本回合指挥摘要">
          <article>
            <span>当前阻碍</span>
            <strong>{routeIntel.blocker}</strong>
            <small>{routeIntel.blockerHint}</small>
          </article>
          <article>
            <span>推荐动作</span>
            <strong>{actionGuide.primaryAction}</strong>
            <small>{nextCommandHint}</small>
          </article>
          <article className={outlook.tone}>
            <span>队伍风险</span>
            <strong>{outlook.label}</strong>
            <small>{outlook.text}</small>
          </article>
          <article>
            <span>撤离收益</span>
            <strong>{extractionPreview.options[0]?.rewardSummary ?? extractionPreview.fieldSupplySummary}</strong>
            <small>{extractionPreview.canExtractNow ? "可以带回当前收益。" : "先解除阻碍再稳妥撤离。"}</small>
          </article>
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
          <div className="journey-mobile-intel" aria-label="手机端路线预告">
            <span>路线预告</span>
            <strong>{routeIntel.headline}</strong>
            <small>{routeIntel.body}</small>
          </div>
        </div>
        <div className={`journey-mobile-command-card ${actionGuide.tone}`} aria-label="手机端单页行动摘要">
          <div>
            <span>当前回合</span>
            <strong>{actionGuide.primaryAction}</strong>
            <small>{nextCommandHint}</small>
          </div>
          <div className="journey-mobile-command-actions" aria-label="手机端当前行动">
            {mobilePrimaryActions.map((item, index) => (
              <button className={item.tone} key={`mobile-command-${item.id}`} type="button" onClick={item.onSelect}>
                <span>{index + 1}</span>
                <strong>{item.label}</strong>
                <small>{item.result}：{item.detail}</small>
              </button>
            ))}
          </div>
          <div className="journey-mobile-command-links" aria-label="手机端页面跳转">
            <button type="button" onClick={() => scrollToJourneySection("journey-action-options")}>
              更多操作
            </button>
            <button type="button" onClick={() => scrollToJourneySection("journey-process")}>
              看过程
            </button>
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
        <div className="journey-route-intel" aria-label="路线预告">
          <article>
            <span>当前阻塞</span>
            <strong>{routeIntel.blocker}</strong>
            <small>{routeIntel.blockerHint}</small>
          </article>
          <article>
            <span>下一站</span>
            <strong>{routeIntel.nextStop}</strong>
            <small>{routeIntel.nextHint}</small>
          </article>
          <article>
            <span>余下路线</span>
            <strong>{routeIntel.remainingSummary}</strong>
            <small>{routeIntel.priorityHint}</small>
          </article>
        </div>
        <div className="journey-action-deck" id="journey-action-options" aria-label="手机端当前行动面板">
          <div className="journey-action-queue-heading">
            <span>本回合行动</span>
            <strong>直接选择下一步</strong>
            <small>每个选项都会推进旅途；先看结果和代价，再点动作。</small>
          </div>
          <div className="journey-action-queue-list">
            {currentActionQueue.map((item, index) => (
              <button className={item.tone} key={item.id} type="button" onClick={item.onSelect}>
                <b>{index + 1}</b>
                <div>
                  <span>{item.result}</span>
                  <strong>{item.label}</strong>
                  <small>{item.detail}</small>
                  <em>{item.body}</em>
                </div>
              </button>
            ))}
          </div>
        </div>
        <div className="journey-command-actions" aria-label="当前可执行操作">
          <div className="journey-command-dock-heading" aria-label="当前行动栏说明">
            <span>本回合可选</span>
            <strong>{actionGuide.primaryAction}</strong>
            <small>{nextCommandHint}</small>
          </div>
          {commandActionItems.map((item, index) => (
            <button className={`journey-command-button ${item.tone}`} key={`command-${item.id}`} type="button" onClick={item.onSelect}>
              <strong>
                <b>{index + 1}</b>
                {item.label}
              </strong>
              <span>{item.body}</span>
              <small>
                {item.result}：{item.detail}
              </small>
            </button>
          ))}
        </div>
        <div className="journey-command-result" aria-label="最近行动结果">
          <span>{journey.logs.length > 0 ? "最近结果" : "当前情况"}</span>
          <strong>{journey.logs.length > 0 ? latestActionResult.split("：")[0] : nodeTitle}</strong>
          <small>{latestActionResult}</small>
        </div>
        <div className={`journey-action-pulse ${actionPulse.tone}`} aria-label="出征行动脉冲">
          <div>
            <span>{actionPulse.label}</span>
            <strong>{actionPulse.title}</strong>
            <small>{actionPulse.body}</small>
          </div>
          <div>
            <span>主要后果</span>
            <strong>{actionPulse.impact}</strong>
            <small>{actionPulse.nextHint}</small>
          </div>
        </div>
        <div className="journey-result-breakdown" aria-label="行动结果拆解">
          {resultBreakdown.map((item) => (
            <article className={item.tone} key={item.id}>
              <span>{item.label}</span>
              <strong>{item.value}</strong>
              <small>{item.detail}</small>
            </article>
          ))}
        </div>
      </section>
      <div className="journey-detail-grid" id="journey-process" aria-label="远征详情">
      <div className="journey-situation-report" aria-label="出征局势报告">
        {situationReport.map((item) => (
          <article className={item.tone} key={item.id}>
            <span>{item.label}</span>
            <strong>{item.title}</strong>
            <b>{item.value}</b>
            <small>{item.body}</small>
          </article>
        ))}
      </div>
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
        <div className="journey-node-command-note" aria-label="当前节点操作提示">
          <span>操作入口</span>
          <strong>本节点动作已收拢到上方远征行动台。</strong>
          <small>这里保留过程、敌人意图、节点说明和最近日志，避免同一页出现两套可点击按钮。</small>
        </div>
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
            {lootPlan && (
              <div className="combat-loot-plan" aria-label="战后处置建议">
                <div className="combat-loot-plan-heading">
                  <span>处置建议</span>
                  <strong>{lootPlan.headline}</strong>
                  <small>{lootPlan.summary}</small>
                </div>
                <div className="combat-loot-plan-grid">
                  {lootPlan.items.map((item) => (
                    <article className={item.priority} key={`loot-plan-${item.id}`}>
                      <span>{item.priority === "recommended" ? "推荐" : item.priority === "risky" ? "高风险" : "可选"}</span>
                      <strong>{item.label}</strong>
                      <small>{item.value}</small>
                      <small>{item.detail}</small>
                    </article>
                  ))}
                </div>
              </div>
            )}
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
              {combatBriefing && (
                <div className={`combat-command-briefing ${combatBriefing.tone}`} aria-label="本回合战斗指挥">
                  <div className="combat-command-heading">
                    <span>战斗指挥</span>
                    <strong>{combatBriefing.headline}</strong>
                    <small>{combatBriefing.summary}</small>
                  </div>
                  <button type="button" onClick={() => onCombatAction(combatBriefing.primaryAction)}>
                    执行：{combatBriefing.primaryLabel}
                  </button>
                  <div className="combat-command-grid">
                    {combatBriefing.items.map((item) => (
                      <article className={item.tone} key={item.id}>
                        <span>{item.label}</span>
                        <strong>{item.value}</strong>
                        <small>{item.detail}</small>
                      </article>
                    ))}
                  </div>
                </div>
              )}
              {combatDecisionChain.length > 0 && (
                <div className="combat-decision-chain" aria-label="战斗决策链">
                  <div className="combat-decision-heading">
                    <span>决策链</span>
                    <strong>先读敌人，再决定反制，不要盲点动作。</strong>
                  </div>
                  <div className="combat-decision-grid">
                    {combatDecisionChain.map((item, index) => (
                      <article className={item.tone} key={item.label}>
                        <span>第 {index + 1} 步</span>
                        <strong>{item.label}：{item.value}</strong>
                        <small>{item.detail}</small>
                      </article>
                    ))}
                  </div>
                </div>
              )}
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
              {roundPlan && (
                <div className={`combat-mobile-plan ${roundPlan.tone}`} aria-label="本回合建议">
                  <span>本回合建议</span>
                  <strong>{roundPlan.label}</strong>
                  <small>{roundPlan.reason}</small>
                  <small>{roundPlan.riskText}</small>
                </div>
              )}
              <div className="combat-mobile-result">
                <span>{latestCombatRound ? `最近：${latestCombatRound.actionLabel}` : "还未交手"}</span>
                <strong>{latestCombatRound?.outcomeText ?? "选择一个动作开始本回合。"}</strong>
                <small>{latestCombatRound?.enemyText ?? "先看敌人意图，再决定攻击、防守、包扎或战术。"}</small>
              </div>
              <div className="combat-round-breakdown" aria-label="本回合战斗拆解">
                {combatRoundBreakdown(journey, latestCombatRound).map((item) => (
                  <article className={item.tone} key={item.id}>
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                    <small>{item.detail}</small>
                  </article>
                ))}
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
            <div className="combat-action-readout" aria-label="战斗动作判读">
              <article className="counter">
                <span>反制动作</span>
                <strong>{counterActionLabels || "暂无"}</strong>
                <small>{roundPlan ? `建议优先：${roundPlan.label}` : "先观察敌人意图，再决定本回合动作。"}</small>
              </article>
              <article className="risk">
                <span>高风险动作</span>
                <strong>{riskyActionLabels || threatPreview?.riskyLabels.join(" / ") || "暂无"}</strong>
                <small>{threatPreview?.warning ?? "当前没有明确禁手，但仍要留意压力和队伍血量。"}</small>
              </article>
              <article>
                <span>常规选择</span>
                <strong>{standardActionLabels || "暂无"}</strong>
                <small>常规动作更稳，但通常不会推进节奏和破势。</small>
              </article>
            </div>
            <div className="combat-action-grid">
              {combatActionPreviews.map(({ action, icon: Icon, preview }) => {
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

function expeditionRoutePhasePlan(location: GameState["locations"][number], risk: RiskStrategy, readiness: number, supportEffects: number) {
  const familyPlans: Record<
    LocationFamily,
    Array<{
      detail: string;
      label: string;
      tone: "safe" | "warning" | "danger";
    }>
  > = {
    resources: [
      { detail: "先确认水、燃料或材料的入口，避免一开局就把补给花空。", label: "探入口", tone: "safe" },
      { detail: "中段多半会遇到堵塞、巡游敌人或设备故障，技术和体能很关键。", label: "拆障碍", tone: "warning" },
      { detail: "营地和交易优先换回可带走的硬资源。", label: "装补给", tone: "safe" },
      { detail: "撤离时保住背包容量，别让超载把收益变成伤病。", label: "带回基地", tone: "warning" }
    ],
    urban: [
      { detail: "城区先读门禁、走廊和感染动线，医疗与意志决定容错。", label: "读楼层", tone: "warning" },
      { detail: "核心战斗会更硬，防守和包扎要留给敌人蓄力或游猎。", label: "压硬仗", tone: "danger" },
      { detail: "商店和幸存者线索更重要，情报可转成目标进度。", label: "换情报", tone: "safe" },
      { detail: "带药品回家前先评估伤痕，必要时提前返程。", label: "控伤病", tone: "warning" }
    ],
    weird: [
      { detail: "异常地点先确认规则，幸运、意志和抗感染会影响事件代价。", label: "试规则", tone: "warning" },
      { detail: "中段敌人意图更偏干扰，读对反制比硬打更划算。", label: "破异常", tone: "danger" },
      { detail: "营地侦察和电台支援会把怪线索变成目标进度。", label: "收线索", tone: "safe" },
      { detail: "撤离时优先保住已有线索，不贪最后一个奇怪奖励。", label: "断联系", tone: "warning" }
    ],
    wilds: [
      { detail: "野外先看天气、路况和背包重量，疲劳会比敌人更早杀伤队伍。", label: "看路况", tone: "warning" },
      { detail: "路上事件和营地选择决定续航，食物和水不能只靠运气。", label: "保续航", tone: "safe" },
      { detail: "野外战斗常在压力高时变坏，守卫和战术能稳住队形。", label: "稳队形", tone: "warning" },
      { detail: "撤离前整理战利品，优先带回能支撑设施发展的材料。", label: "整背包", tone: "safe" }
    ]
  };
  const highRisk = risk === "greedy" || location.risk >= 65 || readiness < 45;
  const lowSupport = supportEffects < 4;
  const summary = `${location.name} 是${locationFamilyLabels[location.family]}路线，${riskLabels[risk]}策略会影响中段压力。`;
  const hint = highRisk
    ? "这趟更像高压远征：先保命，再考虑贪收益。"
    : lowSupport
      ? "后勤支援还薄，路线中段要少犯错。"
      : "后勤支援能覆盖关键段落，可以更主动拿线索和战利。";

  return {
    hint,
    phases: familyPlans[location.family],
    summary
  };
}

function journeyRouteIntel(journey: JourneyState, pace: ReturnType<typeof routePaceFor>) {
  const safeIndex = Math.max(0, Math.min(journey.currentNodeIndex, Math.max(0, journey.nodes.length - 1)));
  const activeNode = journey.nodes[safeIndex];
  const nextNode = journey.nodes[safeIndex + 1] ?? null;
  const aheadNodes = journey.nodes.slice(safeIndex + 1);
  const counts = countJourneyNodeTypes(aheadNodes);
  const remainingSummary = summarizeRemainingRoute(counts, pace.remainingStops);
  const priorityHint = routePriorityHint(counts, pace.remainingStops);

  if (journey.pendingRoadEvent) {
    return {
      blocker: journey.pendingRoadEvent.title,
      blockerHint: "路上抉择会挡住队伍推进，先选一个处理方式。",
      body: `先处理${roadToneLabel(journey.pendingRoadEvent.tone)}，之后前往${pace.nextLabel}：${pace.nextTitle}。`,
      headline: `${roadToneLabel(journey.pendingRoadEvent.tone)}挡路`,
      nextHint: nextNode ? routeNodeHint(nextNode) : "处理完成后就能返程。",
      nextStop: pace.nextTitle,
      priorityHint,
      remainingSummary
    };
  }

  if (journey.combat) {
    return {
      blocker: `${journey.combat.enemyName} 第 ${journey.combat.round} 回合`,
      blockerHint: "先打完本回合，观察敌人意图再推进路线。",
      body: `战斗结束后会继续前往${pace.nextLabel}：${pace.nextTitle}。`,
      headline: "战斗中",
      nextHint: nextNode ? routeNodeHint(nextNode) : "胜利后可以撤离结算。",
      nextStop: pace.nextTitle,
      priorityHint,
      remainingSummary
    };
  }

  if (journey.pendingCombatLoot) {
    return {
      blocker: "战利品待分配",
      blockerHint: "先决定战斗收益要补给、医疗、情报还是规避风险。",
      body: `分配战利品后继续前往${pace.nextLabel}：${pace.nextTitle}。`,
      headline: "战后整理",
      nextHint: nextNode ? routeNodeHint(nextNode) : "拿稳收益后返程。",
      nextStop: pace.nextTitle,
      priorityHint,
      remainingSummary
    };
  }

  return {
    blocker: activeNode ? activeNode.title : "路线等待指令",
    blockerHint: activeNode ? routeNodeHint(activeNode) : "队伍正在等待下一步。",
    body: nextNode ? `下一站是${journeyNodeTypeLabel(nextNode.type)}：${nextNode.title}。` : "已经抵达撤离点，可以结算回基地。",
    headline: nextNode ? `下一站：${journeyNodeTypeLabel(nextNode.type)}` : "准备撤离",
    nextHint: nextNode ? routeNodeHint(nextNode) : "带回资源、线索和伤病结果。",
    nextStop: nextNode?.title ?? "返回基地",
    priorityHint,
    remainingSummary
  };
}

function journeyActionPulse(
  journey: JourneyState,
  latestActionResult: string,
  primaryAction: string,
  pace: ReturnType<typeof routePaceFor>
) {
  const delta = journey.lastActionDelta ?? null;
  const latestDecision = journey.decisions[journey.decisions.length - 1] ?? null;
  const latestCombat = journey.combatHistory[journey.combatHistory.length - 1] ?? null;
  const hasReward = delta ? hasPositiveResourceDelta(delta.rewardDelta) || hasPositiveResourceDelta(delta.fieldSupplyDelta) : false;
  const hasCost = delta
    ? hasNegativeResourceDelta(delta.fieldSupplyDelta) ||
      delta.pressureDelta > 0 ||
      delta.conditionDelta.fatigue > 0 ||
      delta.conditionDelta.hunger > 0 ||
      delta.conditionDelta.thirst > 0 ||
      delta.battleScarDelta > 0
    : false;
  const tone =
    delta && (delta.pressureDelta >= 10 || delta.battleScarDelta > 0 || journey.pressure >= 75)
      ? "danger"
      : delta && (hasCost || journey.pressure >= 50)
        ? "warning"
        : "safe";
  const title = latestCombat
    ? `${latestCombat.actionLabel}：${latestCombat.outcomeText}`
    : latestDecision
      ? `${latestDecision.label}：${latestDecision.impactText}`
      : latestActionResult.split("：")[0] || primaryAction;
  const impactParts = delta
    ? [
        delta.routeDelta !== 0 ? `路线 ${formatSignedNumber(delta.routeDelta)} 站` : "",
        delta.objectiveDelta !== 0 ? `目标 ${formatSignedNumber(delta.objectiveDelta)}` : "",
        delta.pressureDelta !== 0 ? `压力 ${formatSignedPercent(delta.pressureDelta)}` : "",
        hasReward ? `收获 ${formatSignedResourceDelta(delta.rewardDelta)}` : ""
      ].filter(Boolean)
    : [];
  const conditionParts = delta
    ? [
        delta.conditionDelta.fatigue !== 0 ? `疲劳 ${formatSignedNumber(delta.conditionDelta.fatigue)}` : "",
        delta.conditionDelta.hunger !== 0 ? `饥饿 ${formatSignedNumber(delta.conditionDelta.hunger)}` : "",
        delta.conditionDelta.thirst !== 0 ? `口渴 ${formatSignedNumber(delta.conditionDelta.thirst)}` : "",
        delta.battleScarDelta !== 0 ? `伤痕 ${formatSignedNumber(delta.battleScarDelta)}` : ""
      ].filter(Boolean)
    : [];

  return {
    body: delta ? delta.logLine : latestActionResult,
    impact: impactParts.length > 0 ? impactParts.join(" / ") : conditionParts.length > 0 ? conditionParts.join(" / ") : "局势稳定",
    label: delta ? "行动反馈" : "旅途状态",
    nextHint:
      pace.remainingStops <= 0
        ? "已经接近撤离窗口，确认收益后可以回基地结算。"
        : journey.combat
          ? "下一步仍在战斗中，优先处理敌人意图和队伍生命。"
          : journey.pendingCombatLoot
            ? "先处理战利品，再决定继续推进还是撤离。"
            : journey.pendingRoadEvent
              ? "路口仍未处理，选择路线策略后才能继续前进。"
              : hasCost
                ? "状态有消耗，下一步优先考虑营地、补给或稳妥推进。"
                : "节奏还稳，可以继续按当前计划推进。",
    title,
    tone
  };
}

function journeyActionResultBreakdown(journey: JourneyState, latestActionResult: string, pace: ReturnType<typeof routePaceFor>) {
  const delta = journey.lastActionDelta ?? null;
  const latestDecision = journey.decisions[journey.decisions.length - 1] ?? null;
  const latestTravel = journey.travelHistory[journey.travelHistory.length - 1] ?? null;
  const latestRoad = journey.roadEvents[journey.roadEvents.length - 1] ?? null;
  const latestCombat = journey.combatHistory[journey.combatHistory.length - 1] ?? null;
  const worstCondition = Math.max(journey.condition.fatigue, journey.condition.hunger, journey.condition.thirst);
  const pressureTone = journey.pressure >= 70 || worstCondition >= 75 ? "danger" : journey.pressure >= 45 || worstCondition >= 55 ? "warning" : "safe";
  const resourceDetail = latestDecision
    ? `${latestDecision.nodeTitle}：${latestDecision.impactText}`
    : latestCombat
      ? `${latestCombat.actionLabel}：${latestCombat.outcomeText}`
      : latestActionResult;
  const routeDetail = latestTravel
    ? `${latestTravel.title}，${latestTravel.conditionText}。${latestTravel.effects.slice(0, 3).join(" / ")}`
    : latestRoad
      ? `${latestRoad.title}：${latestRoad.outcome}`
      : `${pace.currentLabel} / ${pace.nextLabel}`;

  return [
    {
      detail: delta ? `本次战利 ${formatSignedResourceDelta(delta.rewardDelta)} / 随身 ${formatSignedResourceDelta(delta.fieldSupplyDelta)}` : resourceDetail,
      id: "reward",
      label: "资源变化",
      tone: delta && hasPositiveResourceDelta(delta.rewardDelta) ? "safe" : formatResourceDelta(journey.bonusReward) === "无" ? "warning" : "safe",
      value: delta ? formatSignedResourceDelta(delta.rewardDelta) : formatResourceDelta(journey.bonusReward)
    },
    {
      detail: delta
        ? `疲劳 ${formatSignedNumber(delta.conditionDelta.fatigue)} / 饥饿 ${formatSignedNumber(delta.conditionDelta.hunger)} / 口渴 ${formatSignedNumber(delta.conditionDelta.thirst)} / 战斗伤痕 ${formatSignedNumber(delta.battleScarDelta)}`
        : `疲劳 ${journey.condition.fatigue} / 饥饿 ${journey.condition.hunger} / 口渴 ${journey.condition.thirst} / 战斗伤痕 ${journey.battleScars}`,
      id: "condition",
      label: "队伍状态",
      tone: pressureTone,
      value: delta ? `距离 ${formatSignedNumber(delta.conditionDelta.distance)}` : worstCondition >= 70 ? "需要休整" : worstCondition >= 50 ? "状态吃紧" : "还能行动"
    },
    {
      detail: delta ? `路线 ${formatSignedNumber(delta.routeDelta)} 站 / 目标 ${formatSignedNumber(delta.objectiveDelta)}。${routeDetail}` : routeDetail,
      id: "route",
      label: "路线推进",
      tone: pace.remainingStops <= 0 ? "safe" : latestTravel?.tone ?? (latestRoad ? roadToneForResultBreakdown(latestRoad.tone) : "warning"),
      value: delta ? formatSignedNumber(delta.routeDelta) : `${pace.currentStop}/${pace.totalStops} 站`
    },
    {
      detail: delta ? delta.logLine : `随身补给：${formatResourceDelta(journey.fieldSupplies)}。${journey.pendingRoadEvent ? "路上抉择尚未处理。" : "当前没有路口阻塞。"}`,
      id: "risk",
      label: "风险变化",
      tone: delta && delta.pressureDelta <= 0 ? "safe" : pressureTone,
      value: delta ? `压力 ${formatSignedPercent(delta.pressureDelta)}` : `压力 ${journey.pressure}%`
    }
  ];
}

function annotateJourneyActionDelta(before: JourneyState, after: JourneyState) {
  after.lastActionDelta = buildJourneyActionDelta(before, after);
  return after;
}

function buildJourneyActionDelta(before: JourneyState, after: JourneyState) {
  return {
    battleScarDelta: after.battleScars - before.battleScars,
    conditionDelta: {
      distance: after.condition.distance - before.condition.distance,
      fatigue: after.condition.fatigue - before.condition.fatigue,
      hunger: after.condition.hunger - before.condition.hunger,
      thirst: after.condition.thirst - before.condition.thirst
    },
    fieldSupplyDelta: resourceBundleDelta(before.fieldSupplies, after.fieldSupplies),
    logLine: after.logs.slice(before.logs.length).at(-1) ?? after.logs.at(-1) ?? "本次行动没有新增日志。",
    objectiveDelta: after.objectiveBonus - before.objectiveBonus,
    pressureDelta: after.pressure - before.pressure,
    rewardDelta: resourceBundleDelta(before.bonusReward, after.bonusReward),
    routeDelta: after.currentNodeIndex - before.currentNodeIndex
  };
}

function resourceBundleDelta(before: ResourceBundle, after: ResourceBundle): ResourceBundle {
  return resourceKeys.reduce(
    (delta, key) => ({
      ...delta,
      [key]: after[key] - before[key]
    }),
    {
      ammo: 0,
      food: 0,
      fuel: 0,
      materials: 0,
      medicine: 0,
      water: 0
    }
  );
}

function formatSignedResourceDelta(resources: ResourceBundle) {
  const entries = resourceKeys.filter((key) => resources[key] !== 0);
  if (entries.length === 0) {
    return "无变化";
  }

  return entries.map((key) => `${resourceLabels[key]} ${formatSignedNumber(resources[key])}`).join(" / ");
}

function hasPositiveResourceDelta(resources: ResourceBundle) {
  return resourceKeys.some((key) => resources[key] > 0);
}

function hasNegativeResourceDelta(resources: ResourceBundle) {
  return resourceKeys.some((key) => resources[key] < 0);
}

function roadToneForResultBreakdown(tone: "find" | "hazard" | "road") {
  if (tone === "find") {
    return "safe";
  }

  if (tone === "hazard") {
    return "danger";
  }

  return "warning";
}

function countJourneyNodeTypes(nodes: JourneyNode[]) {
  return nodes.reduce(
    (counts, node) => ({
      ...counts,
      [node.type]: counts[node.type] + 1
    }),
    {
      camp: 0,
      combat: 0,
      event: 0,
      extraction: 0,
      shop: 0
    } satisfies Record<JourneyNode["type"], number>
  );
}

function summarizeRemainingRoute(counts: Record<JourneyNode["type"], number>, remainingStops: number) {
  if (remainingStops <= 0) {
    return "可以撤离";
  }

  const parts = [
    counts.combat > 0 ? `战斗 ${counts.combat}` : "",
    counts.shop > 0 ? `商店 ${counts.shop}` : "",
    counts.camp > 0 ? `营地 ${counts.camp}` : "",
    counts.event > 0 ? `事件 ${counts.event}` : ""
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(" / ") : `还剩 ${remainingStops} 站`;
}

function routePriorityHint(counts: Record<JourneyNode["type"], number>, remainingStops: number) {
  if (remainingStops <= 0) {
    return "现在的重点是安全结算，把资源带回基地。";
  }

  if (counts.combat > 0) {
    return "前方仍有战斗，优先保留弹药、医疗和队伍体力。";
  }

  if (counts.shop > 0) {
    return "前方有商店，保留一点随身补给可以换回更多收益。";
  }

  if (counts.camp > 0) {
    return "前方有营地，可以用休整或侦察降低后续压力。";
  }

  return "前方多为事件节点，控制压力比贪收益更重要。";
}

function routeNodeHint(node: JourneyNode) {
  const hints: Record<JourneyNode["type"], string> = {
    camp: "营地可以休整、烹饪或侦察，适合修正状态。",
    combat: "战斗会消耗体力和医疗，留意敌人意图。",
    event: "事件通常在稳妥收益和冒险推进之间取舍。",
    extraction: "撤离会把战利品、线索和伤病结算回基地。",
    shop: "商店能把随身补给转换成资源、情报或服务。"
  };
  return hints[node.type];
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

function combatRoundBreakdown(journey: JourneyState, record: JourneyCombatRoundRecord | null) {
  if (!journey.combat || !record) {
    return [
      {
        detail: "先观察敌人意图，再从上方远征行动台选择本回合动作。",
        id: "pending",
        label: "等待行动",
        tone: "warning",
        value: journey.combat ? journey.combat.intentLabel : "无战斗"
      }
    ];
  }

  const delta = journey.lastActionDelta;
  return [
    {
      detail: record.outcomeText,
      id: "actor",
      label: "我方动作",
      tone: record.tone,
      value: `${record.actorName} / ${record.actionLabel}`
    },
    {
      detail: record.enemyText,
      id: "enemy",
      label: "敌人反应",
      tone: delta && delta.conditionDelta.fatigue + delta.battleScarDelta > 0 ? "danger" : record.tone,
      value: journey.combat.intentLabel
    },
    {
      detail: record.counterText,
      id: "counter",
      label: "反制判定",
      tone: record.counterText.includes("反制") || record.counterText.includes("破势") ? "safe" : "warning",
      value: record.counterText.includes("节奏") ? "节奏变化" : "判定结果"
    },
    {
      detail: delta
        ? `压力 ${formatSignedPercent(delta.pressureDelta)} / 疲劳 ${formatSignedNumber(delta.conditionDelta.fatigue)} / 战斗伤痕 ${formatSignedNumber(delta.battleScarDelta)}`
        : "本回合还没有可比对的前后变化。",
      id: "delta",
      label: "状态变化",
      tone: delta && (delta.pressureDelta > 0 || delta.conditionDelta.fatigue > 0 || delta.battleScarDelta > 0) ? "warning" : "safe",
      value: delta ? `距离 ${formatSignedNumber(delta.conditionDelta.distance)}` : "无变化"
    }
  ];
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
  const returnPulse = latestReport ? summarizeFeedReturnPulse(latestReport) : null;
  const primaryReturnAction = baseReturnPlan?.primaryAction ?? null;
  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">战报</p>
          <h2>战报与动态流</h2>
        </div>
        {latestReportId && <span className="subtle-pill">刚完成一轮远征</span>}
      </div>
      <ReportReturnPulse onNavigate={onNavigate} pulse={returnPulse} />
      {latestReportId && (
        <div className="report-next-actions" aria-label="战报下一步">
          <div>
            <span>下一步</span>
            <strong>{primaryReturnAction ? `优先：${primaryReturnAction.label}` : "远征已经归队，继续处理基地循环。"}</strong>
            {primaryReturnAction && <small>{primaryReturnAction.text}</small>}
          </div>
          {primaryReturnAction && (
            <button className={primaryReturnAction.tone} type="button" onClick={() => onNavigate(primaryReturnAction.targetView)}>
              {primaryReturnAction.label}
            </button>
          )}
          <button type="button" onClick={() => onNavigate("overview")}>
            回基地总览
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
              <ReportExpeditionDebrief item={item} />
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

function ReportReturnPulse({ onNavigate, pulse }: { onNavigate: (view: ViewKey) => void; pulse: FeedReturnPulse | null }) {
  if (!pulse?.hasPulse) {
    return null;
  }

  const nextAction = pulse.nextAction;

  return (
    <div className={`report-return-pulse ${pulse.tone}`} aria-label="归队复盘脉冲">
      <div className="report-return-pulse-heading">
        <span>归队脉冲</span>
        <strong>{pulse.headline}</strong>
        <small>{pulse.summary}</small>
      </div>
      <div className="report-return-pulse-grid">
        {pulse.items.map((item) => (
          <button className={`report-return-pulse-item ${item.tone}`} key={item.id} type="button" onClick={() => onNavigate(item.targetView)}>
            <span>{item.label}</span>
            <strong>{item.value}</strong>
            <small>{item.detail}</small>
          </button>
        ))}
      </div>
      {nextAction && (
        <button className={`report-return-pulse-primary ${nextAction.tone}`} type="button" onClick={() => onNavigate(nextAction.targetView)}>
          优先处理：{nextAction.label}
        </button>
      )}
    </div>
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

function ReportExpeditionDebrief({ item }: { item: FeedItem }) {
  const debrief = summarizeFeedExpeditionDebrief(item);
  if (!debrief.hasDebrief) {
    return null;
  }

  return (
    <div className="report-expedition-debrief" aria-label="下一轮远征建议">
      <div className="report-expedition-debrief-heading">
        <span>复盘建议</span>
        <strong>{debrief.headline}</strong>
        <small>{debrief.summary}</small>
      </div>
      <div className="report-expedition-debrief-grid">
        {debrief.advice.map((advice) => (
          <article className={advice.tone} key={`${item.id}-debrief-${advice.id}`}>
            <span>{advice.label}</span>
            <strong>{advice.text}</strong>
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
  baseFeedback,
  developmentPlan,
  developmentBriefing,
  developmentRoute,
  onUpgrade
}: {
  state: GameState;
  baseFeedback: BaseActionFeedback | null;
  developmentPlan: BaseDevelopmentPlan;
  developmentBriefing: ReturnType<typeof baseDevelopmentBriefing>;
  developmentRoute: BaseDevelopmentRoute;
  onUpgrade: (id: string) => void;
}) {
  return (
    <section className="panel">
      <p className="eyebrow">设施</p>
      <h2>基地发展</h2>
      <BaseActionFeedbackPanel feedback={baseFeedback} label="设施操作结果" />
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
        <div className="development-briefing-grid" aria-label="基地发展作战简报">
          {developmentBriefing.map((item) => (
            <article className={item.tone} key={item.id}>
              <span>{item.label}</span>
              <strong>{item.title}</strong>
              <b>{item.value}</b>
              <small>{item.body}</small>
            </article>
          ))}
        </div>
        <div className="development-route-board" aria-label="基地建设路线板">
          <div className="development-route-heading">
            <div>
              <span>建设路线</span>
              <strong>{developmentRoute.summary}</strong>
            </div>
            <small>
              可推进 {developmentRoute.readyCount} / 受阻 {developmentRoute.blockedCount} / 材料缺口 {developmentRoute.materialGap}
            </small>
          </div>
          <div className="development-route-steps">
            {developmentRoute.steps.map((step) => (
              <article className={step.status} key={step.id}>
                <span>{step.label}</span>
                <strong>{step.title}</strong>
                <small>{step.detail}</small>
                <p>{step.impact}</p>
                <em>{step.nextAction}</em>
              </article>
            ))}
          </div>
        </div>
        <div className="development-queue-board" aria-label="建设队列总览">
          {developmentPlan.recommended.length ? (
            developmentPlan.recommended.map((project, index) => (
              <article className={project.canAfford ? "ready" : "blocked"} key={`queue-${project.id}`}>
                <span>第 {index + 1} 项</span>
                <strong>{project.name}</strong>
                <small>{project.canAfford ? "材料已备齐，可以立即推进。" : `材料缺口 ${project.materialDeficit}，先补材料再推进。`}</small>
                <div>
                  <b>{facilityProjectActionLabel(project.action)}到 Lv.{project.nextLevel}</b>
                  <em>{project.expeditionStage}</em>
                </div>
                <p>{project.nextStep}</p>
              </article>
            ))
          ) : (
            <article className="ready">
              <span>队列完成</span>
              <strong>设施已到当前上限</strong>
              <small>可以把资源转向远征、恢复和个人基地成长。</small>
            </article>
          )}
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
              <div className="development-expedition-stage" aria-label="出征接入点">
                <span>出征接入</span>
                <strong>{project.expeditionStage}</strong>
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
          const doctrineUnlock = expeditionDoctrineForFacility(facility.id);
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
              {doctrineUnlock && (
                <div className={`facility-doctrine-unlock ${built ? "ready" : "locked"}`} aria-label="设施出征方针解锁">
                  <span>{built ? "已解锁出征方针" : "建造后解锁"}</span>
                  <strong>{doctrineUnlock.label}</strong>
                  <small>{doctrineUnlock.effect}</small>
                </div>
              )}
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
  contributionPlan,
  currentUserId,
  player,
  players,
  launchBriefing,
  memberSummaries,
  playtestReadiness,
  pulse,
  roomSlug,
  summary,
  copyStatus,
  onCopyRoomLink,
  onCreateRoom,
  onNavigate,
  onRenamePlayer
}: {
  contributionPlan: ReturnType<typeof roomContributionPlan>;
  currentUserId: string;
  launchBriefing: ReturnType<typeof roomLaunchBriefing>;
  player: RoomPlayer;
  players: RoomPlayer[];
  memberSummaries: RoomMemberSummary[];
  playtestReadiness: ReturnType<typeof roomPlaytestReadiness>;
  pulse: RoomCooperationPulse;
  roomSlug: string;
  summary: RoomCooperationSummary;
  copyStatus: "idle" | "copied" | "failed";
  onCopyRoomLink: () => void;
  onCreateRoom: () => void;
  onNavigate: (view: ViewKey) => void;
  onRenamePlayer: (name: string) => void;
}) {
  const currentMember = memberSummaries.find((member) => member.userId === currentUserId);
  const currentAction = currentMember ? roomMemberPrimaryAction(currentMember) : null;
  const membersWithContributions = memberSummaries.filter((member) => member.contributionCount > 0);
  const membersWithSquad = memberSummaries.filter((member) => member.assignedCount > 0);
  const membersWithShifts = memberSummaries.filter((member) => member.baseShiftText !== "未安排");
  const cooperationLanes = [
    {
      empty: "还没人捐入资源，先补共享库存。",
      members: membersWithContributions,
      metric: (member: RoomMemberSummary) => member.contributionText,
      title: "捐入补给"
    },
    {
      empty: "还没人加入远征编队，先派 1 名幸存者。",
      members: membersWithSquad,
      metric: (member: RoomMemberSummary) => `${member.assignedCount} 名`,
      title: "出征编队"
    },
    {
      empty: "还没人安排基地班次，日结会空转。",
      members: membersWithShifts,
      metric: (member: RoomMemberSummary) => member.baseShiftText,
      title: "留守班次"
    }
  ];
  const ownershipBoundaries = [
    {
      detail: "幸存者等级、专长、疲劳恢复、个人基地房间和个人库存跟随账号。",
      label: "账号保留",
      value: "长期成长"
    },
    {
      detail: "共享基地资源、房间设施、目标进度、成员捐入和班次属于当前房间。",
      label: "房间共享",
      value: "共同建设"
    },
    {
      detail: "路线选择、战斗伤痕、战利品和战报会在结算后回填账号与房间。",
      label: "单次远征",
      value: "结算回流"
    }
  ];
  const roomActionLadder = playtestReadiness.items.map((item, index) => ({
    ...item,
    index: index + 1,
    targetView: roomReadinessItemTargetView(item.id)
  }));
  const launchTarget = roomReadinessItemTargetView(launchBriefing.primaryItemId);
  const cooperationRequests = roomCooperationRequests(playtestReadiness, contributionPlan, summary);

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

      <div className={`room-launch-briefing ${launchBriefing.tone}`} aria-label="多人开局指挥">
        <div className="room-launch-heading">
          <div>
            <span>多人开局指挥</span>
            <strong>{launchBriefing.headline}</strong>
            <small>{launchBriefing.summary}</small>
          </div>
          <button type="button" onClick={() => onNavigate(launchTarget)}>
            {launchBriefing.primaryLabel}
          </button>
        </div>
        <div className="room-launch-grid">
          {launchBriefing.items.map((item) => (
            <button className={item.status} key={item.id} type="button" onClick={() => onNavigate(roomReadinessItemTargetView(item.id))}>
              <span>{item.label}</span>
              <strong>{item.value}</strong>
              <small>{item.detail}</small>
            </button>
          ))}
        </div>
      </div>

      <div className={`room-cooperation-pulse ${pulse.tone}`} aria-label="好友房间协作脉冲">
        <div className="room-cooperation-pulse-heading">
          <div>
            <span>协作脉冲</span>
            <strong>{pulse.headline}</strong>
            <small>{pulse.summary}</small>
          </div>
          <small>{pulse.nextAction}</small>
        </div>
        <div className="room-cooperation-pulse-grid">
          {pulse.items.map((item) => (
            <article className={item.status} key={item.id}>
              <span>{item.label}</span>
              <strong>{item.value}</strong>
              <small>{item.detail}</small>
            </article>
          ))}
        </div>
      </div>

      <div className="room-request-board" aria-label="房间协作请求板">
        <div className="room-request-heading">
          <span>协作请求</span>
          <strong>{cooperationRequests.headline}</strong>
          <small>{cooperationRequests.summary}</small>
        </div>
        <div className="room-request-grid">
          {cooperationRequests.items.map((request) => (
            <button className={request.tone} key={request.id} type="button" onClick={() => onNavigate(request.targetView)}>
              <span>{request.label}</span>
              <strong>{request.title}</strong>
              <small>{request.detail}</small>
            </button>
          ))}
        </div>
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

      <div className="room-action-ladder" aria-label="房间行动链">
        <div className="room-action-ladder-heading">
          <span>房间行动链</span>
          <strong>{playtestReadiness.nextAction}</strong>
          <small>按顺序补齐邀请、捐入、编队、班次和出征，房间就能进入稳定试玩。</small>
        </div>
        <div className="room-action-ladder-grid">
          {roomActionLadder.map((item) => (
            <button className={item.status} key={item.id} type="button" onClick={() => onNavigate(item.targetView)}>
              <span>第 {item.index} 步</span>
              <strong>{item.label}</strong>
              <small>{item.detail}</small>
            </button>
          ))}
        </div>
      </div>

      <div className="ownership-boundary-card" aria-label="账号房间边界">
        <div className="ownership-boundary-heading">
          <span>数据归属</span>
          <strong>账号保留成长，房间共享基地，对局远征结算回流。</strong>
        </div>
        <div className="ownership-boundary-grid">
          {ownershipBoundaries.map((item) => (
            <article key={item.label}>
              <span>{item.label}</span>
              <strong>{item.value}</strong>
              <small>{item.detail}</small>
            </article>
          ))}
        </div>
      </div>

      <div className={`room-playtest-readiness ${playtestReadiness.status}`} aria-label="多人试玩开局检查">
        <div className="room-playtest-readiness-heading">
          <div>
            <span>开局检查</span>
            <strong>{playtestReadiness.headline}</strong>
            <small>{playtestReadiness.summary}</small>
          </div>
          <button type="button" onClick={() => onNavigate(roomReadinessTargetView(playtestReadiness))}>
            处理下一步
          </button>
        </div>
        <div className="room-playtest-check-grid">
          {playtestReadiness.items.map((item) => (
            <article className={item.status} key={item.id}>
              <span>{item.status === "ready" ? "就绪" : item.status === "blocked" ? "阻塞" : "待办"}</span>
              <strong>{item.label}</strong>
              <small>{item.detail}</small>
            </article>
          ))}
        </div>
        <small className="room-playtest-next">{playtestReadiness.nextAction}</small>
      </div>

      <div className="room-duty-board" aria-label="房间协作分工板">
        {cooperationLanes.map((lane) => (
          <article key={lane.title}>
            <span>{lane.title}</span>
            <strong>{lane.members.length > 0 ? `已覆盖 ${lane.members.length} 人` : "等待认领"}</strong>
            <div>
              {lane.members.length > 0 ? (
                lane.members.map((member) => (
                  <small key={`${lane.title}-${member.userId}`}>
                    {member.displayName}：{lane.metric(member)}
                  </small>
                ))
              ) : (
                <small>{lane.empty}</small>
              )}
            </div>
          </article>
        ))}
      </div>

      <div className="room-contribution-plan" aria-label="房间捐入优先级">
        <div className="room-contribution-heading">
          <div>
            <span>捐入优先级</span>
            <strong>{contributionPlan.summary}</strong>
          </div>
          <button type="button" onClick={() => onNavigate("overview")}>
            去捐入
          </button>
        </div>
        <div className="room-contribution-grid">
          {contributionPlan.items.map((item) => (
            <article className={item.priority} key={item.key}>
              <span>{item.priority === "urgent" ? "紧急" : item.priority === "ready" ? "储备" : "待办"}</span>
              <strong>
                {item.label} {item.target}
              </strong>
              <small>{item.detail}</small>
            </article>
          ))}
        </div>
      </div>

      {currentMember && currentAction && (
        <div className={`your-room-task ${currentMember.collaborationStatus}`} aria-label="你的协作任务">
          <div>
            <span>你的协作任务</span>
            <strong>{currentAction.title}</strong>
            <small>{currentMember.collaborationHint}</small>
          </div>
          <button type="button" onClick={() => onNavigate(currentAction.view)}>
            {currentAction.label}
          </button>
        </div>
      )}

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
              <small className={`member-collaboration-hint ${member.collaborationStatus}`}>协作建议：{member.collaborationHint}</small>
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

function roomMemberPrimaryAction(member: RoomMemberSummary): { label: string; title: string; view: ViewKey } {
  if (member.collaborationStatus === "urgent") {
    return { label: "去捐入", title: "先补共享基地库存", view: "overview" };
  }

  if (member.assignedCount === 0) {
    return { label: "去编队", title: "派一名幸存者加入远征", view: "survivors" };
  }

  if (member.baseShiftText === "未安排") {
    return { label: "安排班次", title: "让留守幸存者处理基地工作", view: "survivors" };
  }

  return { label: "准备远征", title: "你的协作项已覆盖", view: "expedition" };
}

function roomCooperationRequests(
  readiness: ReturnType<typeof roomPlaytestReadiness>,
  contributionPlan: ReturnType<typeof roomContributionPlan>,
  summary: RoomCooperationSummary
) {
  const items = readiness.items
    .filter((item) => item.status !== "ready")
    .slice(0, 4)
    .map((item) => {
      const targetView = roomReadinessItemTargetView(item.id);
      const urgentContribution = item.id === "contribution" ? contributionPlan.items.find((plan) => plan.priority === "urgent") : null;
      const detail = urgentContribution ? `${urgentContribution.label}：${urgentContribution.detail}` : item.detail;
      const titleById: Record<typeof item.id, string> = {
        contribution: "请队友先补共享库存",
        expedition: "等缺口补齐后一起开局",
        invite: "把房间链接发给朋友",
        shifts: "请空闲队友认领留守班次",
        squad: "请队友派幸存者入队"
      };

      return {
        detail,
        id: item.id,
        label: item.status === "blocked" ? "优先请求" : "协作请求",
        targetView,
        title: titleById[item.id],
        tone: item.status === "blocked" ? "urgent" : "todo"
      };
    });

  if (items.length === 0) {
    items.push({
      detail: "共享库存、编队、班次和出征条件都已覆盖，可以进入远征准备。",
      id: "expedition",
      label: "准备完成",
      targetView: "expedition" as ViewKey,
      title: "邀请大家确认本次路线",
      tone: "ready"
    });
  }

  return {
    headline:
      readiness.status === "ready"
        ? "没有关键缺口，可以协调出征。"
        : readiness.status === "blocked"
          ? "先把阻塞项发给队友处理。"
          : "还有几项协作请求可以分出去。",
    items,
    summary: `当前成员 ${summary.memberCount} 人，房间检查 ${readiness.readyCount}/${readiness.items.length} 项就绪。`
  };
}

function roomReadinessTargetView(readiness: ReturnType<typeof roomPlaytestReadiness>): ViewKey {
  const nextItem = readiness.items.find((item) => item.status === "blocked") ?? readiness.items.find((item) => item.status === "todo");
  if (!nextItem) {
    return "expedition";
  }

  return roomReadinessItemTargetView(nextItem.id);
}

function roomReadinessItemTargetView(itemId: ReturnType<typeof roomPlaytestReadiness>["items"][number]["id"]): ViewKey {
  const targets: Record<typeof itemId, ViewKey> = {
    contribution: "overview",
    expedition: "expedition",
    invite: "members",
    shifts: "survivors",
    squad: "survivors"
  };

  return targets[itemId];
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
      <div className="release-readiness-card" aria-label="发布准入检查">
        <div className="release-readiness-heading">
          <span>发布准入</span>
          <strong>{playableSmoke.ok ? "本地试玩闭环已通过，仍需按发布预检执行。" : "试玩闭环未通过，不允许发布。"}</strong>
          <small>默认不要频繁发布；不要用线上部署当测试工具。</small>
        </div>
        <div className="release-readiness-grid">
          {releaseReadinessSteps.map((step) => (
            <article key={step.label}>
              <span>{step.label}</span>
              <strong>{step.command}</strong>
              <small>{step.detail}</small>
            </article>
          ))}
        </div>
      </div>
      <div className="release-batch-card" aria-label="发布批次判定">
        <div className="release-batch-heading">
          <span>发布批次</span>
          <strong>先本地累积，形成完整试玩切片后再发布。</strong>
          <small>每次发布前先判断这批改动是否真的让玩家多体验了一段完整流程。</small>
        </div>
        <div className="release-batch-grid">
          {releaseBatchPolicy.map((item) => (
            <article key={item.label}>
              <span>{item.status}</span>
              <strong>{item.label}</strong>
              <small>{item.detail}</small>
            </article>
          ))}
        </div>
      </div>
      <div className="browser-smoke-card" aria-label="浏览器冒烟清单">
        <div className="browser-smoke-heading">
          <span>浏览器冒烟</span>
          <strong>本地先走完整路径，线上只做验收。</strong>
          <small>覆盖桌面、手机、出征、战斗、结算和数据库降级。</small>
        </div>
        <div className="browser-smoke-grid">
          {browserSmokeChecklist.map((item) => (
            <article key={item.label}>
              <span>{item.label}</span>
              <strong>{item.target}</strong>
              <small>{item.detail}</small>
            </article>
          ))}
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
    "facility-doctrine": "设施方针",
    "facility-stage": "出征接入",
    "facility-upgraded": "设施升级",
    "logistics-diagnosis": "后勤诊断",
    "journey-choice-preview": "路途选择",
    "member-guidance": "成员建议",
    "player-cooperation-task": "个人协作",
    "survivor-growth-plan": "培养队列",
    "survivor-treated": "伤病治疗",
    "squad-assigned": "出征编队",
    "multiplayer-cooperation": "多人协作",
    "room-playtest-readiness": "开局检查",
    "room-contribution-plan": "捐入优先",
    "combat-turn-plan": "战斗建议",
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

function locationRewardSummary(resources: ResourceBundle) {
  const entries = [...resourceKeys]
    .filter((key) => resources[key] > 0)
    .sort((left, right) => resources[right] - resources[left] || resourceKeys.indexOf(left) - resourceKeys.indexOf(right))
    .slice(0, 3);

  return entries.length > 0 ? entries.map((key) => `${resourceLabels[key]} +${resources[key]}`).join(" / ") : "以路线线索为主";
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
