<template>
  <div class="ap-root ap-manage">
    <div class="ap-tabs">
      <button v-for="t in tabs" :key="t.id" class="ap-tab" :class="{ 'is-active': tab === t.id }" @click="tab = t.id">{{ t.name }}</button>
    </div>

    <!-- 书签管理 -->
    <div v-if="tab === 'bookmarks'" class="ap-panel">
      <div class="ap-toolbar">
        <input v-model="kw" class="b3-text-field" placeholder="搜索名称或网址…" style="min-width:200px">
        <select v-model="filterCat" class="b3-select">
          <option value="__all__">全部分类</option>
          <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
          <option value="">未分类</option>
        </select>
        <button class="b3-button b3-button--text" @click="addBookmark">
          <svg class="b3-icon"><use xlink:href="#iconAdd"></use></svg> 新增书签
        </button>
        <span class="ap-muted" style="margin-left:auto">{{ filteredBookmarks.length }} 条</span>
      </div>

      <table class="ap-table">
        <thead>
          <tr>
            <th style="width:28px"></th>
            <th>名称</th>
            <th>网址</th>
            <th style="width:130px">分类</th>
            <th style="width:48px">收藏</th>
            <th style="width:56px">点击</th>
            <th style="width:90px">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="bm in filteredBookmarks"
            :key="bm.id"
            draggable="true"
            @dragstart="onBmDragStart(bm.id)"
            @dragover.prevent
            @drop="onBmDrop(bm.id)"
          >
            <td><span class="ap-drag-handle" title="拖拽排序">⋮⋮</span></td>
            <td>
              <span class="ap-row-icon">
                <AppIcon :bm="bm" :size="28" />
                <span>{{ bm.name }}</span>
              </span>
            </td>
            <td><div class="ap-url" :title="bm.url">{{ bm.url }}</div></td>
            <td>
              <select class="b3-select" style="width:120px" :value="bm.categoryId" @change="store.moveBookmark(bm.id, $event.target.value)">
                <option value="">未分类</option>
                <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
              </select>
            </td>
            <td>
              <button class="ap-star-btn" :class="{ 'is-on': bm.favorite }" title="收藏" @click="store.toggleFavorite(bm.id)">★</button>
            </td>
            <td>{{ bm.clicks || 0 }}</td>
            <td>
              <span class="ap-actions">
                <button class="ap-icon-btn" title="编辑" @click="openBookmarkEditor(plugin, { bookmark: bm })">
                  <svg class="b3-icon"><use xlink:href="#iconEdit"></use></svg>
                </button>
                <button class="ap-icon-btn" title="删除" @click="removeBookmark(bm)">
                  <svg class="b3-icon"><use xlink:href="#iconTrashcan"></use></svg>
                </button>
              </span>
            </td>
          </tr>
          <tr v-if="!filteredBookmarks.length">
            <td colspan="7" class="ap-muted" style="text-align:center;padding:24px">暂无书签</td>
          </tr>
        </tbody>
      </table>
      <p v-if="filterCat !== '__all__'" class="ap-muted ap-mt8">提示：在单一分类内可拖拽行进行排序。</p>
    </div>

    <!-- 分类管理 -->
    <div v-if="tab === 'categories'" class="ap-panel">
      <div class="ap-toolbar">
        <button class="b3-button b3-button--text" @click="addCategory">
          <svg class="b3-icon"><use xlink:href="#iconAdd"></use></svg> 新增分类
        </button>
      </div>
      <table class="ap-table">
        <thead>
          <tr>
            <th style="width:28px"></th>
            <th>分类</th>
            <th style="width:90px">书签数</th>
            <th style="width:120px">默认分类</th>
            <th style="width:90px">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="cat in categories"
            :key="cat.id"
            draggable="true"
            @dragstart="onCatDragStart(cat.id)"
            @dragover.prevent
            @drop="onCatDrop(cat.id)"
          >
            <td><span class="ap-drag-handle" title="拖拽排序">⋮⋮</span></td>
            <td>
              <span class="ap-row-icon">
                <span class="ap-mini-ico" :style="{ background: cat.color || autoColor(cat.name) }">
                  {{ cat.icon || Array.from(cat.name)[0] }}
                </span>
                {{ cat.name }}
              </span>
            </td>
            <td>{{ countOf(cat.id) }}</td>
            <td>
              <input type="radio" name="default-cat" :checked="settings.defaultCategoryId === cat.id" @change="setDefault(cat.id)">
            </td>
            <td>
              <span class="ap-actions">
                <button class="ap-icon-btn" title="编辑" @click="openCategoryEditor(plugin, { category: cat })">
                  <svg class="b3-icon"><use xlink:href="#iconEdit"></use></svg>
                </button>
                <button class="ap-icon-btn" title="删除" @click="removeCategory(cat)">
                  <svg class="b3-icon"><use xlink:href="#iconTrashcan"></use></svg>
                </button>
              </span>
            </td>
          </tr>
          <tr v-if="!categories.length">
            <td colspan="5" class="ap-muted" style="text-align:center;padding:24px">还没有分类</td>
          </tr>
        </tbody>
      </table>
      <p class="ap-muted ap-mt8">删除分类后，其下书签会自动移动到「未分类」。</p>
    </div>

    <!-- 导入 / 导出 -->
    <div v-if="tab === 'io'" class="ap-panel">
      <div class="ap-cards">
        <div class="ap-card">
          <h4>浏览器书签导入</h4>
          <p>支持 Chrome / Edge / Firefox 导出的 HTML 书签文件，自动按文件夹创建分类，并识别重复项。</p>
          <div class="ap-card-actions">
            <button class="b3-button b3-button--outline" @click="pick('html')">选择 HTML 文件</button>
          </div>
        </div>
        <div class="ap-card">
          <h4>JSON 批量导入</h4>
          <p>支持本插件导出的备份文件，或 [{name, url, category}] 格式的书签数组。</p>
          <div class="ap-card-actions">
            <button class="b3-button b3-button--outline" @click="pick('json')">选择 JSON 文件</button>
          </div>
        </div>
        <div class="ap-card">
          <h4>CSV 批量导入</h4>
          <p>表头格式：name,url,category，可选 iconType、icon 列。</p>
          <div class="ap-card-actions">
            <button class="b3-button b3-button--outline" @click="pick('csv')">选择 CSV 文件</button>
          </div>
        </div>
        <div class="ap-card">
          <h4>采集文档链接</h4>
          <p>扫描笔记正文中的外部超链接，自动去重后勾选导入（最多采集 80 条）。</p>
          <div class="ap-card-actions">
            <button class="b3-button b3-button--outline" :disabled="collecting" @click="collectDocs">{{ collecting ? "采集中…" : "开始采集" }}</button>
          </div>
        </div>
        <div class="ap-card">
          <h4>导出备份</h4>
          <p>将分类、书签和设置导出为单个 JSON 文件，便于迁移或分享。</p>
          <div class="ap-card-actions">
            <button class="b3-button b3-button--outline" @click="exportBackup">导出 JSON</button>
          </div>
        </div>
        <div class="ap-card">
          <h4>恢复备份</h4>
          <p>从 JSON 备份整体恢复，当前全部数据将被替换。</p>
          <div class="ap-card-actions">
            <button class="b3-button b3-button--outline" @click="pick('restore')">选择备份文件</button>
          </div>
        </div>
        <div class="ap-card">
          <h4>图标缓存</h4>
          <p>清理自动 favicon 产生的本地缓存（约 {{ cacheNote }}）。</p>
          <div class="ap-card-actions">
            <button class="b3-button b3-button--outline" @click="clearCache">清空缓存</button>
          </div>
        </div>
        <div class="ap-card">
          <h4>重置数据</h4>
          <p>清空所有书签与分类，恢复为插件自带的示例数据。</p>
          <div class="ap-card-actions">
            <button class="b3-button b3-button--outline" style="color:#E8463A" @click="resetAll">重置全部</button>
          </div>
        </div>
      </div>
      <input ref="fileInput" type="file" hidden :accept="acceptOf" @change="onFilePicked">
    </div>

    <!-- 偏好设置 -->
    <SettingsPanel v-if="tab === 'settings'" />
  </div>
