import { resolveExpedition } from "../game/sim";
import type { ExpeditionReport, ExpeditionRequest, ResourceBundle, ResourceKey } from "../game/types";
import { emptyLoadout, roomToGameState } from "./state";
import type { BaseWorkType, PlaytestSession } from "./types";

type PlaytestExpeditionRequest = Omit<ExpeditionRequest, "squadIds"> & {
  journeyLogs?: string[];
  survivorIds: string[];
  userId: string;
};

export function applyContribution(session: PlaytestSession, userId: string, resources: ResourceBundle): PlaytestSession {
  const next = clone(session);
  ensureUser(next, userId);

  for (const key of resourceKeys) {
    const amount = Math.max(0, Math.floor(resources[key]));
    if (amount > next.account.resources[key]) {
      throw new Error(`Not enough ${key} to contribute.`);
    }

    next.account.resources[key] -= amount;
    next.room.base.resources[key] += amount;
  }

  next.room.contributions.unshift({
    createdAt: new Date().toISOString(),
    id: `contribution-${Date.now()}`,
    resources: { ...emptyLoadout(), ...resources },
    roomId: next.room.id,
    userId
  });
  next.room.feed.unshift({
    body: `${actorName(next, userId)} moved supplies from their account stash into the shared base: ${formatResources(resources)}.`,
    id: `feed-contribution-${Date.now()}`,
    kind: "member",
    timestamp: "Just now",
    title: "Base supplies contributed"
  });

  refreshUiState(next);
  return next;
}

export function assignSurvivorToRoom(session: PlaytestSession, userId: string, survivorId: string): PlaytestSession {
  const next = clone(session);
  ensureUser(next, userId);

  const survivor = next.account.survivors.find((candidate) => candidate.id === survivorId);
  if (!survivor) {
    throw new Error(`Unknown survivor: ${survivorId}`);
  }

  survivor.status = "assigned";

  if (!next.room.assignedSurvivors.some((assignment) => assignment.userId === userId && assignment.survivorId === survivorId)) {
    next.room.assignedSurvivors.push({
      assignedAt: new Date().toISOString(),
      roomId: next.room.id,
      survivorId,
      userId
    });
  }

  refreshUiState(next);
  return next;
}

export function setBaseAssignment(session: PlaytestSession, userId: string, survivorId: string, type: BaseWorkType | "idle"): PlaytestSession {
  const next = clone(session);
  ensureUser(next, userId);

  const survivor = next.account.survivors.find((candidate) => candidate.id === survivorId);
  if (!survivor) {
    throw new Error(`Unknown survivor: ${survivorId}`);
  }

  if (survivor.status === "assigned") {
    throw new Error("Assigned expedition survivors cannot work a base shift.");
  }

  next.room.baseAssignments = next.room.baseAssignments.filter(
    (assignment) => !(assignment.userId === userId && assignment.survivorId === survivorId)
  );

  if (type !== "idle") {
    next.room.baseAssignments.push({
      roomId: next.room.id,
      survivorId,
      type,
      userId
    });
  }

  next.room.feed.unshift({
    body:
      type === "idle"
        ? `${survivor.name} is off shift and will focus on rest.`
        : `${survivor.name} is assigned to ${baseWorkLabels[type]} until the next day settlement.`,
    id: `feed-base-assignment-${Date.now()}`,
    kind: "member",
    timestamp: "Just now",
    title: "Base shift updated"
  });

  refreshUiState(next);
  return next;
}

