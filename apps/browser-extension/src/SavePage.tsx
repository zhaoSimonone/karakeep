import { useEffect, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { BookmarkPlus, Link2 } from "lucide-react";
import { Navigate } from "react-router-dom";

import {
  BookmarkTypes,
  ZNewBookmarkRequest,
  zNewBookmarkRequestSchema,
} from "@karakeep/shared/types/bookmarks";

import { NEW_BOOKMARK_REQUEST_KEY_NAME } from "./background/protocol";
import { ErrorCallout } from "./components/ErrorCallout";
import type { PagePreview } from "./components/CapturePreview";
import { CapturePreview } from "./components/CapturePreview";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Textarea } from "./components/ui/textarea";
import { saveBookmarkWithArchive } from "./utils/saveBookmark";
import usePluginSettings from "./utils/settings";
import {
  capturePageWithSingleFile,
  uploadSingleFileAsset,
} from "./utils/singlefile";
import { MessageType } from "./utils/type";
import { isHttpUrl } from "./utils/url";

export default function SavePage() {
  const { settings, isPending: isSettingsLoaded } = usePluginSettings();
  const [preview, setPreview] = useState<PagePreview>();
  const [error, setError] = useState<string | undefined>(undefined);
  const [isCapturing, setIsCapturing] = useState(false);
  const savingRef = useRef(false);
  const [savedSnapshot, setSavedSnapshot] = useState(false);
  const [pendingBookmark, setPendingBookmark] =
    useState<ZNewBookmarkRequest | null>(null);
  const [hasCheckedRequest, setHasCheckedRequest] = useState(false);
  const [currentTabId, setCurrentTabId] = useState<number | undefined>(
    undefined,
  );
  const [currentTabUrl, setCurrentTabUrl] = useState<string | undefined>(
    undefined,
  );

  const {
    data,
    mutateAsync: createBookmark,
    status,
  } = useMutation({
    mutationFn: saveBookmarkWithArchive,
    onError: (e) => {
      setError(e.message);
    },
    onSuccess: async () => {
      // After successful creation, update badge cache and notify background
      try {
        const [currentTab] = await chrome.tabs.query({
          active: true,
          lastFocusedWindow: true,
        });
        await chrome.runtime.sendMessage({
          type: MessageType.BOOKMARK_REFRESH_BADGE,
          currentTab: currentTab,
        });
      } catch {
        // Badge refresh is best-effort — on Firefox Android the background
        // script may not be reachable from the popup context.
      }
    },
  });

  useEffect(() => {
    async function getNewBookmarkRequestFromBackgroundScriptIfAny(): Promise<ZNewBookmarkRequest | null> {
      const { [NEW_BOOKMARK_REQUEST_KEY_NAME]: req } =
        await chrome.storage.session.get(NEW_BOOKMARK_REQUEST_KEY_NAME);
      if (!req) {
        return null;
      }
      // Delete the request immediately to avoid issues with lingering values
      await chrome.storage.session.remove(NEW_BOOKMARK_REQUEST_KEY_NAME);
      return zNewBookmarkRequestSchema.parse(req);
    }

    async function loadBookmarkRequest() {
      const [currentTab] = await chrome.tabs.query({
        active: true,
        lastFocusedWindow: true,
      });
      setCurrentTabId(currentTab?.id);
      setCurrentTabUrl(currentTab?.url);

      let newBookmarkRequest =
        await getNewBookmarkRequestFromBackgroundScriptIfAny();
      if (!newBookmarkRequest) {
        if (!currentTab?.url) {
          setError("当前标签页没有可收藏的网址。");
          setHasCheckedRequest(true);
          return;
        }

        if (!isHttpUrl(currentTab.url)) {
          setError("只能收藏 http:// 或 https:// 网页，请回到文章页面后重试。");
          setHasCheckedRequest(true);
          return;
        }

        newBookmarkRequest = {
          type: BookmarkTypes.LINK,
          title: currentTab.title,
          url: currentTab.url,
          source: "extension",
        };
      }

      setPreview({
        title: newBookmarkRequest.title ?? currentTab?.title,
        url:
          newBookmarkRequest.type === BookmarkTypes.LINK
            ? newBookmarkRequest.url
            : undefined,
      });
      if (
        newBookmarkRequest.type === BookmarkTypes.LINK &&
        newBookmarkRequest.url === currentTab?.url &&
        currentTab.windowId !== undefined
      ) {
        // Preview stays in popup memory and is never uploaded or persisted.
        chrome.tabs
          .captureVisibleTab(currentTab.windowId, {
            format: "jpeg",
            quality: 45,
          })
          .then(async (image) => {
            const [visible] = await chrome.tabs.query({
              active: true,
              windowId: currentTab.windowId,
            });
            if (visible?.id === currentTab.id && visible.url === currentTab.url)
              setPreview({
                image,
                title: currentTab.title,
                url: currentTab.url,
              });
          })
          .catch(() => {
            /* Preview failure must not block saving. */
          });
      }
      setPendingBookmark(newBookmarkRequest);
      setHasCheckedRequest(true);
    }

    if (!isSettingsLoaded) return;
    loadBookmarkRequest().catch(() =>
      setError("无法读取当前标签页，请刷新原网页后重新打开扩展。"),
    );
  }, [isSettingsLoaded]);

  const saveBookmark = async (
    bookmark: ZNewBookmarkRequest,
    linkOnly = false,
  ) => {
    if (savingRef.current) return;
    savingRef.current = true;
    setError(undefined);
    try {
      let finalBookmark = bookmark;
      // A right-click on a different link must not attach the current page.
      if (
        !linkOnly &&
        settings.useSingleFile &&
        bookmark.type === BookmarkTypes.LINK &&
        !bookmark.precrawledArchiveId &&
        bookmark.url === currentTabUrl
      ) {
        if (currentTabId === undefined)
          throw new Error("找不到原网页，请回到文章页面重新打开扩展。");
        const before = await chrome.tabs.get(currentTabId);
        if (before.url !== bookmark.url)
          throw new Error("原网页已跳转，请重新打开扩展后收藏。");
        setIsCapturing(true);
        // activeTab authorizes capture after a toolbar/menu/shortcut click.
        // Requiring <all_urls> here incorrectly skips valid per-tab access.
        const html = await capturePageWithSingleFile(currentTabId, {
          includeImages: settings.singleFileIncludeImages,
          articleOnly: settings.singleFileArticleOnly,
        });
        if ((await chrome.tabs.get(currentTabId)).url !== bookmark.url)
          throw new Error("抓取期间网页发生跳转，请重新打开扩展后收藏。");
        const precrawledArchiveId = await uploadSingleFileAsset(
          html,
          bookmark.title ?? undefined,
        );
        finalBookmark = { ...bookmark, precrawledArchiveId };
      }
      setIsCapturing(false);
      setSavedSnapshot(
        finalBookmark.type === BookmarkTypes.LINK &&
          !!finalBookmark.precrawledArchiveId,
      );
      await createBookmark({
        ...finalBookmark,
        source: finalBookmark.source || "extension",
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : "保存失败，请重试。";
      setError(
        /fetch|NetworkError/i.test(message)
          ? "连接服务器失败，请检查网络后重试。"
          : /timeout|aborted/i.test(message)
            ? "操作超时，请关闭图片保存后重试。"
            : message,
      );
    } finally {
      setIsCapturing(false);
      savingRef.current = false;
    }
  };

  // Auto-save when settings are loaded and we have a pending bookmark
  useEffect(() => {
    if (
      hasCheckedRequest &&
      pendingBookmark &&
      settings.autoSave &&
      status === "idle" &&
      !isCapturing &&
      !error
    ) {
      saveBookmark(pendingBookmark);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    hasCheckedRequest,
    pendingBookmark,
    settings.autoSave,
    status,
    isCapturing,
    error,
  ]);

  const handleManualSave = () => {
    if (pendingBookmark) {
      saveBookmark(pendingBookmark);
    }
  };

  if (error) {
    return (
      <div className="flex flex-col gap-3">
        <ErrorCallout title="收藏未完成">{error}</ErrorCallout>
        <p className="text-xs text-muted-foreground">
          未确认正文保存成功。请保持原网页打开，刷新文章后重试；图片较多时可在设置中关闭“同时保存图片”。
        </p>
        {pendingBookmark && (
          <Button onClick={() => saveBookmark(pendingBookmark)}>
            重试保存
          </Button>
        )}
        {pendingBookmark?.type === BookmarkTypes.LINK && (
          <Button
            variant="outline"
            onClick={() => saveBookmark(pendingBookmark, true)}
          >
            仅保存链接（不含正文）
          </Button>
        )}
      </div>
    );
  }

  if (isCapturing) {
    return (
      <CapturePreview
        preview={preview}
        status="正在收好这篇文章…"
        detail="正在提取并上传正文，请保持窗口打开。"
      />
    );
  }

  switch (status) {
    case "error": {
      return <ErrorCallout title="收藏失败">{error}</ErrorCallout>;
    }
    case "success": {
      return (
        <Navigate
          to={`/bookmark/${data.id}`}
          state={{ savedSnapshot, preview }}
        />
      );
    }
    case "pending": {
      return (
        <CapturePreview
          preview={preview}
          status="正在确认保存…"
          detail="保存成功后，即可打开阅读。"
        />
      );
    }
    case "idle": {
      // Show confirmation UI when autoSave is disabled
      if (!settings.autoSave && pendingBookmark && hasCheckedRequest) {
        return (
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              handleManualSave();
            }}
          >
            <h2 className="text-base font-semibold">收藏到 keeply.收好</h2>
            {pendingBookmark.type === BookmarkTypes.LINK && (
              <div className="flex flex-col gap-1.5">
                <label htmlFor="bookmark-title" className="text-sm font-medium">
                  标题
                </label>
                <Input
                  id="bookmark-title"
                  value={pendingBookmark.title ?? ""}
                  onChange={(e) =>
                    setPendingBookmark((prev) =>
                      prev ? { ...prev, title: e.target.value } : prev,
                    )
                  }
                  placeholder="无标题"
                />
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Link2 className="size-3.5 shrink-0" />
                  <span className="truncate">{pendingBookmark.url}</span>
                </p>
              </div>
            )}
            {pendingBookmark.type === BookmarkTypes.TEXT && (
              <div className="flex flex-col gap-1.5">
                <span className="text-sm font-medium">文字片段</span>
                <p className="line-clamp-4 whitespace-pre-wrap rounded-md border bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
                  {pendingBookmark.text}
                </p>
              </div>
            )}
            {pendingBookmark.type === BookmarkTypes.ASSET && (
              <div className="flex flex-col gap-1.5">
                <label htmlFor="bookmark-title" className="text-sm font-medium">
                  标题
                </label>
                <Input
                  id="bookmark-title"
                  value={pendingBookmark.title ?? ""}
                  onChange={(e) =>
                    setPendingBookmark((prev) =>
                      prev ? { ...prev, title: e.target.value } : prev,
                    )
                  }
                  placeholder={pendingBookmark.fileName ?? "文件"}
                />
              </div>
            )}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="bookmark-note" className="text-sm font-medium">
                备注{" "}
                <span className="font-normal text-muted-foreground">
                  （选填）
                </span>
              </label>
              <Textarea
                id="bookmark-note"
                value={pendingBookmark.note ?? ""}
                onChange={(e) =>
                  setPendingBookmark((prev) =>
                    prev ? { ...prev, note: e.target.value } : prev,
                  )
                }
                placeholder="记录收藏原因或备注"
                className="h-20 resize-none"
              />
            </div>
            <Button type="submit" className="w-full gap-2">
              <BookmarkPlus className="size-4" />
              保存收藏
            </Button>
          </form>
        );
      }
      return (
        <CapturePreview
          preview={preview}
          status="正在确认保存…"
          detail="保存成功后，即可打开阅读。"
        />
      );
    }
  }
}
