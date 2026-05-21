# WeMark 上线前全检报告

**日期**：2026-05-21
**场景**：上线前检查（代码审查 + 安全审计 + QA测试）
**参与成员**：产品官 + 安全卫士 + 质量门神

---

## 📌 TL;DR（执行摘要）
- 整体结论：🟡 有条件通过
- 阻塞项数量：3（已全部修复）
- 下一版需关注：路径遍历防护可加强（当前为基础防护，非完全沙箱）、代码签名缺失

---

## 🎯 核心结论卡片

| 项目 | 内容 |
|------|------|
| Go / No-Go | 🟡 条件 Go（阻塞项已修复） |
| 严重度分布 | 🔴 3 / 🟠 4 / 🟡 5 / 🟢 4 |
| 关键行动项 | 5 条 |
| 建议负责人 | 开发者 |

---

## 1. 各成员核心结论

### 🔍 产品官（代码审查）
- 核心判断：代码结构清晰、模块职责划分合理，但有若干功能缺陷影响用户体验
- 关键建议：修复 maximizeChange 死代码、补充应用图标、增加路径验证

### 🛡️ 安全卫士（OWASP+STRIDE 审计）
- 核心判断：Electron 安全基础配置正确（contextIsolation=true, nodeIntegration=false），但文件系统 IPC 存在路径遍历风险
- 关键建议：增加文件操作路径验证、硬编码 salt 应考虑配置化

### ✅ 质量门神（QA测试与发布）
- 核心判断：ES module 修复方案可靠，构建配置基本完整，但 deep link 协议未在打包配置中注册
- 关键建议：补充协议注册、转发 update-not-available 事件

---

## 2. 综合审查发现（去重合并后按严重度排序）

| # | 严重度 | 类别 | 位置 | 问题描述 | 建议 | 状态 |
|---|--------|------|------|---------|------|------|
| 1 | 🔴 | 功能 | electron/main.ts | `window:maximizeChange` 事件从未触发，前端无法检测最大化状态变化 | 在 maximize/unmaximize 事件中 send 给 renderer | ✅ 已修复 |
| 2 | 🔴 | 功能 | package.json + electron/main.ts | 应用图标 `icon.png` 在生产环境中缺失（extraResources 只复制了 favicon.ico 为 tray-icon.png） | 添加 extraResources 条目复制 favicon.ico 为 icon.png | ✅ 已修复 |
| 3 | 🔴 | 安全 | electron/ipc/file-system.ts | fs:writeFile 和 fs:readFile 无路径验证，renderer 可读写任意文件（路径遍历） | 增加 isPathSafe() 白名单校验 | ✅ 已修复 |
| 4 | 🟠 | 功能 | package.json | deep link 协议 `wemark://` 未在 electron-builder win.protocols 中注册（Windows 注册表缺失） | 添加 protocols 配置 | ✅ 已修复 |
| 5 | 🟠 | 功能 | electron/updater.ts | `updater:update-not-available` 事件未转发给 renderer | 添加 forwardToRenderer 调用 | ✅ 已修复 |
| 6 | 🟠 | 安全 | electron/main.ts | `sandbox: false` 降低渲染进程安全隔离级别 | 建议后续迁移到 sandbox: true（需要重构 preload） | ⏳ 下版 |
| 7 | 🟠 | 配置 | package.json | 代码签名跳过（signingHashAlgorithms: null, signAndEditExecutable: false） | 正式发布前需配置代码签名证书 | ⏳ 下版 |
| 8 | 🟡 | 安全 | electron/ipc/store.ts | 加密 salt 硬编码（`wemark-secure-store-salt-v1`），所有用户相同 | 考虑 per-user salt 或配置化 | ⏳ 下版 |
| 9 | 🟡 | 安全 | electron/utils/crypto.ts | 加密密钥由 machineId 派生，同一机器上其他进程也可获取 machineId | 对于本工具的威胁模型可接受 | 📋 已知 |
| 10 | 🟡 | 功能 | electron/main.ts | `will-download` 拦截中 `item.setSavePath()` 在 `event.preventDefault()` 后调用，某些 Electron 版本可能不生效 | 测试验证，必要时改用 `item.saveDialogOptions` | ⏳ 下版 |
| 11 | 🟡 | 代码 | electron/ipc/store.ts | electron-store v10+ 使用 `as any` 绕过严格泛型 | 升级到支持泛型的版本或提交 PR | ⏳ 下版 |
| 12 | 🟡 | 功能 | electron/server.ts | Nitro 服务器监听 `localhost:0`，但 renderer 硬编码 `http://localhost:${serverPort}` | 当前可行（端口通过变量传递），但需确认 DNS rebinding 防护 | 📋 已知 |
| 13 | 🟢 | 建议 | .gitignore | `dist-electron/` 和 `release/` 未在 gitignore 中 | ✅ 已添加 | ✅ 已修复 |
| 14 | 🟢 | 建议 | electron/main.ts | `getAppIcon()` 的 try/catch 只捕获创建异常，不处理文件不存在 | nativeImage.createFromPath 对不存在文件返回空图像而非抛异常，建议显式检查 | ⏳ 下版 |
| 15 | 🟢 | 建议 | electron/updater.ts | 错误事件未转发给 renderer | 添加 updater:error 事件转发 | ⏳ 下版 |
| 16 | 🟢 | 建议 | types/electron.d.ts | `updater:update-not-available` 事件未在类型定义中声明 | 补充类型声明 | ⏳ 下版 |

