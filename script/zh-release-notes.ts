#!/usr/bin/env bun

import { $ } from "bun"
import { promises as fs } from "fs"
import * as path from "path"

const repo = path.resolve(import.meta.dir, "..")

const env = (name: string, fallback = "") => process.env[name] || fallback

const short = (sha: string) => (sha ? sha.slice(0, 12) : "")

const commandText = async (strings: TemplateStringsArray, ...values: unknown[]) =>
  $(strings, ...values)
    .cwd(repo)
    .text()
    .then((value) => value.trim())

const appendOutput = async (name: string, value: string) => {
  const file = process.env.GITHUB_OUTPUT
  if (!file) return
  if (value.includes("\n")) {
    await fs.appendFile(file, `${name}<<EOF\n${value}\nEOF\n`, "utf8")
    return
  }
  await fs.appendFile(file, `${name}=${value}\n`, "utf8")
}

const pkg = (await Bun.file(path.join(repo, "packages/opencode/package.json")).json()) as { version: string }
const runNumber = env("GITHUB_RUN_NUMBER", "local")
const dateStamp = new Date().toISOString().slice(0, 10).replaceAll("-", "")
const baseVersion = pkg.version
const releaseVersion =
  env("ZH_RELEASE_VERSION") ||
  (baseVersion.includes("-")
    ? `${baseVersion}.zh.${dateStamp}.${runNumber}`
    : `${baseVersion}-zh.${dateStamp}.${runNumber}`)
const tag = env("ZH_RELEASE_TAG", `v${releaseVersion}`)
const title = `OpenCode 简体中文构建 ${tag}`

const upstreamRepo = env("UPSTREAM_REPO", "anomalyco/opencode")
const upstreamRef = env("UPSTREAM_REF", "dev")
const downstreamRepo = env("DOWNSTREAM_REPO", "Jiaocha/opencode-zh")
const upstreamBefore = env("UPSTREAM_BEFORE")
const upstreamAfter = env("UPSTREAM_AFTER") || (await commandText`git rev-parse HEAD`)
const downstreamSha = env("DOWNSTREAM_SHA") || (await commandText`git rev-parse HEAD`)

const manifest = await Bun.file(path.join(repo, "localization/generated/manifest.json"))
  .json()
  .catch(() => ({ keysCount: 0 }))
const missing = await Bun.file(path.join(repo, "localization/generated/missing-keys.json"))
  .json()
  .catch(() => [])

const upstreamLog = await (async () => {
  if (!upstreamBefore || !upstreamAfter || upstreamBefore === upstreamAfter) return ""
  try {
    return await commandText`git log --no-merges --pretty=format:%h%x09%s ${`${upstreamBefore}..${upstreamAfter}`}`
  } catch {
    return ""
  }
})()

const upstreamChanges = upstreamLog
  ? upstreamLog
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => {
        const [sha, ...message] = line.split("\t")
        return `- ${sha} ${message.join("\t")}`
      })
      .join("\n")
  : "- 本次未检测到新的上游提交，或为手动强制发布。"

const compare =
  upstreamBefore && upstreamAfter && upstreamBefore !== upstreamAfter
    ? `https://github.com/${upstreamRepo}/compare/${upstreamBefore}...${upstreamAfter}`
    : ""

const notes = [
  `# ${title}`,
  "",
  "## 版本信息",
  "",
  `- 上游仓库: ${upstreamRepo}`,
  `- 上游引用: ${upstreamRef}`,
  `- 上游范围: ${upstreamBefore ? short(upstreamBefore) : "无"} -> ${short(upstreamAfter) || "未知"}`,
  `- 下游仓库: ${downstreamRepo}`,
  `- 下游提交: ${short(downstreamSha)}`,
  compare ? `- 上游对比: ${compare}` : undefined,
  "",
  "## 汉化状态",
  "",
  `- CLI/TUI 词条覆盖: ${manifest.keysCount ?? 0} 项`,
  `- 缺失词条: ${Array.isArray(missing) ? missing.length : 0} 项`,
  "- 已包含界面文本、命令提示、错误提示、帮助文档与 Web 端简体中文资源。",
  "",
  "## 构建资产",
  "",
  "- opencode-linux-x64.tar.gz (Linux amd64)",
  "- opencode-linux-arm64.tar.gz (Linux arm64)",
  "- opencode-windows-x64.zip (Windows 64 位)",
  "",
  "## 上游更新内容",
  "",
  upstreamChanges,
  "",
  "## 自动化说明",
  "",
  "该版本由自动化流程完成上游同步、汉化应用、完整性检查、三平台 CLI 构建与 GitHub Release 发布。",
  "",
]
  .filter((line): line is string => line !== undefined)
  .join("\n")

const notesFile = path.join(env("RUNNER_TEMP", repo), "opencode-zh-release-notes.md")
await Bun.write(notesFile, notes)

await appendOutput("base_version", baseVersion)
await appendOutput("version", releaseVersion)
await appendOutput("tag", tag)
await appendOutput("title", title)
await appendOutput("notes", notesFile)

console.log(`Release tag: ${tag}`)
console.log(`Release notes: ${notesFile}`)
