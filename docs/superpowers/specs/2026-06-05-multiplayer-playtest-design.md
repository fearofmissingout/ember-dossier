# Ember Dossier 多人完整试玩版设计

日期：2026-06-05

## 1. 试玩版目标

本阶段目标是把当前共享 demo 升级为一版可以让朋友正常试玩的多人版本。玩家应能完成从登录、账号成长、创建或加入房间、共同经营房间基地、派遣远征、查看战报、结算回账号的完整闭环。

试玩版不是最终完整游戏。它优先证明这些事情：

- 每个玩家有自己的账号档案、资源、幸存者和局外成长。
- 一个房间对应一局共同基地，不是某个玩家的个人基地。
- 玩家把自己的幸存者和少量资源带入房间。
- 房间内共同维护基地状态、公共资源、公共危险和目标。
- 远征使用来自多个玩家的幸存者和投入资源。
- 远征结果同时改变房间状态和各玩家账号资产。
- 手机浏览器可以完成主要操作。
- 刷新页面或换设备后，账号和房间数据不会丢失。

核心闭环：

```text
登录
-> 个人基地
-> 查看账号资源和幸存者
-> 创建或加入房间
-> 向房间投入资源
-> 指派幸存者进入房间
-> 共同基地准备远征
-> 多人远征结算
-> 房间状态变化
-> 玩家账号获得经验、奖励、伤病或疲劳
-> 回到个人基地继续成长
```

## 2. 设计原则

第一原则：

```text
账号拥有长期资产，房间拥有本局共同基地，远征负责消耗和结算。
```

账号成长采用中成长路线。账号越玩越有选择空间和准备能力，但不能把房间风险抹平。老玩家可以更稳定地处理低难度，新朋友加入时也必须能有贡献。

平衡目标：

- 永久成长影响约 30%-40% 的成功把握。
- 房间内决策影响约 40%-50%。
- 随机事件和风险保留约 10%-20%。
- 高级幸存者更可靠，但仍会疲劳、受伤、失踪。
- 账号基地提高恢复、准备和解锁能力，不直接让房间无脑通关。

## 3. 登录和账号初始化

试玩版登录采用 Supabase 邮箱魔法链接。

流程：

```text
打开游戏
-> 输入邮箱
-> Supabase 发送魔法链接
-> 玩家点击邮件链接
-> 回到游戏
-> 自动创建或读取账号档案
-> 进入个人基地
```

首次登录时自动创建：

- `AccountProfile`
- `AccountBase`
- `AccountResources`
- `AccountSurvivors`

初始账号基地：

- 医疗间 Lv1
- 训练室 Lv1
- 仓库 Lv1

初始账号资源：

| 资源 | 数量 |
|---|---:|
| 食物 | 20 |
| 水 | 20 |
| 材料 | 18 |
| 药品 | 8 |
| 燃料 | 6 |
| 弹药 | 6 |
| 稀有零件 | 0 |
| 情报 | 0 |

初始幸存者：

- 每个账号 6 人。
- 等级 1。
- 每人拥有职业、属性、特质、缺陷。
- 试玩版幸存者等级上限为 5。

## 4. 账号长期资产

这些对象随账号长期保存，退出房间或进入其他房间也不会消失。

```ts
AccountProfile {
  userId: string
  displayName: string
  avatarColor: string
  createdAt: string
}

AccountBase {
  userId: string
  level: number
  medicalRoomLevel: number
  trainingRoomLevel: number
  storageLevel: number
}

AccountResources {
  userId: string
  food: number
  water: number
  materials: number
  medicine: number
  fuel: number
  ammo: number
  rareParts: number
  intel: number
}

AccountSurvivor {
  survivorId: string
  ownerUserId: string
  name: string
  profession: string
  level: number
  xp: number
  attributes: Record<StatKey, number>
  traits: string[]
  injuries: string[]
  fatigue: number
  status: "available" | "assigned" | "recovering" | "dead" | "missing"
}
```

账号基地第一版只做 3 个设施：

- 医疗间：降低伤病恢复时间，减少重伤恶化。
- 训练室：提高幸存者经验获取或训练效率。
- 仓库：提高账号资源上限和房间带入上限。

第一版先不做装备系统、羁绊系统、复杂科技树、声望商店、幸存者交易和 PVP。

## 5. 房间共同基地

房间不是某个玩家的个人基地。房间是一局共同避难所，拥有自己的基地、目标、公共资源、危险和日志。

```ts
Room {
  roomId: string
  slug: string
  name: string
  hostUserId: string
  status: "lobby" | "active" | "completed" | "failed"
  difficulty: "normal" | "hard"
  createdAt: string
}

RoomMember {
  roomId: string
  userId: string
  role: "host" | "member"
  readyState: "not_ready" | "ready"
  joinedAt: string
}

RoomBase {
  roomId: string
  day: number
  morale: number
  danger: number
  objective: RoomObjective
  facilities: RoomFacility[]
  publicResources: RoomPublicResources
}

RoomPublicResources {
  food: number
  water: number
  materials: number
  medicine: number
}

RoomLog {
  roomId: string
  kind: "system" | "member" | "expedition" | "settlement" | "objective"
  title: string
  body: string
  createdAt: string
}
```

