# Keeply UI 改版与验收记录 · 2026-10-30

## 目标与设计判断

参考实际登录后的 Kyurations dashboard 与用户提供的交互方向，调整 Keeply 的收藏、添加和阅读体验。采用暖纸色背景、白色圆角卡片、金黄色主按钮、炭黑正文和更克制的边框。中英文优先使用系统圆润字体；不同操作系统的字体外观会有差异。

设计重点是内容层级、留白和可读性：搜索与侧栏保持轻量；“收好新内容”成为明确入口；封面、标题、标签、来源和操作各占稳定位置；阅读正文与详情分区。在低饱和背景上保留一个主要强调色，深色模式使用对应的暖黑配色。

本次没有调整抓取、存储、AI 总结或标签生成逻辑，没有增加依赖。主要工程变化是主题、组件样式、添加弹窗，以及为修复首次渲染语言不一致而隔离每棵 React 树的 i18n 实例，并随服务端页面传入当前语言和英文回退资源。

## 验证循环

每轮均包含实际页面检查、问题判断和复查；截图保存在本机被 Git 忽略的 `.codex/ui-20261030/`。截图仅作为本地证据，不提交生产收藏或参考站私有内容。

| 轮次 | 检查内容 | 发现与处理 | 证据 |
| --- | --- | --- | --- |
| 01 | 桌面整体布局，与参考站对照 | 调整侧栏至 232px、暖色画布、顶部搜索和工具栏留白 | `reference-dashboard.png`、`loop01-layout.png` |
| 02 | 添加内容弹窗与真实保存 | 清除重复内边距；文字保存成功后关闭弹窗，收藏从 10 项增至 11 项（仅本地测试库） | `loop02-composer.png` |
| 03 | 卡片排版和 Markdown | 卡片中的 H1 原先抢占层级，改为 17px；统一封面高度、标签、来源与操作间距 | `loop03-cards.png`、`loop03-cards-after.png` |
| 04 | 桌面阅读器 | 调整正文留白、引用与动作按钮；补充编辑、收藏、归档等无障碍名称 | `loop04-reader.png`、`loop04-reader-after.png` |
| 05 | 搜索 | 搜索 TAILMARKER20261028 返回预期 1 项；补齐搜索页面标题后复查 | `loop05-search-after.png` |
| 06 | 标签、星标和空状态 | 修复重复首页标题、英文星标标题、旧品牌页签；空列表保留计数与视图工具栏 | `loop06-tags.png`、`loop06-empty-after.png` |
| 07 | 390px 手机布局、弹窗、阅读 | 弹窗可操作；复查发现正文贴边和标题偏大，修为 24px 内边距与响应式标题 | `loop07-mobile-dialog.png`、`loop07-mobile-reader-after.png` |
| 08 | 820px 平板布局 | 检查侧栏、双列卡片与标题换行，未发现遮挡 | `loop07-08-responsive.png` |
| 09 | 深色模式 | 统一暖黑底、金黄强调和弱化文字；修正阅读动作图标颜色；验收后恢复浅色模式 | `loop09-dark.png`、`loop09-dark-reader.png` |
| 10 | 列表和紧凑视图 | 切换和恢复瀑布流均正常；修复列表笔记占位的英文 Note，补充图片尺寸与定位 | `loop10-list.png`、`loop10-compact.png` |
| 11 | 键盘与焦点 | Cmd+E 打开，输入框自动聚焦；Escape 关闭并归还添加按钮焦点；空内容不可保存 | `loop11-keyboard.png` |
| 12 | 生产站点最终回归 | 在实际账户检查首页、添加窗口、原有正文、搜索及控制台，结果见下方生产验收 | `production-after.png`、`production-reader.png`、`production-search.png` |

响应式验证采用真实 390px / 820px 同源 iframe 渲染，因为当前浏览器工具的 viewport 设置未改变实际窗口宽度。它覆盖 CSS 断点与布局，但不等于真机触摸、软键盘测试。临时测试页面已删除，不随发布包上线。未将原本仍为 1280px 的 `loop07-mobile.png` 计作手机证据。

扩展同步采用相同主题，原有紧凑弹窗与捕获流程保留。扩展测试及构建完成；本次未通过 UI 安装或替换用户正在使用的扩展，也不声称完成了新包在真实 Chrome 扩展环境中的端到端测试。

## 自动检查与构建

使用项目已有 Node 24.22.1、pnpm 11.2.1 和现有 lockfile，没有新增安装项。若从新检出目录开始，先执行 `pnpm install --frozen-lockfile`。

```bash
pnpm preflight
TZ=UTC pnpm --dir apps/web exec vitest run
pnpm --dir apps/browser-extension test
pnpm exec sherif
pnpm run --filter @karakeep/open-api check
NEXT_TELEMETRY_DISABLED=1 NEXTAUTH_URL=https://keeply.facezero.online pnpm --dir apps/web build
pnpm --dir apps/workers build
pnpm --dir apps/browser-extension build
python3 deploy/singapore/package-overlay.py
```

