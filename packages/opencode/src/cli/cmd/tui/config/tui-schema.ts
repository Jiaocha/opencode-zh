import { ConfigPlugin } from "@/config/plugin"
import { TuiKeybind } from "./keybind"
import { Schema } from "effect"
import { isRecord } from "@/util/record"
import { Filesystem } from "@/util/filesystem"
import { TuiAttentionSoundNames, type TuiAttentionSoundName } from "@opencode-ai/plugin/tui"

export type TuiAttentionSoundPaths = Partial<Record<TuiAttentionSoundName, string>>

export function isAttentionSoundName(value: string): value is TuiAttentionSoundName {
  return TuiAttentionSoundNames.includes(value as TuiAttentionSoundName)
}

export function resolveAttentionSoundPaths(
  root: string,
  sounds: unknown,
  options?: { trim?: boolean },
): TuiAttentionSoundPaths {
  if (!isRecord(sounds)) return {}
  return Object.fromEntries(
    Object.entries(sounds).flatMap(([name, file]) => {
      if (!isAttentionSoundName(name)) return []
      if (typeof file !== "string") return []
      const value = options?.trim ? file.trim() : file
      if (!value) return []
      return [[name, Filesystem.resolveFilePath(root, value)]]
    }),
  )
}

export const KeymapLeaderTimeoutDefault = 2000
const KeymapLeaderTimeout = Schema.Int.check(Schema.isGreaterThan(0)).annotate({
  description: "引导键超时时间，单位为毫秒",
})

const TuiAttentionSounds = Schema.Struct({
  default: Schema.optional(Schema.String),
  question: Schema.optional(Schema.String),
  permission: Schema.optional(Schema.String),
  error: Schema.optional(Schema.String),
  done: Schema.optional(Schema.String),
  subagent_done: Schema.optional(Schema.String),
})

export const ScrollSpeed = Schema.Number.check(Schema.isGreaterThanOrEqualTo(0.001))

export const ScrollAcceleration = Schema.Struct({
  enabled: Schema.Boolean.annotate({ description: "启用滚动加速" }),
}).annotate({ description: "滚动加速设置" })

export const DiffStyle = Schema.Literals(["auto", "stacked"]).annotate({
  description: "控制差异渲染样式：'auto' 根据终端宽度自适应，'stacked' 始终使用单列显示",
})

export const Attention = Schema.Struct({
  enabled: Schema.optional(Schema.Boolean),
  notifications: Schema.optional(Schema.Boolean),
  sound: Schema.optional(Schema.Boolean),
  volume: Schema.optional(Schema.Number.check(Schema.isGreaterThanOrEqualTo(0), Schema.isLessThanOrEqualTo(1))),
  sound_pack: Schema.optional(Schema.String),
  sounds: Schema.optional(TuiAttentionSounds),
}).annotate({ description: "注意力提醒、通知和声音设置" })

export const TuiInfo = Schema.Struct({
  $schema: Schema.optional(Schema.String),
  theme: Schema.optional(Schema.String),
  keybinds: Schema.optional(TuiKeybind.KeybindOverrides),
  plugin: Schema.optional(Schema.Array(ConfigPlugin.Spec)),
  plugin_enabled: Schema.optional(Schema.Record(Schema.String, Schema.Boolean)),
  leader_timeout: Schema.optional(KeymapLeaderTimeout),
  attention: Schema.optional(Attention),
  scroll_speed: Schema.optional(ScrollSpeed).annotate({
    description: "TUI 滚动速度",
  }),
  scroll_acceleration: Schema.optional(ScrollAcceleration),
  diff_style: Schema.optional(DiffStyle),
  mouse: Schema.optional(Schema.Boolean).annotate({ description: "启用或禁用鼠标捕获 (默认：true)" }),
})