试玩版房间目标：

```text
撑过 5 天并修复通讯塔。
```

成功条件：

- 房间到达第 5 天。
- 通讯塔修复进度达到 100%。
- 房间危险没有达到失败阈值。

失败条件：

- 房间危险达到 100。
- 房间士气降到 0。
- 通讯塔目标在第 5 天结束时没有完成。

第一版房间公共资源只做 `food / water / materials / medicine`。弹药、燃料、稀有零件、情报先保留在账号侧，作为远征投入或后续版本扩展。

## 6. 进入房间和贡献

玩家加入房间后，可以做两类贡献。

资源贡献：

```ts
RoomContribution {
  roomId: string
  userId: string
  resources: Partial<AccountResources>
  createdAt: string
}
```

幸存者指派：

```ts
RoomAssignedSurvivor {
  roomId: string
  userId: string
  survivorId: string
  status: "available" | "on_expedition" | "resting" | "returned"
  assignedAt: string
}
```

规则：

- 每个玩家最多带 3 个幸存者进入房间。
- 每个玩家每次远征最多派 1-2 个幸存者。
- 一次远征总人数为 3-5。
- 一个幸存者不能同时参与多个未完成房间。
- 资源投入房间后变为房间公共资源。
- 房间结束后，幸存者状态、经验、伤病、疲劳回写账号。

资源带入上限受账号仓库等级影响。第一版默认每个房间最多带入：

| 资源 | 上限 |
|---|---:|
| 食物 | 8 |
| 水 | 8 |
| 材料 | 8 |
| 药品 | 4 |

## 7. 远征和结算

远征是一次行动，不是长期资产。它把房间共同基地和玩家账号资产连接起来。

```ts
Expedition {
  expeditionId: string
  roomId: string
  locationId: string
  risk: "cautious" | "standard" | "greedy"
  status: "draft" | "ready" | "resolved"
  createdByUserId: string
  createdAt: string
  resolvedAt?: string
}

ExpeditionParticipant {
  expeditionId: string
  userId: string
  survivorId: string
}

ExpeditionLoadout {
  expeditionId: string
  userId: string
  resources: Partial<AccountResources>
}

ExpeditionSettlement {
  expeditionId: string
  userId: string
  accountResourceDelta: Partial<AccountResources>
  roomResourceDelta: Partial<RoomPublicResources>
  survivorChanges: SurvivorChange[]
  xpGain: number
}
```

结算分三层。

房间结算：

- 房间公共资源增减。
- 士气增减。
- 危险增减。
- 天数推进。
- 通讯塔修复进度变化。
- 房间日志新增。

个人结算：

- 账号资源奖励或消耗。
- 幸存者 XP。
- 幸存者疲劳。
- 伤病、失踪、恢复状态。

账号成长：

- 幸存者升级。
- 账号基地升级材料。
- 解锁新地点、新事件或更高难度房间。

试玩版失败不做高频永久死亡。失败主要带来：

- 幸存者严重受伤。
- 幸存者短期失踪。
- 房间危险上升。
- 士气下降。
- 账号获得少量保底经验。

## 8. 核心页面

试玩版需要这些页面：

1. 登录页
2. 个人基地页
3. 幸存者页
4. 房间大厅页
5. 房间基地页
6. 远征准备页
7. 战报结算页
8. 成员页

主导航建议：

```text
个人基地
幸存者
房间
远征
战报
成员
```

进入房间后，顶部状态条显示：

- 当前房间
- 房间天数
- 房间士气
- 房间危险
- 在线成员
- 同步状态

个人基地页显示：

- 账号资源
- 账号基地设施
- 可用幸存者摘要
- 最近个人结算
- 加入或创建房间入口

房间基地页显示：

- 房间目标
- 房间公共资源
- 房间设施
- 成员贡献
- 当前可派遣幸存者
- 房间公共日志

## 9. 数据库设计

正式试玩版应从 `demo_snapshots` 迁移到结构化 Supabase 表。`demo_snapshots` 可以继续作为本地开发或回退机制，但不作为正式多人核心数据。

建议表：

账号侧：

- `profiles`
- `account_bases`
- `account_resources`
- `account_survivors`

房间侧：

- `rooms`
- `room_members`
- `room_bases`
- `room_contributions`
- `room_assigned_survivors`
- `room_logs`

远征侧：

- `expeditions`
- `expedition_participants`
- `expedition_loadouts`
- `expedition_settlements`

内容配置侧：

- `content_locations`
- `content_events`
- `content_survivor_templates`
- `content_facilities`

权限原则：

- 用户只能读取和更新自己的账号资产。
- 房间成员可以读取房间数据。
- 房间成员可以写入自己的贡献、准备状态和参战选择。
- 关键结算通过受控逻辑写入，避免重复结算。
- 房主可以管理房间设置和成员。

