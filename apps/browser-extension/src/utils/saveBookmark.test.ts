import { BookmarkTypes } from "@karakeep/shared/types/bookmarks";

import { beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({
  bookmarks: {
    createBookmark: { mutate: vi.fn() },
    recrawlBookmark: { mutate: vi.fn() },
    getBookmark: { query: vi.fn() },
  },
  assets: {
    replaceAsset: { mutate: vi.fn() },
    attachAsset: { mutate: vi.fn() },
  },
}));
vi.mock("./trpc", () => ({
  initializeClients: vi.fn(),
  getApiClient: async () => api,
}));
import { saveBookmarkWithArchive } from "./saveBookmark";

const request = {
  type: BookmarkTypes.LINK as const,
  url: "https://private.example/article",
  precrawledArchiveId: "new-archive",
};
beforeEach(() => {
  vi.clearAllMocks();
  api.bookmarks.createBookmark.mutate.mockResolvedValue({
    id: "saved",
    alreadyExists: false,
    assets: [],
  });
  api.bookmarks.getBookmark.query.mockResolvedValue({
    assets: [{ id: "new-archive", assetType: "precrawledArchive" }],
  });
  api.bookmarks.recrawlBookmark.mutate.mockResolvedValue(undefined);
});
describe("snapshot save acknowledgement", () => {
  it("verifies the archive on a newly created bookmark", async () => {
    await saveBookmarkWithArchive(request);
    expect(api.bookmarks.getBookmark.query).toHaveBeenCalledWith({
      bookmarkId: "saved",
    });
    expect(api.assets.attachAsset.mutate).not.toHaveBeenCalled();
  });
  it("repairs a previously link-only bookmark and recrawls", async () => {
    api.bookmarks.createBookmark.mutate.mockResolvedValue({
      id: "saved",
      alreadyExists: true,
      assets: [],
    });
    await saveBookmarkWithArchive(request);
    expect(api.assets.attachAsset.mutate).toHaveBeenCalledWith({
      bookmarkId: "saved",
      asset: { id: "new-archive", assetType: "precrawledArchive" },
    });
    expect(api.bookmarks.recrawlBookmark.mutate).toHaveBeenCalledOnce();
  });
  it("replaces the previous snapshot on repeated saves", async () => {
    api.bookmarks.createBookmark.mutate.mockResolvedValue({
      id: "saved",
      alreadyExists: true,
      assets: [{ id: "old", assetType: "precrawledArchive" }],
    });
    await saveBookmarkWithArchive(request);
    expect(api.assets.replaceAsset.mutate).toHaveBeenCalledWith({
      bookmarkId: "saved",
      oldAssetId: "old",
      newAssetId: "new-archive",
    });
  });
  it("does not acknowledge an archive missing from server state", async () => {
    api.bookmarks.getBookmark.query.mockResolvedValue({ assets: [] });
    await expect(saveBookmarkWithArchive(request)).rejects.toThrow("未确认");
  });
  it("surfaces a failed recrawl so the user can retry", async () => {
    api.bookmarks.createBookmark.mutate.mockResolvedValue({
      id: "saved",
      alreadyExists: true,
      assets: [],
    });
    api.bookmarks.recrawlBookmark.mutate.mockRejectedValueOnce(
      new Error("recrawl failed"),
    );
    await expect(saveBookmarkWithArchive(request)).rejects.toThrow(
      "recrawl failed",
    );
  });
  it("does not recrawl or fetch archives for text snippets", async () => {
    await saveBookmarkWithArchive({
      type: BookmarkTypes.TEXT,
      text: "独立摘录",
      sourceUrl: request.url,
    });
    expect(api.bookmarks.getBookmark.query).not.toHaveBeenCalled();
    expect(api.bookmarks.recrawlBookmark.mutate).not.toHaveBeenCalled();
  });
});
