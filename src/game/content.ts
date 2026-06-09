import type { BaseResources, Facility, GameState, Location, LocationFamily, ResourceBundle, Survivor } from "./types";
import { facilityBlueprints } from "./facilities";

export const emptyResources = (): ResourceBundle => ({
  food: 0,
  water: 0,
  materials: 0,
  medicine: 0,
  fuel: 0,
  ammo: 0
});

export const starterResources: BaseResources = {
  food: 18,
  water: 13,
  materials: 24,
  medicine: 8,
  fuel: 9,
  ammo: 7,
  morale: 61,
  danger: 17
};

export const starterSurvivors: Survivor[] = [
  {
    id: "lin",
    name: "林岚",
    codename: "管线耳",
    profession: "斥候",
    role: "侦察员",
    attributes: {
      stamina: 62,
      agility: 76,
      technical: 58,
      medical: 42,
      social: 45,
      willpower: 68,
      luck: 73,
      infectionResistance: 61
    },
    traits: ["听管道像听天气预报", "脚步轻"],
    flaw: "见到封条就想撕",
    fatigue: 12,
    injuries: [],
    note: "能把危险说得像午餐菜单。"
  },
  {
    id: "mara",
    name: "玛拉",
    codename: "绷带账房",
    profession: "医生",
    role: "医疗员",
    attributes: {
      stamina: 48,
      agility: 44,
      technical: 51,
      medical: 82,
      social: 63,
      willpower: 78,
      luck: 49,
      infectionResistance: 74
    },
    traits: ["药品精算", "冷笑话止痛"],
    flaw: "会把所有人都按病人管理",
    fatigue: 7,
    injuries: [],
    note: "她的急救箱比基地会议更有秩序。"
  },
  {
    id: "otto",
    name: "奥托",
    codename: "三号扳手",
    profession: "工程师",
    role: "工程员",
    attributes: {
      stamina: 59,
      agility: 37,
      technical: 86,
      medical: 35,
      social: 38,
      willpower: 64,
      luck: 41,
      infectionResistance: 57
    },
    traits: ["废料再就业", "发电机安抚师"],
    flaw: "相信每台机器都有脾气",
    fatigue: 15,
    injuries: [],
    note: "如果世界坏了，他会先问有没有保修。"
  },
  {
    id: "pavel",
    name: "帕维尔",
    codename: "铁门",
    profession: "守卫",
    role: "守夜人",
    attributes: {
      stamina: 78,
      agility: 46,
      technical: 32,
      medical: 25,
      social: 35,
      willpower: 57,
      luck: 34,
      infectionResistance: 42
    },
    traits: ["护送专家", "不相信自动门"],
    flaw: "看到补给箱会过度自信",
    fatigue: 20,
    injuries: [],
    note: "他能挡门，也常常忘了门往哪边开。"
  },
  {
    id: "niko",
    name: "尼科",
    codename: "空袋",
    profession: "拾荒者",
    role: "后勤员",
    attributes: {
      stamina: 52,
      agility: 61,
      technical: 43,
      medical: 28,
      social: 46,
      willpower: 39,
      luck: 70,
      infectionResistance: 38
    },
    traits: ["能从无里翻出半个有", "路线记忆"],
    flaw: "把危险也当资源",
    fatigue: 18,
    injuries: [],
    note: "他的背包里总有一件没人承认需要的东西。"
  },
  {
    id: "vera",
    name: "薇拉",
    codename: "锅盖外交官",
    profession: "厨师/农艺师",
    role: "后勤员",
    attributes: {
      stamina: 50,
      agility: 36,
      technical: 40,
      medical: 31,
      social: 72,
      willpower: 52,
      luck: 48,
      infectionResistance: 46
    },
    traits: ["士气料理", "会和霉菌谈判"],
    flaw: "坚持给每场危机命名",
    fatigue: 9,
    injuries: [],
    note: "她说汤还能喝，大家就假装相信。"
  },
  {
    id: "sable",
    name: "赛博",
    codename: "坏信号",
    profession: "谈判者",
    role: "侦察员",
    attributes: {
      stamina: 42,
      agility: 55,
      technical: 49,
      medical: 22,
      social: 86,
      willpower: 67,
      luck: 58,
      infectionResistance: 44
    },
    traits: ["能把抢劫谈成借用", "广播嗓"],
    flaw: "对神秘按钮没有抵抗力",
    fatigue: 5,
    injuries: [],
    note: "他说服力很强，尤其在没人听懂的时候。"
  },
  {
    id: "jun",
    name: "骏",
    codename: "油门诗人",
    profession: "司机",
    role: "后勤员",
    attributes: {
      stamina: 57,
      agility: 69,
      technical: 62,
      medical: 21,
      social: 42,
      willpower: 50,
      luck: 64,
      infectionResistance: 39
    },
    traits: ["省油路线", "撤离直觉"],
    flaw: "会给每辆车取难听的名字",
    fatigue: 11,
    injuries: [],
    note: "末日之前他开网约车，末日之后他还是接单。"
  },
  {
    id: "moth",
    name: "莫思",
    codename: "夜光人",
    profession: "怪人/异能者",
    role: "守夜人",
    attributes: {
      stamina: 45,
      agility: 45,
      technical: 45,
      medical: 45,
      social: 45,
      willpower: 88,
      luck: 80,
      infectionResistance: 82
    },
    traits: ["异常亲和", "梦境预报"],
    flaw: "偶尔和墙上的影子开会",
    fatigue: 0,
    injuries: [],
    note: "他说自己不是发光，只是世界太暗。"
  }
];