</template>

<script setup>
import { computed, ref } from "vue"
import { confirm, showMessage } from "siyuan"
import AppIcon from "./AppIcon.vue"
import SettingsPanel from "./SettingsPanel.vue"
import { iconCache, store } from "../store.js"
import { openBookmarkEditor, openCategoryEditor, openImportPreview } from "../dialogs.js"
import { collectLinksFromDocs } from "../api.js"
import { parseBookmarkCsv, parseBookmarkHtml, parseBookmarkJson } from "../parsers.js"
import { colorFromString, downloadTextFile, readFileAsText, reorderArray } from "../utils.js"

const props = defineProps({
  plugin: Object,
  dialog: Object,
})

const tab = ref("bookmarks")
const tabs = [
  { id: "bookmarks", name: "书签管理" },
  { id: "categories", name: "分类管理" },
  { id: "io", name: "导入 / 备份" },
  { id: "settings", name: "偏好设置" },
]

const categories = computed(() => store.sortedCategories())
const settings = computed(() => store.state.settings)
const kw = ref("")
const filterCat = ref("__all__")
const collecting = ref(false)
const cacheNote = ref("")

const filteredBookmarks = computed(() => {
  const key = kw.value.trim().toLowerCase()
  const source = filterCat.value === "__all__"
    ? store.state.bookmarks
    : store.state.bookmarks.filter(b => (b.categoryId || "") === filterCat.value)
  const list = store.sortBookmarks(source)
  if (!key) return list
  return list.filter(b => b.name.toLowerCase().includes(key) || b.url.toLowerCase().includes(key))
})

