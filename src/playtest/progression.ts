import type { Facility, ResourceBundle } from "../game/types";
import { resourceKeys, resourceLabels } from "../game/labels";
import type { AccountSurvivor, RoomBaseAssignment } from "./types";

export type SurvivorPerkId = "field_runner" | "steady_hands" | "base_instinct";
export type ExpeditionDoctrineId =
  | "breach-drill"
  | "field-triage"
  | "hold-formation"
  | "hot-magazines"
  | "overwatch-route"
  | "road-rations"
  | "salvage-rig"
  | "shield-line"
  | "signal-map";

export type SurvivorPerk = {
  id: SurvivorPerkId;
  label: string;
  description: string;
};

export type ExpeditionSupport = {
  ammoDamage: number;
  campCook: number;
  campRest: number;
  campScout: number;
  carryCapacity?: number;
  guardBlock: number;
  lootEvade: number;
  lootIntel: number;
  lootMedicine: number;
  lootSalvage: number;
  maxHp: number;
  openingExpose: number;
  openingGuard: number;
  patchHeal: number;
  pressureRelief: number;
  roadPush: number;
  roadSearch: number;
  roadSecure: number;
  shopIntel: number;
  shopRations: number;
  shopService: number;
  startingSupplies: Partial<ResourceBundle>;
};

export type ExpeditionDoctrineOption = {
  effect: string;
  facilityId: string;
  id: ExpeditionDoctrineId;
  label: string;
  text: string;
};

export type ExpeditionSupportPlanStage = {
  id: "camp" | "combat" | "departure" | "road";
  items: string[];
  label: string;
  summary: string;
};

export type ExpeditionSupportPlan = {
  stages: ExpeditionSupportPlanStage[];
  summary: string;
  totalEffects: number;
};

export const survivorPerks: Record<SurvivorPerkId, SurvivorPerk> = {
  base_instinct: {
    description: "该幸存者执行搜寻、修理、守卫或护理时，基地班次产出 +1。",
    id: "base_instinct",
    label: "基地直觉"
  },
  field_runner: {
    description: "攻击和撤退更利落；该幸存者能帮助队伍穿过糟糕接触。",
    id: "field_runner",
    label: "野外跑手"
  },
  steady_hands: {
    description: "包扎和战术行动更强；该幸存者能阻止恐慌演变成伤病。",
    id: "steady_hands",
    label: "稳定双手"
  }
};

export function survivorPerkIds(survivor: AccountSurvivor): SurvivorPerkId[] {
  const perks: SurvivorPerkId[] = [];
  if (survivor.level >= 2) {
    perks.push(primaryPerkFor(survivor));
  }
  if (survivor.level >= 3) {
    perks.push("base_instinct");
  }
  return [...new Set(perks)];
}

export function survivorPerkDetails(survivor: AccountSurvivor): SurvivorPerk[] {
  return survivorPerkIds(survivor).map((perkId) => survivorPerks[perkId]);
}

export function hasSurvivorPerk(survivor: AccountSurvivor, perkId: SurvivorPerkId) {
  return survivorPerkIds(survivor).includes(perkId);
}

export function xpForNextLevel(survivor: AccountSurvivor) {
  return survivor.level * 20;
}

