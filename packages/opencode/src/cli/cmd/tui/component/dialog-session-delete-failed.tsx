import { t } from "@/i18n"
import { TextAttributes } from "@opentui/core"
import { useTheme } from "../context/theme"
import { useDialog } from "../ui/dialog"
import { createStore } from "solid-js/store"
import { For } from "solid-js"
import { useBindings } from "../keymap"

export function DialogSessionDeleteFailed(props: {
  session: string
  workspace: string
  onDelete?: () => boolean | void | Promise<boolean | void>
  onRestore?: () => boolean | void | Promise<boolean | void>
  onDone?: () => void
}) {
  const dialog = useDialog()
  const { theme } = useTheme()
  const [store, setStore] = createStore({
    active: "delete" as "delete" | "restore",
  })

  const options = [
    {
      id: "delete" as const,
      title: t("tui.workspace.delete_workspace"),
      description: t("tui.workspace.delete_workspace_desc"),
      run: props.onDelete,
    },
    {
      id: "restore" as const,
      title: t("tui.workspace.restore_to_new"),
      description: t("tui.workspace.restore_to_new_desc"),
      run: props.onRestore,
    },
  ]

  async function confirm() {
    const result = await options.find((item) => item.id === store.active)?.run?.()
    if (result === false) return
    props.onDone?.()
    if (!props.onDone) dialog.clear()
  }

  useBindings(() => ({
    bindings: [
      { key: "return", desc: t("tui.session.confirm_recovery_option"), group: t("tui.cat.dialog"), cmd: () => void confirm() },
      { key: "left", desc: t("tui.session.delete_broken_session"), group: t("tui.cat.dialog"), cmd: () => setStore("active", "delete") },
      { key: "up", desc: t("tui.session.delete_broken_session"), group: t("tui.cat.dialog"), cmd: () => setStore("active", "delete") },
      { key: "right", desc: t("tui.session.restore_broken_session"), group: t("tui.cat.dialog"), cmd: () => setStore("active", "restore") },
      { key: "down", desc: t("tui.session.restore_broken_session"), group: t("tui.cat.dialog"), cmd: () => setStore("active", "restore") },
    ],
  }))

  return (
    <box paddingLeft={2} paddingRight={2} gap={1}>
      <box flexDirection="row" justifyContent="space-between">
        <text attributes={TextAttributes.BOLD} fg={theme.text}>
          {t("tui.session.delete_failed")}
        </text>
        <text fg={theme.textMuted} onMouseUp={() => dialog.clear()}>
          esc
        </text>
      </box>
      <text fg={theme.textMuted} wrapMode="word">
        {t("tui.session.delete_failed_workspace_reason", { session: props.session, workspace: props.workspace })}
      </text>
      <text fg={theme.textMuted} wrapMode="word">
        {t("tui.session.choose_recovery")}
      </text>
      <box flexDirection="column" paddingBottom={1} gap={1}>
        <For each={options}>
          {(item) => (
            <box
              flexDirection="column"
              paddingLeft={1}
              paddingRight={1}
              paddingTop={1}
              paddingBottom={1}
              backgroundColor={item.id === store.active ? theme.primary : undefined}
              onMouseUp={() => {
                setStore("active", item.id)
                void confirm()
              }}
            >
              <text
                attributes={TextAttributes.BOLD}
                fg={item.id === store.active ? theme.selectedListItemText : theme.text}
              >
                {item.title}
              </text>
              <text fg={item.id === store.active ? theme.selectedListItemText : theme.textMuted} wrapMode="word">
                {item.description}
              </text>
            </box>
          )}
        </For>
      </box>
    </box>
  )
}
