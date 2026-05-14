import { t } from "@/i18n"
import { TextAttributes } from "@opentui/core"
import { useTheme } from "@tui/context/theme"
import { useDialog } from "./dialog"
import { useBindings, useCommandShortcut } from "../keymap"

export function DialogHelp() {
  const dialog = useDialog()
  const { theme } = useTheme()
  const commandShortcut = useCommandShortcut("command.palette.show")

  useBindings(() => ({
    bindings: [
      { key: "return", desc: t("tui.help.close"), group: t("tui.cat.dialog"), cmd: () => dialog.clear() },
      { key: "escape", desc: t("tui.help.close"), group: t("tui.cat.dialog"), cmd: () => dialog.clear() },
    ],
  }))

  return (
    <box paddingLeft={2} paddingRight={2} gap={1}>
      <box flexDirection="row" justifyContent="space-between">
        <text attributes={TextAttributes.BOLD} fg={theme.text}>
          {t("tui.help.title")}
        </text>
        <text fg={theme.textMuted} onMouseUp={() => dialog.clear()}>
          esc/enter
        </text>
      </box>
      <box paddingBottom={1}>
        <text fg={theme.textMuted}>{t("tui.help.press_to_see_actions", { key: commandShortcut() })}</text>
      </box>
      <box flexDirection="row" justifyContent="flex-end" paddingBottom={1}>
        <box paddingLeft={3} paddingRight={3} backgroundColor={theme.primary} onMouseUp={() => dialog.clear()}>
          <text fg={theme.selectedListItemText}>{t("tui.common.ok")}</text>
        </box>
      </box>
    </box>
  )
}
