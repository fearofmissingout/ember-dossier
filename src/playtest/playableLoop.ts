import type { FeedItem } from "../game/types";
import {
  campOptionOutcome,
  createCombatForNode,
  createJourney,
  combatRoundPlan,
  resolveCombatRound,
  shopOfferOutcome,
  type JourneyCombatRoundPlan,
  type JourneyCombatRoundRecord
} from "./journey";
import { expeditionDoctrineForFacility, expeditionSupportDiagnosis, supportFromAccountBase, supportFromFacilities, survivorGrowthPlan } from "./progression";
import {
  applyContribution,
  assignSurvivorToRoom,
  baseDevelopmentPlan,
  baseTaskList,
  resolvePlaytestExpedition,
  roomCooperationSummary,
  roomContributionPlan,
  roomMemberSummaries,
  setBaseAssignment,
  treatSurvivor,
  upgradeFacility,
  type BaseTaskList,
  type RoomCooperationSummary
} from "./sim";
import { createStarterSession } from "./state";
import { summarizeFeedReportSettlement, summarizeFeedReturnLedger, type FeedReportSettlement, type FeedReturnLedger } from "./reports";

export type PlayableLoopCheckpointId =
  | "base-command"
  | "facility-upgraded"
  | "facility-doctrine"
  | "facility-stage"
  | "logistics-diagnosis"
  | "survivor-treated"
  | "survivor-growth-plan"
  | "squad-assigned"
  | "multiplayer-cooperation"
  | "room-contribution-plan"
  | "player-cooperation-task"
  | "member-guidance"
  | "journey-choice-preview"
  | "combat-turn-plan"
  | "combat-round"
  | "expedition-settled"
  | "report-readable"
  | "next-base-action";

export type PlayableLoopCheckpoint = {
  detail: string;
  id: PlayableLoopCheckpointId;
  ok: boolean;
};

export type PlayableLoopSmoke = {
  checkpoints: PlayableLoopCheckpoint[];
  nextBaseTasks: BaseTaskList;
  ok: boolean;
  combatRound: JourneyCombatRoundRecord | null;
  combatTurnPlan: JourneyCombatRoundPlan | null;
  cooperation: RoomCooperationSummary;
  doctrineDetail: string;
  facilityStageDetail: string;
  facilityFeedTitle: string;
  logisticsDiagnosisDetail: string;
  journeyChoiceDetail: string;
  memberGuidanceDetail: string;
  roomContributionPlanDetail: string;
  reportDigest: {
    ledger: FeedReturnLedger;
    settlement: FeedReportSettlement;
  };
  treatmentFeedTitle: string;
  survivorGrowthPlanDetail: string;
};

