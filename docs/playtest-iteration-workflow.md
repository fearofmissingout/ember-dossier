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
- 禁止在仓库脚本外手工改 GitHub 远端树或临时拼 GitHub API 发布提交。
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

`iteration:check` 会单独运行：

```bash
npm run copy:check
npm run playable:check
```

`copy:check` 会扫描玩家可见的核心源码，阻止已知英文错误提示、英文按钮文案、未允许的中英混排和中文乱码重新进入试玩版。允许项只限明确的产品名、技术名或短缩写，例如 `Supabase`、`Cloudflare`、`HTTP`、`Lv`、`HP`、`XP`。

这条门禁用确定性样本跑通基地待办、编队、出征结算、战报解析和回到基地下一步，确保每次迭代没有把核心试玩闭环拆断。

这个命令会执行：

- 迭代工作流契约检查，确认本文、`package.json`、本地门禁脚本和 GitHub Actions 没有互相漂移。
- Cloudflare Pages 输出目录配置检查。
- `npm run copy:check`
- `npm run playable:check`
- `npm test`
- `npm run build`

如果只改发布流程、文档或 CI，可以先单独运行：

```bash
npm run workflow:check
```

涉及数据库或线上共享房间时，还要按需运行：

```bash
npm run supabase:check
```

涉及 UI 的切片，还要用浏览器走一次真实操作路径。最低要求：

- 能打开本地页面。
- 能进入目标功能所在页面。
- 能触发一次核心操作。
- 页面状态、日志、按钮可见文案符合预期。

#### 2.3.1 本地浏览器冒烟清单

UI、出征、基地经营、账号登录、房间协作相关切片，提交前必须按同一条本地路径验收，避免把线上部署当测试工具。

推荐本地地址：

```bash
npm run dev
```

提交 UI、出征、基地经营或多人协作切片前，可以先打印固定验收单：

```bash
npm run smoke:local
```

打开：

```text
http://localhost:5173/?room=playtest-smoke
```

如果 5173 被占用，以 Vite 输出的实际端口为准，但房间参数保持 `room=playtest-smoke`。

浏览器验收至少覆盖：

- 首屏：能看到试玩登录或基地总览；中文文案没有乱码和异常英文。
- 手机端：窄屏下仍是单页应用，底部导航、手机端行动栏和当前主要操作不互相遮挡。
- 基地：资源总量、设施升级、治疗、编队或协作任务至少能触发一项。
- 出征准备：能选择幸存者、风险、补给和地点，并能看到收益或风险预览。
- 出征过程：能看到路线预告、当前行动、状态、过程、撤离入口。
- 战斗：遇到战斗时能看到敌人意图、本回合建议和至少一个可点击动作。
- 结算：能撤离或完成出征，并看到战报、资源变化和回基地后的下一步任务。
- 同步：如果数据库不可用，玩家能看到中文原因和可继续试玩或重试的提示。

记录验收结论时，用下面格式贴到提交说明、PR 描述或工作记录里：

```text
本地浏览器冒烟：
- 地址：
- 视口：桌面 / 手机
- 路径：登录或游客进入 -> 基地 -> 出征准备 -> 出征过程 -> 战斗或事件 -> 结算 -> 回基地
- 结果：
- 发现问题：
```

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
- `wrangler.toml` 必须声明 `pages_build_output_dir = "dist"`，并且不能包含 Pages 不支持的 `[assets]` 配置。
- `npm test` 必须通过。
- `npm run build` 必须通过。

通过后才允许发布：

```bash
git push origin HEAD:master
```

如果当前网络环境下 `git fetch` 或 `git push` 无法连接 GitHub，但 `gh api` 可用，允许使用固定 fallback 脚本发布当前已提交切片：

```bash
npm run release:preflight
git status --short
npm run release:publish:api -- --files <本次切片文件列表>
```

fallback 脚本会：

- 先运行 `npm run release:preflight`，除非显式传入 `--skip-checks`。
- 要求工作区干净。
- 读取 GitHub `master` 当前父提交。
- 用当前本地 commit 的文件内容创建远端提交。
- 非 force 更新 `master`。
- 校验远端 tree 中的文件 blob 与本地 commit 完全一致。

`--skip-checks` 只允许在同一个 commit 已经刚刚通过 `release:preflight`，并且只是重试 GitHub API 写入时使用。fallback 只用于 git 传输不可用的情况。禁止把聊天里临时复制的 Node 片段当作发布方式。

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

### 2.8 发布节奏

默认不要频繁发布。每个小切片先在本地完成设计、实现、测试和提交，只有满足下面任一条件时才进入发布流程：

- 完成一个可被玩家连续体验的大功能变化，例如基地经营闭环、出征路线体验、战斗反馈、战报回基地闭环、多人房间协作。
- 修复线上阻断试玩的问题，例如无法登录、无法进入房间、无法出征、无法保存、构建产物不可访问。
- 发布前已经跑通 `npm run iteration:check`，并且当前工作区是干净的。

GitHub Actions 也必须运行 `npm run iteration:check`，确保线上发布前的检查和本地门禁一致。不要用线上部署当测试工具；如果只是 UI 文案、小样式、局部数值或内部文档调整，先累积到下一次完整试玩切片再发布。

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

`npm run copy:check` 会把中英混排作为硬门禁。除产品名、技术服务名和短缩写外，玩家可见按钮、提示、日志、战报、检查项都必须使用中文。新增允许项时要同步更新 `scripts/check-visible-copy.mjs` 和本节说明。

英文包开放前必须覆盖同一组玩家可见面：

- 界面按钮：导航、操作按钮、设置和确认提示。
- 路上文本：远征事件、战斗意图、商店和营地文本。
- 结算战报：战报、成长、复盘建议和回基地队列。
- 异常提示：登录、同步、数据库降级和发布验收提示。

如果任一项没有完整语言包，只能继续显示“英文包待完整”，不能开放半成品切换。

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

## 6. 发布批次清单

发布前使用 `docs/release-cadence-checklist.md` 判断这一轮是否真的应该上线。默认不要频繁发布；UI 文案、小样式、局部数值、内部文档、纯测试或重构先留在本地迭代分支，累积到玩家能连续体验的新试玩切片后，再进入 `npm run release:preflight` 和线上验收。
