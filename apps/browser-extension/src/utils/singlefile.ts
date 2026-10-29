/**
 * Utilities for SingleFile integration
 */

import { getPluginSettings } from "./settings";

const CAPTURE_TIMEOUT_MS = 60_000;

/**
 * Capture the current page using SingleFile
 */
export async function capturePageWithSingleFile(
  tabId: number,
  opts: { includeImages: boolean; articleOnly?: boolean },
): Promise<string> {
  const blockImages = !opts.includeImages;
  let response;
  try {
    response = await sendCaptureMessage(
      tabId,
      blockImages,
      opts.articleOnly !== false,
    );
  } catch (e) {
    // Content script not yet present in the tab (e.g. page loaded before the
    // extension was installed or the browser was restarted). Inject on demand
    // and retry.
    const msg = e instanceof Error ? e.message : String(e);
    if (
      !/Could not establish connection|Receiving end does not exist/i.test(msg)
    ) {
      throw e;
    }
    await injectSingleFileContentScript(tabId);
    response = await sendCaptureMessage(
      tabId,
      blockImages,
      opts.articleOnly !== false,
    );
  }

  if (
    !response?.success ||
    typeof response.html !== "string" ||
    !response.html.trim()
  ) {
    throw new Error(
      response?.error
        ? `网页抓取失败：${response.error}`
        : "没有获取到网页正文，请刷新文章页面后重试。",
    );
  }

  return response.html;
}

async function sendCaptureMessage(
  tabId: number,
  blockImages: boolean,
  articleOnly: boolean,
): Promise<{ success: boolean; html: string; error?: string }> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      chrome.tabs.sendMessage(tabId, {
        type: "CAPTURE_PAGE",
        blockImages,
        articleOnly,
      }),
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error("抓取超过 60 秒，请关闭图片保存后重试。")),
          CAPTURE_TIMEOUT_MS,
        );
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

async function injectSingleFileContentScript(tabId: number): Promise<void> {
  const contentScripts = chrome.runtime.getManifest().content_scripts;
  const files = contentScripts?.find((cs) =>
    cs.js?.some((f) => f.includes("singlefile-content-script")),
  )?.js;
  if (!files || files.length === 0) {
    throw new Error("扩展的抓取脚本缺失，请重新加载扩展。");
  }
  // The content script is built as a standalone IIFE (see `standaloneFiles` in
  // vite.config.ts), so it registers its CAPTURE_PAGE listener synchronously
  // and the listener exists once `executeScript` resolves.
  try {
    await chrome.scripting.executeScript({ target: { tabId }, files });
  } catch {
    throw new Error(
      "无法读取当前网页。请刷新文章页面，并点击工具栏中的收好扩展；必要时在扩展详情中允许访问该网站。",
    );
  }
}

/**
 * Upload the captured HTML as an asset and return the asset id.
 */
export async function uploadSingleFileAsset(
  html: string,
  title?: string,
): Promise<string> {
  const settings = await getPluginSettings();

  const blob = new Blob([html], { type: "text/html" });
  if (blob.size > 20 * 1024 * 1024) {
    throw new Error("网页快照超过 20 MB，请关闭“同时保存图片”后重试。");
  }
  const filename = sanitizeFilename(title || "page") + ".html";
  const file = new File([blob], filename, { type: "text/html" });

  const formData = new FormData();
  formData.append("file", file);

  const apiUrl = `${settings.address}/api/assets`;

  const headers: HeadersInit = {
    Authorization: `Bearer ${settings.apiKey}`,
  };

  if (settings.customHeaders) {
    Object.entries(settings.customHeaders).forEach(([key, value]) => {
      headers[key] = value;
    });
  }

  const response = await fetch(apiUrl, {
    method: "POST",
    headers,
    body: formData,
    signal: AbortSignal.timeout(90_000),
  });

  if (!response.ok) {
    if (response.status === 413)
      throw new Error("网页快照过大，请关闭图片保存后重试。");
    if (response.status === 401 || response.status === 403)
      throw new Error("上传未获授权，请重新登录收好后重试。");
    throw new Error(`网页快照上传失败（HTTP ${response.status}），请重试。`);
  }

  const { assetId } = (await response.json()) as { assetId: string };
  if (!assetId || typeof assetId !== "string")
    throw new Error("服务器未返回有效的快照编号，请重试。");
  return assetId;
}

function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9-_\s]/g, "_")
    .replace(/\s+/g, "_")
    .substring(0, 100);
}
