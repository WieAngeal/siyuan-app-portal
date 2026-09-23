<template>
  <span
    class="ap-ico"
    :style="{
      width: size ? size + 'px' : undefined,
      height: size ? size + 'px' : undefined,
      background: tileBg,
      fontSize: size ? size * .42 + 'px' : undefined,
    }"
  >
    <img
      v-if="showImg"
      :src="currentSrc"
      :crossorigin="null"
      draggable="false"
      alt=""
      @load="onLoad"
      @error="onError"
    >
    <span v-else-if="bm.iconType === 'emoji'" class="ap-ico-emoji">{{ bm.icon || "?" }}</span>
    <span v-else class="ap-ico-letter">{{ letterChar }}</span>
  </span>
</template>

<script setup>
import { computed, ref, watch } from "vue"
import { colorFromString, domainOf, faviconUrl, letterOf } from "../utils.js"
import { iconCache, store } from "../store.js"

const props = defineProps({
  bm: { type: Object, required: true },
  size: { type: Number, default: 0 },
})

const attempt = ref(0)
const failedAll = ref(false)

const letterChar = computed(() => props.bm.letter || letterOf(props.bm.name || domainOf(props.bm.url)))
const baseColor = computed(() => props.bm.color || colorFromString(props.bm.name || domainOf(props.bm.url) || "?"))

const sources = computed(() => {
  const type = props.bm.iconType || "auto"
  if (type === "emoji" || type === "text") return []
  if (type === "image") return props.bm.icon ? [props.bm.icon] : []
  // auto：本地缓存 -> favicon 服务 -> 网站根目录 favicon.ico
  const list = []
  const cached = iconCache.get(props.bm.url)
  if (cached) list.push(cached)
  const primary = faviconUrl(props.bm.url, store.state.settings.faviconService)
  if (primary) list.push(primary)
  const direct = faviconUrl(props.bm.url, "")
  if (direct && direct !== primary && !cached) list.push(direct)
  return list
})

const currentSrc = computed(() => sources.value[Math.min(attempt.value, sources.value.length - 1)])
const showImg = computed(() => sources.value.length > 0 && attempt.value < sources.value.length && !failedAll.value)
const tileBg = computed(() => {
  if (showImg.value) return "#ffffff"
  if (props.bm.iconType === "emoji") {
    return `color-mix(in srgb, ${baseColor.value} 16%, var(--ap-surface, #fff))`
  }
  return baseColor.value
})

watch(() => props.bm.url, () => {
  attempt.value = 0
  failedAll.value = false
})

function onError() {
  if (attempt.value < sources.value.length - 1) {
    attempt.value++
  } else {
    failedAll.value = true
  }
}

// 显示成功后，best-effort 用跨域镜像请求缓存为 dataURL（服务端不支持 CORS 时静默跳过）
function onLoad() {
  if (currentSrc.value.startsWith("data:")) return
  const probe = new Image()
  probe.crossOrigin = "anonymous"
  probe.onload = () => {
    try {
      const canvas = document.createElement("canvas")
      canvas.width = 64
      canvas.height = 64
      const ctx = canvas.getContext("2d")
      ctx.drawImage(probe, 0, 0, 64, 64)
      iconCache.set(props.bm.url, canvas.toDataURL("image/png"))
    } catch {
      // 跨域受限，忽略
    }
  }
  probe.src = currentSrc.value
}
</script>
