import { t } from "@/i18n"
import { useTheme } from "@tui/context/theme"

export type WorkspaceStatus = "connected" | "connecting" | "disconnected" | "error"

export function workspaceTypeLabel(type: string) {
  if (type === "local") return t("tui.workspace.type_local")
  if (type === "worktree") return t("tui.workspace.type_worktree")
  if (type === "github") return t("tui.workspace.type_github")
  if (type === "unknown") return t("tui.workspace.type_unknown")
  return type
}

export function WorkspaceLabel(props: { type: string; name: string; status?: WorkspaceStatus; icon?: boolean }) {
  const { theme } = useTheme()
  const color = () => {
    if (props.status === "connected") return theme.success
    if (props.status === "error") return theme.error
    return theme.textMuted
  }

  return (
    <>
      {props.icon ? <span style={{ fg: color() }}>● </span> : undefined}
      <span style={{ fg: theme.text }}>{props.name}</span>{" "}
      <span style={{ fg: theme.textMuted }}>
        {t("tui.workspace.type_label", { type: workspaceTypeLabel(props.type) })}
      </span>
    </>
  )
}
