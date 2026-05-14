import { createOpencodeClient } from "@opencode-ai/sdk/v2"
import { t } from "@/i18n"
import { SessionID } from "@/session/schema"
import { Schema } from "effect"

const decodeSessionID = Schema.decodeUnknownSync(SessionID)

export async function validateSession(input: {
  url: string
  sessionID?: string
  directory?: string
  fetch?: typeof fetch
  headers?: RequestInit["headers"]
}) {
  if (!input.sessionID) return

  let sessionID: SessionID
  try {
    sessionID = decodeSessionID(input.sessionID)
  } catch (error) {
    const message = error instanceof Error ? error.message : t("tui.error.unknown")
    throw new Error(t("tui.error.invalid_session_id", { message }), { cause: error })
  }

  await createOpencodeClient({
    baseUrl: input.url,
    directory: input.directory,
    fetch: input.fetch,
    headers: input.headers,
  }).session.get({ sessionID }, { throwOnError: true })
}