const expeditionDoctrineDefinitions: ExpeditionDoctrineOption[] = [
  {
    effect: "生命上限 +6 / 防守 +1 / 开局防护 +2",
    facilityId: "dorm",
    id: "hold-formation",
    label: "收紧队形",
    text: "宿舍轮班让队伍带着休整和行军纪律出门。"
  },
  {
    effect: "药品 +1 / 包扎 +3",
    facilityId: "clinic",
    id: "field-triage",
    label: "前线分诊",
    text: "医务室提前打包治疗卷，并给队伍安排清晰的伤员流程。"
  },
  {
    effect: "弹药 +1 / 弹药伤害 +2 / 开局暴露 +2",
    facilityId: "generator",
    id: "hot-magazines",
    label: "预热弹匣",
    text: "发电机给工具充能，也让第一轮弹匣保持干燥可用。"
  },
  {
    effect: "压力 -4 / 路段搜索 +2",
    facilityId: "watchtower",
    id: "overwatch-route",
    label: "望塔标路",
    text: "哨塔在队伍出门前标出第一批盲角和可疑路口。"
  },
  {
    effect: "食物 +1 / 水 +1",
    facilityId: "kitchen",
    id: "road-rations",
    label: "路上口粮",
    text: "厨房把基地库存压缩成便携餐和干净水壶。"
  },
  {
    effect: "防守 +2 / 路段稳固 +2 / 开局防护 +3",
    facilityId: "barricade",
    id: "shield-line",
    label: "盾线出门",
    text: "路障班把木板、盾具和出门演练一起交给队伍。"
  },
  {
    effect: "生命上限 +4 / 防守 +1 / 开局防护 +1 / 开局暴露 +1",
    facilityId: "training",
    id: "breach-drill",
    label: "破门演练",
    text: "训练室在出发前演练接触战分工。"
  },
  {
    effect: "战利品 +2 / 路段稳固 +1 / 开局暴露 +1",
    facilityId: "workshop",
    id: "salvage-rig",
    label: "搜刮套件",
    text: "工坊把撬具和冲击工具拼成一套，方便返程带回更多东西。"
  },
  {
    effect: "压力 -3 / 路段搜索 +1",
    facilityId: "radio",
    id: "signal-map",
    label: "信号地图",
    text: "电台把杂音整理成路线标记，也提升线索回收。"
  }
];

export function expeditionDoctrineOptions(facilities: Facility[]): ExpeditionDoctrineOption[] {
  return expeditionDoctrineDefinitions.filter((doctrine) => facilityLevel(facilities, doctrine.facilityId) > 0);
}

export function supportFromFacilities(facilities: Facility[], doctrineId?: ExpeditionDoctrineId | null): ExpeditionSupport {
  const dorm = facilityLevel(facilities, "dorm");
  const clinic = facilityLevel(facilities, "clinic");
  const generator = facilityLevel(facilities, "generator");
  const watchtower = facilityLevel(facilities, "watchtower");
  const barricade = facilityLevel(facilities, "barricade");
  const kitchen = facilityLevel(facilities, "kitchen");
  const radio = facilityLevel(facilities, "radio");
  const training = facilityLevel(facilities, "training");
  const workshop = facilityLevel(facilities, "workshop");

  const support: ExpeditionSupport = {
    ...emptyExpeditionSupport(),
    ammoDamage: Math.max(0, generator - 1) + workshop,
    campCook: kitchen,
    campRest: Math.max(0, dorm - 1) + Math.max(0, clinic - 1),
    campScout: Math.max(0, watchtower - 1) + radio,
    carryCapacity: workshop + Math.floor(training / 2),
    guardBlock: Math.max(0, dorm - 1) + barricade,
    lootEvade: Math.max(0, watchtower - 1) + barricade,
    lootIntel: radio,
    lootMedicine: Math.max(0, clinic - 1),
    lootSalvage: workshop,
    maxHp: Math.max(0, dorm - 1) * 4 + training * 2,
    openingExpose: 0,
    openingGuard: 0,
    patchHeal: Math.max(0, clinic - 1) * 3,
    pressureRelief: Math.max(0, watchtower - 1) * 2 + radio,
    roadPush: Math.max(0, watchtower - 1),
    roadSearch: Math.max(0, watchtower - 1) + radio,
    roadSecure: barricade + Math.floor(workshop / 2),
    shopIntel: radio,
    shopRations: kitchen,
    shopService: workshop,
    startingSupplies: {
      ammo: generator >= 3 ? 1 : 0,
      medicine: clinic >= 3 ? 1 : 0
    }
  };

  if (!doctrineId || !expeditionDoctrineOptions(facilities).some((doctrine) => doctrine.id === doctrineId)) {
    return support;
  }

  return applyExpeditionDoctrine(support, doctrineId);
}

export function emptyExpeditionSupport(): ExpeditionSupport {
  return {
    ammoDamage: 0,
    campCook: 0,
    campRest: 0,
    campScout: 0,
    carryCapacity: 0,
    guardBlock: 0,
    lootEvade: 0,
    lootIntel: 0,
    lootMedicine: 0,
    lootSalvage: 0,
    maxHp: 0,
    openingExpose: 0,
    openingGuard: 0,
    patchHeal: 0,
    pressureRelief: 0,
    roadPush: 0,
    roadSearch: 0,
    roadSecure: 0,
    shopIntel: 0,
    shopRations: 0,
    shopService: 0,
    startingSupplies: {}
  };
}

