import type { FeedItem } from "../game/types";
import { createCombatForNode, createJourney, resolveCombatRound, type JourneyCombatRoundRecord } from "./journey";
import { assignSurvivorToRoom, baseTaskList, resolvePlaytestExpedition, setBaseAssignment, type BaseTaskList } from "./sim";
import { createStarterSession } from "./state";
import { summarizeFeedReportSettlement, summarizeFeedReturnLedger, type FeedReportSettlement, type FeedReturnLedger } from "./reports";

export type PlayableLoopCheckpointId =
  | "base-command"
  | "squad-assigned"
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
  reportDigest: {
    ledger: FeedReturnLedger;
    settlement: FeedReportSettlement;
  };
};

export function runPlayableLoopSmoke(): PlayableLoopSmoke {
  let session = createStarterSession("smoke-user", "Smoke Player", "local-playable-loop");
  const userId = session.account.profile.userId;
  const squad = session.account.survivors.slice(0, 3);
  const baseTasksBefore = baseTaskList(session);

  session = setBaseAssignment(session, userId, squad[0].id, "guard");
  session = setBaseAssignment(session, userId, squad[1].id, "repair");

  for (const survivor of squad) {
    session = assignSurvivorToRoom(session, userId, survivor.id);
  }

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
      detail: `${squad.length} 名幸存者加入房间编队`,
      id: "squad-assigned",
      ok: session.room.assignedSurvivors.filter((assignment) => assignment.userId === userId).length === squad.length
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
    checkpoints,
    nextBaseTasks,
    ok: checkpoints.every((checkpoint) => checkpoint.ok),
    reportDigest: {
      ledger,
      settlement
    }
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
