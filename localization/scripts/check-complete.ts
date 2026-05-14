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

  if (failures.length > 0) {
    console.error("[localize] 汉化完整性检查失败")
    for (const item of failures) console.error(`- ${item}`)
    process.exit(1)
  }

  const manifest = await readJson<{ keysCount?: number }>(manifestPath)
  console.log(`[localize] 汉化完整性检查通过，共覆盖 ${manifest.keysCount ?? 0} 个 CLI/TUI 键值`)
}

void main()