export function resolvePlaytestExpedition(
  session: PlaytestSession,
  request: PlaytestExpeditionRequest
): { session: PlaytestSession; report: ExpeditionReport } {
  const next = clone(session);
  ensureUser(next, request.userId);

  const assignedIds = new Set(
    next.room.assignedSurvivors
      .filter((assignment) => assignment.userId === request.userId)
      .map((assignment) => assignment.survivorId)
  );

  for (const survivorId of request.survivorIds) {
    if (!assignedIds.has(survivorId)) {
      throw new Error(`Survivor ${survivorId} is not assigned to this room.`);
    }
  }

  const result = resolveExpedition(roomToGameState(next.room, next.account.survivors), {
    loadout: request.loadout,
    locationId: request.locationId,
    randomRolls: request.randomRolls,
    risk: request.risk,
    squadIds: request.survivorIds
  });

  const process = buildProcess(next, request, result.report);
  result.report.logs = [...process.logs, ...result.report.logs];

  next.room.base.resources = pickResources(result.nextState.resources);
  next.room.base.morale = result.nextState.resources.morale;
  next.room.base.danger = result.nextState.resources.danger;
  next.room.feed = result.nextState.feed;
  if (next.room.feed[0]) {
    next.room.feed[0] = {
      ...next.room.feed[0],
      body: `${next.room.feed[0].body}\n${process.logs.slice(0, 8).join("\n")}`
    };
  }
  next.account.survivors = next.account.survivors.map((survivor) => {
    const updated = result.nextState.survivors.find((candidate) => candidate.id === survivor.id);
    if (!updated) {
      return survivor;
    }

    const participated = request.survivorIds.includes(survivor.id);
    const nextXp = participated ? survivor.xp + 8 : survivor.xp;

    return {
      ...survivor,
      fatigue: updated.fatigue,
      injuries: updated.injuries,
      level: participated && nextXp >= survivor.level * 20 ? survivor.level + 1 : survivor.level,
      status: participated ? "available" : survivor.status,
      xp: nextXp
    };
  });
  applyProcessEffects(next, request, process);

  next.room.assignedSurvivors = next.room.assignedSurvivors.filter(
    (assignment) => !request.survivorIds.includes(assignment.survivorId)
  );
  next.room.base.objective.repairedParts = Math.min(
    next.room.base.objective.requiredParts,
    next.room.base.objective.repairedParts + objectiveProgress(result.report) + process.objectiveBonus
  );
  if (next.room.base.objective.repairedParts >= next.room.base.objective.requiredParts) {
    next.room.base.objective.status = "won";
  }

  refreshUiState(next);
  return { report: result.report, session: next };
}

export function treatSurvivor(session: PlaytestSession, userId: string, survivorId: string): PlaytestSession {
  const next = clone(session);
  ensureUser(next, userId);

  const survivor = next.account.survivors.find((candidate) => candidate.id === survivorId);
  if (!survivor) {
    throw new Error(`Unknown survivor: ${survivorId}`);
  }

  if (next.room.base.resources.medicine < 1) {
    throw new Error("Not enough medicine to treat a survivor.");
  }

  next.room.base.resources.medicine -= 1;
  survivor.injuries = survivor.injuries.slice(1);
  survivor.fatigue = clamp(survivor.fatigue - 18, 0, 100);
  survivor.status = survivor.injuries.length > 0 ? "recovering" : "available";
  next.room.feed.unshift({
    body: `${survivor.name} spent a quiet shift in the medical corner. Medicine -1, fatigue eased, and one injury was cleared.`,
    id: `feed-treatment-${Date.now()}`,
    kind: "system",
    timestamp: "刚刚",
    title: "Treatment completed"
  });

  refreshUiState(next);
  return next;
}

export function upgradeFacility(session: PlaytestSession, userId: string, facilityId: string): PlaytestSession {
  const next = clone(session);
  ensureUser(next, userId);

  const facility = next.room.base.facilities.find((candidate) => candidate.id === facilityId);
  if (!facility) {
    throw new Error(`Unknown facility: ${facilityId}`);
  }

  const materialCost = facility.level * 5;
  if (next.room.base.resources.materials < materialCost) {
    throw new Error("Not enough materials to upgrade this facility.");
  }

  next.room.base.resources.materials -= materialCost;
  facility.level += 1;
  facility.status = facility.level >= 3 ? "stable" : facility.status;
  facility.effect = `${facility.effect} / Lv.${facility.level} upgrade: stronger expedition support.`;
  next.room.feed.unshift({
    body: `${facility.name} reached level ${facility.level}. Materials -${materialCost}; the room has a little more breathing room.`,
    id: `feed-facility-${Date.now()}`,
    kind: "system",
    timestamp: "刚刚",
    title: "Facility upgraded"
  });

  refreshUiState(next);
  return next;
}

