import { t } from "@/i18n"
import type { TuiPluginApi } from "@opencode-ai/plugin/tui"
import { createMemo, For, type Accessor } from "solid-js"
import { DEFAULT_THEMES, useTheme } from "@tui/context/theme"
import { useCommandShortcut } from "../../keymap"

const themeCount = Object.keys(DEFAULT_THEMES).length

type TipPart = { text: string; highlight: boolean }
type TipShortcut = Accessor<string>
type Shortcuts = {
  agentCycle: TipShortcut
  childFirst: TipShortcut
  childNext: TipShortcut
  childPrevious: TipShortcut
  commandList: TipShortcut
  editorOpen: TipShortcut
  helpShow: TipShortcut
  inputClear: TipShortcut
  inputNewline: TipShortcut
  inputPaste: TipShortcut
  inputUndo: TipShortcut
  leader: TipShortcut
  messagesCopy: TipShortcut
  messagesFirst: TipShortcut
  messagesLast: TipShortcut
  messagesPageDown: TipShortcut
  messagesPageUp: TipShortcut
  messagesToggleConceal: TipShortcut
  modelCycleRecent: TipShortcut
  modelList: TipShortcut
  sessionExport: TipShortcut
  sessionInterrupt: TipShortcut
  sessionList: TipShortcut
  sessionNew: TipShortcut
  sessionParent: TipShortcut
  sessionPinToggle: TipShortcut
  sessionQuickSwitch1: TipShortcut
  sessionQuickSwitch9: TipShortcut
  sessionSidebarToggle: TipShortcut
  sessionTimeline: TipShortcut
  statusView: TipShortcut
  terminalSuspend: TipShortcut
  themeList: TipShortcut
}
type Tip = string | ((shortcuts: Shortcuts) => string | undefined)

function parse(tip: string): TipPart[] {
  const parts: TipPart[] = []
  const regex = /\{highlight\}(.*?)\{\/highlight\}/g
  const found = Array.from(tip.matchAll(regex))
  const state = found.reduce(
    (acc, match) => {
      const start = match.index ?? 0
      if (start > acc.index) {
        acc.parts.push({ text: tip.slice(acc.index, start), highlight: false })
      }
      acc.parts.push({ text: match[1], highlight: true })
      acc.index = start + match[0].length
      return acc
    },
    { parts, index: 0 },
  )

  if (state.index < tip.length) {
    parts.push({ text: tip.slice(state.index), highlight: false })
  }

  return parts
}

const NO_MODELS_TIP = "Run {highlight}/connect{/highlight} to add an AI provider and start coding"
const NO_MODELS_PARTS = parse(NO_MODELS_TIP)

function shortcutText(value: string) {
  return `{highlight}${value}{/highlight}`
}

function commandText(command: string, shortcut: string) {
  if (!shortcut) return shortcutText(command)
  return `${shortcutText(command)} 或 ${shortcutText(shortcut)}`
}

function press(shortcut: string, text: string, fallback?: string) {
  if (!shortcut) return fallback
  return `按下 ${shortcutText(shortcut)} ${text}`
}

function configShortcut(api: TuiPluginApi, command: string): TipShortcut {
  return () =>
    api.tuiConfig.keybinds
      .get(command)
      .map((binding) => api.keys.formatSequence(Array.from(api.keymap.parseKeySequence(binding.key))))
      .filter(Boolean)
      .join(", ")
}

