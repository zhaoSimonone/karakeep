import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("./settings", () => ({
  getPluginSettings: async () => ({
    address: "https://keeply.facezero.online",
    apiKey: "test-only",
    customHeaders: {},
  }),
}));
import { capturePageWithSingleFile, uploadSingleFileAsset } from "./singlefile";
const sendMessage = vi.fn();
const executeScript = vi.fn();
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("chrome", {
    tabs: { sendMessage },
    scripting: { executeScript },
    runtime: {
      getManifest: () => ({
        content_scripts: [{ js: ["singlefile-content-script.js"] }],
      }),
    },
  });
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
describe("capture and upload failures", () => {
  it("injects on demand and returns the full snapshot", async () => {
    sendMessage
      .mockRejectedValueOnce(new Error("Could not establish connection"))
      .mockResolvedValueOnce({ success: true, html: "<html>END</html>" });
    await expect(
      capturePageWithSingleFile(1, { includeImages: true }),
    ).resolves.toContain("END");
    expect(executeScript).toHaveBeenCalledOnce();
  });
  it("reports missing page permission instead of silently saving a URL", async () => {
    sendMessage.mockRejectedValueOnce(
      new Error("Receiving end does not exist"),
    );
    executeScript.mockRejectedValueOnce(new Error("Cannot access contents"));
    await expect(
      capturePageWithSingleFile(1, { includeImages: true }),
    ).rejects.toThrow("无法读取当前网页");
  });
  it("rejects empty captures", async () => {
    sendMessage.mockResolvedValueOnce({ success: true, html: "" });
    await expect(
      capturePageWithSingleFile(1, { includeImages: false }),
    ).rejects.toThrow("没有获取到");
  });
  it("clears the timeout after a successful capture", async () => {
    vi.useFakeTimers();
    sendMessage.mockResolvedValueOnce({
      success: true,
      html: "<html>OK</html>",
    });
    await capturePageWithSingleFile(1, { includeImages: false });
    expect(vi.getTimerCount()).toBe(0);
  });
  it("rejects oversized snapshots before uploading", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    await expect(
      uploadSingleFileAsset("a".repeat(20 * 1024 * 1024 + 1)),
    ).rejects.toThrow("20 MB");
    expect(fetch).not.toHaveBeenCalled();
  });
  it("shows actionable 413 errors without exposing server response bodies", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(new Response("private debug body", { status: 413 })),
    );
    await expect(uploadSingleFileAsset("<html>test</html>")).rejects.toThrow(
      "关闭图片",
    );
  });
  it("rejects an upload without an asset ID", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({})));
    await expect(uploadSingleFileAsset("<html>test</html>")).rejects.toThrow(
      "快照编号",
    );
  });
});
