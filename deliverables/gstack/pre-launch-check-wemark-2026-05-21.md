# WeMark 上线前全检报告

**日期**：2026-05-21
**场景**：上线前检查（代码审查 + 安全审计 + QA测试）
**参与成员**：产品官 + 安全卫士 + 质量门神

---

## 📌 TL;DR（执行摘要）
- 整体结论：🟡 有条件通过（安全审计后已执行第二轮加固）
- 阻塞项数量：原 3 项 → 全部修复；安全审计新增 2 项严重问题 → 已修复
- 安装包已重新生成，包含所有安全修复
- 下一版需关注：代码签名、sandbox 迁移、加密 salt 配置化、CSP 策略

---

## 🎯 核心结论卡片

| 项目 | 内容 |
|------|------|
| Go / No-Go | 🟡 条件 Go（所有阻塞项已修复，剩余项为下版改进） |
| 严重度分布 | 🔴 4 / 🟠 7 / 🟡 8 / 🟢 5 |
| 关键行动项 | 8 条（5 已修复 + 3 下版） |
| 建议负责人 | 开发者 |

---

## 1. 各成员核心结论

### 🔍 产品官（代码审查）
- 核心判断：代码结构清晰、模块职责划分合理，但有若干功能缺陷影响用户体验
- 关键建议：修复 maximizeChange 死代码、补充应用图标、增加路径验证

### 🛡️ 安全卫士（OWASP+STRIDE 审计）
- 核心判断：Electron 安全基础配置正确（contextIsolation=true, nodeIntegration=false），但 Nitro 服务器暴露在所有网络接口、文件系统 IPC 缺乏路径校验、shell.openPath 可执行任意程序
- 关键建议：Nitro 绑定 127.0.0.1、禁止可执行文件 openPath、禁用 debug 端点、添加 will-navigate/setWindowOpenHandler
- 安全态势评分：C（存在 2 个严重 + 4 个重要问题，但有良好的基础安全配置）

### ✅ 质量门神（QA测试与发布）
- 核心判断：ES module 修复方案可靠，构建配置基本完整，但 deep link 协议未在打包配置中注册
- 关键建议：补充协议注册、转发 update-not-available 事件

---

## 2. 综合审查发现（去重合并后按严重度排序）

