# Karakeep 本机运行与内容底座验证

验证日期：2026-10-28，Asia/Shanghai。对象为当前 checkout `fb25e427`（2026-10-27，`release(extension): Release version 1.2.14`），不是背景研究中固定的 v0.34.1。根包/web 包版本 `0.1.0` 是开发包版本；扩展 manifest 版本为 `1.2.14`。运行界面显示 `vunknown`，不据此推断正式发布版本。

## 结论

原版可继续作为收藏、原文件存储、正文读取、标签/列表与外部 Agent API 的候选底座。基础链路已跑通，但需要明确三个限制：只保存私有网页 URL 不会继承用户浏览器登录态；自动摘要会覆盖人工摘要；超长文章尾部在本次全文搜索测试中未命中。正文完整存储、正文 API 分页、搜索召回、LLM 输入截断是不同层次，不能互相替代验证。

未修改核心业务逻辑、依赖版本或锁文件；未迁移 Keeply 数据、未读取或复制 Keeply `.env.local`、未调用真实 LLM。所有推理覆盖测试都直接向原有推理函数传入固定的本地假响应。

## 运行方式和隔离

采用原生开发模式：项目 `scripts/dev-worktree.sh` 管理 Next.js 和 workers；额外使用独立的 Meilisearch 原生进程及 Chrome headless 进程。本机默认 Node 22.22.1 / pnpm 9.15.9，没有 Docker CLI，因此没有创建或复用任何容器，也没有修改全局 Node/pnpm。

| 服务 | 地址/版本 | 数据 |
| --- | --- | --- |
| Web | http://127.0.0.1:3100 | 下述主数据目录 |
| Meilisearch | 127.0.0.1:17700，v1.41.0 | `data/meilisearch/` |
| 爬虫 Chrome CDP | 127.0.0.1:19222 | `data/crawler-chrome/`，独立 profile |
| 合成样例 HTTP 服务 | http://127.0.0.1:18081 | `.codex/local-eval/fixtures.py` |
| Node/pnpm | Node 24.22.1 / pnpm 11.2.1 | `.codex/local-eval/` 内独立安装 |

项目根目录：`/Users/simon/Desktop/dev/code/karakeep`。
主数据目录：`/Users/simon/Desktop/dev/code/karakeep/data`，包含 SQLite 主库、队列库、文件、搜索索引和爬虫 profile。数据库与队列已执行项目迁移，未应用 seed snapshot，使用独立新建账号。

私密配置：根目录 `.env`，权限 0600，项目 `.gitignore` 已忽略；`apps/web/.env`、`apps/workers/.env`、`packages/db/.env` 均指向该文件。随机会话密钥、Meilisearch 密钥和本机测试账号密码只保存在本机忽略文件中。`data/` 和 `.codex/` 同样被 Git 忽略。

当前 `INFERENCE_ENABLE_AUTO_TAGGING=false`、`INFERENCE_ENABLE_AUTO_SUMMARIZATION=false`，没有设置真实模型凭据。启动包装脚本移除继承的模型配置后再读取本项目 `.env`。仅为合成样例允许爬虫访问 `localhost` / `127.0.0.1`；未复用浏览器个人 profile 或登录 cookie。

```sh
cd /Users/simon/Desktop/dev/code/karakeep

# 启动全部服务，检查端口并记录本任务进程；重复执行不会重复启动活跃进程
python3 .codex/local-eval/control.py start

# 查看本任务服务状态
python3 .codex/local-eval/control.py status

# 只停止本任务记录并核对过归属的进程组
python3 .codex/local-eval/control.py stop

# 查看本机评估账号密码（账号是 local-eval@example.com）
sed -n '/^EVAL_LOGIN_PASSWORD=/p' .env
```

主入口使用 `127.0.0.1`，与 `NEXTAUTH_URL` 保持一致。打开 `/signin` 后使用 `local-eval@example.com` 登录。启动脚本原有日志会打印 seed 账号提示，但本次没有导入 seed 数据，请勿使用那些账号。

日志：包装脚本、安装和测试日志位于 `.codex/local-eval/logs/`；Web/worker 日志由项目脚本写入 `${TMPDIR}/karakeep-dev-karakeep/{web,workers}.log`。

## 实测结果

