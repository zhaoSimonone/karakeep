/** Build a conservative article boundary before SingleFile fetches resources. */
const CONTENT_SELECTOR = [
  '[itemprop="articleBody"]',
  ".markdown-body",
  ".markdown",
  ".ProseMirror",
  ".tiptap",
  ".ql-editor",
  ".rich-text",
  '[class*="article-content"]',
  '[class*="articleContent"]',
  '[class*="article-body"]',
  '[class*="articleBody"]',
  '[class*="post-content"]',
  '[class*="postContent"]',
  '[class*="entry-content"]',
  '[id="article-content"]',
  '[id="article-body"]',
].join(",");
const ARTICLE_SELECTOR = 'article,[role="article"]';
const MAIN_SELECTOR =
  'main,[role="main"],[class*="article-detail"],[class*="articleDetail"]';
const NOISE_SELECTOR = [
  "nav",
  '[role="navigation"]',
  '[role="dialog"]',
  '[data-testid="comments"]',
  '[data-testid="comment-list"]',
  '[aria-label="评论区"]',
  '[aria-label="评论列表"]',
].join(",");
const NOISE_IDENTITY =
  /(?:^|[\s_-])(?:comments?|replies|comment-list|comment-section|comment-area|comment-container|comment-wrapper|comment-box|comment-thread|related-posts|related-articles|recommendations|share-buttons|social-share|article-actions|article-toolbar|table-of-contents|sidebar|site-header|site-footer)(?:$|[\s_-])/i;
const MIN_TEXT = 200;

function identity(element: Element) {
  return `${element.id} ${element.getAttribute("class") ?? ""}`.replace(
    /([a-z])([A-Z])/g,
    "$1-$2",
  );
}

function isNoise(element: Element) {
  if (element.closest("pre,code,blockquote,figure")) return false;
  if (element.matches(NOISE_SELECTOR)) return true;
  // Do not match prose mentioning comments, code tokens or headings named "Comments".
  return (
    element.matches("div,section,aside,ul,ol,form,header,footer") &&
    NOISE_IDENTITY.test(identity(element))
  );
}

function isExcludedCandidate(element: Element) {
  let current: Element | null = element;
  while (current && current.tagName !== "BODY") {
    if (isNoise(current) || current.matches('[hidden],[aria-hidden="true"]'))
      return true;
    const style = current.ownerDocument.defaultView?.getComputedStyle(current);
    if (style?.display === "none" || style?.visibility === "hidden")
      return true;
    current = current.parentElement;
  }
  return false;
}

function cleanTextLength(element: Element) {
  const clone = element.cloneNode(true) as Element;
  clone
    .querySelectorAll("script,style,template,noscript")
    .forEach((node) => node.remove());
  clone.querySelectorAll("*").forEach((node) => {
    if (isNoise(node)) node.remove();
  });
  const text = (clone.textContent ?? "").replace(/\s+/g, "").length;
  const linkText = [...clone.querySelectorAll("a")].reduce(
    (n, a) => n + (a.textContent ?? "").replace(/\s+/g, "").length,
    0,
  );
  return linkText > text * 0.5 ? 0 : text;
}

export function findArticleRoot(doc: Document): Element | null {
  for (const selector of [CONTENT_SELECTOR, ARTICLE_SELECTOR, MAIN_SELECTOR]) {
    const candidates = [...doc.querySelectorAll(selector)]
      .filter((element) => !isExcludedCandidate(element))
      .map((element) => ({ element, length: cleanTextLength(element) }))
      .filter((candidate) => candidate.length >= MIN_TEXT)
      .sort((a, b) => b.length - a.length);
    const best = candidates[0];
    if (!best) continue;
    // A feed with several substantial articles is not a single article.
    if (
      candidates.some(
        (candidate) =>
          candidate !== best &&
          !best.element.contains(candidate.element) &&
          !candidate.element.contains(best.element) &&
          candidate.length >= best.length * 0.6,
      )
    )
      return null;
    const articles = [
      ...best.element.querySelectorAll(ARTICLE_SELECTOR),
    ].filter(
      (element) =>
        !isExcludedCandidate(element) && cleanTextLength(element) >= MIN_TEXT,
    );
    if (
      articles.some((a, i) =>
        articles.slice(i + 1).some((b) => !a.contains(b) && !b.contains(a)),
      )
    )
      return null;
    return best.element;
  }
  return null;
}

export function prepareArticleCapture(doc: Document) {
  const root = findArticleRoot(doc);
  if (!root) {
    throw new Error(
      "无法可靠识别文章主体。请在设置中关闭“仅保存文章正文”后保存整页，或选中文字保存摘录。",
    );
  }
  const excluded = new Set<Element>();
  // Mark sibling branches along the ancestor path, keeping layout ancestors.
  let branch: Element = root;
  while (branch.parentElement && branch !== doc.body) {
    for (const sibling of branch.parentElement.children) {
      if (sibling !== branch) excluded.add(sibling);
    }
    branch = branch.parentElement;
  }
  root.querySelectorAll("*").forEach((element) => {
    if (isNoise(element)) excluded.add(element);
  });
  // Only attributes are changed in the live DOM. SingleFile removes the marked
  // nodes from its own copy BEFORE image/style resource fetching.
  const attribute = `data-keeply-exclude-${crypto.randomUUID()}`;
  excluded.forEach((element) => element.setAttribute(attribute, ""));
  return {
    removedElementsSelector: `[${attribute}]`,
    cleanup: () =>
      excluded.forEach((element) => element.removeAttribute(attribute)),
  };
}

export function addArticleSource(
  html: string,
  source: { url: string; title: string },
) {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const header = doc.createElement("header");
  header.setAttribute("data-keeply-source", "");
  header.style.cssText =
    "display:block;padding:16px;margin:0 0 20px;border-bottom:1px solid #ddd;color:#222;background:#fff;font:14px/1.6 system-ui";
  if (!doc.body.querySelector("h1")) {
    const title = doc.createElement("h1");
    title.textContent = source.title;
    header.append(title);
  }
  const link = doc.createElement("a");
  link.href = source.url;
  link.textContent = `原文来源：${source.url}`;
  header.append(link);
  doc.body.prepend(header);
  return "<!DOCTYPE html>\n" + doc.documentElement.outerHTML;
}
