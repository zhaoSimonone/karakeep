# keeply.收好 1.2.16：只保存文章正文

## 变化

新增“仅保存文章正文”设置，默认开启，旧扩展配置也会获得这个默认值。既有服务器、账号、是否保存图片等设置保留。

抓取时先选择文章主体，再在 SingleFile 自己的快照副本中删除正文之外的导航、侧栏、页脚，以及识别出的评论区、分享操作和相关推荐。删除发生在图片资源打包之前，避免下载并嵌入不需要的头像或推广图。原网页只临时添加标记属性，并在完成或失败时清理；不会删除用户浏览器里的正文、评论或导航。

正文识别支持 article/main 等语义结构以及常见 Markdown、富文本编辑器和 article-content/article-body 容器。保留正文图片、图注、代码、表格、列表和引用；快照补充标题及原文来源。过滤代码中的 comment 标记时不会把代码注释当成网站评论。

正文候选不明确、主要是链接列表、没有可识别文章边界或存在多个相近长度的独立文章时，明确提示关闭“仅保存文章正文”后保存整页，不自动删减或自动改存链接。此模式是保守的 DOM 结构识别，不保证覆盖所有网站。

## 验收

- 28 项单元测试通过，包括原先保存/上传测试、配置兼容、正文边界、评论剔除、内容保留、隐藏重复容器、列表页拒绝和清理标记。
- TypeScript 和生产构建通过；oxlint 无错误，保留 4 项原有 React effect 警告。
- 独立 Chrome for Testing，合成页面加入 3 张大型导航/侧栏/评论图：
  - 整页快照：33,598,250 字节。
  - 正文快照：44,612 字节，体积减少 99.87%。
  - 正文模式下，抓取阶段对被删除的大图请求数为 0。
  - 保留正文末尾、正文图片、图注、表格、代码、标题及来源。
  - 原网页的文字和评论图仍在，临时标记已清理。
  - 关闭正文模式可恢复整页保存；关闭图片保存仍保留正文和图片来源 URL。
  - 多文章页面明确提示回退，关闭正文模式后可抓取整页。
- 正式服务器回归验证通过：登录后合成长文 53,948 字符，末尾完整；快照与图片可下载；重复保存更新同一记录，人工摘要、备注和标签保留。测试收藏、专用标签和临时密钥已清理。

上述缩减比例来自专门构造的测试页面，不代表真实文章一定缩减相同比例。如果正文图片本身就超过 20 MiB，仍可能触发大小限制，需要关闭“同时保存图片”。

没有直接读取用户当前 KStack 文章的 DOM，也没有修改或重存那条真实收藏。该文章的正文识别和图片大小仍需用户重新加载扩展后验证。

## 更新及使用

1. 打开 `chrome://extensions`，重新加载原目录中的 keeply.收好，确认版本 **1.2.16**。
2. 刷新文章页面，登录、展开全文并滚动到底部。
3. 在扩展设置中保持“保存浏览器中的全文”和“仅保存文章正文”开启；可以先保留“同时保存图片”。
4. 再次打开扩展收藏，保持弹窗打开。已有网址会更新同一收藏的正文快照。
5. 在网页端检查正文末尾和重要图表；若正文识别失败或有遗漏，关闭“仅保存文章正文”后重新保存。

产物目录：`/Users/simon/Desktop/dev/code/karakeep/apps/browser-extension/dist`。
备用 ZIP：`/Users/simon/Desktop/dev/code/karakeep/.codex/extension-check/keeply-1.2.16-chrome.zip`。
浏览器测试结果：`.codex/extension-check/article-results.json`；截图及合成快照也在同一忽略目录。

## 开发复验

新增测试开发依赖 `happy-dom ^20.11.15`，复用仓库已存在并锁定的版本，运行时没有新增外部依赖。

```bash
cd /Users/simon/Desktop/dev/code/karakeep
export PATH="$PWD/.codex/local-eval/node-v24.22.1-darwin-arm64/bin:$PWD/.codex/local-eval/tooling/node_modules/.bin:$PATH"
pnpm typecheck --filter=@karakeep/browser-extension
pnpm test --filter=@karakeep/browser-extension
pnpm --filter @karakeep/browser-extension build
```

本次实际调用现有 `node_modules/.bin` 下的 TypeScript、Vitest、Oxfmt、oxlint 和 Vite 完成检查与构建，没有重装整个仓库，也无需部署服务器。
