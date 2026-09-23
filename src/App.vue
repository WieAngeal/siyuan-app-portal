<template>
  <div class="ap-root ap-launcher">
    <div v-if="wallpaper" class="ap-wallpaper" :style="{ backgroundImage: `url(${wallpaper})` }"></div>
    <div v-if="wallpaper" class="ap-wallpaper-mask" :style="{ opacity: 1 - wallpaperOpacity }"></div>

    <div class="ap-topbar">
      <div v-if="settings.showSearch" class="ap-search">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
        <input v-model="keyword" type="text" placeholder="搜索书签名称或网址…">
        <button v-if="keyword" class="ap-icon-btn" style="width:24px;height:24px" title="清除" @click="keyword = ''">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 6l12 12M18 6 6 18"/></svg>
        </button>
      </div>
      <div class="ap-topbar-actions">
        <button class="ap-icon-btn" title="新增书签" @click="addBookmark">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>
        </button>
        <button class="ap-icon-btn" title="后台管理" @click="plugin.openManager()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.6 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.7 9a1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>
        </button>
      </div>
    </div>

    <div v-if="!keyword" class="ap-cats">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        class="ap-cat"
        :class="{ 'is-active': tab.id === activeId }"
        @click="activeId = tab.id"
      >
        <span v-if="tab.color" class="ap-cat-dot" :style="{ background: tab.color }"></span>
        <span v-else-if="tab.id === FAV_ID">★</span>
        {{ tab.name }}
      </button>
    </div>

    <div
      class="ap-stage"
      @pointerdown="onPointerDown"
      @pointerup="onPointerUp"
    >
      <button v-if="!keyword && tabs.length > 1" class="ap-arrow ap-prev" @click="switchPage(-1)">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><path d="m15 6-6 6 6 6"/></svg>
      </button>
      <button v-if="!keyword && tabs.length > 1" class="ap-arrow ap-next" @click="switchPage(1)">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><path d="m9 6 6 6-6 6"/></svg>
      </button>

      <div class="ap-grid-wrap">
        <div
          v-if="visibleBookmarks.length"
          class="ap-grid"
          :class="{ 'is-fixed': settings.columns > 0 }"
          :style="gridStyle"
        >
          <button
            v-for="bm in visibleBookmarks"
            :key="bm.id"
            class="ap-tile"
            :draggable="canDrag"
            :class="{ 'is-dragging': dragId === bm.id }"
            @click="openBookmark(bm)"
            @contextmenu.prevent="showMenu($event, bm)"
            @mouseenter="showTip($event, bm)"
            @mousemove="moveTip($event)"
            @mouseleave="hideTip"
            @dragstart="onDragStart($event, bm)"
            @dragover.prevent
            @drop.prevent="onDrop(bm)"
            @dragend="dragId = ''"
          >
            <span v-if="bm.favorite" class="ap-fav-badge">★</span>
            <AppIcon :bm="bm" />
            <span class="ap-tile-label">{{ bm.name }}</span>
            <span v-if="keyword" class="ap-cat-chip">{{ categoryName(bm.categoryId) }}</span>
          </button>
        </div>
        <div v-else class="ap-empty">
          <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3.5" y="3.5" width="7.2" height="7.2" rx="2"/><rect x="13.3" y="3.5" width="7.2" height="7.2" rx="2"/><rect x="3.5" y="13.3" width="7.2" height="7.2" rx="2"/><rect x="13.3" y="13.3" width="7.2" height="7.2" rx="2"/></svg>
          <span>{{ keyword ? "没有匹配的书签" : "这个分类还是空的" }}</span>
          <button class="b3-button b3-button--outline" @click="addBookmark">添加第一个书签</button>
        </div>
      </div>
    </div>

    <div v-if="!keyword && tabs.length > 1" class="ap-dots">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        class="ap-dot"
        :class="{ 'is-active': tab.id === activeId }"
        :title="tab.name"
        @click="activeId = tab.id"
      ></button>
    </div>

    <div v-if="tip.visible" class="ap-tooltip" :style="{ left: tip.x + 'px', top: tip.y + 'px' }">
      <b>{{ tip.name }}</b>
      <span>{{ tip.url }}</span>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from "vue"
import { confirm, Menu, showMessage } from "siyuan"
import AppIcon from "./components/AppIcon.vue"
import { store } from "./store.js"
import { openBookmarkEditor } from "./dialogs.js"
import { reorderArray } from "./utils.js"

const FAV_ID = "__favorites__"

const props = defineProps({
  plugin: Object,
  dialog: Object,
})

const keyword = ref("")
const activeId = ref(store.state.settings.defaultCategoryId || null)
const dragId = ref("")

const settings = computed(() => store.state.settings)
const wallpaper = computed(() => store.state.settings.wallpaper)
const wallpaperOpacity = computed(() => store.state.settings.wallpaperOpacity ?? 0.35)

const tabs = computed(() => {
  const list = []
  const favs = store.favoriteBookmarks()
  if (store.state.settings.showFavorites && favs.length) {
    list.push({ key: FAV_ID, id: FAV_ID, name: "收藏", color: "" })
  }
  for (const cat of store.sortedCategories()) {
    list.push({ key: cat.id, id: cat.id, name: cat.name, color: cat.color })
  }
  if (store.bookmarksOfCategory("").length) {
    list.push({ key: "__unfiled__", id: "", name: "未分类", color: "" })
  }
  return list
})

