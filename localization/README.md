# OpenCode 汉化维护说明

`localization` 是当前仓库里中文词典、扫描脚本和生成结果的统一入口。

## 目录说明

- `dictionaries/zh-CN/*.json`
  中文词典源文件。修改汉化时只改这里。
- `scripts/apply-localization.ts`
  将词典生成到 `packages/opencode/src/i18n/zh-cn.ts`，并更新 `generated/manifest.json`。
- `scripts/verify-localization.ts`
  校验词典是否存在空值、占位符格式错误等问题。
- `scripts/extract-tui.ts`
  扫描 TUI 代码里的潜在硬编码文案，输出到 `generated/missing-keys.json`。
- `scripts/localize-onekey.ts`
  串行执行 `apply`、`verify`、`scan` 和 `packages/opencode` 下的 `bun typecheck`。
- `scripts/archive/*`
  历史性的批量迁移脚本，仅保留参考，不属于当前正式流程。
- `generated/manifest.json`
  最近一次汉化应用结果。
- `generated/missing-keys.json`
  最近一次 TUI 扫描结果。

## 推荐用法

仓库根目录执行：

```bash
bun localization/scripts/localize-onekey.ts
```

Windows 可直接执行：

```bat
localization\localize-win.bat
```

如不希望脚本结束后停留：

```bat
localization\localize-win.bat --no-pause
```

## 拆分命令

```bash
bun localization/scripts/apply-localization.ts
bun localization/scripts/verify-localization.ts
bun localization/scripts/extract-tui.ts
```

## 推荐流程

1. 修改 `dictionaries/zh-CN/*.json`
2. 运行 `bun localization/scripts/localize-onekey.ts`
3. 检查 `generated/missing-keys.json`
4. 如有残留英文，再到代码里接入 `t("...")` 并补词条

## 当前状态

- 词典总数：以 `generated/manifest.json` 为准（上次记录：644 个词条）
- TUI 扫描结果：以 `generated/missing-keys.json` 为准
- 当前目录已经整理为单一入口，不再依赖旧的根脚本别名
- `scripts` 目录已按”保留 / 归档 / 删除”清理，正式流程只保留 4 个脚本
- 最近一次汉化应用时间：2026-04-25

## 测试一键汉化

运行以下命令测试一键汉化功能：

```bash
bun localization/scripts/localize-onekey.ts
```

该命令会依次执行：
1. `apply-localization.ts` - 从 JSON 词典生成 `zh-cn.ts`
2. `verify-localization.ts` - 校验词典格式
3. `extract-tui.ts` - 扫描 TUI 代码中的硬编码文案
4. `bun typecheck` - 类型检查

如果所有步骤都成功完成，会显示 `[localize] complete`。

## 常见问题

### 1. 生成的 zh-cn.ts 与 JSON 词典不同步

如果直接修改了 `zh-cn.ts`，需要将更改同步回 JSON 词典：
- 手动将新增的词条添加到 `dictionaries/zh-CN/tui.json` 或 `cli.json`
- 然后重新运行 `bun localization/scripts/apply-localization.ts`

### 2. 扫描结果显示仍有硬编码文案

扫描结果保存在 `generated/missing-keys.json`，需要：
1. 在代码中将硬编码文案替换为 `t(“...”)` 调用
2. 在 JSON 词典中添加对应的词条
3. 重新运行一键汉化

### 3. 类型检查失败

如果 `bun typecheck` 失败，检查：
- `zh-cn.ts` 中是否有语法错误
- 代码中的 `t(“...”)` 调用是否使用了正确的键名
- 占位符格式是否正确（如 `{name}`）

## 最近汉化工作（2026-04-30）

本次汉化工作完成了以下文件的本地化：

### 侧边栏组件（6 个文件）
- `feature-plugins/sidebar/context.tsx` - 上下文、tokens、已使用、已花费
- `feature-plugins/sidebar/files.tsx` - 已修改文件
- `feature-plugins/sidebar/footer.tsx` - 快速开始、免费模型提示、连接提供商提示
- `feature-plugins/sidebar/lsp.tsx` - LSP 禁用/激活提示
- `feature-plugins/sidebar/mcp.tsx` - 活跃、错误、状态标签
- `feature-plugins/sidebar/todo.tsx` - 待办

### 插件组件（1 个文件）
- `feature-plugins/system/plugins.tsx` - 插件管理界面（安装、切换、状态标签、提示消息）

### UI 对话框组件（6 个文件）
- `ui/dialog-alert.tsx` - 确定按钮
- `ui/dialog-confirm.tsx` - 取消/确认按钮
- `ui/dialog-export-options.tsx` - 导出选项界面
- `ui/dialog-help.tsx` - 帮助对话框
- `ui/dialog-prompt.tsx` - 提示对话框
- `ui/dialog-select.tsx` - 搜索占位符和无结果提示

### 组件对话框（7 个文件）
- `component/dialog-agent.tsx` - 智能体选择
- `component/dialog-command.tsx` - 建议类别和命令标题
- `component/dialog-session-rename.tsx` - 重命名会话
- `component/dialog-skill.tsx` - 技能对话框
- `component/dialog-tag.tsx` - 自动补全
- `component/dialog-theme-list.tsx` - 主题列表
- `component/dialog-workspace-unavailable.tsx` - 工作区不可用对话框

### 其他组件（1 个文件）
- `component/prompt/autocomplete.tsx` - 没有匹配项

### 新增词条统计
- `tui.json` 新增约 60 个词条
- `zh-cn.ts` 已同步更新

## 注意

- 不要直接修改 `packages/opencode/src/i18n/zh-cn.ts`，它会被生成脚本覆盖。
- 新增 UI 文案时，优先在代码里接入 `t("...")`，再补词典。
- `typecheck` 需要在 `packages/opencode` 目录执行，`localize-onekey.ts` 已自动处理。
