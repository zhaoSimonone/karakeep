# 新加坡服务器 Karakeep 部署评估

> 后续状态：已按用户授权部署到 `https://keeply.facezero.online`；实际配置、命令和验收结果见 [新加坡部署记录](SINGAPORE-DEPLOYMENT-2026-10-29.md)。下文保留部署前评估，不代表当前运行状态。


检查日期：2026-10-29（Asia/Shanghai）。服务器：43.156.57.17，ubuntu。评估对象仍为 Karakeep 当前提交 `fb25e42702806d361e8fbc9a502f15d073a79372`。

## 结论

**满足个人低并发试运行的资源条件，比上海 2GB 服务器更适合作为部署目标。** 推荐保留网页、worker、Meilisearch 与 Chrome，采用已有低并发、有限内存配置。不需要为了首次轻量试运行先升级到 8GB。

这是资源评估通过，不是生产压力验收通过：本次没有在服务器启动 Karakeep，尚未测得其实际空闲占用、任务峰值或现有应用业务高峰占用。复杂网页、OCR、大 PDF、批量导入仍需有界实测。

本次仅读取服务器状态、使用并清除临时配置文件进行语法校验；没有部署容器、安装软件、改 DNS、reload Caddy 或修改现有应用。未使用应用管理员凭据登录后台，未读取其业务数据。

## 资源实测

| 项目 | 实测值 |
| --- | --- |
| 系统 | Ubuntu 24.04.4 LTS，x86_64 |
| CPU | 2 核，短时负载约 0.21 / 0.20 / 0.10 |
| 物理内存 | 3,724 MiB，约 3.64 GiB |
| 已用内存 | 1,129–1,138 MiB |
| MemAvailable | 2,585–2,594 MiB，约 2.53 GiB |
| Swap | 1,987 MiB，已用约 152–153 MiB |
| 内存压力 | PSI avg10/60/300 均 0，6 次 vmstat 采样无持续换页 |
| 根盘 | 59GB，已用约 25GB，可用约 33GB |
| 最近 OOM | 可读取的最近 7 天内核日志未匹配到 OOM；不代表历史上从未发生 |

`free` 的 free 列只有约 126–147MiB，不代表只剩这些内存；Linux 将大量内存用于可回收缓存，应结合 MemAvailable 判断。

现有主应用为 sub2api，并有 PostgreSQL 18、Redis 8 容器；docker stats 快照分别约 38.75 / 167.8 / 4.19MiB，均 running，OOM=false、restarts=0。宿主机还运行 Docker、Caddy、云安全/监控等服务，不应只相加容器使用量来判断整机负载。现有容器没有显式内存限制，其业务增长也会占用当前余量。

现有后台 `https://chat.facezero.online/dashboard` 返回 200，约 0.15 秒；回环服务 `http://127.0.0.1:8080/health` 返回 200。这些证明入口健康，不等价于完整业务功能验收。

## Karakeep 资源预算

复用 `deploy/tencent/compose.yml` 的独立项目 `karakeep-keeply`，其路径和参数不依赖上海 IP，可用于新加坡。该文件为配置草案，必须填入已构建的当前提交镜像和经过确认的 Chrome digest。

| 组件 | RAM 限制预算 |
| --- | ---: |
| Web + workers | 1,024 MiB |
| Meilisearch | 256 MiB |
| Chrome | 384 MiB |
| 合计 | 1,664 MiB，约 1.63 GiB |

可用约 2,590MiB 减去预算 1,664MiB，约余 926MiB。另一种近似是已用约 1,130MiB + 新预算 1,664MiB = 2,794MiB，距离物理内存约余 930MiB；数值随缓存、共享内存和瞬时任务变化。这一余量支持进行受控部署验证，但不能保证所有抓取任务都能在限制内完成。

配置前提：搜索并发 1、文件预处理并发 1、每个抓取队列并发 1；关闭真实 LLM、embedding 和视频处理；关闭网页截图、网页 PDF 副本及完整页面归档；单个上传文件限制 20MiB。保留用户上传 PDF/图片、正文提取和全文检索。普通抓取与低优先级队列可能同时工作，不应把所有 worker 宣称为全局串行。

避免在这台共享主机上同时进行大型源码构建和在线处理。现有 Docker build cache 约 16.65GB，其中约 16.37GB 标记为可回收；目前磁盘足够，无需为部署清理它，本次没有执行 prune。

## 依赖和域名

已具备 Docker 29.6.2、Compose v5.3.1、Buildx v0.35.0、Caddy。**运行容器不需要安装宿主机 Node/pnpm、额外 Redis/PostgreSQL、Nginx 或 Certbot。** Karakeep 使用独立 SQLite 和附件目录，不能复用现有 sub2api 数据库。

Caddy 已占用 80/443，管理 `chat.facezero.online` 等站点；应在其现有配置中新增独立站点。不要安装第二个反向代理去争抢端口。

