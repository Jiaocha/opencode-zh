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
  const buildMap = (dict: Record<string, string>) => {
    for (const key of Object.keys(dict)) {
      const parts = key.split(".")
      const last = parts[parts.length - 1]
      textToKey[last] = key
    }
  }
  buildMap(tuiDict)
  buildMap(cliDict)

  const fileGroups: Record<string, any[]> = {}
  for (const row of missingKeys) {
    if (!fileGroups[row.file]) fileGroups[row.file] = []
    fileGroups[row.file].push(row)
  }

  for (const [relPath, rows] of Object.entries(fileGroups)) {
    // 排除已经手动处理好的 index.tsx 和 app.tsx，避免冲突
    if (relPath.endsWith("session/index.tsx") || relPath.endsWith("tui/app.tsx")) continue

    const fullPath = path.join(repo, relPath)
    if (!(await exists(fullPath))) continue

    let content = await fs.readFile(fullPath, "utf8")
    let modified = false

    const sortedRows = rows.sort((a, b) => b.text.length - a.text.length)

    for (const row of sortedRows) {
      const targetText = row.text
      if (targetText.length < 2) continue // 忽略单字符

      const sc = snakeCase(targetText)
      const key = textToKey[sc] || textToKey[targetText.toLowerCase()]

      if (key) {
        const escaped = targetText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
        
        // 场景 1: JSX 属性 placeholder="Text" -> placeholder={t("Key")}
        const propRegex = new RegExp(`(\\w+)=["']${escaped}["']`, "g")
        if (propRegex.test(content)) {
          content = content.replace(propRegex, `$1={t("${key}")}`)
          modified = true
        }

        // 场景 2: JSX 文本 >Text< -> >{t("Key")}<
        const tagRegex = new RegExp(`>\\s*${escaped}\\s*<`, "g")
        if (tagRegex.test(content)) {
          content = content.replace(tagRegex, `>{t("${key}")}<`)
          modified = true
        }

        // 场景 3: 对象属性 title: "Text" -> title: t("Key")
        const objRegex = new RegExp(`(\\w+):\\s*["']${escaped}["']`, "g")
        if (objRegex.test(content)) {
          content = content.replace(objRegex, `$1: t("${key}")`)
          modified = true
        }
        
        // 场景 4: 独立字符串 "Text" -> t("Key") 
        // 这种风险较高，仅在明确是 UI 方法调用时执行，例如 UI.println("Text")
        const callRegex = new RegExp(`(println|show|toast|alert|confirm|message)\\s*\\(\\s*["']${escaped}["']`, "g")
        if (callRegex.test(content)) {
          content = content.replace(callRegex, `$1(t("${key}")`)
          modified = true
        }
      }
    }

    if (modified) {
      if (!content.includes('import { t } from "@/i18n"')) {
        // 检查是否已经有名为 t 的导入，如果有则冲突，跳过
        if (content.includes(', t,') || content.includes('import { t }') || content.includes(' t } from "@opentui/core"')) {
           // 处理冲突：使用 i18n.t 
           content = `import { t as translate } from "@/i18n"\n${content.replace(/t\("/g, 'translate("')}`
        } else {
           content = `import { t } from "@/i18n"\n${content}`
        }
      }
      await fs.writeFile(fullPath, content, "utf8")
      process.stdout.write(`Auto-Patched: ${relPath}\n`)
    }
  }
}

void main()
