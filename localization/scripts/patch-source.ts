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

const snakeCase = (str: string) => str.toLowerCase().replace(/\s+/g, "_").replace(/[^\w]/g, "")

async function main() {
  const cwd = process.cwd()
  const repo = await findRepo(cwd)
  const loc = await findLoc(cwd)

  const tuiDict = JSON.parse(await fs.readFile(path.join(loc, "dictionaries/zh-CN/tui.json"), "utf8"))
  const cliDict = JSON.parse(await fs.readFile(path.join(loc, "dictionaries/zh-CN/cli.json"), "utf8"))

  // 合并字典
  const fullDict = { ...tuiDict, ...cliDict }

  const textToKey: Record<string, string> = {}
  for (const key of Object.keys(fullDict)) {
    const parts = key.split(".")
    const last = parts[parts.length - 1]
    textToKey[last] = key
    // 同时也存一份原始内容的映射
    const rawText = fullDict[key].toLowerCase()
    textToKey[rawText] = key
  }

  // 1. 特殊补丁：Home.tsx 的占位符数组
  const homePath = path.join(repo, "packages/opencode/src/cli/cmd/tui/routes/home.tsx")
  if (await exists(homePath)) {
    let content = await fs.readFile(homePath, "utf8")
    if (content.includes('normal: ["Fix a TODO')) {
      content = content.replace(
        'normal: ["Fix a TODO in the codebase", "What is the tech stack of this project?", "Fix broken tests"]',
        'normal: [\n    t("tui.home.placeholder_1"),\n    t("tui.home.placeholder_2"),\n    t("tui.home.placeholder_3"),\n  ]',
      )
      if (!content.includes('import { t } from "@/i18n"')) {
        content = `import { t } from "@/i18n"\n${content}`
      }
      await fs.writeFile(homePath, content, "utf8")
      process.stdout.write(`Patched Special: Home.tsx placeholders\n`)
    }
  }

  const tipsPath = path.join(repo, "packages/opencode/src/cli/cmd/tui/feature-plugins/home/tips-view.tsx")
  if (await exists(tipsPath)) {
    let content = await fs.readFile(tipsPath, "utf8")
    let modified = false

    if (content.includes("staticTip(") && !content.includes("function staticTip(")) {
      content = content.replace(
        /const NO_MODELS_TIP = .*\r?\n/,
        'const NO_MODELS_TIP = t("tui.home.tips.no_models")\n',
      )
      content = content.replace(
        /const NO_MODELS_PARTS = parse\(NO_MODELS_TIP\)\r?\n/,
        'const NO_MODELS_PARTS = parse(NO_MODELS_TIP)\n\nfunction staticTip(index: number) {\n  return t(`tui.home.tips.${index}`)\n}\n',
      )
      modified = true
    }

    if (modified) {
      if (!content.includes('import { t } from "@/i18n"')) {
        content = `import { t } from "@/i18n"\n${content}`
      }
      await fs.writeFile(tipsPath, content, "utf8")
      process.stdout.write("Patched Special: TUI tips static translations\n")
    }
  }

  const commandPath = path.join(repo, "packages/opencode/src/command/index.ts")
  if (await exists(commandPath)) {
    let content = await fs.readFile(commandPath, "utf8")
    let modified = false
    const replacements: Array<[string, string]> = [
      ['description: "guided AGENTS.md setup"', 'description: t("tui.command.init_description")'],
      [
        'description: "review changes [commit|branch|pr], defaults to uncommitted"',
        'description: t("tui.command.review_description")',
      ],
    ]

    for (const [from, to] of replacements) {
      if (!content.includes(from)) continue
      content = content.replace(from, to)
      modified = true
    }

    if (modified) {
      if (!content.includes('import { t } from "@/i18n"')) {
        content = content.replace(
          'import PROMPT_REVIEW from "./template/review.txt"\n',
          'import PROMPT_REVIEW from "./template/review.txt"\nimport { t } from "@/i18n"\n',
        )
      }
      await fs.writeFile(commandPath, content, "utf8")
      process.stdout.write("Patched Special: Slash command descriptions\n")
    }
  }

  // 2. 通用补丁：扫描所有 TUI 相关的 TSX 文件
  // 从 missing-keys.json 获取线索，或者扫描特定目录
  const missingKeysPath = path.join(loc, "generated/missing-keys.json")
  if (await exists(missingKeysPath)) {
    const missingKeys = JSON.parse(await fs.readFile(missingKeysPath, "utf8"))
    const fileGroups: Record<string, any[]> = {}
    for (const row of missingKeys) {
      if (!fileGroups[row.file]) fileGroups[row.file] = []
      fileGroups[row.file].push(row)
    }

    for (const [relPath, rows] of Object.entries(fileGroups)) {
      const fullPath = path.join(repo, relPath)
      if (!(await exists(fullPath))) continue

      let content = await fs.readFile(fullPath, "utf8")
      let modified = false

      // 按长度倒序排列，优先匹配长句子
      const sortedRows = rows.sort((a, b) => b.text.length - a.text.length)

      for (const row of sortedRows) {
        const targetText = row.text
        if (targetText.length < 2) continue

        const sc = snakeCase(targetText)
        const key = textToKey[sc] || textToKey[targetText.toLowerCase()]

        if (key) {
          const escaped = targetText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

          // 场景 1: JSX 属性 placeholder="Text"
          const propRegex = new RegExp(`(\\w+)=["']${escaped}["']`, "g")
          if (propRegex.test(content)) {
            content = content.replace(propRegex, `$1={t("${key}")}`)
            modified = true
          }

          // 场景 2: JSX 文本 >Text<
          const tagRegex = new RegExp(`>\\s*${escaped}\\s*<`, "g")
          if (tagRegex.test(content)) {
            content = content.replace(tagRegex, `>{t("${key}")}<`)
            modified = true
          }

          // 场景 3: 对象属性 title: "Text"
          const objRegex = new RegExp(`(\\w+):\\s*["']${escaped}["']`, "g")
          if (objRegex.test(content)) {
            // 排除已经调用了 t() 的情况
            if (!new RegExp(`${key}\\)`).test(content)) {
              content = content.replace(objRegex, `$1: t("${key}")`)
              modified = true
            }
          }
        }
      }

      if (modified) {
        if (!content.includes("import { t }")) {
          content = `import { t } from "@/i18n"\n${content}`
        }
        await fs.writeFile(fullPath, content, "utf8")
        process.stdout.write(`Auto-Patched: ${relPath}\n`)
      }
    }
  }
}

void main()
