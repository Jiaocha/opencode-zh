# 历史脚本归档

这个目录只保留历史性、一次性或半自动迁移脚本，默认不参与当前汉化流程。

## 当前归档脚本

- `patch-code.ts`
  早期批量把硬编码替换成 `t("...")` 的尝试版脚本。
- `patch-code-v2.ts`
  在 `patch-code.ts` 基础上做过更激进替换的版本。
- `patch-precise.ts`
  偏保守的批量替换脚本，主要处理 JSX 属性和少量文本节点。
- `sync-to-json.ts`
  从 `packages/opencode/src/i18n/zh-cn.ts` 反向同步回 JSON 词典的旧工具。

## 为什么归档

- 这些脚本都不在当前流程里被调用。
- 它们依赖历史文件结构或一次性上下文，直接再跑有误改风险。
- 仍保留到 `archive`，是为了需要时可以参考其思路，而不是直接执行。

## 当前正式流程

请只使用上层目录中的：

- `apply-localization.ts`
- `verify-localization.ts`
- `extract-tui.ts`
- `localize-onekey.ts`
