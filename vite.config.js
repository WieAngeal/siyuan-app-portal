import { defineConfig, loadEnv } from "vite"
import vue from "@vitejs/plugin-vue"
import zipPack from "vite-plugin-zip-pack"
import { copyFileSync, existsSync, mkdirSync } from "node:fs"
import { createRequire } from "node:module"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import minimist from "minimist"

const require = createRequire(import.meta.url)
const pluginInfo = require("./plugin.json")
const __dirname = dirname(fileURLToPath(import.meta.url))

// lib 模式下 Vite 不会自动拷贝静态文件，这里把根目录的必要资源复制到产物目录
function copyRootAssets(outDir) {
  return {
    name: "copy-root-assets",
    closeBundle() {
      mkdirSync(outDir, { recursive: true })
      for (const file of ["plugin.json", "icon.png", "preview.png"]) {
        const from = resolve(__dirname, file)
        if (existsSync(from)) {
          copyFileSync(from, resolve(outDir, file))
        }
      }
    },
  }
}

// 参考自官方 plugin-sample-vite-vue 模板：watch 模式直接输出到思源插件目录
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd())
  const args = minimist(process.argv.slice(2))
  const isWatch = args.watch || args.w || false

  const devDistDir = env.VITE_SIYUAN_WORKSPACE_PATH
    ? `${env.VITE_SIYUAN_WORKSPACE_PATH}/data/plugins/${pluginInfo.name}`
    : "./dev"
  const distDir = isWatch ? devDistDir : "./dist"
  const resolvedOutDir = resolve(__dirname, distDir)

  const plugins = [vue(), copyRootAssets(resolvedOutDir)]
  if (!isWatch) {
    plugins.push(
      zipPack({
        inDir: "./dist",
        outDir: "./",
        outFileName: "package.zip",
      }),
    )
  }

  return {
    resolve: {
      alias: {
        "@": resolve(__dirname, "src"),
      },
    },
    plugins,
    define: {
      "process.env.DEV_MODE": `"${isWatch}"`,
      "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV || "production"),
    },
    build: {
      outDir: distDir,
      emptyOutDir: !isWatch,
      sourcemap: false,
      minify: !isWatch,
      lib: {
        entry: resolve(__dirname, "src/index.js"),
        fileName: "index",
        formats: ["cjs"],
      },
      rollupOptions: {
        external: ["siyuan", "process"],
        output: {
          entryFileNames: "[name].js",
          assetFileNames: (assetInfo) => {
            if (assetInfo.name === "style.css") {
              return "index.css"
            }
            return assetInfo.name
          },
        },
      },
    },
  }
})
