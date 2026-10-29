// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from "vitest";

import {
  addArticleSource,
  findArticleRoot,
  prepareArticleCapture,
} from "./articleCapture";

const prose =
  "<p>文档正文介绍知识架构、网页保存和数据检索。文章中的技术细节必须完整保留。</p>".repeat(
    20,
  );
function capturedBody() {
  const plan = prepareArticleCapture(document);
  const copy = document.cloneNode(true) as Document;
  copy
    .querySelectorAll(plan.removedElementsSelector)
    .forEach((node) => node.remove());
  plan.cleanup();
  return copy.body;
}
beforeEach(() => {
  document.body.innerHTML = "";
});
describe("article boundaries", () => {
  it("removes surrounding navigation, sidebars, footer and nested comments", () => {
    document.body.innerHTML = `<nav>导航</nav><aside>侧栏</aside><main><article><h1>标题</h1>${prose}<p>末尾标记</p><div class="commentList"><img src="huge-avatar.png">无关评论</div></article><footer>页脚</footer></main>`;
    const original = document.body.innerHTML;
    const body = capturedBody();
    expect(body.textContent).toContain("末尾标记");
    expect(body.textContent).toContain("标题");
    for (const text of ["导航", "侧栏", "无关评论", "页脚"])
      expect(body.textContent).not.toContain(text);
    expect(body.querySelector("img")).toBeNull();
    expect(document.body.innerHTML).toBe(original);
  });
  it("keeps technical content, article images, tables, lists, code and references", () => {
    document.body.innerHTML = `<article>${prose}<h2 id="comments">Comments</h2><p class="comment">正文讨论评论系统</p><pre><code><span class="comment">// comment</span></code></pre><figure><img src="diagram.png"><figcaption>图注</figcaption></figure><table><tbody><tr><td>表格</td></tr></tbody></table><ul><li>清单</li></ul><aside>正文注释</aside><blockquote>引用</blockquote><section id="references">参考文献</section></article>`;
    const body = capturedBody();
    expect(body.querySelector("img")?.getAttribute("src")).toBe("diagram.png");
    for (const text of [
      "Comments",
      "正文讨论评论系统",
      "// comment",
      "图注",
      "表格",
      "清单",
      "正文注释",
      "引用",
      "参考文献",
    ])
      expect(body.textContent).toContain(text);
  });
  it("recognizes a markdown body inside a generic SPA wrapper", () => {
    document.body.innerHTML = `<div id="app"><div class="sidebar">菜单</div><div class="articleContent_ab12"><div class="markdown-body">${prose}<p>正文结尾</p></div></div><section class="comments">${prose}评论结尾</section></div>`;
    expect(findArticleRoot(document)?.className).toBe("articleContent_ab12");
    const body = capturedBody();
    expect(body.textContent).toContain("正文结尾");
    expect(body.textContent).not.toContain("评论结尾");
  });
  it("does not select a long article-like container inside the comments", () => {
    document.body.innerHTML = `<article>${prose}<p>真正正文</p></article><div class="comment-list"><div class="markdown-body">${prose.repeat(3)}评论</div></div>`;
    expect(capturedBody().textContent).toContain("真正正文");
    expect(capturedBody().textContent).not.toContain("评论");
  });
  it("refuses ambiguous feeds instead of discarding other articles", () => {
    document.body.innerHTML = `<main><article>${prose}</article><article>${prose}</article></main>`;
    expect(findArticleRoot(document)).toBeNull();
    expect(() => prepareArticleCapture(document)).toThrow(
      "关闭“仅保存文章正文”",
    );
  });
  it("refuses link lists and missing article boundaries", () => {
    document.body.innerHTML = `<main><a>${prose}</a></main>`;
    expect(findArticleRoot(document)).toBeNull();
    document.body.innerHTML = `<div>${prose}</div>`;
    expect(findArticleRoot(document)).toBeNull();
  });
  it("ignores hidden duplicate article containers", () => {
    document.body.innerHTML = `<div style="display:none"><div class="markdown-body">${prose.repeat(3)}隐藏版本</div></div><article>${prose}可见正文</article>`;
    const body = capturedBody();
    expect(body.textContent).toContain("可见正文");
    expect(body.textContent).not.toContain("隐藏版本");
  });
  it("cleans up temporary attributes even if the caller aborts", () => {
    document.body.innerHTML = `<nav>导航</nav><article>${prose}</article>`;
    const original = document.body.innerHTML;
    const plan = prepareArticleCapture(document);
    expect(document.querySelector(plan.removedElementsSelector)).not.toBeNull();
    plan.cleanup();
    plan.cleanup();
    expect(document.body.innerHTML).toBe(original);
  });
  it("retains source and safely inserts a missing title", () => {
    const html = addArticleSource(
      `<html><head><title>标题</title></head><body><article>${prose}</article></body></html>`,
      {
        url: "https://internal.example/a?x=1&y=2",
        title: "<script>标题</script>",
      },
    );
    const doc = new DOMParser().parseFromString(html, "text/html");
    expect(doc.querySelector("h1")?.textContent).toBe("<script>标题</script>");
    expect(doc.querySelector("script")).toBeNull();
    expect(
      doc.querySelector("[data-keeply-source] a")?.getAttribute("href"),
    ).toBe("https://internal.example/a?x=1&y=2");
  });
});
