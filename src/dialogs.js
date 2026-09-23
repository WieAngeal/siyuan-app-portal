// 统一的小弹窗创建：把 Vue 组件挂到思源 Dialog 中
import { Dialog } from "siyuan"
import { createApp } from "vue"
import BookmarkEditor from "./components/BookmarkEditor.vue"
import CategoryEditor from "./components/CategoryEditor.vue"
import ImportPreview from "./components/ImportPreview.vue"

function mountDialog(component, props, options) {
  const dialog = new Dialog({
    content: '<div class="ap-root b3-dialog__content"></div>',
    ...options,
    destroyCallback: () => {
      app.unmount()
      options?.destroyCallback?.()
    },
  })
  dialog.element.classList.add("ap-dialog")
  if (options.dialogClass) dialog.element.classList.add(options.dialogClass)
  const app = createApp(component, { plugin: options.plugin, dialog, ...props })
  app.mount(dialog.element.querySelector(".ap-root"))
  return dialog
}

export function openBookmarkEditor(plugin, { bookmark = null, categoryId = "" } = {}) {
  return mountDialog(
    BookmarkEditor,
    { bookmark, categoryId },
    {
      plugin,
      title: bookmark ? "编辑书签" : "新增书签",
      width: "520px",
      dialogClass: "ap-form-dialog",
    },
  )
}

export function openCategoryEditor(plugin, { category = null } = {}) {
  return mountDialog(
    CategoryEditor,
    { category },
    {
      plugin,
      title: category ? "编辑分类" : "新增分类",
      width: "440px",
      dialogClass: "ap-form-dialog",
    },
  )
}

export function openImportPreview(plugin, { items = [], sourceName = "", onDone } = {}) {
  return mountDialog(
    ImportPreview,
    { items, sourceName, onDone },
    {
      plugin,
      title: `导入预览 · ${sourceName}`,
      width: "660px",
      height: "78%",
    },
  )
}
