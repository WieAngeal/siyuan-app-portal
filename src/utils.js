// 通用工具函数

export function uid(prefix = "id") {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

export function debounce(fn, wait = 300) {
  let timer = null
  return function debounced(...args) {
    clearTimeout(timer)
    timer = setTimeout(() => fn.apply(this, args), wait)
  }
}

// 补全协议、去除首尾空白
export function normalizeUrl(input) {
  let url = String(input || "").trim()
  if (!url) return ""
  if (!/^https?:\/\//i.test(url)) {
    url = `https://${url}`
  }
  return url
}

export function domainOf(url) {
  try {
    return new URL(normalizeUrl(url)).hostname.replace(/^www\./i, "")
  } catch {
    return ""
  }
}

// 去重用的稳定键：host + path（去末尾斜杠），忽略 query
export function bookmarkKey(url) {
  try {
    const u = new URL(normalizeUrl(url))
    const path = u.pathname.replace(/\/+$/, "") || "/"
    return `${u.hostname.toLowerCase()}${path}`.replace(/^www\./i, "")
  } catch {
    return String(url || "").trim().toLowerCase()
  }
}

// 安卓风首字图标配色（Material 风格）
const LETTER_COLORS = [
  "#EF5350", "#EC407A", "#AB47BC", "#7E57C2",
  "#5C6BC0", "#42A5F5", "#29B6F6", "#26C6DA",
  "#26A69A", "#66BB6A", "#9CCC65", "#FF7043",
  "#FFA726", "#8D6E63", "#78909C", "#EC6EAD",
]

export function colorFromString(str) {
  let hash = 0
  for (let i = 0; i < String(str).length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0
  }
  return LETTER_COLORS[Math.abs(hash) % LETTER_COLORS.length]
}

export function letterOf(name) {
  const chars = Array.from(String(name || "?").trim())
  return chars[0] ? chars[0].toUpperCase() : "?"
}

// favicon 地址。service 为空时直接读网站根目录 favicon.ico
// 模板变量：{domain} {origin}
export function faviconUrl(url, service) {
  const normalized = normalizeUrl(url)
  try {
    const u = new URL(normalized)
    const domain = u.hostname.replace(/^www\./i, "")
    const origin = u.origin
    if (!service || !service.trim()) {
      return `${origin}/favicon.ico`
    }
    return service.trim()
      .replaceAll("{origin}", origin)
      .replaceAll("{domain}", domain)
  } catch {
    return ""
  }
}

export const FAVICON_SERVICES = [
  { label: "网站自带（直接读取 /favicon.ico）", value: "" },
  { label: "Google 图标服务", value: "https://www.google.com/s2/favicons?domain={domain}&sz=128" },
  { label: "DuckDuckGo 图标服务", value: "https://icons.duckduckgo.com/ip3/{domain}.ico" },
]

export async function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ""))
    reader.onerror = reject
    reader.readAsText(file)
  })
}

export async function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ""))
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export function downloadTextFile(filename, text, mime = "application/json") {
  const blob = new Blob([text], { type: `${mime};charset=utf-8` })
  const a = document.createElement("a")
  a.href = URL.createObjectURL(blob)
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}

// 把数组按 fromId 拖动到 toId 的位置，返回新数组
export function reorderArray(list, fromId, toId) {
  const ids = list.map(item => item.id)
  const from = ids.indexOf(fromId)
  const to = ids.indexOf(toId)
  if (from < 0 || to < 0 || from === to) return list
  const next = list.slice()
  const [moved] = next.splice(from, 1)
  next.splice(to, 0, moved)
  return next
}

// 极简 CSV 解析，支持引号、逗号转义
export function parseCsvLine(line) {
  const result = []
  let cur = ""
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"'
        i++
      } else if (ch === '"') {
        inQuotes = false
      } else {
        cur += ch
      }
    } else if (ch === '"') {
      inQuotes = true
    } else if (ch === ",") {
      result.push(cur)
      cur = ""
    } else {
      cur += ch
    }
  }
  result.push(cur)
  return result
}
