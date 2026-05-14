import { t } from "@/i18n"
import type { TuiPluginApi } from "@opencode-ai/plugin/tui"
import { createMemo, For, type Accessor } from "solid-js"
import { DEFAULT_THEMES, useTheme } from "@tui/context/theme"
import { Flag } from "@opencode-ai/core/flag/flag"
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
  sessionCycleRecent: TipShortcut
  sessionCycleRecentReverse: TipShortcut
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
  sessionToggleRecent: TipShortcut
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

const NO_MODELS_TIP = t("tui.home.tips.no_models")

function staticTip(index: number) {
  return t(`tui.home.tips.${index}`)
}

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
    sessionCycleRecent: useCommandShortcut("session.cycle_recent"),
    sessionCycleRecentReverse: useCommandShortcut("session.cycle_recent_reverse"),
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
    sessionToggleRecent: configShortcut(props.api, "session.toggle.recent"),
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
  })
  const parts = createMemo(() => parse(tip()))

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
  staticTip(0),
  staticTip(1),
  (shortcuts) => press(shortcuts.agentCycle(), "可在 Build 和 Plan 智能体之间切换", staticTip(2)),
  staticTip(3),
  staticTip(4),
  staticTip(5),
  staticTip(6),
  (shortcuts) => press(shortcuts.inputPaste(), "从剪贴板粘贴图片到提示框", staticTip(7)),
  (shortcuts) => `使用 ${commandText("/editor", shortcuts.editorOpen())} 在外部编辑器中编写消息`,
  staticTip(9),
  (shortcuts) => `使用 ${commandText("/models", shortcuts.modelList())} 查看并切换可用的 AI 模型`,
  (shortcuts) => `使用 ${commandText("/themes", shortcuts.themeList())} 在 ${themeCount} 个内置主题间切换`,
  (shortcuts) => `使用 ${commandText("/new", shortcuts.sessionNew())} 开启新的会话`,
  (shortcuts) => `使用 ${commandText("/sessions", shortcuts.sessionList())} 列出并继续之前的会话`,
  ...(Flag.OPENCODE_EXPERIMENTAL_SESSION_SWITCHING
    ? ([
        (shortcuts) => press(shortcuts.sessionPinToggle(), "可在会话列表中置顶会话，使其保持在顶部"),
        (shortcuts) =>
          shortcuts.sessionQuickSwitch1() && shortcuts.sessionQuickSwitch9()
            ? `置顶和最近会话会绑定到 ${shortcutText(shortcuts.sessionQuickSwitch1())} 至 ${shortcutText(shortcuts.sessionQuickSwitch9())}，可一键切换`
            : undefined,
        (shortcuts) =>
          shortcuts.sessionCycleRecent() && shortcuts.sessionCycleRecentReverse()
            ? `按下 ${shortcutText(shortcuts.sessionCycleRecent())} / ${shortcutText(shortcuts.sessionCycleRecentReverse())} 可在最近访问的会话间切换`
            : undefined,
        (shortcuts) => press(shortcuts.sessionToggleRecent(), "可在会话列表中显示或隐藏“最近”分组中的会话"),
      ] satisfies Tip[])
    : []),
  staticTip(14),
  (shortcuts) => `使用 ${commandText("/export", shortcuts.sessionExport())} 将会话保存为 Markdown`,
  (shortcuts) => press(shortcuts.messagesCopy(), "将助手的最后一条消息复制到剪贴板", staticTip(16)),
  (shortcuts) => press(shortcuts.commandList(), "查看所有可用的操作和命令", staticTip(17)),
  staticTip(18),
  (shortcuts) => `引导键为 ${shortcutText(shortcuts.leader())}；结合其他按键可执行快捷操作`,
  (shortcuts) => press(shortcuts.modelCycleRecent(), "快速切换最近使用的模型", staticTip(20)),
  (shortcuts) => press(shortcuts.sessionSidebarToggle(), "可在会话中显示或隐藏侧边栏面板", staticTip(21)),
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
