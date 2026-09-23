// 生成 160x160 的插件图标 PNG（安卓风：绿色圆角底 + 2x2 白色磁贴），无第三方依赖
import { deflateSync } from "node:zlib"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { mkdirSync, writeFileSync } from "node:fs"

const SIZE = 160
const SS = 2 // 2 倍超采样抗锯齿

function crc32(buf) {
  let c = 0xFFFFFFFF
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i]
    for (let k = 0; k < 8; k++) {
      c = (c >>> 1) ^ (0xEDB88320 & -(c & 1))
    }
  }
  return (~c) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, "ascii"), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}

// 超采样画布
const W = SIZE * SS
const px = Buffer.alloc(W * W * 4)

function setSS(x, y, r, g, b, a) {
  if (x < 0 || y < 0 || x >= W || y >= W) return
  const i = (y * W + x) * 4
  // 与透明背景混合
  const aa = a / 255
  px[i] = Math.round(r * aa + px[i] * (1 - aa))
  px[i + 1] = Math.round(g * aa + px[i + 1] * (1 - aa))
  px[i + 2] = Math.round(b * aa + px[i + 2] * (1 - aa))
  px[i + 3] = Math.min(255, px[i + 3] + a)
}

function inRoundRect(x, y, w, h, r) {
  if (x < 0 || y < 0 || x > w || y > h) return false
  const cx = x < r ? r : x > w - r ? w - r : x
  const cy = y < r ? r : y > h - r ? h - r : y
  const dx = x - cx
  const dy = y - cy
  return dx * dx + dy * dy <= r * r
}

function fillRoundRect(x, y, w, h, r, [cr, cg, cb], alpha = 255) {
  for (let yy = 0; yy < h; yy++) {
    for (let xx = 0; xx < w; xx++) {
      if (inRoundRect(xx, yy, w, h, r)) {
        setSS(x + xx, y + yy, cr, cg, cb, alpha)
      }
    }
  }
}

// 背景：品牌绿圆角方块（铺满，圆角 36/160）
fillRoundRect(0, 0, W, W, 36 * SS, [15, 220, 120])
// 2x2 白色磁贴
const tile = 38 * SS
const gap = 16 * SS
const total = tile * 2 + gap
const start = (W - total) / 2
for (const [cx, cy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
  fillRoundRect(start + cx * (tile + gap), start + cy * (tile + gap), tile, tile, 9 * SS, [255, 255, 255], 240)
}

// 降采样回 160
const out = Buffer.alloc(SIZE * (1 + SIZE * 4))
let row = 0
for (let y = 0; y < SIZE; y++) {
  out[row++] = 0 // filter: none
  for (let x = 0; x < SIZE; x++) {
    for (let k = 0; k < 4; k++) {
      let sum = 0
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          sum += px[(((y * SS + sy) * W) + x * SS + sx) * 4 + k]
        }
      }
      out[row++] = Math.round(sum / (SS * SS))
    }
  }
}

const ihdr = Buffer.alloc(13)
ihdr.writeUInt32BE(SIZE, 0)
ihdr.writeUInt32BE(SIZE, 4)
ihdr[8] = 8 // bit depth
ihdr[9] = 6 // RGBA
const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
  chunk("IHDR", ihdr),
  chunk("IDAT", deflateSync(out, { level: 9 })),
  chunk("IEND", Buffer.alloc(0)),
])

const here = dirname(fileURLToPath(import.meta.url))
const target = resolve(here, "../icon.png")
mkdirSync(dirname(target), { recursive: true })
writeFileSync(target, png)
console.log("icon.png written:", target, png.length, "bytes")
