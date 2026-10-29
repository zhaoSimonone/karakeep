import { useState } from "react";
import { ChevronDown, ExternalLink, Trash2 } from "lucide-react";
import { useLocation, useNavigate, useParams } from "react-router-dom";

import {
  useAutoRefreshingBookmarkQuery,
  useDeleteBookmark,
} from "@karakeep/shared-react/hooks/bookmarks";
import { BookmarkTypes } from "@karakeep/shared/types/bookmarks";
import { getSourceUrl } from "@karakeep/shared/utils/bookmarkUtils";

import type { PagePreview } from "./components/CapturePreview";
import { CapturePreview } from "./components/CapturePreview";
import { getBookmarkTitle } from "@karakeep/shared/utils/bookmarkUtils";

import BookmarkLists from "./components/BookmarkLists";
import { ErrorCallout } from "./components/ErrorCallout";
import { ListsSelector } from "./components/ListsSelector";
import { NoteEditor } from "./components/NoteEditor";
import TagList from "./components/TagList";
import { TagsSelector } from "./components/TagsSelector";
import { TitleEditor } from "./components/TitleEditor";
import { Button, buttonVariants } from "./components/ui/button";
import Spinner from "./Spinner";
import { cn } from "./utils/css";
import usePluginSettings from "./utils/settings";
import { MessageType } from "./utils/type";

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {title}
      </h3>
      {children}
    </section>
  );
}

export default function BookmarkSavedPage() {
  const { bookmarkId } = useParams();
  const location = useLocation();
  const savedSnapshot = (location.state as { savedSnapshot?: boolean } | null)
    ?.savedSnapshot;
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);
  const [error, setError] = useState("");

  const { mutate: deleteBookmark, isPending } = useDeleteBookmark({
    onSuccess: async () => {
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
      navigate("/bookmarkdeleted");
    },
    onError: (e) => {
      setError(e.message);
    },
  });

  const { settings } = usePluginSettings();
  const { data: bookmark } = useAutoRefreshingBookmarkQuery({
    bookmarkId: bookmarkId ?? "",
  });

  if (!bookmarkId) {
    return <ErrorCallout title="未找到收藏">这条收藏不存在。</ErrorCallout>;
  }

  // The title is editable below, so the header names where it came from.
  const sourceUrl = bookmark ? getSourceUrl(bookmark) : null;
  const hasSnapshot =
    savedSnapshot ||
    bookmark?.assets.some((a) => a.assetType === "precrawledArchive");
  const crawlStatus =
    bookmark?.content.type === BookmarkTypes.LINK
      ? bookmark.content.crawlStatus
      : undefined;
  const preview = (location.state as { preview?: PagePreview } | null)?.preview;
  const detail = hasSnapshot
    ? crawlStatus === "success"
      ? "正文已就绪，随时回来阅读。"
      : crawlStatus === "failure"
        ? "快照已保存，正文提取失败。请打开收藏重试。"
        : "快照已保存，后台正在提取正文。"
    : bookmark?.content.type === BookmarkTypes.LINK
      ? "链接已保存，尚未确认浏览器正文快照。"
      : "内容已保存。";
  return (
    <div className="flex flex-col gap-2.5">
      {error && <ErrorCallout title="删除收藏失败">{error}</ErrorCallout>}
      <CapturePreview
        preview={{
          ...preview,
          title: bookmark
            ? (getBookmarkTitle(bookmark) ?? preview?.title)
            : preview?.title,
          url: sourceUrl ?? preview?.url,
        }}
        status="已收好"
        detail={detail}
        done
      />
      <a
        className={cn(
          buttonVariants(),
          "h-9 w-full gap-2 rounded-2xl bg-emerald-700 text-white shadow-sm hover:bg-emerald-800",
        )}
        target="_blank"
        rel="noreferrer"
        href={`${settings.address}/dashboard/preview/${bookmarkId}`}
      >
        打开阅读 <ExternalLink className="size-3.5" />
      </a>
      <button
        className="flex items-center justify-between rounded-2xl px-2 py-1.5 text-xs text-muted-foreground hover:bg-muted"
        aria-expanded={expanded}
        onClick={() => setExpanded(!expanded)}
      >
        <span>添加标签、备注与列表</span>
        <ChevronDown
          className={cn(
            "size-4 transition-transform",
            expanded && "rotate-180",
          )}
        />
      </button>
      {expanded && (
        <div className="flex flex-col gap-3 rounded-3xl bg-muted/30 p-2.5">
          <Section title="标题">
            <TitleEditor bookmarkId={bookmarkId} />
          </Section>
          <Section title="备注">
            <NoteEditor bookmarkId={bookmarkId} />
          </Section>
          <Section title="标签">
            <div className="flex flex-wrap items-center gap-1.5">
              <TagList bookmarkId={bookmarkId} />
              <TagsSelector bookmarkId={bookmarkId} />
            </div>
          </Section>
          <Section title="列表">
            <div className="flex flex-col divide-y overflow-hidden rounded-lg border bg-card">
              {/* The picker sits above the lists so adding one doesn't push it
              (and its open dropdown) down. */}
              <ListsSelector bookmarkId={bookmarkId} />
              <BookmarkLists bookmarkId={bookmarkId} />
            </div>
          </Section>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => deleteBookmark({ bookmarkId })}
            disabled={isPending}
            className="gap-2 text-muted-foreground"
          >
            {isPending ? (
              <Spinner className="size-3.5" />
            ) : (
              <Trash2 className="size-3.5" />
            )}{" "}
            删除收藏
          </Button>
        </div>
      )}
    </div>
  );
}