export function basePrepSupportFromAssignments(
  assignments: RoomBaseAssignment[],
  survivors: AccountSurvivor[],
  userId: string,
  squadIds: string[] = []
): ExpeditionSupport {
  const support = emptyExpeditionSupport();
  const squad = new Set(squadIds);
  const survivorIds = new Set(survivors.map((survivor) => survivor.id));
  const relevantAssignments = assignments.filter(
    (assignment) => assignment.userId === userId && !squad.has(assignment.survivorId) && survivorIds.has(assignment.survivorId)
  );

  for (const assignment of relevantAssignments) {
    if (assignment.type === "forage") {
      support.startingSupplies.food = (support.startingSupplies.food ?? 0) + 1;
      support.startingSupplies.water = (support.startingSupplies.water ?? 0) + 1;
      support.shopRations += 1;
    } else if (assignment.type === "care") {
      support.startingSupplies.medicine = (support.startingSupplies.medicine ?? 0) + 1;
      support.patchHeal += 1;
      support.lootMedicine += 1;
    } else if (assignment.type === "repair") {
      support.carryCapacity = (support.carryCapacity ?? 0) + 2;
      support.lootSalvage += 1;
      support.shopService += 1;
    } else if (assignment.type === "guard") {
      support.pressureRelief += 1;
      support.roadSecure += 1;
      support.guardBlock += 1;
    }
  }

  return support;
}

export function mergeExpeditionSupport(left: ExpeditionSupport, right: ExpeditionSupport): ExpeditionSupport {
  const merged = emptyExpeditionSupport();
  for (const key of numericSupportKeys) {
    merged[key] = (left[key] ?? 0) + (right[key] ?? 0);
  }

  merged.startingSupplies = {
    ...left.startingSupplies
  };

  for (const [key, value] of Object.entries(right.startingSupplies) as Array<[keyof ResourceBundle, number | undefined]>) {
    merged.startingSupplies[key] = (merged.startingSupplies[key] ?? 0) + (value ?? 0);
  }

  return merged;
}

export function expeditionSupportPlan(support: ExpeditionSupport): ExpeditionSupportPlan {
  const stages: ExpeditionSupportPlanStage[] = [];
  const departureItems = [
    ...resourceKeys
      .map((key) => ({ label: resourceLabels[key], value: support.startingSupplies[key] ?? 0 }))
      .filter((item) => item.value > 0)
      .map((item) => `${item.label} +${item.value}`),
    ...supportLine("生命上限", support.maxHp),
    ...supportLine("开局防护", support.openingGuard),
    ...supportLine("开局暴露", support.openingExpose),
    ...supportLine("背包容量", support.carryCapacity ?? 0)
  ];
  if (departureItems.length > 0) {
    stages.push({
      id: "departure",
      items: departureItems,
      label: "出门准备",
      summary: "把设施、纪律和留守人员的准备转成开局物资、队伍耐力和携带空间。"
    });
  }

  const roadItems = [
    ...supportLine("压力缓解", support.pressureRelief),
    ...supportLine("路线稳固", support.roadSecure),
    ...supportLine("路线搜索", support.roadSearch),
    ...supportLine("强行推进", support.roadPush),
    ...supportLine("撤离回避", support.lootEvade)
  ];
  if (roadItems.length > 0) {
    stages.push({
      id: "road",
      items: roadItems,
      label: "路上控制",
      summary: "降低路线失控概率，并让路上险情有更多稳住、搜索或绕开的办法。"
    });
  }

  const combatItems = [
    ...supportLine("防守", support.guardBlock),
    ...supportLine("弹药伤害", support.ammoDamage),
    ...supportLine("包扎", support.patchHeal),
    ...supportLine("医疗战利", support.lootMedicine),
    ...supportLine("拆解战利", support.lootSalvage),
    ...supportLine("战后情报", support.lootIntel)
  ];
  if (combatItems.length > 0) {
    stages.push({
      id: "combat",
      items: combatItems,
      label: "战斗医疗",
      summary: "把基地的训练、医疗和工坊能力带进回合战斗与战后选择。"
    });
  }

  const campItems = [
    ...supportLine("营地热食", support.campCook),
    ...supportLine("营地休整", support.campRest),
    ...supportLine("营地侦察", support.campScout),
    ...supportLine("商店口粮", support.shopRations),
    ...supportLine("商店情报", support.shopIntel),
    ...supportLine("商店服务", support.shopService)
  ];
  if (campItems.length > 0) {
    stages.push({
      id: "camp",
      items: campItems,
      label: "营地交易",
      summary: "提高营地、商店和撤离前补给点的选择质量。"
    });
  }

  const totalEffects = supportTotal(support);
  return {
    stages,
    summary: stages.length > 0 ? `${stages.length} 条后勤线，${totalEffects} 点支援已编入出征预案。` : "暂无后勤支援",
    totalEffects
  };
}

