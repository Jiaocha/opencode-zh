import { t } from "@/i18n"
import { cmd } from "../cmd"
import { UI } from "@/cli/ui"
import { win32DisableProcessedInput, win32InstallCtrlCGuard } from "./win32"
import { TuiConfig } from "@/cli/cmd/tui/config/tui"
import { errorMessage } from "@/util/error"
import { validateSession } from "./validate-session"
import { ServerAuth } from "@/server/auth"

export const AttachCommand = cmd({
  command: "attach <url>",
  describe: t("tui.cli.attach_server"),
  builder: (yargs) =>
    yargs
      .positional("url", {
        type: "string",
        describe: "http://localhost:4096",
        demandOption: true,
      })
      .option("dir", {
        type: "string",
        description: t("cli.cmd.run.dir"),
      })
      .option("continue", {
        alias: ["c"],
        describe: t("tui.cli.continue_session"),
        type: "boolean",
      })
      .option("session", {
        alias: ["s"],
        type: "string",
        describe: t("tui.cli.session_id"),
      })
      .option("fork", {
        type: "boolean",
        describe: t("tui.cli.fork_session"),
      })
      .option("password", {
        alias: ["p"],
        type: "string",
        describe: t("tui.cli.auth_password"),
      })
      .option("username", {
        alias: ["u"],
        type: "string",
        describe: t("tui.cli.auth_username"),
      }),
  handler: async (args) => {
    const unguard = win32InstallCtrlCGuard()
    try {
      win32DisableProcessedInput()

      if (args.fork && !args.continue && !args.session) {
        UI.error(t("tui.cli.fork_requires_continue"))
        process.exitCode = 1
        return
      }

      const directory = (() => {
        if (!args.dir) return undefined
        try {
          process.chdir(args.dir)
          return process.cwd()
        } catch {
          // If the directory doesn't exist locally (remote attach), pass it through.
          return args.dir
        }
      })()
      const headers = ServerAuth.headers({ password: args.password, username: args.username })
      const config = await TuiConfig.get()
      const { tui } = await import("./app")

      try {
        await validateSession({
          url: args.url,
          sessionID: args.session,
          directory,
          headers,
        })
      } catch (error) {
        UI.error(errorMessage(error))
        process.exitCode = 1
        return
      }

      await tui({
        url: args.url,
        config,
        args: {
          continue: args.continue,
          sessionID: args.session,
          fork: args.fork,
        },
        directory,
        headers,
      })
    } finally {
      unguard?.()
    }
  },
})
