<template>
  <div class="ap-panel">
    <div class="ap-settings-group">
      <h4>桌面外观</h4>
      <div class="ap-setting-row">
        <div class="ap-setting-label">图标尺寸</div>
        <select class="b3-select" :value="settings.iconSize" @change="update('iconSize', Number($event.target.value))">
          <option :value="48">小（48px）</option>
          <option :value="56">标准（56px）</option>
          <option :value="64">大（64px）</option>
          <option :value="72">特大（72px）</option>
        </select>
      </div>
      <div class="ap-setting-row">
        <div class="ap-setting-label">每行图标个数<small>自动会按弹窗宽度适配</small></div>
        <select class="b3-select" :value="settings.columns" @change="update('columns', Number($event.target.value))">
          <option :value="0">自适应</option>
          <option v-for="n in [5, 6, 7, 8, 9, 10]" :key="n" :value="n">{{ n }} 个</option>
        </select>
      </div>
      <div class="ap-setting-row">
        <div class="ap-setting-label">桌面壁纸<small>上传本地图片作为桌面背景</small></div>
        <div style="display:flex;align-items:center;gap:10px">
          <div v-if="settings.wallpaper" class="ap-wall-preview" :style="{ backgroundImage: `url(${settings.wallpaper})` }"></div>
          <button class="b3-button b3-button--outline" @click="pickWallpaper">上传图片</button>
          <button v-if="settings.wallpaper" class="b3-button b3-button--cancel" @click="update('wallpaper', '')">清除</button>
          <input ref="wallInput" type="file" accept="image/*" hidden @change="onWallpaper">
        </div>
      </div>
      <div v-if="settings.wallpaper" class="ap-setting-row">
        <div class="ap-setting-label">壁纸浓度</div>
        <div class="ap-range-row">
          <input type="range" min="0.05" max="1" step="0.05" :value="settings.wallpaperOpacity" @input="update('wallpaperOpacity', Number($event.target.value))">
          <span class="ap-muted">{{ Math.round(settings.wallpaperOpacity * 100) }}%</span>
        </div>
      </div>
    </div>

    <div class="ap-settings-group">
      <h4>行为与排序</h4>
      <div class="ap-setting-row">
        <div class="ap-setting-label">书签排序方式<small>桌面网格与管理列表共用</small></div>
        <select class="b3-select" :value="settings.sortBy" @change="update('sortBy', $event.target.value)">
          <option value="manual">手动排序（可拖拽）</option>
          <option value="clicks">按点击次数</option>
          <option value="recent">按最近使用</option>
        </select>
      </div>
      <div class="ap-setting-row">
        <div class="ap-setting-label">默认分类<small>打开桌面与新增书签时的初始分类</small></div>
        <select class="b3-select" :value="settings.defaultCategoryId" @change="update('defaultCategoryId', $event.target.value)">
          <option value="">第一个分类</option>
          <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
        </select>
      </div>
      <div class="ap-setting-row">
        <div class="ap-setting-label">显示收藏页<small>置顶展示所有收藏的书签</small></div>
        <button class="ap-switch" :class="{ 'is-on': settings.showFavorites }" @click="update('showFavorites', !settings.showFavorites)"></button>
      </div>
      <div class="ap-setting-row">
        <div class="ap-setting-label">显示搜索框<small>跨分类搜索书签名称和网址</small></div>
        <button class="ap-switch" :class="{ 'is-on': settings.showSearch }" @click="update('showSearch', !settings.showSearch)"></button>
      </div>
    </div>

    <div class="ap-settings-group">
      <h4>图标获取</h4>
      <div class="ap-setting-row">
        <div class="ap-setting-label">favicon 来源<small>自动图标优先使用该服务，失败后回退到网站根目录</small></div>
        <select class="b3-select" :value="presetValue" @change="onPresetChange($event.target.value)">
          <option v-for="s in services" :key="s.value" :value="s.value">{{ s.label }}</option>
          <option value="__custom__" :selected="isCustom">自定义模板…</option>
        </select>
      </div>
      <div class="ap-setting-row">
        <div class="ap-setting-label">自定义模板<small>支持变量 {domain} 和 {origin}</small></div>
        <input type="text" class="b3-text-field" v-model="customService" @change="update('faviconService', customService)" placeholder="https://www.google.com/s2/favicons?domain={domain}&sz=128">
      </div>
      <p class="ap-muted" style="font-size:12px;line-height:1.7">
        国内网络推荐使用「网站自带」或可正常访问的图标服务；任一 favicon 加载失败时，图标会自动降级为彩色首字图标，不会出现空白。
      </p>
    </div>

    <div class="ap-settings-group">
      <h4>数据存储</h4>
      <div class="ap-setting-row">
        <div class="ap-setting-label">
          数据文件位置<small>分类 / 书签 / 设置均保存在该 JSON 中，随工作空间一起同步</small>
        </div>
        <code class="ap-muted">data/plugins/siyuan-app-portal/data/data.json</code>
      </div>
      <div class="ap-setting-row">
        <div class="ap-setting-label">当前规模</div>
        <span class="ap-muted">{{ store.state.categories.length }} 个分类 · {{ store.state.bookmarks.length }} 个书签</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from "vue"
import { showMessage } from "siyuan"
import { store } from "../store.js"
import { FAVICON_SERVICES, fileToDataUrl } from "../utils.js"

const services = FAVICON_SERVICES
const wallInput = ref(null)

const settings = computed(() => store.state.settings)
const categories = computed(() => store.sortedCategories())

const presetValues = services.map(s => s.value)
const isCustom = computed(() => !presetValues.includes(settings.value.faviconService))
const presetValue = computed(() => (isCustom.value ? "__custom__" : settings.value.faviconService))
const customService = ref(isCustom.value ? settings.value.faviconService : "")

function update(key, value) {
  store.updateSettings({ [key]: value })
}

function onPresetChange(value) {
  if (value === "__custom__") {
    update("faviconService", customService.value || "https://www.google.com/s2/favicons?domain={domain}&sz=128")
  } else {
    customService.value = ""
    update("faviconService", value)
  }
}

function pickWallpaper() {
  wallInput.value?.click()
}

async function onWallpaper(e) {
  const file = e.target.files?.[0]
  e.target.value = ""
  if (!file) return
  if (file.size > 6 * 1024 * 1024) {
    showMessage("壁纸请控制在 6MB 以内", 3000, "error")
    return
  }
  update("wallpaper", await fileToDataUrl(file))
}
</script>
