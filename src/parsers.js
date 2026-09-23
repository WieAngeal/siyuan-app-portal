// 书签导入解析器：浏览器 Netscape 书签 HTML、JSON、CSV
import { domainOf, normalizeUrl, parseCsvLine } from "./utils.js"

// 浏览器导出的书签 HTML（Netscape Bookmark File Format）
// 返回 {bookmarks: [{name, url, categoryName}], categories: [文件夹名]}
export function parseBookmarkHtml(html) {
  const doc = new DOMParser().parseFromString(html, "text/html")
  const bookmarks = []
  const categories = []
  const seen = new Set()

  doc.querySelectorAll("a[href]").forEach((a) => {
    const url = a.getAttribute("href") || ""
    if (!/^https?:\/\//i.test(url)) return
    // 最近一层 DL 所在的 DT 下的 H3 即所属文件夹
    let categoryName = ""
    const dl = a.closest("dl")
    if (dl && dl.parentElement) {
      const h3 = dl.parentElement.querySelector(":scope > h3")
      categoryName = h3 ? h3.textContent.trim() : ""
    }
    const name = (a.textContent || "").trim() || domainOf(url)
    const key = normalizeUrl(url)
    if (seen.has(key)) return
    seen.add(key)
    bookmarks.push({ name, url, categoryName })
    if (categoryName && !categories.includes(categoryName)) categories.push(categoryName)
  })
  return { bookmarks, categories }
}

// JSON：支持本插件备份格式、纯书签数组、{name,url,category} 数组
export function parseBookmarkJson(text) {
  const data = JSON.parse(text)
  const bookmarks = []
  const categories = []
  const push = (b, categoryName = "") => {
    if (!b || !b.url) return
    bookmarks.push({
      name: b.name || domainOf(b.url),
      url: b.url,
      categoryName: categoryName || b.categoryName || b.category || "",
      iconType: b.iconType,
      icon: b.icon,
      letter: b.letter,
      color: b.color,
    })
  }
  if (Array.isArray(data)) {
    data.forEach(b => push(b))
  } else if (data && Array.isArray(data.bookmarks)) {
    const catMap = new Map((data.categories || []).map(c => [c.id, c.name]))
    data.bookmarks.forEach(b => push(b, catMap.get(b.categoryId) || ""))
    ;(data.categories || []).forEach(c => c.name && categories.push(c.name))
  } else if (data && typeof data === "object") {
    push(data)
  } else {
    throw new Error("无法识别的 JSON 结构")
  }
  return { bookmarks, categories }
}

// CSV：首行表头 name,url,category(,iconType,icon)
export function parseBookmarkCsv(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim())
  if (!lines.length) return { bookmarks: [], categories: [] }
  const header = parseCsvLine(lines[0]).map(h => h.trim().toLowerCase())
  const nameIdx = header.indexOf("name")
  const urlIdx = header.indexOf("url")
  const catIdx = header.indexOf("category") >= 0 ? header.indexOf("category") : header.indexOf("分类")
  const typeIdx = header.indexOf("icontype")
  const iconIdx = header.indexOf("icon")
  if (urlIdx < 0) {
    throw new Error("CSV 缺少 url 列，请使用 name,url,category 表头")
  }
  const bookmarks = []
  const categories = []
  for (const line of lines.slice(1)) {
    const cols = parseCsvLine(line)
    const url = (cols[urlIdx] || "").trim()
    if (!/^https?:\/\//i.test(url)) continue
    const categoryName = catIdx >= 0 ? (cols[catIdx] || "").trim() : ""
    bookmarks.push({
      name: (nameIdx >= 0 ? cols[nameIdx] : "") || domainOf(url),
      url,
      categoryName,
      iconType: typeIdx >= 0 ? cols[typeIdx] : undefined,
      icon: iconIdx >= 0 ? cols[icon] : undefined,
    })
    if (categoryName && !categories.includes(categoryName)) categories.push(categoryName)
  }
  return { bookmarks, categories }
}
