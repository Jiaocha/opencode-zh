<p align="center">
  <a href="https://opencode.ai">
    <picture>
      <source srcset="packages/console/app/src/asset/logo-ornate-dark.svg" media="(prefers-color-scheme: dark)">
      <source srcset="packages/console/app/src/asset/logo-ornate-light.svg" media="(prefers-color-scheme: light)">
      <img src="packages/console/app/src/asset/logo-ornate-light.svg" alt="OpenCode logo">
    </picture>
  </a>
</p>

<p align="center"><strong>OpenCode 简体中文构建版</strong></p>
<p align="center">面向终端、桌面端和 Web 端的开源 AI 编程代理。</p>

<p align="center">
  <a href="https://github.com/Jiaocha/opencode-zh/releases"><img alt="GitHub Release" src="https://img.shields.io/github/v/release/Jiaocha/opencode-zh?style=flat-square&label=opencode-zh" /></a>
  <a href="https://github.com/Jiaocha/opencode-zh/actions/workflows/zh-release.yml"><img alt="zh-release" src="https://img.shields.io/github/actions/workflow/status/Jiaocha/opencode-zh/zh-release.yml?style=flat-square&branch=dev&label=zh-release" /></a>
  <a href="https://github.com/anomalyco/opencode"><img alt="upstream" src="https://img.shields.io/badge/forked%20from-anomalyco%2Fopencode-blue?style=flat-square" /></a>
</p>

[![OpenCode Terminal UI](packages/web/src/assets/lander/screenshot.png)](https://opencode.ai)

## 项目说明

本仓库是 [anomalyco/opencode](https://github.com/anomalyco/opencode) 的 fork，目标是在不改变 OpenCode 原有功能的前提下，持续维护完整的简体中文体验。

汉化内容覆盖：

- CLI 命令、参数说明、帮助文本和错误提示
- TUI 终端界面、对话框、状态栏、权限提示和操作反馈
- Web 端站点文案、分享页文本和中文文档
- 桌面端源码与上游结构同步保留
- GitHub Release 的中文发布说明、版本号和更新内容

## 自动同步与发布

仓库内置 `zh-release` GitHub Actions 工作流：

1. 定期从上游 `anomalyco/opencode` 拉取最新 `dev` 分支。
2. 合并上游更新时保留本仓库的 `localization` 汉化工具链、中文 README 和发布脚本。
3. 自动执行汉化应用、缺失词条扫描和完整性检查。
4. 构建并校验指定平台的可执行文件。
5. 自动创建或更新 GitHub Release。

当前自动发布的 CLI/TUI 构建资产：

| 平台    | 架构        | 发布文件                      |
| ------- | ----------- | ----------------------------- |
| Linux   | amd64 / x64 | `opencode-linux-x64.tar.gz`   |
| Linux   | arm64       | `opencode-linux-arm64.tar.gz` |
| Windows | 64 位 / x64 | `opencode-windows-x64.zip`    |

当前自动发布的桌面端构建资产：

| 平台    | 架构        | 发布文件                                                                                                        |
| ------- | ----------- | --------------------------------------------------------------------------------------------------------------- |
| Linux   | amd64 / x64 | `opencode-desktop-linux-x64.AppImage`、`opencode-desktop-linux-x64.deb`、`opencode-desktop-linux-x64.rpm`       |
| Linux   | arm64       | `opencode-desktop-linux-arm64.AppImage`、`opencode-desktop-linux-arm64.deb`、`opencode-desktop-linux-arm64.rpm` |
| Windows | 64 位 / x64 | `opencode-desktop-win-x64.exe`                                                                                  |

最新版本请查看 [Releases](https://github.com/Jiaocha/opencode-zh/releases)。

## 安装与使用

下载对应平台的 Release 资产后解压，将 `opencode` 或 `opencode.exe` 放入 `PATH`。

Linux 示例：

```bash
tar -xzf opencode-linux-x64.tar.gz
chmod +x opencode
./opencode --version
```

Windows 示例：

```powershell
Expand-Archive .\opencode-windows-x64.zip -DestinationPath .\opencode
.\opencode\opencode.exe --version
```

启动 TUI：

```bash
opencode
```

## 桌面端

桌面端源码位于 `packages/desktop`，随上游 OpenCode 持续同步。本仓库保留桌面端构建能力，适合需要 Electron 桌面体验的用户自行打包。

常用命令：

```bash
bun install
bun --cwd packages/desktop dev
bun --cwd packages/desktop build
bun --cwd packages/desktop package
```

平台打包命令：

```bash
bun --cwd packages/desktop package:win
bun --cwd packages/desktop package:linux
bun --cwd packages/desktop package:mac
```

桌面端更新和安装包格式仍遵循上游项目约定。

## Web 端

Web 文档站位于 `packages/web`，交互式 Web App 位于 `packages/app`。本仓库保留中文站点资源和中文文档目录：

- Web i18n：`packages/web/src/content/i18n/zh-CN.json`
- 中文文档：`packages/web/src/content/docs/zh-cn`
- Web App：`packages/app`

本地运行文档站：

```bash
bun install
bun --cwd packages/web dev
```

构建文档站：

```bash
bun --cwd packages/web build
```

运行 Web App：

---

- `localization/dictionaries/zh-CN`：CLI/TUI 词典
- `localization/scripts/apply-localization.ts`：生成中文 i18n 入口
- `localization/scripts/extract-tui.ts`：扫描潜在缺失词条
- `localization/scripts/patch-source.ts`：将界面文本接入中文词典
- `localization/scripts/check-complete.ts`：检查汉化完整性

手动执行完整汉化流程：

```bash
bun run ./localization/scripts/localize-onekey.ts
```

仅检查是否遗漏：

```bash
bun run ./localization/scripts/check-complete.ts
```

检查项包括 CLI/TUI 缺失键、空翻译、Web i18n 键覆盖、中文文档页面数量、疑似英文原文整页复制等。

## 从上游同步最新版

推荐使用 GitHub Actions 的 `zh-release` 手动触发：

1. 打开 [zh-release 工作流](https://github.com/Jiaocha/opencode-zh/actions/workflows/zh-release.yml)。
2. 选择 `Run workflow`。
3. `upstream_ref` 保持 `dev`，需要强制重建时开启 `force_release`。
4. 工作流会自动同步上游、保留汉化、构建并发布。

本地手动同步时请确保保留 `localization` 目录和中文 README，再运行汉化脚本。

## 与上游的关系

OpenCode 原项目归 [anomalyco/opencode](https://github.com/anomalyco/opencode) 维护。本仓库仅维护简体中文本地化、自动化构建和中文发布资产，不改变上游项目的许可证、核心功能和架构方向。

## 许可证

本仓库遵循上游 OpenCode 的许可证。详见 [LICENSE](LICENSE)。
