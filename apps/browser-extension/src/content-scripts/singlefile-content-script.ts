/**
 * Content script for capturing page content using SingleFile
 */

import { getPageData, init } from "single-file-core/single-file.js";

import { addArticleSource, prepareArticleCapture } from "./articleCapture";

declare global {
  interface Window {
    __karakeepSingleFileLoaded__?: boolean;
  }
}

// Re-injecting into a page that already has the script must be a no-op, so
// listeners aren't registered twice.
if (!window.__karakeepSingleFileLoaded__) {
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type === "CAPTURE_PAGE") {
      captureCurrentPage({
        blockImages: message.blockImages === true,
        articleOnly: message.articleOnly !== false,
      })
        .then((html) => sendResponse({ success: true, html }))
        .catch((error) =>
          sendResponse({
            success: false,
            error: error instanceof Error ? error.message : String(error),
          }),
        );
      // Return true to indicate we'll send a response asynchronously
      return true;
    }
  });
  window.__karakeepSingleFileLoaded__ = true;
}

async function captureCurrentPage(opts: {
  blockImages: boolean;
  articleOnly: boolean;
}): Promise<string> {
  const source = { url: location.href, title: document.title };
  const plan = opts.articleOnly ? prepareArticleCapture(document) : undefined;
  try {
    init({});
    const pageData = await getPageData(
      {
        removeHiddenElements: true,
        removedElementsSelector: plan?.removedElementsSelector,
        removeUnusedStyles: true,
        removeUnusedFonts: true,
        compressHTML: true,
        blockScripts: true,
        blockImages: opts.blockImages,
        // When images are blocked, SingleFile wipes `srcset` and skips `src`
        // rewriting. Ask it to stash the originals on `data-sf-original-*` so
        // we can restore them below.
        saveOriginalURLs: opts.blockImages,
        removeFrames: true,
        removeAlternativeFonts: true,
        removeAlternativeMedias: true,
        removeAlternativeImages: true,
        groupDuplicateImages: true,
        maxResourceSizeEnabled: true,
        maxResourceSize: 10,
        networkTimeout: 15_000,
      },
      {},
      document,
      window,
    );
    const html = opts.blockImages
      ? restoreOriginalImageUrls(pageData.content)
      : pageData.content;
    return opts.articleOnly ? addArticleSource(html, source) : html;
  } finally {
    plan?.cleanup();
  }
}

function restoreOriginalImageUrls(html: string): string {
  // Move `data-sf-original-src` / `data-sf-original-srcset` back onto the
  // element as `src` / `srcset` so images load from origin in the viewer.
  const doc = new DOMParser().parseFromString(html, "text/html");
  for (const attr of ["src", "srcset"] as const) {
    const dataAttr = `data-sf-original-${attr}`;
    doc.querySelectorAll(`[${dataAttr}]`).forEach((el) => {
      const v = el.getAttribute(dataAttr);
      if (v) el.setAttribute(attr, v);
      el.removeAttribute(dataAttr);
    });
  }
  return "<!DOCTYPE html>\n" + doc.documentElement.outerHTML;
}
