import type { ZNewBookmarkRequest } from "@karakeep/shared/types/bookmarks";

import { BookmarkTypes } from "@karakeep/shared/types/bookmarks";

import { getApiClient, initializeClients } from "./trpc";

/** A duplicate URL must receive its new snapshot before we report success. */
export async function saveBookmarkWithArchive(bookmark: ZNewBookmarkRequest) {
  await initializeClients();
  const api = await getApiClient();
  if (!api) throw new Error("请先登录 keeply.收好。");
  const saved = await api.bookmarks.createBookmark.mutate(bookmark);
  if (bookmark.type === BookmarkTypes.LINK && bookmark.precrawledArchiveId) {
    if (saved.alreadyExists) {
      const previous = saved.assets
        .filter((a) => a.assetType === "precrawledArchive")
        .slice(-1)[0];
      if (previous) {
        await api.assets.replaceAsset.mutate({
          bookmarkId: saved.id,
          oldAssetId: previous.id,
          newAssetId: bookmark.precrawledArchiveId,
        });
      } else {
        await api.assets.attachAsset.mutate({
          bookmarkId: saved.id,
          asset: {
            id: bookmark.precrawledArchiveId,
            assetType: "precrawledArchive",
          },
        });
      }
      await api.bookmarks.recrawlBookmark.mutate({ bookmarkId: saved.id });
    }
    const verified = await api.bookmarks.getBookmark.query({
      bookmarkId: saved.id,
    });
    if (
      !verified.assets.some(
        (a) =>
          a.id === bookmark.precrawledArchiveId &&
          a.assetType === "precrawledArchive",
      )
    ) {
      throw new Error("服务器未确认网页快照保存成功，请重试。");
    }
  }
  return saved;
}