const numericSupportKeys = [
  "ammoDamage",
  "campCook",
  "campRest",
  "campScout",
  "carryCapacity",
  "guardBlock",
  "lootEvade",
  "lootIntel",
  "lootMedicine",
  "lootSalvage",
  "maxHp",
  "openingExpose",
  "openingGuard",
  "patchHeal",
  "pressureRelief",
  "roadPush",
  "roadSearch",
  "roadSecure",
  "shopIntel",
  "shopRations",
  "shopService"
] as const;

function supportLine(label: string, value: number): string[] {
  return value > 0 ? [`${label} +${value}`] : [];
}

function supportTotal(support: ExpeditionSupport) {
  const numericTotal = numericSupportKeys.reduce((sum, key) => sum + Math.max(0, support[key] ?? 0), 0);
  const supplyTotal = resourceKeys.reduce((sum, key) => sum + Math.max(0, support.startingSupplies[key] ?? 0), 0);
  return numericTotal + supplyTotal;
}

function applyExpeditionDoctrine(support: ExpeditionSupport, doctrineId: ExpeditionDoctrineId): ExpeditionSupport {
  const next: ExpeditionSupport = {
    ...support,
    startingSupplies: { ...support.startingSupplies }
  };

  if (doctrineId === "hold-formation") {
    next.maxHp += 6;
    next.guardBlock += 1;
    next.openingGuard += 2;
  } else if (doctrineId === "field-triage") {
    next.patchHeal += 3;
    next.lootMedicine += 1;
    next.startingSupplies.medicine = (next.startingSupplies.medicine ?? 0) + 1;
  } else if (doctrineId === "hot-magazines") {
    next.ammoDamage += 2;
    next.openingExpose += 2;
    next.startingSupplies.ammo = (next.startingSupplies.ammo ?? 0) + 1;
  } else if (doctrineId === "overwatch-route") {
    next.pressureRelief += 4;
    next.campScout += 1;
    next.lootEvade += 1;
    next.roadSearch += 2;
    next.roadPush += 1;
  } else if (doctrineId === "road-rations") {
    next.campCook += 1;
    next.roadPush += 1;
    next.shopRations += 1;
    next.startingSupplies.food = (next.startingSupplies.food ?? 0) + 1;
    next.startingSupplies.water = (next.startingSupplies.water ?? 0) + 1;
  } else if (doctrineId === "shield-line") {
    next.guardBlock += 2;
    next.lootEvade += 1;
    next.openingGuard += 3;
    next.roadSecure += 2;
  } else if (doctrineId === "breach-drill") {
    next.maxHp += 4;
    next.guardBlock += 1;
    next.openingExpose += 1;
    next.openingGuard += 1;
    next.roadSecure += 1;
  } else if (doctrineId === "salvage-rig") {
    next.ammoDamage += 1;
    next.lootSalvage += 2;
    next.openingExpose += 1;
    next.roadSecure += 1;
    next.shopService += 1;
  } else if (doctrineId === "signal-map") {
    next.pressureRelief += 3;
    next.campScout += 1;
    next.lootIntel += 1;
    next.roadSearch += 1;
  }

  return next;
}

function primaryPerkFor(survivor: AccountSurvivor): SurvivorPerkId {
  const mobility = survivor.attributes.agility + survivor.attributes.stamina;
  const control = survivor.attributes.technical + survivor.attributes.medical + survivor.attributes.willpower;
  return mobility >= control / 1.5 ? "field_runner" : "steady_hands";
}

function facilityLevel(facilities: Facility[], facilityId: string) {
  return facilities.find((facility) => facility.id === facilityId)?.level ?? 0;
}
