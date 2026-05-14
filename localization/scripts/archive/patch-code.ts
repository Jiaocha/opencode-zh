import * as path from "path"
import { promises as fs } from "fs"

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
  throw new Error("Unable to locate repo root")
}

const findLoc = async (cwd: string) => {
  const dirs = [path.join(cwd, "localization"), cwd, path.join(cwd, "..")]
  for (const dir of dirs) {
    if (await exists(path.join(dir, "dictionaries/zh-CN"))) return path.resolve(dir)
  }
  throw new Error("Unable to locate localization root")
}

const snakeCase = (str: string) =>
  str
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^\w]/g, "")

async function main() {
  const cwd = process.cwd()
  const repo = await findRepo(cwd)
  const loc = await findLoc(cwd)

  const tuiDict = JSON.parse(await fs.readFile(path.join(loc, "dictionaries/zh-CN/tui.json"), "utf8"))
  const cliDict = JSON.parse(await fs.readFile(path.join(loc, "dictionaries/zh-CN/cli.json"), "utf8"))
  const missingKeys = JSON.parse(await fs.readFile(path.join(loc, "generated/missing-keys.json"), "utf8"))

  const textToKey: Record<string, string> = {}
  
  // 建立模糊匹配映射 (原文 snake_case -> Key)
  const buildMap = (dict: Record<string, string>) => {
    for (const key of Object.keys(dict)) {
      const parts = key.split(".")
      const last = parts[parts.length - 1]
      textToKey[last] = key
    }
  }

  buildMap(tuiDict)
  buildMap(cliDict)

  const fileGroups: Record<string, typeof missingKeys> = {}
  for (const row of missingKeys) {
    if (!fileGroups[row.file]) fileGroups[row.file] = []
    fileGroups[row.file].push(row)
  }

  for (const [relPath, rows] of Object.entries(fileGroups)) {
    const fullPath = path.join(repo, relPath)
    let content = await fs.readFile(fullPath, "utf8")
    let modified = false

    // 排序以避免替换冲突 (从长文本开始)
    const sortedRows = rows.sort((a: any, b: any) => b.text.length - a.text.length)

    for (const row of sortedRows) {
      const targetText = row.text
      const sc = snakeCase(targetText)
      const key = textToKey[sc] || textToKey[targetText]

      if (key) {
        const escaped = targetText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
        
        // 处理 JSX 属性: attr="Text" -> attr={t("Key")}
        const jsxRegex = new RegExp(`(\\w+)=["'](${escaped})["']`, "g")
        if (jsxRegex.test(content)) {
          content = content.replace(jsxRegex, `$1={t("${key}")}`)
          modified = true
        }

        // 处理普通字符串: "Text" -> t("Key")
        // 排除已经处理过的 JSX 属性 (即属性名后面紧跟 ={t(")
        const generalRegex = new RegExp(`(["'])(${escaped})\\1`, "g")
        content = content.replace(generalRegex, (match, quote, text) => {
          // 检查前面是否是 = (简单判断是否为属性)
          // 实际上如果已经在 JSX 里被替换了，这个正则可能还会匹配
          // 我们直接看结果，如果没被包含在 {t()} 里就替换
          return `t("${key}")`
        })
        modified = true
      }
    }

    if (modified) {
      if (!content.includes('import { t } from "@/i18n"')) {
        content = `import { t } from "@/i18n"\n${content}`
      }
      await fs.writeFile(fullPath, content, "utf8")
      process.stdout.write(`Patched: ${relPath}\n`)
    }
  }

  process.stdout.write("Patching complete\n")
}

void main()