export function advanceRoomDay(session: PlaytestSession, userId: string): PlaytestSession {
  const next = clone(session);
  ensureUser(next, userId);

  if (next.room.base.objective.status !== "active") {
    throw new Error("This room objective is already resolved.");
  }

  const previousDay = next.room.base.day;
  const nextDay = previousDay + 1;
  const foodNeed = Math.max(2, next.room.members.length * 2);
  const waterNeed = Math.max(2, next.room.members.length * 2);
  const foodShortage = spendWithShortage(next.room.base.resources, "food", foodNeed);
  const waterShortage = spendWithShortage(next.room.base.resources, "water", waterNeed);
  const shortagePressure = foodShortage + waterShortage;
  const dormLevel = facilityLevel(next, "dorm");
  const clinicLevel = facilityLevel(next, "clinic");
  const watchtowerLevel = facilityLevel(next, "watchtower");
  const recovery = 6 + dormLevel * 3 + clinicLevel * 2;
  const shift = resolveBaseAssignments(next);
  const recoveredCount = recoverSurvivors(next, recovery);

  next.room.base.day = nextDay;
  next.room.base.morale = clamp(next.room.base.morale + (shortagePressure > 0 ? -shortagePressure * 6 : 2), 0, 100);
  next.room.base.danger = clamp(next.room.base.danger + shortagePressure * 3 - watchtowerLevel - shift.dangerReduction, 0, 100);

  const logs = [
    ...shift.logs,
    `Upkeep: food -${foodNeed - foodShortage}/${foodNeed}, water -${waterNeed - waterShortage}/${waterNeed}.`,
    shortagePressure > 0
      ? `Pressure: shortages hit morale and make the base louder. Morale -${shortagePressure * 6}, danger +${shortagePressure * 3}.`
      : "Pressure: the base makes it through the night without ration panic. Morale +2.",
    `Recovery: ${recoveredCount} survivor${recoveredCount === 1 ? "" : "s"} rested. Fatigue -${recovery} before injuries.`
  ];

  if (next.room.base.objective.repairedParts >= next.room.base.objective.requiredParts) {
    next.room.base.objective.status = "won";
    logs.push("Objective: the communications tower is stable. The room survives this scenario.");
  } else if (next.room.base.day > next.room.base.objective.deadlineDay) {
    next.room.base.objective.status = "lost";
    logs.push("Objective: the repair deadline passed before the tower came online.");
  } else {
    logs.push(
      `Objective: ${next.room.base.objective.repairedParts}/${next.room.base.objective.requiredParts} repaired, ${Math.max(
        0,
        next.room.base.objective.deadlineDay - next.room.base.day + 1
      )} day(s) remain.`
    );
  }
  next.room.baseAssignments = [];

  next.room.feed.unshift({
    body: logs.join("\n"),
    id: `feed-day-${Date.now()}`,
    kind: "system",
    timestamp: `Day ${nextDay}`,
    title: next.room.base.objective.status === "lost" ? "Objective failed" : `Day ${nextDay} settlement`
  });

  refreshUiState(next);
  return next;
}

const resourceKeys = ["food", "water", "materials", "medicine", "fuel", "ammo"] as const;

const resourceLabels: Record<ResourceKey, string> = {
  ammo: "Ammo",
  food: "Food",
  fuel: "Fuel",
  materials: "Materials",
  medicine: "Medicine",
  water: "Water"
};

const baseWorkLabels: Record<BaseWorkType, string> = {
  care: "clinic care",
  forage: "foraging",
  guard: "watch duty",
  repair: "tower repair"
};

function ensureUser(session: PlaytestSession, userId: string) {
  if (session.account.profile.userId !== userId) {
    throw new Error("This session can only mutate the active account.");
  }
}

function actorName(session: PlaytestSession, userId: string) {
  return session.room.members.find((member) => member.userId === userId)?.displayName ?? session.account.profile.displayName;
}

function formatResources(resources: ResourceBundle) {
  const summary = resourceKeys
    .filter((key) => resources[key] > 0)
    .map((key) => `${resourceLabels[key]} +${resources[key]}`)
    .join(", ");

  return summary || "no usable supplies";
}

function pickResources(resources: ResourceBundle & { morale?: number; danger?: number }): ResourceBundle {
  return {
    ammo: resources.ammo,
    food: resources.food,
    fuel: resources.fuel,
    materials: resources.materials,
    medicine: resources.medicine,
    water: resources.water
  };
}

