import * as path from "path"
import { promises as fs } from "fs"

const exists = async (file: string) =>
  fs
    .access(file)
    .then(() => true)
    .catch(() => false)

const snakeCase = (str: string) =>
  str
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^\w]/g, "")

async function main() {
  const repo = path.resolve(process.cwd())
  const loc = path.join(repo, "localization")

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

  // 仅处理 TUI 目录下的 UI 文件
  const targets = Object.keys(fileGroups).filter(f => f.includes("src/cli/cmd/tui"))

  for (const relPath of targets) {
    // 排除手动处理的大文件
    if (relPath.endsWith("session/index.tsx") || relPath.endsWith("tui/app.tsx")) continue

    const fullPath = path.join(repo, relPath)
    if (!(await exists(fullPath))) continue

    let content = await fs.readFile(fullPath, "utf8")
    let modified = false

    const sortedRows = fileGroups[relPath].sort((a, b) => b.text.length - a.text.length)

    for (const row of sortedRows) {
      const targetText = row.text
      if (targetText.length < 2) continue

      const sc = snakeCase(targetText)
      const key = textToKey[sc] || textToKey[targetText.toLowerCase()]

      if (key) {
        const escaped = targetText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
        
        // 极保守替换模式：
        // 1. placeholder="..." -> placeholder={t("...")}
        // 2. title: "..." -> title: t("...")
        // 3. header="..." -> header={t("...")}
        // 4. message: "..." -> message: t("...")
        // 5. toast.show({ message: "..." }) -> toast.show({ message: t("...") })
        
        const props = ["placeholder", "header", "title", "message", "label", "text"]
        for (const prop of props) {
           // JSX 属性
           const jsxRegex = new RegExp(`(${prop})=(["'])${escaped}\\2`, "g")
           if (jsxRegex.test(content)) {
             content = content.replace(jsxRegex, `$1={t("${key}")}`)
             modified = true
           }
           // 对象属性
           const objRegex = new RegExp(`(${prop}):\\s*(["'])${escaped}\\2`, "g")
           if (objRegex.test(content)) {
             content = content.replace(objRegex, `$1: t("${key}")`)
             modified = true
           }
        }

        // JSX Tag 文本: >Text< -> >{t("Key")}<
        const tagRegex = new RegExp(`>\\s*${escaped}\\s*<`, "g")
        if (tagRegex.test(content)) {
          content = content.replace(tagRegex, `>{t("${key}")}<`)
          modified = true
        }
      }
    }

    if (modified) {
      if (!content.includes('import { t } from "@/i18n"')) {
        // 处理 t 冲突
        if (content.includes('import { t }') || content.includes(', t,') || content.includes(' t } from "@opentui/core"')) {
           content = `import { t as translate } from "@/i18n"\n${content.replace(/t\("/g, 'translate("')}`
        } else {
           content = `import { t } from "@/i18n"\n${content}`
        }
      }
      await fs.writeFile(fullPath, content, "utf8")
      process.stdout.write(`Precise-Patched: ${relPath}\n`)
    }
  }
}

void main()