// 当前激活页签被删除时回退到第一个
const effectiveActiveId = computed(() => {
  if (tabs.value.some(t => t.id === activeId.value)) return activeId.value
  return tabs.value[0]?.id ?? null
})

const visibleBookmarks = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  if (kw) {
    return store.sortBookmarks(
      store.state.bookmarks.filter(b =>
        b.name.toLowerCase().includes(kw)
        || b.url.toLowerCase().includes(kw),
      ),
    )
  }
  const id = effectiveActiveId.value
  if (id === FAV_ID) return store.favoriteBookmarks()
  return store.bookmarksOfCategory(id ?? "")
})

const canDrag = computed(() =>
  !keyword.value
  && effectiveActiveId.value !== FAV_ID
  && store.state.settings.sortBy === "manual",
)

const gridStyle = computed(() => {
  const size = store.state.settings.iconSize
  const style = { "--ap-size": `${size}px`, "--ap-cell": `${size + 28}px` }
  if (store.state.settings.columns > 0) {
    style.gridTemplateColumns = `repeat(${store.state.settings.columns}, 1fr)`
  }
  return style
})

function categoryName(id) {
  return id ? store.categoryName(id) : "未分类"
}

function addBookmark() {
  openBookmarkEditor(props.plugin, {
    categoryId: keyword.value ? "" : (effectiveActiveId.value === FAV_ID ? "" : effectiveActiveId.value ?? ""),
  })
}

function openBookmark(bm) {
  if (suppressClick) {
    suppressClick = false
    return
  }
  const win = window.open(bm.url, "_blank")
  if (win) win.opener = null
  store.recordClick(bm.id)
}

// ---------- 右键菜单 ----------

function showMenu(e, bm) {
  hideTip()
  const menu = new Menu("ap-bm-menu")
  menu.addItem({ icon: "iconOpen", label: "打开网站", click: () => openBookmark(bm) })
  menu.addItem({ icon: "iconCopy", label: "复制网址", click: () => copyUrl(bm.url) })
  menu.addItem({
    icon: bm.favorite ? "iconStarFill" : "iconStar",
    label: bm.favorite ? "取消收藏" : "加入收藏",
    click: () => store.toggleFavorite(bm.id),
  })

  const cats = store.sortedCategories()
  if (cats.length) {
    menu.addItem({
      icon: "iconFolder",
      label: "移动到…",
      submenu: [
        ...cats.map(cat => ({
          label: cat.name,
          click: () => store.moveBookmark(bm.id, cat.id),
        })),
        { label: "未分类", click: () => store.moveBookmark(bm.id, "") },
      ],
    })
  }

  menu.addSeparator()
  menu.addItem({
    icon: "iconEdit",
    label: "编辑",
    click: () => openBookmarkEditor(props.plugin, { bookmark: bm }),
  })
  menu.addItem({
    icon: "iconTrashcan",
    label: "删除",
    click: () => {
      confirm("删除书签", `确定删除「${bm.name}」吗？`, () => {
        store.removeBookmark(bm.id)
        showMessage("已删除")
      })
    },
  })
  menu.open({ x: e.clientX, y: e.clientY })
}

function copyUrl(url) {
  navigator.clipboard?.writeText(url).then(
    () => showMessage("网址已复制"),
    () => showMessage("复制失败，请手动复制", 2000, "error"),
  )
}

// ---------- 拖拽排序 ----------

function onDragStart(e, bm) {
  dragId.value = bm.id
  e.dataTransfer.effectAllowed = "move"
}

function onDrop(target) {
  if (!dragId.value || dragId.value === target.id) return
  const ids = reorderArray(visibleBookmarks.value.map(x => ({ id: x.id })), dragId.value, target.id).map(x => x.id)
  store.reorderBookmarks(ids)
  dragId.value = ""
}

// ---------- 左右滑动切换 ----------

let startX = 0
let startY = 0
let suppressClick = false

function onPointerDown(e) {
  startX = e.clientX
  startY = e.clientY
}

function onPointerUp(e) {
  const dx = e.clientX - startX
  const dy = e.clientY - startY
  if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.4) {
    switchPage(dx < 0 ? 1 : -1)
    suppressClick = true
    setTimeout(() => { suppressClick = false }, 120)
  }
}

function switchPage(delta) {
  const idx = tabs.value.findIndex(t => t.id === effectiveActiveId.value)
  if (idx < 0) return
  const next = (idx + delta + tabs.value.length) % tabs.value.length
  activeId.value = tabs.value[next].id
}

// ---------- 悬停提示 ----------

const tip = ref({ visible: false, x: 0, y: 0, name: "", url: "" })

function showTip(e, bm) {
  tip.value = { visible: true, x: e.clientX + 14, y: e.clientY + 14, name: bm.name, url: bm.url }
}

function moveTip(e) {
  if (!tip.value.visible) return
  const x = Math.min(e.clientX + 14, window.innerWidth - 340)
  const y = Math.min(e.clientY + 14, window.innerHeight - 70)
  tip.value.x = x
  tip.value.y = y
}

function hideTip() {
  tip.value.visible = false
}
</script>
