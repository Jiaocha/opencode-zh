import * as path from "path"
import { promises as fs } from "fs"

const exists = async (file: string) =>
  fs
    .access(file)
    .then(() => true)
    .catch(() => false)

const readJson = async <T>(file: string) => JSON.parse(await fs.readFile(file, "utf8")) as T
const hasHan = (value: string) => /[\u3400-\u9fff]/.test(value)

const allowedSameWebValue = (value: string) =>
  /^(opencode|OpenCode|Discord|GitHub|VS Code|API|URL|LLM|TUI|LSP|MCP)$/i.test(value.trim())

const findRepo = async (cwd: string) => {
  const dirs = [cwd, path.join(cwd, ".."), path.join(cwd, "../..")]
  for (const dir of dirs) {
    if ((await exists(path.join(dir, "package.json"))) && (await exists(path.join(dir, "packages/opencode")))) {
      return path.resolve(dir)
    }
  }
  throw new Error("无法定位仓库根目录，缺少 package.json 或 packages/opencode")
}

const listMdx = async (dir: string) => {
  const files = await fs.readdir(dir, { withFileTypes: true })
  return files
    .filter((entry) => entry.isFile() && entry.name.endsWith(".mdx"))
    .map((entry) => entry.name)
    .sort()
}

const listSourceFiles = async (dir: string): Promise<string[]> => {
  const entries = await fs.readdir(dir, { withFileTypes: true })
  const files = await Promise.all(
    entries.map(async (entry) => {
      const target = path.join(dir, entry.name)
      if (entry.isDirectory()) return listSourceFiles(target)
      if (entry.isFile() && /\.(tsx?|jsx?)$/.test(entry.name)) return [target]
      return []
    }),
  )
  return files.flat().sort()
}

