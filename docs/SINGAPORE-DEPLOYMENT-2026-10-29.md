# 新加坡 Karakeep 部署记录

> 后续更新：已上线 Keeply · 收好中文界面并接入 MiniMax。当前模型、镜像和验证结果见 [中文与模型接入记录](KEEPLY-MINIMAX-2026-10-29.md)。下文保留原版初次部署状态。


部署日期：2026-10-29。入口：**https://keeply.facezero.online**。服务器 `ubuntu@43.156.57.17`。

## 账号与配置

管理员邮箱：`admin@chatcanvas.online`。密码为新生成的 Karakeep 专用密码，保存在本项目 `.env.local` 的 `KARAKEEP_ADMIN_PASSWORD`，未复用现有应用的管理员密码。公开注册已关闭，匿名注册实测返回 403。

在自己的本机终端读取密码：

```sh
cd /Users/simon/Desktop/dev/code/karakeep
sed -n 's/^KARAKEEP_ADMIN_PASSWORD=//p' .env.local
```

`.env.local` 权限 0600，已验证 Git 忽略。服务器 `/opt/karakeep/.env` 只包含 Karakeep 专用配置，权限 0600；没有上传含 SSH 凭据和其他应用凭据的整个本机文件。

## 版本、依赖与部署方式

使用官方预编译 amd64 生产镜像。镜像构建 provenance 的 `vcs:revision` 对应本地提交 `fb25e42702806d361e8fbc9a502f15d073a79372`；界面显示 nightly，使用固定 digest 防止浮动升级。未修改核心业务代码或锁文件。

- App：`ghcr.io/karakeep-app/karakeep@sha256:994b1f6cc9b900805431bd05069e5e936ddde034272ae273311349bb175daf8d`
- Chrome：`ghcr.io/karakeep-app/karakeep-chrome@sha256:9806aaf99054d29f9aac159d71d10047e8a45da90b08a43ba9d3303ab51aa804`
- Meilisearch v1.41.0：`getmeili/meilisearch@sha256:860fa4baed04ae1c235de870edab0c8006227546dea1bbb6411fbfc5e27cf1db`

服务器已有 Ubuntu 24.04.4、Docker 29.6.2、Compose v5.3.1 和 Caddy，直接复用。依赖随容器镜像提供，无需在这台 4 GB 主机安装 Node/pnpm 或执行源码编译。SQLite 主库和任务库由容器启动流程初始化、迁移。

Compose 源文件：`deploy/singapore/compose.yml`。项目名 `karakeep-keeply`；容器名以 `karakeep-keeply-` 开头。应用端口只绑定 `127.0.0.1:13100`；Chrome、Meilisearch 不发布主机端口。Caddy 新增独立域名块并自动签发 HTTPS 证书，证书校验成功。未改动现有 `chat.facezero.online` 应用的数据与容器。

## 数据与运维命令

| 用途 | 服务器路径 |
| --- | --- |
| Compose | `/opt/karakeep/compose.yml` |
| 私密配置 | `/opt/karakeep/.env` |
| SQLite 主库、任务库、原始文件 | `/opt/karakeep/data` |
| 搜索索引 | `/opt/karakeep/meilisearch` |
| 反向代理 | `/etc/caddy/Caddyfile` |
| 部署前代理配置备份 | `/etc/caddy/Caddyfile.before-karakeep-20261029T072656Z` |

SSH 登录后执行。`/opt/karakeep` 为 root 所有的 0700 目录，因此通过 sudo 和 `--project-directory` 操作：

```sh
# 校验配置（不会输出密钥）
sudo docker compose --project-directory /opt/karakeep config --quiet
# 启动、停止、重启，仅作用于新栈
sudo docker compose --project-directory /opt/karakeep up -d
sudo docker compose --project-directory /opt/karakeep stop
sudo docker compose --project-directory /opt/karakeep restart
# 状态与日志
sudo docker compose --project-directory /opt/karakeep ps
sudo docker compose --project-directory /opt/karakeep logs --tail=100 app
# 健康与资源
curl --fail https://keeply.facezero.online/api/health
free -m
sudo docker stats --no-stream
```

`stop` 保留数据。不要删除数据目录。备份时应先停止本项目，再将 `/opt/karakeep` 整体备份到受保护位置并重新启动，保证数据库、任务与文件的一致性；含 `.env` 的备份也必须保密。升级前备份并核对迁移兼容性，再更新固定镜像 digest。

