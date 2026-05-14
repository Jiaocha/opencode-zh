#!/usr/bin/env bun
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const desktopDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const stageDir = path.join(desktopDir, ".electron-builder-app")
const nodePtyPkg = `@lydell/node-pty-${process.platform}-${process.arch}`
const packageJson = JSON.parse(readFileSync(path.join(desktopDir, "package.json"), "utf8"))

function copyRequiredDir(name: string) {
  const source = path.join(desktopDir, name)
  if (!existsSync(source)) {
    throw new Error(`Missing ${name}; run the desktop build before packaging`)
  }
  cpSync(source, path.join(stageDir, name), { recursive: true, dereference: true })
}

rmSync(stageDir, { recursive: true, force: true })
mkdirSync(stageDir, { recursive: true })

copyRequiredDir("out")
copyRequiredDir("resources")

const stagedPackageJson: Record<string, unknown> = {
  name: packageJson.name,
  version: packageJson.version,
  description: packageJson.description ?? "OpenCode desktop app",
  type: packageJson.type,
  main: packageJson.main,
  license: packageJson.license,
  homepage: packageJson.homepage,
  author: packageJson.author,
}

const nodePtyVersion = packageJson.optionalDependencies?.[nodePtyPkg]
if (nodePtyVersion) {
  const source = path.join(desktopDir, "node_modules", nodePtyPkg)
  const destination = path.join(stageDir, "node_modules", nodePtyPkg)
  if (!existsSync(source)) {
    throw new Error(`Missing native dependency ${nodePtyPkg}; run bun install before packaging`)
  }
  mkdirSync(path.dirname(destination), { recursive: true })
  cpSync(source, destination, { recursive: true, dereference: true })
  stagedPackageJson.optionalDependencies = {
    [nodePtyPkg]: nodePtyVersion,
  }
}

writeFileSync(path.join(stageDir, "package.json"), `${JSON.stringify(stagedPackageJson, null, 2)}\n`, "utf8")
console.log(`Prepared Electron Builder app stage at ${stageDir}`)
