import { t } from "@/i18n"
import { DialogSelect } from "@tui/ui/dialog-select"
import { useRoute } from "@tui/context/route"

export function DialogSubagent(props: { sessionID: string }) {
  const route = useRoute()

  return (
    <DialogSelect
      title={t("tui.session.subagent_actions")}
      options={[
        {
          title: t("tui.common.open"),
          value: "subagent.view",
          description: t("tui.session.subagent_open_desc"),
          onSelect: (dialog) => {
            route.navigate({
              type: "session",
              sessionID: props.sessionID,
            })
            dialog.clear()
          },
        },
      ]}
    />
  )
}