function objectiveProgress(report: ExpeditionReport) {
  return report.outcome === "clean" ? 2 : report.outcome === "rough" ? 1 : 0;
}

type ProcessResult = {
  dangerDelta: number;
  injury?: string;
  logs: string[];
  moraleDelta: number;
  objectiveBonus: number;
  resourceBonus: Partial<Record<ResourceKey, number>>;
};

function buildProcess(session: PlaytestSession, request: PlaytestExpeditionRequest, report: ExpeditionReport): ProcessResult {
  const rolls = request.randomRolls ?? [Math.random(), Math.random(), Math.random(), Math.random(), Math.random()];
  const squad = request.survivorIds
    .map((id) => session.account.survivors.find((survivor) => survivor.id === id))
    .filter(Boolean) as PlaytestSession["account"]["survivors"];
  const lead = squad[0];
  const specialist = squad.find((survivor) => survivor.attributes.technical >= 7 || survivor.attributes.medical >= 7) ?? squad[1] ?? lead;
  const process: ProcessResult = {
    dangerDelta: 0,
    logs: [],
    moraleDelta: 0,
    objectiveBonus: 0,
    resourceBonus: {}
  };
  const logs = [
    `Departure: ${lead?.name ?? "The squad"} checks the route markers, spends the packed supplies, and leaves before the tower siren cycles again.`,
    `Approach: ${specialist?.name ?? "The specialist"} reads the site pressure. Risk posture is ${request.risk}; the team keeps one exit in mind.`
  ];
  if (request.journeyLogs?.length) {
    logs.push(...request.journeyLogs.map((line) => `Journey: ${line}`));
  }

  const encounterRoll = rolls[3] ?? rolls[0] ?? 0.5;
  if (encounterRoll < 0.25) {
    process.dangerDelta = 1;
    process.injury = "擦伤";
    const target = squad[0];
    logs.push(`Encounter: a blocked stairwell turns into a noisy detour. Danger +1${target ? `, ${target.name} suffers 擦伤` : ""}.`);
  } else if (encounterRoll < 0.5) {
    process.resourceBonus.materials = 1;
    logs.push("Encounter: the team strips a maintenance locker before leaving. Materials +1.");
  } else if (encounterRoll < 0.75) {
    process.objectiveBonus = 1;
    logs.push("Encounter: a clean relay diagram matches the tower problem. Objective +1.");
  } else {
    process.resourceBonus.medicine = 1;
    logs.push("Encounter: a sealed first-aid cache survives under a collapsed desk. Medicine +1.");
  }

  const pressureRoll = rolls[4] ?? rolls[1] ?? 0.5;
  if (pressureRoll > 0.72 && report.outcome !== "clean") {
    process.moraleDelta = -1;
    logs.push("Complication: the retreat gets messy and everyone hears it over the radio. Morale -1.");
  } else {
    logs.push("Extraction: the squad returns with enough detail for the next team to make better choices.");
  }

  return {
    ...process,
    logs
  };
}

function applyProcessEffects(session: PlaytestSession, request: PlaytestExpeditionRequest, process: ProcessResult) {
  for (const [key, amount] of Object.entries(process.resourceBonus) as Array<[ResourceKey, number]>) {
    session.room.base.resources[key] = Math.max(0, session.room.base.resources[key] + amount);
  }

  session.room.base.danger = clamp(session.room.base.danger + process.dangerDelta, 0, 100);
  session.room.base.morale = clamp(session.room.base.morale + process.moraleDelta, 0, 100);

  if (process.injury) {
    const target = session.account.survivors.find((survivor) => survivor.id === request.survivorIds[0]);
    if (target && !target.injuries.includes(process.injury)) {
      target.injuries = [...target.injuries, process.injury];
    }
  }
}

function spendWithShortage(resources: ResourceBundle, key: ResourceKey, amount: number): number {
  const spent = Math.min(resources[key], amount);
  resources[key] -= spent;
  return amount - spent;
}

function facilityLevel(session: PlaytestSession, facilityId: string): number {
  return session.room.base.facilities.find((facility) => facility.id === facilityId)?.level ?? 0;
}

