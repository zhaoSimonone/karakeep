# 腾讯云服务器部署评估与实施步骤

评估日期：2026-10-29（Asia/Shanghai）。当前源码：`fb25e42702806d361e8fbc9a502f15d073a79372`。目标：`keeply.chatcanvas.online`，主机 `124.223.212.122`，用户 `ubuntu`。

## 当前结论与执行边界

**技术上能够部署，但现有 2GB 共享主机不适合未经实测直接上线完整 Karakeep。推荐先升级到至少 4GB，再按本文方案验证。** 这是基于此机器现有负载和规划余量的建议，不是声称 Karakeep 官方规定了 4GB 最低内存。2GB 并非绝对无法启动；禁用服务端浏览器、限制上传和串行处理可以试用，但需要重新验收功能，不能当作已验证的完整方案。

本次完成了远程资源审计（仅查询及创建后立即清除的临时语法校验文件）、现有站点健康检查、域名/证书核查、本地私密配置和生产配置草案。**未安装服务器软件、未拉取应用镜像、未新建容器、未改 Nginx、未将 Karakeep 上线。** 没有对服务器做 Karakeep 运行时内存或压力测试，以下预算不能替代部署后测量。

没有读取 Keeply 的 `.env.local`，没有迁移数据，没有更改任何现有站点或数据库，也没有调用真实 LLM。

## 服务器实测

| 项目 | 结果 |
| --- | --- |
| 系统/架构 | Ubuntu 24.04.4 LTS，x86_64 |
| CPU | 2 核 |
| 物理内存 | 1,967 MiB，约 1.92 GiB |
| 已用内存 | 888–907 MiB，检查窗口内变化 |
| 可用内存 MemAvailable | 1,060–1,079 MiB，约 1.04–1.05 GiB |
| Swap | 1,987 MiB，总使用 482–486 MiB |
| 磁盘 | 根盘 50GB，已用 14GB，可用约 34GB |
| 当前负载 | 约 0.02 / 0.08 / 0.08（首次检查） |
| 内存压力 | PSI avg10/60/300 均为 0；短时 vmstat 未显示持续换入换出 |
| 最近 OOM | 最近 7 天可读取的内核日志中未匹配到 OOM 记录；不代表更久以前没有 |
| Docker/Compose/Buildx | 29.6.1 / v5.3.1 / v0.35.0，已安装 |
| Nginx/Certbot | 已安装；`nginx -t` 通过 |
| 权限 | SSH 私钥登录成功；`sudo -n` 可用；Docker 操作需 sudo |

现有容器：AIGC API、one-for-all API、两个 PostgreSQL。还有宿主机 PostgreSQL、ChatCanvas Python 服务、Money Adventure Node 服务、云监控与安全组件等。不能只把 `docker stats` 的容器数值相加当成整机已用内存。

检查前后 `tools`、`canvas`、`aigc`、`money` 四个 HTTPS 首页均返回 200。CPU 和磁盘不是当前主要瓶颈；新增抓取、解析、索引和文件处理任务的内存峰值才是风险点。Swap 可以缓冲短期峰值，但不是等价的物理内存。

## 域名与 TLS

- `keeply.chatcanvas.online` 的 IPv4 解析为 `124.223.212.122`。
- 服务器已存在此域名证书，UTC 有效期 2026-10-27 05:59:12 至 2027-01-25 05:59:11（北京时间到期为 2027-01-25 13:59:11）。
- 当前 Nginx enabled sites 没有 `keeply.chatcanvas.online`，HTTPS 请求命中其他默认虚拟主机，正常证书校验失败。`curl -k` 能拿到 200 并不证明该站点配置正确。
- 正式部署时新增独立 server block，引用已有证书并代理 `127.0.0.1:13100`；无需覆盖 Money Adventure 的默认站点。
- 证书现有续期方式是 Nginx 插件；新站点安装后应单独执行此证书的续期 dry run。

## 资源预算与方案选择

完整栈至少包含网页和 workers、Meilisearch、Chrome。当前源码默认 HTML 解析子进程堆上限 512MB、搜索并发 50，不能把默认值直接当作这台小内存服务器的配置。

已提供 `deploy/tencent/compose.yml` 作为**升级至 4GB 后的起点**：

| 服务 | 容器物理内存上限 | RAM+Swap 上限 | 设置 |
| --- | --- | --- | --- |
| Web + workers 合并容器 | 1,024 MiB | 1,280 MiB | Node 单进程堆 256MiB；搜索并发 1；文件预处理并发 1 |
| Meilisearch | 256 MiB | 256 MiB | 索引内存预算 128MiB、索引线程 1 |
| Chrome | 384 MiB | 512 MiB | 独立容器、无公网端口 |
| 合计 | 1,664 MiB | 2,048 MiB | 这是限制预算，不是已测实际用量 |

