# 浏览器快照的阅读正文恢复

## 故障与原因

收藏 `e0x2zcpr2w4jy2bbjf2pzabx` 的原始 HTML 快照已保存，大小
7,729,136 字节；阅读器却显示内容不可用。数据库显示抓取失败、正文附件为空。
后台日志确认 HTML 解析子进程达到 256 MB 堆内存限制后退出。
提高到 512 MB 后重试仍然失败。

快照中内嵌图片数据约 7.3 MB。解析过程中 DOM 构建、正文提取和清洗
需要额外临时内存；快照文件大小不能直接视作解析内存需求。

## 已部署的调整

`deploy/singapore/compose.yml` 与服务器 `/opt/karakeep/compose.yml`：

- `CRAWLER_PARSER_MEM_LIMIT_MB`：256 → 1024。
- app 容器 `mem_limit`：1024m → 1536m。
- app 容器 `memswap_limit`：1280m → 1792m（内存与 swap 合计上限）。

应用镜像未变，原始附件保留。通过现有低优先级抓取队列重新处理这条收藏，
后台使用已上传快照，无需服务器访问内网原网页。

## 验证结果

2026-10-29 22:10（北京时间）任务 138 完成：

- 日志：`Parse subprocess completed successfully`、`Completed successfully`。
- 正文附件生成成功，大小 2,749,773 字节。
- 数据库：`crawlStatus=success`、`readerViewStatus=readable`。
- 正文附件 ID：`4664cd0b-4b80-4dfe-8611-50cb657f03f2`。
- Chrome 打开该收藏，阅读器可见文章段落、图片元素和表格，正文至 4.4 节。
  未与原网页逐字比对完整性。
- 应用健康检查正常，容器 `OOMKilled=false`、自动重启次数 0。

处理后一次采样：app 383.2 MiB、Chrome 175.2 MiB、Meilisearch 72.23 MiB；
宿主机可用内存 2228 MiB，swap 已用 438 MiB。该采样不是处理峰值。
总容器内存预算现为 2176 MiB；仅验证了这条收藏的恢复，
不代表同时解析多篇大型快照或更大文件的容量保证。

正文恢复与 AI 摘要是不同任务。本次页面仍显示“还没有摘要”，可使用页面
“使用AI总结”按钮生成摘要。
