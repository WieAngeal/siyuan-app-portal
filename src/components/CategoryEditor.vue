<template>
  <div class="ap-root">
    <div class="ap-form">
      <div class="ap-form-row">
        <label>分类名称</label>
        <input v-model="form.name" class="b3-text-field" placeholder="例如：开发" maxlength="20">
      </div>
      <div class="ap-form-row">
        <label>图标（可选，填写 Emoji）</label>
        <input v-model="form.icon" class="b3-text-field" maxlength="4" style="width:120px" placeholder="例如：💻">
      </div>
      <div class="ap-form-row">
        <label>配色</label>
        <div class="ap-swatches">
          <button class="ap-swatch" title="自动" style="background: conic-gradient(#EF5350,#FFA726,#66BB6A,#42A5F5,#AB47BC,#EF5350)" :class="{ 'is-active': form.color === '' }" @click="form.color = ''"></button>
          <button v-for="c in palette" :key="c" class="ap-swatch" :style="{ background: c }" :class="{ 'is-active': form.color === c }" @click="form.color = c"></button>
        </div>
      </div>
      <div class="ap-icon-preview-row">
        <span class="ap-mini-ico" :style="{ background: previewColor, width: '36px', height: '36px', borderRadius: '10px', fontSize: '18px' }">{{ form.icon || (form.name ? Array.from(form.name)[0] : "?") }}</span>
        <span class="ap-muted">{{ form.name || "分类预览" }}</span>
      </div>
      <div class="ap-form-foot">
        <button class="b3-button b3-button--cancel" @click="dialog.destroy()">取消</button>
        <button class="b3-button b3-button--text" @click="save">保存</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, reactive } from "vue"
import { showMessage } from "siyuan"
import { store } from "../store.js"
import { colorFromString } from "../utils.js"

const props = defineProps({
  plugin: Object,
  dialog: Object,
  category: Object,
})

const palette = ["#0FDC78", "#EF5350", "#EC407A", "#AB47BC", "#5C6BC0", "#42A5F5", "#26C6DA", "#26A69A", "#66BB6A", "#FFA726", "#FF7043", "#78909C"]

const form = reactive({
  name: props.category?.name || "",
  icon: props.category?.icon || "",
  color: props.category?.color || "",
})

const previewColor = computed(() => form.color || colorFromString(form.name || "cat"))

function save() {
  if (!form.name.trim()) {
    showMessage("请填写分类名称", 2000, "error")
    return
  }
  if (props.category) {
    store.updateCategory(props.category.id, { ...form })
  } else {
    store.addCategory({ ...form })
  }
  showMessage("分类已保存")
  props.dialog.destroy()
}
</script>