export function Tips(props: { api: TuiPluginApi; connected?: boolean }) {
  const theme = useTheme().theme
  const tipOffset = Math.random()
  const shortcuts: Shortcuts = {
    agentCycle: useCommandShortcut("agent.cycle"),
    childFirst: configShortcut(props.api, "session.child.first"),
    childNext: configShortcut(props.api, "session.child.next"),
    childPrevious: configShortcut(props.api, "session.child.previous"),
    commandList: useCommandShortcut("command.palette.show"),
    editorOpen: useCommandShortcut("prompt.editor"),
    helpShow: useCommandShortcut("help.show"),
    inputClear: useCommandShortcut("prompt.clear"),
    inputNewline: useCommandShortcut("input.newline"),
    inputPaste: useCommandShortcut("prompt.paste"),
    inputUndo: useCommandShortcut("input.undo"),
    leader: configShortcut(props.api, "leader"),
    messagesCopy: configShortcut(props.api, "messages.copy"),
    messagesFirst: configShortcut(props.api, "session.first"),
    messagesLast: configShortcut(props.api, "session.last"),
    messagesPageDown: configShortcut(props.api, "session.page.down"),
    messagesPageUp: configShortcut(props.api, "session.page.up"),
    messagesToggleConceal: configShortcut(props.api, "session.toggle.conceal"),
    modelCycleRecent: useCommandShortcut("model.cycle_recent"),
    modelList: useCommandShortcut("model.list"),
    sessionExport: configShortcut(props.api, "session.export"),
    sessionInterrupt: configShortcut(props.api, "session.interrupt"),
    sessionList: useCommandShortcut("session.list"),
    sessionNew: useCommandShortcut("session.new"),
    sessionParent: configShortcut(props.api, "session.parent"),
    sessionPinToggle: configShortcut(props.api, "session.pin.toggle"),
    sessionQuickSwitch1: useCommandShortcut("session.quick_switch.1"),
    sessionQuickSwitch9: useCommandShortcut("session.quick_switch.9"),
    sessionSidebarToggle: configShortcut(props.api, "session.sidebar.toggle"),
    sessionTimeline: configShortcut(props.api, "session.timeline"),
    statusView: useCommandShortcut("opencode.status"),
    terminalSuspend: useCommandShortcut("terminal.suspend"),
    themeList: useCommandShortcut("theme.switch"),
  }
  const tip = createMemo(() => {
    if (props.connected === false) return NO_MODELS_TIP
    const tips = TIPS.flatMap((item) => {
      const value = typeof item === "string" ? item : item(shortcuts)
      return value ? [value] : []
    })
    return tips[Math.floor(tipOffset * tips.length)] ?? NO_MODELS_TIP
  }, NO_MODELS_TIP)
  // Solid can expose a memo's initial value while a pure computation is pending.
  const parts = createMemo(() => {
    const value = tip()
    if (typeof value === "string") return parse(value)
    return NO_MODELS_PARTS
  }, NO_MODELS_PARTS)

  return (
    <box flexDirection="row" maxWidth="100%">
      <text flexShrink={0} style={{ fg: theme.warning }}>
        ● {t("tui.home.tip")}{" "}
      </text>
      <text flexShrink={1} wrapMode="word">
        <For each={parts()}>
          {(part) => <span style={{ fg: part.highlight ? theme.text : theme.textMuted }}>{part.text}</span>}
        </For>
      </text>
    </box>
  )
}