上述新增内存预算再加当前约 900MiB 使用量，超过现有物理内存。4GB 能提供更多缓存和突发余量；若经常抓取复杂页面、扫描大 PDF、OCR 或批量导入，8GB 更合适。4GB 也仍须实际验收，并不保证任意大文档都能处理。

配置关闭 AI、embedding、视频 worker；关闭网页截图、网页 PDF 副本、完整页面归档和广告过滤预加载。**用户上传的 PDF/图片收藏仍保留**，单文件限制为 20MiB。普通抓取与低优先级抓取各配置并发 1；不同队列仍可能同时工作。这些节省配置与本机默认测试配置不同，必须重新验收。容器达到限制时可能重启/OOM，限制的作用是控制影响范围，不是保证处理成功。

若坚持留在 2GB，可考虑移出 Chrome 和/或搜索到其他机器，或依赖浏览器端页面捕获。没有服务端 Chrome 时 JS 渲染网页抓取、截图等能力会受影响；没有 Meilisearch 则全文搜索不可用。本次未实施这种降级方案。

## 依赖与构建

服务器运行阶段已具备 Docker、Compose、Nginx、Certbot，**不需要另外安装宿主机 Node、pnpm、Redis 或 PostgreSQL**。Karakeep 使用自己的 SQLite 和文件目录，不复用现有站点的 PostgreSQL。

当前源码构建需要 Node 24、pnpm 11.2.1、Linux 编译工具以及 Dockerfile 中的其他构建依赖（包括 monolith 的 Rust 构建阶段）。这些由项目 Dockerfile 管理。镜像构建的内存和磁盘峰值与运行时不同，推荐在独立 Linux amd64 构建机/CI 完成，不在这台 2GB 共享服务器上执行依赖安装和 Next.js 构建。

当前仓库是个人 fork，且本机验证固定在上述提交。不要把官方 `release` / `latest` 镜像直接标为“已经验证的当前代码”。应构建这个提交，记录镜像 ID/digest；后续更新也应保留版本与回滚镜像。

在本机生成仅包含受 Git 跟踪文件的源码包：

```sh
cd /Users/simon/Desktop/dev/code/karakeep
mkdir -p .codex/server-deploy
git archive --format=tar fb25e42702806d361e8fbc9a502f15d073a79372 \
  > .codex/server-deploy/karakeep-fb25e427.tar
```

将该包传到有 Docker 的构建机，执行：

```sh
docker build --platform linux/amd64 --target aio \
  --build-arg SERVER_VERSION=fb25e427 \
  -f docker/Dockerfile -t karakeep-local:fb25e427 \
  - < karakeep-fb25e427.tar

docker image save karakeep-local:fb25e427 | gzip > karakeep-fb25e427-image.tar.gz
```

`git archive` 避免把 `.env.local`、本机数据、测试 session、`.codex` 工具目录和日志放入构建上下文。不能把 macOS 的 `node_modules` 直接复制到 Linux 使用。

Chrome 应选择官方 `ghcr.io/karakeep-app/karakeep-chrome` 镜像，验收前解析并固定 digest；Meilisearch 草案固定 v1.41.0，正式交付时也记录其 digest。镜像拉取网络本次仅验证了 GHCR `/v2/` 返回预期的 401 challenge，未完成实际拉取测速。

## 配置、数据隔离和账号初始化

本项目 `.env.local` 已创建，权限 0600，Git 忽略检查通过，包含：

- DEPLOY_HOST、DEPLOY_USER、DEPLOY_DOMAIN。
- 用户提供的 SSH_PASSWORD、SSH_PRIVATE_KEY；私钥读取自已提供的本地 PEM 副本。
- SSH_PRIVATE_KEY_PATH。
- 独立生成的 KARAKEEP_NEXTAUTH_SECRET、KARAKEEP_MEILI_MASTER_KEY。

**不要把整个 `.env.local` 上传给容器或服务器应用。** Compose 显式传递应用配置，不使用包含 SSH 凭据的 `env_file`。服务器 `/opt/karakeep/.env` 应只含下面四个字段，权限 0600：

```dotenv
KARAKEEP_IMAGE=karakeep-local:fb25e427
KARAKEEP_CHROME_IMAGE=ghcr.io/karakeep-app/karakeep-chrome@sha256:<verified-digest>
KARAKEEP_NEXTAUTH_SECRET=<copy-only-this-deployment-secret>
KARAKEEP_MEILI_MASTER_KEY=<copy-only-this-deployment-secret>
```

生产目录建议：

