import * as path from "path"
import { promises as fs } from "fs"

type Tree = { [k: string]: string | Tree }

const put = (root: Tree, key: string, val: string) => {
  const parts = key.split(".").filter(Boolean)
  if (!parts.length) return
  const last = parts[parts.length - 1]
  let node: Tree = root
  for (const part of parts.slice(0, -1)) {
    const cur = node[part]
    if (typeof cur === "string") node[part] = {}
    if (!node[part] || typeof node[part] === "string") node[part] = {}
    node = node[part] as Tree
  }
  node[last] = val
}

const dump = (input: Tree, level = 0): string => {
  const indent = "  ".repeat(level)
  const next = "  ".repeat(level + 1)
  const keys = Object.keys(input).sort()
  const rows = keys.map((key) => {
    const val = input[key]
    if (typeof val === "string") return `${next}${key}: ${JSON.stringify(val)},`
    return `${next}${key}: ${dump(val, level + 1)},`
  })
  return `{\n${rows.join("\n")}\n${indent}}`
}

const exists = async (file: string) =>
  fs
    .access(file)
    .then(() => true)
    .catch(() => false)

const findRepo = async (cwd: string) => {
  const dirs = [cwd, path.join(cwd, ".."), path.join(cwd, "../..")]
  for (const dir of dirs) {
    if ((await exists(path.join(dir, "package.json"))) && (await exists(path.join(dir, "packages/opencode")))) {
      return path.resolve(dir)
    }
  }
  throw new Error("无法定位仓库根目录，缺少 package.json 或 packages/opencode")
}

const findLoc = async (cwd: string) => {
  const dirs = [path.join(cwd, "localization"), cwd, path.join(cwd, "..")]
  for (const dir of dirs) {
    if (await exists(path.join(dir, "dictionaries/zh-CN"))) return path.resolve(dir)
  }
  throw new Error("无法定位汉化目录，缺少 dictionaries/zh-CN")
}

async function main() {
  const cwd = process.cwd()
  const repo = await findRepo(cwd)
  const loc = await findLoc(cwd)
  const dict = path.join(loc, "dictionaries/zh-CN")
  const out = path.join(repo, "packages/opencode/src/i18n/zh-cn.ts")
  const entry = path.join(repo, "packages/opencode/src/i18n/index.ts")
  const now = new Date().toISOString()

  const files = (await fs.readdir(dict)).filter((file) => file.endsWith(".json")).sort()
  let flat: Record<string, string> = {}

  for (const file of files) {
    const raw = await fs.readFile(path.join(dict, file), "utf8")
    try {
      flat = { ...flat, ...(JSON.parse(raw) as Record<string, string>) }
    } catch {
      console.warn(`[警告] 词典文件格式错误，已跳过：${file}`)
    }
  }

  if (!Object.keys(flat).length) {
    throw new Error("没有找到可用的词典文件")
  }

  const tree: Tree = {}
  for (const key of Object.keys(flat)) {
    const val = flat[key]
    if (typeof val !== "string") continue
    put(tree, key, val)
  }

  const code = `/**
 * OpenCode 中文词典（自动生成）
 * 更新时间: ${now}
 */
export const zh = ${dump(tree)} as const\n`

  await fs.mkdir(path.dirname(out), { recursive: true })
  await fs.writeFile(out, code, "utf8")
  await fs.writeFile(
    entry,
    `import { zh } from "./zh-cn"

type Param = string | number | boolean | null | undefined

export function t(key: string, params?: Record<string, Param>) {
  const value = key.split(".").reduce<unknown>((node, part) => {
    if (typeof node !== "object" || node === null) return undefined
    return (node as Record<string, unknown>)[part]
  }, zh)

  if (typeof value !== "string") return key
  if (!params) return value

  return value.replace(/\\{([^}]+)\\}/g, (match, name) => {
    const next = params[name]
    return next === undefined || next === null ? match : String(next)
  })
}

export { zh }
`,
    "utf8",
  )

  const manifest = {
    target: "all",
    locale: "zh-CN",
    dictionaries: files.map((file) => path.join(path.relative(repo, dict), file).replaceAll("\\", "/")),
    output: ["packages/opencode/src/i18n/zh-cn.ts", "packages/opencode/src/i18n/index.ts"],
    appliedAt: now,
    keysCount: Object.keys(flat).length,
    keys: Object.keys(flat).sort(),
  }

  const manifestPath = path.join(loc, "generated/manifest.json")
  await fs.mkdir(path.dirname(manifestPath), { recursive: true })
  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2) + "\n", "utf8")

  process.stdout.write(`已完成汉化应用: 共 ${Object.keys(flat).length} 个词条，来源: ${files.join(", ")}\n`)
}

void main()
