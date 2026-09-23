// 将 dist 产物部署到思源工作空间的 data/plugins/<plugin-name> 目录
import { cpSync, existsSync, readFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, "..")

function loadEnvLocal() {
  const f = resolve(root, ".env.local")
  if (!existsSync(f)) return {}
  const env = {}
  for (const line of readFileSync(f, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m && !line.trimStart().startsWith("#")) {
      env[m[1]] = m[2].replace(/^["']|["']$/g, "")
    }
  }
  return env
}

const env = { ...loadEnvLocal(), ...process.env }
const workspace = env.VITE_SIYUAN_WORKSPACE_PATH
if (!workspace) {
  console.error("未配置 VITE_SIYUAN_WORKSPACE_PATH，请参考 .env.example 创建 .env.local")
  process.exit(1)
}

const pluginInfo = JSON.parse(readFileSync(resolve(root, "plugin.json"), "utf8"))
const dist = resolve(root, "dist")
if (!existsSync(dist)) {
  console.error("dist 目录不存在，请先执行 pnpm build")
  process.exit(1)
}

const target = resolve(workspace, "data", "plugins", pluginInfo.name)
// fs.cp 为合并式拷贝，不会删除目标目录中已有的 data/ 存储数据
cpSync(dist, target, { recursive: true })
console.log("已部署到:", target)
