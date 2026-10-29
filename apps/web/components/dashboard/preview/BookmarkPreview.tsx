"use client";

import { useState } from "react";
import Link from "next/link";
import { BookmarkTagsEditor } from "@/components/dashboard/bookmarks/BookmarkTagsEditor";
import { FullPageSpinner } from "@/components/ui/full-page-spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipPortal,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useSession } from "@/lib/auth/client";
import useRelativeTime from "@/lib/hooks/relative-time";
import { useTranslation } from "@/lib/i18n/client";
import { useQuery } from "@tanstack/react-query";
import {
  Building,
  CalendarDays,
  ExternalLink,
  Globe,
  PanelRightClose,
  PanelRightOpen,
  User,
  BookOpen,
  X,
} from "lucide-react";

import { useTRPC } from "@karakeep/shared-react/trpc";
import { BookmarkTypes, ZBookmark } from "@karakeep/shared/types/bookmarks";
import {
  getBookmarkRefreshInterval,
  getBookmarkTitle,
  getSourceUrl,
  isBookmarkStillCrawling,
} from "@karakeep/shared/utils/bookmarkUtils";

import SummarizeBookmarkArea from "../bookmarks/SummarizeBookmarkArea";
import ActionBar from "./ActionBar";
import { AssetContentSection } from "./AssetContentSection";
import AttachmentBox from "./AttachmentBox";
import HighlightsBox from "./HighlightsBox";
import LinkContentSection from "./LinkContentSection";
import { NoteEditor } from "./NoteEditor";
import styles from "./preview.module.css";
import { TextContentSection } from "./TextContentSection";

function ContentLoading() {
  const { t } = useTranslation();
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-4">
      <Globe className="h-12 w-12 animate-bounce text-muted-foreground" />
      <p className="text-sm text-muted-foreground">
        {t("preview.crawling_in_progress")}
      </p>
    </div>
  );
}

function CreationTime({ createdAt }: { createdAt: Date }) {
  const { i18n } = useTranslation();
  const { fromNow, localCreatedAt } = useRelativeTime(createdAt, i18n.language);
  return (
    <Tooltip delayDuration={0}>
      <TooltipTrigger asChild>
        <span className="flex w-fit items-center gap-2 text-sm text-muted-foreground">
          <CalendarDays size={16} /> {fromNow}
        </span>
      </TooltipTrigger>
      <TooltipPortal>
        <TooltipContent>{localCreatedAt}</TooltipContent>
      </TooltipPortal>
    </Tooltip>
  );
}

function BookmarkMetadata({ bookmark }: { bookmark: ZBookmark }) {
  let { author, publisher, datePublished } =
    bookmark.content.type !== BookmarkTypes.LINK
      ? {
          author: null,
          publisher: null,
          datePublished: null,
        }
      : bookmark.content;

  return (
    <div className="flex flex-col gap-2">
      <CreationTime createdAt={bookmark.createdAt} />
      {author && (
        <div className="flex w-fit items-center gap-2 text-sm text-muted-foreground">
          <User size={16} />
          <span>{author}</span>
        </div>
      )}
      {publisher && (
        <div className="flex w-fit items-center gap-2 text-sm text-muted-foreground">
          <Building size={16} />
          <span>{publisher}</span>
        </div>
      )}
      {datePublished && <PublishedDate datePublished={datePublished} />}
    </div>
  );
}

function PublishedDate({ datePublished }: { datePublished: Date }) {
  const { i18n } = useTranslation();
  const { fromNow, localCreatedAt } = useRelativeTime(
    datePublished,
    i18n.language,
  );
  return (
    <Tooltip delayDuration={0}>
      <TooltipTrigger asChild>
        <div className="flex w-fit items-center gap-2 text-sm text-muted-foreground">
          <CalendarDays size={16} />
          <span>发布于 {fromNow}</span>
        </div>
      </TooltipTrigger>
      <TooltipPortal>
        <TooltipContent>{localCreatedAt}</TooltipContent>
      </TooltipPortal>
    </Tooltip>
  );
}