撤销上线：停止本项目，删除 Caddyfile 中本次新增的 `keeply.facezero.online` 块，先运行 `sudo caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile`，成功后 `sudo systemctl reload caddy`。保留数据。若其他站点配置已更新，不要直接用旧备份覆盖整份 Caddyfile。

## 功能验证

通过公网 HTTPS 执行 API 验收，并在重启全部三个新容器后再次执行：

| 测试 | 结果 |
| --- | --- |
| 管理员登录与角色 | 通过 |
| 真实 Chrome 登录、搜索与 PDF 阅读器 | 通过，PDF 页面可见、无 pageerror |
| 禁止公开注册 | 通过，403 |
| 同一来源的两条文字摘录 | 通过，独立 ID，保留同一 sourceUrl |
| 人工标签与列表 | 通过，重启后仍存在 |
| 网页收藏与抓取 | 通过，RFC 8259 |
| 正文分页读取 | 通过，3 页共 32,467 字符 |
| 文本 PDF 提取 | 通过，样例标记可读 |
| PNG / PDF 原文件下载 | 通过，与上传文件逐字节一致 |
| 文字、PDF、网页正文搜索 | 通过，均命中对应收藏 |
| 重启持久化 | 通过，账号、收藏、标签、列表、原文件和搜索保留 |

浏览器结果：`.codex/server-assessment/public-ui-results.json`；截图：`public-dashboard.png`、`public-search.png`、`public-pdf.png`（同目录）。PDF 由浏览器内嵌阅读器渲染，已查看截图确认正文标记可见。

验收记录位于忽略目录 `.codex/server-assessment/public-results.json`；数据中保留 `DEPLOY` 前缀的少量验收样例，方便人工复核。

浏览器复核步骤：登录后打开 `DEPLOY JSON RFC8259` 阅读正文；打开两条 `DEPLOY 验收摘录` 检查来源和标签；搜索 `PDFMARKER20261028`，打开 `DEPLOY sample.pdf`；从文件操作菜单下载 PDF 或 PNG 并与原文件比对。

## 资源限制与适用范围

应用限制 1024 MiB、Chrome 384 MiB、Meilisearch 256 MiB，总内存上限 1664 MiB。该上限是容器预算，不代表实际常驻占用，也不包含宿主机与其他应用。允许 app / Chrome 使用有限 swap；服务器原有 swap 约 2 GiB。

修复抓取后约 632 MiB；整栈重启及公网功能验收的 6 次采样合计约 602–663 MiB，宿主机 MemAvailable 2024–2109 MiB。Swap 使用 211 MiB，末尾 `vmstat` 的 4 个实时区间 si/so 均为 0；未发现 OOM 或容器自动重启。部署前后有主动重启，这与自动重启计数不同。现有后台公网返回 200，本机健康接口返回 ok。以上是少量样例的实测，不是长期或大文件峰值保证；据此判断这台 4 GB 主机足以开始个人低频评估。原始采样保存在 `.codex/server-assessment/final-resources.txt`。

按个人低频使用配置：抓取各队列并发 1、索引并发 1、文件预处理并发 1；上传上限 20 MiB。关闭截图、网页 PDF 自动生成、完整网页归档、视频下载、自动摘要、自动标签和 embeddings。没有连接真实 LLM。

发现并修复一项部署配置问题：Chrome 的 PID 限制 192 导致无法创建线程，抓取挂起；提高到 512 后抓取与搜索通过。未调整核心业务代码。

## 内容底座限制

以下是同一源码版本本机评估的已知结论，详见 `LOCAL-EVALUATION-2026-10-28.md`，不把它们冒充为本次服务器上的全量复测：

- 仅提交登录后网页 URL，服务端爬虫不会继承用户浏览器登录态。需要客户端捕获正文/HTML；合成登录页 DOM 上传接口此前验证通过，真实网站扩展交互仍需人工验证。
- 同一 URL 的 link 收藏会去重；多条独立摘录可保存为带 `sourceUrl` 的 text 收藏，或使用关联原网页的 highlights。
- 本机 245,332 字符样例能完整存储和分页读取，但超长正文尾部关键词搜索未命中。此次 RFC 分页成功不等于消除了该限制。
- 原自动摘要逻辑可能覆盖人工摘要；假模型响应测试中人工标签保留。当前部署关闭所有推理，未来启用 Agent/自动摘要前仍需明确字段归属规则。
- 扫描 PDF OCR、复杂排版、大批量导入、多人并发和长期负载尚未验证。
