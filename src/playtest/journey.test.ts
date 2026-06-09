import { afterEach, describe, expect, test, vi } from "vitest";
import {
  advanceJourneyTravel,
  baseCommandOptions,
  calculateCarryBurden,
  campOptionOutcome,
  combatActionPreview,
  combatCommandBriefing,
  combatLootPlan,
  combatRoundPlan,
  combatThreatPreview,
  createJourney,
  createCombatForNode,
  forecastNextSegment,
  journeyExtractionPreview,
  journeyDecisionSummaryLines,
  journeyActionGuide,
  journeyContentBreadth,
  journeyObjectivePreview,
  journeyProcessDigest,
  journeyRouteBriefing,
  resolveJourneyExtraction,
  roadEncounterChoicePreview,
  resolveCampAction,
  resolveBaseCommand,
  resolveCombatLootChoice,
  resolveCombatRound,
  resolveRoadEncounterChoice,
  resolveShopAction,
  routePaceFor,
  segmentThreatFor,
  setJourneySegmentTactic,
  setJourneyTravelPlan,
  shopOfferOutcome,
  spendFieldSupplyFromPriority
} from "./journey";
import { supportFromFacilities } from "./progression";
import { createStarterSession } from "./state";

describe("journey route generation", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("creates family-specific route events, enemies, and shops", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const session = createStarterSession("user-a", "Alice", "route-room");
    const draft = {
      loadout: { ammo: 1, food: 1, fuel: 1, materials: 0, medicine: 1, water: 1 },
      risk: "standard" as const,
      squadIds: session.account.survivors.slice(0, 3).map((survivor) => survivor.id)
    };

    const resourceRoute = createJourney(session, draft, "water-plant", 60);
    const weirdRoute = createJourney(session, draft, "greenhouse", 60);

    expect(resourceRoute.nodes[0].title).toBe("闸门绕行");
    expect(resourceRoute.nodes[1].enemy?.name).toBe("阀门尸");
    expect(resourceRoute.nodes[2].type).toBe("camp");
    expect(resourceRoute.nodes[3].shop?.label).toBe("买修理包");
    expect(weirdRoute.nodes[0].title).toBe("听声藤蔓");
    expect(weirdRoute.nodes[1].enemy?.name).toBe("借影");
    expect(weirdRoute.nodes[2].type).toBe("camp");
    expect(weirdRoute.nodes[3].shop?.label).toBe("付给面具摊主");
  });

  test("keeps each location family stocked with multiple route beats", () => {
    expect(journeyContentBreadth()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ camps: 5, enemies: 5, events: 4, family: "resources", roadBeats: 5, shops: 4 }),
        expect.objectContaining({ camps: 5, enemies: 5, events: 4, family: "urban", roadBeats: 5, shops: 4 }),
        expect.objectContaining({ camps: 5, enemies: 5, events: 4, family: "weird", roadBeats: 5, shops: 4 }),
        expect.objectContaining({ camps: 5, enemies: 5, events: 4, family: "wilds", roadBeats: 5, shops: 4 })
      ])
    );
  });

  test("previews the deeper road beat pool on later route segments", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const session = createStarterSession("user-a", "Alice", "deep-road-room");
    const squad = session.account.survivors.slice(0, 3);
    const draft = {
      loadout: { ammo: 1, food: 1, fuel: 1, materials: 1, medicine: 1, water: 1 },
      risk: "standard" as const,
      squadIds: squad.map((survivor) => survivor.id)
    };

    const resourceRoute = createJourney(session, draft, "water-plant", 60);
    resourceRoute.condition.distance = 3;
    const resourceForecast = forecastNextSegment(resourceRoute, squad, 60);

    const weirdRoute = createJourney(session, draft, "greenhouse", 60);
    weirdRoute.condition.distance = 4;
    const weirdForecast = forecastNextSegment(weirdRoute, squad, 60);

    expect(resourceForecast.roadEventForecast.beatTitle).toBe("滤塔白絮");
    expect(weirdForecast.roadEventForecast.beatTitle).toBe("排队病床");
  });

  test("can roll into the expanded route event and shop pools", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.99);
    const session = createStarterSession("user-a", "Alice", "expanded-route-room");
    const draft = {
      loadout: { ammo: 1, food: 1, fuel: 1, materials: 1, medicine: 1, water: 1 },
      risk: "standard" as const,
      squadIds: session.account.survivors.slice(0, 3).map((survivor) => survivor.id)
    };

    const resourceRoute = createJourney(session, draft, "water-plant", 60);
    const weirdRoute = createJourney(session, draft, "greenhouse", 60);

    expect(resourceRoute.nodes[0].title).toBe("旁通阀阵");
    expect(resourceRoute.nodes[3].shop?.label).toBe("买泵站调度图");
    expect(weirdRoute.nodes[0].title).toBe("白色病历墙");
    expect(weirdRoute.nodes[3].shop?.label).toBe("买画框里的钥匙");
  });

  test("can roll into the expanded shop pools and preview their offers", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.99);
    const session = createStarterSession("user-a", "Alice", "expanded-shop-room");
    const draft = {
      loadout: { ammo: 1, food: 1, fuel: 1, materials: 1, medicine: 1, water: 1 },
      risk: "standard" as const,
      squadIds: session.account.survivors.slice(0, 3).map((survivor) => survivor.id)
    };

    const urbanRoute = createJourney(session, draft, "hospital", 60);
    const wildRoute = createJourney(session, draft, "farm", 60);
    const urbanShop = urbanRoute.nodes[3].shop;
    const wildShop = wildRoute.nodes[3].shop;

    expect(urbanShop?.label).toBe("向公交调度员买旧车票");
    expect(wildShop?.label).toBe("向巡田老人买近路");
    expect(urbanShop?.offers.resupply.label).toBe("购买路上口粮");
    expect(shopOfferOutcome("intel", urbanShop!.offers.intel, urbanRoute.support).text).toContain("路线");
    expect(Object.values(shopOfferOutcome("service", wildShop!.offers.service, wildRoute.support).reward).reduce((sum, value) => sum + value, 0)).toBeGreaterThan(0);
  });

  test("can roll into the expanded camp pools", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.99);
    const session = createStarterSession("user-a", "Alice", "expanded-camp-room");
    const draft = {
      loadout: { ammo: 1, food: 1, fuel: 1, materials: 1, medicine: 1, water: 1 },
      risk: "standard" as const,
      squadIds: session.account.survivors.slice(0, 3).map((survivor) => survivor.id)
    };

    const resourceRoute = createJourney(session, draft, "water-plant", 60);
    const urbanRoute = createJourney(session, draft, "hospital", 60);
    const weirdRoute = createJourney(session, draft, "greenhouse", 60);
    const wildRoute = createJourney(session, draft, "farm", 60);

    expect(resourceRoute.nodes[2]).toMatchObject({ title: "旧泵车车斗", type: "camp" });
    expect(resourceRoute.nodes[2].body).toContain("空滤芯");
    expect(urbanRoute.nodes[2]).toMatchObject({ title: "消防楼梯平台", type: "camp" });
    expect(weirdRoute.nodes[2]).toMatchObject({ title: "无源广播室", type: "camp" });
    expect(weirdRoute.nodes[2].camp?.rest.label).toBe("处理伤口");
    expect(wildRoute.nodes[2]).toMatchObject({ title: "拖拉机草窝", type: "camp" });
  });

  test("camp choices use location-family specific tradeoffs", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const session = createStarterSession("user-a", "Alice", "camp-family-room");
    const draft = {
      loadout: { ammo: 1, food: 1, fuel: 1, materials: 1, medicine: 1, water: 1 },
      risk: "standard" as const,
      squadIds: session.account.survivors.slice(0, 3).map((survivor) => survivor.id)
    };

    const resourceCamp = createJourney(session, draft, "water-plant", 60).nodes[2].camp!;
    const urbanCamp = createJourney(session, draft, "hospital", 60).nodes[2].camp!;
    const weirdCamp = createJourney(session, draft, "greenhouse", 60).nodes[2].camp!;
    const wildCamp = createJourney(session, draft, "farm", 60).nodes[2].camp!;

    expect(resourceCamp.cook.thirst).toBeLessThan(urbanCamp.cook.thirst);
    expect(urbanCamp.rest.fatigue).toBeLessThan(resourceCamp.rest.fatigue);
    expect(weirdCamp.scout.objectiveBonus).toBeGreaterThan(resourceCamp.scout.objectiveBonus);
    expect(weirdCamp.scout.pressure).toBeLessThan(wildCamp.scout.pressure);
    expect(wildCamp.cook.hunger).toBeLessThan(resourceCamp.cook.hunger);
  });

  test("can roll into the expanded combat enemy pools", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.99);
    const session = createStarterSession("user-a", "Alice", "expanded-enemy-room");
    const draft = {
      loadout: { ammo: 1, food: 1, fuel: 1, materials: 1, medicine: 1, water: 1 },
      risk: "standard" as const,
      squadIds: session.account.survivors.slice(0, 3).map((survivor) => survivor.id)
    };

    const urbanRoute = createJourney(session, draft, "hospital", 60);
    const wildRoute = createJourney(session, draft, "farm", 60);

    expect(urbanRoute.nodes[1].enemy?.name).toBe("电梯井群响");
    expect(urbanRoute.nodes[1].enemy?.trait).toBe("dread");
    expect(wildRoute.nodes[1].enemy?.name).toBe("铁丝犁兽");
    expect(wildRoute.nodes[1].enemy?.trait).toBe("armored");
  });

  test("summarizes route pace and upcoming journey beats", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const session = createStarterSession("user-a", "Alice", "pace-room");
    const squad = session.account.survivors.slice(0, 3);
    const journey = createJourney(
      session,
      {
        loadout: { ammo: 1, food: 1, fuel: 1, materials: 0, medicine: 1, water: 1 },
        risk: "standard",
        squadIds: squad.map((survivor) => survivor.id)
      },
      "water-plant",
      60
    );

    const startPace = routePaceFor(journey);
    const midJourney = { ...journey, currentNodeIndex: 2, condition: { ...journey.condition, distance: 2 } };
    const midPace = routePaceFor(midJourney);

    expect(startPace).toMatchObject({
      currentLabel: "事件",
      currentStop: 1,
      nextLabel: "战斗",
      progressPercent: 0,
      remainingStops: 4,
      totalStops: 5
    });
    expect(startPace.forecast.map((stop) => `${stop.index}:${stop.label}:${stop.state}`)).toEqual([
      "1:事件:active",
      "2:战斗:ahead",
      "3:营地:ahead",
      "4:商店:ahead",
      "5:撤离:ahead"
    ]);
    expect(midPace).toMatchObject({
      currentLabel: "营地",
      currentStop: 3,
      distanceSegments: 2,
      nextLabel: "商店",
      progressPercent: 50,
      remainingStops: 2
    });
    expect(midPace.forecast[0].state).toBe("done");
  });

  test("uses Chinese labels for the visible route rhythm", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const session = createStarterSession("user-a", "Alice", "zh-pace-room");
    const squad = session.account.survivors.slice(0, 3);
    const journey = createJourney(
      session,
      {
        loadout: { ammo: 1, food: 1, fuel: 1, materials: 0, medicine: 1, water: 1 },
        risk: "standard",
        squadIds: squad.map((survivor) => survivor.id)
      },
      "water-plant",
      60
    );

    const pace = routePaceFor(journey);

    expect(pace).toMatchObject({
      clockLabel: "已行进 0 小时",
      currentLabel: "事件",
      etaLabel: "约 12 小时后可撤离",
      nextLabel: "战斗"
    });
    expect(pace.forecast.map((stop) => stop.label)).toEqual(["事件", "战斗", "营地", "商店", "撤离"]);
    expect(journey.nodes[3].title).toBe("路边交易点");
    expect(journey.nodes[4].title).toBe("撤离窗口");
    expect(journey.logs.join("\n")).toContain("路线开启");
    expect(journey.logs.join("\n")).toContain("随身补给");
  });

  test("previews expedition route pressure supplies warnings and recommendations before dispatch", () => {
    const session = createStarterSession("user-a", "Alice", "route-briefing-room");
    const squad = session.account.survivors.slice(0, 2);
    const briefing = journeyRouteBriefing(
      session,
      {
        loadout: { ammo: 10, food: 10, fuel: 10, materials: 10, medicine: 10, water: 10 },
        risk: "greedy",
        squadIds: squad.map((survivor) => survivor.id)
      },
      "water-plant",
      42
    );

    expect(briefing.locationName).toBe("北区水处理厂");
    expect(briefing.routePattern).toEqual(["事件", "战斗", "营地", "商店", "撤离"]);
    expect(briefing.estimatedHours).toBe(12);
    expect(briefing.pressureLabel).toBe("高压");
    expect(briefing.fieldSupplySummary).toContain("食物 10");
    expect(briefing.survivalSummary).toContain("超载");
    expect(briefing.warnings).toEqual(
      expect.arrayContaining(["编队少于 3 人，远征无法稳定出发。", "背包超载会显著增加开局压力和行军疲劳。"])
    );
    expect(briefing.recommendations).toEqual(expect.arrayContaining(["优先补足 3-5 人编队。", "减少携带物资，或升级仓库、训练室和工坊类支援。"]));
  });

  test("route pace surfaces pending road encounters as the current beat", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.99);
    const session = createStarterSession("user-a", "Alice", "pace-road-room");
    const squad = session.account.survivors.slice(0, 3);
    const journey = createJourney(
      session,
      {
        loadout: { ammo: 0, food: 1, fuel: 0, materials: 0, medicine: 0, water: 1 },
        risk: "standard",
        squadIds: squad.map((survivor) => survivor.id)
      },
      "farm",
      55
    );

    const blocked = advanceJourneyTravel(setJourneyTravelPlan(journey, "scavenge"), squad, 55);
    const pace = routePaceFor(blocked);

    expect(blocked.pendingRoadEvent?.tone).toBe("find");
    expect(pace).toMatchObject({
      currentLabel: "路上发现",
      currentTitle: "刺线沟",
      currentStop: 1,
      nextLabel: "战斗",
      pendingRoad: true,
      progressPercent: 0
    });
  });

  test("tracks march clock and ETA for route survival pacing", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const session = createStarterSession("user-a", "Alice", "clock-room");
    const squad = session.account.survivors.slice(0, 3);
    const journey = createJourney(
      session,
      {
        loadout: { ammo: 1, food: 1, fuel: 1, materials: 0, medicine: 1, water: 1 },
        risk: "standard",
        squadIds: squad.map((survivor) => survivor.id)
      },
      "water-plant",
      60
    );

    const startPace = routePaceFor(journey);
    const rushJourney = setJourneyTravelPlan(journey, "rush");
    const forecast = forecastNextSegment(rushJourney, squad, 60);
    const advanced = advanceJourneyTravel(rushJourney, squad, 60);

    expect(startPace).toMatchObject({
      clockLabel: "已行进 0 小时",
      elapsedHours: 0,
      etaHours: 12,
      etaLabel: "约 12 小时后可撤离"
    });
    expect(forecast).toMatchObject({
      hours: 2,
      resultingElapsedHours: 2
    });
    expect(advanced.elapsedHours).toBe(2);
    expect(advanced.travelHistory[0]).toMatchObject({
      hours: 2,
      timeLabel: "2 小时"
    });
  });

  test("summarizes active journey process with route road and combat beats", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.99);
    const session = createStarterSession("user-a", "Alice", "process-digest-room");
    const squad = session.account.survivors.slice(0, 3);
    const journey = createJourney(
      session,
      {
        loadout: { ammo: 1, food: 1, fuel: 1, materials: 0, medicine: 1, water: 1 },
        risk: "standard",
        squadIds: squad.map((survivor) => survivor.id)
      },
      "water-plant",
      60
    );

    const opening = journeyProcessDigest(journey);
    const road = advanceJourneyTravel(setJourneyTravelPlan(journey, "scavenge"), squad, 60);
    const roadDigest = journeyProcessDigest(road);
    const combatStart = {
      ...journey,
      combat: createCombatForNode(journey.nodes[1], squad, 60),
      currentNodeIndex: 1
    };
    const fought = resolveCombatRound(combatStart, "strike", squad, 60);
    const combatDigest = journeyProcessDigest(fought);

    expect(opening.headline).toContain("第 1/5 站");
    expect(opening.steps.map((step) => step.label)).toEqual(expect.arrayContaining(["当前节点", "路线进度", "撤离状态"]));
    expect(road.pendingRoadEvent).not.toBeNull();
    expect(roadDigest.summary).toContain("路口待处理");
    expect(roadDigest.steps.map((step) => step.label)).toEqual(expect.arrayContaining(["最近行军", "待处理路口"]));
    expect(combatDigest.steps.map((step) => step.label)).toEqual(expect.arrayContaining(["当前战斗", "最近战斗"]));
    expect(combatDigest.steps.find((step) => step.label === "最近战斗")?.body).toContain("第 1 回合");
  });

  test("guides the next expedition action for event road and combat states", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.99);
    const session = createStarterSession("user-a", "Alice", "action-guide-room");
    const squad = session.account.survivors.slice(0, 3);
    const journey = createJourney(
      session,
      {
        loadout: { ammo: 1, food: 1, fuel: 1, materials: 0, medicine: 1, water: 1 },
        risk: "standard",
        squadIds: squad.map((survivor) => survivor.id)
      },
      "water-plant",
      60
    );

    const eventGuide = journeyActionGuide(journey);
    const road = advanceJourneyTravel(journey, squad, 60);
    const roadGuide = journeyActionGuide(road);
    const combatGuide = journeyActionGuide({
      ...journey,
      combat: createCombatForNode(journey.nodes[1], squad, 60),
      currentNodeIndex: 1
    });

    expect(eventGuide).toMatchObject({
      label: "行动指引",
      primaryAction: "选择事件行动",
      tone: "warning",
      title: "处理当前事件"
    });
    expect(eventGuide.body).toContain("等待选择");
    expect(roadGuide).toMatchObject({
      primaryAction: "处理路口",
      tone: "warning",
      title: "先处理路上事件"
    });
    expect(roadGuide.body).toContain("选择一个路口处理方式");
    expect(combatGuide).toMatchObject({
      primaryAction: "选择战斗行动",
      tone: "danger",
      title: "先处理战斗回合"
    });
    expect(combatGuide.body).toContain("攻击、防守、包扎或战术");
  });

  test("records player route choices as a decision ledger and exposes the latest decision in the process digest", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.9);
    const session = createStarterSession("user-a", "Alice", "decision-ledger-room");
    const squad = session.account.survivors.slice(0, 3);
    const journey = createJourney(
      session,
      {
        loadout: { ammo: 1, food: 1, fuel: 1, materials: 1, medicine: 1, water: 1 },
        risk: "standard",
        squadIds: squad.map((survivor) => survivor.id)
      },
      "water-plant",
      60
    );

    const road = advanceJourneyTravel(journey, squad, 60);
    const pendingTitle = road.pendingRoadEvent?.title ?? "";
    const searchChoice = road.pendingRoadEvent?.choices.find((choice) => choice.id === "search");
    expect(searchChoice).toBeDefined();

    const resolved = resolveRoadEncounterChoice(road, "search", squad, 60) as typeof road & {
      decisions?: Array<{ category: string; impactText: string; label: string; nodeTitle: string }>;
    };
    const digest = journeyProcessDigest(resolved);

    expect(resolved.decisions?.at(-1)).toMatchObject({
      category: "road",
      label: searchChoice?.label,
      nodeTitle: pendingTitle
    });
    expect(resolved.decisions?.at(-1)?.impactText).toContain("压力");
    expect(digest.steps.some((step) => step.label === "最近抉择" && step.title === searchChoice?.label)).toBe(true);
  });

  test("records camp shop and combat loot choices in the route decision summary", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const session = createStarterSession("user-a", "Alice", "decision-summary-room");
    const squad = session.account.survivors.slice(0, 3);
    const journey = createJourney(
      session,
      {
        loadout: { ammo: 1, food: 1, fuel: 1, materials: 1, medicine: 1, water: 1 },
        risk: "standard",
        squadIds: squad.map((survivor) => survivor.id)
      },
      "water-plant",
      60
    );

    journey.currentNodeIndex = 2;
    const camped = resolveCampAction(journey, "scout");
    camped.currentNodeIndex = 3;
    const shopped = resolveShopAction(camped, "intel");
    const looted = {
      ...shopped,
      pendingCombatLoot: {
        enemyName: "测试敌人",
        trophy: "测试战利",
        trait: "armored" as const
      }
    };
    const salvaged = resolveCombatLootChoice(looted, "salvage");
    const summary = journeyDecisionSummaryLines(salvaged).join("\n");

    expect(salvaged.decisions.map((decision) => decision.category)).toEqual(expect.arrayContaining(["camp", "shop", "combat-loot"]));
    expect(summary).toContain("路线决策");
    expect(summary).toContain("目标");
    expect(summary).toContain("材料 +");
  });

  test("records base commands as route decisions", () => {
    const session = createStarterSession("user-a", "Alice", "base-command-decision-room");
    const squad = session.account.survivors.slice(0, 3);
    const journey = createJourney(
      session,
      {
        loadout: { ammo: 1, food: 1, fuel: 1, materials: 1, medicine: 1, water: 1 },
        risk: "standard",
        squadIds: squad.map((survivor) => survivor.id),
        support: {
          ammoDamage: 0,
          campCook: 0,
          campRest: 0,
          campScout: 0,
          guardBlock: 1,
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
          roadSecure: 1,
          shopIntel: 0,
          shopRations: 0,
          shopService: 0,
          startingSupplies: {}
        }
      },
      "water-plant",
      60
    );

    const resolved = resolveBaseCommand(journey, "guard-relay");

    expect(resolved.decisions.at(-1)).toMatchObject({
      category: "base-command",
      label: "守卫接力"
    });
    expect(resolved.decisions.at(-1)?.impactText).toContain("压力 -");
  });

  test("guard base command combat log stays player-facing Chinese", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const session = createStarterSession("user-a", "Alice", "combat-command-copy-room");
    const squad = session.account.survivors.slice(0, 3);
    const journey = createJourney(
      session,
      {
        loadout: { ammo: 1, food: 1, fuel: 1, materials: 0, medicine: 1, water: 1 },
        risk: "standard",
        squadIds: squad.map((survivor) => survivor.id),
        support: {
          ...supportFromFacilities([]),
          guardBlock: 1,
          roadSecure: 1
        }
      },
      "water-plant",
      60
    );
    const combat = createCombatForNode(journey.nodes[1], squad, 60, journey.support)!;
    const withCombat = { ...journey, combat, currentNodeIndex: 1 };

    const resolved = resolveBaseCommand(withCombat, "guard-relay");
    const combatLog = resolved.logs.join("\n");

    expect(combatLog).toContain("基地指令：守卫接力");
    expect(combatLog).not.toMatch(/Base command|Guard relay|frontline/);
    expect(resolved.decisions.at(-1)).toMatchObject({
      category: "base-command",
      nodeTitle: "基地指令"
    });
  });

  test("combat inherits enemy stats and salvage rewards from the route node", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const session = createStarterSession("user-a", "Alice", "combat-room");
    const squad = session.account.survivors.slice(0, 3);
    const journey = createJourney(
      session,
      {
        loadout: { ammo: 1, food: 1, fuel: 1, materials: 0, medicine: 1, water: 1 },
        risk: "standard",
        squadIds: squad.map((survivor) => survivor.id)
      },
      "hospital",
      60
    );

    const combat = createCombatForNode(journey.nodes[1], squad, 60);

    expect(combat?.enemyName).toBe("走廊群");
    expect(combat?.attack).toBeGreaterThan(6);
    expect(combat?.reward.ammo).toBe(1);
    expect(combat?.enemyTraitLabel).toBe("成群");
    expect(combat?.intentLabel).toBe("游猎");
    expect(combat?.intentText).toContain("打断");
  });

  test("facility support adds field supplies and combat endurance", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const session = createStarterSession("user-a", "Alice", "support-room");
    const squad = session.account.survivors.slice(0, 3);
    const support = {
      ammoDamage: 1,
      campCook: 0,
      campRest: 0,
      campScout: 0,
      guardBlock: 1,
      lootEvade: 0,
      lootIntel: 0,
      lootMedicine: 0,
      lootSalvage: 0,
      maxHp: 8,
      openingExpose: 0,
      openingGuard: 0,
      patchHeal: 3,
      pressureRelief: 2,
      roadPush: 0,
      roadSearch: 0,
      roadSecure: 0,
      shopIntel: 0,
      shopRations: 0,
      shopService: 0,
      startingSupplies: { ammo: 1, medicine: 1 }
    };
    const journey = createJourney(
      session,
      {
        loadout: { ammo: 0, food: 1, fuel: 0, materials: 0, medicine: 0, water: 1 },
        risk: "standard",
        squadIds: squad.map((survivor) => survivor.id),
        support
      },
      "hospital",
      60
    );

    const unsupported = createCombatForNode(journey.nodes[1], squad, 60);
    const supported = createCombatForNode(journey.nodes[1], squad, 60, support);

    expect(journey.fieldSupplies.ammo).toBe(1);
    expect(journey.fieldSupplies.medicine).toBe(1);
    expect((supported?.squadMaxHp ?? 0) - (unsupported?.squadMaxHp ?? 0)).toBe(8);
  });

  test("opening base orders create guard and enemy exposure at contact start", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const session = createStarterSession("user-a", "Alice", "opening-order-room");
    const squad = session.account.survivors.slice(0, 3);
    const journey = createJourney(
      session,
      {
        loadout: { ammo: 1, food: 1, fuel: 1, materials: 0, medicine: 1, water: 1 },
        risk: "standard",
        squadIds: squad.map((survivor) => survivor.id)
      },
      "water-plant",
      60
    );
    const baseline = createCombatForNode(journey.nodes[1], squad, 60, supportFromFacilities([]))!;
    const supported = createCombatForNode(journey.nodes[1], squad, 60, {
      ...supportFromFacilities([]),
      openingExpose: 2,
      openingGuard: 3
    })!;
    const baselinePreview = combatActionPreview({ ...journey, combat: baseline, currentNodeIndex: 1 }, "strike", squad, 60)!;
    const supportedPreview = combatActionPreview({ ...journey, combat: supported, currentNodeIndex: 1 }, "strike", squad, 60)!;

    expect(supported.exposed).toBe(2);
    expect(supported.frontline.reduce((sum, combatant) => sum + combatant.guard, 0)).toBe(3);
    expect(supportedPreview.effect).not.toContain("armor absorbs");
    expect(supportedPreview.effect).not.toBe(baselinePreview.effect);
  });

  test("base command support creates limited expedition orders", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const session = createStarterSession("user-a", "Alice", "base-command-room");
    const squad = session.account.survivors.slice(0, 3);
    const journey = createJourney(
      session,
      {
        loadout: { ammo: 1, food: 0, fuel: 0, materials: 0, medicine: 0, water: 0 },
        risk: "standard",
        squadIds: squad.map((survivor) => survivor.id),
        support: {
          ...supportFromFacilities([]),
          guardBlock: 1,
          pressureRelief: 1,
          roadSearch: 2,
          roadSecure: 1,
          shopRations: 1
        }
      },
      "hospital",
      60
    );

    const options = baseCommandOptions(journey);
    const guard = options.find((option) => option.id === "guard-relay");
    const recon = options.find((option) => option.id === "recon-ping");
    const supply = options.find((option) => option.id === "supply-cache");

    expect(guard).toMatchObject({
      canUse: true,
      remainingUses: 1
    });
    expect(recon).toMatchObject({
      canUse: true,
      remainingUses: 1
    });
    expect(supply).toMatchObject({
      canUse: true,
      remainingUses: 1
    });

    const guarded = resolveBaseCommand(journey, "guard-relay");
    expect(guarded.pressure).toBeLessThan(journey.pressure);
    expect(guarded.baseCommandUses["guard-relay"]).toBe(1);
    expect(baseCommandOptions(guarded).find((option) => option.id === "guard-relay")?.remainingUses).toBe(0);
    expect(guarded.logs.join("\n")).toContain("基地指令：守卫接力");
  });

  test("recon base command exposes combat targets", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const session = createStarterSession("user-a", "Alice", "combat-command-room");
    const squad = session.account.survivors.slice(0, 3);
    const journey = createJourney(
      session,
      {
        loadout: { ammo: 1, food: 1, fuel: 1, materials: 0, medicine: 1, water: 1 },
        risk: "standard",
        squadIds: squad.map((survivor) => survivor.id),
        support: {
          ...supportFromFacilities([]),
          roadSearch: 2
        }
      },
      "water-plant",
      60
    );
    const combat = createCombatForNode(journey.nodes[1], squad, 60, journey.support)!;
    const withCombat = { ...journey, combat, currentNodeIndex: 1 };

    const pinged = resolveBaseCommand(withCombat, "recon-ping");

    expect(pinged.combat?.exposed).toBeGreaterThan(combat.exposed);
    expect(pinged.logs.join("\n")).toContain("基地指令：侦察标记");
  });

  test("combat actions show and apply actor strain", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const session = createStarterSession("user-a", "Alice", "combat-strain-room");
    const squad = session.account.survivors.slice(0, 3);
    const journey = createJourney(
      session,
      {
        loadout: { ammo: 1, food: 1, fuel: 1, materials: 0, medicine: 1, water: 1 },
        risk: "standard",
        squadIds: squad.map((survivor) => survivor.id)
      },
      "hospital",
      60
    );
    const combat = createCombatForNode(journey.nodes[1], squad, 60)!;
    const withCombat = { ...journey, combat, currentNodeIndex: 1 };
    const preview = combatActionPreview(withCombat, "strike", squad, 60);
    const striker = combat.frontline.find((line) => line.name === preview?.actorName)!;

    const resolved = resolveCombatRound(withCombat, "strike", squad, 60);
    const resolvedStriker = resolved.combat?.frontline.find((line) => line.survivorId === striker.survivorId);

    expect(preview?.strain).toBeGreaterThan(0);
    expect(preview?.effect).toContain("体力");
    expect(resolved.logs.join("\n")).toContain("行动负担：");
    expect(resolvedStriker?.stamina).toBeLessThan(striker.stamina);
  });

  test("combat actions avoid downed specialists when choosing actors", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const session = createStarterSession("user-a", "Alice", "combat-downed-role-room");
    const squad = session.account.survivors.slice(0, 3);
    const journey = createJourney(
      session,
      {
        loadout: { ammo: 1, food: 1, fuel: 1, materials: 0, medicine: 1, water: 1 },
        risk: "standard",
        squadIds: squad.map((survivor) => survivor.id)
      },
      "hospital",
      60
    );
    const combat = createCombatForNode(journey.nodes[1], squad, 60)!;
    const originalPreview = combatActionPreview({ ...journey, combat, currentNodeIndex: 1 }, "strike", squad, 60)!;
    const downedStriker = combat.frontline.find((line) => line.name === originalPreview.actorName)!;
    downedStriker.stamina = 0;
    downedStriker.status = "down";

    const preview = combatActionPreview({ ...journey, combat, currentNodeIndex: 1 }, "strike", squad, 60);
    const resolved = resolveCombatRound({ ...journey, combat, currentNodeIndex: 1 }, "strike", squad, 60);

    expect(preview?.actorName).not.toBe(downedStriker.name);
    expect(resolved.logs.join("\n")).not.toContain(`${downedStriker.name} 发起攻击`);
  });

  test("heavy loadouts create pack burden and slow route travel", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    const session = createStarterSession("user-a", "Alice", "burden-room");
    const squad = session.account.survivors.slice(0, 3);
    const journey = createJourney(
      session,
      {
        loadout: { ammo: 3, food: 3, fuel: 3, materials: 3, medicine: 3, water: 3 },
        risk: "standard",
        squadIds: squad.map((survivor) => survivor.id)
      },
      "farm",
      55
    );
    const lightJourney = createJourney(
      session,
      {
        loadout: { ammo: 0, food: 1, fuel: 0, materials: 0, medicine: 0, water: 1 },
        risk: "standard",
        squadIds: squad.map((survivor) => survivor.id)
      },
      "farm",
      55
    );

    const advanced = advanceJourneyTravel(journey, squad, 55);
    const lightAdvanced = advanceJourneyTravel(lightJourney, squad, 55);

    expect(journey.burden).toMatchObject({
      load: 18,
      tier: "overloaded"
    });
    expect(journey.pressure).toBeGreaterThan(18);
    expect(journey.logs.join("\n")).toContain("背包负重");
    expect(advanced.condition.fatigue - journey.condition.fatigue).toBeGreaterThan(lightAdvanced.condition.fatigue - lightJourney.condition.fatigue);
    expect(advanced.travelHistory[0].effects).toEqual(expect.arrayContaining([expect.stringContaining("负重 +")]));
  });

  test("carry capacity support can turn an overloaded pack into a heavy pack", () => {
    const session = createStarterSession("user-a", "Alice", "capacity-room");
    const squad = session.account.survivors.slice(0, 3);
    const loadout = { ammo: 3, food: 3, fuel: 3, materials: 3, medicine: 3, water: 3 };
    const baseline = calculateCarryBurden(squad, loadout);
    const supported = calculateCarryBurden(squad, loadout, { carryCapacity: 5 });

    expect(baseline.tier).toBe("overloaded");
    expect(supported.capacity).toBeGreaterThan(baseline.capacity);
    expect(supported.tier).toBe("heavy");
    expect(supported.fatiguePenalty).toBeLessThan(baseline.fatiguePenalty);
  });

  test("field supply spending follows priority order", () => {
    const session = createStarterSession("user-a", "Alice", "supply-room");
    const journey = createJourney(
      session,
      {
        loadout: { ammo: 0, food: 1, fuel: 0, materials: 0, medicine: 0, water: 2 },
        risk: "cautious",
        squadIds: session.account.survivors.slice(0, 3).map((survivor) => survivor.id)
      },
      "farm",
      55
    );

    expect(spendFieldSupplyFromPriority(journey, ["ammo", "water", "food"], 1)).toBe("water");
    expect(journey.fieldSupplies.water).toBe(1);
  });

  test("travel segments consume rations and update road condition", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    const session = createStarterSession("user-a", "Alice", "road-room");
    const squad = session.account.survivors.slice(0, 3);
    const journey = createJourney(
      session,
      {
        loadout: { ammo: 0, food: 1, fuel: 0, materials: 0, medicine: 0, water: 1 },
        risk: "standard",
        squadIds: squad.map((survivor) => survivor.id)
      },
      "farm",
      55
    );

    const advanced = advanceJourneyTravel(journey, squad, 55);

    expect(advanced.condition.distance).toBe(1);
    expect(advanced.condition.fatigue).toBeGreaterThan(journey.condition.fatigue);
    expect(advanced.fieldSupplies.food).toBe(0);
    expect(advanced.fieldSupplies.water).toBe(0);
    expect(advanced.pendingRoadEvent?.title).toBe("刺线沟");
    expect(advanced.logs.join("\n")).toContain("道路：路段 1");
    expect(advanced.travelHistory[0]).toMatchObject({
      effects: expect.arrayContaining(["食物 -1", "水 -1", "威胁：开阔沟渠", "威胁压力 +7%", "疲劳 +11", "压力 +6%"]),
      planLabel: "稳步行军",
      segment: 1,
      title: "田间静默",
      tone: "safe"
    });
    expect(advanced.travelHistory[0].conditionText).toContain("疲劳 16");
  });

  test("next segment forecast previews Home Behind style road attrition", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    const session = createStarterSession("user-a", "Alice", "forecast-room");
    const squad = session.account.survivors.slice(0, 3);
    const journey = createJourney(
      session,
      {
        loadout: { ammo: 0, food: 1, fuel: 0, materials: 1, medicine: 0, water: 0 },
        risk: "standard",
        squadIds: squad.map((survivor) => survivor.id)
      },
      "farm",
      55
    );

    const forecast = forecastNextSegment(setJourneySegmentTactic(journey, "brace"), squad, 55);

    expect(forecast).toMatchObject({
      planLabel: "稳步行军",
      riskLevel: "stable",
      segment: 1,
      tacticLabel: "收紧队形",
      threatLabel: "开阔沟渠"
    });
    expect(forecast.supplyUse).toEqual(expect.arrayContaining(["食物 -1", "没有水"]));
    expect(forecast.conditionDeltas).toMatchObject({
      fatigue: 8,
      hunger: 0,
      thirst: 22
    });
    expect(forecast.resultingCondition).toMatchObject({
      distance: 1,
      fatigue: 13,
      hunger: 0,
      thirst: 22
    });
    expect(forecast.notes).toEqual(expect.arrayContaining(["已反制：开阔沟渠", "战术压力 -6%"]));
  });

  test("next segment forecast warns about severe road hardship", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    const session = createStarterSession("user-a", "Alice", "hardship-forecast-room");
    const squad = session.account.survivors.slice(0, 3);
    const journey = createJourney(
      session,
      {
        loadout: { ammo: 0, food: 1, fuel: 0, materials: 1, medicine: 0, water: 0 },
        risk: "standard",
        squadIds: squad.map((survivor) => survivor.id)
      },
      "farm",
      55
    );
    journey.condition.thirst = 70;

    const forecast = forecastNextSegment(journey, squad, 55);

    expect(forecast.hardship).toMatchObject({
      label: "脱水崩溃",
      severity: "severe"
    });
    expect(forecast.hardship?.effects).toEqual(expect.arrayContaining(["战斗伤痕 +1", "压力 +8%"]));
  });

  test("next segment forecast estimates road event tone chances before advancing", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    const session = createStarterSession("user-a", "Alice", "road-forecast-room");
    const squad = session.account.survivors.slice(0, 3);
    const journey = createJourney(
      session,
      {
        loadout: { ammo: 0, food: 1, fuel: 0, materials: 1, medicine: 0, water: 0 },
        risk: "standard",
        squadIds: squad.map((survivor) => survivor.id)
      },
      "farm",
      55
    );
    journey.pressure = 72;
    journey.condition.fatigue = 66;
    journey.condition.thirst = 68;

    const exposed = forecastNextSegment(journey, squad, 55);
    const braced = forecastNextSegment(setJourneySegmentTactic(journey, "brace"), squad, 55);

    expect(exposed.roadEventForecast).toMatchObject({
      beatTitle: "刺线沟",
      likelyTone: "hazard",
      riskLabel: "险情偏高"
    });
    expect(exposed.roadEventForecast.hazardChancePercent).toBeGreaterThan(exposed.roadEventForecast.findChancePercent);
    expect(exposed.roadEventForecast.summary).toContain("路上事件");
    expect(braced.roadEventForecast.hazardChancePercent).toBeLessThan(exposed.roadEventForecast.hazardChancePercent);
    expect(braced.roadEventForecast.advice).toContain("收紧队形");
  });

  test("severe road hardships mark survivors and appear in the road diary", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    const session = createStarterSession("user-a", "Alice", "hardship-room");
    const squad = session.account.survivors.slice(0, 3);
    const journey = createJourney(
      session,
      {
        loadout: { ammo: 0, food: 1, fuel: 0, materials: 1, medicine: 0, water: 0 },
        risk: "standard",
        squadIds: squad.map((survivor) => survivor.id)
      },
      "farm",
      55
    );
    journey.condition.thirst = 70;

    const advanced = advanceJourneyTravel(journey, squad, 55);

    expect(advanced.battleScars).toBe(journey.battleScars + 1);
    expect(advanced.woundedSurvivorIds.length).toBe(1);
    expect(squad.map((survivor) => survivor.id)).toContain(advanced.woundedSurvivorIds[0]);
    expect(advanced.hardships[0]).toMatchObject({
      label: "脱水崩溃",
      segment: 1,
      severity: "severe"
    });
    expect(advanced.travelHistory[0].effects).toEqual(expect.arrayContaining(["路上事故：脱水崩溃", "战斗伤痕 +1"]));
    expect(advanced.logs.join("\n")).toContain("路上事故：脱水崩溃");
  });

  test("segment tactics change the next road advance then reset to watch mode", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    const session = createStarterSession("user-a", "Alice", "tactic-room");
    const squad = session.account.survivors.slice(0, 3);
    const draft = {
      loadout: { ammo: 0, food: 1, fuel: 0, materials: 1, medicine: 0, water: 1 },
      risk: "standard" as const,
      squadIds: squad.map((survivor) => survivor.id)
    };
    const baseline = advanceJourneyTravel(createJourney(session, draft, "farm", 55), squad, 55);
    const braced = advanceJourneyTravel(setJourneySegmentTactic(createJourney(session, draft, "farm", 55), "brace"), squad, 55);

    expect(braced.segmentTactic).toBe("observe");
    expect(braced.pressure).toBeLessThan(baseline.pressure);
    expect(braced.travelHistory[0].effects).toEqual(expect.arrayContaining(["战术：收紧队形", "战术压力 -6%"]));
    expect(braced.logs.join("\n")).toContain("路段战术：收紧队形");
  });

  test("route segments preview deterministic threats by location family", () => {
    const session = createStarterSession("user-a", "Alice", "threat-preview-room");
    const squad = session.account.survivors.slice(0, 3);
    const farmJourney = createJourney(
      session,
      {
        loadout: { ammo: 0, food: 1, fuel: 0, materials: 1, medicine: 0, water: 1 },
        risk: "standard",
        squadIds: squad.map((survivor) => survivor.id)
      },
      "farm",
      55
    );
    const hospitalJourney = createJourney(
      session,
      {
        loadout: { ammo: 0, food: 1, fuel: 0, materials: 1, medicine: 0, water: 1 },
        risk: "standard",
        squadIds: squad.map((survivor) => survivor.id)
      },
      "hospital",
      55
    );

    expect(segmentThreatFor(farmJourney)).toMatchObject({
      counterTactics: ["brace"],
      label: "开阔沟渠",
      pressure: 7
    });
    expect(segmentThreatFor(hospitalJourney)).toMatchObject({
      counterTactics: ["prospect"],
      label: "玻璃瓶颈",
      pressure: 8
    });
  });

  test("segment tactics can counter the next route threat", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    const session = createStarterSession("user-a", "Alice", "threat-counter-room");
    const squad = session.account.survivors.slice(0, 3);
    const draft = {
      loadout: { ammo: 0, food: 1, fuel: 0, materials: 1, medicine: 0, water: 1 },
      risk: "standard" as const,
      squadIds: squad.map((survivor) => survivor.id)
    };

    const exposed = advanceJourneyTravel(createJourney(session, draft, "farm", 55), squad, 55);
    const countered = advanceJourneyTravel(setJourneySegmentTactic(createJourney(session, draft, "farm", 55), "brace"), squad, 55);

    expect(exposed.travelHistory[0].effects).toEqual(expect.arrayContaining(["威胁：开阔沟渠", "威胁压力 +7%"]));
    expect(countered.travelHistory[0].effects).toEqual(expect.arrayContaining(["已反制：开阔沟渠"]));
    expect(countered.pressure).toBeLessThan(exposed.pressure);
    expect(countered.logs.join("\n")).toContain("威胁反制：开阔沟渠");
  });

  test("facility route support softens matching segment threats", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    const session = createStarterSession("user-a", "Alice", "facility-threat-room");
    const squad = session.account.survivors.slice(0, 3);
    const draft = {
      loadout: { ammo: 0, food: 1, fuel: 0, materials: 1, medicine: 0, water: 1 },
      risk: "standard" as const,
      squadIds: squad.map((survivor) => survivor.id)
    };
    const supportedDraft = {
      ...draft,
      support: {
        ...supportFromFacilities([]),
        guardBlock: 1,
        roadSecure: 2
      }
    };

    const exposed = advanceJourneyTravel(createJourney(session, draft, "farm", 55), squad, 55);
    const supported = advanceJourneyTravel(createJourney(session, supportedDraft, "farm", 55), squad, 55);

    expect(supported.pressure).toBeLessThan(exposed.pressure);
    expect(supported.travelHistory[0].effects).toEqual(expect.arrayContaining(["设施减压 -6%", "设施降疲劳 -1"]));
    expect(supported.logs.join("\n")).toContain("设施缓解：开阔沟渠");
  });

  test("prospecting a segment spends gear and can turn the road into a find", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    const session = createStarterSession("user-a", "Alice", "prospect-room");
    const squad = session.account.survivors.slice(0, 3);
    const draft = {
      loadout: { ammo: 0, food: 1, fuel: 0, materials: 1, medicine: 0, water: 1 },
      risk: "standard" as const,
      squadIds: squad.map((survivor) => survivor.id)
    };

    const baseline = advanceJourneyTravel(createJourney(session, draft, "farm", 55), squad, 55);
    const prospected = advanceJourneyTravel(setJourneySegmentTactic(createJourney(session, draft, "farm", 55), "prospect"), squad, 55);
    const baselineFinds = Object.values(baseline.bonusReward).reduce((sum, value) => sum + value, 0);
    const prospectFinds = Object.values(prospected.bonusReward).reduce((sum, value) => sum + value, 0);

    expect(prospected.segmentTactic).toBe("observe");
    expect(prospected.fieldSupplies.materials).toBe(0);
    expect(prospectFinds).toBeGreaterThan(baselineFinds);
    expect(prospected.travelHistory[0].effects).toEqual(expect.arrayContaining(["战术：搜索废墟", "消耗材料"]));
    expect(prospected.logs.join("\n")).toContain("路段战术：搜索废墟");
  });

  test("travel segments pause on road encounters before the next node", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.99);
    const session = createStarterSession("user-a", "Alice", "road-event-room");
    const squad = session.account.survivors.slice(0, 3);
    const journey = createJourney(
      session,
      {
        loadout: { ammo: 0, food: 1, fuel: 0, materials: 0, medicine: 0, water: 1 },
        risk: "standard",
        squadIds: squad.map((survivor) => survivor.id)
      },
      "farm",
      55
    );

    const advanced = advanceJourneyTravel(setJourneyTravelPlan(journey, "scavenge"), squad, 55);
    const resolved = resolveRoadEncounterChoice(advanced, "search");
    const salvageTotal = Object.values(resolved.bonusReward).reduce((sum, value) => sum + value, 0);

    expect(advanced.pendingRoadEvent).toMatchObject({
      segment: 1,
      title: "刺线沟",
      tone: "find"
    });
    expect(advanced.currentNodeIndex).toBe(0);
    expect(resolved.pendingRoadEvent).toBeNull();
    expect(resolved.currentNodeIndex).toBe(1);
    expect(resolved.roadEvents[0]).toMatchObject({ title: "刺线沟", tone: "find" });
    expect(salvageTotal).toBeGreaterThan(0);
    expect(resolved.logs.join("\n")).toContain("路上事件：刺线沟");
  });

  test("road hazards spend matching field supplies to mitigate damage", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const session = createStarterSession("user-a", "Alice", "road-hazard-room");
    const squad = session.account.survivors.slice(0, 3);
    const journey = createJourney(
      session,
      {
        loadout: { ammo: 0, food: 1, fuel: 0, materials: 1, medicine: 0, water: 1 },
        risk: "standard",
        squadIds: squad.map((survivor) => survivor.id)
      },
      "hospital",
      55
    );

    const advanced = advanceJourneyTravel(journey, squad, 55);
    const secured = resolveRoadEncounterChoice(advanced, "secure");

    expect(advanced.pendingRoadEvent).toMatchObject({
      title: "坍塌楼梯间",
      tone: "hazard"
    });
    expect(secured.fieldSupplies.materials).toBe(0);
    expect(secured.roadEvents[0].outcome).toContain("材料 -1");
    expect(secured.logs.join("\n")).toContain("路上事件：坍塌楼梯间");
  });

  test("road choice previews reveal missing gear and ambush risk before choosing", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const session = createStarterSession("user-a", "Alice", "road-choice-preview-room");
    const squad = session.account.survivors.slice(0, 3);
    const journey = createJourney(
      session,
      {
        loadout: { ammo: 0, food: 1, fuel: 0, materials: 0, medicine: 0, water: 1 },
        risk: "standard",
        squadIds: squad.map((survivor) => survivor.id)
      },
      "hospital",
      55
    );

    const advanced = advanceJourneyTravel(journey, squad, 55);
    const secure = advanced.pendingRoadEvent?.choices.find((choice) => choice.id === "secure");
    const push = advanced.pendingRoadEvent?.choices.find((choice) => choice.id === "push");

    expect(advanced.pendingRoadEvent).toMatchObject({
      title: "坍塌楼梯间",
      tone: "hazard"
    });
    expect(roadEncounterChoicePreview(advanced, secure!)).toMatchObject({
      canPayCost: false,
      costText: "缺少材料/燃料",
      outcomeLabel: "装备不足",
      riskText: "缺少对应装备会硬吃险情，并可能在下一站前引发路上伏击。",
      tone: "danger"
    });
    expect(roadEncounterChoicePreview(advanced, secure!).conditionText).toContain("疲劳 +");
    expect(roadEncounterChoicePreview(advanced, push!)).toMatchObject({
      outcomeLabel: "强行穿越",
      riskText: "险情中继续推进会把动静带到下一站，可能直接触发路上伏击。",
      tone: "danger"
    });
  });

  test("facility route support adds a road tactic that preserves field supplies", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const session = createStarterSession("user-a", "Alice", "road-support-room");
    const squad = session.account.survivors.slice(0, 3);
    const journey = createJourney(
      session,
      {
        loadout: { ammo: 0, food: 1, fuel: 0, materials: 1, medicine: 0, water: 1 },
        risk: "standard",
        squadIds: squad.map((survivor) => survivor.id),
        support: {
          ...supportFromFacilities(session.room.base.facilities),
          roadSecure: 2
        }
      },
      "hospital",
      55
    );

    const advanced = advanceJourneyTravel(journey, squad, 55);
    const supportChoice = advanced.pendingRoadEvent?.choices.find((choice) => choice.id === "support");
    const supported = resolveRoadEncounterChoice(advanced, "support");

    expect(supportChoice).toMatchObject({
      label: "基地路线支援",
      supplyPriority: []
    });
    expect(supported.fieldSupplies.materials).toBe(1);
    expect(supported.roadEvents[0].outcome).toContain("基地路线支援");
    expect(supported.logs.join("\n")).toContain("路上事件：坍塌楼梯间");
  });

  test("pushing through road hazards can trigger an ambush combat before the next stop", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const session = createStarterSession("user-a", "Alice", "road-ambush-room");
    const squad = session.account.survivors.slice(0, 3);
    const journey = createJourney(
      session,
      {
        loadout: { ammo: 0, food: 1, fuel: 0, materials: 0, medicine: 0, water: 1 },
        risk: "standard",
        squadIds: squad.map((survivor) => survivor.id)
      },
      "hospital",
      55
    );

    const advanced = advanceJourneyTravel(journey, squad, 55);
    const ambushed = resolveRoadEncounterChoice(advanced, "push", squad, 55);

    expect(advanced.pendingRoadEvent).toMatchObject({
      title: "坍塌楼梯间",
      tone: "hazard"
    });
    expect(ambushed.currentNodeIndex).toBe(1);
    expect(ambushed.nodes[1]).toMatchObject({
      title: "路上伏击",
      type: "combat"
    });
    expect(ambushed.nodes[2].title).toBe("遭遇战");
    expect(ambushed.combat?.enemyName).toBe("走廊群");
    expect(ambushed.pendingRoadEvent).toBeNull();
    expect(ambushed.logs.join("\n")).toContain("路上伏击：坍塌楼梯间");
  });

  test("controlled final travel reaches extraction without another road gate", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    const session = createStarterSession("user-a", "Alice", "clean-exit-road-room");
    const squad = session.account.survivors.slice(0, 3);
    const journey = createJourney(
      session,
      {
        loadout: { ammo: 0, food: 2, fuel: 0, materials: 0, medicine: 1, water: 2 },
        risk: "cautious",
        squadIds: squad.map((survivor) => survivor.id)
      },
      "water-plant",
      75
    );
    journey.currentNodeIndex = 3;
    journey.condition.distance = 3;
    journey.condition.fatigue = 12;
    journey.pressure = 8;

    const advanced = advanceJourneyTravel(journey, squad, 75, 4);

    expect(advanced.currentNodeIndex).toBe(4);
    expect(advanced.nodes[4].type).toBe("extraction");
    expect(advanced.pendingRoadEvent).toBeNull();
    expect(advanced.logs.join("\n")).toContain("撤离线清晰");
  });

  test("travel plans change road risk and salvage rhythm", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.6);
    const session = createStarterSession("user-a", "Alice", "travel-plan-room");
    const squad = session.account.survivors.slice(0, 3);
    const journey = createJourney(
      session,
      {
        loadout: { ammo: 0, food: 1, fuel: 0, materials: 0, medicine: 0, water: 1 },
        risk: "standard",
        squadIds: squad.map((survivor) => survivor.id)
      },
      "farm",
      55
    );

    const planned = setJourneyTravelPlan(journey, "scavenge");
    const advanced = advanceJourneyTravel(planned, squad, 55);

    expect(planned.travelPlan).toBe("scavenge");
    expect(advanced.bonusReward.food).toBe(1);
    expect(advanced.logs.join("\n")).toContain("搜刮沿途");
    expect(advanced.travelHistory[0].effects).toEqual(expect.arrayContaining(["额外搜索耗时"]));
    expect(advanced.logs.join("\n")).not.toContain("extra search time");
  });

  test("rush travel uses Chinese route effect logs", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    const session = createStarterSession("user-a", "Alice", "rush-zh-room");
    const squad = session.account.survivors.slice(0, 3);
    const journey = createJourney(
      session,
      {
        loadout: { ammo: 0, food: 1, fuel: 0, materials: 0, medicine: 0, water: 1 },
        risk: "standard",
        squadIds: squad.map((survivor) => survivor.id)
      },
      "farm",
      55
    );

    const advanced = advanceJourneyTravel(setJourneyTravelPlan(journey, "rush"), squad, 55);

    expect(advanced.travelHistory[0].effects).toEqual(expect.arrayContaining(["不作停留"]));
    expect(advanced.logs.join("\n")).not.toContain("no stops");
  });

  test("sneak travel spends cover gear to lower route pressure", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    const session = createStarterSession("user-a", "Alice", "sneak-room");
    const squad = session.account.survivors.slice(0, 3);
    const journey = createJourney(
      session,
      {
        loadout: { ammo: 0, food: 1, fuel: 1, materials: 0, medicine: 0, water: 1 },
        risk: "standard",
        squadIds: squad.map((survivor) => survivor.id)
      },
      "hospital",
      55
    );

    const advanced = advanceJourneyTravel(setJourneyTravelPlan(journey, "sneak"), squad, 55);

    expect(advanced.fieldSupplies.fuel).toBe(0);
    expect(advanced.pressure).toBeLessThan(journey.pressure);
    expect(advanced.logs.join("\n")).toContain("燃料 -1 用于掩护");
  });

  test("camp choices trade supplies for recovery and objective progress", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const session = createStarterSession("user-a", "Alice", "camp-room");
    const squad = session.account.survivors.slice(0, 3);
    const journey = createJourney(
      session,
      {
        loadout: { ammo: 0, food: 1, fuel: 1, materials: 0, medicine: 0, water: 1 },
        risk: "standard",
        squadIds: squad.map((survivor) => survivor.id)
      },
      "water-plant",
      60
    );
    journey.currentNodeIndex = 2;
    journey.condition.fatigue = 40;
    journey.condition.hunger = 35;
    journey.condition.thirst = 30;

    const scouted = resolveCampAction(journey, "scout");

    expect(scouted.fieldSupplies.fuel).toBe(0);
    expect(scouted.objectiveBonus).toBe(1);
    expect(scouted.pressure).toBeLessThan(journey.pressure);
    expect(scouted.logs.join("\n")).toContain("目标线索 +1");
  });

  test("objective preview turns route clues into visible room progress", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const session = createStarterSession("user-a", "Alice", "objective-preview-room");
    const squad = session.account.survivors.slice(0, 3);
    const journey = createJourney(
      session,
      {
        loadout: { ammo: 0, food: 1, fuel: 1, materials: 0, medicine: 0, water: 1 },
        risk: "standard",
        squadIds: squad.map((survivor) => survivor.id)
      },
      "water-plant",
      60
    );
    journey.currentNodeIndex = 2;
    session.room.base.objective.repairedParts = 4;

    const before = journeyObjectivePreview(journey, session.room.base.objective);
    const scouted = resolveCampAction(journey, "scout");
    const after = journeyObjectivePreview(scouted, session.room.base.objective);

    expect(before).toMatchObject({
      currentParts: 4,
      projectedParts: 4,
      routeBonus: 0,
      routeLabel: "本次尚无线索"
    });
    expect(after).toMatchObject({
      currentParts: 4,
      projectedParts: 5,
      remainingAfterRoute: session.room.base.objective.requiredParts - 5,
      routeBonus: 1,
      routeLabel: "本次线索 +1"
    });
    expect(after.summary).toContain("撤离后预计推进到 5/");
    expect(after.hint).toContain("完整撤离");
  });

  test("base facility support strengthens camp recovery choices", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const session = createStarterSession("user-a", "Alice", "supported-camp-room");
    const squad = session.account.survivors.slice(0, 3);
    const baseJourney = createJourney(
      session,
      {
        loadout: { ammo: 0, food: 1, fuel: 0, materials: 0, medicine: 1, water: 1 },
        risk: "standard",
        squadIds: squad.map((survivor) => survivor.id)
      },
      "hospital",
      60
    );
    baseJourney.currentNodeIndex = 2;
    baseJourney.condition.fatigue = 54;
    baseJourney.condition.hunger = 18;
    baseJourney.condition.thirst = 18;

    const supportedJourney = structuredClone(baseJourney);
    supportedJourney.support = {
      ...supportedJourney.support,
      campCook: 2,
      campRest: 2,
      campScout: 1
    };

    const unsupported = resolveCampAction(baseJourney, "rest");
    const supported = resolveCampAction(supportedJourney, "rest");

    expect(supported.condition.fatigue).toBeLessThan(unsupported.condition.fatigue);
    expect(supported.pressure).toBeLessThan(unsupported.pressure);
    expect(supported.logs.join("\n")).toContain("营地支援");
  });

  test("camp option previews include facility support notes", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const session = createStarterSession("user-a", "Alice", "camp-preview-room");
    const squad = session.account.survivors.slice(0, 3);
    const journey = createJourney(
      session,
      {
        loadout: { ammo: 0, food: 1, fuel: 1, materials: 0, medicine: 1, water: 1 },
        risk: "standard",
        squadIds: squad.map((survivor) => survivor.id)
      },
      "water-plant",
      60
    );
    journey.currentNodeIndex = 2;

    const scout = journey.nodes[2].camp?.scout;
    expect(scout).toBeDefined();
    const preview = campOptionOutcome("scout", scout!, {
      ...journey.support,
      campCook: 0,
      campRest: 0,
      campScout: 2
    });

    expect(preview.objectiveBonus).toBeGreaterThan(scout!.objectiveBonus);
    expect(preview.pressure).toBeLessThan(scout!.pressure);
    expect(preview.supportText).toContain("电台");
  });

  test("shop offers include resupply, intel, and field service choices", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const session = createStarterSession("user-a", "Alice", "shop-offers-room");
    const squad = session.account.survivors.slice(0, 3);
    const journey = createJourney(
      session,
      {
        loadout: { ammo: 0, food: 1, fuel: 1, materials: 1, medicine: 0, water: 1 },
        risk: "standard",
        squadIds: squad.map((survivor) => survivor.id)
      },
      "water-plant",
      60
    );

    expect(journey.nodes[3].shop?.offers.resupply.label).toBe("购买路上口粮");
    expect(journey.nodes[3].shop?.offers.intel.label).toBe("购买路线情报");
    expect(journey.nodes[3].shop?.offers.service.label).toBe("买修理包");
  });

  test("shop offers use location-family specific tradeoffs", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const session = createStarterSession("user-a", "Alice", "shop-family-room");
    const draft = {
      loadout: { ammo: 1, food: 1, fuel: 1, materials: 1, medicine: 1, water: 1 },
      risk: "standard" as const,
      squadIds: session.account.survivors.slice(0, 3).map((survivor) => survivor.id)
    };

    const resourceShop = createJourney(session, draft, "water-plant", 60).nodes[3].shop!;
    const urbanShop = createJourney(session, draft, "hospital", 60).nodes[3].shop!;
    const weirdShop = createJourney(session, draft, "greenhouse", 60).nodes[3].shop!;
    const wildShop = createJourney(session, draft, "farm", 60).nodes[3].shop!;

    expect(resourceShop.offers.resupply.fieldSupplyReward.water).toBeGreaterThan(urbanShop.offers.resupply.fieldSupplyReward.water);
    expect(wildShop.offers.resupply.fieldSupplyReward.food).toBeGreaterThan(resourceShop.offers.resupply.fieldSupplyReward.food);
    expect(urbanShop.offers.intel.pressure).toBeLessThan(resourceShop.offers.intel.pressure);
    expect(weirdShop.offers.intel.objectiveBonus).toBeGreaterThan(urbanShop.offers.intel.objectiveBonus);
    expect(weirdShop.offers.intel.pressureFail).toBeGreaterThan(urbanShop.offers.intel.pressureFail);
    expect(resourceShop.offers.service.fieldSupplyReward.medicine).toBeGreaterThan(urbanShop.offers.service.fieldSupplyReward.medicine);
  });

  test("shop resupply converts trade goods into field supplies with kitchen support", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const session = createStarterSession("user-a", "Alice", "shop-resupply-room");
    const squad = session.account.survivors.slice(0, 3);
    const journey = createJourney(
      session,
      {
        loadout: { ammo: 0, food: 0, fuel: 1, materials: 1, medicine: 0, water: 0 },
        risk: "standard",
        squadIds: squad.map((survivor) => survivor.id)
      },
      "water-plant",
      60
    );
    journey.currentNodeIndex = 3;
    journey.pressure = 42;
    journey.support = {
      ...journey.support,
      shopIntel: 0,
      shopRations: 1,
      shopService: 0
    };

    const resolved = resolveShopAction(journey, "resupply");

    expect(resolved.fieldSupplies.materials).toBe(0);
    expect(resolved.fieldSupplies.food).toBeGreaterThan(1);
    expect(resolved.fieldSupplies.water).toBeGreaterThan(1);
    expect(resolved.pressure).toBeLessThan(42);
    expect(resolved.logs.join("\n")).toContain("商店支援");
  });

  test("shop offer previews include radio and workshop support", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const session = createStarterSession("user-a", "Alice", "shop-preview-room");
    const squad = session.account.survivors.slice(0, 3);
    const journey = createJourney(
      session,
      {
        loadout: { ammo: 0, food: 1, fuel: 1, materials: 1, medicine: 0, water: 1 },
        risk: "standard",
        squadIds: squad.map((survivor) => survivor.id)
      },
      "hospital",
      60
    );
    const shop = journey.nodes[3].shop;
    expect(shop).toBeDefined();

    const intel = shopOfferOutcome("intel", shop!.offers.intel, {
      ...journey.support,
      shopIntel: 2,
      shopRations: 0,
      shopService: 0
    });
    const service = shopOfferOutcome("service", shop!.offers.service, {
      ...journey.support,
      shopIntel: 0,
      shopRations: 0,
      shopService: 2
    });

    expect(intel.objectiveBonus).toBeGreaterThan(shop!.offers.intel.objectiveBonus);
    expect(intel.supportText).toContain("电台");
    expect(service.reward.materials).toBeGreaterThan(shop!.offers.service.reward.materials);
    expect(service.supportText).toContain("工坊");
  });

  test("tactics expose armored enemies and improve later strike damage", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const session = createStarterSession("user-a", "Alice", "tactic-room");
    const squad = session.account.survivors.slice(0, 3);
    squad[2].level = 2;
    const journey = createJourney(
      session,
      {
        loadout: { ammo: 0, food: 1, fuel: 0, materials: 0, medicine: 1, water: 1 },
        risk: "standard",
        squadIds: squad.map((survivor) => survivor.id)
      },
      "water-plant",
      60
    );
    journey.currentNodeIndex = 1;
    journey.combat = createCombatForNode(journey.nodes[1], squad, 60);

    const exposed = resolveCombatRound(journey, "tactic", squad, 60);
    const afterStrike = resolveCombatRound(exposed, "strike", squad, 60);

    expect(exposed.combat?.exposed).toBeGreaterThan(0);
    expect(afterStrike.combat?.enemyHp).toBeLessThan(exposed.combat?.enemyHp ?? 999);
    expect(afterStrike.logs.join("\n")).toContain("发起攻击");
  });

  test("combat tracks individual survivor stamina and marks downed fighters", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const session = createStarterSession("user-a", "Alice", "frontline-room");
    const squad = session.account.survivors.slice(0, 3);
    const striker = squad.reduce((best, survivor) => (survivor.attributes.agility > best.attributes.agility ? survivor : best), squad[0]);
    const journey = createJourney(
      session,
      {
        loadout: { ammo: 0, food: 1, fuel: 0, materials: 0, medicine: 1, water: 1 },
        risk: "standard",
        squadIds: squad.map((survivor) => survivor.id)
      },
      "water-plant",
      60
    );
    journey.currentNodeIndex = 1;
    journey.combat = createCombatForNode(journey.nodes[1], squad, 60);
    if (journey.combat) {
      const strikerLine = journey.combat.frontline.find((line) => line.survivorId === striker.id);
      expect(strikerLine?.maxStamina).toBeGreaterThan(0);
      if (strikerLine) {
        strikerLine.stamina = 2;
      }
      journey.combat.squadHp = journey.combat.frontline.reduce((sum, line) => sum + line.stamina, 0);
      journey.combat.attack = 18;
      journey.combat.enemyHp = journey.combat.enemyMaxHp;
    }

    const resolved = resolveCombatRound(journey, "strike", squad, 60);
    const resolvedStriker = resolved.combat?.frontline.find((line) => line.survivorId === striker.id);

    expect(resolvedStriker?.status).toBe("down");
    expect(resolved.woundedSurvivorIds).toContain(striker.id);
    expect(resolved.battleScars).toBeGreaterThan(journey.battleScars);
    expect(resolved.logs.join("\n")).toContain("过度用力后倒下");
  });

  test("combat intent rewards matching counters", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const session = createStarterSession("user-a", "Alice", "intent-room");
    const squad = session.account.survivors.slice(0, 3);
    const journey = createJourney(
      session,
      {
        loadout: { ammo: 0, food: 1, fuel: 0, materials: 0, medicine: 1, water: 1 },
        risk: "standard",
        squadIds: squad.map((survivor) => survivor.id)
      },
      "water-plant",
      60
    );
    journey.currentNodeIndex = 1;
    journey.combat = createCombatForNode(journey.nodes[1], squad, 60);
    if (journey.combat) {
      journey.combat.enemyHp = journey.combat.enemyMaxHp;
      journey.combat.intent = "windup";
      journey.combat.intentLabel = "蓄力";
      journey.combat.intentText = "重击正在积蓄。防守可以反制。";
    }

    const guarded = resolveCombatRound(journey, "guard", squad, 60);
    const struck = resolveCombatRound(journey, "strike", squad, 60);

    expect(guarded.combat?.squadHp).toBeGreaterThan(struck.combat?.squadHp ?? 0);
    expect(guarded.logs.join("\n")).toContain("防守抓住蓄力窗口");
  });

  test("combat threat preview summarizes intent damage counters and risky actions", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const session = createStarterSession("user-a", "Alice", "threat-preview-room");
    const squad = session.account.survivors.slice(0, 3);
    const journey = createJourney(
      session,
      {
        loadout: { ammo: 0, food: 1, fuel: 0, materials: 0, medicine: 1, water: 1 },
        risk: "standard",
        squadIds: squad.map((survivor) => survivor.id)
      },
      "hospital",
      60
    );
    journey.currentNodeIndex = 1;
    journey.pressure = 64;
    journey.combat = createCombatForNode(journey.nodes[1], squad, 60);
    if (journey.combat) {
      journey.combat.intent = "prowl";
      journey.combat.intentLabel = "游猎";
      journey.combat.intentText = "它在寻找薄弱队形。攻击或战术可以打断。";
      journey.combat.attack = 9;
    }

    const preview = combatThreatPreview(journey);

    expect(preview).toMatchObject({
      counterLabels: ["攻击", "战术"],
      incomingDamage: 14,
      intentLabel: "游猎",
      pressureDamage: 3,
      pulseLabel: "群体压迫",
      riskyLabels: ["防守", "包扎"]
    });
    expect(preview?.summary).toContain("预计反击 14");
    expect(preview?.summary).toContain("压力转化伤害 +3");
    expect(preview?.warning).toContain("包扎会被游猎惩罚");
  });

  test("combat round plan highlights the best counter and risks for the current turn", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const session = createStarterSession("user-a", "Alice", "combat-plan-room");
    const squad = session.account.survivors.slice(0, 3);
    const journey = createJourney(
      session,
      {
        loadout: { ammo: 1, food: 1, fuel: 0, materials: 0, medicine: 1, water: 1 },
        risk: "standard",
        squadIds: squad.map((survivor) => survivor.id)
      },
      "hospital",
      60
    );
    journey.currentNodeIndex = 1;
    journey.pressure = 64;
    journey.combat = createCombatForNode(journey.nodes[1], squad, 60);
    if (journey.combat) {
      journey.combat.intent = "prowl";
      journey.combat.intentLabel = "游猎";
      journey.combat.intentText = "它在寻找薄弱队形。攻击或战术可以打断。";
    }

    const plan = combatRoundPlan(journey);

    expect(plan).toMatchObject({
      action: "strike",
      label: "攻击",
      tone: "warning"
    });
    expect(plan?.reason).toContain("游猎 推荐 攻击");
    expect(plan?.riskText).toContain("避开 防守 / 包扎");
  });

  test("combat command briefing combines counter action risk and survival pressure", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const session = createStarterSession("user-a", "Alice", "combat-command-briefing-room");
    const squad = session.account.survivors.slice(0, 3);
    const journey = createJourney(
      session,
      {
        loadout: { ammo: 1, food: 1, fuel: 0, materials: 0, medicine: 1, water: 1 },
        risk: "standard",
        squadIds: squad.map((survivor) => survivor.id)
      },
      "hospital",
      60
    );
    journey.currentNodeIndex = 1;
    journey.pressure = 70;
    journey.combat = createCombatForNode(journey.nodes[1], squad, 60);
    if (journey.combat) {
      journey.combat.intent = "prowl";
      journey.combat.intentLabel = "游猎";
      journey.combat.intentText = "它在寻找薄弱队形。攻击或战术可以打断。";
      journey.combat.attack = 12;
      journey.combat.squadHp = 8;
      journey.combat.squadMaxHp = 28;
    }
    const previews = (["strike", "guard", "patch", "tactic", "retreat"] as const).flatMap((action) => {
      const preview = combatActionPreview(journey, action, squad, 60);
      return preview ? [preview] : [];
    });

    const briefing = combatCommandBriefing(journey, previews);

    expect(briefing).toMatchObject({
      primaryAction: "strike",
      primaryLabel: "攻击",
      tone: "danger"
    });
    expect(briefing?.headline).toContain("优先保命和反制");
    expect(briefing?.summary).toContain("反制 攻击 / 战术");
    expect(briefing?.items.map((item) => item.id)).toEqual(["intent", "counter", "risk", "survival"]);
    expect(briefing?.items.find((item) => item.id === "survival")?.value).toBe("可能倒下");
  });

  test("combat counters build tempo and enemy stagger", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const session = createStarterSession("user-a", "Alice", "combat-tempo-room");
    const squad = session.account.survivors.slice(0, 3);
    const journey = createJourney(
      session,
      {
        loadout: { ammo: 1, food: 1, fuel: 0, materials: 0, medicine: 1, water: 1 },
        risk: "standard",
        squadIds: squad.map((survivor) => survivor.id)
      },
      "water-plant",
      60
    );
    journey.currentNodeIndex = 1;
    journey.combat = createCombatForNode(journey.nodes[1], squad, 60);
    if (journey.combat) {
      journey.combat.intent = "windup";
      journey.combat.intentLabel = "蓄力";
      journey.combat.intentText = "重击正在积蓄。防守可以反制。";
    }

    const preview = combatActionPreview(journey, "guard", squad, 60);
    const guarded = resolveCombatRound(journey, "guard", squad, 60);

    expect(preview?.effect).toContain("节奏 +1");
    expect(preview?.effect).toContain("破势 +1");
    expect(guarded.combat?.tempo).toBe(1);
    expect(guarded.combat?.stagger).toBe(1);
    expect(guarded.logs.join("\n")).toContain("战斗节奏：节奏 +1，破势 +1");
  });

  test("combat rounds keep a readable replay of action, counter, and damage", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const session = createStarterSession("user-a", "Alice", "combat-replay-room");
    const squad = session.account.survivors.slice(0, 3);
    const journey = createJourney(
      session,
      {
        loadout: { ammo: 1, food: 1, fuel: 0, materials: 0, medicine: 1, water: 1 },
        risk: "standard",
        squadIds: squad.map((survivor) => survivor.id)
      },
      "water-plant",
      60
    );
    journey.currentNodeIndex = 1;
    journey.combat = createCombatForNode(journey.nodes[1], squad, 60);
    if (journey.combat) {
      journey.combat.intent = "windup";
      journey.combat.intentLabel = "蓄力";
      journey.combat.intentText = "重击正在积蓄。防守可以反制。";
    }

    const guarded = resolveCombatRound(journey, "guard", squad, 60);
    const replay = guarded.combatHistory.at(-1);

    expect(replay).toMatchObject({
      actionLabel: "防守",
      counterText: expect.stringContaining("破势 +1"),
      round: 1,
      tone: "safe"
    });
    expect(squad.map((survivor) => survivor.name)).toContain(replay?.actorName);
    expect(replay?.enemyText).toContain("反击");
    expect(replay?.outcomeText).toContain("队伍");
  });

  test("repeated counters can break enemy posture", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const session = createStarterSession("user-a", "Alice", "combat-stagger-room");
    const squad = session.account.survivors.slice(0, 3);
    const journey = createJourney(
      session,
      {
        loadout: { ammo: 2, food: 1, fuel: 0, materials: 0, medicine: 1, water: 1 },
        risk: "standard",
        squadIds: squad.map((survivor) => survivor.id)
      },
      "water-plant",
      60
    );
    journey.currentNodeIndex = 1;
    journey.combat = createCombatForNode(journey.nodes[1], squad, 60);
    if (journey.combat) {
      journey.combat.intent = "windup";
      journey.combat.intentLabel = "蓄力";
      journey.combat.intentText = "重击正在积蓄。防守可以反制。";
    }

    const first = resolveCombatRound(journey, "guard", squad, 60);
    if (first.combat) {
      first.combat.intent = "brace";
      first.combat.intentLabel = "架势";
      first.combat.intentText = "本回合护甲上升。战术可以打破架势。";
    }
    const second = resolveCombatRound(first, "tactic", squad, 60);
    if (second.combat) {
      second.combat.intent = "prowl";
      second.combat.intentLabel = "游猎";
      second.combat.intentText = "它在寻找薄弱队形。攻击或战术可以打断。";
    }
    const broken = resolveCombatRound(second, "strike", squad, 60);

    expect(broken.combat?.stagger).toBe(0);
    expect(broken.combat?.tempo).toBe(3);
    expect(broken.combat?.exposed).toBeGreaterThan(second.combat?.exposed ?? 0);
    expect(broken.logs.join("\n")).toContain("破势触发");
  });

  test("combat action previews show damage, costs, and wind-up counters", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const session = createStarterSession("user-a", "Alice", "preview-windup-room");
    const squad = session.account.survivors.slice(0, 3);
    const journey = createJourney(
      session,
      {
        loadout: { ammo: 1, food: 1, fuel: 0, materials: 0, medicine: 1, water: 1 },
        risk: "standard",
        squadIds: squad.map((survivor) => survivor.id)
      },
      "water-plant",
      60
    );
    journey.currentNodeIndex = 1;
    journey.combat = createCombatForNode(journey.nodes[1], squad, 60);
    if (journey.combat) {
      journey.combat.intent = "windup";
      journey.combat.intentLabel = "蓄力";
      journey.combat.intentText = "重击正在积蓄。防守可以反制。";
    }

    const strike = combatActionPreview(journey, "strike", squad, 60);
    const guard = combatActionPreview(journey, "guard", squad, 60);

    expect(strike?.effect).toContain("伤害");
    expect(strike?.cost).toContain("弹药 -1");
    expect(guard?.counterTag).toBe("Counter");
    expect(guard?.effect).toContain("格挡");
    expect(guard?.risk).toContain("蓄力");
  });

  test("combat action previews call out brace, prowl, and patch risk", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const session = createStarterSession("user-a", "Alice", "preview-prowl-room");
    const squad = session.account.survivors.slice(0, 3);
    const journey = createJourney(
      session,
      {
        loadout: { ammo: 0, food: 1, fuel: 0, materials: 0, medicine: 0, water: 1 },
        risk: "standard",
        squadIds: squad.map((survivor) => survivor.id)
      },
      "water-plant",
      60
    );
    journey.currentNodeIndex = 1;
    journey.combat = createCombatForNode(journey.nodes[1], squad, 60);
    if (journey.combat) {
      journey.combat.intent = "brace";
      journey.combat.intentLabel = "架势";
      journey.combat.intentText = "本回合护甲上升。战术可以打破架势。";
    }

    const tactic = combatActionPreview(journey, "tactic", squad, 60);
    if (journey.combat) {
      journey.combat.intent = "prowl";
      journey.combat.intentLabel = "游猎";
      journey.combat.intentText = "它在寻找薄弱队形。攻击或战术可以打断。";
    }
    const strike = combatActionPreview(journey, "strike", squad, 60);
    const patch = combatActionPreview(journey, "patch", squad, 60);

    expect(tactic?.counterTag).toBe("Counter");
    expect(tactic?.effect).toContain("暴露");
    expect(strike?.counterTag).toBe("Counter");
    expect(strike?.risk).toContain("打断");
    expect(patch?.counterTag).toBe("Risk");
    expect(patch?.risk).toContain("撕开");
  });

  test("combat action previews surface enemy special pulse counters", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const session = createStarterSession("user-a", "Alice", "preview-pulse-room");
    const squad = session.account.survivors.slice(0, 3);
    const journey = createJourney(
      session,
      {
        loadout: { ammo: 1, food: 1, fuel: 0, materials: 0, medicine: 1, water: 1 },
        risk: "standard",
        squadIds: squad.map((survivor) => survivor.id)
      },
      "hospital",
      60
    );
    journey.currentNodeIndex = 1;
    journey.pressure = 64;
    journey.combat = createCombatForNode(journey.nodes[1], squad, 60);
    if (journey.combat) {
      journey.combat.intent = "maul";
      journey.combat.intentLabel = "猛击";
      journey.combat.intentText = "一次直接重击即将到来。";
    }

    const tactic = combatActionPreview(journey, "tactic", squad, 60);
    const guard = combatActionPreview(journey, "guard", squad, 60);

    expect(journey.combat?.traitPulse.label).toBe("群体压迫");
    expect(tactic?.counterTag).toBe("Counter");
    expect(tactic?.risk).toContain("反制 群体压迫");
    expect(guard?.counterTag).toBe("Risk");
    expect(guard?.risk).toContain("群体压迫");
  });

  test("tactic breaks brace intent", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const session = createStarterSession("user-a", "Alice", "brace-intent-room");
    const squad = session.account.survivors.slice(0, 3);
    const journey = createJourney(
      session,
      {
        loadout: { ammo: 0, food: 1, fuel: 0, materials: 0, medicine: 1, water: 1 },
        risk: "standard",
        squadIds: squad.map((survivor) => survivor.id)
      },
      "water-plant",
      60
    );
    journey.currentNodeIndex = 1;
    journey.combat = createCombatForNode(journey.nodes[1], squad, 60);
    if (journey.combat) {
      journey.combat.intent = "brace";
      journey.combat.intentLabel = "架势";
      journey.combat.intentText = "本回合护甲上升。战术可以打破架势。";
    }

    const resolved = resolveCombatRound(journey, "tactic", squad, 60);

    expect(resolved.combat?.exposed).toBeGreaterThan(1);
    expect(resolved.logs.join("\n")).toContain("战术打破架势");
  });

  test("bleeder enemies add persistent bleed until patched", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.25);
    const session = createStarterSession("user-a", "Alice", "bleed-room");
    const squad = session.account.survivors.slice(0, 3);
    const journey = createJourney(
      session,
      {
        loadout: { ammo: 0, food: 1, fuel: 0, materials: 0, medicine: 1, water: 1 },
        risk: "standard",
        squadIds: squad.map((survivor) => survivor.id)
      },
      "fuel-stop",
      60
    );
    journey.currentNodeIndex = 1;
    journey.combat = createCombatForNode(journey.nodes[1], squad, 60);

    const bleeding = resolveCombatRound(journey, "strike", squad, 60);
    const patched = resolveCombatRound(bleeding, "patch", squad, 60);

    expect(bleeding.combat?.bleed).toBeGreaterThan(0);
    expect(patched.combat?.bleed).toBeLessThan(bleeding.combat?.bleed ?? 0);
  });

  test("enemy special pulses log countered and uncountered monster pressure", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const session = createStarterSession("user-a", "Alice", "pulse-log-room");
    const squad = session.account.survivors.slice(0, 3);
    const journey = createJourney(
      session,
      {
        loadout: { ammo: 0, food: 1, fuel: 0, materials: 0, medicine: 1, water: 1 },
        risk: "standard",
        squadIds: squad.map((survivor) => survivor.id)
      },
      "water-plant",
      60
    );
    journey.currentNodeIndex = 1;
    journey.combat = createCombatForNode(journey.nodes[1], squad, 60);
    if (journey.combat) {
      journey.combat.intent = "maul";
      journey.combat.intentLabel = "猛击";
      journey.combat.intentText = "一次直接重击即将到来。";
      journey.combat.exposed = 0;
      journey.combat.armor = 2;
    }

    const hardened = resolveCombatRound(journey, "strike", squad, 60);
    const countered = resolveCombatRound(journey, "tactic", squad, 60);

    expect(hardened.combat?.armor).toBe(3);
    expect(hardened.logs.join("\n")).toContain("特性脉冲：甲壳闭锁");
    expect(countered.combat?.armor).toBe(2);
    expect(countered.logs.join("\n")).toContain("特性反制：甲壳闭锁");
  });

  test("low-pressure armored counterattacks spread damage instead of instantly downing a healthy striker", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const session = createStarterSession("user-a", "Alice", "armored-counter-room");
    const squad = session.account.survivors.slice(0, 3);
    const striker = squad.reduce((best, survivor) => (survivor.attributes.agility > best.attributes.agility ? survivor : best), squad[0]);
    const journey = createJourney(
      session,
      {
        loadout: { ammo: 0, food: 1, fuel: 0, materials: 0, medicine: 1, water: 1 },
        risk: "cautious",
        squadIds: squad.map((survivor) => survivor.id)
      },
      "water-plant",
      75
    );
    journey.currentNodeIndex = 1;
    journey.pressure = 6;
    journey.combat = createCombatForNode(journey.nodes[1], squad, 75);
    if (journey.combat) {
      journey.combat.enemyTrait = "armored";
      journey.combat.enemyTraitLabel = "装甲";
      journey.combat.enemyTraitText = "外壳会惩罚盲目攻击。";
      journey.combat.traitPulse = {
        counterActions: ["tactic"],
        label: "甲壳闭锁",
        text: "未暴露时护甲会继续收紧。",
        warning: "未暴露时盲目攻击会让护甲继续变厚。"
      };
      journey.combat.attack = 24;
      journey.combat.armor = 3;
      journey.combat.exposed = 0;
      journey.combat.intent = "maul";
      journey.combat.intentLabel = "猛击";
      journey.combat.intentText = "一次直接重击即将到来。";
    }

    const resolved = resolveCombatRound(journey, "strike", squad, 75);
    const resolvedStriker = resolved.combat?.frontline.find((combatant) => combatant.survivorId === striker.id);

    expect(resolvedStriker?.status).not.toBe("down");
    expect(resolved.battleScars).toBe(journey.battleScars);
    expect(resolved.logs.join("\n")).toContain("队形分担");
  });

  test("retreat exits combat with pressure and route progress", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const session = createStarterSession("user-a", "Alice", "retreat-room");
    const squad = session.account.survivors.slice(0, 3);
    const journey = createJourney(
      session,
      {
        loadout: { ammo: 0, food: 1, fuel: 0, materials: 0, medicine: 1, water: 1 },
        risk: "standard",
        squadIds: squad.map((survivor) => survivor.id)
      },
      "hospital",
      60
    );
    journey.currentNodeIndex = 1;
    journey.combat = createCombatForNode(journey.nodes[1], squad, 60);

    const retreated = resolveCombatRound(journey, "retreat", squad, 60);

    expect(retreated.currentNodeIndex).toBe(2);
    expect(retreated.pressure).toBeGreaterThan(journey.pressure);
    expect(retreated.logs.join("\n")).toContain("队伍顶着压力撤退");
  });

  test("combat victory records trophies and battle scars based on remaining stamina", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const session = createStarterSession("user-a", "Alice", "aftermath-room");
    const squad = session.account.survivors.slice(0, 3);
    const journey = createJourney(
      session,
      {
        loadout: { ammo: 3, food: 1, fuel: 0, materials: 0, medicine: 0, water: 1 },
        risk: "standard",
        squadIds: squad.map((survivor) => survivor.id)
      },
      "water-plant",
      75
    );
    journey.currentNodeIndex = 1;
    journey.combat = createCombatForNode(journey.nodes[1], squad, 75);
    if (journey.combat) {
      journey.combat.enemyHp = 3;
      journey.combat.squadHp = Math.floor(journey.combat.squadMaxHp * 0.3);
    }

    const won = resolveCombatRound(journey, "strike", squad, 75);

    expect(won.trophies).toContain("装甲碎片");
    expect(won.battleScars).toBeGreaterThan(0);
    expect(won.pendingCombatLoot?.trophy).toBe("装甲碎片");
    expect(won.currentNodeIndex).toBe(1);
    expect(won.logs.join("\n")).toContain("战斗伤痕");
  });

  test("combat loot choices trade victory time for resources or objective clues", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const session = createStarterSession("user-a", "Alice", "loot-choice-room");
    const squad = session.account.survivors.slice(0, 3);
    const journey = createJourney(
      session,
      {
        loadout: { ammo: 3, food: 1, fuel: 0, materials: 0, medicine: 0, water: 1 },
        risk: "standard",
        squadIds: squad.map((survivor) => survivor.id)
      },
      "water-plant",
      75
    );
    journey.currentNodeIndex = 1;
    journey.combat = createCombatForNode(journey.nodes[1], squad, 75);
    if (journey.combat) {
      journey.combat.enemyHp = 3;
    }

    const won = resolveCombatRound(journey, "strike", squad, 75);
    const intel = resolveCombatLootChoice(won, "intel");
    const salvage = resolveCombatLootChoice(won, "salvage");

    expect(intel.pendingCombatLoot).toBeNull();
    expect(intel.objectiveBonus).toBe(won.objectiveBonus + 1);
    expect(intel.logs.join("\n")).toContain("搜寻线索");
    expect(salvage.bonusReward.materials).toBeGreaterThan(won.bonusReward.materials);
  });

  test("facility support improves matching combat loot choices", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const session = createStarterSession("user-a", "Alice", "loot-facility-room");
    const squad = session.account.survivors.slice(0, 3);
    const journey = createJourney(
      session,
      {
        loadout: { ammo: 3, food: 1, fuel: 0, materials: 0, medicine: 0, water: 1 },
        risk: "standard",
        squadIds: squad.map((survivor) => survivor.id)
      },
      "water-plant",
      75
    );
    journey.currentNodeIndex = 1;
    journey.combat = createCombatForNode(journey.nodes[1], squad, 75);
    journey.support = {
      ...journey.support,
      lootIntel: 1,
      lootSalvage: 2
    };
    if (journey.combat) {
      journey.combat.enemyHp = 3;
    }

    const won = resolveCombatRound(journey, "strike", squad, 75);
    const salvage = resolveCombatLootChoice(won, "salvage");
    const intel = resolveCombatLootChoice(won, "intel");

    expect(salvage.bonusReward.materials - won.bonusReward.materials).toBe(4);
    expect(salvage.bonusReward.fuel - won.bonusReward.fuel).toBe(2);
    expect(salvage.logs.join("\n")).toContain("工坊 +2 战利品");
    expect(intel.objectiveBonus - won.objectiveBonus).toBe(2);
    expect(intel.logs.join("\n")).toContain("电台 +1 目标线索");
  });

  test("field dress loot choice reduces battle scars", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const session = createStarterSession("user-a", "Alice", "loot-medicine-room");
    const squad = session.account.survivors.slice(0, 3);
    const journey = createJourney(
      session,
      {
        loadout: { ammo: 3, food: 1, fuel: 0, materials: 0, medicine: 0, water: 1 },
        risk: "standard",
        squadIds: squad.map((survivor) => survivor.id)
      },
      "water-plant",
      75
    );
    journey.currentNodeIndex = 1;
    journey.combat = createCombatForNode(journey.nodes[1], squad, 75);
    if (journey.combat) {
      journey.combat.enemyHp = 3;
      journey.combat.squadHp = Math.floor(journey.combat.squadMaxHp * 0.3);
    }

    const won = resolveCombatRound(journey, "strike", squad, 75);
    const dressed = resolveCombatLootChoice(won, "medicine");

    expect(dressed.battleScars).toBeLessThan(won.battleScars);
    expect(dressed.bonusReward.medicine).toBeGreaterThan(won.bonusReward.medicine);
    expect(dressed.logs.join("\n")).toContain("战伤 -1");
  });

  test("combat loot plan recommends treatment or evacuation from current risk", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const session = createStarterSession("user-a", "Alice", "loot-plan-room");
    const squad = session.account.survivors.slice(0, 3);
    const journey = createJourney(
      session,
      {
        loadout: { ammo: 3, food: 1, fuel: 0, materials: 0, medicine: 0, water: 1 },
        risk: "standard",
        squadIds: squad.map((survivor) => survivor.id)
      },
      "water-plant",
      75
    );
    journey.currentNodeIndex = 1;
    journey.combat = createCombatForNode(journey.nodes[1], squad, 75);
    if (journey.combat) {
      journey.combat.enemyHp = 3;
      journey.combat.squadHp = Math.floor(journey.combat.squadMaxHp * 0.25);
    }

    const won = resolveCombatRound(journey, "strike", squad, 75);
    const treatmentPlan = combatLootPlan(won);
    const pressurePlan = combatLootPlan({ ...won, battleScars: 0, pressure: 82, condition: { ...won.condition, fatigue: 70 } });

    expect(treatmentPlan.items[0].id).toBe("medicine");
    expect(treatmentPlan.summary).toContain("先处理战伤");
    expect(pressurePlan.items[0].id).toBe("evade");
    expect(pressurePlan.summary).toContain("先保住返程安全");
  });

  test("extraction preview compares early return with full extraction rewards and objective progress", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const session = createStarterSession("user-a", "Alice", "extraction-preview-room");
    const squad = session.account.survivors.slice(0, 3);
    const journey = createJourney(
      session,
      {
        loadout: { ammo: 0, food: 2, fuel: 1, materials: 0, medicine: 1, water: 2 },
        risk: "standard",
        squadIds: squad.map((survivor) => survivor.id)
      },
      "water-plant",
      60
    );
    journey.bonusReward.materials = 2;
    journey.bonusReward.medicine = 1;
    journey.objectiveBonus = 1;
    journey.battleScars = 1;
    journey.condition.fatigue = 42;
    journey.pressure = 57;
    journey.currentNodeIndex = 2;
    session.room.base.objective.repairedParts = 4;

    const preview = journeyExtractionPreview(journey, session.room.base.objective);
    const early = preview.options.find((option) => option.id === "early");
    const complete = preview.options.find((option) => option.id === "complete");

    expect(preview.canExtractNow).toBe(true);
    expect(preview.currentStop).toBe(3);
    expect(preview.remainingStops).toBe(2);
    expect(preview.bankedReward.materials).toBe(2);
    expect(preview.fieldSupplySummary).toContain("食物");
    expect(early).toMatchObject({
      label: "现在返程",
      objectiveProjectedMin: 5,
      objectiveProjectedMax: 5,
      rewardScalePercent: 40
    });
    expect(early?.summary).toContain("保住已入袋");
    expect(early?.riskSummary).toContain("战斗伤痕 1");
    expect(complete).toMatchObject({
      label: "完整撤离",
      objectiveProjectedMin: 5,
      objectiveProjectedMax: 7,
      rewardScalePercent: 100
    });
    expect(complete?.summary).toContain("地点主体进度 +0-2");
  });

  test("emergency return can settle from blocked combat loot or road states", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.99);
    const session = createStarterSession("user-a", "Alice", "emergency-return-room");
    const squad = session.account.survivors.slice(0, 3);
    const journey = createJourney(
      session,
      {
        loadout: { ammo: 1, food: 1, fuel: 1, materials: 0, medicine: 1, water: 1 },
        risk: "standard",
        squadIds: squad.map((survivor) => survivor.id)
      },
      "water-plant",
      60
    );

    const roadBlocked = advanceJourneyTravel(setJourneyTravelPlan(journey, "scavenge"), squad, 60);
    const roadReturn = resolveJourneyExtraction(roadBlocked);

    expect(roadBlocked.pendingRoadEvent).not.toBeNull();
    expect(roadReturn.extractionStatus).toBe("early");
    expect(roadReturn.pendingRoadEvent).toBeNull();
    expect(roadReturn.logs.join("\n")).toContain("紧急返程");
    expect(roadReturn.logs.join("\n")).toContain("保住已入袋");

    journey.currentNodeIndex = 1;
    journey.combat = createCombatForNode(journey.nodes[1], squad, 60);
    if (journey.combat) {
      journey.combat.enemyHp = 3;
    }
    const won = resolveCombatRound(journey, "strike", squad, 60);
    const lootReturn = resolveJourneyExtraction(won);

    expect(won.pendingCombatLoot).not.toBeNull();
    expect(lootReturn.extractionStatus).toBe("early");
    expect(lootReturn.pendingCombatLoot).toBeNull();
    expect(lootReturn.combat).toBeNull();
    expect(lootReturn.logs.join("\n")).toContain("紧急返程");
  });
});
