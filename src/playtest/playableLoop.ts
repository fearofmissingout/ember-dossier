import type { FeedItem } from "../game/types";
import { createCombatForNode, createJourney, resolveCombatRound, type JourneyCombatRoundRecord } from "./journey";
import {
  applyContribution,
  assignSurvivorToRoom,
  baseTaskList,
  resolvePlaytestExpedition,
  roomCooperationSummary,
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
  | "survivor-treated"
  | "squad-assigned"
  | "multiplayer-cooperation"
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
  cooperation: RoomCooperationSummary;
  facilityFeedTitle: string;
  reportDigest: {
    ledger: FeedReturnLedger;
    settlement: FeedReportSettlement;
  };
  treatmentFeedTitle: string;
};

export function runPlayableLoopSmoke(): PlayableLoopSmoke {
  let session = createStarterSession("smoke-user", "Smoke Player", "local-playable-loop");
  const userId = session.account.profile.userId;
  const guestUserId = "smoke-guest";
  const squad = session.account.survivors.slice(0, 3);
  const baseTasksBefore = baseTaskList(session);

  session.room.base.resources.materials = Math.max(session.room.base.resources.materials, 20);
  const beforeWorkshopLevel = session.room.base.facilities.find((facility) => facility.id === "workshop")?.level ?? 0;
  session = upgradeFacility(session, userId, "workshop");
  const afterWorkshopLevel = session.room.base.facilities.find((facility) => facility.id === "workshop")?.level ?? 0;
  const facilityFeedTitle = session.room.feed[0]?.title ?? "";

  const treatmentTargetId = session.account.survivors[4].id;
  session.account.survivors[4].injuries = ["烟尘擦伤"];
  session.account.survivors[4].fatigue = 48;
  session.room.base.resources.medicine = Math.max(session.room.base.resources.medicine, 2);
  session = treatSurvivor(session, userId, treatmentTargetId);
  const treatedSurvivor = session.account.survivors.find((survivor) => survivor.id === treatmentTargetId);
  const treatmentFeedTitle = session.room.feed[0]?.title ?? "";

  session.room.members.push({
    displayName: "Smoke Guest",
    joinedAt: "2026-06-08T08:00:00.000Z",
    lastSeenAt: "2026-06-08T08:15:00.000Z",
    role: "member",
    userId: guestUserId
  });
  session = applyContribution(session, userId, { ammo: 0, food: 2, fuel: 0, materials: 0, medicine: 0, water: 1 });
  session.room.contributions.push({
    createdAt: "2026-06-08T08:18:00.000Z",
    id: "smoke-guest-contribution",
    resources: { ammo: 0, food: 0, fuel: 0, materials: 4, medicine: 1, water: 0 },
    roomId: session.room.id,
    userId: guestUserId
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
      squadIds: squad.map((survivor) => survivor.id)
    },
    "water-plant",
    60
  );
  const combatJourney = {
    ...journey,
    combat: createCombatForNode(journey.nodes[1], squad, 60, journey.support),
    currentNodeIndex: 1
  };
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
      detail: treatmentFeedTitle,
      id: "survivor-treated",
      ok: Boolean(treatedSurvivor && treatedSurvivor.injuries.length === 0 && treatedSurvivor.fatigue < 48)
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
    cooperation,
    checkpoints,
    facilityFeedTitle,
    nextBaseTasks,
    ok: checkpoints.every((checkpoint) => checkpoint.ok),
    reportDigest: {
      ledger,
      settlement
    },
    treatmentFeedTitle
  };
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
