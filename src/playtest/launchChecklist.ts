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

export type ExpeditionLaunchChecklistInput = {
  canAffordLoadout: boolean;
  hasActiveJourney: boolean;
  maxSquadSize?: number;
  minSquadSize?: number;
  objectiveActive: boolean;
  selectedLocationName: string;
  squadCount: number;
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