| # | 严重度 | 类别 | 位置 | 问题描述 | 建议 | 状态 |
|---|--------|------|------|---------|------|------|
| 1 | 🔴 | 功能 | electron/main.ts | `window:maximizeChange` 事件从未触发，前端无法检测最大化状态变化 | 在 maximize/unmaximize 事件中 send 给 renderer | ✅ 已修复 |
| 2 | 🔴 | 功能 | package.json + electron/main.ts | 应用图标 `icon.png` 在生产环境中缺失 | 添加 extraResources 条目复制 favicon.ico 为 icon.png | ✅ 已修复 |
| 3 | 🔴 | 安全 | electron/ipc/file-system.ts | fs:writeFile/fs:readFile 无路径验证（路径遍历） | 增加 isPathSafe() 白名单校验 | ✅ 已修复 |
| 4 | 🔴 | 安全 | electron/server.ts | Nitro 服务器监听 0.0.0.0（所有网络接口），局域网可访问内部 API（含 SSRF 风险） | 绑定 127.0.0.1 | ✅ 已修复 |
| 5 | 🟠 | 功能 | package.json | deep link 协议 `wemark://` 未在 electron-builder win.protocols 中注册 | 添加 protocols 配置 | ✅ 已修复 |
| 6 | 🟠 | 功能 | electron/updater.ts | `updater:update-not-available` 事件未转发给 renderer | 添加 forwardToRenderer 调用 | ✅ 已修复 |
| 7 | 🟠 | 安全 | electron/ipc/file-system.ts | shell.openPath 可执行任意程序（.exe/.bat/.cmd 等）和 UNC 路径 | 增加 isOpenPathSafe() 检查（可执行文件黑名单 + UNC 路径阻断） | ✅ 已修复 |
| 8 | 🟠 | 安全 | server/api/_debug.get.ts | Debug 端点在 Electron 模式下暴露所有 Cookie 数据 | 检测 ELECTRON 环境变量，返回 404 | ✅ 已修复 |
| 9 | 🟠 | 安全 | server/utils/proxy-request.ts | `console.log('token', token)` 明文输出微信登录 token | 移除明文日志 | ✅ 已修复 |
| 10 | 🟠 | 安全 | electron/main.ts | 缺少 `will-navigate` 和 `setWindowOpenHandler`（导航劫持风险） | 添加 will-navigate 阻止 + setWindowOpenHandler deny | ✅ 已修复 |
| 11 | 🟠 | 安全 | electron/main.ts | `sandbox: false` 降低渲染进程安全隔离级别 | 建议后续迁移到 sandbox: true | ⏳ 下版 |
| 12 | 🟠 | 配置 | package.json | 代码签名跳过（signingHashAlgorithms: null, signAndEditExecutable: false） | 正式发布前需配置代码签名证书 | ⏳ 下版 |
| 13 | 🟡 | 安全 | electron/ipc/store.ts | 加密 salt 硬编码（`wemark-secure-store-salt-v1`），所有用户相同 | 考虑 per-user salt 或配置化 | ⏳ 下版 |
| 14 | 🟡 | 安全 | electron/utils/crypto.ts | 加密密钥由 machineId 派生，同一机器上其他进程也可获取 machineId | 对于本工具的威胁模型可接受 | 📋 已知 |
| 15 | 🟡 | 安全 | electron/main.ts | 缺少 Content-Security-Policy (CSP) | 添加 CSP 响应头 | ⏳ 下版 |
| 16 | 🟡 | 安全 | electron/main.ts | Deep link 缺乏输入验证和速率限制 | 解析 URL 参数白名单 + 速率限制 | ⏳ 下版 |
| 17 | 🟡 | 功能 | electron/main.ts | `will-download` 拦截中某些 Electron 版本可能不生效 | 测试验证，必要时改用 `item.saveDialogOptions` | ⏳ 下版 |
| 18 | 🟡 | 代码 | electron/ipc/store.ts | electron-store v10+ 使用 `as any` 绕过严格泛型 | 升级到支持泛型的版本或提交 PR | ⏳ 下版 |
| 19 | 🟡 | 功能 | electron/server.ts | Nitro 服务器端口通过变量传递给 renderer，需确认 DNS rebinding 防护 | 当前可行（localhost 绑定已修复 F-002） | 📋 已知 |
| 20 | 🟢 | 建议 | .gitignore | `dist-electron/` 和 `release/` 未在 gitignore 中 | ✅ 已添加 | ✅ 已修复 |
| 21 | 🟢 | 建议 | electron/main.ts | `getAppIcon()` 不处理文件不存在 | nativeImage.createFromPath 对不存在文件返回空图像，建议显式检查 | ⏳ 下版 |
| 22 | 🟢 | 建议 | electron/updater.ts | 错误事件未转发给 renderer | 添加 updater:error 事件转发 | ⏳ 下版 |
| 23 | 🟢 | 建议 | types/electron.d.ts | `updater:update-not-available` 事件未在类型定义中声明 | 补充类型声明 | ⏳ 下版 |
| 24 | 🟢 | 建议 | electron/utils/logger.ts | 日志无轮转和清理机制 | 添加保留天数和文件大小限制 | ⏳ 下版 |

---

## 3. STRIDE 威胁建模总结

| 威胁类型 | 评估 | 关键发现 | 修复状态 |
|----------|------|---------|---------|
| **Spoofing** | 🟡 中等 | Deep link 无来源验证；缺少 will-navigate 阻止导航劫持 | ✅ will-navigate 已修复 |
| **Tampering** | 🟠 中高 | Windows 无代码签名；electron-store JSON 可被同机用户篡改 | ⏳ 代码签名待配置 |
| **Repudiation** | 🟡 中等 | 无操作审计日志 | 📋 已知 |
| **Information Disclosure** | 🟡 中等 | 加密密钥可从 machineId+硬编码 salt 推导；Token 泄露到控制台 | ✅ token 日志已移除 |
| **Denial of Service** | 🟢 低 | IPC 无速率限制但仅限本地 | 📋 已知 |
| **Elevation of Privilege** | 🟡 中等 | 任意文件读写（已修复路径校验）；shell.openPath 执行程序（已修复）；Nitro 公共 API 无认证（已修复绑定 127.0.0.1） | ✅ 核心已修复 |

---

