export type ExpeditionLaunchChecklistItem = {
  id: "squad" | "loadout" | "objective" | "journey";
  label: string;
  status: "ready" | "blocked";
  text: string;
};

export type ExpeditionLaunchChecklist = {
  canDispatch: boolean;
  items: ExpeditionLaunchChecklistItem[];
  summary: string;
};

export type ExpeditionYieldPreviewItem = {
  detail: string;
  label: string;
  tone: "safe" | "warning" | "blocked";
  value: string;
};

export type ExpeditionYieldPreview = {
  headline: string;
  items: ExpeditionYieldPreviewItem[];
};

export type ExpeditionLaunchChecklistInput = {
  canAffordLoadout: boolean;
  hasActiveJourney: boolean;
  maxSquadSize?: number;
  minSquadSize?: number;
  objectiveActive: boolean;
  selectedLocationName: string;
  squadCount: number;
};

export type ExpeditionYieldPreviewInput = {
  canDispatch: boolean;
  loadoutTotal: number;
  objectiveActive: boolean;
  readiness: number;
  riskLabel: string;
  selectedLocationName: string;
  squadCount: number;
  supportEffects: number;
  trainingLevel: number;
};

export function expeditionLaunchChecklist(input: ExpeditionLaunchChecklistInput): ExpeditionLaunchChecklist {
  const minSquadSize = input.minSquadSize ?? 3;
  const maxSquadSize = input.maxSquadSize ?? 5;
  const squadReady = input.squadCount >= minSquadSize && input.squadCount <= maxSquadSize;
  const items: ExpeditionLaunchChecklistItem[] = [
    {
      id: "squad",
      label: "编队",
      status: squadReady ? "ready" : "blocked",
      text: squadReady
        ? `已选择 ${input.squadCount} 名幸存者。`
        : input.squadCount < minSquadSize
          ? `还需要 ${minSquadSize - input.squadCount} 名幸存者，远征队伍需要 ${minSquadSize}-${maxSquadSize} 人。`
          : `已超过上限 ${maxSquadSize} 人，先移出 ${input.squadCount - maxSquadSize} 名幸存者。`
    },
    {
      id: "loadout",
      label: "随身补给",
      status: input.canAffordLoadout ? "ready" : "blocked",
      text: input.canAffordLoadout ? "基地库存足够支付本次携带物资。" : "携带物资超过基地库存，先减少补给或捐入资源。"
    },
    {
      id: "objective",
      label: "房间目标",
      status: input.objectiveActive ? "ready" : "blocked",
      text: input.objectiveActive ? "房间目标仍在进行，可以继续推进。" : "当前房间目标已经结算，创建新房间后再出发。"
    },
    {
      id: "journey",
      label: "远征状态",
      status: input.hasActiveJourney ? "blocked" : "ready",
      text: input.hasActiveJourney ? "已有远征在路上，先处理当前路线。" : "当前没有进行中的远征。"
    }
  ];
  const blockers = items.filter((item) => item.status === "blocked");
  const canDispatch = blockers.length === 0;

  return {
    canDispatch,
    items,
    summary: canDispatch
      ? `可以派遣：${input.squadCount} 人编队已准备前往${input.selectedLocationName}。`
      : `还不能派遣：${blockers.map((item) => item.label).join("、")}。`
  };
}

export function expeditionYieldPreview(input: ExpeditionYieldPreviewInput): ExpeditionYieldPreview {
  const xpEstimate = 8 + Math.max(0, input.trainingLevel) * 2;
  const readinessTone = input.readiness >= 70 ? "safe" : input.readiness >= 45 ? "warning" : "blocked";
  const objectiveTone = input.objectiveActive ? "safe" : "blocked";
  const supportTone = input.supportEffects > 0 ? "safe" : "warning";

  return {
    headline: input.canDispatch
      ? `${input.selectedLocationName} 会推进基地目标，并给 ${input.squadCount} 名幸存者结算经验。`
      : "先补齐派遣条件，再确认本次远征收益。",
    items: [
      {
        detail: input.objectiveActive ? `风险策略：${input.riskLabel}` : "当前房间目标已结算，需要新房间。",
        label: "基地目标",
        tone: objectiveTone,
        value: input.objectiveActive ? "可推进" : "已暂停"
      },
      {
        detail: input.squadCount > 0 ? `预计每名参与者至少 +${xpEstimate} 经验` : "先选择出征幸存者。",
        label: "幸存者成长",
        tone: input.squadCount > 0 ? "safe" : "blocked",
        value: input.squadCount > 0 ? `${input.squadCount} 人` : "未编队"
      },
      {
        detail: input.loadoutTotal > 0 ? `随身补给 ${input.loadoutTotal} 份会换取路上选择空间。` : "没有随身补给，路上容错会很低。",
        label: "资源回收",
        tone: input.loadoutTotal > 0 ? "safe" : "warning",
        value: input.loadoutTotal > 0 ? "可带回" : "偏冒险"
      },
      {
        detail: input.supportEffects > 0 ? `${input.supportEffects} 点后勤支援会进入路线、战斗或营地。` : "建设设施、升级个人基地或安排班次可提高支援。",
        label: "后勤支援",
        tone: supportTone,
        value: input.supportEffects > 0 ? "已接入" : "待建设"
      },
      {
        detail: `编队适配度 ${Math.round(input.readiness)}，决定开局稳定性和战斗容错。`,
        label: "出发把握",
        tone: readinessTone,
        value: input.readiness >= 70 ? "优势" : input.readiness >= 45 ? "可行动" : "偏危险"
      }
    ]
  };
}