const TIPS: Tip[] = [
  "Type {highlight}@{/highlight} followed by a filename to fuzzy search and attach files",
  "Start a message with {highlight}!{/highlight} to run shell commands directly (e.g., {highlight}!ls -la{/highlight})",
  (shortcuts) => press(shortcuts.agentCycle(), "to cycle between Build and Plan agents"),
  "Use {highlight}/undo{/highlight} to revert the last message and file changes",
  "Use {highlight}/redo{/highlight} to restore previously undone messages and file changes",
  "Run {highlight}/share{/highlight} to create a public link to your conversation at opencode.ai",
  "Drag and drop images or PDFs into the terminal to add them as context",
  (shortcuts) => press(shortcuts.inputPaste(), "to paste images from your clipboard into the prompt"),
  (shortcuts) => `Use ${commandText("/editor", shortcuts.editorOpen())} to compose messages in your external editor`,
  "Run {highlight}/init{/highlight} to auto-generate project rules based on your codebase",
  (shortcuts) => `Use ${commandText("/models", shortcuts.modelList())} to see and switch between available AI models`,
  (shortcuts) => `Use ${commandText("/themes", shortcuts.themeList())} to switch between ${themeCount} built-in themes`,
  (shortcuts) => `Use ${commandText("/new", shortcuts.sessionNew())} to start a fresh conversation session`,
  (shortcuts) => `Use ${commandText("/sessions", shortcuts.sessionList())} to list, pin, and continue sessions`,
  (shortcuts) => press(shortcuts.sessionPinToggle(), "in the session list to pin a session so it stays at the top"),
  (shortcuts) =>
    shortcuts.sessionQuickSwitch1() && shortcuts.sessionQuickSwitch9()
      ? `Pinned sessions are assigned quick slots; use ${shortcutText(shortcuts.sessionQuickSwitch1())} through ${shortcutText(shortcuts.sessionQuickSwitch9())} to switch`
      : undefined,
  "Run {highlight}/compact{/highlight} to summarize long sessions near context limits",
  (shortcuts) => `Use ${commandText("/export", shortcuts.sessionExport())} to save the conversation as Markdown`,
  (shortcuts) => press(shortcuts.messagesCopy(), "to copy the assistant's last message to clipboard"),
  (shortcuts) => press(shortcuts.commandList(), "to see all available actions and commands"),
  "Run {highlight}/connect{/highlight} to add API keys for 75+ supported LLM providers",
  (shortcuts) => `The leader key is ${shortcutText(shortcuts.leader())}; combine with other keys for quick actions`,
  (shortcuts) => press(shortcuts.modelCycleRecent(), "to quickly switch between recently used models"),
  (shortcuts) => press(shortcuts.sessionSidebarToggle(), "in a session to show or hide the sidebar panel"),
  (shortcuts) =>
    shortcuts.messagesPageUp() && shortcuts.messagesPageDown()
      ? `使用 ${shortcutText(shortcuts.messagesPageUp())}/${shortcutText(shortcuts.messagesPageDown())} 浏览会话历史`
      : undefined,
  (shortcuts) => press(shortcuts.messagesFirst(), "跳转到会话开头", staticTip(23)),
  (shortcuts) => press(shortcuts.messagesLast(), "跳转到最新消息", staticTip(24)),
  (shortcuts) => press(shortcuts.inputNewline(), "在提示框中插入换行", staticTip(25)),
  (shortcuts) => press(shortcuts.inputClear(), "可在输入时清空输入框", staticTip(26)),
  (shortcuts) => press(shortcuts.sessionInterrupt(), "可在中途停止 AI 响应", staticTip(27)),
  staticTip(28),
  staticTip(29),
  (shortcuts) => {
    const items = [
      shortcuts.sessionParent(),
      shortcuts.childFirst(),
      shortcuts.childPrevious(),
      shortcuts.childNext(),
    ].filter(Boolean)
    if (!items.length) return undefined
    return `使用 ${items.map(shortcutText).join(" / ")} 在父子会话间切换`
  },
  ...Array.from({ length: 57 }, (_, index) => staticTip(index + 31)),
  (shortcuts) => `使用 ${commandText("/timeline", shortcuts.sessionTimeline())} 跳转到特定消息`,
  (shortcuts) => press(shortcuts.messagesToggleConceal(), "切换消息中代码块的显示/隐藏", staticTip(89)),
  (shortcuts) => `使用 ${commandText("/status", shortcuts.statusView())} 查看系统状态信息`,
  staticTip(91),
  (shortcuts) =>
    shortcuts.commandList()
      ? `通过命令面板 (${shortcutText(shortcuts.commandList())}) 切换聊天中的用户名显示`
      : staticTip(92),
  staticTip(93),
  staticTip(94),
  staticTip(95),
  staticTip(96),
  (shortcuts) => `使用 ${commandText("/help", shortcuts.helpShow())} 显示帮助对话框`,
  staticTip(98),
  ...(process.platform === "win32"
    ? ([(shortcuts) => press(shortcuts.inputUndo(), "撤销提示框中的更改", staticTip(99))] satisfies Tip[])
    : ([(shortcuts) => press(shortcuts.terminalSuspend(), "挂起终端并返回 shell", staticTip(99))] satisfies Tip[])),
]
