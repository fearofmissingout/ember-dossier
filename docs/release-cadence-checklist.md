# 发布批次清单

这份清单用于决定一个本地迭代是否可以进入发布流程。默认不频繁发布；小改动先在本地通过门禁并提交，累计到完整试玩切片后再发布。

## 可以发布

只在满足以下任一条件时进入发布流程：

- 大功能：玩家可以连续体验一个新的完整环节，例如基地经营闭环、出征路线体验、战斗反馈、战报回基地闭环、多人房间协作。
- 线上阻断：修复无法登录、无法进入房间、无法出征、无法保存、生产页面不可访问等阻断试玩的问题。
- 批次完成：同一批小改动已经组成可被玩家感知的试玩切片，并且本地验证完整通过。

## 暂不发布

以下情况默认不发布：

- 只改 UI 文案、小样式、局部数值或内部文档。
- 只补测试、重构、移动代码位置，但玩家体验没有形成完整新路径。
- 本地浏览器冒烟没有走完基地、出征、战斗或事件、结算、回基地路径。
- `npm run iteration:check` 没有通过。
- 工作区不干净，或者本次提交混入无关文件。

## 发布前确认

发布前必须记录：

```text
发布批次：
玩家可体验的新内容：
不发布会阻塞什么：
本地门禁：npm run iteration:check
本地浏览器冒烟：
涉及数据：账号 / 房间 / 基地 / 单次出征
线上验收：npm run release:verify
回滚方式：git revert <commit>
```

## 命令顺序

```bash
npm run iteration:check
git status --short
npm run release:preflight
git push origin HEAD:master
npm run release:verify
```

如果只能使用 GitHub API fallback，也必须先运行 `npm run release:preflight`。`--skip-checks` 只允许在同一个 commit 已经刚刚通过发布预检、并且只是重试远程写入时使用。
