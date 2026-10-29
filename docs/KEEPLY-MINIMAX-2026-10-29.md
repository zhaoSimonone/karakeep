# Keeply · 收好：中文界面与 MiniMax 接入

2026-10-29，部署目标 `https://keeply.facezero.online`，服务器 `43.156.57.17`。管理员账号和密码沿用原部署。

## 本次变化

- 界面默认简体中文，登录页使用中文；补齐原简体中文语言包缺失的 9 项翻译。列表标题及收藏日期随界面语言显示。
- 页眉标识、浏览器标题、PWA 名称、侧栏版本名称改为 **Keeply · 收好**。收藏原文、原文件和根据原文生成的标签不作品牌替换；底层 Karakeep 包名、数据格式和上游链接保留。
- 增加 Anthropic Messages 文本适配器，直接请求用户指定的 MiniMax API。没有添加第三方运行依赖：使用 Node 内置 fetch、AbortSignal 和项目已有的 Zod。
- 图片推理明确跳过，embeddings、语义搜索和聊天功能未启用。普通全文搜索保持可用。

## 模型配置与行为

| 配置 | 当前值 |
| --- | --- |
| Base URL | `https://api.minimax.cn/anthropic/v1` |
| 请求路径 | `/messages` |
| 模型 | `MiniMax-M3.1-Flash` |
| 推理强度 | `output_config.effort=max` |
| 输出上限 | `max_tokens=4096` |
| 内容输入预算 | `INFERENCE_CONTEXT_LENGTH=12000`，上游提示构造仍会按预算裁剪 |
| 整理语言 | 简体中文 |
| 后台推理并发 | 1 |
| 推理任务超时 | 180 秒 |
| 自动标签 | 开启，适用于网页、文字片段和已提取文本的 PDF |
| 自动摘要 | 关闭；可在网页收藏详情中手动点击 AI 摘要 |

手动 AI 摘要会写入该网页收藏的摘要字段，重新生成会替换已有摘要。自动摘要保持关闭，以免后台整理覆盖人工摘要。现有手动摘要功能只支持网页收藏；此次未扩展为文字片段/PDF 摘要。

模型在 MiniMax 云端运行，服务器不加载本地模型。新内容和手动摘要所需正文会发往上述接口。上线时，先前因推理 worker 关闭而积压的少量验收样例标签任务也已处理。

本机 `.env.local` 保存 `MINIMAX_API_KEY`、`MINIMAX_BASE_URL`、`MINIMAX_MODEL`，权限 0600 且被 Git 忽略。服务器 `/opt/karakeep/.env` 只增加专用 `MINIMAX_API_KEY`；Compose 将它映射为容器的 `ANTHROPIC_API_KEY`。没有上传整个本机私密文件，也没有把密钥写进镜像、代码或文档。

## 构建、依赖与发布

本机沿用 Node 24.22.1、pnpm 11.2.1 和已安装的锁定依赖，锁文件未变。首次在干净开发环境安装时使用 `pnpm install --frozen-lockfile`。

本次以已验证的官方镜像为基础，覆盖本机编译出的 Web/worker JavaScript；Linux 原生依赖沿用同一源码版本、同一锁文件的官方镜像。已对比运行时 Next.js 16.4.1、React 19.2.3，并在独立临时容器完成启动和中文登录页检查后上线。源码依赖或锁文件改变后，应使用完整 Linux 构建，不能继续假定旧基础镜像依赖匹配。

```sh
# 在项目根目录；要求 Node/pnpm 版本匹配 packageManager
pnpm install --frozen-lockfile
pnpm exec vitest run packages/shared/anthropicInference.test.ts packages/shared/inference.test.ts
pnpm --dir apps/web build
pnpm --dir apps/workers build
python3 deploy/singapore/package-overlay.py
```

