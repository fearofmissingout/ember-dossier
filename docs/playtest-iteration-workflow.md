# 余烬档案试玩版迭代工作流

目标：把每次迭代固定成可重复、可检查、可回滚的流程，避免发布时临时试错。本文适用于当前多人试玩版的所有功能切片，尤其是基地经营、基地发展、出征、回合战斗、账号成长、房间协作和线上发布。

## 1. 迭代原则

每次只做一个能试玩的垂直切片。切片必须同时回答四件事：

- 玩家这轮能多做什么。
- 这个功能影响账号、房间、基地、出征、战斗中的哪一层。
- 失败、消耗、奖励、成长如何反馈给玩家。
- 如何测试它真的能在本地和线上跑通。

禁止事项：

- 禁止把数据库密码、Cloudflare Token、Supabase 密钥写进源码或文档。
- 禁止手工改 GitHub 远端树或用 GitHub API 拼发布提交。
- 禁止 force push 到 `master`。
- 禁止在没有测试、构建和生产冒烟的情况下说“已发布”。
- 禁止玩家可见界面中英文混杂。默认语言是中文；`HP`、`XP`、`API`、`GitHub`、`Cloudflare`、`Supabase` 等必要缩写或产品名可以保留英文。

## 2. 标准流程

### 2.1 设计

开始编码前先写清楚切片设计。小切片可以写在聊天里，大切片要同步到 `docs/superpowers/plans/` 或相关设计文档。

设计至少包含：

- 玩家目标：玩家为什么要点这个功能。
- 数据归属：账号绑定、房间绑定、基地绑定、单次出征绑定分别是什么。
- 玩法循环：输入、风险、消耗、奖励、失败后果。
- 验收标准：必须能在 UI 中看到什么，必须出现哪些日志或状态变化。
- 中文文案：核心按钮、状态、日志、提示先用中文定名。

### 2.2 实现

实现遵守当前代码结构：

- 纯规则优先放在 `src/playtest/` 或 `src/game/`。
- UI 只负责展示和调用规则，不把战斗、结算、资源公式塞进组件。
- Supabase 和远端同步逻辑放在 `src/lib/`。
- 样式继续使用紧凑、可扫描的工具界面，不做营销页。

对玩法规则改动，先补测试再实现。至少覆盖一个正常路径和一个失败或边界路径。

### 2.3 本地测试

每个切片完成后必须运行：

```bash
npm run iteration:check
```

这个命令会执行：

- `npm test`
- `npm run build`

涉及数据库或线上共享房间时，还要按需运行：

```bash
npm run supabase:check
```

涉及 UI 的切片，还要用浏览器走一次真实操作路径。最低要求：

- 能打开本地页面。
- 能进入目标功能所在页面。
- 能触发一次核心操作。
- 页面状态、日志、按钮可见文案符合预期。

### 2.4 提交

提交前确认：

```bash
git status --short
```

提交信息用动词开头，说明玩家侧变化，例如：

```bash
git commit -m "Add combat tempo and stagger"
```

一次提交只包含一个切片，不夹带无关格式化和旧文件回滚。

### 2.5 发布

发布必须基于最新生产分支：

```bash
git fetch origin master
git switch -c codex/<slice-name> origin/master
```

把已经验证过的功能提交 cherry-pick 或合并到这个新分支后，运行：

```bash
npm run release:preflight
```

`release:preflight` 会检查：

- 工作区必须干净。
- 当前分支必须基于最新 `origin/master`。
- `npm test` 必须通过。
- `npm run build` 必须通过。

通过后才允许发布：

```bash
git push origin HEAD:master
```

发布后必须等待 GitHub Actions：

```bash
gh run list --repo fearofmissingout/ember-dossier --branch master --limit 3
gh run watch <run-id> --repo fearofmissingout/ember-dossier --exit-status
```

Actions 内部会执行测试、构建、Cloudflare Pages 部署和生产冒烟。

### 2.6 线上验收

Actions 成功后运行：

```bash
npm run release:verify
```

线上验收至少确认：

- 生产页面 bundle 可访问。
- 注册接口可达。
- 游客多人房间快照能读写。
- 新切片的关键文案存在于线上 bundle。
- 如涉及 UI，浏览器打开 `https://ember-dossier.pages.dev/?room=playtest-smoke` 做一次核心路径冒烟。

### 2.7 回滚

如果线上失败，不 force push。使用普通 revert：

```bash
git fetch origin master
git switch -c codex/revert-<problem> origin/master
git revert <bad-commit-sha>
npm run release:preflight
git push origin HEAD:master
```

回滚后同样等待 Actions，并运行 `npm run release:verify`。

## 3. 玩法切片验收模板

每次新增玩法时，用下面模板检查：

```text
切片名称：
玩家入口：
账号数据影响：
房间/基地数据影响：
单次出征数据影响：
成功反馈：
失败反馈：
资源消耗：
长期成长：
UI 中文文案：
测试文件：
本地浏览器冒烟路径：
线上验收路径：
```

## 4. 中文文案规范

当前试玩版默认使用中文。后续如果做语言切换，也必须是完整语言包切换，不能同一屏混用。

推荐译名：

- Account Base：个人基地
- Room Objective：房间目标
- Room Base：房间基地
- Expedition：出征
- Doctrine：出征方针
- Combat：战斗
- Intent：意图
- Tempo：节奏
- Stagger：破势
- Guard：防守
- Strike：攻击
- Patch：包扎
- Tactic：战术
- Retreat：撤退
- Salvage：搜刮
- Pressure：压力
- Fatigue：疲劳
- Hunger：饥饿
- Thirst：口渴

按钮优先使用短中文动词，例如“派遣”“防守”“攻击”“包扎”“战术”“撤退”“升级”“治疗”“贡献”。

## 5. 下一阶段节奏

推荐后续按这个顺序推进：

1. 中文统一：先把第一屏、出征准备、出征路途、战斗、基地设施统一成中文。
2. 出征深度：增加更多路途事件、怪物意图、商店和营地选择。
3. 基地经营：让设施升级影响出征准备、恢复、路途支援和长期目标。
4. 账号成长：幸存者经验、专长、伤病、治疗、疲劳恢复形成长期循环。
5. 多人协作：房间成员贡献、基地分工、共同出征记录更清晰。