## 4. 本轮已执行的修复清单

### 第一轮修复（基础功能 + 安全基线）

| # | 修复内容 | 涉及文件 |
|---|---------|---------|
| 1 | ES module 冲突：创建 `dist-electron/package.json` 声明 `"type": "commonjs"` | `scripts/fix-dist-type.cjs`（新增）, `package.json` |
| 2 | `.gitignore` 补全：添加 `dist-electron` 和 `release` | `.gitignore` |
| 3 | maximizeChange 死代码修复：在窗口 maximize/unmaximize 事件中发送状态 | `electron/main.ts` |
| 4 | 应用图标缺失：extraResources 添加 favicon.ico → icon.png | `package.json` |
| 5 | 路径遍历防护：添加 `isPathSafe()` 函数，阻止系统目录访问 | `electron/ipc/file-system.ts` |
| 6 | Deep link 协议注册：添加 win.protocols 配置 | `package.json` |
| 7 | update-not-available 事件转发 | `electron/updater.ts` |
| 8 | npmRebuild: false 跳过原生重编译 | `package.json` |

### 第二轮修复（安全审计加固）

| # | 修复内容 | 涉及文件 |
|---|---------|---------|
| 9 | Nitro 服务器绑定 127.0.0.1（防止局域网访问内部 API） | `electron/server.ts` |
| 10 | shell.openPath 拦截可执行文件和 UNC 路径 | `electron/ipc/file-system.ts` |
| 11 | Debug 端点在 Electron 模式下返回 404 | `server/api/_debug.get.ts` |
| 12 | 移除 token 明文日志 | `server/utils/proxy-request.ts` |
| 13 | 添加 will-navigate 和 setWindowOpenHandler 安全防护 | `electron/main.ts` |

---

## ✅ 行动清单

| # | 行动 | 负责方 | 紧急度 | 期望完成 | 状态 |
|---|------|--------|--------|---------|------|
| 1 | 安装新包验证 ES module 修复 + 最大化状态同步 | 开发者 | P0 | 本轮 | 待验证 |
| 2 | Nitro 绑定 127.0.0.1 验证 | 开发者 | P0 | 本轮 | 待验证 |
| 3 | 配置 Windows 代码签名证书 | 开发者 | P1 | 下版 | ⏳ |
| 4 | 迁移 sandbox: true + 重构 preload | 开发者 | P2 | 下版 | ⏳ |
| 5 | 添加 CSP 策略 | 开发者 | P2 | 下版 | ⏳ |
| 6 | 加密 salt 配置化（考虑 Electron safeStorage API） | 开发者 | P2 | 下版 | ⏳ |
| 7 | 补充 updater:error 事件转发和类型声明 | 开发者 | P2 | 下版 | ⏳ |
| 8 | 日志轮转和清理机制 | 开发者 | P3 | 下版 | ⏳ |

---

## ⚠️ 待完善 / 已知局限

- **代码签名跳过**：当前安装包无签名，Windows SmartScreen 可能弹出警告。这是上线后的首要改进项
- **sandbox: false**：渲染进程未完全沙箱化，需后续迁移。当前有 contextIsolation + will-navigate/setWindowOpenHandler 作为补偿控制
- **加密 salt 硬编码**：所有用户使用相同 salt，对单机使用场景风险可接受。下版考虑迁移到 Electron safeStorage API
- **favicon.ico 被复用为 icon.png**：理想情况应使用专用 PNG 图标
- **缺少 CSP**：未配置 Content-Security-Policy，XSS 攻击面略大
- **Deep link 输入验证**：当前仅检查前缀，未解析参数和限流

---

## 📚 成员产出索引

- gstack-product-reviewer（产品官）原始产出：23 项发现，4🔴/7🟠/8🟡/4🟢，有条件通过
- gstack-security-officer（安全卫士）原始产出：14 项发现（2🔴/4🟠/5🟡/3🟢），STRIDE 威胁建模 + OWASP Top 10 检查，安全态势 C 级，NO-GO（条件性）→ 修复 F-001/F-002 后可转为 CONDITIONAL-GO
- gstack-qa-lead（质量门神）原始产出：14 项发现，2🔴/4🟠/4🟡/4🟢，有条件通过

---

> 本报告由软件工坊 AI 协作生成，关键决策请由工程负责人复核。