`package-overlay.py` 生成 Git 忽略的 `.codex/keeply-overlay.tar.gz`，只打包 Web 编译产物、worker JS 和 Dockerfile；保留指向 Linux 镜像依赖的符号链接，不携带本机 `.node` 二进制，并扫描配置中的密钥值防止误打包。

服务器构建目录：`/opt/karakeep/releases/20261029-keeply`，镜像：`keeply:20261029-minimax`。最终镜像 config ID：`sha256:891f48b954c3026d7e7dad95586e24a414a1eae2a571ca916066671488655291`。构建目录必须用最新打包内容更新后再执行：

```sh
sudo docker build -t keeply:20261029-minimax /opt/karakeep/releases/20261029-keeply
sudo docker compose --project-directory /opt/karakeep up -d --no-deps app
```

启动、停止、数据目录和端口保持原部署约定，见 `SINGAPORE-DEPLOYMENT-2026-10-29.md`。本次发布前停止新栈，生成一致性备份 `/opt/karakeep/backups/before-keeply-minimax-20261029.tgz`（0600），包含原 Compose、应用配置、数据库、文件和搜索索引。

仅回退本次代码及模型配置时：

```sh
sudo docker compose --project-directory /opt/karakeep stop app
sudo tar -xzf /opt/karakeep/backups/before-keeply-minimax-20261029.tgz \
  -C /opt/karakeep compose.yml .env
sudo docker compose --project-directory /opt/karakeep up -d
```

本次没有数据库 schema 变化。上述回退保留新增收藏及摘要，不恢复旧数据；仅在确实需要恢复数据时另行操作完整备份。

## 验证方法与结果

- MiniMax 连通性：通过，对指定模型的真实 Messages 请求返回 200。
- 适配器及现有 OpenAI 回归：10 项单元测试通过，覆盖请求参数、文本/推理块分离、HTTP 失败、空响应、截断响应、取消及不支持的图片/embedding 请求。
- Web、worker、shared 类型检查：通过；生产构建通过。worker 构建保留上游 Redis 可选 xxhash 模块警告；当前部署不使用 Redis，启动及实际推理均通过。
- 简体中文翻译报告：0 missing、0 outdated、0 obsolete。
- 真实自动标签：新建 `AI 验收：知识收藏`，生成“收好、知识管理、网页收藏、文档智能、信息检索”等标签；原有 `人工保留` 标签仍为 human。
- 真实手动摘要：RFC 8259 网页生成 369 字中文摘要，重新读取确认已存储。
- 图片收藏不调用文本模型；没有启用 embeddings。
- 最终浏览器 4 项检查通过（中文登录、中文品牌仪表盘、中文 AI 设置、无 pageerror），并目视核验了中文日期与“列表”标题。
- 最终 API 回归 12 项通过，包括登录、注册禁用、收藏/标签/列表持久化、正文读取、搜索和原文件下载。
- 定向 lint 无错误，保留两项原有逻辑告警：渲染时使用当前日期、列表 effect 同步状态。
- AI 活动期间一次采样合计约 762 MiB；最终重启和界面/API 回归的三次采样约 551–669 MiB，整机可用内存 2103–2179 MiB。未发现容器 OOM 或自动重启，原应用 HTTPS 200；资源记录 `keeply-final-resources.txt`（同证据目录）。这些是少量样例采样，不代表峰值保证。

真实模型测试证据：`.codex/server-assessment/keeply-ai-results.json`；浏览器结果及截图：`keeply-ui-results.json`、`keeply-dashboard.png`、`keeply-ai-settings.png`（同目录）。

人工复核：刷新页面，查看左上角 Keeply 收好、中文侧栏及日期；打开“AI 验收：知识收藏”查看人工和自动标签；打开 `DEPLOY JSON RFC8259` 查看中文摘要。新建一段中文文字后稍候，确认自动标签出现。已有浏览器若曾明确保存英文偏好，可在设置中的界面语言选择“简体中文”；新浏览器默认中文。
