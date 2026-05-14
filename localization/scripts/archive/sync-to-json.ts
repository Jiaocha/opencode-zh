import { promises as fs } from "fs"
import path from "path"

async function main() {
  const tsFile = "packages/opencode/src/i18n/zh-cn.ts"
  const tuiJson = "localization/dictionaries/zh-CN/tui.json"
  const cliJson = "localization/dictionaries/zh-CN/cli.json"

  let tsContent = await fs.readFile(tsFile, "utf8")
  // 简单提取导出对象 (非健壮但针对当前结构有效)
  const match = tsContent.match(/export const zh = ([\s\S]*?) as const/)
  if (!match) return console.error("Could not find zh object in TS file")
  
  // 转换 TS 对象语法为 JSON (去除 trailing commas, 转换属性名引号)
  let rawObj = match[1]
    .replace(/(\w+):/g, '"$1":')
    .replace(/,\s*([}\]])/g, "$1")
    .replace(/'/g, '"')
  
  const zh = JSON.parse(rawObj)

  // 递归展平对象为 dot.case 键
  const flatten = (obj: any, prefix = "") => {
    let result: Record<string, string> = {}
    for (const [key, value] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}.${key}` : key
      if (typeof value === "object" && value !== null) {
        Object.assign(result, flatten(value, fullKey))
      } else {
        result[fullKey] = value as string
      }
    }
    return result
  }

  const allKeys = flatten(zh)
  const tuiKeys: Record<string, string> = {}
  const cliKeys: Record<string, string> = {}

  for (const [key, val] of Object.entries(allKeys)) {
    if (key.startsWith("tui.")) tuiKeys[key] = val
    if (key.startsWith("cli.")) cliKeys[key] = val
  }

  // 写入 JSON 文件，保留原始格式
  await fs.writeFile(tuiJson, JSON.stringify(tuiKeys, null, 2) + "\n", "utf8")
  await fs.writeFile(cliJson, JSON.stringify(cliKeys, null, 2) + "\n", "utf8")
  
  console.log("Sync complete: Updated tui.json and cli.json")
}

main()