export const starterLocations: Location[] = [
  {
    id: "water-plant",
    name: "北区水处理厂",
    family: "resources",
    risk: 39,
    recommendedStats: ["technical", "medical", "willpower"],
    reward: { food: 0, water: 10, materials: 2, medicine: 1, fuel: 0, ammo: 0 },
    tags: ["水源", "潮湿", "感染风险"],
    dossier: "旧阀门还在咳嗽，像有人在地下练习求救。"
  },
  {
    id: "hospital",
    name: "第七人民医院",
    family: "urban",
    risk: 67,
    recommendedStats: ["medical", "willpower", "infectionResistance"],
    reward: { food: 0, water: 0, materials: 2, medicine: 9, fuel: 0, ammo: 1 },
    tags: ["药品", "感染", "走廊回声"],
    dossier: "药柜很可能还满着，前提是你不介意它们被什么东西守着。"
  },
  {
    id: "fuel-stop",
    name: "环线加油站",
    family: "resources",
    risk: 52,
    recommendedStats: ["stamina", "technical", "agility"],
    reward: { food: 1, water: 0, materials: 3, medicine: 0, fuel: 8, ammo: 0 },
    tags: ["燃料", "暴露", "可撤离"],
    dossier: "招牌还亮着一半，像在坚持营业到世界结束。"
  },
  {
    id: "river-filter",
    name: "河湾净水站",
    family: "resources",
    risk: 48,
    recommendedStats: ["technical", "stamina", "infectionResistance"],
    reward: { food: 0, water: 8, materials: 3, medicine: 0, fuel: 2, ammo: 0 },
    tags: ["水源", "滤芯", "河雾"],
    dossier: "净水站半截沉在河雾里，滤芯仓的门却每天换一把锁。"
  },
  {
    id: "freight-yard",
    name: "西货运编组场",
    family: "resources",
    risk: 57,
    recommendedStats: ["technical", "stamina", "luck"],
    reward: { food: 1, water: 1, materials: 8, medicine: 0, fuel: 3, ammo: 1 },
    tags: ["材料", "货柜", "露天轨道"],
    dossier: "货柜门贴着褪色封条，风一吹，整片轨道都像在数钥匙。"
  },
  {
    id: "cold-storage",
    name: "东港冷库",
    family: "resources",
    risk: 61,
    recommendedStats: ["stamina", "technical", "infectionResistance"],
    reward: { food: 7, water: 2, materials: 2, medicine: 1, fuel: 2, ammo: 0 },
    tags: ["食物", "低温", "备用电源"],
    dossier: "冷库还在断续供电，门缝里飘出来的白气像有人轻轻叹气。"
  },
  {
    id: "greenhouse",
    name: "异常温室",
    family: "weird",
    risk: 74,
    recommendedStats: ["willpower", "luck", "infectionResistance"],
    reward: { food: 8, water: 2, materials: 1, medicine: 3, fuel: 0, ammo: 0 },
    tags: ["怪异", "食物", "精神压力"],
    dossier: "里面的植物会朝你转头。至少目前只有植物。"
  },
  {
    id: "blackbox-theater",
    name: "黑箱剧院",
    family: "weird",
    risk: 69,
    recommendedStats: ["willpower", "social", "luck"],
    reward: { food: 1, water: 0, materials: 4, medicine: 3, fuel: 0, ammo: 1 },
    tags: ["怪异", "舞台", "黑色信号"],
    dossier: "观众席空无一人，掌声却总在错误的地方响起来。"
  },
  {
    id: "folded-apartments",
    name: "折叠公寓",
    family: "weird",
    risk: 78,
    recommendedStats: ["willpower", "technical", "infectionResistance"],
    reward: { food: 2, water: 2, materials: 3, medicine: 4, fuel: 0, ammo: 0 },
    tags: ["怪异", "住户门牌", "空间错位"],
    dossier: "每层楼都声称自己是一楼，电梯按钮多到像一份供词。"
  },
  {
    id: "mirror-market",
    name: "镜面旧货市",
    family: "weird",
    risk: 71,
    recommendedStats: ["social", "luck", "willpower"],
    reward: { food: 2, water: 1, materials: 5, medicine: 2, fuel: 0, ammo: 1 },
    tags: ["怪异", "交易", "倒影"],
    dossier: "摊主们都背对着你做买卖，镜子里却能看见他们在点头。"
  },
  {
    id: "choir-substation",
    name: "合唱变电站",
    family: "weird",
    risk: 82,
    recommendedStats: ["technical", "willpower", "infectionResistance"],
    reward: { food: 0, water: 1, materials: 6, medicine: 2, fuel: 4, ammo: 0 },
    tags: ["怪异", "电力", "黑色信号"],
    dossier: "变压器发出整齐的和声，每一次升调都会让指南针发烫。"
  },
  {
    id: "school",
    name: "雾桥中学",
    family: "urban",
    risk: 45,
    recommendedStats: ["social", "agility", "luck"],
    reward: { food: 2, water: 2, materials: 5, medicine: 1, fuel: 0, ammo: 0 },
    tags: ["材料", "旧档案", "低语"],
    dossier: "广播室每天正午自动播放课间操，没人承认设置过。"
  },
  {
    id: "metro-east",
    name: "东环地铁站",
    family: "urban",
    risk: 58,
    recommendedStats: ["agility", "technical", "willpower"],
    reward: { food: 1, water: 1, materials: 6, medicine: 1, fuel: 1, ammo: 1 },
    tags: ["材料", "地下", "广播"],
    dossier: "闸机还在计数，尽管已经很久没有人真正刷卡进站。"
  },
  {
    id: "civic-archive",
    name: "市政档案馆",
    family: "urban",
    risk: 54,
    recommendedStats: ["technical", "social", "willpower"],
    reward: { food: 0, water: 1, materials: 5, medicine: 1, fuel: 0, ammo: 2 },
    tags: ["档案", "路线情报", "封存"],
    dossier: "档案柜排得像墓碑，最里面那排抽屉会自己换标签。"
  },
  {
    id: "rooftop-mall",
    name: "屋顶商场",
    family: "urban",
    risk: 63,
    recommendedStats: ["agility", "social", "stamina"],
    reward: { food: 4, water: 2, materials: 4, medicine: 2, fuel: 0, ammo: 1 },
    tags: ["商店", "高处", "幸存者痕迹"],
    dossier: "自动扶梯停在半空，顶层广告牌还在向天空推销打折套餐。"
  },
  {
    id: "farm",
    name: "南坡农场",
    family: "wilds",
    risk: 36,
    recommendedStats: ["stamina", "social", "luck"],
    reward: { food: 10, water: 1, materials: 2, medicine: 0, fuel: 1, ammo: 0 },
    tags: ["食物", "荒野", "低风险"],
    dossier: "稻草人排成一列，像在等迟到的公交。"
  },
  {
    id: "salt-dike",
    name: "盐雾堤岸",
    family: "wilds",
    risk: 49,
    recommendedStats: ["stamina", "agility", "infectionResistance"],
    reward: { food: 4, water: 4, materials: 3, medicine: 0, fuel: 1, ammo: 0 },
    tags: ["荒野", "水路", "盐雾"],
    dossier: "堤岸白得像旧骨头，潮声会把远处的脚步藏起来。"
  },
  {
    id: "old-orchard",
    name: "旧果园",
    family: "wilds",
    risk: 42,
    recommendedStats: ["social", "luck", "medical"],
    reward: { food: 8, water: 1, materials: 1, medicine: 2, fuel: 0, ammo: 0 },
    tags: ["食物", "药草", "低语蜂箱"],
    dossier: "果树还在结果，只是枝条会在没人看见的时候换位置。"
  },
  {
    id: "ridge-campsite",
    name: "岭上露营地",
    family: "wilds",
    risk: 46,
    recommendedStats: ["stamina", "medical", "luck"],
    reward: { food: 5, water: 3, materials: 2, medicine: 2, fuel: 0, ammo: 1 },
    tags: ["营地", "药草", "旧帐篷"],
    dossier: "帐篷拉链全都从里面扣着，火塘里却还压着温热的灰。"
  },
  {
    id: "windmill-hamlet",
    name: "风车小村",
    family: "wilds",
    risk: 55,
    recommendedStats: ["technical", "social", "willpower"],
    reward: { food: 6, water: 2, materials: 4, medicine: 0, fuel: 2, ammo: 0 },
    tags: ["荒野", "风车", "住户线索"],
    dossier: "风车叶片转得太慢，像在给远处某个看不见的人打手势。"
  }
];

export function locationContentBreadth(locations: Location[] = starterLocations): Record<LocationFamily, number> {
  return locations.reduce(
    (counts, location) => ({
      ...counts,
      [location.family]: counts[location.family] + 1
    }),
    { resources: 0, urban: 0, weird: 0, wilds: 0 } satisfies Record<LocationFamily, number>
  );
}

export const starterFacilities: Facility[] = [
  ...facilityBlueprints
];

export const starterGameState: GameState = {
  resources: starterResources,
  survivors: starterSurvivors,
  locations: starterLocations,
  facilities: starterFacilities,
  feed: [
    {
      id: "feed-0",
      kind: "system",
      title: "避难所档案系统上线",
      body: "档案室表示：如果世界继续结束，请至少按格式提交战报。",
      timestamp: "第 12 日 08:10"
    }
  ]
};
