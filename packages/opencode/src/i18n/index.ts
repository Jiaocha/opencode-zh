import { zh } from "./zh-cn"

type Param = string | number | boolean | null | undefined

export function t(key: string, params?: Record<string, Param>) {
  const value = key.split(".").reduce<unknown>((node, part) => {
    if (typeof node !== "object" || node === null) return undefined
    return (node as Record<string, unknown>)[part]
  }, zh)

  if (typeof value !== "string") return key
  if (!params) return value

  return value.replace(/\{([^}]+)\}/g, (match, name) => {
    const next = params[name]
    return next === undefined || next === null ? match : String(next)
  })
}

export { zh }
