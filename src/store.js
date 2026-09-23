// 响应式数据层：分类 / 书签 / 设置，持久化到思源插件存储（data.json）
import { reactive } from "vue"
import { bookmarkKey, debounce, normalizeUrl, uid } from "./utils.js"

const STORAGE_NAME = "data.json"
const DATA_VERSION = 1

export const DEFAULT_SETTINGS = {
  iconSize: 56, // 图标边长 px
  columns: 0, // 每行列数，0 = 自适应
  faviconService: "", // 空 = 网站根目录 favicon.ico
  sortBy: "manual", // manual | clicks | recent
  defaultCategoryId: "",
  showFavorites: true,
  showSearch: true,
  wallpaper: "", // dataURL
  wallpaperOpacity: 0.35,
}

function seedBookmarks() {
  const cats = [
    { id: "cat-fav", name: "常用", icon: "", color: "#0FDC78", sort: 0, collapsed: false },
    { id: "cat-dev", name: "开发", icon: "", color: "#42A5F5", sort: 1, collapsed: false },
    { id: "cat-search", name: "搜索", icon: "", color: "#FFA726", sort: 2, collapsed: false },
    { id: "cat-tool", name: "工具", icon: "", color: "#AB47BC", sort: 3, collapsed: false },
  ]
  const items = [
    ["思源笔记", "https://b3log.org/siyuan", "cat-fav", true],
    ["思源社区", "https://ld246.com", "cat-fav", true],
    ["百度", "https://www.baidu.com", "cat-fav", false],
    ["GitHub", "https://github.com", "cat-dev", true],
    ["Stack Overflow", "https://stackoverflow.com", "cat-dev", false],
    ["MDN Web Docs", "https://developer.mozilla.org", "cat-dev", false],
    ["Vue.js", "https://vuejs.org", "cat-dev", false],
    ["Vite", "https://vitejs.dev", "cat-dev", false],
    ["Google", "https://www.google.com", "cat-search", false],
    ["Bing", "https://www.bing.com", "cat-search", false],
    ["飞书", "https://www.feishu.cn", "cat-tool", false],
    ["腾讯文档", "https://docs.qq.com", "cat-tool", false],
  ]
  const bookmarks = items.map(([name, url, categoryId, favorite], i) => ({
    id: uid("bm"),
    name,
    url,
    categoryId,
    iconType: "auto",
    icon: "",
    letter: "",
    color: "",
    sort: i,
    favorite,
    clicks: 0,
    lastClick: 0,
    createdAt: Date.now() + i,
  }))
  return { categories: cats, bookmarks }
}

class AppPortalStore {
  plugin = null
  state = reactive({
    loaded: false,
    categories: [],
    bookmarks: [],
    settings: { ...DEFAULT_SETTINGS },
  })

  #saveQueued = debounce(() => this.flush(), 400)

  async init(plugin) {
    this.plugin = plugin
    let data = null
    try {
      data = await plugin.loadData(STORAGE_NAME)
    } catch (err) {
      console.warn("[AppPortal] 读取数据失败，使用初始数据", err)
    }
    if (!data || !Array.isArray(data.bookmarks) || !Array.isArray(data.categories)) {
      const seed = seedBookmarks()
      data = { version: DATA_VERSION, ...seed, settings: {} }
    }
    this.state.categories = data.categories
    this.state.bookmarks = data.bookmarks
    this.state.settings = { ...DEFAULT_SETTINGS, ...(data.settings || {}) }
    this.state.loaded = true
    await this.flush()
  }

  snapshot() {
    return {
      version: DATA_VERSION,
      categories: this.state.categories,
      bookmarks: this.state.bookmarks,
      settings: this.state.settings,
    }
  }

  async flush() {
    if (!this.plugin || !this.state.loaded) return
    await this.plugin.saveData(STORAGE_NAME, this.snapshot())
  }

  save() {
    this.#saveQueued()
  }

  // ---------- 分类 ----------