function resolveBaseAssignments(session: PlaytestSession) {
  const logs: string[] = [];
  let dangerReduction = 0;

  for (const assignment of session.room.baseAssignments) {
    const survivor = session.account.survivors.find(
      (candidate) => candidate.id === assignment.survivorId && candidate.ownerUserId === assignment.userId
    );
    if (!survivor || survivor.status === "assigned") {
      continue;
    }

    const fatiguePenalty = survivor.fatigue >= 70 ? 1 : 0;
    if (assignment.type === "forage") {
      const yieldScore = Math.max(1, Math.floor((survivor.attributes.stamina + survivor.attributes.luck) / 6) - fatiguePenalty);
      session.room.base.resources.food += yieldScore;
      session.room.base.resources.water += Math.max(1, yieldScore - 1);
      survivor.fatigue = clamp(survivor.fatigue + 6, 0, 100);
      logs.push(`${survivor.name} foraged: Food +${yieldScore}, Water +${Math.max(1, yieldScore - 1)}, fatigue +6.`);
    }

    if (assignment.type === "repair") {
      const repairScore = Math.max(1, Math.floor(survivor.attributes.technical / 5) - fatiguePenalty);
      session.room.base.objective.repairedParts = Math.min(
        session.room.base.objective.requiredParts,
        session.room.base.objective.repairedParts + repairScore
      );
      session.room.base.resources.materials += repairScore > 1 ? 1 : 0;
      survivor.fatigue = clamp(survivor.fatigue + 5, 0, 100);
      logs.push(`${survivor.name} repaired the tower: Objective +${repairScore}${repairScore > 1 ? ", Materials +1" : ""}, fatigue +5.`);
    }

    if (assignment.type === "guard") {
      const guardScore = Math.max(1, Math.floor((survivor.attributes.willpower + survivor.attributes.agility) / 7) - fatiguePenalty);
      dangerReduction += guardScore;
      survivor.fatigue = clamp(survivor.fatigue + 4, 0, 100);
      logs.push(`${survivor.name} kept watch: danger pressure -${guardScore}, fatigue +4.`);
    }

    if (assignment.type === "care") {
      const healScore = Math.max(6, survivor.attributes.medical + facilityLevel(session, "clinic") * 2);
      const patient = session.account.survivors
        .filter((candidate) => candidate.id !== survivor.id && candidate.status !== "assigned")
        .sort((left, right) => right.fatigue + right.injuries.length * 20 - (left.fatigue + left.injuries.length * 20))[0];
      if (patient) {
        patient.fatigue = clamp(patient.fatigue - healScore, 0, 100);
        if (patient.injuries.length > 0 && healScore >= 10) {
          patient.injuries = patient.injuries.slice(1);
        }
        patient.status = patient.injuries.length > 0 ? "recovering" : "available";
        logs.push(`${survivor.name} handled care: ${patient.name} fatigue -${healScore}${healScore >= 10 ? ", one injury cleared if present" : ""}.`);
      } else {
        logs.push(`${survivor.name} handled care, but no patient needed help.`);
      }
      survivor.fatigue = clamp(survivor.fatigue + 3, 0, 100);
    }
  }

  if (logs.length === 0) {
    logs.push("Base shifts: no one was assigned, so the base only handled upkeep.");
  }

  return {
    dangerReduction,
    logs
  };
}

function recoverSurvivors(session: PlaytestSession, recovery: number): number {
  let count = 0;
  for (const survivor of session.account.survivors) {
    if (survivor.status === "assigned") {
      continue;
    }

    const injuryPenalty = survivor.injuries.length * 4;
    const actualRecovery = Math.max(1, recovery - injuryPenalty);
    const before = survivor.fatigue;
    survivor.fatigue = clamp(survivor.fatigue - actualRecovery, 0, 100);
    survivor.status = survivor.injuries.length > 0 ? "recovering" : "available";
    if (survivor.fatigue < before) {
      count += 1;
    }
  }

  return count;
}

function refreshUiState(session: PlaytestSession) {
  session.uiState = roomToGameState(session.room, session.account.survivors);
}

function clone<T>(value: T): T {
  return structuredClone(value) as T;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