## 10. 前端状态和同步

前端状态拆成三类：

```text
AuthState
AccountState
RoomState
```

`AuthState` 负责：

- 当前用户
- 登录状态
- 魔法链接发送状态

`AccountState` 负责：

- 个人基地
- 个人资源
- 个人幸存者
- 个人成长

`RoomState` 负责：

- 当前房间
- 房间基地
- 成员
- 公共资源
- 远征
- 战报和日志

第一版同步策略：

- 页面加载时读取账号档案和当前房间。
- 关键动作完成后立即重新拉取房间状态。
- 房间页面每 5-10 秒轻量轮询。
- 后续再升级为 Supabase Realtime。

## 11. 实现里程碑

### 里程碑 1：认证和账号档案

交付：

- Supabase 邮箱魔法链接登录。
- 首次登录自动创建账号档案。
- 账号资源和账号幸存者可查看。
- 个人基地页可用。

验收：

- 新邮箱登录后能看到初始资源和 6 个幸存者。
- 刷新页面后账号数据不丢失。

### 里程碑 2：正式房间模型

交付：

- 创建房间。
- 通过 slug 加入房间。
- 房间成员列表。
- 房间共同基地。
- 房间公共资源和目标。

验收：

- A 创建房间，B 通过链接加入。
- A/B 都能看到同一房间基地。
- 房间数据刷新后不丢失。

### 里程碑 3：贡献和参战

交付：

- 玩家向房间投入资源。
- 玩家选择自己的幸存者进入房间。
- 房间显示每个成员带来的幸存者。

验收：

- 玩家不能指派别人的幸存者。
- 同一幸存者不能同时参与两个未完成房间。
- 投入资源从账号扣除并进入房间公共资源。

### 里程碑 4：多人远征结算

交付：

- 远征使用多个玩家的幸存者。
- 风险策略、地点和投入资源影响结果。
- 结算同时写入房间和账号。
- 战报可读。

验收：

- A/B 各自派幸存者参与同一次远征。
- 远征后 A/B 账号分别获得 XP、疲劳、奖励或伤病。
- 房间公共资源、士气、危险和日志同步变化。

### 里程碑 5：试玩目标和胜负

交付：

- 房间 5 天通讯塔目标。
- 成功和失败状态。
- 结算奖励和保底补偿。
- 手机浏览器主流程可操作。

验收：

- 单人可以完整跑完测试局。
- 两人可以完整跑完测试局。
- 房间完成或失败后，账号仍保留成长结果。

## 12. 测试和验收标准

功能验收：

- 两个玩家分别登录。
- A 创建房间，B 通过链接加入。
- A/B 各自看到自己的账号资源和幸存者。
- A/B 各自带幸存者进入房间。
- 房间显示共同基地、公共资源、目标和成员。
- 远征能选择双方幸存者。
- 远征后双方账号分别得到结算。
- 房间日志同步给所有成员。
- 手机浏览器能完成登录后主要操作。
- 刷新页面不丢状态。

测试覆盖：

- 账号初始化测试。
- 房间创建和加入测试。
- 权限边界测试。
- 资源贡献测试。
- 幸存者指派测试。
- 远征结算测试。
- 防重复结算测试。
- App smoke render 测试。

部署验收：

- `npm test` 通过。
- `npm run build` 通过。
- Supabase schema 可应用。
- Cloudflare Pages 部署成功。
- 线上页面可打开并完成至少一次试玩远征。

## 13. 明确不做

本阶段不做：

- PVP。
- 实时聊天。
- 幸存者交易。
- 装备系统。
- 复杂科技树。
- 声望商店。
- 赛季重置。
- 付费。
- 公会仓库。
- 大地图移动。
- 大量 AI 美术资产批量生产。

这些可以在多人试玩闭环稳定后再扩展。

## 14. 风险和处理

风险：邮箱魔法链接在国内邮箱到达慢。  
处理：保留开发测试用本地 demo 登录或测试白名单。

风险：多人同时操作导致资源重复扣除。  
处理：关键动作必须用数据库事务或受控 RPC，不能只靠前端本地状态。

风险：局外成长数值膨胀。  
处理：试玩版等级和设施都有上限，账号成长以选择空间为主。

风险：房间公共资源引发贡献不公平。  
处理：第一版公共资源少做，贡献记录可见，结算保留个人奖励。

风险：实现范围过大。  
处理：按 5 个里程碑推进，每个里程碑都可以独立验收。

## 15. 决策摘要

已确认：

- 账号成长采用中成长。
- 登录采用 Supabase 邮箱魔法链接。
- 房间是一局共同基地，不是某个玩家的个人基地。
- 玩家拥有长期资源和幸存者。
- 房间拥有本局公共基地和公共资源。
- 远征按玩家拆分结算。
- 第一版目标是 5 天通讯塔试玩局。

下一步是把本 spec 拆成实现计划，然后按里程碑开始重构当前 demo。