- `/opt/karakeep/compose.yml`：本项目 Compose 草案。
- `/opt/karakeep/.env`：仅应用部署变量。
- `/opt/karakeep/data/`：SQLite、队列和附件；与 Keeply 完全隔离。
- `/opt/karakeep/meilisearch/`：独立搜索索引。
- Compose 项目名 `karakeep-keeply`，默认容器名 `karakeep-keeply-app-1` / `meilisearch-1` / `chrome-1`。
- Web 仅监听主机 `127.0.0.1:13100`；Chrome 和搜索不发布主机端口。

目录所有权应按构建后镜像的运行用户确认，本次尚未创建上述生产目录。根目录不应整体 chown 为容器用户；数据库和附件目录单独授权。

草案默认 `DISABLE_SIGNUPS=true`，新空数据库无法直接注册。上线前先仅启用 loopback 访问，通过 SSH 隧道和临时配置开放注册，创建首个管理员，随即关闭注册并重新创建 app 容器。确认管理员登录成功、匿名注册关闭后才启用公网 Nginx 站点。不要先将公开注册入口暴露到互联网再抢注册首个账号。

## 上线前后验证

以下命令是**待执行步骤，不代表已上线**。准备好镜像、4GB 资源和上述目录/配置后：

```sh
cd /opt/karakeep
sudo docker compose --env-file .env config --quiet
sudo docker compose --env-file .env up -d
sudo docker compose ps
curl --fail http://127.0.0.1:13100/api/health
```

`/api/health` 只确认网页服务工作，不检查爬虫、队列和搜索，不能单独作为验收。

完成管理员初始化和 loopback 验证，再将 `deploy/tencent/nginx.conf` 安装为新的独立站点。安装前备份对应目标文件（若已有则先复核，不能覆盖未知配置），执行：

```sh
sudo nginx -t
sudo systemctl reload nginx
curl --fail https://keeply.chatcanvas.online/api/health
sudo certbot renew --cert-name keeply.chatcanvas.online --dry-run
```

使用少量专门的验收数据：

1. HTTPS 不加 `-k` 能通过，登录、退出、禁止匿名注册正确。
2. 保存一条公开网页，抓取完成后检查正文首尾与来源；保存登录态网页应使用扩展端捕获，不把登录页误认为正文。
3. 保存同一来源的两条文字片段、添加标签与列表；确认 ID 独立和 `sourceUrl` 保留。
4. 上传小 PNG 与文本 PDF，验证网页预览、PDF 文本提取、原文件下载 hash。
5. 搜索刚创建的唯一关键词，确认 worker 建立索引；逐游标读取长文正文。
6. 先单条、再小批量连续执行网页抓取/PDF处理/搜索，采样 `free -m`、`vmstat 1`、`docker stats --no-stream` 和容器 OOM/restart 状态，同时检查四个旧站点响应。不要用无限并发压力测试共享主机。
7. 将可用内存持续低于约 400MiB、持续换页/内存 PSI、OOM/重启、旧站点明显变慢视为本方案验收失败信号，降低负载或停止新栈。400MiB 是保守运维阈值，不是产品硬性最低要求。
8. 重启 Karakeep 栈，确认账号、收藏、原文件、标签和索引保持；再复测旧站点。

```sh
# 在服务器查看新栈资源与生命周期，不显示应用密钥
sudo docker stats --no-stream \
  karakeep-keeply-app-1 karakeep-keeply-meilisearch-1 karakeep-keeply-chrome-1
sudo docker inspect --format '{{.Name}} OOM={{.State.OOMKilled}} restarts={{.RestartCount}}' \
  karakeep-keeply-app-1 karakeep-keeply-meilisearch-1 karakeep-keeply-chrome-1
free -m
vmstat 1 10

# 停止新栈，保留数据
cd /opt/karakeep
sudo docker compose stop

# 再次启动
sudo docker compose up -d
```

回滚只撤销新增的 Nginx 站点并停止 `karakeep-keeply` 项目，保留 `/opt/karakeep` 数据和镜像。不要执行全局 Docker prune、不要停止已有数据库。备份时停止新栈后备份其数据目录和配置，或使用项目支持的备份方式；不能对正在写入的 SQLite 简单复制单个 db 文件并声称一致性备份完成。

## 本次检查的实际状态

- SSH、sudo、主机资源、DNS、现有证书、Docker/Compose、Nginx 当前配置：已检查。
- Compose 草案：在目标服务器上通过 `docker compose -f - config --quiet` 校验，使用临时假密钥，不泄露真实配置。
- 新 Nginx 草案：在服务器创建临时完整配置，`nginx -t` 校验成功后立即删除；证书路径有效。未安装站点、未 reload、未实际接入流量。
- 应用镜像构建/拉取、数据库初始化、账号创建、新站点 TLS、抓取/搜索/上传、生产内存峰值：尚未执行。
- 本机已有功能验证见 `docs/LOCAL-EVALUATION-2026-10-28.md`，不能替代服务器生产配置验收。
