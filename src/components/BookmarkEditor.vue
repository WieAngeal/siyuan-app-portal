<template>
  <div class="ap-root">
    <div class="ap-form">
      <div class="ap-form-row">
        <label>名称</label>
        <input v-model="form.name" class="b3-text-field" placeholder="例如：GitHub" maxlength="60">
      </div>
      <div class="ap-form-row">
        <label>网址</label>
        <input v-model="form.url" class="b3-text-field" placeholder="https://github.com" maxlength="2000">
      </div>
      <div class="ap-form-row">
        <label>分类</label>
        <select v-model="form.categoryId" class="b3-select">
          <option value="">未分类</option>
          <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
        </select>
      </div>
      <div class="ap-form-row">
        <label>图标</label>
        <div class="ap-type-switch">
          <button v-for="t in types" :key="t.value" :class="{ 'is-active': form.iconType === t.value }" @click="form.iconType = t.value">{{ t.label }}</button>
        </div>
      </div>

      <div v-if="form.iconType === 'text'" class="ap-form-row">
        <label>显示文字（1-2 个字符）</label>
        <input v-model="form.letter" class="b3-text-field" maxlength="2" style="width:120px" placeholder="自动取名称首字">
      </div>
      <div v-if="form.iconType === 'emoji'" class="ap-form-row">
        <label>Emoji</label>
        <input v-model="form.icon" class="b3-text-field" maxlength="8" style="width:120px" placeholder="例如：🚀">
      </div>
      <div v-if="form.iconType === 'image'" class="ap-form-row">
        <label>自定义图片</label>
        <div class="ap-icon-preview-row">
          <AppIcon :bm="previewBm" :size="48" />
          <button class="b3-button b3-button--outline" @click="pickImage">选择图片</button>
          <input ref="fileInput" type="file" accept="image/*" hidden @change="onFile">
        </div>
        <input v-model="form.icon" class="b3-text-field ap-mt8" placeholder="或粘贴图片地址（http(s) / dataURL）">
      </div>

      <div v-if="form.iconType === 'text' || form.iconType === 'emoji'" class="ap-form-row">
        <label>底色</label>
        <div class="ap-swatches">
          <button class="ap-swatch" title="自动" style="background: conic-gradient(#EF5350,#FFA726,#66BB6A,#42A5F5,#AB47BC,#EF5350)" :class="{ 'is-active': form.color === '' }" @click="form.color = ''"></button>
          <button v-for="c in palette" :key="c" class="ap-swatch" :style="{ background: c }" :class="{ 'is-active': form.color === c }" @click="form.color = c"></button>
        </div>
      </div>

      <label class="ap-check">
        <input type="checkbox" v-model="form.favorite">
        <span>加入收藏（桌面置顶显示）</span>
      </label>

      <div class="ap-icon-preview-row ap-mt8">
        <span class="ap-muted">预览</span>
        <AppIcon :bm="previewBm" :size="56" />
      </div>

      <div class="ap-form-foot">
        <button class="b3-button b3-button--cancel" @click="dialog.destroy()">取消</button>
        <button class="b3-button b3-button--text" @click="save">保存</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, reactive, ref } from "vue"
import { showMessage } from "siyuan"
import AppIcon from "./AppIcon.vue"
import { store } from "../store.js"
import { colorFromString, fileToDataUrl, letterOf } from "../utils.js"

const props = defineProps({
  plugin: Object,
  dialog: Object,
  bookmark: Object,
  categoryId: { type: String, default: "" },
})

const palette = ["#EF5350", "#EC407A", "#AB47BC", "#7E57C2", "#5C6BC0", "#42A5F5", "#29B6F6", "#26A69A", "#66BB6A", "#FFA726", "#FF7043", "#78909C"]
const types = [
  { value: "auto", label: "自动 favicon" },
  { value: "text", label: "首字图标" },
  { value: "emoji", label: "Emoji" },
  { value: "image", label: "自定义图片" },
]

const categories = computed(() => store.sortedCategories())
const fileInput = ref(null)

const form = reactive({
  name: props.bookmark?.name || "",
  url: props.bookmark?.url || "",
  categoryId: props.bookmark?.categoryId ?? props.categoryId ?? store.state.settings.defaultCategoryId ?? "",
  favorite: props.bookmark?.favorite || false,
  iconType: props.bookmark?.iconType || "auto",
  icon: props.bookmark?.icon || "",
  letter: props.bookmark?.letter || "",
  color: props.bookmark?.color || "",
})

const previewBm = computed(() => ({
  name: form.name || "预览",
  url: form.url || "example.com",
  iconType: form.iconType,
  icon: form.icon,
  letter: form.letter || letterOf(form.name || "预"),
  color: form.color || colorFromString(form.name || "example"),
}))

function pickImage() {
  fileInput.value?.click()
}

async function onFile(e) {
  const file = e.target.files?.[0]
  if (!file) return
  if (file.size > 4 * 1024 * 1024) {
    showMessage("图片请控制在 4MB 以内", 3000, "error")
    return
  }
  form.icon = await fileToDataUrl(file)
}

function save() {
  if (!form.name.trim()) {
    showMessage("请填写名称", 2000, "error")
    return
  }
  if (!form.url.trim()) {
    showMessage("请填写网址", 2000, "error")
    return
  }
  if (props.bookmark) {
    store.updateBookmark(props.bookmark.id, { ...form })
    showMessage("已更新书签")
  } else {
    store.addBookmark({ ...form })
    showMessage("已添加书签")
  }
  props.dialog.destroy()
}
</script>