  sortedCategories() {
    return this.state.categories.slice().sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0))
  }

  categoryName(id) {
    const cat = this.state.categories.find(c => c.id === id)
    return cat ? cat.name : "未分类"
  }

  addCategory({ name, icon = "", color = "" }) {
    const sort = this.state.categories.length
    const cat = { id: uid("cat"), name: name.trim(), icon, color, sort, collapsed: false }
    this.state.categories.push(cat)
    this.save()
    return cat
  }

  updateCategory(id, patch) {
    const cat = this.state.categories.find(c => c.id === id)
    if (!cat) return
    Object.assign(cat, patch)
    this.save()
  }

  removeCategory(id) {
    this.state.categories = this.state.categories.filter(c => c.id !== id)
    for (const bm of this.state.bookmarks) {
      if (bm.categoryId === id) bm.categoryId = ""
    }
    if (this.state.settings.defaultCategoryId === id) {
      this.state.settings.defaultCategoryId = ""
    }
    this.save()
  }

  reorderCategories(orderedIds) {
    orderedIds.forEach((id, i) => {
      const cat = this.state.categories.find(c => c.id === id)
      if (cat) cat.sort = i
    })
    this.save()
  }

  toggleCollapse(id) {
    const cat = this.state.categories.find(c => c.id === id)
    if (cat) {
      cat.collapsed = !cat.collapsed
      this.save()
    }
  }

  bookmarksOfCategory(categoryId) {
    const list = this.state.bookmarks.filter(b => (b.categoryId || "") === (categoryId || ""))
    return this.sortBookmarks(list)
  }

  sortBookmarks(list) {
    const by = this.state.settings.sortBy
    const sorted = list.slice().sort((a, b) => {
      if (by === "clicks") return (b.clicks || 0) - (a.clicks || 0) || (a.sort ?? 0) - (b.sort ?? 0)
      if (by === "recent") return (b.lastClick || 0) - (a.lastClick || 0) || (a.sort ?? 0) - (b.sort ?? 0)
      return (a.sort ?? 0) - (b.sort ?? 0)
    })
    return sorted
  }

  favoriteBookmarks() {
    return this.sortBookmarks(this.state.bookmarks.filter(b => b.favorite))
  }

  // ---------- 书签 ----------

  addBookmark(input) {
    const maxSort = this.state.bookmarks
      .filter(b => (b.categoryId || "") === (input.categoryId || ""))
      .reduce((max, b) => Math.max(max, b.sort ?? 0), -1)
    const bm = {
      id: uid("bm"),
      name: input.name.trim(),
      url: normalizeUrl(input.url),
      categoryId: input.categoryId || "",
      iconType: input.iconType || "auto",
      icon: input.icon || "",
      letter: input.letter || "",
      color: input.color || "",
      sort: maxSort + 1,
      favorite: !!input.favorite,
      clicks: 0,
      lastClick: 0,
      createdAt: Date.now(),
    }
    this.state.bookmarks.push(bm)
    this.save()
    return bm
  }

  updateBookmark(id, patch) {
    const bm = this.state.bookmarks.find(b => b.id === id)
    if (!bm) return
    if (patch.url) patch.url = normalizeUrl(patch.url)
    Object.assign(bm, patch)
    this.save()
  }

  removeBookmark(id) {
    this.state.bookmarks = this.state.bookmarks.filter(b => b.id !== id)
    this.save()
  }

  toggleFavorite(id) {
    const bm = this.state.bookmarks.find(b => b.id === id)
    if (bm) {
      bm.favorite = !bm.favorite
      this.save()
    }
  }

  moveBookmark(id, categoryId) {
    const bm = this.state.bookmarks.find(b => b.id === id)
    if (!bm) return
    bm.categoryId = categoryId || ""
    bm.sort = this.bookmarksOfCategory(bm.categoryId).length
    this.save()
  }

  // 传入当前可见列表的新 id 顺序（同一分类内拖拽排序）
  reorderBookmarks(orderedIds) {
    orderedIds.forEach((id, i) => {
      const bm = this.state.bookmarks.find(b => b.id === id)
      if (bm) bm.sort = i
    })
    this.save()
  }

  recordClick(id) {
    const bm = this.state.bookmarks.find(b => b.id === id)
    if (bm) {
      bm.clicks = (bm.clicks || 0) + 1
      bm.lastClick = Date.now()
      this.save()
    }
  }

  findDuplicate(url) {
    const key = bookmarkKey(url)
    return this.state.bookmarks.find(b => bookmarkKey(b.url) === key)
  }

  // 批量导入。items: [{name,url,categoryName,iconType?,icon?}]
  // 返回 {added, skipped}
  importBookmarks(items, { createCategories = true } = {}) {
    const nameToCat = new Map(this.state.categories.map(c => [c.name, c]))
    let added = 0
    const skipped = []
    const sortCounter = new Map()

    const ensureCategory = (name) => {
      const trimmed = (name || "").trim()
      if (!trimmed) return ""
      if (nameToCat.has(trimmed)) return nameToCat.get(trimmed).id
      if (createCategories) {
        const cat = this.addCategory({ name: trimmed })
        nameToCat.set(trimmed, cat)
        return cat.id
      }
      return ""
    }

    for (const raw of items) {
      const url = normalizeUrl(raw.url)
      if (!url || !/^https?:\/\//.test(url)) {
        skipped.push({ raw, reason: "网址无效" })
        continue
      }
      if (this.findDuplicate(url)) {
        skipped.push({ raw, reason: "与现有书签重复" })
        continue
      }
      const categoryId = ensureCategory(raw.categoryName)
      const idx = sortCounter.get(categoryId) ?? this.bookmarksOfCategory(categoryId).length
      sortCounter.set(categoryId, idx + 1)
      this.state.bookmarks.push({
        id: uid("bm"),
        name: (raw.name || "").trim() || url,
        url,
        categoryId,
        iconType: raw.iconType || "auto",
        icon: raw.icon || "",
        letter: raw.letter || "",
        color: raw.color || "",
        sort: idx,
        favorite: false,
        clicks: 0,
        lastClick: 0,
        createdAt: Date.now() + added,
      })
      added++
    }
    this.save()
    return { added, skipped }
  }

  // 备份恢复（整库替换）
  replaceAll(data) {
    if (!data || !Array.isArray(data.bookmarks) || !Array.isArray(data.categories)) {
      throw new Error("备份文件格式不正确")
    }
    this.state.categories = data.categories
    this.state.bookmarks = data.bookmarks
    this.state.settings = { ...DEFAULT_SETTINGS, ...(data.settings || {}) }
    this.save()
  }

  resetAll() {
    const seed = seedBookmarks()
    this.state.categories = seed.categories
    this.state.bookmarks = seed.bookmarks
    this.state.settings = { ...DEFAULT_SETTINGS }
    this.save()
  }

  updateSettings(patch) {
    Object.assign(this.state.settings, patch)
    this.save()
  }
}

export const store = new AppPortalStore()

// 图标本地缓存（best-effort：favicon 服务允许跨域时存 dataURL，离线可兜底）
const ICON_CACHE_PREFIX = "app-portal-favicon:"

export const iconCache = {
  get(url) {
    try {
      return localStorage.getItem(ICON_CACHE_PREFIX + url) || ""
    } catch {
      return ""
    }
  },
  set(url, dataUrl) {
    try {
      // 简单容量控制：超过 1.5MB 清空旧缓存
      let total = 0
      const keys = []
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i)
        if (k && k.startsWith(ICON_CACHE_PREFIX)) {
          keys.push(k)
          total += (localStorage.getItem(k) || "").length
        }
      }
      if (total > 1.5 * 1024 * 1024) {
        keys.forEach(k => localStorage.removeItem(k))
      }
      localStorage.setItem(ICON_CACHE_PREFIX + url, dataUrl)
    } catch {
      // 配额不足时忽略
    }
  },
  clear() {
    const keys = []
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k && k.startsWith(ICON_CACHE_PREFIX)) keys.push(k)
    }
    keys.forEach(k => localStorage.removeItem(k))
    return keys.length
  },
}
