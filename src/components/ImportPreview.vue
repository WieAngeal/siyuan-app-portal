<template>
  <div class="ap-root">
    <div class="ap-panel">
      <div class="ap-preview-meta">
        <span>来源：{{ sourceName }}</span>
        <span>共 {{ items.length }} 条</span>
        <span>将导入 {{ selectedCount }} 条</span>
        <span v-if="dupCount" style="color:#E8463A">重复 {{ dupCount }} 条（默认不勾选）</span>
      </div>

      <div class="ap-preview-meta">
        <label class="ap-check">
          <input type="radio" value="auto" v-model="mode">
          <span>按书签文件夹自动创建分类</span>
        </label>
        <label class="ap-check">
          <input type="radio" value="fixed" v-model="mode">
          <span>全部导入到</span>
        </label>
        <select v-if="mode === 'fixed'" v-model="fixedCategory" class="b3-select" style="width:160px">
          <option value="">未分类</option>
          <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
        </select>
      </div>

      <div class="ap-preview-list">
        <label v-for="(item, i) in items" :key="i" class="ap-preview-item">
          <input type="checkbox" v-model="checked" :value="i">
          <span class="ap-name">
            <b>{{ item.name }}</b>
            <span>{{ item.url }}</span>
          </span>
          <span v-if="item.categoryName && mode === 'auto'" class="ap-badge">{{ item.categoryName }}</span>
          <span v-if="isDup(item)" class="ap-badge is-dup">已存在</span>
        </label>
      </div>

      <div class="ap-form-foot ap-mt16">
        <button class="b3-button b3-button--cancel" @click="dialog.destroy()">取消</button>
        <button class="b3-button b3-button--text" @click="confirmImport">导入选中项</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from "vue"
import { showMessage } from "siyuan"
import { store } from "../store.js"

const props = defineProps({
  plugin: Object,
  dialog: Object,
  items: { type: Array, default: () => [] },
  sourceName: { type: String, default: "" },
  onDone: Function,
})

const categories = computed(() => store.sortedCategories())
const mode = ref("auto")
const fixedCategory = ref(store.state.settings.defaultCategoryId || "")

const dupIndexSet = new Set()
props.items.forEach((item, i) => {
  if (store.findDuplicate(item.url)) dupIndexSet.add(i)
})
const checked = ref(props.items.map((_, i) => !dupIndexSet.has(i)))

function isDup(item) {
  return !!store.findDuplicate(item.url)
}

const selectedCount = computed(() => checked.value.filter(Boolean).length)
const dupCount = computed(() => dupIndexSet.size)

function confirmImport() {
  const chosen = props.items.filter((_, i) => checked.value.includes(i))
  if (!chosen.length) {
    showMessage("请至少选择一条书签", 2000, "error")
    return
  }
  const payload = chosen.map(item => ({
    name: item.name,
    url: item.url,
    categoryName: mode.value === "fixed" ? store.categoryName(fixedCategory.value) : (item.categoryName || ""),
    iconType: item.iconType,
    icon: item.icon,
  }))
  const { added, skipped } = store.importBookmarks(payload, { createCategories: mode.value === "auto" })
  showMessage(`导入完成：新增 ${added} 条${skipped.length ? `，跳过 ${skipped.length} 条` : ""}`, 4000)
  props.onDone?.()
  props.dialog.destroy()
}
</script>