- `preflight`：64 项任务通过。保留原有 lint 警告，网页 21 条、0 错误。
- 网页：7 个测试文件、55 项通过，包括新增的 SSR 同步语言与跨渲染隔离测试。
- 扩展：4 个测试文件、28 项通过。
- 日期测试假定 UTC，初次直接在上海时区执行有 1 项失败；明确设置 `TZ=UTC` 后通过，不修改业务日期格式。
- 新增 TSX 测试需要 Vitest 显式启用 automatic JSX 编译。
- Sherif 无错误，保留根包依赖分类的既有 warning；OpenAPI 检查通过。
- 网页、workers 和扩展生产构建通过。worker 构建保留原有可选原生模块 external 提示，Linux 原生依赖继续使用固定基础镜像。
- 发布 overlay 约 49MiB，已扫描确认不包含本地配置中的密钥和 macOS 原生二进制。
- 最后复查额外限制列表模式中的弹窗文本框自动扩高，避免长文本撑出弹窗；随后重新构建发布包。

## 发布与运行

目标站点：`https://keeply.facezero.online`。镜像：`keeply:20261030-ui`，版本标识 `2026.10.30-keeply-ui`。

服务器发布目录 `/opt/karakeep/releases/20261030-ui`；应用配置 `/opt/karakeep/.env`；数据仍位于 `/opt/karakeep/data`，包括 SQLite 和原始附件；搜索数据 `/opt/karakeep/meilisearch`。

仅重新创建 app 容器，保留现有应用 1536MiB 内存限制、解析器 1024MiB 限制与单并发。没有更改 Caddy、数据库结构、域名、其他应用或模型密钥。

启动与停止：

```bash
cd /opt/karakeep
sudo docker compose up -d --no-deps app
sudo docker compose stop app
sudo docker compose ps
```

一致性备份：`/opt/karakeep/backups/before-ui-20261030.tgz`（0600），包含 app 停止后的 `.env`、Compose 和 data。搜索索引保留在原目录，未打入该备份。旧镜像 `keeply:20261029-minimax` 保留。

仅回滚界面版本（不覆盖新收藏）：

```bash
sudo install -m 0600 /opt/karakeep/releases/20261030-ui/rollback.env /opt/karakeep/.env
sudo docker compose --project-directory /opt/karakeep up -d --no-deps app
```

扩展产物：`apps/browser-extension/dist`；本地 ZIP：`.codex/ui-20261030/keeply-chrome-20261030.zip`。已加载此 dist 的 Chrome 扩展在扩展管理页点击“重新加载”即可；若使用其他文件夹，先解压 ZIP，再加载对应目录。服务端发布不会自动更新本地扩展。

## 生产验收

已完成上线与第 12 轮验收：

- 真实账户首页显示 11 项收藏，中文标题、暖色主题、三列卡片和新版本标识正常。
- 原有内网文章的服务端存档正文加载成功，包含后续章节和表格；原有摘要、标签、来源与阅读备注入口仍可见。本轮不重新抓取内网，也不重新生成摘要。
- 搜索已有验收文字 `KEEPlyAICHECK20261029` 返回预期 1 项。
- 添加弹窗自动聚焦，空内容的保存按钮禁用；Escape 关闭后焦点回到“收好新内容”。生产环境未新增或删除验收收藏，实际保存测试在本地库完成。
- 收藏数量与排序后的 ID 摘要在发布前后相同：11 项，SHA-256 `f45a3a666a832675d56c4675320691b2a020911782c332f94d6b3c8ae44057f9`。这验证记录集合保留，不是所有文件逐字节校验；原始数据目录沿用，一致性备份另存。
- Keeply 健康接口与同机 Chat dashboard 均返回 HTTPS 200；app healthy，同机 sub2api、PostgreSQL、Redis 的运行时间未重置。
- 发布后空闲采样：app 272.8MiB、Chrome 179.7MiB、Meilisearch 72.14MiB，系统 available 2288MiB。这是空闲快照，不代表文档解析峰值。
- 浏览器未捕获 error；打开既有阅读预览时有 1 条 Radix 缺少 DialogDescription 的无障碍 warning。来源为既有 `@modal/(.)preview/[bookmarkId]/page.tsx`，本轮保留并记录；新增收藏弹窗含标题和描述。

视觉与交互检查通过；仍未覆盖真实移动设备的触摸和软键盘，以及新扩展包在 Chrome 中的完整捕获流程。美感属于主观判断，本次交付以可检查的页面、截图和逐轮修正记录为依据，不宣称客观“超越”参考站。
