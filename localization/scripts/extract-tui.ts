import * as path from "path"
import { promises as fs } from "fs"
import { glob } from "glob"

const ignore = [
  "node_modules/**",
  "dist/**",
  "localization/**",
  "*.test.ts",
  "*.spec.ts",
  "packages/opencode/src/i18n/**",
]

const picks = ["packages/opencode/src/cli/cmd/tui/**/*.ts", "packages/opencode/src/cli/cmd/tui/**/*.tsx"]

const rules = [
  { regex: /describe:\s*["']([^"']+)["']/g, type: "cli.describe" },
  { regex: /usage\(\s*["']([^"']+)["']/g, type: "cli.usage" },
  { regex: /UI\.println\(\s*["']([^"']+)["']/g, type: "ui.println" },
  { regex: /UI\.error\(\s*["']([^"']+)["']/g, type: "ui.error" },
  { regex: /process\.stderr\.write\(\s*["']([^"']+)["']/g, type: "stderr.write" },
  { regex: /placeholder:\s*["']([^"']+)["']/g, type: "ui.placeholder" },
  { regex: /label:\s*["']([^"']+)["']/g, type: "ui.label" },
  { regex: /title:\s*["']([^"']+)["']/g, type: "ui.title" },
  { regex: /message:\s*["']([^"']+)["']/g, type: "ui.message" },
  { regex: />([^<{]+)<\//g, type: "ui.jsx_text" },
]

const exists = async (file: string) =>
  fs
    .access(file)
    .then(() => true)
    .catch(() => false)

const skip = (val: string) => {
  if (val.length < 2) return true
  if (/[^\x00-\x7F]/.test(val)) return true
  if (/^\/[\w-]+$/.test(val)) return true
  if (/^(ctrl|alt|shift)\+/i.test(val)) return true
  if (/^https?:\/\//.test(val)) return true
  if (val === "Open" || val === "Code") return true
  if (val.includes("theme.") || val.includes("val().")) return true
  if (/[{}><]/.test(val) && !/\{[^}]+\}/.test(val)) return true
  return false
}

const findRepo = async (cwd: string) => {
  const dirs = [cwd, path.join(cwd, ".."), path.join(cwd, "../..")]
  for (const dir of dirs) {
    if ((await exists(path.join(dir, "package.json"))) && (await exists(path.join(dir, "packages/opencode")))) {
      return path.resolve(dir)
    }
  }
  throw new Error("Unable to locate repo root")
}

const findLoc = async (cwd: string) => {
  const dirs = [path.join(cwd, "localization"), cwd, path.join(cwd, "..")]
  for (const dir of dirs) {
    if (await exists(path.join(dir, "dictionaries/zh-CN"))) return path.resolve(dir)
  }
  throw new Error("Unable to locate localization root")
}

async function main() {
  const cwd = process.cwd()
  const repo = await findRepo(cwd)
  const loc = await findLoc(cwd)
  const sets = await Promise.all(
    picks.map((pick) =>
      glob(pick, {
        cwd: repo,
        absolute: true,
        ignore,
      }),
    ),
  )
  const files = [...new Set(sets.flat())].sort()
  const rows: { file: string; line: number; text: string; type: string }[] = []

  for (const file of files) {
    const text = await fs.readFile(file, "utf8")
    const lines = text.split("\n")
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      if (line.includes('t("') || line.includes("t('")) continue
      for (const rule of rules) {
        rule.regex.lastIndex = 0
        let match: RegExpExecArray | null
        while ((match = rule.regex.exec(line))) {
          const val = match[1]?.trim()
          if (!val || skip(val)) continue
          rows.push({
            file: path.relative(repo, file).replaceAll("\\", "/"),
            line: i + 1,
            text: val,
            type: rule.type,
          })
        }
      }
    }
  }

  const out = path.join(loc, "generated/missing-keys.json")
  await fs.mkdir(path.dirname(out), { recursive: true })
  await fs.writeFile(out, JSON.stringify(rows, null, 2) + "\n", "utf8")

  process.stdout.write(`Scan complete. Found ${rows.length} potential missing keys.\n`)
  process.stdout.write(`Results saved to: ${out}\n`)
}

void main()
