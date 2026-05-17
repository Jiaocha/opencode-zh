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

  const appPath = path.join(repo, "packages/opencode/src/cli/cmd/tui/app.tsx")
  if (await exists(appPath)) {
    let content = await fs.readFile(appPath, "utf8")
    const original = content

    content = content.replace(
      /title:\s*`Switch to session in quick slot \$\{i \+ 1\}`/g,
      'title: t("tui.cmd.switch_quick_slot", { slot: i + 1 })',
    )
    content = content.replace(/category:\s*"Session"/g, 'category: t("tui.cat.session")')

    if (content !== original) {
      await fs.writeFile(appPath, content, "utf8")
      process.stdout.write("Patched Special: TUI session quick switch commands\n")
    }
  }

  const sessionListPath = path.join(repo, "packages/opencode/src/cli/cmd/tui/component/dialog-session-list.tsx")
  if (await exists(sessionListPath)) {
    let content = await fs.readFile(sessionListPath, "utf8")
    const original = content

    content = content.replace('title: "switch"', 'title: t("tui.common.switch")')
    content = content.replace('title: "pin/unpin"', 'title: t("tui.session.pin_unpin")')
    content = content.replace('buildOption(id, "Pinned")', 'buildOption(id, t("tui.session.pinned"))')

    if (content !== original) {
      await fs.writeFile(sessionListPath, content, "utf8")
      process.stdout.write("Patched Special: TUI session list labels\n")
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

    const tipsReplacements: Array<[string, string]> = [
      [
        '"Type {highlight}@{/highlight} followed by a filename to fuzzy search and attach files"',
        '"输入 {highlight}@{/highlight} 后跟文件名，可模糊搜索并附加文件"',
      ],
      [
        '"Start a message with {highlight}!{/highlight} to run shell commands directly (e.g., {highlight}!ls -la{/highlight})"',
        '"以 {highlight}!{/highlight} 开头可直接运行 shell 命令（例如 {highlight}!ls -la{/highlight}）"',
      ],
      [
        '(shortcuts) => press(shortcuts.agentCycle(), "to cycle between Build and Plan agents")',
        '(shortcuts) => press(shortcuts.agentCycle(), "在 Build 和 Plan 智能体之间切换")',
      ],
      [
        '"Use {highlight}/undo{/highlight} to revert the last message and file changes"',
        '"使用 {highlight}/undo{/highlight} 撤销上一条消息和文件更改"',
      ],
      [
        '"Use {highlight}/redo{/highlight} to restore previously undone messages and file changes"',
        '"使用 {highlight}/redo{/highlight} 恢复之前撤销的消息和文件更改"',
      ],
      [
        '"Run {highlight}/share{/highlight} to create a public link to your conversation at opencode.ai"',
        '"运行 {highlight}/share{/highlight} 为当前会话创建 opencode.ai 公开链接"',
      ],
      [
        '"Drag and drop images or PDFs into the terminal to add them as context"',
        '"将图片或 PDF 拖放到终端，可作为上下文添加"',
      ],
      [
        '(shortcuts) => press(shortcuts.inputPaste(), "to paste images from your clipboard into the prompt")',
        '(shortcuts) => press(shortcuts.inputPaste(), "从剪贴板粘贴图片到提示框")',
      ],
      [
        '(shortcuts) => `Use ${commandText("/editor", shortcuts.editorOpen())} to compose messages in your external editor`',
        '(shortcuts) => `使用 ${commandText("/editor", shortcuts.editorOpen())} 在外部编辑器中编写消息`',
      ],
      [
        '"Run {highlight}/init{/highlight} to auto-generate project rules based on your codebase"',
        '"运行 {highlight}/init{/highlight} 根据代码库自动生成项目规则"',
      ],
      [
        '(shortcuts) => `Use ${commandText("/models", shortcuts.modelList())} to see and switch between available AI models`',
        '(shortcuts) => `使用 ${commandText("/models", shortcuts.modelList())} 查看并切换可用的 AI 模型`',
      ],
      [
        '(shortcuts) => `Use ${commandText("/themes", shortcuts.themeList())} to switch between ${themeCount} built-in themes`',
        '(shortcuts) => `使用 ${commandText("/themes", shortcuts.themeList())} 在 ${themeCount} 个内置主题间切换`',
      ],
      [
        '(shortcuts) => `Use ${commandText("/new", shortcuts.sessionNew())} to start a fresh conversation session`',
        '(shortcuts) => `使用 ${commandText("/new", shortcuts.sessionNew())} 开启新的会话`',
      ],
      [
        '(shortcuts) => `Use ${commandText("/sessions", shortcuts.sessionList())} to list, pin, and continue sessions`',
        '(shortcuts) => `使用 ${commandText("/sessions", shortcuts.sessionList())} 列出、固定并继续会话`',
      ],
      [
        '(shortcuts) => press(shortcuts.sessionPinToggle(), "in the session list to pin a session so it stays at the top")',
        '(shortcuts) => press(shortcuts.sessionPinToggle(), "在会话列表中固定会话，使其保持在顶部")',
      ],
      [
        '? `Pinned sessions are assigned quick slots; use ${shortcutText(shortcuts.sessionQuickSwitch1())} through ${shortcutText(shortcuts.sessionQuickSwitch9())} to switch`',
        '? `已固定的会话会分配快速槽；使用 ${shortcutText(shortcuts.sessionQuickSwitch1())} 到 ${shortcutText(shortcuts.sessionQuickSwitch9())} 可快速切换`',
      ],
      [
        '"Run {highlight}/compact{/highlight} to summarize long sessions near context limits"',
        '"运行 {highlight}/compact{/highlight} 摘要压缩接近上下文上限的长会话"',
      ],
      [
        '(shortcuts) => `Use ${commandText("/export", shortcuts.sessionExport())} to save the conversation as Markdown`',
        '(shortcuts) => `使用 ${commandText("/export", shortcuts.sessionExport())} 将会话保存为 Markdown`',
      ],
      [
        '(shortcuts) => press(shortcuts.messagesCopy(), "to copy the assistant\'s last message to clipboard")',
        '(shortcuts) => press(shortcuts.messagesCopy(), "将助手的最后一条消息复制到剪贴板")',
      ],
      [
        '(shortcuts) => press(shortcuts.commandList(), "to see all available actions and commands")',
        '(shortcuts) => press(shortcuts.commandList(), "查看所有可用的操作和命令")',
      ],
      [
        '"Run {highlight}/connect{/highlight} to add API keys for 75+ supported LLM providers"',
        '"运行 {highlight}/connect{/highlight} 为 75+ 个支持的 LLM 提供商添加 API 密钥"',
      ],
      [
        '(shortcuts) => `The leader key is ${shortcutText(shortcuts.leader())}; combine with other keys for quick actions`',
        '(shortcuts) => `引导键为 ${shortcutText(shortcuts.leader())}；可与其他按键组合执行快捷操作`',
      ],
      [
        '(shortcuts) => press(shortcuts.modelCycleRecent(), "to quickly switch between recently used models")',
        '(shortcuts) => press(shortcuts.modelCycleRecent(), "快速切换最近使用的模型")',
      ],
      [
        '(shortcuts) => press(shortcuts.sessionSidebarToggle(), "in a session to show or hide the sidebar panel")',
        '(shortcuts) => press(shortcuts.sessionSidebarToggle(), "在会话中显示或隐藏侧边栏面板")',
      ],
    ]

    for (const [from, to] of tipsReplacements) {
      if (!content.includes(from)) continue
      content = content.replace(from, to)
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

  const keybindPath = path.join(repo, "packages/opencode/src/cli/cmd/tui/config/keybind.ts")
  if (await exists(keybindPath)) {
    let content = await fs.readFile(keybindPath, "utf8")
    const original = content
    const keybindReplacements: Array<[string, string]> = [
      ["Export session to editor", "将会话导出到编辑器"],
      ["Copy session transcript", "复制会话记录"],
      ["Create a new session", "创建新会话"],
      ["List all sessions", "列出所有会话"],
      ["Show session timeline", "显示会话时间线"],
      ["Fork session from message", "从消息分叉会话"],
      ["Rename session", "重命名会话"],
      ["Delete session", "删除会话"],
      ["Share current session", "分享当前会话"],
      ["Unshare current session", "取消分享当前会话"],
      ["Interrupt current session", "中断当前会话"],
      ["Compact the session", "压缩当前会话"],
      ["Toggle message timestamps", "切换消息时间戳"],
      ["Go to first child session", "前往第一个子会话"],
      ["Go to next child session", "前往下一个子会话"],
      ["Go to previous child session", "前往上一个子会话"],
      ["Go to parent session", "前往父会话"],
      ["Pin or unpin session in the session list", "在会话列表中固定或取消固定会话"],
      ["Switch to session in quick slot 1", "切换到快速槽 1 中的会话"],
      ["Switch to session in quick slot 2", "切换到快速槽 2 中的会话"],
      ["Switch to session in quick slot 3", "切换到快速槽 3 中的会话"],
      ["Switch to session in quick slot 4", "切换到快速槽 4 中的会话"],
      ["Switch to session in quick slot 5", "切换到快速槽 5 中的会话"],
      ["Switch to session in quick slot 6", "切换到快速槽 6 中的会话"],
      ["Switch to session in quick slot 7", "切换到快速槽 7 中的会话"],
      ["Switch to session in quick slot 8", "切换到快速槽 8 中的会话"],
      ["Switch to session in quick slot 9", "切换到快速槽 9 中的会话"],
    ]

    for (const [from, to] of keybindReplacements) {
      content = content.replaceAll(from, to)
    }

    if (content !== original) {
      await fs.writeFile(keybindPath, content, "utf8")
      process.stdout.write("Patched Special: TUI session keybind descriptions\n")
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