- 新片段：`deploy/singapore/Caddyfile.fragment`。
- Karakeep 只映射回环 `127.0.0.1:13100`（当前未占用）。
- Chrome 与 Meilisearch 只使用 Compose 内部网络。
- 目标数据：`/opt/karakeep/data`、`/opt/karakeep/meilisearch`，当前尚未创建。
- `keeply.chatcanvas.online` 当前 A 记录仍为上海 `124.223.212.122`。正式切换时需将其改为 `43.156.57.17`，并核查是否存在冲突的 AAAA 记录；本次未改 DNS。
- 不复用上海证书私钥。DNS 正确指向新加坡、80/443 可达并启用新站点后，由现有 Caddy 管理该域名 HTTPS。

服务器 GHCR `/v2/` 返回预期 401 challenge，说明入口可达；实际镜像拉取、镜像 digest 和速度尚未验证。

## 当前项目私密配置

已将以下字段合并到本项目 `.env.local`，权限 0600，Git 忽略，保留原上海配置和独立 Karakeep 密钥：

- TENCENT_SINGAPORE_HOST、TENCENT_SINGAPORE_SSH_USER。
- TENCENT_SINGAPORE_SSH_PASSWORD。
- CHAT_FACEZERO_ADMIN_EMAIL、CHAT_FACEZERO_ADMIN_PASSWORD。

不要将整个本机 `.env.local` 上传到服务器或作为容器 env_file，它含有两台服务器的 SSH 凭据和其他应用管理员凭据。正式部署只拷贝专用 Karakeep 应用变量到权限 0600 的 `/opt/karakeep/.env`。新加坡 SSH 密码只通过忽略目录中的 askpass 助手读取，没有放入 SSH 命令参数。

## 安装和验收顺序

1. **镜像准备。** 在独立 Linux amd64 构建机/CI 使用当前提交构建生产镜像；项目 Dockerfile 管理 Node 24、pnpm 11.2.1 及编译依赖。使用 `git archive` 提供上下文，排除 `.env.local`、本机数据、`.codex` 和测试会话。详见上海评估文档的构建命令，构建流程可复用；不要把官方浮动 release 镜像冒充当前提交。
2. **独立部署。** 建立 `/opt/karakeep`，放置 Compose、仅应用变量的 `.env` 和独立数据目录。核对镜像用户并设置数据目录所有权。启动前检查 13100 端口仍可用。
3. **回环验证与账号初始化。** 先不上公网，通过 SSH 隧道及临时配置创建首个管理员。随后关闭注册、重建 app 容器，验证管理员登录成功、匿名注册被禁止。默认草案已关闭注册，新空库必须处理初始化。
4. **域名和 HTTPS。** 回环功能通过后更新 DNS；备份当前 Caddyfile，追加本项目片段，先 validate，成功后 reload。禁止覆盖原有完整 Caddyfile。
5. **基础功能。** 登录、网页正文、同源两条独立 text 摘录、标签/列表、小 PNG/PDF 上传预览、PDF 正文、原文件 SHA-256、唯一关键词检索和长文游标读取。图片/文本 PDF 测试不能代替复杂扫描件 OCR 测试。
6. **资源和共存。** 连续执行少量真实样例，观察 CPU、MemAvailable、Swap、PSI、容器 OOM/restart 及现有后台响应。建议将 MemAvailable 持续低于约 400MiB、持续换页、任意新 OOM/重启或旧服务明显变慢视为验收失败信号；此阈值是运维建议，不是产品硬性最低要求。先从单条任务开始，不对共享主机做无限并发压测。
7. **重启持久性。** 重启新栈后确认账号、收藏、文件、标签和索引保留，同时复查现有后台健康。

准备就绪后在服务器执行的命令（**本次没有执行 up/reload**）：

```sh
cd /opt/karakeep
sudo docker compose --env-file .env config --quiet
sudo docker compose --env-file .env up -d
sudo docker compose ps
curl --fail http://127.0.0.1:13100/api/health

# 完成账号初始化、追加配置、域名切换后
sudo caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile
sudo systemctl reload caddy
curl --fail https://keeply.chatcanvas.online/api/health

# 共存与资源检查
curl --fail https://chat.facezero.online/dashboard -o /dev/null
curl --fail http://127.0.0.1:8080/health
free -m
vmstat 1 10
sudo docker stats --no-stream
sudo docker inspect --format '{{.Name}} OOM={{.State.OOMKilled}} restarts={{.RestartCount}}' \
  karakeep-keeply-app-1 karakeep-keeply-meilisearch-1 karakeep-keeply-chrome-1
```

`/api/health` 只确认网页服务，不能验证后台抓取、搜索或文件处理；需要上述功能测试共同通过。

停止新应用：`cd /opt/karakeep && sudo docker compose stop`，保留数据。回滚只停止新项目、撤销新增 Caddy 片段并按需恢复 DNS，不影响 sub2api 容器或原有域名。不要使用全局 Docker prune 或 down 其他项目。

## 本次已完成的验证

- SSH/sudo、实际内存/磁盘/CPU、Swap/PSI、现有服务健康：通过。
- Docker Compose 草案在新加坡服务器 `config --quiet`：通过，使用临时占位变量。
- 新 Caddy 片段与原 Caddyfile 合并成临时文件，执行 validate 后删除：见本机 `.codex/server-assessment/singapore-caddy-validation.txt`。未 reload。
- 运行时资源、应用功能、新域名 TLS：尚未部署，待验收。
- 审计原始输出：`.codex/server-assessment/singapore-resources.txt` 和 `singapore-services.txt`，均在忽略目录。
