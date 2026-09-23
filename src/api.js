// 思源内核 API 调用（同源 fetch）

async function kernelPost(api, payload) {
  const res = await fetch(api, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload || {}),
  })
  const json = await res.json()
  if (json.code !== 0) {
    throw new Error(json.msg || `内核接口 ${api} 调用失败`)
  }
  return json.data
}

// 从所有文档块中采集外部链接（P2：智能采集）
// 返回 [{name, url}]，去重后最多 80 条
export async function collectLinksFromDocs() {
  const rows = await kernelPost("/api/query/sql", {
    stmt: "SELECT id, content FROM blocks WHERE content LIKE '%http%' AND type = 'p' LIMIT 2000",
  })

  const found = new Map()
  const put = (name, url) => {
    if (!/^https?:\/\//i.test(url)) return
    // 排除思源自身资源与本地地址
    if (/127\.0\.0\.1|localhost|0\.0\.0\.0/i.test(url)) return
    let clean = url.replace(/[.,;:!?)\]}>'"]+$/, "")
    try {
      const u = new URL(clean)
      const key = u.hostname.replace(/^www\./i, "") + u.pathname.replace(/\/+$/, "")
      if (found.has(key)) return
      found.set(key, { name: (name || "").trim() || u.hostname.replace(/^www\./i, ""), url: clean })
    } catch {
      // 忽略无法解析的链接
    }
  }

  const mdLink = /(!)?\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g
  const bareLink = /(https?:\/\/[^\s)<>"'`\]]+)/g

  for (const row of rows || []) {
    const text = String(row.content || "")
    const consumed = []
    let m
    while ((m = mdLink.exec(text)) !== null) {
      if (!m[1]) put(m[2], m[3]) // 跳过图片 ![]()
      consumed.push([m.index, m.index + m[0].length])
    }
    let b
    while ((b = bareLink.exec(text)) !== null) {
      const inside = consumed.some(([s, e]) => b.index >= s && b.index < e)
      if (!inside) put("", b[1])
    }
  }

  return Array.from(found.values()).slice(0, 80)
}