| 项目 | 结果 | 证据与范围 |
| --- | --- | --- |
| 注册、登录和网页渲染 | 通过 | 独立评估账号；真实 Chrome 自动登录进入 dashboard，无 pageerror |
| 普通网页收藏 | 通过 | 本机长文和外网 example.com 均抓取成功，正文可读 |
| URL 去重 | 通过 | 同一 URL 再保存返回同一 bookmark ID / `alreadyExists=true` |
| 文字片段 | 通过 | 两段独立 text bookmark，ID 不同，`sourceUrl` 相同且保留 |
| 同页多处高亮 | 通过 | 两条 highlight 独立 ID，均关联原始网页 bookmark |
| 标签、列表 | 通过 | 人工标签 `attachedBy=human`；创建列表并加入两条收藏 |
| 图片 | 通过 | PNG 上传、网页预览、下载 SHA-256 与原文件相同 |
| PDF | 通过 | 文本 PDF 上传、内嵌阅读器渲染、正文提取、检索和原文件下载 |
| 原文件下载 | 通过 | PNG、PDF、上传的浏览器 HTML 均完成字节级 SHA-256 比对 |
| 长文完整获取 | 通过 | 1,600 段、245,332 字符，首尾标记与全部段编号完整；UI 可见尾部 |
| 正文 API 分页 | 通过 | 默认上限 12,000 字符；样例首段 11,868 字符，21 次请求读取完整篇；必须跟随 `nextCursor` |
| 常规全文检索 | 通过 | 文字摘录、PDF、中文“知识收藏”、长文开头标记均命中 |
| 超长文尾部全文检索 | 未通过 | `TAILMARKER20261028` 未命中长文；同标记短文本对照命中。Meili 存储的文档仍含全部 245,332 字符和尾标记。未将具体内部上限归因为已证实原因 |
| 仅保存登录态网页 URL | 未通过需求 | 服务端爬虫保存的是登录页；`crawlStatus=success` 不能证明获取了用户看到的正文 |
| 上传登录后浏览器 DOM | 通过，有限范围 | 自动浏览器访问合成登录页并获取 DOM，上传 SingleFile 接口后保留 30 段私有正文；原 HTML 可下载且 hash 一致 |
| 人工摘要编辑 | 通过 | REST PATCH 更新后 UI 展示正确 |
| 自动整理保留人工标签 | 通过 | 原推理函数连续执行两次假标签响应，人工标签保留、旧 AI 标签替换为新 AI 标签 |
| 自动整理保留人工摘要 | 未通过 | 原摘要函数将人工摘要改为假模型响应，没有保护人工来源；已恢复原人工摘要 |
| LLM 输入覆盖全文 | 未通过完整覆盖要求 | 默认 contextLength=2048 时，摘要提示只剩 9,148 字符且不含长文尾部；本次没有调用真实模型 |
| 停止/启动与持久化 | 通过 | 重启全部服务后，原登录会话、长文、人工摘要/标签及 PDF 检索仍正常；保留 10 条最终样例，清理首轮临时失败样例 |
| 浏览器扩展构建 | 通过 | TypeScript 检查与 Vite 构建成功，产物 `apps/browser-extension/dist/` |

图片样例为固定色块，PDF 为单页可选中文本样例。本次没有验证扫描 PDF OCR、复杂表格、多栏阅读顺序、超大文件、任意真实网站的反爬/登录机制或语义向量搜索。捕获登录后 DOM 的接口链路已自动验证；真实浏览器扩展端到端交互留给下述人工步骤，不将它冒充为已测通过。

## 用户浏览器验证步骤

1. 打开 `http://127.0.0.1:3100/signin`，使用本机评估账号登录。查看 `EVAL Content Foundation` 列表、`EVAL Long article`、两条 `EVAL Excerpt`、PDF 与 PNG。长文阅读器中查找 `TAILMARKER20261028`；顶栏搜索同字符串只会命中短文本对照，不会命中长文，这是本次已复现的限制。
2. Chrome 打开 `chrome://extensions`，开启开发者模式，选择“加载已解压的扩展程序”，目录为 `/Users/simon/Desktop/dev/code/karakeep/apps/browser-extension/dist`。
3. 扩展连接本机地址 `http://127.0.0.1:3100` 并登录。扩展 Settings → Saving 中打开 **Client-side crawling**（界面标注 Experimental），接受所需页面读取权限。可按需打开 Include images。
4. 先使用合成站点验证：在同一浏览器访问 `http://127.0.0.1:18081/login`，确认出现 `LOGINONLY20261028` 正文，再在地址末尾加一个新的查询参数避免与已有测试 URL 去重，然后点击扩展保存。回到 Karakeep，检查 30 段正文、来源 URL、附件原 HTML。关闭 Client-side crawling 后用另一个新查询参数保存，对比其是否只包含登录页。
5. 再选择你实际使用的已登录网站，等待正文加载，重复步骤 4。动态懒加载正文应先在浏览器中展开/滚动加载；本轮没有证明任意站点的隐藏内容都能被捕获。扩展捕获失败会退化为仅保存 URL，所以必须检查保存后正文，不能只看保存成功提示。
6. 在同一网页分别选中两段文字，用扩展的保存选中文本入口保存，回到 Karakeep 确认两条独立记录及来源链接。普通网页 URL 收藏有去重，独立摘录应使用 text + sourceUrl；高亮是关联到网页的另一种形式。
7. 在 PDF 或图片详情右侧 Attachments 中下载 Bookmark Asset；浏览器 HTML 快照下载 precrawled archive。原页面链接的 View Original 是来源链接，和原附件下载用途不同。

## 本地证据与复跑

- `.codex/local-eval/results.json`：基础 API 测试结果。
- `.codex/local-eval/extra-results.json`：高亮、真实浏览器 DOM 上传、HTML 下载、各类网页预览。
- `.codex/local-eval/search-results.json`：长文尾部检索与短文本对照。
- `.codex/local-eval/inference-results.json`：固定假响应下的摘要/标签行为、提示截断。
- `.codex/local-eval/restart-results.json`：重启与数据持久性。
- `.codex/local-eval/search-ui-results.json`：网页顶栏全文搜索。
- `.codex/local-eval/public-result.json`：外网公开页面抓取结果。
- `.codex/local-eval/*-preview.png`、`dashboard.png`：网页截图。
- `.codex/local-eval/verify.mjs`、`extra-checks.mjs`、`search-check.mjs`、`mock-inference.mts`：测试脚本，复跑会新增测试内容。

依赖使用 `pnpm install --frozen-lockfile --registry=https://registry.npmjs.org --network-concurrency=8` 安装。首次安装遇到 registry/DNS 问题，降低并发后通过；未关闭锁文件或供应链校验。独立 Node 下载通过官方 SHASUMS256 校验。

开发脚本直接用 `node --import tsx` 启动 worker，但 HTML 解析子进程通过 PATH 找 `tsx`。本机包装脚本显式加入项目 `node_modules/.bin` 后抓取通过，未修改解析业务逻辑。Meilisearch 下载完成后通过管理 API 全量重建索引，消除了此前搜索服务未启动引起的索引失败。
