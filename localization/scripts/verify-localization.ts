import * as path from "path"
import { promises as fs } from "fs"

const exists = async (file: string) =>
  fs
    .access(file)
    .then(() => true)
    .catch(() => false)

const findLoc = async (cwd: string) => {
  const dirs = [path.join(cwd, "localization"), cwd, path.join(cwd, "..")]
  for (const dir of dirs) {
    if (await exists(path.join(dir, "dictionaries/zh-CN"))) return path.resolve(dir)
  }
  throw new Error("无法定位汉化目录，缺少 dictionaries/zh-CN")
}

async function verify() {
  const cwd = process.cwd()
  const loc = await findLoc(cwd)
  const dict = path.join(loc, "dictionaries/zh-CN")
  const files = ["tui.json", "cli.json"]

  let failed = false

  for (const file of files) {
    const full = path.join(dict, file)
    if (!(await exists(full))) {
      console.error(`[错误] 缺少词典文件: ${full}`)
      failed = true
      continue
    }

    const raw = await fs.readFile(full, "utf8")
    const data = JSON.parse(raw) as Record<string, string>

    for (const [key, val] of Object.entries(data)) {
      if (!val || val.trim().length === 0) {
        console.error(`[错误] 空词条: ${file} -> ${key}`)
        failed = true
      }

      const list = val.match(/\{[^}]+\}/g) || []
      for (const item of list) {
        if (!item.startsWith("{") || !item.endsWith("}")) {
          console.error(`[错误] 占位符格式无效: ${file} -> ${key} -> ${item}`)
          failed = true
        }
      }
    }
  }

  if (failed) {
    process.exit(1)
    return
  }

  console.log("校验通过，未发现明显问题。")
}

void verify()