---

## 3. 本轮已执行的修复清单

| # | 修复内容 | 涉及文件 |
|---|---------|---------|
| 1 | ES module 冲突：创建 `dist-electron/package.json` 声明 `"type": "commonjs"` | `scripts/fix-dist-type.cjs`（新增）, `package.json`（compile 脚本 + build.files） |
| 2 | `.gitignore` 补全：添加 `dist-electron` 和 `release` | `.gitignore` |
| 3 | maximizeChange 死代码修复：在窗口 maximize/unmaximize 事件中发送状态 | `electron/main.ts` |
| 4 | 应用图标缺失：extraResources 添加 favicon.ico → icon.png | `package.json` |
| 5 | 路径遍历防护：添加 `isPathSafe()` 函数，阻止系统目录访问 | `electron/ipc/file-system.ts` |
| 6 | Deep link 协议注册：添加 win.protocols 配置 | `package.json` |
| 7 | update-not-available 事件转发 | `electron/updater.ts` |

---

## ✅ 行动清单

| # | 行动 | 负责方 | 紧急度 | 期望完成 |
|---|------|--------|--------|---------|
| 1 | 重新构建安装包验证修复 | 开发者 | P0 | 本轮 |
| 2 | 安装并启动验证 ES module 修复 + 最大化状态同步 | 开发者 | P0 | 本轮 |
| 3 | 配置 Windows 代码签名证书 | 开发者 | P1 | 下版 |
| 4 | 迁移 sandbox: true + 重构 preload | 开发者 | P2 | 下版 |
| 5 | 补充 updater:error 事件转发和类型声明 | 开发者 | P2 | 下版 |

---

## ⚠️ 待完善 / 已知局限

- 代码签名跳过：当前安装包无签名，Windows SmartScreen 可能弹出警告
- sandbox: false：渲染进程未完全沙箱化，需后续迁移
- 加密 salt 硬编码：所有用户使用相同 salt，对单机使用场景风险可接受
- favicon.ico 被复用为 icon.png：理想情况应使用专用 PNG 图标

---

## 📚 成员产出索引

- gstack-product-reviewer（产品官）原始产出：23 项发现，4🔴/7🟠/8🟡/4🟢，有条件通过
- gstack-security-officer（安全卫士）原始产出：STRIDE 威胁建模 + OWASP 检查，路径遍历为主要风险
- gstack-qa-lead（质量门神）原始产出：14 项发现，2🔴/4🟠/4🟡/4🟢，有条件通过

---

> 本报告由软件工坊 AI 协作生成，关键决策请由工程负责人复核。