export function runPlayableLoopSmoke(): PlayableLoopSmoke {
  let session = createStarterSession("smoke-user", "Smoke Player", "local-playable-loop");
  const userId = session.account.profile.userId;
  const guestUserId = "smoke-guest";
  const squad = session.account.survivors.slice(0, 3);
  const baseTasksBefore = baseTaskList(session);

  session.room.base.resources.materials = Math.max(session.room.base.resources.materials, 20);
  const developmentPlan = baseDevelopmentPlan(session);
  const facilityStageDetail = developmentPlan.recommended.map((project) => `${project.name}：${project.expeditionStage}`).join(" / ");
  const beforeWorkshopLevel = session.room.base.facilities.find((facility) => facility.id === "workshop")?.level ?? 0;
  session = upgradeFacility(session, userId, "workshop");
  const afterWorkshopLevel = session.room.base.facilities.find((facility) => facility.id === "workshop")?.level ?? 0;
  const workshopDoctrine = expeditionDoctrineForFacility("workshop");
  const doctrineDetail = workshopDoctrine ? `${workshopDoctrine.label}：${workshopDoctrine.effect}` : "工坊没有出征方针";
  const facilityFeedTitle = session.room.feed[0]?.title ?? "";
  const logisticsDiagnosis = expeditionSupportDiagnosis({
    account: supportFromAccountBase(session.account.base),
    facility: supportFromFacilities(session.room.base.facilities, "salvage-rig"),
    prep: supportFromFacilities([])
  });
  const logisticsDiagnosisDetail = `${logisticsDiagnosis.readinessLabel}：${logisticsDiagnosis.summary} / ${logisticsDiagnosis.weakestStageLabel}`;

  const treatmentTargetId = session.account.survivors[4].id;
  session.account.survivors[4].injuries = ["烟尘擦伤"];
  session.account.survivors[4].fatigue = 48;
  session.room.base.resources.medicine = Math.max(session.room.base.resources.medicine, 2);
  session = treatSurvivor(session, userId, treatmentTargetId);
  const treatedSurvivor = session.account.survivors.find((survivor) => survivor.id === treatmentTargetId);
  const treatmentFeedTitle = session.room.feed[0]?.title ?? "";
  session.account.survivors[0].xp = 18;
  const growthPlan = survivorGrowthPlan(session.account.survivors);
  const survivorGrowthPlanDetail = `${growthPlan.summary} / ${growthPlan.items.map((item) => `${item.name}:${item.label}`).join(" / ")}`;

  session.room.members.push({
    displayName: "Smoke Guest",
    joinedAt: "2026-06-08T08:00:00.000Z",
    lastSeenAt: "2026-06-08T08:15:00.000Z",
    role: "member",
    userId: guestUserId
  });
  session.room.members.push({
    displayName: "Smoke Helper",
    joinedAt: "2026-06-08T08:10:00.000Z",
    lastSeenAt: "2026-06-08T08:16:00.000Z",
    role: "member",
    userId: "smoke-helper"
  });
  session = applyContribution(session, userId, { ammo: 0, food: 2, fuel: 0, materials: 0, medicine: 0, water: 1 });
  session.room.contributions.push({
    createdAt: "2026-06-08T08:18:00.000Z",
    id: "smoke-guest-contribution",
    resources: { ammo: 0, food: 0, fuel: 0, materials: 4, medicine: 1, water: 0 },
    roomId: session.room.id,
    userId: guestUserId
  });
  session.room.contributions.push({
    createdAt: "2026-06-08T08:19:00.000Z",
    id: "smoke-helper-contribution",
    resources: { ammo: 0, food: 1, fuel: 0, materials: 1, medicine: 0, water: 1 },
    roomId: session.room.id,
    userId: "smoke-helper"
  });
  session.room.assignedSurvivors.push({
    assignedAt: "2026-06-08T08:20:00.000Z",
    roomId: session.room.id,
    survivorId: "guest-scout",
    userId: guestUserId
  });
  session.room.baseAssignments.push({
    roomId: session.room.id,
    survivorId: "guest-guard",
    type: "guard",
    userId: guestUserId
  });

  session = setBaseAssignment(session, userId, squad[0].id, "guard");
  session = setBaseAssignment(session, userId, squad[1].id, "repair");

  for (const survivor of squad) {
    session = assignSurvivorToRoom(session, userId, survivor.id);
  }
  const cooperation = roomCooperationSummary(session);
  const contributionPlan = roomContributionPlan(session);
  const roomContributionPlanDetail = contributionPlan.summary;
  const memberGuidance = roomMemberSummaries(session);
  const currentMemberGuidance = memberGuidance.find((member) => member.userId === userId);
  const memberGuidanceDetail = memberGuidance.map((member) => `${member.displayName}：${member.collaborationHint}`).join(" / ");

  const journey = createJourney(
    session,
    {
      loadout: {
        ammo: 1,
        food: 1,
        fuel: 1,
        materials: 0,
        medicine: 1,
        water: 1
      },
      risk: "cautious",
      squadIds: squad.map((survivor) => survivor.id),
      support: supportFromFacilities(session.room.base.facilities)
    },
    "water-plant",
    60
  );
  const campNode = journey.nodes.find((node) => node.type === "camp");
  const shopNode = journey.nodes.find((node) => node.type === "shop");
  const campPreview = campNode?.camp?.scout ? campOptionOutcome("scout", campNode.camp.scout, journey.support) : null;
  const shopPreview = shopNode?.shop?.offers.service ? shopOfferOutcome("service", shopNode.shop.offers.service, journey.support) : null;
  const journeyChoiceDetail = [
    campPreview ? `营地：压力 ${formatSignedPercent(campPreview.pressure)}${campPreview.objectiveBonus > 0 ? `，目标 +${campPreview.objectiveBonus}` : ""}` : "",
    shopPreview ? `商店：压力 ${formatSignedPercent(shopPreview.pressure)}${shopPreview.supportText ? `，${shopPreview.supportText}` : ""}` : ""
  ]
    .filter(Boolean)
    .join(" / ");
  const combatJourney = {
    ...journey,
    combat: createCombatForNode(journey.nodes[1], squad, 60, journey.support),
    currentNodeIndex: 1
  };
  if (combatJourney.combat) {
    combatJourney.combat.intent = "windup";
    combatJourney.combat.intentLabel = "蓄力";
    combatJourney.combat.intentText = "重击正在积蓄。防守可以反制。";
  }
  const combatTurnPlan = combatRoundPlan(combatJourney);
  const foughtJourney = resolveCombatRound(combatJourney, "guard", squad, 60);
  const combatRound = foughtJourney.combatHistory[foughtJourney.combatHistory.length - 1] ?? null;

  const expedition = resolvePlaytestExpedition(session, {
    extractionStatus: "complete",
    loadout: {
      ammo: 1,
      food: 1,
      fuel: 1,
      materials: 0,
      medicine: 1,
      water: 1
    },
    locationId: "water-plant",
    randomRolls: [0.12, 0.18, 0.21, 0.34],
    risk: "cautious",
    routeObjectiveBonus: 1,
    survivorIds: squad.map((survivor) => survivor.id),
    travelFatigue: 8,
    userId
  });

  const report = expedition.session.room.feed[0] as FeedItem | undefined;
  const settlement = report ? summarizeFeedReportSettlement(report) : summarizeFeedReportSettlement(createMissingReport());
  const ledger = report ? summarizeFeedReturnLedger(report) : summarizeFeedReturnLedger(createMissingReport());
  const nextBaseTasks = baseTaskList(expedition.session);
  const checkpoints: PlayableLoopCheckpoint[] = [
    {
      detail: baseTasksBefore.summary,
      id: "base-command",
      ok: baseTasksBefore.items.length > 0
    },
    {
      detail: facilityFeedTitle,
      id: "facility-upgraded",
      ok: afterWorkshopLevel > beforeWorkshopLevel
    },
    {
      detail: doctrineDetail,
      id: "facility-doctrine",
      ok: Boolean(workshopDoctrine && workshopDoctrine.id === "salvage-rig" && afterWorkshopLevel > 0)
    },
    {
      detail: facilityStageDetail,
      id: "facility-stage",
      ok:
        developmentPlan.recommended.length > 0 &&
        developmentPlan.recommended.every((project) => project.expeditionStage.length > 0) &&
        facilityStageDetail.includes("战斗医疗")
    },
    {
      detail: logisticsDiagnosisDetail,
      id: "logistics-diagnosis",
      ok:
        logisticsDiagnosis.sources.length === 3 &&
        logisticsDiagnosis.summary.includes("后勤诊断") &&
        logisticsDiagnosis.sources.some((source) => source.label === "房间设施") &&
        logisticsDiagnosis.sources.some((source) => source.label === "个人基地") &&
        logisticsDiagnosis.focusHint.length > 0
    },
    {
      detail: treatmentFeedTitle,
      id: "survivor-treated",
      ok: Boolean(treatedSurvivor && treatedSurvivor.injuries.length === 0 && treatedSurvivor.fatigue < 48)
    },
    {
      detail: survivorGrowthPlanDetail,
      id: "survivor-growth-plan",
      ok: growthPlan.items.length > 0 && growthPlan.items.some((item) => item.label === "接近升级")
    },
    {
      detail: `${squad.length} 名幸存者加入房间编队`,
      id: "squad-assigned",
      ok: session.room.assignedSurvivors.filter((assignment) => assignment.userId === userId).length === squad.length
    },
    {
      detail: cooperation.actionHint,
      id: "multiplayer-cooperation",
      ok:
        cooperation.memberCount >= 2 &&
        cooperation.contributionCount >= 2 &&
        cooperation.assignedSurvivors >= squad.length + 1 &&
        cooperation.baseShifts >= 3 &&
        cooperation.gaps.length > 0
    },
    {
      detail: roomContributionPlanDetail,
      id: "room-contribution-plan",
      ok: contributionPlan.items.length > 0 && contributionPlan.summary.includes("捐入优先级")
    },
    {
      detail: currentMemberGuidance ? `${currentMemberGuidance.displayName}：${currentMemberGuidance.collaborationHint}` : "未找到当前玩家协作任务",
      id: "player-cooperation-task",
      ok: Boolean(currentMemberGuidance && currentMemberGuidance.collaborationStatus === "ready" && currentMemberGuidance.collaborationHint.includes("都已覆盖"))
    },
    {
      detail: memberGuidanceDetail,
      id: "member-guidance",
      ok: memberGuidance.some((member) => member.collaborationStatus === "ready") && memberGuidance.some((member) => member.collaborationHint.includes("派 1 名幸存者"))
    },
    {
      detail: journeyChoiceDetail,
      id: "journey-choice-preview",
      ok: Boolean(campPreview && shopPreview && journeyChoiceDetail.includes("压力") && journeyChoiceDetail.includes("商店支援"))
    },
    {
      detail: combatTurnPlan ? `${combatTurnPlan.label}：${combatTurnPlan.reason}` : "未生成回合建议",
      id: "combat-turn-plan",
      ok: Boolean(combatTurnPlan && combatTurnPlan.action === "guard" && combatTurnPlan.reason.includes("推荐 防守"))
    },
    {
      detail: combatRound ? `${combatRound.actionLabel}：${combatRound.outcomeText}` : "未记录回合战斗",
      id: "combat-round",
      ok: Boolean(combatRound && foughtJourney.combatHistory.length > 0 && foughtJourney.logs.length > journey.logs.length)
    },
    {
      detail: expedition.report.outcome,
      id: "expedition-settled",
      ok: Boolean(report && report.kind === "report" && expedition.session.room.base.objective.repairedParts > session.room.base.objective.repairedParts)
    },
    {
      detail: settlement.summary,
      id: "report-readable",
      ok: settlement.hasSettlement && ledger.hasLedger
    },
    {
      detail: nextBaseTasks.summary,
      id: "next-base-action",
      ok: nextBaseTasks.items.length > 0
    }
  ];

  return {
    combatRound,
    combatTurnPlan,
    cooperation,
    checkpoints,
    doctrineDetail,
    facilityStageDetail,
    facilityFeedTitle,
    journeyChoiceDetail,
    logisticsDiagnosisDetail,
    memberGuidanceDetail,
    roomContributionPlanDetail,
    nextBaseTasks,
    ok: checkpoints.every((checkpoint) => checkpoint.ok),
    reportDigest: {
      ledger,
      settlement
    },
    treatmentFeedTitle,
    survivorGrowthPlanDetail
  };
}

function formatSignedPercent(value: number) {
  return `${value >= 0 ? "+" : ""}${value}%`;
}

function createMissingReport(): FeedItem {
  return {
    body: "",
    id: "missing-report",
    kind: "system",
    timestamp: "",
    title: ""
  };
}