async function main() {
  const repo = await findRepo(process.cwd())
  const loc = path.join(repo, "localization")
  const failures: string[] = []

  const manifestPath = path.join(loc, "generated/manifest.json")
  const missingPath = path.join(loc, "generated/missing-keys.json")
  const i18nEntry = path.join(repo, "packages/opencode/src/i18n/index.ts")
  const i18nDict = path.join(repo, "packages/opencode/src/i18n/zh-cn.ts")
  const webEn = path.join(repo, "packages/web/src/content/i18n/en.json")
  const webZh = path.join(repo, "packages/web/src/content/i18n/zh-CN.json")
  const docsRoot = path.join(repo, "packages/web/src/content/docs")
  const docsZh = path.join(docsRoot, "zh-cn")

  for (const file of [manifestPath, missingPath, i18nEntry, i18nDict, webEn, webZh]) {
    if (!(await exists(file))) failures.push(`缺少必要文件: ${path.relative(repo, file).replaceAll("\\", "/")}`)
  }

  if (await exists(manifestPath)) {
    const manifest = await readJson<{ keysCount?: number; output?: string[] }>(manifestPath)
    if (!manifest.keysCount || manifest.keysCount <= 0) failures.push("汉化 manifest 中 keysCount 为空")
    for (const output of ["packages/opencode/src/i18n/zh-cn.ts", "packages/opencode/src/i18n/index.ts"]) {
      if (!manifest.output?.includes(output)) failures.push(`汉化 manifest 未记录输出文件: ${output}`)
    }
  }

  if (await exists(missingPath)) {
    const missing = await readJson<string[]>(missingPath)
    if (missing.length > 0) {
      failures.push(`仍有 ${missing.length} 个未翻译键值，例如: ${missing.slice(0, 20).join(", ")}`)
    }
  }

  if ((await exists(webEn)) && (await exists(webZh))) {
    const en = await readJson<Record<string, unknown>>(webEn)
    const zh = await readJson<Record<string, unknown>>(webZh)
    const missing = Object.keys(en)
      .filter((key) => !(key in zh))
      .sort()
    if (missing.length > 0) {
      failures.push(`Web i18n zh-CN.json 缺少 ${missing.length} 个键值，例如: ${missing.slice(0, 20).join(", ")}`)
    }

    const suspicious = Object.keys(en)
      .filter((key) => {
        const enValue = en[key]
        const zhValue = zh[key]
        if (typeof enValue !== "string" || typeof zhValue !== "string") return false
        if (zhValue !== enValue) return false
        if (allowedSameWebValue(zhValue)) return false
        return /[A-Za-z]{4,}/.test(zhValue) && !hasHan(zhValue)
      })
      .sort()
    if (suspicious.length > 0) {
      failures.push(`Web i18n 存在疑似未翻译原文 ${suspicious.length} 项: ${suspicious.slice(0, 20).join(", ")}`)
    }
  }

  if (!(await exists(docsZh))) {
    failures.push("缺少中文文档目录: packages/web/src/content/docs/zh-cn")
  } else {
    const sourceDocs = await listMdx(docsRoot)
    const zhDocs = await listMdx(docsZh)
    const zhSet = new Set(zhDocs)
    const missingDocs = sourceDocs.filter((file) => !zhSet.has(file))
    if (missingDocs.length > 0) {
      failures.push(`中文文档缺少 ${missingDocs.length} 个页面: ${missingDocs.join(", ")}`)
    }

    const copiedDocs: string[] = []
    const noHanDocs: string[] = []
    for (const file of sourceDocs) {
      if (!zhSet.has(file)) continue
      const source = await fs.readFile(path.join(docsRoot, file), "utf8")
      const localized = await fs.readFile(path.join(docsZh, file), "utf8")
      if (source === localized) copiedDocs.push(file)
      if (!hasHan(localized)) noHanDocs.push(file)
    }
    if (copiedDocs.length > 0) failures.push(`中文文档疑似直接复制英文原文: ${copiedDocs.join(", ")}`)
    if (noHanDocs.length > 0) failures.push(`中文文档缺少中文字符: ${noHanDocs.join(", ")}`)
  }

  const tuiRoot = path.join(repo, "packages/opencode/src/cli/cmd/tui")
  if (await exists(tuiRoot)) {
    const blockedTuiPhrases = [
      "Select agent",
      "Select model",
      'title="Commands"',
      'title: "Commands"',
      'category: "Suggested"',
      'category: "Prompt"',
      'category: "Session"',
      "Popular providers",
      "Message Actions",
      "Subagent Actions",
      "undo messages and file changes",
      "message text to clipboard",
      "create a new session",
      "the subagent's session",
      "Show tips",
      "Hide tips",
      "MCPs",
      "Search skills",
      "Failed to load TUI plugins",
      "Failed to refresh MCP status",
      "Failed to toggle MCP",
      "Failed to read KV state",
      "Failed to write KV state",
      "Loading plugins",
      "Finishing startup",
      "Update Available",
      "Switch to light mode",
      "Switch to dark mode",
      "Rename Session",
      "Previous retry option",
      "Next retry option",
      "Confirm retry option",
      "Confirm workspace option",
      "Cancel workspace restore",
      "Restore workspace",
      "Workspace Unavailable",
      "Would you like to restore",
      "This session is attached to a workspace",
      "don't show again",
      "Invalid model format",
      "Invalid session ID",
      "Connect a provider",
      "No provider selected",
      "Failed to create workspace",
      "LSPs are disabled",
      "Session aborted",
      "Session done",
      "Question needs input",
      "Permission needs input",
      "[Pasted ~",
      "[Image ",
      "● Tip",
    ]
    const matches: string[] = []
    for (const file of await listSourceFiles(tuiRoot)) {
      const content = await fs.readFile(file, "utf8")
      for (const phrase of blockedTuiPhrases) {
        if (!content.includes(phrase)) continue
        matches.push(`${path.relative(repo, file).replaceAll("\\", "/")}: ${phrase}`)
      }
    }
    if (matches.length > 0) {
      failures.push(`TUI 仍存在重点英文漏译 ${matches.length} 处: ${matches.slice(0, 30).join("; ")}`)
    }
  }

  if (failures.length > 0) {
    console.error("[localize] 汉化完整性检查失败")
    for (const item of failures) console.error(`- ${item}`)
    process.exit(1)
  }

  const manifest = await readJson<{ keysCount?: number }>(manifestPath)
  console.log(`[localize] 汉化完整性检查通过，共覆盖 ${manifest.keysCount ?? 0} 个 CLI/TUI 键值`)
}

void main()