function addBookmark() {
  openBookmarkEditor(props.plugin, { categoryId: filterCat.value === "__all__" ? "" : filterCat.value })
}

function addCategory() {
  openCategoryEditor(props.plugin)
}

function removeBookmark(bm) {
  confirm("删除书签", `确定删除「${bm.name}」吗？`, () => {
    store.removeBookmark(bm.id)
    showMessage("已删除")
  })
}

function removeCategory(cat) {
  confirm(
    "删除分类",
    `删除分类「${cat.name}」？其下 ${countOf(cat.id)} 个书签将移动到「未分类」。`,
    () => {
      store.removeCategory(cat.id)
      if (filterCat.value === cat.id) filterCat.value = "__all__"
      showMessage("分类已删除")
    },
  )
}

function countOf(id) {
  return store.state.bookmarks.filter(b => b.categoryId === id).length
}

function autoColor(name) {
  return colorFromString(name)
}

function setDefault(id) {
  store.updateSettings({ defaultCategoryId: id })
  showMessage("已设为默认分类")
}

// 表格拖拽
let bmDragId = ""
let catDragId = ""

function onBmDragStart(id) {
  if (filterCat.value === "__all__") {
    showMessage("请先在上方筛选到单一分类后再拖拽排序", 2000)
    return
  }
  bmDragId = id
}

function onBmDrop(targetId) {
  if (!bmDragId) return
  const ids = reorderArray(filteredBookmarks.value.map(b => ({ id: b.id })), bmDragId, targetId).map(x => x.id)
  store.reorderBookmarks(ids)
  bmDragId = ""
}

function onCatDragStart(id) {
  catDragId = id
}

function onCatDrop(targetId) {
  if (!catDragId) return
  const ids = reorderArray(categories.value.map(c => ({ id: c.id })), catDragId, targetId).map(x => x.id)
  store.reorderCategories(ids)
  catDragId = ""
}

// ---------- 导入导出 ----------

const fileInput = ref(null)
const acceptMap = {
  html: ".html,.htm",
  json: ".json",
  csv: ".csv,.txt",
  restore: ".json",
}
const acceptOf = ref(".html,.htm")
let pendingKind = "html"

function pick(kind) {
  pendingKind = kind
  acceptOf.value = acceptMap[kind]
  fileInput.value?.click()
}

async function onFilePicked(e) {
  const file = e.target.files?.[0]
  e.target.value = ""
  if (!file) return
  try {
    const text = await readFileAsText(file)
    if (pendingKind === "restore") {
      const data = JSON.parse(text)
      confirm("恢复备份", "将用备份内容替换当前全部数据，确定继续？", () => {
        store.replaceAll(data)
        showMessage("备份已恢复")
      })
      return
    }
    let parsed
    if (pendingKind === "html") parsed = parseBookmarkHtml(text)
    else if (pendingKind === "json") parsed = parseBookmarkJson(text)
    else parsed = parseBookmarkCsv(text)
    if (!parsed.bookmarks.length) {
      showMessage("文件中没有可导入的书签", 3000, "error")
      return
    }
    openImportPreview(props.plugin, { items: parsed.bookmarks, sourceName: file.name })
  } catch (err) {
    console.error(err)
    showMessage(`解析失败：${err.message}`, 4000, "error")
  }
}

async function collectDocs() {
  collecting.value = true
  try {
    const items = await collectLinksFromDocs()
    if (!items.length) {
      showMessage("未在笔记中发现外部链接", 3000)
      return
    }
    openImportPreview(props.plugin, { items, sourceName: "文档链接采集" })
  } catch (err) {
    showMessage(`采集失败：${err.message}`, 4000, "error")
  } finally {
    collecting.value = false
  }
}

function exportBackup() {
  const date = new Date().toISOString().slice(0, 10)
  downloadTextFile(`app-portal-backup-${date}.json`, JSON.stringify(store.snapshot(), null, 2))
  showMessage("备份已导出")
}

function clearCache() {
  const n = iconCache.clear()
  cacheNote.value = ""
  showMessage(n ? `已清空 ${n} 项图标缓存` : "缓存本来就是空的")
}

function resetAll() {
  confirm("重置全部数据", "所有书签、分类和设置都将恢复为示例数据，确定继续？", () => {
    store.resetAll()
    showMessage("已重置")
  })
}
</script>
