import { Dialog, Plugin } from "siyuan"
import { createApp } from "vue"
import "./styles.css"
import { store } from "./store.js"
import Launcher from "./App.vue"
import ManageDialog from "./components/ManageDialog.vue"

const ICON_SVG = `
<symbol id="iconAppPortal" viewBox="0 0 24 24">
  <rect x="3.5" y="3.5" width="7.2" height="7.2" rx="2"/>
  <rect x="13.3" y="3.5" width="7.2" height="7.2" rx="2"/>
  <rect x="3.5" y="13.3" width="7.2" height="7.2" rx="2"/>
  <rect x="13.3" y="13.3" width="7.2" height="7.2" rx="2"/>
</symbol>`

export default class AppPortalPlugin extends Plugin {
  launcher = null
  manager = null

  async onload() {
    this.addIcons(ICON_SVG)
    await store.init(this)

    this.addTopBar({
      icon: "iconAppPortal",
      title: "打开统一应用门户",
      position: "right",
      callback: () => this.openLauncher(),
    })

    this.addCommand({
      langKey: "openAppPortal",
      langText: "打开统一应用门户",
      callback: () => this.openLauncher(),
    })
    this.addCommand({
      langKey: "manageAppPortal",
      langText: "管理统一应用门户书签",
      callback: () => this.openManager(),
    })
  }

  onunload() {
    this.launcher?.destroy()
    this.manager?.destroy()
  }

  openSetting() {
    this.openManager()
  }

  openLauncher() {
    if (this.launcher) {
      this.launcher.element.querySelector(".b3-dialog__close")?.click()
      return
    }
    const dialog = new Dialog({
      title: "统一应用门户",
      content: '<div class="ap-root b3-dialog__content"></div>',
      width: window.innerWidth < 720 ? "100%" : "92%",
      height: window.innerHeight < 720 ? "100%" : "88%",
      destroyCallback: () => {
        app.unmount()
        this.launcher = null
      },
    })
    dialog.element.classList.add("ap-dialog", "ap-launcher-dialog")
    const app = createApp(Launcher, { plugin: this, dialog })
    app.mount(dialog.element.querySelector(".ap-root"))
    this.launcher = dialog
  }

  openManager() {
    if (this.manager) {
      this.manager.element.querySelector(".b3-dialog__close")?.click()
      return
    }
    const dialog = new Dialog({
      title: "统一应用门户 · 后台管理",
      content: '<div class="ap-root b3-dialog__content"></div>',
      width: window.innerWidth < 720 ? "100%" : "860px",
      height: "82%",
      destroyCallback: () => {
        app.unmount()
        this.manager = null
      },
    })
    dialog.element.classList.add("ap-dialog", "ap-manage-dialog")
    const app = createApp(ManageDialog, { plugin: this, dialog })
    app.mount(dialog.element.querySelector(".ap-root"))
    this.manager = dialog
  }
}
