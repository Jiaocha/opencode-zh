import * as path from "path"
import { promises as fs } from "fs"

const exists = async (file: string) =>
  fs
    .access(file)
    .then(() => true)
    .catch(() => false)

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

const run = async (cwd: string, args: string[], label: string) => {
  process.stdout.write(`\n[localize] ${label}\n`)
  const proc = Bun.spawn({
    cmd: [process.execPath, ...args],
    cwd,
    stdout: "inherit",
    stderr: "inherit",
  })
  const code = await proc.exited
  if (code === 0) return
  throw new Error(`${label} failed with exit code ${code}`)
}

async function main() {
  const cwd = process.cwd()
  const repo = await findRepo(cwd)
  const loc = await findLoc(cwd)

  await run(repo, [path.join(loc, "scripts/apply-localization.ts")], "apply")
  await run(repo, [path.join(loc, "scripts/verify-localization.ts")], "verify")
  await run(repo, [path.join(loc, "scripts/extract-tui.ts")], "scan")
  await run(repo, [path.join(loc, "scripts/patch-source.ts")], "patch")
  await run(path.join(repo, "packages/opencode"), ["typecheck"], "typecheck")

  process.stdout.write("\n[localize] complete\n")
}

void main()