export default function BookmarkPreview({
  bookmarkId,
  initialData,
  onClose,
}: {
  bookmarkId: string;
  initialData?: ZBookmark;
  onClose?: () => void;
}) {
  const api = useTRPC();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<string>("content");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { data: session } = useSession();

  const { data: bookmark } = useQuery(
    api.bookmarks.getBookmark.queryOptions(
      {
        bookmarkId,
      },
      {
        initialData,
        refetchInterval: (query) => {
          const data = query.state.data;
          if (!data) {
            return false;
          }
          return getBookmarkRefreshInterval(data);
        },
      },
    ),
  );

  if (!bookmark) {
    return <FullPageSpinner />;
  }

  // Check if the current user owns this bookmark
  const isOwner = session?.user?.id === bookmark.userId;

  let content;
  switch (bookmark.content.type) {
    case BookmarkTypes.LINK: {
      content = <LinkContentSection bookmark={bookmark} />;
      break;
    }
    case BookmarkTypes.TEXT: {
      content = <TextContentSection bookmark={bookmark} />;
      break;
    }
    case BookmarkTypes.ASSET: {
      content = <AssetContentSection bookmark={bookmark} />;
      break;
    }
  }

  const sourceUrl = getSourceUrl(bookmark);
  const title = getBookmarkTitle(bookmark);

  // Common content for both layouts
  const contentSection = isBookmarkStillCrawling(bookmark) ? (
    <ContentLoading />
  ) : (
    content
  );

  let sourceHost = "";
  try {
    if (sourceUrl)
      sourceHost = new URL(sourceUrl).hostname.replace(/^www\./, "");
  } catch {
    /* Non-URL sources stay hidden. */
  }
  const detailsSection = (
    <div className={styles.details}>
      <div className="space-y-3">
        <h1 className="break-words text-[20px] font-semibold leading-[1.5] tracking-tight">
          {title || "无标题"}
        </h1>
        {sourceUrl && (
          <Link
            href={sourceUrl}
            target="_blank"
            rel="noreferrer"
            className={styles.sourcePill}
          >
            <Globe className="size-3.5 shrink-0" />
            <span className="truncate">
              {sourceHost || t("preview.view_original")}
            </span>
            <ExternalLink className="size-3 shrink-0" />
          </Link>
        )}
      </div>
      <section>
        <h2 className={styles.sectionLabel}>摘要</h2>
        {!bookmark.summary && (
          <p className="mb-3 text-xs leading-relaxed text-muted-foreground">
            还没有摘要，阅读后也可以写下自己的理解。
          </p>
        )}
        <SummarizeBookmarkArea
          bookmark={bookmark}
          readOnly={!isOwner}
          readerMode
        />
      </section>
      <section>
        <h2 className={styles.sectionLabel}>{t("common.tags")}</h2>
        <BookmarkTagsEditor bookmark={bookmark} disabled={!isOwner} quiet />
      </section>
      <section>
        <h2 className={styles.sectionLabel}>{t("common.note")}</h2>
        <NoteEditor bookmark={bookmark} disabled={!isOwner} />
      </section>
      <details className="group rounded-xl border border-border/60 px-3 py-2.5 text-xs">
        <summary className="cursor-pointer text-muted-foreground">
          附件、划线与来源信息
        </summary>
        <div className="mt-4 space-y-5">
          <BookmarkMetadata bookmark={bookmark} />
          <AttachmentBox bookmark={bookmark} readOnly={!isOwner} />
          <HighlightsBox bookmarkId={bookmark.id} readOnly={!isOwner} />
        </div>
      </details>
    </div>
  );
  const actions = (
    <div className={styles.sidebarFooter}>
      {sourceUrl && (
        <Link
          href={sourceUrl}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs hover:bg-muted"
        >
          <ExternalLink className="size-3.5" />
          原文
        </Link>
      )}
      {isOwner && <ActionBar bookmark={bookmark} />}
    </div>
  );
  return (
    <div className={styles.shell}>
      <header className={styles.toolbar}>
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-foreground px-2.5 py-1 text-[11px] font-medium text-background">
            <BookOpen className="size-3" />
            阅读
          </span>
          <span className="truncate text-xs text-muted-foreground">
            {sourceHost || "keeply.收好"}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className={`${styles.iconButton} hidden lg:inline-flex`}
            aria-label={sidebarCollapsed ? "展开详情" : "收起详情"}
            title={sidebarCollapsed ? "展开详情" : "收起详情"}
            aria-expanded={!sidebarCollapsed}
          >
            {sidebarCollapsed ? (
              <PanelRightOpen size={17} />
            ) : (
              <PanelRightClose size={17} />
            )}
          </button>
          {onClose ? (
            <button
              className={styles.iconButton}
              onClick={onClose}
              aria-label="关闭阅读"
              title="关闭阅读"
            >
              <X size={18} />
            </button>
          ) : (
            <Link
              className={styles.iconButton}
              href="/dashboard/bookmarks"
              aria-label="返回收藏"
              title="返回收藏"
            >
              <X size={18} />
            </Link>
          )}
        </div>
      </header>
      <div className="hidden min-h-0 flex-1 lg:flex">
        <main className="min-h-0 min-w-0 flex-1 overflow-hidden">
          {contentSection}
        </main>
        {!sidebarCollapsed && (
          <aside className={styles.sidebar} aria-label="收藏详情">
            <div className={styles.sidebarContent}>{detailsSection}</div>
            {actions}
          </aside>
        )}
      </div>
      <div className="flex min-h-0 flex-1 flex-col lg:hidden">
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex min-h-0 flex-1 flex-col"
        >
          <TabsList className="mx-4 mt-3 grid w-auto grid-cols-2 rounded-full">
            <TabsTrigger value="content" className="rounded-full">
              {t("preview.tabs.content")}
            </TabsTrigger>
            <TabsTrigger value="details" className="rounded-full">
              {t("preview.tabs.details")}
            </TabsTrigger>
          </TabsList>
          <TabsContent
            value="content"
            className="min-h-0 flex-1 overflow-hidden data-[state=inactive]:hidden"
          >
            {contentSection}
          </TabsContent>
          <TabsContent
            value="details"
            className="min-h-0 flex-1 overflow-y-auto data-[state=inactive]:hidden"
          >
            <div className="p-5">{detailsSection}</div>
            {actions}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
